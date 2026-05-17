const https = require("https");
const net = require("net");
const tls = require("tls");

class ProxyTunnelAgent extends https.Agent {
  constructor(proxyUrl, timeoutMs) {
    super({ keepAlive: false });
    this.proxyUrl = proxyUrl;
    this.timeoutMs = timeoutMs || 15000;
  }

  createConnection(options, callback) {
    createProxyTlsSocket({
      hostname: options.servername || options.host || options.hostname,
      port: options.port || 443,
    }, this.proxyUrl, this.timeoutMs)
      .then(function (socket) { callback(null, socket); })
      .catch(function (error) { callback(error); });
  }
}

function httpsPostForm(urlString, formData) {
  var body = "";
  for (var key in formData) {
    if (formData.hasOwnProperty(key)) {
      body += (body ? "&" : "") + encodeURIComponent(key) + "=" + encodeURIComponent(String(formData[key]));
    }
  }
  var bodyBuffer = Buffer.from(body, "utf8");
  return httpsRequestJson(urlString, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": String(bodyBuffer.length),
    },
    body: bodyBuffer,
    timeoutMs: 15000,
    requireJson: true,
  });
}

function httpsPostJson(urlString, payload, timeoutMs) {
  var bodyBuffer = Buffer.from(JSON.stringify(payload || {}), "utf8");
  return httpsRequestJson(urlString, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Content-Length": String(bodyBuffer.length),
    },
    body: bodyBuffer,
    timeoutMs: timeoutMs || 15000,
    requireJson: true,
  });
}

function httpsGetJson(urlString, timeoutMs, headers) {
  return httpsRequestJson(urlString, {
    method: "GET",
    headers: Object.assign({}, headers || {}),
    timeoutMs: timeoutMs || 5000,
  });
}

function httpsRequestJson(urlString, requestOptions) {
  return new Promise(function (resolve, reject) {
    var url;
    try { url = new URL(urlString); }
    catch (e) { reject(new Error("Invalid URL: " + urlString)); return; }

    var body = requestOptions && requestOptions.body ? requestOptions.body : null;
    var options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ""),
      method: requestOptions && requestOptions.method ? requestOptions.method : "GET",
      headers: Object.assign({}, requestOptions && requestOptions.headers || {}),
      timeout: requestOptions && requestOptions.timeoutMs || 5000,
    };
    var proxyUrl = proxyUrlForHttpsTarget(url);
    if (proxyUrl) {
      options.agent = new ProxyTunnelAgent(proxyUrl, options.timeout);
    }

    var req = https.request(options, function (res) {
      var chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () {
        var raw = Buffer.concat(chunks).toString("utf8");
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(formatHttpError(res.statusCode, raw)));
          return;
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) {
          if (requestOptions && requestOptions.requireJson) reject(new Error("Parse error: " + e.message));
          else resolve(raw);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", function () { req.destroy(new Error("Request timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

function formatHttpError(statusCode, raw) {
  var trimmed = String(raw || "").slice(0, 200);
  if (/unsupported_country_region_territory/i.test(trimmed)) {
    return "HTTP " + statusCode + ": unsupported_country_region_territory. The request reached OpenAI from an unsupported network region; check the extension host proxy/egress IP.";
  }
  return "HTTP " + statusCode + ": " + trimmed;
}

function proxyUrlForHttpsTarget(targetUrl) {
  if (isNoProxyHost(targetUrl.hostname, targetUrl.port || "443")) return null;
  var raw = process.env.HTTPS_PROXY || process.env.https_proxy ||
    process.env.HTTP_PROXY || process.env.http_proxy ||
    process.env.ALL_PROXY || process.env.all_proxy || "";
  if (!raw) return null;
  try {
    var parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch (_e) {
    return null;
  }
}

function isNoProxyHost(hostname, port) {
  var raw = process.env.NO_PROXY || process.env.no_proxy || "";
  if (!raw) return false;
  var host = String(hostname || "").toLowerCase();
  var hostPort = host + ":" + String(port || "");
  return raw.split(",").some(function (entry) {
    var rule = String(entry || "").trim().toLowerCase();
    if (!rule) return false;
    if (rule === "*") return true;
    if (rule === host || rule === hostPort) return true;
    if (rule[0] === "." && host.endsWith(rule)) return true;
    return host.endsWith("." + rule);
  });
}

function createProxyTlsSocket(targetUrl, proxyUrl, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var targetHost = targetUrl.hostname;
    var targetPort = targetUrl.port || "443";
    var proxyPort = proxyUrl.port || (proxyUrl.protocol === "https:" ? 443 : 80);
    var settled = false;
    var connectedBuffer = Buffer.alloc(0);
    var socket = proxyUrl.protocol === "https:"
      ? tls.connect({ host: proxyUrl.hostname, port: proxyPort, servername: proxyUrl.hostname })
      : net.connect({ host: proxyUrl.hostname, port: proxyPort });

    function finish(error, tlsSocket) {
      if (settled) return;
      settled = true;
      socket.removeAllListeners("data");
      socket.removeAllListeners("error");
      socket.removeAllListeners("timeout");
      if (error) {
        socket.destroy();
        reject(error);
      } else {
        resolve(tlsSocket);
      }
    }

    socket.setTimeout(timeoutMs || 15000, function () {
      finish(new Error("Proxy CONNECT timeout"));
    });
    socket.on("error", finish);
    socket.on("connect", sendConnect);
    socket.on("secureConnect", sendConnect);
    socket.on("data", function (chunk) {
      connectedBuffer = Buffer.concat([connectedBuffer, chunk]);
      var marker = connectedBuffer.indexOf("\r\n\r\n");
      if (marker === -1) return;
      var head = connectedBuffer.slice(0, marker).toString("utf8");
      var rest = connectedBuffer.slice(marker + 4);
      if (!/^HTTP\/\d(?:\.\d)?\s+2\d\d\b/i.test(head)) {
        finish(new Error("Proxy CONNECT failed: " + head.split(/\r?\n/)[0]));
        return;
      }
      if (rest.length) socket.unshift(rest);
      var tlsSocket = tls.connect({
        socket,
        servername: targetHost,
      }, function () {
        tlsSocket.setTimeout(0);
        finish(null, tlsSocket);
      });
      tlsSocket.on("error", finish);
      tlsSocket.setTimeout(timeoutMs || 15000, function () {
        finish(new Error("TLS handshake through proxy timed out"));
      });
    });

    function sendConnect() {
      if (settled) return;
      var target = targetHost + ":" + targetPort;
      var headers = [
        "CONNECT " + target + " HTTP/1.1",
        "Host: " + target,
        "Proxy-Connection: Keep-Alive",
      ];
      if (proxyUrl.username || proxyUrl.password) {
        var auth = decodeURIComponent(proxyUrl.username || "") + ":" + decodeURIComponent(proxyUrl.password || "");
        headers.push("Proxy-Authorization: Basic " + Buffer.from(auth, "utf8").toString("base64"));
      }
      socket.write(headers.join("\r\n") + "\r\n\r\n");
    }
  });
}

module.exports = {
  httpsGetJson,
  httpsPostForm,
  httpsPostJson,
};

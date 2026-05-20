#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const { resolveExecutablePath } = require("./platform-runtime");

function appendJson(logPath, payload) {
  fs.appendFileSync(logPath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readPrompt(promptPath) {
  return fs.existsSync(promptPath) ? fs.readFileSync(promptPath, "utf8") : "";
}

function main() {
  const logPath = process.env.CMA_LOG_PATH || "";
  const promptPath = process.env.CMA_PROMPT_PATH || "";
  const rawPath = process.env.CMA_RAW_PATH || "";
  const models = String(process.env.CMA_MODEL_PRIORITY || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!logPath || !promptPath || !rawPath || !models.length) {
    throw new Error("Missing Gemini runner environment.");
  }

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  appendJson(logPath, { type: "thread.started", provider: "gemini-cli" });
  appendJson(logPath, { type: "turn.started", provider: "gemini-cli" });

  const prompt = readPrompt(promptPath);
  const geminiPath = resolveExecutablePath("gemini");
  let status = 1;
  let raw = "";

  for (const candidateModel of models) {
    appendJson(logPath, {
      type: "item.completed",
      item: {
        type: "command_execution",
        text: `gemini --model ${candidateModel}`,
      },
      provider: "gemini-cli",
    });
    const probe = childProcess.spawnSync(
      geminiPath || "gemini",
      ["--model", candidateModel, "-p", prompt, "-o", "text"],
      {
        encoding: "utf8",
        timeout: 1000 * 60 * 30,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    status = typeof probe.status === "number" ? probe.status : 1;
    raw = `${probe.stdout || ""}${probe.stderr || ""}`;
    fs.writeFileSync(rawPath, raw, "utf8");
    if (status === 0) break;
  }

  if (raw) fs.appendFileSync(logPath, raw, "utf8");
  appendJson(logPath, {
    type: "item.completed",
    item: {
      type: "message",
      text: raw.trim(),
    },
    provider: "gemini-cli",
  });
  appendJson(logPath, {
    type: "turn.completed",
    provider: "gemini-cli",
    exit_code: status,
  });
  process.exit(status);
}

try {
  main();
} catch (error) {
  const logPath = process.env.CMA_LOG_PATH || "";
  if (logPath) {
    appendJson(logPath, {
      type: "turn.completed",
      provider: "gemini-cli",
      exit_code: 1,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

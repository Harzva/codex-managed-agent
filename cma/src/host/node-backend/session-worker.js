const { parentPort } = require("worker_threads");
const { summarizeSessionFile } = require("./session-store");

if (!parentPort) {
  throw new Error("session-worker must be launched as a worker thread");
}

parentPort.on("message", (job) => {
  const index = job && job.index;
  try {
    const thread = summarizeSessionFile(job.filePath, job.options || {});
    parentPort.postMessage({ index, thread });
  } catch (error) {
    parentPort.postMessage({
      index,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

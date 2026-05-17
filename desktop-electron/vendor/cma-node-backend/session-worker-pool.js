const os = require("os");
const path = require("path");
const { Worker } = require("worker_threads");

const SUMMARY_HEAD_LINES = 240;
const SUMMARY_TAIL_BYTES = 256 * 1024;
const DISCOVERY_WORKER_COUNT = Math.max(
  1,
  Math.min(8, typeof os.availableParallelism === "function" ? os.availableParallelism() : 2),
);

let sharedWorkerPool = null;

function workerSafeOptions(options = {}) {
  return {
    now: options.now,
    full: Boolean(options.full),
    includeGit: options.includeGit !== false,
    headLines: options.headLines || SUMMARY_HEAD_LINES,
    tailBytes: options.tailBytes || SUMMARY_TAIL_BYTES,
  };
}

class SessionWorkerPool {
  constructor(workerCount) {
    this.workerCount = Math.max(1, Number(workerCount || DISCOVERY_WORKER_COUNT));
    this.workerPath = path.join(__dirname, "session-worker.js");
    this.workers = [];
    this.idle = [];
    this.queue = [];
    this.closed = false;
    this.nextJobId = 1;
    this.ensureWorkers();
  }

  ensureWorkers() {
    while (!this.closed && this.workers.length < this.workerCount) {
      this.addWorker();
    }
  }

  addWorker() {
    const record = {
      worker: new Worker(this.workerPath),
      current: null,
      dead: false,
    };
    record.worker.on("message", (message) => this.handleMessage(record, message));
    record.worker.on("error", (error) => this.handleWorkerFailure(record, error));
    record.worker.on("exit", (code) => {
      if (!record.dead && !this.closed && (record.current || code !== 0)) {
        this.handleWorkerFailure(record, new Error(`session worker exited with code ${code}`));
      }
    });
    this.workers.push(record);
    this.idle.push(record);
  }

  run(filePath, options = {}, index = 0) {
    if (this.closed) return Promise.reject(new Error("session worker pool is closed"));
    this.ensureWorkers();
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: this.nextJobId,
        index,
        filePath,
        options: workerSafeOptions(options),
        resolve,
        reject,
      });
      this.nextJobId += 1;
      this.pump();
    });
  }

  pump() {
    if (this.closed) return;
    while (this.queue.length && this.idle.length) {
      const record = this.idle.shift();
      if (!record || record.dead) continue;
      const job = this.queue.shift();
      record.current = job;
      record.worker.postMessage({
        id: job.id,
        index: job.index,
        filePath: job.filePath,
        options: job.options,
      });
    }
  }

  handleMessage(record, message) {
    const job = record.current;
    record.current = null;
    if (!job) return;
    if (message && message.error) {
      job.reject(new Error(message.error));
    } else {
      job.resolve(message ? message.thread : null);
    }
    if (!this.closed && !record.dead) {
      this.idle.push(record);
      this.pump();
    }
  }

  handleWorkerFailure(record, error) {
    if (record.dead) return;
    record.dead = true;
    this.workers = this.workers.filter((item) => item !== record);
    this.idle = this.idle.filter((item) => item !== record);
    if (record.current) {
      record.current.reject(error);
      record.current = null;
    }
    try {
      record.worker.terminate();
    } catch {}
    if (!this.closed) {
      this.ensureWorkers();
      this.pump();
    }
  }

  async close() {
    this.closed = true;
    const pending = this.queue.splice(0);
    pending.forEach((job) => job.reject(new Error("session worker pool closed")));
    const workers = this.workers.splice(0);
    this.idle = [];
    await Promise.all(workers.map((record) => record.worker.terminate().catch(() => {})));
  }
}

function getSessionWorkerPool(workerCount) {
  const count = Math.max(1, Number(workerCount || DISCOVERY_WORKER_COUNT));
  if (!sharedWorkerPool || sharedWorkerPool.closed || sharedWorkerPool.workerCount !== count) {
    if (sharedWorkerPool && !sharedWorkerPool.closed) {
      sharedWorkerPool.close().catch(() => {});
    }
    sharedWorkerPool = new SessionWorkerPool(count);
  }
  return sharedWorkerPool;
}

async function closeSessionWorkerPool() {
  const pool = sharedWorkerPool;
  sharedWorkerPool = null;
  if (pool && !pool.closed) await pool.close();
}

module.exports = {
  closeSessionWorkerPool,
  getSessionWorkerPool,
  SessionWorkerPool,
};

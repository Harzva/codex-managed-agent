const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadThreadInsightWithServerStub() {
  delete require.cache[require.resolve("./thread-insight")];
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "./server") {
      return {
        fetchThreadDetail() {
          throw new Error("fetchThreadDetail is not used by these tests");
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("./thread-insight");
  } finally {
    Module._load = originalLoad;
  }
}

const { buildThreadInsight, THREAD_INSIGHT_CACHE_KEY } = loadThreadInsightWithServerStub();

function fakePanel(cache = {}, jobs = {}) {
  return {
    storage: {
      get(key, fallback) {
        return key === THREAD_INSIGHT_CACHE_KEY ? cache : fallback;
      },
    },
    threadInsightJobs: jobs.threadInsightJobs || {},
    threadEvidenceReviewJobs: jobs.threadEvidenceReviewJobs || {},
  };
}

test("buildThreadInsight surfaces cached evidence review state separately from vibe advice", () => {
  const detail = {
    thread: {
      id: "thread-1",
      title: "Evidence thread",
      updated_at_iso: "2026-05-10T10:00:00Z",
      history: [{ role: "user", text: "Please review the patch." }],
    },
    logs: [],
  };
  const panel = fakePanel({
    "thread-1": {
      advice: [{ title: "Advice", advice: "Keep requests scoped.", tag: "Scope" }],
      evidenceReview: [{ title: "Review", summary: "Patch evidence is available.", tag: "Diff" }],
      evidenceReviewGeneratedAt: "2026-05-10T10:05:00Z",
    },
  });

  const insight = buildThreadInsight(panel, detail);

  assert.equal(insight.vibeAdviceState, "ready");
  assert.equal(insight.evidenceReviewState, "ready");
  assert.equal(insight.evidenceReview[0].summary, "Patch evidence is available.");
  assert.equal(insight.evidenceReviewGeneratedAt, "2026-05-10T10:05:00Z");
});

test("buildThreadInsight marks evidence review loading and error jobs", () => {
  const detail = { thread: { id: "thread-1", title: "Evidence thread", history: [] }, logs: [] };

  const loading = buildThreadInsight(fakePanel({}, {
    threadEvidenceReviewJobs: { "thread-1": { state: "loading" } },
  }), detail);
  assert.equal(loading.evidenceReviewState, "loading");

  const failed = buildThreadInsight(fakePanel({}, {
    threadEvidenceReviewJobs: { "thread-1": { state: "error", error: "review failed" } },
  }), detail);
  assert.equal(failed.evidenceReviewState, "error");
  assert.equal(failed.evidenceReviewError, "review failed");
});

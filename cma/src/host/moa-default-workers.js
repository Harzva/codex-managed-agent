function defaultWorkerForIndex(index, goal = "") {
  const presets = [
    {
      title: "Planning and contract worker",
      role_id: "planner",
      role: "Inspect the goal, refine the implementation contract, and identify acceptance checks.",
      write_paths: ["task-plans"],
      expected_outputs: ["updated task plan or implementation notes"],
    },
    {
      title: "Host/runtime worker",
      role_id: "implementer",
      role: "Implement host-side state, persistence, and message handling for the requested workflow.",
      write_paths: ["src/host"],
      expected_outputs: ["host code changes and unit tests"],
    },
    {
      title: "Team UI worker",
      role_id: "implementer",
      role: "Implement Team webview controls and rendering for the requested workflow.",
      write_paths: ["src/webview-template.js", "src/webview"],
      expected_outputs: ["webview UI changes and render regression coverage"],
    },
    {
      title: "Verification worker",
      role_id: "tester",
      role: "Add or update tests, run checks, and summarize residual risks.",
      write_paths: ["src/host", "src/webview"],
      expected_outputs: ["test coverage and verification summary"],
    },
  ];
  const preset = presets[index] || {
    title: `Worker ${index + 1}`,
    role: `Complete a bounded slice of: ${goal || "the requested Team run"}.`,
    write_paths: [`scratch/worker-${index + 1}`],
    expected_outputs: ["bounded implementation result"],
  };
  return { ...preset };
}

module.exports = {
  defaultWorkerForIndex,
};

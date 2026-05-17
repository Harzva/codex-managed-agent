# Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Bounded target: complete Phase 2 task `04-needs-attention` by adding needs-attention visual treatment to board cards in both compact and standard states.
- Files changed: `src/webview-template.js`, `src/webview/styles.js`, `src/webview/render-detail-regression.test.js`, `task-plans/subtask_json/cma-reference-phase-02-board-operational-language.json`, `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Tests or checks run: `node --test src/webview/render-detail-regression.test.js`; `node --check src/webview-template.js`; `node --check src/webview/styles.js`
- Risks or deferrals: the visual treatment currently shares existing card-level attention styling but does not yet add dedicated compact overflow regression coverage.
- Next handoff: proceed to `05-overflow-checks` in the same phase (`cma-reference-phase-02-board-operational-language`) to validate compact title/action/lifecycle fitting.

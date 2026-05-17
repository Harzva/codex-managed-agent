# Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Bounded target: complete Phase 2 task `03-quick-actions` by making Cmd/Cmp/Git quick actions visible in both compact and standard running board cards without changing broader board behavior.
- Files changed: `src/webview-template.js`, `src/webview/styles.js`, `src/webview/render-detail-regression.test.js`, `task-plans/subtask_json/cma-reference-phase-02-board-operational-language.json`, `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Tests or checks run: `node --test src/webview/render-detail-regression.test.js`; `node --check src/webview-template.js`; `node --check src/webview/actions.js`
- Risks or deferrals: compact wrapping behavior may affect row density under very narrow viewport widths; `needs_attention` styling and explicit overflow checks remain for follow-up tasks.
- Next handoff: implement Phase 2 task `04-needs-attention` to visually emphasize cards in handoff state.

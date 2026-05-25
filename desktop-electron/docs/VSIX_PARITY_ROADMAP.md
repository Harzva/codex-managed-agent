# CMA Desktop VSIX Parity Roadmap

> 目标：把 CMA 桌面版从“独立 Electron 壳 + 部分 Node 后端能力”推进到“功能完整复刻 VSIX 版、保留桌面原生体验、UI 达到 CodexManager 风格但能力明显强于参考产品”的生产级桌面客户端。

## 使用方式

- 本文件是桌面版全面复刻 VSIX 的总控路线图；每个阶段完成后在这里打钩。
- 阶段细化任务后续可以拆到 `desktop-electron/docs/vsix-parity-roadmap-tasks/`，本文件只保留关键门禁、优先级和跨阶段依赖。
- VSIX 目录 `cma/` 是功能基线，桌面目录 `desktop-electron/` 是落地目标。
- 任何桌面能力不得破坏 VSIX 发布物；复用逻辑优先从 `cma/src/host/*` 抽取或 vendoring，不能复制出长期分叉。
- UI 可以借鉴 `qxcnm/Codex-Manager` 的浅色、左侧分组导航、密集表格和蓝绿状态语言，但不能降级为只管理账号的单一产品。
- 桌面版必须覆盖 CMA 自有核心能力：Codex 会话、账号池、用量洞察、Loop、Team 编排、后台 watch、模型/代理配置、诊断与发布。
- 回归测试不要求每次小改动都证明全部 parity；统一放到阶段门禁和最终三轮审核里执行。
- VS Code 专属能力需要做桌面等价替代：例如 VS Code sidebar/panel 迁移为桌面多页面、terminal command 迁移为 PowerShell/CMD/PTY 启动、workspace storage 迁移为 Electron `userData`。
- 本路线图不以“界面像”为完成标准；界面只是入口，真正完成标准是 VSIX 用户能在桌面版完成同等任务。

## Summary

- 当前桌面版已经具备 Electron shell、隔离 backend state、基础 session backend、第一版 CodexManager 风格多模块 UI、Windows/macOS GitHub Actions 打包链路。
- 当前桌面版距离 VSIX 全功能复刻仍是“大骨架 + 少量真实数据”的阶段；P0 缺口集中在真实账号池、Dashboard/Board/Detail、New Agent/Resume、codex-loop、Team/MOA 编排。
- VSIX 的真实功能范围明显大于最初 UI 截图：除了账号池，还包含 trace evidence、memory manager、skill manager、state sync、provider visibility、service capabilities、usage ledger、network/proxy、Gemini worker、MOA worker templates。
- UI 方向确定为“浅色专业控制台 + 密集数据表 + 证据/状态面板”，但不能照搬 Codex-Manager 的功能范围；CMA 桌面版必须是 Codex agent operating console。
- 技术方向确定为“共享核心优先”：桌面端通过同步脚本、adapter、desktop API wrapper 复用 `cma/src/host`，避免 VSIX 和 EXE 分叉成两个产品。
- 发布方向确定为 GitHub Actions 构建，不在本地正式打包 EXE；本地只做 build/test/preview，Windows/macOS artifact 从 Actions 获取。

## Key Decisions

- [x] 桌面版与 VSIX 放同仓库同分支推进，保留 `cma/` 与 `desktop-electron/` 边界。
- [x] UI 借鉴 CodexManager 审美，但产品信息架构以 CMA 功能为准。
- [x] Windows 是一等桌面环境，所有 terminal、daemon、auth、path、quoting 都要有 Windows 原生实现。
- [x] 桌面 state 使用 Electron `userData`，不得污染 VSIX workspace/global state。
- [x] 正式桌面包只由 GitHub Actions 产出；本地不做正式 EXE 打包。
- [ ] P0 阶段优先实现真实操作闭环，不优先做纯视觉 polish。
- [ ] 每个 VSIX host 模块必须有归属：共享核心、desktop adapter、desktop-only 替代、或明确不适用。
- [ ] 所有桌面 API 都要带来源标记和审计日志，尤其是账号激活、终端启动、worker launch、daemon 控制和代理切换。

## 当前基线

- VSIX 版本：`cma/package.json` 当前 `1.0.38`。
- 桌面版本：`desktop-electron/package.json` 当前 `0.1.0`。
- 桌面构建入口：`npm run build`、`npm test`、GitHub Actions `Desktop Electron Build`。
- 桌面当前架构：
  - Electron main/preload 提供本地后端启动、设置、文件打开和 API 代理。
  - renderer 是纯 HTML/CSS/JS。
  - vendored backend 只包含 `desktop-electron/vendor/cma-node-backend/*`。
- 桌面当前已完成：
  - [x] 独立 Electron 窗口。
  - [x] 隔离 `userData/backend-state`。
  - [x] Node backend 基础读取 Codex sessions。
  - [x] `/api/health`、`/api/threads`、`/api/thread/:id`、`/api/watch`、`/api/insights/report`、`/api/codex/active`、`/api/codex/inventory`、基础 lifecycle。
  - [x] 第一版浅色账号池风格 UI。
  - [x] 2026-05-25 已补回多模块导航骨架：仪表盘、账号池、聚合 API、模型目录、密钥、请求日志、系统设置、插件中心、赞助与推荐。
  - [x] 2026-05-25 已同步到远端 `codex-desktop-monorepo`，提交 `7bc4e7c8212956745fa5d93545a6e15a622c0d4a`。
  - [x] 2026-05-25 GitHub Actions `Desktop Electron Build` run `26389399308` 已通过 Windows/macOS 打包。
- 桌面当前风险：
  - [ ] UI 目前多为信息展示骨架，不具备 VSIX 版完整操作闭环。
  - [ ] account-manager、team、loop、clash、new-agent 等 VSIX host 功能还没有桌面 API 层。
  - [ ] desktop vendor backend 与 `cma/src/host/node-backend` 存在分叉风险。
  - [ ] Electron 本地二进制环境可能不完整，本机 UI 预览需用浏览器 fallback。

## VSIX 功能面清单

### VS Code 壳层与命令

- VSIX commands：
  - `codexAgent.openPanel`
  - `codexAgent.openExternal`
  - `codexAgent.showSidebar`
  - `codexAgent.newThreadInCodexSidebar`
  - `codexAgent.showBottomPanel`
  - `codexAgent.openPanelBeside`
  - `codexAgent.maximizeDashboard`
  - `codexAgent.movePanelToNewWindow`
  - `codexAgent.refreshPanel`
  - `codexAgent.startServer`
- VSIX views：
  - Activity bar webview：`codexAgent.sidebar`
  - Bottom panel webview：`codexAgent.bottom`
- Desktop 等价目标：
  - [ ] 单窗口多页面导航。
  - [ ] 可弹出/新窗口 dashboard。
  - [ ] 外部浏览器打开本地后端。
  - [ ] 刷新、重启后端、打开 Codex 新会话。
  - [ ] 桌面原生菜单和快捷键。

### Node Backend 与会话读取

- VSIX Node backend endpoints：
  - `GET /api/health`
  - `GET /api/threads`
  - `GET /api/watch`
  - `POST /api/watch/auto-continue`
  - `POST /api/watch/control`
  - `GET /api/thread/:id`
  - `GET /api/insights/report`
  - `GET /api/codex/active`
  - `GET /api/codex/inventory`
  - `POST /api/threads/scan-codex-sessions`
  - `POST /api/threads/lifecycle`
  - `POST /api/thread/:id/rename` 当前 Node backend 返回 410。
- Desktop 当前状态：
  - [x] vendored backend 已覆盖基础 endpoint。
  - [x] desktop API proxy 可调用 backend。
  - [ ] vendor 同步策略未固定。
  - [ ] 还没有 desktop 专属 API 聚合层，无法暴露 account/team/loop 的 host 级操作。

### 账号池与 Provider Sync

- VSIX 相关能力：
  - 账号列表、导入、删除、重命名、激活。
  - Windows symlink 失败 copy fallback。
  - Codex OAuth refresh。
  - 使用量拉取和 token health。
  - provider/account payload 给 Team worker 使用。
  - 登录终端 `codex login --device-auth`。
- Desktop 当前状态：
  - [x] UI 有账号池表格风格。
  - [x] 仅用 Codex executable inventory 模拟账号行。
  - [ ] 未接入真实 `account-manager.js`。
  - [ ] 未提供登录、导入、激活、刷新、用量、删除、备份 UI。
  - [ ] 未实现 `CODEX_HOME` 账号切换的桌面安全提示。

### 会话 Dashboard / Board / Detail

- VSIX 相关能力：
  - Overview。
  - 多 tab board。
  - running board、project grouping、thread cards。
  - thread detail、history、logs、git info。
  - lifecycle：archive、unarchive、soft delete、restore、scan。
  - Codex editor / sidebar steering。
- Desktop 当前状态：
  - [x] 可列出 sessions。
  - [x] 可读取 thread detail 的 backend 能力存在。
  - [ ] UI 只做请求日志列表，未复刻 board/detail。
  - [ ] 缺少多 tab、项目分组、卡片布局、状态解释、证据面板。
  - [ ] VS Code editor steering 需要改为桌面等价：打开终端、打开 rollout、复制命令、打开文件夹。

### New Agent 与 Codex CLI 启动

- VSIX 相关能力：
  - 新建 Codex thread。
  - Resume 选中 session。
  - Windows PowerShell 兼容命令构造。
  - Codex executable 探测。
- Desktop 当前状态：
  - [x] 可读取 active Codex/inventory。
  - [ ] 未提供新建 thread / resume 操作 UI。
  - [ ] 未提供内置终端或外部终端启动策略。
  - [ ] 未有命令执行审计日志。

### Loop / Watch / Auto Continue

- VSIX 相关能力：
  - watch 页面。
  - watch auto-continue 有有限次数和显式完成门禁。
  - codex-loop skill 安装、启动、停止、重启。
  - Loop daemon 状态、log tail、tmux/macOS-Linux/Windows daemon 分层。
  - usage-limit 检测和 rotation prompt。
- Desktop 当前状态：
  - [x] backend 有 `/api/watch` 和控制 endpoint。
  - [ ] UI 没有 watch/loop 页面。
  - [ ] Electron main 没有 loop skill 安装和 daemon 操作桥。
  - [ ] Windows log tail/daemon 控制还未桌面化。

### Team / Multi-Agent 编排

- VSIX 相关能力：
  - Team Space 初始化。
  - Team Brief。
  - task CRUD。
  - role plugins。
  - orchestration draft/save/run。
  - dedicated worker launch。
  - Codex/Gemini worker。
  - runtime reconciliation。
  - mailbox traces。
- Desktop 当前状态：
  - [ ] 完全未接入 UI。
  - [ ] 未暴露 `team-coordination.js` 操作 API。
  - [ ] 未处理 worker 启动、日志、account binding、DAG run。
  - [ ] 未提供 role plugin 管理界面。

### Usage Insights / Ledger

- VSIX 相关能力：
  - ingest known CLI usage logs。
  - rebuild persisted usage report。
  - insights panels。
  - token/quota/report cards。
- Desktop 当前状态：
  - [x] 可读 `/api/insights/report`。
  - [ ] 不能触发 ingest/rebuild。
  - [ ] UI 只有简单信息面板。
  - [ ] 缺少热力图、趋势、账号维度、worker 维度和报告导出。

### Clash / Proxy / Network Probe

- VSIX 相关能力：
  - Clash/Mihomo external controller。
  - proxy group 切换。
  - 网络 probe timeout 配置。
  - smartMode 下 API/model-aware 状态提示。
- Desktop 当前状态：
  - [ ] 无代理页。
  - [ ] 无 Clash 配置。
  - [ ] 无网络 probe。
  - [ ] 无代理切换审计。

### Settings / Isolation / Release

- VSIX 相关能力：
  - VS Code settings。
  - workspace/global state。
  - VSIX 平台矩阵。
- Desktop 当前状态：
  - [x] Electron `userData/settings.json`。
  - [x] desktop backend state 隔离。
  - [x] GitHub Actions 可构建 Windows/macOS desktop。
  - [ ] 设置页缺少完整配置项。
  - [ ] 还没有自动版本对齐和 release manifest parity 检查。

## 差距矩阵

| 功能域 | VSIX 状态 | Desktop 状态 | 差距等级 | 结论 |
|---|---:|---:|---:|---|
| Shell/导航 | 完整 | 部分 | P1 | 已有桌面壳，但需补多页面和原生菜单 |
| Node sessions backend | 完整基础 | 部分 vendored | P1 | 需要固定同步策略和 desktop API wrapper |
| 账号池 | 完整 host 逻辑 | UI 假数据/候选数据 | P0 | 必须接入真实 account-manager |
| Dashboard/Board/Detail | 完整 | 基础列表 | P0 | 需要复刻主工作台 |
| Lifecycle | 完整 host + backend 部分 | backend 部分 | P1 | UI 和桌面操作闭环缺失 |
| New Agent/Resume | 完整 | 缺失 | P0 | 桌面版必须能启动 Codex |
| Watch/Auto Continue | 完整 | backend 有、UI 缺 | P1 | 需要桌面控制台 |
| codex-loop | 完整 | 缺失 | P0 | 需要 daemon bridge 和 UI |
| Team 编排 | 完整 | 缺失 | P0 | CMA 核心差距最大 |
| Usage insights | 完整 | 只读部分 | P1 | 需要 ingest/rebuild/export |
| Clash/Proxy | 完整 | 缺失 | P2 | 影响高级用户网络体验 |
| Settings | 完整 VS Code 配置 | 部分 desktop 配置 | P1 | 要补齐配置映射 |
| Packaging/Release | 可用 | 可用 | P1 | 要加入 parity gate |
| Trace evidence | 完整 host 逻辑 | 缺失 | P1 | 需要证据浏览、导出和 trace dashboard |
| Memory manager | 完整 host 逻辑 | 缺失 | P2 | 需要桌面 memory 查看/刷新/导出 |
| Skill manager | 完整 host 逻辑 | 缺失 | P1 | Loop/Team 前置依赖 |
| MOA orchestration | 完整 host 逻辑 | 缺失 | P0 | Team 高级编排能力必须纳入 |
| Provider visibility | 完整 host 逻辑 | 缺失 | P1 | 账号/worker/模型状态需要统一可见性 |
| Service capabilities | 完整 host 逻辑 | 缺失 | P1 | 桌面需要能力探测和降级说明 |
| State sync | 完整 host 逻辑 | 缺失 | P1 | Dashboard/Detail 的数据组合层缺失 |

## VSIX Host 模块归属清单

| VSIX 模块 | 主要职责 | Desktop 归属 | 优先级 | 当前动作 |
|---|---|---|---:|---|
| `account-manager.js` | 账号导入、激活、auth 切换、Windows copy fallback | shared core + desktop API | P0 | 阶段 2 接入 |
| `account-http.js` / `account-usage.js` | token health、usage API、账号额度 | shared core + desktop API | P0 | 阶段 2 接入 |
| `platform-runtime.js` | shell/path/executable/quoting/chmod | shared core | P0 | 阶段 1 抽出并复用 |
| `lifecycle*.js` | board、new agent、loop、thread lifecycle | adapter + desktop UI | P0 | 阶段 3-5 接入 |
| `node-backend/*` | session store、usage report、watch、inventory | vendored backend -> synced core | P0 | 阶段 1 固定同步 |
| `team-*.js` | Team workspace、task、worker、runtime reconciliation | shared core + desktop Team API | P0 | 阶段 6 接入 |
| `moa-*.js` | MOA DAG、role templates、default workers | shared core + desktop orchestration UI | P0 | 阶段 6A 接入 |
| `trace-*.js` | trace index、dashboard、report export | shared core + desktop evidence UI | P1 | 阶段 6B 接入 |
| `thread-insight.js` | thread evidence prompt/report | shared core + desktop detail panel | P1 | 阶段 3/6B 接入 |
| `usage-ledger.js` | persisted usage ingest/rebuild/report | shared core + desktop usage page | P1 | 阶段 7 接入 |
| `network-tools.js` | Clash/proxy/probe | shared core + desktop settings/proxy page | P2 | 阶段 7 接入 |
| `skill-manager.js` / `bundled-skills.js` | bundled skill install/list/open | shared core + desktop plugins page | P1 | 阶段 5/7 接入 |
| `memory-manager.js` | memory read/update/export | shared core + desktop memory panel | P2 | 阶段 7B 接入 |
| `provider-visibility.js` | provider/account/model availability | shared core + desktop status layer | P1 | 阶段 2/7 接入 |
| `service-capabilities.js` | feature flags/capability detection | shared core + diagnostics | P1 | 阶段 1/8 接入 |
| `state-sync.js` | dashboard aggregate、detail synthesis | shared core + desktop state store | P1 | 阶段 3 接入 |
| `codex-link.js` | VS Code ChatGPT extension integration | desktop-only replacement | P2 | 改为 terminal/file/browser actions |
| `panel-view.js` / `commands.js` | VS Code shell/webview bridge | not reused directly | P2 | 转换为 Electron shell/menu/router |

## 阶段 0：稳定当前桌面 UI 基线

- [x] 将 EXE UI 从暗色工作台改为浅色后台管理风格。
- [x] 保留 CodexManager 风格语言：左侧分组导航、浅蓝背景、白色表格卡、蓝绿状态色、密集行。
- [x] 避免只做账号池单页，补回 CMA 多模块导航骨架。
- [x] 本地 `desktop-electron npm test` 通过。
- [x] 把当前 UI 改动同步到 publish worktree，并推送到远端分支。
- [x] GitHub Actions Windows/macOS 桌面构建通过。
- [ ] 下载最新 Windows artifact 到 `cmabuild/` 并人工启动检查；当前 artifact 约 349MB，命令行下载超时，需要浏览器或分段下载。
- [ ] 为 renderer 增加基础 smoke：至少校验主要 DOM 节点存在、账号空态和 mock 两行数据渲染。

## 阶段 1：共享核心与 Vendor 同步治理

- [ ] 建立 `scripts/sync-vsix-host-to-desktop.mjs`，同步 Node backend、host helpers 和必要 tests。
- [ ] 明确 desktop vendor 来源：从 `cma/src/host/node-backend` 自动复制，不手改 vendor。
- [ ] 增加 CI 检查：`desktop-electron/vendor/cma-node-backend/server.js` 与 `cma/src/host/node-backend/server.js` 的允许差异清单。
- [ ] 抽出跨平台 runtime helper 给 desktop 使用，避免 VSIX 和 EXE 各自维护 Windows 兼容逻辑。
- [ ] 形成 `desktop-electron/docs/ARCHITECTURE.md`：说明 main/preload/renderer/backend/account/team/loop 的边界。

## 阶段 2：真实账号池复刻

- [ ] 把 `account-manager.js`、`account-http.js`、`account-usage.js` 接入 desktop main 或 desktop backend。
- [ ] 新增 desktop API：
  - [ ] `GET /api/accounts`
  - [ ] `POST /api/accounts/import`
  - [ ] `POST /api/accounts/:name/activate`
  - [ ] `POST /api/accounts/:name/refresh-token`
  - [ ] `POST /api/accounts/:name/fetch-usage`
  - [ ] `DELETE /api/accounts/:name`
  - [ ] `POST /api/accounts/login-session`
- [ ] UI 表格从 Codex executable inventory 改为真实 account payload。
- [ ] 支持 Windows 无开发者模式 copy fallback 的状态文案。
- [ ] 支持账号类型、token health、quota、usage URL、active profile 标记。
- [ ] 登录流程：桌面打开 PowerShell/CMD 或内置 terminal，设置 `CODEX_HOME` 后执行 `codex login --device-auth`。
- [ ] 测试：
  - [ ] account-manager 原测试在 desktop 环境通过。
  - [ ] Windows symlink 失败时 UI 显示 `copy` 激活。

## 阶段 3：Dashboard / Board / Thread Detail 复刻

- [ ] 复刻 VSIX overview 的信息架构：sessions、running、watch、usage、account health。
- [ ] 复刻 board tab：
  - [ ] running board。
  - [ ] loop queue。
  - [ ] coordination view。
  - [ ] project grouping。
  - [ ] pinned/attached/open Codex 状态。
- [ ] 复刻 thread detail：
  - [ ] history。
  - [ ] logs。
  - [ ] git metadata。
  - [ ] rollout path。
  - [ ] token usage。
  - [ ] lifecycle 操作。
- [ ] 桌面等价替代：
  - [ ] `Open in VS Code` 改为 `Open folder/file`。
  - [ ] `Codex sidebar` 改为 `Resume in terminal`。
  - [ ] `Editor` 改为 `Open rollout / copy thread id / show in folder`。
- [ ] 测试：
  - [ ] session fixtures 渲染 smoke。
  - [ ] lifecycle POST 后列表刷新。

## 阶段 4：New Agent / Resume / Terminal 桥

- [ ] 在 Electron main 增加 `terminal-launcher`：
  - [ ] Windows PowerShell。
  - [ ] Windows CMD fallback。
  - [ ] macOS Terminal/iTerm fallback。
  - [ ] Linux x-terminal-emulator fallback。
- [ ] UI 增加：
  - [ ] 新建 Codex Thread。
  - [ ] Resume selected。
  - [ ] 复制命令。
  - [ ] 打开 Codex Home。
- [ ] 保留命令审计日志，记录命令、cwd、env key、启动结果。
- [ ] 测试：
  - [ ] Windows command quoting。
  - [ ] `codex.cmd/codex.exe` resolve。
  - [ ] session id quote。

## 阶段 5：Watch / Auto Continue / codex-loop 复刻

- [ ] UI 增加运行监控页：
  - [ ] watchlist。
  - [ ] auto-continue 次数设置。
  - [ ] 显式完成门禁状态。
  - [ ] start/stop/resume 控制。
- [ ] 接入 `/api/watch/auto-continue` 与 `/api/watch/control`。
- [ ] 接入 codex-loop host 操作：
  - [ ] bundled skill 安装。
  - [ ] daemon start/stop/restart。
  - [ ] Windows Python daemon。
  - [ ] macOS/Linux bash/tmux/nohup。
  - [ ] log tail。
  - [ ] rotation prompt。
- [ ] 测试：
  - [ ] watch write auth 本地允许。
  - [ ] daemon command builder Windows/macOS/Linux 快照。
  - [ ] loop state dir 不写进 VSIX state。

## 阶段 6：Team / Multi-Agent 全面复刻

- [ ] 接入 Team core 文件：
  - [ ] `team-coordination.js`
  - [ ] `team-actions.js`
  - [ ] `team-brief.js`
  - [ ] `team-worker-launcher.js`
  - [ ] `team-runtime-reconciliation.js`
  - [ ] `team-orchestration-launch.js`
  - [ ] role plugin catalog。
- [ ] 新增 desktop API：
  - [ ] `GET /api/team`
  - [ ] `POST /api/team/init`
  - [ ] `POST /api/team/workspaces`
  - [ ] `POST /api/team/workspaces/:id/run`
  - [ ] `POST /api/team/tasks/:id/retry`
  - [ ] `PATCH /api/team/tasks/:id`
  - [ ] `DELETE /api/team/tasks/:id`
  - [ ] `GET /api/team/roles`
- [ ] UI 增加 Team 页面：
  - [ ] workspace 列表。
  - [ ] task 列表。
  - [ ] DAG 编排草稿。
  - [ ] role selector。
  - [ ] worker launch status。
  - [ ] mailbox trace。
- [ ] 支持 Codex worker 和 Gemini worker。
- [ ] 测试：
  - [ ] 复用 `team-coordination.test.js`。
  - [ ] launch payload account binding。
  - [ ] envelope ingest。

## 阶段 6A：MOA / DAG 高级编排复刻

- [ ] 接入 MOA core：
  - [ ] `moa-core.js`
  - [ ] `moa-default-workers.js`
  - [ ] `moa-role-templates.js`
- [ ] UI 增加 MOA 编排页面：
  - [ ] DAG 节点列表。
  - [ ] worker 模型/provider 配置。
  - [ ] 并发/依赖/汇聚策略。
  - [ ] prompt preview。
  - [ ] run timeline。
- [ ] 与 Team 页面打通：
  - [ ] Team task 可生成 MOA draft。
  - [ ] MOA run 可写回 Team trace。
  - [ ] Worker launch 统一走同一审计日志。
- [ ] 测试：
  - [ ] 复用 `moa-core.test.js`。
  - [ ] DAG serialization snapshot。
  - [ ] worker template override 防回归。

## 阶段 6B：Trace / Evidence / Report 复刻

- [ ] 接入 trace core：
  - [ ] `trace-core.js`
  - [ ] `trace-dashboard.js`
  - [ ] `trace-report.js`
  - [ ] `thread-insight.js`
- [ ] UI 增加证据视图：
  - [ ] thread timeline。
  - [ ] file events。
  - [ ] command events。
  - [ ] check/error events。
  - [ ] raw JSONL preview。
  - [ ] Markdown report export。
- [ ] Dashboard/Detail 打通：
  - [ ] thread detail 展示 trace evidence。
  - [ ] Team worker 展示 mailbox/trace。
  - [ ] Usage/Trace 互相跳转。
- [ ] 测试：
  - [ ] 复用 `trace-core.test.js`、`trace-dashboard.test.js`、`trace-report.test.js`、`thread-insight.test.js`。
  - [ ] report export fixture 不泄露本地私密路径，必要时脱敏。

## 阶段 7：Usage / Proxy / Settings 补齐

- [ ] Usage：
  - [ ] 触发 `ingestKnownCliUsageLogs`。
  - [ ] 触发 `rebuildPersistedUsageReport`。
  - [ ] 账号维度/worker 维度/会话维度汇总。
  - [ ] JSON/Markdown 导出。
- [ ] Proxy：
  - [ ] Clash controller URL/secret/timeout 设置。
  - [ ] proxy group 列表。
  - [ ] switch proxy。
  - [ ] network probe。
- [ ] Settings：
  - [ ] 映射 VSIX 配置项到 desktop settings。
  - [ ] 配置导入/导出。
  - [ ] 重置 desktop backend state。
  - [ ] 打开日志目录。
- [ ] 测试：
  - [ ] settings normalize。
  - [ ] proxy API mock。
  - [ ] usage report rebuild smoke。

## 阶段 7B：Skills / Memory / Provider Visibility 补齐

- [ ] Skills：
  - [ ] bundled skill list。
  - [ ] install/update/open skill folder。
  - [ ] codex-loop/gemini-loop/kimi-loop 状态识别。
  - [ ] skill install logs。
- [ ] Memory：
  - [ ] memory root 探测。
  - [ ] memory summary 查看。
  - [ ] rollout summary 索引。
  - [ ] memory refresh/export。
- [ ] Provider visibility：
  - [ ] provider/account/model availability 聚合。
  - [ ] wrapper/bundled/system/workspace 来源分类。
  - [ ] capability warning。
  - [ ] degraded mode 提示。
- [ ] Service capabilities：
  - [ ] 桌面启动时跑 capability snapshot。
  - [ ] 设置页展示 missing tools 和修复建议。
  - [ ] release manifest 写入 capability schema version。
- [ ] 测试：
  - [ ] 复用 `skill-manager.test.js`、`memory-manager.test.js`、`provider-visibility` fixtures、`service-capabilities.test.js`。
  - [ ] Windows 无 bash/tmux 时不显示错误能力，只显示降级路径。

## 阶段 8：UI 精修与生产发布

- [ ] 建立桌面视觉规范：
  - [ ] 页面密度。
  - [ ] 表格列宽。
  - [ ] 状态色。
  - [ ] 空态。
  - [ ] 危险操作。
  - [ ] Windows/macOS 字体与窗口边距。
- [ ] 每个主模块都有真实数据态、空态、错误态、加载态。
- [ ] 视觉验收：
  - [ ] 2048x1120。
  - [ ] 1440x900。
  - [ ] 1280x720。
  - [ ] 窄屏 fallback。
- [ ] GitHub Actions：
  - [ ] Windows EXE。
  - [ ] Windows portable。
  - [ ] macOS dmg/zip。
  - [ ] artifact manifest 含 commit、platform、sha、feature parity version。
- [ ] 发布前最终三轮审核：
  - [ ] 功能 parity 审核。
  - [ ] UI/体验审核。
  - [ ] Release/安装审核。

## 测试计划

- 每阶段必须至少通过：
  - [ ] `desktop-electron npm run build`
  - [ ] `desktop-electron npm test`
  - [ ] 相关 host 单元测试迁移或复用。
- P0 parity 完成前必须通过：
  - [ ] `cma node --test src/host/account-manager.test.js`
  - [ ] `cma node --test src/host/team-coordination.test.js`
  - [ ] `cma node --test src/host/moa-core.test.js`
  - [ ] `cma node --test src/host/trace-core.test.js`
  - [ ] `cma node --test src/host/usage-ledger.test.js`
  - [ ] `cma node --test src/host/skill-manager.test.js`
  - [ ] `cma node --test src/host/node-backend/node-backend.test.js`
  - [ ] `desktop-electron node --test test/*.test.js`
- 发布前必须验证：
  - [ ] Windows 安装包可启动。
  - [ ] macOS 包可启动。
  - [ ] 首次启动无 VS Code 依赖。
  - [ ] Codex CLI 不在 PATH 时有明确诊断。
  - [ ] CODEX_HOME 错误时可从设置修复。
  - [ ] 桌面 state 不污染 VSIX state。
  - [ ] VSIX 功能没有被桌面改动破坏。

## Need User Input Later

- [ ] 桌面版是否需要内置 terminal，还是只打开系统 PowerShell/CMD/Terminal。
- [ ] 账号池真实数据展示是否使用“账号名脱敏”作为默认策略。
- [ ] Team 编排页面优先做 DAG 画布，还是优先做任务表格。
- [ ] macOS 发行是否需要签名/notarization。
- [ ] 是否要把 desktop 版本号与 VSIX 版本号统一，例如都走 `1.0.x`。

## Assumptions

- 桌面版目标不是替代 VSIX，而是给非 VS Code 场景提供完整 CMA 控制台。
- VSIX 继续作为功能基线，桌面版不能落后于核心 host 能力。
- CodexManager 只作为 UI 审美参考，不作为功能范围参考。
- Windows 是一等平台；macOS 同步支持；Linux 桌面包可后置。
- 本地不打正式 EXE，正式包继续由 GitHub Actions 构建。

## 总体完成标准

- [ ] 桌面版所有主导航页面都有真实功能，不是占位说明。
- [ ] 账号池能完成 VSIX 的导入、登录、激活、刷新、用量、删除、状态检测。
- [ ] 会话 Dashboard/Board/Detail 能完成 VSIX 的浏览、筛选、生命周期操作和证据查看。
- [ ] New Agent/Resume 能在 Windows/macOS 原生启动 Codex。
- [ ] Watch/Auto Continue/codex-loop 能完整启动、停止、查看日志和处理限制。
- [ ] Team 编排能创建 workspace、保存 DAG、启动 worker、读取 envelope、展示 trace。
- [ ] Usage Insights 能 ingest/rebuild/export。
- [ ] Proxy/Clash/Network probe 能配置、检测、切换。
- [ ] Trace/Evidence 能浏览、过滤、导出并与 Thread/Team 互跳。
- [ ] MOA 编排能创建 DAG、预览 worker prompt、启动 worker、展示运行结果。
- [ ] Skill Manager 能安装/查看 bundled skills，并支撑 loop 能力。
- [ ] Memory Manager 能查看 memory summary、rollout summary，并导出必要证据。
- [ ] Provider Visibility/Service Capabilities 能解释当前机器可用能力和降级原因。
- [ ] Settings 覆盖 VSIX 配置的桌面等价项。
- [ ] CI 能证明 desktop 与 VSIX 的共享后端不漂移。
- [ ] Windows/macOS 桌面包均能安装启动并通过 smoke。
- [ ] 最终三轮审核通过后，才标记“桌面版全面复刻 VSIX”完成。

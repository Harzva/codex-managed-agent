function getLocalizationScript() {
  return `      const PANEL_ZH_TEXT = {
        "Overview": "总览",
        "Threads": "线程",
        "Board": "看板",
        "Team": "团队",
        "Loop": "循环",
        "Insights": "洞察",
        "Dashboard": "仪表盘",
        "Config": "配置",
        "Skills": "技能",
        "Memory": "记忆",
        "Sidecar": "侧车",
        "Provider": "提供方",
        "Accounts": "账号",
        "Watch": "监控",
        "Open": "打开",
        "Open Editor": "打开编辑器",
        "Service": "服务",
        "Actions": "操作",
        "Reload": "刷新",
        "Start Backend": "启动后端",
        "Restart Backend": "重启后端",
        "Open Browser": "打开浏览器",
        "Agent Task Summary": "Agent 任务摘要",
        "Codex Account": "Codex 账号",
        "Thread Summary": "线程摘要",
        "Board Summary": "看板摘要",
        "Tab Management": "标签管理",
        "Coordination Queue": "协作队列",
        "Overview Snapshot": "总览快照",
        "Codex Configuration": "Codex 配置",
        "Codex Plugin Sidecar": "Codex 插件侧车",
        "Codex Provider Sync": "Codex 提供方同步",
        "Codex Accounts": "Codex 账号",
        "Rate limits remaining": "剩余额度",
        "Rate limits not reported yet": "暂未采集到额度",
        "Waiting for live quota metadata": "等待实时额度数据",
        "Token health": "Token 状态",
        "Profile state": "Profile 状态",
        "local auth only": "仅本地认证",
        "missing auth": "缺少认证",
        "managed only": "仅托管",
        "active in ~/.codex": "已激活于 ~/.codex",
        "Local Watch": "本地监控",
        "Skill Library": "技能库",
        "Sync Skills": "同步技能",
        "Skills Folder": "技能目录",
        "Manage Accounts": "管理账号",
        "Add Account": "添加账号",
        "Add Relay": "添加中继",
        "Import from Codex": "从 Codex 导入",
        "Refresh": "刷新",
        "New Tab": "新建标签",
        "Clear Filter": "清除筛选",
        "Open Board": "打开看板",
        "Save Layout": "保存布局",
        "Team Off": "团队关闭",
        "Collapse Groups": "折叠分组",
        "Expand Groups": "展开分组",
        "All": "全部",
        "Running": "运行中",
        "Stopped": "已停止",
        "Unknown": "未知",
        "Queued": "排队中",
        "Idle": "空闲",
        "Completed": "已完成",
        "Failed": "失败",
        "Blocked": "已阻塞",
        "Visible": "可见",
        "Linked": "已链接",
        "Attached": "已加入",
        "Recent": "最近",
        "Board Group Attached": "已加入看板组",
        "Board Linked": "看板已链接",
        "Codex Focused": "Codex 聚焦",
        "Codex Sidebar": "Codex 侧边栏",
        "Codex Open": "Codex 已打开",
        "Linking...": "链接中...",
        "LOOP RUNNING": "循环运行中",
        "LOOP ATTACHED": "已接入循环",
        "LIMITED": "受限",
        "STOPPED": "已停止",
        "RUNNING": "运行中",
        "UNKNOWN": "未知",
        "QUEUED": "排队中",
        "IDLE": "空闲",
        "COMPLETED": "已完成",
        "FAILED": "失败",
        "BLOCKED": "已阻塞",
        "VISIBLE": "可见",
        "LINKED": "已链接",
        "ATTACHED": "已加入",
        "RECENT": "最近",
        "BOARD GROUP ATTACHED": "已加入看板组",
        "BOARD LINKED": "看板已链接",
        "CODEX FOCUSED": "Codex 聚焦",
        "CODEX SIDEBAR": "Codex 侧边栏",
        "CODEX OPEN": "Codex 已打开",
        "Needs Human": "需要人工",
        "NEEDS HUMAN": "需要人工",
        "Needs Human Attention": "需要人工关注",
        "Archived": "已归档",
        "Soft Deleted": "软删除",
        "Pinned": "已固定",
        "Select Visible": "选择可见项",
        "Deselect All": "取消全选",
        "Copy IDs": "复制 ID",
        "Add to Board": "加入看板",
        "Set to Tab": "设为标签",
        "Archive": "归档",
        "Unarchive": "取消归档",
        "Soft Delete": "软删除",
        "Restore": "恢复",
        "Hard Delete": "彻底删除",
        "Cancel": "取消",
        "Save": "保存",
        "Close": "关闭",
        "Edit": "编辑",
        "Preview": "预览",
        "Codex": "Codex",
        "Terminal": "终端",
        "Editor": "编辑器",
        "Chat": "聊天",
        "Cmd": "命令",
        "Cmp": "压缩",
        "Prompt": "提示词",
        "Auto": "自动续跑",
        "Git Init": "初始化 Git",
        "Git Push": "推送 Git",
        "Pin": "固定",
        "Pinned": "已固定",
        "+ Tab": "+ 标签",
        "Attach Board": "加入看板",
        "Unattach Board": "移出看板",
        "Attach Loop": "接入循环",
        "Loop Attached": "已接入循环",
        "Stop Loop": "停止循环",
        "Thread Id": "线程 ID",
        "Card Name": "卡片名",
        "Card": "卡片",
        "Root": "根目录",
        "CLI default model": "CLI 默认模型",
        "Thread resolving": "线程解析中",
        "Process alive": "进程存活",
        "Process exited": "进程已退出",
        "Dispatch running": "调度运行中",
        "Dispatch completed": "调度已完成",
        "Dispatch failed": "调度失败",
        "Status": "状态",
        "Action": "操作",
        "Actions": "操作",
        "Files": "文件",
        "Commands": "命令",
        "Checks": "检查",
        "Last Error": "最后错误",
        "Recent Events": "最近事件",
        "Recent log": "最近日志",
        "Task Timeline": "任务时间线",
        "Open Run Log": "打开运行日志",
        "Open Trace": "打开 Trace",
        "Open Task": "打开任务",
        "Details": "详情",
        "Select": "选择",
        "Claim": "认领",
        "Heartbeat": "心跳",
        "Block": "阻塞",
        "Complete": "完成",
        "Run Log": "运行日志",
        "Retry Same Thread": "重试原线程",
        "Retry in New Worker": "新 Worker 重试",
        "Copy Failure + Prompt": "复制失败和提示词",
        "No running agents right now.": "当前没有运行中的 Agent。",
        "No recent log preview available.": "暂无最近日志预览。",
        "Select a thread to inspect its chat history.": "选择一个线程查看聊天历史。",
        "Batch actions appear when threads are selected.": "选择线程后会显示批量操作。",
        "Loading account info…": "正在加载账号信息…",
        "Showing running and recent threads first.": "优先显示运行中和最近线程。",
        "No cards yet.": "暂无卡片。",
        "Manual": "手动",
        "Off": "关闭",
        "On": "开启",
      };

      function panelLanguageKey() {
        return state && state.ui && state.ui.panelLanguage === "zh" ? "zh" : "en";
      }

      function uiText(text) {
        const raw = String(text ?? "");
        if (panelLanguageKey() !== "zh") return raw;
        const trimmed = raw.trim();
        if (!trimmed) return raw;
        let translated = PANEL_ZH_TEXT[trimmed];
        if (!translated && trimmed === trimmed.toUpperCase()) {
          const titleCase = trimmed.toLowerCase().replace(/\\b[a-z]/g, (char) => char.toUpperCase());
          translated = PANEL_ZH_TEXT[titleCase];
        }
        if (!translated) {
          translated = trimmed
            .replace(/^Cmd (\\d+)$/, "命令 $1")
            .replace(/^Cmp (\\d+)$/, "压缩 $1")
            .replace(/^Auto (\\d+)$/, "自动续跑 $1")
            .replace(/^Auto (\\d+)\\/(\\d+)(.*)$/, "自动续跑 $1/$2$3")
            .replace(/^Commands (\\d+)$/, "命令 $1")
            .replace(/^Compactions (\\d+)$/, "压缩 $1")
            .replace(/^Card: (.+)$/, "卡片: $1")
            .replace(/^Root (.+)$/, "根目录 $1")
            .replace(/^Loop (.+)$/, "循环 $1")
            .replace(/^Theme: (.+)$/, "主题: $1")
            .replace(/^Visual: (.+)$/, "视觉: $1")
            .replace(/^Motion: (.+)$/, "动效: $1")
            .replace(/^Alert: (.+)$/, "提示音: $1")
            .replace(/^Follow VS Code: (On|Off)$/, "跟随 VS Code: $1")
            .replace(/^Thread (.+)$/, "线程 $1")
            .replace(/^Task (.+)$/, "任务 $1")
            .replace(/^Owner (.+)$/, "负责人 $1")
            .replace(/^PID (.+)$/, "PID $1")
            .replace(/^Model (.+)$/, "模型 $1");
        }
        if (translated === trimmed) return raw;
        return raw.replace(trimmed, translated);
      }

      function translateHtmlFragment(html) {
        if (panelLanguageKey() !== "zh") return String(html ?? "");
        return String(html ?? "").replace(/>([^<>]+)</g, (match, text) => {
          const translated = uiText(text);
          return translated === text ? match : ">" + translated + "<";
        });
      }

      function applyPanelLanguageChrome() {
        const isZh = panelLanguageKey() === "zh";
        document.body.classList.toggle("panel-language-zh", isZh);
        document.body.classList.toggle("panel-language-en", !isZh);
        setNodeText("panelLanguageToggle", isZh ? "EN Panel" : "中文面板");
        const toggle = byId("panelLanguageToggle");
        if (toggle) toggle.classList.toggle("active", isZh);
        if (!isZh || typeof document.createTreeWalker !== "function" || typeof NodeFilter === "undefined") return;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node && node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest("script, style, textarea, pre, code, .mono, .terminal-line, .chat, .memory-editor-preview, [data-no-i18n]")) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
          const next = uiText(node.nodeValue || "");
          if (next !== node.nodeValue) node.nodeValue = next;
        });
      }
`;
}

module.exports = {
  getLocalizationScript,
};

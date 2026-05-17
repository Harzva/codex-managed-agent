function getSkillsMemoryRuntimeScript() {
  return `      function renderSkillsPanel(skills) {
        const query = String(state.ui.skillSearch || "").trim();
        const visibleSkills = filterSkillsForWebview(skills, query);
        const installed = visibleSkills.filter((s) => s.installed);
        const bundledOnly = visibleSkills.filter((s) => s.bundled && !s.installed);
        const sections = [];
        const searchHtml = '<div class="skill-toolbar">' +
          '<label class="skill-search-label" for="skillSearchInput">Search</label>' +
          '<input id="skillSearchInput" class="skill-search-input" data-skill-search type="search" placeholder="Find skills by name, tag, or description" value="' + esc(query) + '" />' +
          '<span class="skill-search-count">' + visibleSkills.length + '/' + skills.length + '</span>' +
          '</div>';
        if (installed.length) {
          sections.push(
            '<div class="skill-section">' +
            '<div class="skill-section-header"><span class="skill-section-icon">📦</span> Installed (' + installed.length + ')</div>' +
            '<div class="skill-card-grid">' + installed.map(renderSkillCard).join("") + '</div>' +
            '</div>'
          );
        }
        if (bundledOnly.length) {
          sections.push(
            '<div class="skill-section">' +
            '<div class="skill-section-header"><span class="skill-section-icon">🎁</span> Bundled (' + bundledOnly.length + ')</div>' +
            '<div class="skill-card-grid">' + bundledOnly.map(renderSkillCard).join("") + '</div>' +
            '</div>'
          );
        }
        if (!skills.length) {
          return '<div class="skill-empty-state"><div class="skill-empty-icon">🛠️</div><div class="skill-empty-title">No skills found</div><div class="skill-empty-copy">Bundled skills will appear here. Use Sync Skills to install them.</div></div>';
        }
        if (!visibleSkills.length) {
          return searchHtml + '<div class="skill-empty-state"><div class="skill-empty-icon">🔎</div><div class="skill-empty-title">No matching skills</div><div class="skill-empty-copy">Try a skill name, tag, description, or file hint.</div></div>' + renderSkillDrawer(skills);
        }
        return searchHtml + sections.join("") + renderSkillDrawer(skills);
      }

      function filterSkillsForWebview(skills, query) {
        const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) return skills;
        return skills.filter((skill) => {
          const haystack = [
            skill.name,
            skill.title,
            skill.description,
            skill.version,
            ...(Array.isArray(skill.tags) ? skill.tags : []),
            ...(Array.isArray(skill.files) ? skill.files : []),
            skill.skillMdPreview,
          ].filter(Boolean).join("\\n").toLowerCase();
          return terms.every((term) => haystack.includes(term));
        });
      }

      function renderSkillCard(skill) {
        const status = skill.updateAvailable ? "Update Available" : skill.installed ? (skill.managed ? "Installed" : "External") : "Not Installed";
        const badgeClass = skill.updateAvailable ? "skill-badge-update" : skill.installed ? (skill.managed ? "skill-badge-installed" : "skill-badge-external") : "skill-badge-bundled";
        const tagsHtml = (skill.tags || []).slice(0, 4).map((tag) => '<span class="skill-tag-pill">' + esc(tag) + '</span>').join("");
        return (
          '<div class="skill-card" data-skill-name="' + esc(skill.name) + '" role="button" tabindex="0">' +
          '<div class="skill-card-top">' +
          '<div class="skill-card-icon">' + esc(skill.name.charAt(0).toUpperCase()) + '</div>' +
          '<div class="skill-card-headline">' +
          '<div class="skill-card-title">' + esc(skill.title || skill.name) + '<span class="skill-card-version">' + esc(skill.version || "") + '</span></div>' +
          '<div class="skill-card-desc">' + esc(short(skill.description || "", 90)) + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="skill-card-bottom">' +
          '<span class="skill-badge ' + badgeClass + '">' + esc(status) + '</span>' +
          '<div class="skill-card-tags">' + tagsHtml + '</div>' +
          '</div>' +
          '</div>'
        );
      }

      function renderSkillDrawer(skills) {
        const skill = skills.find((s) => s.name === state.ui.skillDrawerName);
        if (!skill) return "";
        const tab = state.ui.skillDrawerTab || "readme";
        let tabContent = "";
        if (tab === "readme") {
          tabContent = skill.hasSkillMd ? simpleMarkdownToHtml(skill.skillMdPreview || "") : '<div class="skill-drawer-empty">No SKILL.md available.</div>';
        } else if (tab === "manifest") {
          tabContent = '<pre class="skill-drawer-json"><code>' + esc(JSON.stringify(skill.manifest || {}, null, 2)) + '</code></pre>';
        } else if (tab === "files") {
          const tree = renderSkillFileTree(skill);
          tabContent = tree || '<div class="skill-drawer-empty">No files listed.</div>';
        }
        const actions = [];
        if (!skill.installed && skill.bundled) {
          actions.push('<button class="chip" data-skill-action="install" data-skill-name="' + esc(skill.name) + '" type="button">Install</button>');
        }
        if (skill.updateAvailable) {
          actions.push('<button class="chip" data-skill-action="update" data-skill-name="' + esc(skill.name) + '" type="button">Update</button>');
        }
        if (skill.skillPath) {
          actions.push('<button class="chip" data-skill-action="openFolder" data-skill-name="' + esc(skill.name) + '" type="button">Open Folder</button>');
        }
        return (
          '<div class="skill-drawer-overlay" data-skill-drawer-overlay="true">' +
          '<div class="skill-drawer">' +
          '<div class="skill-drawer-head">' +
          '<div class="skill-drawer-title">' + esc(skill.title || skill.name) + '</div>' +
          '<button class="skill-drawer-close" data-skill-drawer-close="true" type="button">Close</button>' +
          '</div>' +
          '<div class="skill-drawer-tabs">' +
          '<button class="skill-drawer-tab ' + (tab === "readme" ? "active" : "") + '" data-skill-drawer-tab="readme" type="button">SKILL.md</button>' +
          '<button class="skill-drawer-tab ' + (tab === "manifest" ? "active" : "") + '" data-skill-drawer-tab="manifest" type="button">Manifest</button>' +
          '<button class="skill-drawer-tab ' + (tab === "files" ? "active" : "") + '" data-skill-drawer-tab="files" type="button">Files</button>' +
          '</div>' +
          '<div class="skill-drawer-body">' + tabContent + '</div>' +
          '<div class="skill-drawer-actions">' + actions.join("") + '</div>' +
          '</div>' +
          '</div>'
        );
      }

      function renderSkillFileTree(skill) {
        const folders = { scripts: skill.scripts || [], references: skill.references || [], agents: skill.agents || [] };
        const parts = [];
        for (const [folder, files] of Object.entries(folders)) {
          if (!files.length) continue;
          parts.push('<div class="skill-tree-folder"><span class="skill-tree-folder-icon">📁</span> ' + esc(folder) + '</div>');
          for (const file of files) {
            parts.push('<div class="skill-tree-file"><span class="skill-tree-file-icon">📄</span> ' + esc(file) + '</div>');
          }
        }
        return parts.join("");
      }

      function memoryScopeStats(scopeData) {
        const files = (scopeData && Array.isArray(scopeData.files)) ? scopeData.files : [];
        const existing = files.filter((file) => file && file.exists);
        return {
          total: files.length,
          existing: existing.length,
          tokens: existing.reduce((sum, file) => sum + Number(file.tokens || 0), 0),
        };
      }

      function memoryProjectAgents(scopeData) {
        const files = (scopeData && Array.isArray(scopeData.files)) ? scopeData.files : [];
        return files.find((file) => file && file.name === "AGENTS.md") || null;
      }

      function renderMemoryScopeTile(label, stats, pathLabel) {
        return '<article class="memory-scope-tile">' +
          '<div class="memory-scope-label">' + esc(label) + '</div>' +
          '<div class="memory-scope-value">' + esc(String(stats.existing)) + '/' + esc(String(stats.total)) + '</div>' +
          '<div class="memory-scope-path mono">' + esc(pathLabel || "-") + '</div>' +
        '</article>';
      }

      function renderMemoryPage(memory) {
        const m = memory || { project: { files: [] }, global: { files: [] }, system: { files: [] } };
        const projectStats = memoryScopeStats(m.project);
        const globalStats = memoryScopeStats(m.global);
        const systemStats = memoryScopeStats(m.system);
        const totalTokens = projectStats.tokens + globalStats.tokens + systemStats.tokens;
        const projectAgents = memoryProjectAgents(m.project);
        const projectReady = Boolean(projectAgents && projectAgents.exists);
        const heroTitle = projectReady ? "Project memory is active" : "Project memory needs setup";
        const heroCopy = projectReady
          ? "AGENTS.md is present for this workspace, so Codex has project-level instructions before it starts work."
          : "Create AGENTS.md first; global and system memory are useful, but project rules should lead this workspace.";
        return '<div class="memory-page">' +
          '<div class="memory-hero ' + esc(projectReady ? "ok" : "warn") + '">' +
            '<div>' +
              '<div class="memory-kicker">Memory priority</div>' +
              '<h2 class="memory-title">' + esc(heroTitle) + '</h2>' +
              '<div class="memory-hero-copy">' + esc(heroCopy) + '</div>' +
            '</div>' +
            '<div class="memory-hero-actions chip-row">' +
              '<button class="chip" data-memory-refresh type="button">Refresh</button>' +
              '<button class="chip primary" data-memory-create-project type="button">' + esc(projectReady ? "New Project Memory" : "Create Project Memory") + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="memory-scope-strip">' +
            renderMemoryScopeTile("Project", projectStats, m.project?.cwd) +
            renderMemoryScopeTile("Global", globalStats, m.global?.home) +
            renderMemoryScopeTile("System", systemStats, "/etc/codex") +
            '<article class="memory-scope-tile">' +
              '<div class="memory-scope-label">Token estimate</div>' +
              '<div class="memory-scope-value">~' + esc(String(totalTokens)) + '</div>' +
              '<div class="memory-scope-path mono">loaded memory files only</div>' +
            '</article>' +
          '</div>' +
          '<div class="memory-primary-section">' +
            '<div class="memory-primary-head">' +
              '<div><div class="memory-section-title">Project instructions</div><div class="memory-section-path">' + esc(m.project?.cwd || "Open a workspace to see project memory") + '</div></div>' +
              '<span class="memory-focus-pill ' + esc(projectReady ? "ok" : "warn") + '">' + esc(projectReady ? "Ready" : "Needs AGENTS.md") + '</span>' +
            '</div>' +
            renderMemoryAccordion("Project Memory", m.project, m.project?.cwd) +
          '</div>' +
          renderMemoryAccordion("Global Memory", m.global, m.global?.home) +
          renderMemoryAccordion("System Memory", m.system, "/etc/codex") +
          renderMemoryStats(m) +
        '</div>';
      }

      function renderMemoryCreator() {
        return '<div class="memory-creator-overlay">' +
          '<div class="memory-creator-modal">' +
            '<h3 class="memory-creator-title">Create Project AGENTS.md</h3>' +
            '<p class="memory-creator-desc">Choose a template to get started.</p>' +
            '<div class="memory-creator-options">' +
              '<button class="memory-creator-option" data-memory-template="minimal" type="button">' +
                '<strong>Minimal</strong><span>A simple starter with commands and basic rules.</span>' +
              '</button>' +
              '<button class="memory-creator-option" data-memory-template="full" type="button">' +
                '<strong>Full</strong><span>Architecture, commands, testing, and lint rules.</span>' +
              '</button>' +
              '<button class="memory-creator-option" data-memory-template="from-global" type="button">' +
                '<strong>Copy from Global</strong><span>Start with your global AGENTS.md as a base.</span>' +
              '</button>' +
            '</div>' +
            '<div class="memory-creator-actions">' +
              '<button class="chip" data-memory-creator-close type="button">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function renderHistoryViewer(historyData) {
        const { entries, totalLines, truncated, filePath } = historyData || { entries: [], totalLines: 0, truncated: false };
        return '<div class="history-viewer-overlay" data-history-overlay>' +
          '<div class="history-viewer-drawer">' +
            '<div class="history-viewer-head">' +
              '<span class="history-viewer-title">Conversation History</span>' +
              '<span class="history-viewer-meta">' + esc(entries.length + ' turns \u00b7 ' + totalLines + ' total lines') + (truncated ? ' (showing last 1000)' : '') + '</span>' +
              '<button class="chip" data-history-close type="button">Close</button>' +
            '</div>' +
            '<div class="history-viewer-body">' +
              (entries.length
                ? entries.map((entry) => renderHistoryTurn(entry)).join('')
                : '<div class="history-empty">No history entries found.</div>') +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function renderHistoryTurn(entry) {
        const roleClass = 'role-' + esc(entry.role);
        const roleIcon = entry.role === 'user' ? '\uD83D\uDC64' : entry.role === 'assistant' ? '\uD83E\uDD16' : entry.role === 'tool' ? '\uD83D\uDD27' : '\u2753';
        const content = entry.content || (entry.toolName ? '[' + esc(entry.toolName) + '] ' + esc(entry.toolInput || '') : '');
        return '<div class="history-turn ' + roleClass + '">' +
          '<div class="history-turn-head">' +
            '<span class="history-turn-icon">' + roleIcon + '</span>' +
            '<span class="history-turn-role">' + esc(entry.role.toUpperCase()) + '</span>' +
            '<span class="history-turn-time">' + esc(entry.timestamp ? formatTimestamp(entry.timestamp) : '-') + '</span>' +
          '</div>' +
          '<div class="history-turn-content">' + esc(short(content, 280)) + '</div>' +
        '</div>';
      }

      function renderMemoryAccordion(title, scopeData, pathLabel) {
        const files = scopeData?.files || [];
        const existsCount = files.filter((f) => f.exists).length;
        if (!files.length) {
          return '<div class="memory-section"><div class="memory-section-head"><span class="memory-section-title">' + esc(title) + '</span><span class="memory-section-path">Open a workspace to see project memory</span></div></div>';
        }
        const rows = files.map((file) => {
          const statusIcon = file.exists ? '\u2705' : '\u274C';
          const statusText = file.exists ? 'exists' : 'missing';
          const actions = [];
          if (file.exists && file.editable) actions.push('<button class="chip" data-memory-edit="' + esc(file.filePath) + '" type="button">Edit</button>');
          if (file.exists) actions.push('<button class="chip" data-memory-view="' + esc(file.filePath) + '" type="button">View</button>');
          if (!file.exists && file.name === "AGENTS.md") actions.push('<button class="chip primary" data-memory-create="' + esc(file.filePath) + '" type="button">Create</button>');
          return '<div class="memory-row ' + (file.exists ? '' : 'missing') + '">' +
            '<div class="memory-row-icon">' + (file.kind === "agents-md" ? '\uD83D\uDCC4' : file.kind === "config-toml" ? '\u2699\uFE0F' : file.kind === "history-jsonl" ? '\uD83D\uDCDC' : '\uD83D\uDCC1') + '</div>' +
            '<div class="memory-row-body">' +
              '<div class="memory-row-name">' + esc(file.name) + ' <span class="memory-row-status">' + statusIcon + ' ' + statusText + '</span></div>' +
              (file.exists ? '<div class="memory-row-meta">' + esc(file.lineCount + ' lines · ' + (file.tokens || 0) + ' tokens · ' + formatTimestamp(file.lastModified)) + '</div>' : '') +
            '</div>' +
            '<div class="memory-row-actions">' + actions.join("") + '</div>' +
          '</div>';
        }).join('');
        return '<div class="memory-section">' +
          '<div class="memory-section-head" data-memory-toggle>' +
            '<span class="memory-section-title">' + esc(title) + ' <span class="memory-section-count">(' + existsCount + '/' + files.length + ')</span></span>' +
            '<span class="memory-section-path">' + esc(pathLabel || "-") + '</span>' +
          '</div>' +
          '<div class="memory-section-body">' + rows + '</div>' +
        '</div>';
      }

      function renderMemoryStats(memory) {
        const allFiles = [
          ...(memory.project?.files || []),
          ...(memory.global?.files || []),
          ...(memory.system?.files || []),
        ].filter((f) => f.exists);
        const totalTokens = allFiles.reduce((sum, f) => sum + (f.tokens || 0), 0);
        return '<div class="memory-stats">' +
          '<span>Total files: ' + allFiles.length + '</span>' +
          '<span>Total tokens: ~' + totalTokens + '</span>' +
        '</div>';
      }

      function renderMemoryEditor(filePath, content) {
        const isAgentsMd = filePath.endsWith("AGENTS.md");
        const isConfig = filePath.endsWith("config.toml");
        const title = filePath.split(/[\\/]/).pop();
        const readOnly = isConfig;
        const displayContent = readOnly ? maskConfigSecrets(content) : content;
        const body = readOnly
          ? '<div class="memory-editor-body" data-editor-pane="edit">' +
              '<div class="memory-editor-readonly-note">Config editing coming in a future release. API keys are masked for security.</div>' +
              '<pre class="memory-editor-readonly">' + esc(displayContent) + '</pre>' +
            '</div>'
          : '<div class="memory-editor-body" data-editor-pane="edit">' +
              '<textarea class="memory-editor-textarea" data-memory-textarea>' + esc(displayContent) + '</textarea>' +
            '</div>' +
            '<div class="memory-editor-body hidden" data-editor-pane="preview">' +
              '<div class="memory-editor-preview">' + renderMarkdownPreview(displayContent) + '</div>' +
            '</div>';
        const tabs = readOnly
          ? ''
          : '<div class="memory-editor-tabs">' +
              '<button class="memory-editor-tab active" data-editor-tab="edit" type="button">Edit</button>' +
              '<button class="memory-editor-tab" data-editor-tab="preview" type="button">Preview</button>' +
            '</div>';
        const actions = readOnly
          ? '<button class="chip" data-memory-editor-close type="button">Close</button>'
          : '<button class="chip primary" data-memory-save="' + esc(filePath) + '" type="button">Save</button>' +
            '<button class="chip" data-memory-editor-close type="button">Cancel</button>';
        return '<div class="memory-editor-overlay" data-memory-editor-overlay>' +
          '<div class="memory-editor-drawer">' +
            '<div class="memory-editor-head">' +
              '<span class="memory-editor-title">' + esc(title) + (readOnly ? ' (read-only)' : '') + '</span>' +
              '<span class="memory-editor-path">' + esc(filePath) + '</span>' +
              '<button class="chip" data-memory-editor-close type="button">Close</button>' +
            '</div>' +
            tabs +
            body +
            '<div class="memory-editor-actions">' +
              actions +
              '<span class="memory-editor-status" data-editor-status></span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function maskConfigSecrets(content) {
        return content
          .replace(/(api_key\\s*=\\s*["']?)([^\\s"'\\n]+)/gi, "$1***")
          .replace(/(Bearer\\s+)([^\\s\\n]+)/gi, "$1***")
          .replace(/(sk-[a-zA-Z0-9]+)/g, "***");
      }

      function renderMarkdownPreview(md) {
        if (!md) return "";
        let html = esc(md)
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
          .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
          .replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>')
          .replace(/\x60\x60\x60([\\s\\S]*?)\x60\x60\x60/g, '<pre><code>$1</code></pre>')
          .replace(/^\\* (.*$)/gim, '<li>$1</li>')
          .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/(<li>.*<\\/li>\\n?)+/g, '<ul>$&</ul>');
        return html;
      }

      function simpleMarkdownToHtml(md) {
        if (!md) return "";
        let html = esc(md);
        html = html.replace(/^#{1,3} (.+)$/gm, (_, text) => '<h3 class="skill-md-h3">' + text + '</h3>');
        html = html.replace(/^#{4,6} (.+)$/gm, (_, text) => '<h4 class="skill-md-h4">' + text + '</h4>');
        html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        html = html.replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
        html = html.replace(/^\\s*[-*] (.+)$/gm, (_, text) => '<li>' + text + '</li>');
        html = html.replace(/(<li>.*<\\/li>\\n?)+/g, (match) => '<ul>' + match + '</ul>');
        html = html.replace(/\x60\x60\x60[\\s\\S]*?\x60\x60\x60/g, (match) => '<pre class="skill-md-pre"><code>' + esc(match.replace(/\x60\x60\x60/g, "").trim()) + '</code></pre>');
        html = html.replace(/\\n{2,}/g, '</p><p>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><(h[34]|ul|pre)/g, '<$1');
        html = html.replace(/<\\/(h[34]|ul|pre)><\\/p>/g, '</$1>');
        html = html.replace(/<p><\\/p>/g, '');
        return html;
      }

      document.addEventListener("click", (event) => {
        const card = event.target.closest("[data-skill-name]");
        if (card && !event.target.closest("[data-skill-action]")) {
          state.ui.skillDrawerName = card.dataset.skillName;
          state.ui.skillDrawerTab = "readme";
          persistUi();
          render(state.payload);
          return;
        }
        const closeBtn = event.target.closest("[data-skill-drawer-close]");
        if (closeBtn) {
          state.ui.skillDrawerName = undefined;
          persistUi();
          render(state.payload);
          return;
        }
        const overlay = event.target.closest("[data-skill-drawer-overlay]");
        if (overlay && event.target === overlay) {
          state.ui.skillDrawerName = undefined;
          persistUi();
          render(state.payload);
          return;
        }
        const tabBtn = event.target.closest("[data-skill-drawer-tab]");
        if (tabBtn) {
          state.ui.skillDrawerTab = tabBtn.dataset.skillDrawerTab;
          persistUi();
          render(state.payload);
          return;
        }
        const actionBtn = event.target.closest("[data-skill-action]");
        if (actionBtn) {
          const action = actionBtn.dataset.skillAction;
          const name = actionBtn.dataset.skillName;
          if (action === "install") {
            vscode.postMessage({ type: "installBundledSkill", skillName: name });
          } else if (action === "update") {
            vscode.postMessage({ type: "installBundledSkill", skillName: name });
          } else if (action === "openFolder") {
            vscode.postMessage({ type: "revealInExplorer", path: (state.payload.skills || []).find((s) => s.name === name)?.skillPath || "" });
          }
          return;
        }
        const memoryToggle = event.target.closest("[data-memory-toggle]");
        if (memoryToggle) {
          const body = memoryToggle.nextElementSibling;
          if (body) body.hidden = !body.hidden;
          return;
        }
        const memoryRefresh = event.target.closest("[data-memory-refresh]");
        if (memoryRefresh) {
          vscode.postMessage({ type: "refreshMemory" });
          return;
        }
        const memoryEdit = event.target.closest("[data-memory-edit]");
        if (memoryEdit) {
          vscode.postMessage({ type: "readMemoryFile", filePath: memoryEdit.dataset.memoryEdit, mode: "edit" });
          return;
        }
        const memoryView = event.target.closest("[data-memory-view]");
        if (memoryView) {
          const filePath = memoryView.dataset.memoryView;
          if (filePath.endsWith("history.jsonl")) {
            vscode.postMessage({ type: "readHistoryJsonl", filePath });
          } else {
            vscode.postMessage({ type: "readMemoryFile", filePath, mode: "view" });
          }
          return;
        }
        const memoryCreate = event.target.closest("[data-memory-create]");
        if (memoryCreate) {
          vscode.postMessage({ type: "createMemoryFile", filePath: memoryCreate.dataset.memoryCreate });
          return;
        }
        const memoryCreateProject = event.target.closest("[data-memory-create-project]");
        if (memoryCreateProject) {
          state.ui.memoryCreatorOpen = true;
          persistUi();
          render(state.payload);
          return;
        }
        const memoryTemplate = event.target.closest("[data-memory-template]");
        if (memoryTemplate) {
          vscode.postMessage({ type: "createAgentsMdFromTemplate", templateKey: memoryTemplate.dataset.memoryTemplate, filePath: "AGENTS.md" });
          return;
        }
        const memoryCreatorClose = event.target.closest("[data-memory-creator-close]");
        if (memoryCreatorClose) {
          state.ui.memoryCreatorOpen = false;
          persistUi();
          render(state.payload);
          return;
        }
        const memoryEditorClose = event.target.closest("[data-memory-editor-close]");
        if (memoryEditorClose) {
          state.ui.memoryEditorFile = undefined;
          state.ui.memoryEditorContent = undefined;
          persistUi();
          render(state.payload);
          return;
        }
        const memoryEditorOverlay = event.target.closest("[data-memory-editor-overlay]");
        if (memoryEditorOverlay && event.target === memoryEditorOverlay) {
          state.ui.memoryEditorFile = undefined;
          state.ui.memoryEditorContent = undefined;
          persistUi();
          render(state.payload);
          return;
        }
        const memorySave = event.target.closest("[data-memory-save]");
        if (memorySave) {
          const filePath = memorySave.dataset.memorySave;
          const textarea = document.querySelector("[data-memory-textarea]");
          const content = textarea ? textarea.value : "";
          const status = document.querySelector("[data-editor-status]");
          if (status) {
            status.textContent = "Saving…";
            status.className = "memory-editor-status";
          }
          vscode.postMessage({ type: "saveMemoryFile", filePath, content });
          return;
        }
        const historyClose = event.target.closest("[data-history-close]");
        if (historyClose) {
          state.ui.historyViewerFile = undefined;
          state.ui.historyData = undefined;
          persistUi();
          render(state.payload);
          return;
        }
        const historyOverlay = event.target.closest("[data-history-overlay]");
        if (historyOverlay && event.target === historyOverlay) {
          state.ui.historyViewerFile = undefined;
          state.ui.historyData = undefined;
          persistUi();
          render(state.payload);
          return;
        }
        const editorTab = event.target.closest("[data-editor-tab]");
        if (editorTab) {
          const tab = editorTab.dataset.editorTab;
          const tabs = document.querySelectorAll("[data-editor-tab]");
          tabs.forEach((t) => t.classList.toggle("active", t.dataset.editorTab === tab));
          const panes = document.querySelectorAll("[data-editor-pane]");
          panes.forEach((p) => p.classList.toggle("hidden", p.dataset.editorPane !== tab));
          if (tab === "preview") {
            const textarea = document.querySelector("[data-memory-textarea]");
            const previewPane = document.querySelector('[data-editor-pane="preview"]');
            if (textarea && previewPane) {
              previewPane.innerHTML = '<div class="memory-editor-preview">' + renderMarkdownPreview(textarea.value) + '</div>';
            }
          }
          return;
        }
      });

      document.addEventListener("input", (event) => {
        const searchInput = event.target.closest("[data-skill-search]");
        if (searchInput) {
          state.ui.skillSearch = searchInput.value;
          persistUi();
          render(state.payload);
        }
      });`;
}

module.exports = {
  getSkillsMemoryRuntimeScript,
};

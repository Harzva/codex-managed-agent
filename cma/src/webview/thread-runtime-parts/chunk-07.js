module.exports = `        const link = codexLinkMeta(thread && thread.id, payload);
        if (link.isFocused) return "Focused";
        if (link.isOpen || link.pending) return "Linked";
        const archived = Boolean(thread && (thread.archived || thread.status === "archived"));
        return archived ? "Hidden" : "Visible";
      }

      function codexLinkBadge(threadId, payload = state.payload) {
        const link = codexLinkMeta(threadId, payload);
        if (link.isFocused) {
          return '<span class="badge badge-codex-focused">Codex Focused</span>';
        }
        if (link.isSidebar) {
          return '<span class="badge badge-codex-sidebar">Codex Sidebar</span>';
        }
        if (link.isOpen) {
          return '<span class="badge badge-codex-open">Codex Open</span>';
        }
        if (link.pending) {
          return '<span class="badge badge-codex-linking">Linking...</span>';
        }
        return "";
      }

      function playCompletionTone() {
        if (!state.ui.soundEnabled) return;
        try {
          const sound = soundStyleMeta();
          if (sound && sound.src) {
            const player = new Audio(sound.src);
            player.volume = sound.key === "nature" || sound.key === "fnaf" ? 0.42 : 0.72;
            player.currentTime = 0;
            player.play().catch(() => {});
            return;
          }
        } catch (error) {
        }
        try {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) return;
          const audio = new Context();
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(784, audio.currentTime);
          oscillator.frequency.linearRampToValueAtTime(988, audio.currentTime + 0.12);
          gain.gain.setValueAtTime(0.0001, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.24);
        } catch (error) {
        }
      }
`;

function getDisplayStateScript() {
  return `
      function themeMode() {
        return VISUAL_THEME_ORDER.includes(state.ui.themeMode) ? state.ui.themeMode : "vivid";
      }

      function colorThemeKey() {
        return COLOR_THEME_ORDER.includes(state.ui.colorTheme) ? state.ui.colorTheme : "system";
      }

      function colorThemeLabel(key = colorThemeKey()) {
        return COLOR_THEME_LABELS[key] || COLOR_THEME_LABELS.system || "VS Code";
      }

      function toggleThemeMode() {
        const order = VISUAL_THEME_ORDER;
        const current = themeMode();
        const next = order[(order.indexOf(current) + 1) % order.length];
        state.ui.themeMode = next;
        persistUi();
        render(state.payload);
      }

      function toggleColorTheme() {
        const order = COLOR_THEME_ORDER.filter((item) => item !== "system");
        const current = COLOR_THEME_ORDER.includes(state.ui.manualColorTheme) && state.ui.manualColorTheme !== "system"
          ? state.ui.manualColorTheme
          : (colorThemeKey() === "system" ? "light" : colorThemeKey());
        const next = order[(order.indexOf(current) + 1) % order.length];
        state.ui.manualColorTheme = next;
        state.ui.colorTheme = next;
        persistUi();
        render(state.payload);
      }

      function toggleFollowVsCodeTheme() {
        if (colorThemeKey() === "system") {
          const manual = COLOR_THEME_ORDER.includes(state.ui.manualColorTheme) && state.ui.manualColorTheme !== "system"
            ? state.ui.manualColorTheme
            : "light";
          state.ui.colorTheme = manual;
        } else {
          state.ui.manualColorTheme = colorThemeKey() === "system" ? (state.ui.manualColorTheme || "light") : colorThemeKey();
          state.ui.colorTheme = "system";
        }
        persistUi();
        render(state.payload);
      }

      function cycleSoundStyle() {
        const order = ["off", "plink", "splashes", "nature", "fnaf"];
        const current = state.ui.soundEnabled ? String(state.ui.soundStyle || "plink").toLowerCase() : "off";
        const index = order.indexOf(current);
        const next = order[(index + 1 + order.length) % order.length];
        state.ui.soundEnabled = next !== "off";
        if (next !== "off") {
          state.ui.soundStyle = next;
        }
        persistUi();
        render(state.payload);
        if (state.ui.soundEnabled) {
          window.setTimeout(() => playCompletionTone(), 40);
        }
      }

      function motionModeKey() {
        return MOTION_MODE_ORDER.includes(state.ui.motionMode) ? state.ui.motionMode : "quiet";
      }

      function toggleMotion() {
        const order = MOTION_MODE_ORDER;
        const current = motionModeKey();
        const index = order.indexOf(current);
        state.ui.motionMode = order[(index + 1 + order.length) % order.length];
        state.ui.motionEnabled = state.ui.motionMode === "full";
        persistUi();
        render(state.payload);
      }

      function soundStyleMeta(style = state.ui.soundStyle) {
        const key = String(style || "plink").toLowerCase();
        const table = {
          plink: { key: "plink", label: "Plink", src: MEDIA.alertPlink },
          splashes: { key: "splashes", label: "Splashes", src: MEDIA.alertSplashes },
          nature: { key: "nature", label: "Nature", src: MEDIA.alertNature },
          fnaf: { key: "fnaf", label: "FNAF", src: MEDIA.alertFnaf },
        };
        return table[key] || table.plink;
      }
  `.trim();
}

module.exports = {
  getDisplayStateScript,
};

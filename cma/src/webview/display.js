const UI_STATE_VERSION = 4;

const COLOR_THEME_ORDER = ["system", "light", "dark", "light-warm", "light-mint"];
const COLOR_THEME_LABELS = {
  system: "VS Code",
  dark: "Dark",
  light: "Light",
  "light-warm": "Light Warm",
  "light-mint": "Light Mint",
};

const VISUAL_THEME_ORDER = ["pure", "clean", "vivid"];
const VISUAL_THEME_LABELS = {
  pure: "Pure",
  clean: "Clean",
  vivid: "Vivid",
};

const MOTION_MODE_ORDER = ["full", "quiet", "extreme"];
const MOTION_MODE_LABELS = {
  full: "Full",
  quiet: "Quiet",
  extreme: "Extreme",
};

const THREAD_SORT_LABELS = {
  updated: "Updated newest",
  oldest: "Updated oldest",
  created: "Created newest",
  name_asc: "Title A-Z",
  name_desc: "Title Z-A",
  project: "Project directory",
  tokens_desc: "Token count",
};

const THREAD_SORT_KEYS = Object.keys(THREAD_SORT_LABELS);

const THREAD_FILTER_LABELS = {
  all: "All threads",
  running: "Running",
  recent: "Legacy recent/link",
  idle: "Stopped",
  needs_human: "Needs human attention",
  archived: "Archived",
  soft_deleted: "Soft deleted",
};

module.exports = {
  UI_STATE_VERSION,
  COLOR_THEME_ORDER,
  COLOR_THEME_LABELS,
  VISUAL_THEME_ORDER,
  VISUAL_THEME_LABELS,
  MOTION_MODE_ORDER,
  MOTION_MODE_LABELS,
  THREAD_SORT_LABELS,
  THREAD_SORT_KEYS,
  THREAD_FILTER_LABELS,
};

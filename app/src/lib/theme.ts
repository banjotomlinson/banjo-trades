// Shared theme types, presets, and CSS variable utilities
// Used by ThemeProvider, ThemeCustomiser, and Settings page

export interface ThemeColors {
  accent: string;
  bull: string;
  bear: string;
  warn: string;
  high: string;
  bg: string;
  panelBg: string;
  border: string;
  text: string;
  textDim: string;
  num: string;
  asia: string;
  london: string;
  ny: string;
}

export type PresetName =
  | "default"
  | "midnight"
  | "ocean"
  | "ember"
  | "matrix"
  | "purple"
  | "nord"
  | "light";

export interface PresetMeta {
  name: string;
  gradient: string;
  colors: ThemeColors;
}

export const PRESETS: Record<PresetName, PresetMeta> = {
  default: {
    name: "Default",
    gradient: "linear-gradient(135deg,#0a0e17,#3b82f6)",
    colors: {
      accent: "#3b82f6", bull: "#22c55e", bear: "#ef4444", warn: "#f59e0b",
      high: "#dc2626", bg: "#0a0e17", panelBg: "#111827", border: "#1e293b",
      text: "#e0e6ed", textDim: "#64748b", num: "#f1f5f9",
      asia: "#a855f7", london: "#3b82f6", ny: "#22c55e",
    },
  },
  midnight: {
    name: "Midnight",
    gradient: "linear-gradient(135deg,#020617,#6366f1)",
    colors: {
      accent: "#6366f1", bull: "#34d399", bear: "#f87171", warn: "#fbbf24",
      high: "#ef4444", bg: "#020617", panelBg: "#0f172a", border: "#1e293b",
      text: "#e2e8f0", textDim: "#475569", num: "#f8fafc",
      asia: "#818cf8", london: "#38bdf8", ny: "#34d399",
    },
  },
  ocean: {
    name: "Ocean",
    gradient: "linear-gradient(135deg,#042f2e,#06b6d4)",
    colors: {
      accent: "#06b6d4", bull: "#2dd4bf", bear: "#fb7185", warn: "#fcd34d",
      high: "#e11d48", bg: "#042f2e", panelBg: "#0d3b66", border: "#164e63",
      text: "#cffafe", textDim: "#67e8f9", num: "#e0f2fe",
      asia: "#c084fc", london: "#22d3ee", ny: "#2dd4bf",
    },
  },
  ember: {
    name: "Ember",
    gradient: "linear-gradient(135deg,#1a0a00,#f97316)",
    colors: {
      accent: "#f97316", bull: "#84cc16", bear: "#ef4444", warn: "#eab308",
      high: "#dc2626", bg: "#1a0a00", panelBg: "#2d1810", border: "#44281c",
      text: "#fed7aa", textDim: "#a16207", num: "#ffedd5",
      asia: "#d946ef", london: "#fb923c", ny: "#84cc16",
    },
  },
  matrix: {
    name: "Matrix",
    gradient: "linear-gradient(135deg,#001a00,#22c55e)",
    colors: {
      accent: "#22c55e", bull: "#4ade80", bear: "#ef4444", warn: "#facc15",
      high: "#dc2626", bg: "#001a00", panelBg: "#0a1f0a", border: "#14532d",
      text: "#bbf7d0", textDim: "#166534", num: "#dcfce7",
      asia: "#a3e635", london: "#22d3ee", ny: "#4ade80",
    },
  },
  purple: {
    name: "Purple",
    gradient: "linear-gradient(135deg,#1a0a2e,#a855f7)",
    colors: {
      accent: "#a855f7", bull: "#4ade80", bear: "#f43f5e", warn: "#f59e0b",
      high: "#e11d48", bg: "#1a0a2e", panelBg: "#2d1b4e", border: "#3b1f6e",
      text: "#e9d5ff", textDim: "#7c3aed", num: "#faf5ff",
      asia: "#e879f9", london: "#818cf8", ny: "#4ade80",
    },
  },
  nord: {
    name: "Nord",
    gradient: "linear-gradient(135deg,#2e3440,#88c0d0)",
    colors: {
      accent: "#88c0d0", bull: "#a3be8c", bear: "#bf616a", warn: "#ebcb8b",
      high: "#bf616a", bg: "#2e3440", panelBg: "#3b4252", border: "#434c5e",
      text: "#eceff4", textDim: "#81a1c1", num: "#e5e9f0",
      asia: "#b48ead", london: "#88c0d0", ny: "#a3be8c",
    },
  },
  light: {
    name: "Light",
    gradient: "linear-gradient(135deg,#e2e8f0,#2563eb)",
    colors: {
      accent: "#2563eb", bull: "#16a34a", bear: "#dc2626", warn: "#d97706",
      high: "#dc2626", bg: "#f8fafc", panelBg: "#ffffff", border: "#e2e8f0",
      text: "#1e293b", textDim: "#64748b", num: "#0f172a",
      asia: "#9333ea", london: "#2563eb", ny: "#16a34a",
    },
  },
};

export const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  accent: "--theme-accent",
  bull: "--theme-bull",
  bear: "--theme-bear",
  warn: "--theme-warn",
  high: "--theme-high",
  bg: "--theme-bg",
  panelBg: "--theme-panel-bg",
  border: "--theme-border",
  text: "--theme-text",
  textDim: "--theme-text-dim",
  num: "--theme-num",
  asia: "--theme-asia",
  london: "--theme-london",
  ny: "--theme-ny",
};

export const STYLE_ID = "theme-dynamic";
export const STORAGE_KEY = "banjoTheme";

export function applyThemeToDOM(theme: ThemeColors) {
  const root = document.documentElement;
  for (const [key, varName] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(varName, theme[key as keyof ThemeColors]);
  }

  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    body { background:${theme.bg} !important; color:${theme.text} !important; }
    .panel,.signal-card,.bias-card,.session-card,.chart-panel,.session-toggle-bar,
    .countdown-bar,.social-panel,.status-bar,.pnl-grid-wrap,.pnl-stats,
    .pnl-section,.pnl-summary-item,.sig-dropdown-menu,.social-section-header,.premarket,
    .dol-chart-panel,.view-tabs,.nav-btn,.sig-cat-bar,.theme-panel,
    .social-collapsible { background:${theme.panelBg} !important; border-color:${theme.border} !important; }
    .panel-header,.filters,.cal-table th,.cal-table td,.signal-row,.level-row,
    .session-hl-row,.pnl-cell,.pnl-day-header,.pnl-summary-item,.pnl-header,
    .dol-header,.social-panel-header { border-color:${theme.border} !important; }
    .header h1 span,.chart-label,.time-cell,.social-handle a,.sig-select-btn,
    .signal-card h3,.nav-label,.cal-table tr.day-header td,
    .dol-chart-title,.session-time-range,.pnl-month-label { color:${theme.accent} !important; }
    .session-toggle[data-session="asia"].active,.session-card.asia h3,
    .session-dot.asia { background:${theme.asia} !important; color:${theme.asia} !important; }
    .session-dot.asia { color:unset !important; }
    .session-toggle[data-session="asia"].active { color:#fff !important; }
    .session-card.asia h3 { background:transparent !important; }
    .session-toggle[data-session="london"].active,.session-card.london h3,
    .session-dot.london { background:${theme.london} !important; color:${theme.london} !important; }
    .session-dot.london { color:unset !important; }
    .session-toggle[data-session="london"].active { color:#fff !important; }
    .session-card.london h3 { background:transparent !important; }
    .session-toggle[data-session="newyork"].active,.session-card.newyork h3,
    .session-dot.newyork { background:${theme.ny} !important; color:${theme.ny} !important; }
    .session-dot.newyork { color:unset !important; }
    .session-toggle[data-session="newyork"].active { color:#fff !important; }
    .session-card.newyork h3 { background:transparent !important; }
    .signal-val,.level-price,.nasFutures,.spxFutures,.session-hl-val,
    .pnl-cell-ta,.cal-table td,.countdown { color:${theme.num} !important; }
    .signal-val.green,.level-price.support,.actual,.bias-value.long,
    .pnl-summary-val.pos,.pnl-cell.profit .pnl-cell-ta,
    .pnl-cell.profit .pnl-cell-date { color:${theme.bull} !important; }
    .signal-val.red,.level-price.resistance,.bias-value.short,
    .pnl-summary-val.neg,.pnl-cell.loss .pnl-cell-ta,
    .pnl-cell.loss .pnl-cell-date { color:${theme.bear} !important; }
    .bias-value.neutral,.signal-val.amber,.session-hl-val.range-val,
    .pnl-summary-val.neutral { color:${theme.warn} !important; }
    .impact-high { background:${theme.high} !important; }
    .panel-header h2,.header h1,.pnl-header h2,.social-section-header h2,
    .dol-header h2,.signal-card h3 { color:${theme.text} !important; }
    .signal-label,.level-name,.session-hl-label,.forecast,.cal-table th,
    .pnl-summary-label,.pnl-cell-date,.pnl-day-header,.countdown-sub,
    .bias-label { color:${theme.textDim} !important; }
    .nav-btn { color:${theme.textDim} !important; }
    .nav-today { border-color:${theme.accent} !important; color:${theme.accent} !important; }
    .nav-today:hover { background:${theme.accent} !important; color:#fff !important; }
    .sig-cat-tab:not(.active) { color:${theme.textDim} !important; border-color:${theme.border} !important; }
    .preset-swatch { border-color:${theme.border}; }
    .pnl-cell.profit { background:${theme.bull}1a !important; }
    .pnl-cell.loss   { background:${theme.bear}1a !important; }
    .pnl-cell.is-today { outline-color:${theme.accent} !important; }
    .pnl-cell.is-today .pnl-cell-date { color:${theme.accent} !important; }
  `;
}

/** Convert Supabase DB row to ThemeColors object */
export function dbRowToThemeColors(row: Record<string, string>): ThemeColors {
  return {
    accent: row.accent_primary || PRESETS.default.colors.accent,
    bull: row.accent_success || PRESETS.default.colors.bull,
    bear: row.accent_danger || PRESETS.default.colors.bear,
    warn: row.accent_warning || PRESETS.default.colors.warn,
    high: PRESETS.default.colors.high,
    bg: row.bg_page || PRESETS.default.colors.bg,
    panelBg: row.bg_panel || PRESETS.default.colors.panelBg,
    border: row.bg_border || PRESETS.default.colors.border,
    text: PRESETS.default.colors.text,
    textDim: PRESETS.default.colors.textDim,
    num: PRESETS.default.colors.num,
    asia: row.session_asia || PRESETS.default.colors.asia,
    london: row.session_london || PRESETS.default.colors.london,
    ny: row.session_ny || PRESETS.default.colors.ny,
  };
}

/** Convert ThemeColors to Supabase DB column format */
export function themeColorsToDbRow(colors: ThemeColors) {
  return {
    bg_page: colors.bg,
    bg_panel: colors.panelBg,
    bg_border: colors.border,
    accent_primary: colors.accent,
    accent_success: colors.bull,
    accent_danger: colors.bear,
    accent_warning: colors.warn,
    session_asia: colors.asia,
    session_london: colors.london,
    session_ny: colors.ny,
  };
}

export function detectActivePreset(theme: ThemeColors): PresetName | null {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (preset.colors.accent === theme.accent && preset.colors.bg === theme.bg) {
      return name as PresetName;
    }
  }
  return null;
}

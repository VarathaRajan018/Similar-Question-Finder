/**
 * theme.js — Central design-token file for Similar Question Finder.
 *
 * Accent choice: Forest Green (#1B4332)
 * Rationale: calming, trustworthy, academic — green has strong associations
 * with growth and learning, fitting perfectly for an EdTech product.
 *
 * Usage:
 *   import { THEME, TAG_COLORS, tagColor } from "../theme";
 *   style={{ color: THEME.primary }}
 */

export const THEME = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:          "#FFFFFF",   // page background — clean white
  surface:     "#FFFFFF",   // card / panel background
  surface2:    "#F8FAF8",   // subtle section background

  // ── Borders ───────────────────────────────────────────────────
  border:      "#D8E2DC",   // standard border — soft green-grey
  borderFocus: "#1B4332",   // focused input border — forest green

  // ── Text ──────────────────────────────────────────────────────
  text:        "#1F2937",   // primary text — dark charcoal
  textMuted:   "#6B7280",   // secondary / placeholder text
  textOnAccent:"#FFFFFF",   // text on filled accent backgrounds

  // ── Accent (Forest Green) ─────────────────────────────────────
  primary:      "#1B4332",  // forest green — buttons, active states
  primaryHover: "#2D6A4F",  // slightly lighter green for hover
  primaryLight: "#D8F3DC",  // very light green tint for badges / chips

  // ── Semantic ──────────────────────────────────────────────────
  danger:       "#DC2626",
  dangerBg:     "#FEF2F2",
  dangerBorder: "#FECACA",

  // ── Misc ──────────────────────────────────────────────────────
  radius:    "10px",
  radiusLg:  "14px",
  radiusPill:"999px",
  shadow:    "0 2px 8px rgba(27,67,50,0.08), 0 1px 3px rgba(27,67,50,0.06)",
  shadowMd:  "0 4px 16px rgba(27,67,50,0.10), 0 2px 6px rgba(27,67,50,0.06)",
  shadowSm:  "0 1px 3px rgba(27,67,50,0.06)",
  transition:"180ms ease",
};

/**
 * Tag colours — muted tints on white backgrounds.
 * Each entry has:
 *   bg   → light pill background
 *   text → darker shade used for the text (passes WCAG AA on bg)
 *   bar  → similarity-bar fill colour
 */
export const TAG_COLORS = {
  Biology: {
    bg:   "#DCFCE7",
    text: "#166534",
    bar:  "#22C55E",
  },
  Physics: {
    bg:   "#DBEAFE",
    text: "#1E40AF",
    bar:  "#3B82F6",
  },
  Chemistry: {
    bg:   "#FEF3C7",
    text: "#92400E",
    bar:  "#F59E0B",
  },
  Mathematics: {
    bg:   "#EDE9FE",
    text: "#5B21B6",
    bar:  "#8B5CF6",
  },
  "Computer Science": {
    bg:   "#CFFAFE",
    text: "#155E75",
    bar:  "#06B6D4",
  },
  History: {
    bg:   "#FFEDD5",
    text: "#9A3412",
    bar:  "#F97316",
  },
  English: {
    bg:   "#FCE7F3",
    text: "#9D174D",
    bar:  "#EC4899",
  },
  Geography: {
    bg:   "#CCFBF1",
    text: "#0F766E",
    bar:  "#14B8A6",
  },
  Economics: {
    bg:   "#FEF9C3",
    text: "#854D0E",
    bar:  "#EAB308",
  },
  "Environmental Science": {
    bg:   "#DCFCE7",
    text: "#166534",
    bar:  "#16A34A",
  },
  "General Knowledge": {
    bg:   "#E0E7FF",
    text: "#3730A3",
    bar:  "#6366F1",
  },
  Other: {
    bg:   "#F3F4F6",
    text: "#4B5563",
    bar:  "#9CA3AF",
  },
  // fallback
  _default: {
    bg:   "#E6F4EA",
    text: "#1B4332",
    bar:  "#2D6A4F",
  },
};

/** Convenience helper — never throws, always returns a colour set. */
export function tagColor(tag) {
  return TAG_COLORS[tag] ?? TAG_COLORS._default;
}

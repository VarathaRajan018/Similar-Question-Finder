/**
 * theme.js — Central design-token file for Similar Question Finder.
 *
 * Accent choice: Navy-indigo (#1E3A5F)
 * Rationale: deep, authoritative, calm — fits an academic/EdTech product
 * without feeling corporate-cold. Works on white backgrounds without any
 * gradient tricks.
 *
 * Usage:
 *   import { THEME, TAG_COLORS } from "../theme";
 *   style={{ color: THEME.primary }}
 */

export const THEME = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:          "#F7F8FA",   // page background
  surface:     "#FFFFFF",   // card / panel background
  surface2:    "#F0F2F5",   // subtle inner surface (textarea bg, etc.)

  // ── Borders ───────────────────────────────────────────────────
  border:      "#E5E7EB",   // standard border
  borderFocus: "#1E3A5F",   // focused input border

  // ── Text ──────────────────────────────────────────────────────
  text:        "#1A1A1A",   // primary text
  textMuted:   "#6B7280",   // secondary / placeholder text
  textOnAccent:"#FFFFFF",   // text on filled accent backgrounds

  // ── Accent (single colour — navy-indigo) ──────────────────────
  primary:      "#1E3A5F",  // buttons, active states, links
  primaryHover: "#162E4D",  // slightly darker for hover
  primaryLight: "#EEF2F8",  // very light tint for tag badges

  // ── Semantic ──────────────────────────────────────────────────
  danger:       "#DC2626",
  dangerBg:     "#FEF2F2",
  dangerBorder: "#FECACA",

  // ── Misc ──────────────────────────────────────────────────────
  radius:    "8px",
  radiusLg:  "12px",
  radiusPill:"999px",
  shadow:    "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
  shadowSm:  "0 1px 2px rgba(0,0,0,0.06)",
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
  // fallback
  _default: {
    bg:   "#F3F4F6",
    text: "#374151",
    bar:  "#9CA3AF",
  },
};

/** Convenience helper — never throws, always returns a colour set. */
export function tagColor(tag) {
  return TAG_COLORS[tag] ?? TAG_COLORS._default;
}

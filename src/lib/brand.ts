// Single source of truth for the kaihacks brand palette.
// Mirrors the CSS custom properties declared in src/styles/tokens.css,
// re-exposed as JS strings for places that can't reach the CSS cascade —
// inline SVG fills assembled from frontmatter, JSON config, anything
// built before the page renders.
//
// When updating: change BOTH this file AND src/styles/tokens.css.
// If they drift, rendered chrome (CSS) and rendered marks (SVG) will
// no longer match.
//
// Surfaces and subdomains (architecture.kaihacks.ai, cultures.kaihacks.ai,
// the apex kaihacks.ai/main/ pages, the CVI colophon) all read from here.

export const BRAND = {
  // Surfaces — the ground
  paper: "#f3ede2",
  paperWarm: "#fbf7ee",
  paperDeep: "#ede5d4",
  ice: "#e2e7e8",

  // Ink — text
  ink: "#16130f",
  inkSoft: "#5b5246",
  inkMute: "#8a8275",

  // Rules — hairlines
  rule: "#c9bea7",
  ruleSoft: "#e6dfd0",

  // Ghost: the silent-h tone behind the k in the lockup.
  // Same value as `rule` but named for its role in the mark.
  ghost: "#c9bea7",

  // Accents
  brick: "#8d3a2c",
  sea: "#3a4a52",
  fjord: "#4d6b76",
  amber: "#c98e36",
  tide: "#8a8d86",
  marsh: "#6e7a4c",
} as const;

export type BrandColor = keyof typeof BRAND;

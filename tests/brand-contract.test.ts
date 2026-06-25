import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadBuiltPages } from "./helpers/load-built-html";
import { BRAND } from "../src/lib/brand";

/**
 * Brand-contract gate — applies to ALL built pages.
 *
 * Scans every dist/**\/*.html for hex literals that paint colour (i.e.
 * literals inside `style="..."` attributes and inside `<style>` blocks)
 * and fails if any hex falls outside the canonical palette.
 *
 * Canonical palette =
 *   - every value in src/lib/brand.ts
 *   - every value in src/styles/tokens.css (derived shades:
 *     accent-hover, class-*-bg)
 *   - the explicit ALLOWED_DERIVATIONS list (one place to add named
 *     exceptions — keep tight; every entry is a real exception we
 *     consciously accept)
 *
 * 8-char hex (with alpha, e.g. `#16130f80`) is normalised to its 6-char
 * base before lookup — alpha variations of a canonical colour are fine.
 *
 * This is the "works as requirements for the rest of the websites"
 * tier: brand drift on ANY page on ANY surface fails CI. Adding a new
 * canonical shade means promoting it to BRAND or tokens.css first;
 * adding an ad-hoc shade means justifying it in ALLOWED_DERIVATIONS.
 */

const ROOT = process.cwd();

/** Hex literals we explicitly accept outside BRAND + tokens.css. */
const ALLOWED_DERIVATIONS = new Map<string, string>([
  // Pure white. Used as a fill in the few svg/img stages that need it.
  ["#ffffff", "white fill in stage decorations"],
  // Pure black and transparent black. Used in shadows, borders, or transparent fallback.
  ["#000000", "black or transparent black in Astro 7 compiler output"],
]);

const HEX_REGEX = /#[0-9a-fA-F]{3,8}\b/g;

function loadCanonicalPalette(): Set<string> {
  const palette = new Set<string>();
  for (const hex of Object.values(BRAND)) {
    palette.add(hex.toLowerCase());
  }
  const tokensCss = readFileSync(join(ROOT, "src/styles/tokens.css"), "utf-8");
  for (const m of tokensCss.matchAll(HEX_REGEX)) {
    palette.add(m[0].toLowerCase());
  }
  for (const hex of ALLOWED_DERIVATIONS.keys()) {
    palette.add(hex.toLowerCase());
  }
  return palette;
}

/**
 * Normalise a hex literal to its 6-char base.
 * #abc      -> #aabbcc
 * #aabbcc   -> #aabbcc
 * #aabbccdd -> #aabbcc   (drop alpha)
 * #abcd     -> #aabbcc   (drop alpha)
 */
function normalize(hex: string): string {
  const h = hex.toLowerCase();
  if (h.length === 4) {
    return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (h.length === 5) {
    // 3-char rgb + 1-char alpha -> drop alpha and expand
    return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (h.length === 7) {
    return h;
  }
  if (h.length === 9) {
    return h.slice(0, 7);
  }
  return h;
}

/**
 * Find every hex literal inside a paint context: style="..." attributes
 * and <style>...</style> blocks. Hex appearing as visible text content
 * (e.g. CVI swatch labels like "#8d3a2c" rendered in a .cvi-swatch-hex
 * div) is intentionally ignored — that's the CVI doing its job of
 * documenting the palette.
 */
function findPaintedHex(html: string): { hex: string; ctx: string }[] {
  const found: { hex: string; ctx: string }[] = [];

  for (const m of html.matchAll(/style\s*=\s*"([^"]*)"/g)) {
    const attr = m[1];
    for (const hexMatch of attr.matchAll(HEX_REGEX)) {
      found.push({ hex: hexMatch[0], ctx: `style="${attr}"` });
    }
  }

  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const block = m[1];
    for (const hexMatch of block.matchAll(HEX_REGEX)) {
      found.push({ hex: hexMatch[0], ctx: "<style>...</style>" });
    }
  }

  return found;
}

const pages = loadBuiltPages(ROOT);
const palette = loadCanonicalPalette();

describe("brand contract - rendered colour fidelity across all surfaces", () => {
  it("the canonical palette loads from BRAND + tokens.css", () => {
    // Sanity: every BRAND value present after load.
    for (const hex of Object.values(BRAND)) {
      expect(palette.has(hex.toLowerCase())).toBe(true);
    }
  });

  it("at least one page was loaded (build tripwire)", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const page of pages) {
    it(`${page.path}: every painted hex is in the canonical palette`, () => {
      const found = findPaintedHex(page.html);
      const offenders: string[] = [];

      for (const { hex, ctx } of found) {
        const base = normalize(hex);
        if (!palette.has(base)) {
          offenders.push(`${hex} (base ${base}) in ${ctx.slice(0, 120)}`);
        }
      }

      if (offenders.length > 0) {
        throw new Error(
          `${page.path}: ${offenders.length} hex(es) outside the canonical palette:\n` +
            offenders.map((o) => `  - ${o}`).join("\n") +
            `\n\nFix: promote the shade to BRAND or tokens.css, or add it to ` +
            `ALLOWED_DERIVATIONS in brand-contract.test.ts with a one-line ` +
            `justification.`,
        );
      }
      expect(offenders.length).toBe(0);
    });
  }
});

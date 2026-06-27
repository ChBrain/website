import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadBuiltPages } from "./helpers/load-built-html";
import { BRAND } from "../src/lib/brand";

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

function normalize(hex: string): string {
  const h = hex.toLowerCase();
  if (h.length === 4) {
    return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (h.length === 5) {
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
    for (const hex of Object.values(BRAND)) {
      expect(palette.has(hex.toLowerCase())).toBe(true);
    }
  });

  it("every painted hex is in the canonical palette", () => {
    expect(pages.length).toBeGreaterThan(0);
    const allFailures: string[] = [];

    for (const page of pages) {
      const found = findPaintedHex(page.html);
      const offenders: string[] = [];

      for (const { hex, ctx } of found) {
        const base = normalize(hex);
        if (!palette.has(base)) {
          offenders.push(`${hex} (base ${base}) in ${ctx.slice(0, 120)}`);
        }
      }

      if (offenders.length > 0) {
        allFailures.push(
          `${page.path}: ${offenders.length} hex(es) outside the canonical palette:\n` +
            offenders.map((o) => `  - ${o}`).join("\n"),
        );
      }
    }

    if (allFailures.length > 0) {
      throw new Error(
        allFailures.join("\n\n") +
          `\n\nFix: promote the shade to BRAND or tokens.css, or add it to ` +
          `ALLOWED_DERIVATIONS in brand-contract.test.ts with a one-line ` +
          `justification.`,
      );
    }
    expect(allFailures.length).toBe(0);
  });
});

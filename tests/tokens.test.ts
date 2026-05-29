import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tokensPath = join(process.cwd(), "src/styles/tokens.css");
const tokens = readFileSync(tokensPath, "utf-8");

describe("design tokens - palette contract", () => {
  // English-named palette values, locked from the design's palette.md.
  // Changing a hex here is an intentional design decision and requires
  // an explicit edit to this test.
  const expectedValues: Record<string, string> = {
    "--color-paper": "#f3ede2",
    "--color-paper-warm": "#fbf7ee",
    "--color-paper-deep": "#ede5d4",
    "--color-ice": "#e2e7e8",
    "--color-ink": "#16130f",
    "--color-ink-soft": "#5b5246",
    "--color-ink-mute": "#8a8275",
    "--color-rule": "#c9bea7",
    "--color-rule-soft": "#e6dfd0",
    "--color-brick": "#8d3a2c",
    "--color-sea": "#3a4a52",
    "--color-fjord": "#4d6b76",
    "--color-amber": "#c98e36",
    "--color-tide": "#8a8d86",
    "--color-marsh": "#6e7a4c",
  };

  for (const [token, value] of Object.entries(expectedValues)) {
    it(`${token} = ${value}`, () => {
      const re = new RegExp(`${token.replace(/-/g, "\\-")}\\s*:\\s*${value};`, "i");
      expect(tokens).toMatch(re);
    });
  }
});

describe("light-only contract", () => {
  it("declares color-scheme: light on :root", () => {
    expect(tokens).toMatch(/color-scheme\s*:\s*light/);
  });

  it("does NOT include a prefers-color-scheme: dark media query", () => {
    expect(tokens).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
  });
});

describe("English-only palette (no German aliases)", () => {
  // Design contract: palette names are English. North-Frisian roots
  // are private priming and never surface as token names.
  const germanAliases = ["backstein", "marsch", "nordsee", "bernstein", "wattgrau"];
  for (const alias of germanAliases) {
    it(`tokens.css does NOT contain --color-${alias}`, () => {
      expect(tokens).not.toContain(`--color-${alias}`);
    });
  }
});

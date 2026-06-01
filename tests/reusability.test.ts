import { describe, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Reusability drift detector — source-based, hard gate.
 *
 * Scans src/ for inline literals that ought to live in shared atoms
 * (src/lib/brand.ts, src/styles/tokens.css, src/components/*). Any
 * finding outside the allowlist fails CI. The allowlist is the only
 * escape hatch — extend it intentionally with a one-line justification
 * when something legitimate hits the scan.
 *
 * Three checks:
 *  - hex literals outside src/lib/brand.ts + tokens.css + CVI display content
 *  - font-family string literals outside the canonical homes
 *  - <svg> blocks outside src/components/
 *
 * Findings are still logged to stdout before failing so CI output
 * surfaces the exact drift candidates.
 */

const FAIL_ON_FINDINGS = true;

const ROOT = process.cwd();
const SCAN_ROOTS = ["src"];
const EXTS = new Set([".astro", ".ts", ".tsx", ".css", ".js"]);

// Each rule's allowlist is the set of source paths where the pattern
// is legitimate. Keep tight; every entry is a known intentional source.
const ALLOWLIST = {
  // brand.ts and tokens.css define the canonical hex values.
  // The CVI page is the brand colophon — it displays hex values as
  // documentation content (swatch labels, the footer line, the demo
  // <pre> token block). Exempt so the test doesn't flag the doc page
  // for doing its job.
  hex: new Set<string>([
    "src/lib/brand.ts",
    "src/styles/tokens.css",
    "src/pages/main/cvi/index.astro",
  ]),
  // tokens.css owns the font stacks. BaseLayout self-hosts the WOFF2
  // files via @fontsource(-variable) imports in its frontmatter (no
  // third-party Google Fonts request). KhaiMark embeds Newsreader in
  // an inline SVG style attribute (CSS vars can't reach the SVG text
  // element). The CVI page IS the brand colophon — it documents the
  // type stack and renders inline font-family declarations as part of
  // its content (same exemption pattern as the hex allowlist above:
  // the doc surface is allowed to display what it documents).
  fontFamily: new Set<string>([
    "src/styles/tokens.css",
    "src/layouts/BaseLayout.astro",
    "src/components/KhaiMark.astro",
    "src/pages/main/cvi/index.astro",
  ]),
  // Components own reusable SVG. The CVI's icon-tile <img src="/favicon.svg">
  // is a raster reference, not an inline svg block, so it doesn't trigger.
  inlineSvg: new Set<string>([]),
};

const HEX_REGEX = /#[0-9a-fA-F]{3,8}\b/g;
const FONT_FAMILIES = ["Newsreader", "Source Serif 4", "IBM Plex Mono"];
const INLINE_SVG_REGEX = /<svg[\s>]/;

interface Finding {
  file: string;
  line: number;
  kind: "hex" | "font-family" | "inline-svg";
  match: string;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf(".");
      if (dot < 0) continue;
      const ext = entry.name.slice(dot);
      if (EXTS.has(ext)) yield full;
    }
  }
}

function scanFile(absPath: string, relPath: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(absPath, "utf8");
  const lines = content.split("\n");

  const checkHex = !ALLOWLIST.hex.has(relPath);
  const checkFont = !ALLOWLIST.fontFamily.has(relPath);
  const checkSvg = !ALLOWLIST.inlineSvg.has(relPath) && !relPath.startsWith("src/components/");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (checkHex) {
      for (const m of line.matchAll(HEX_REGEX)) {
        findings.push({ file: relPath, line: i + 1, kind: "hex", match: m[0] });
      }
    }
    if (checkFont) {
      for (const fam of FONT_FAMILIES) {
        if (line.includes(`"${fam}"`) || line.includes(`'${fam}'`)) {
          findings.push({ file: relPath, line: i + 1, kind: "font-family", match: fam });
        }
      }
    }
    if (checkSvg && INLINE_SVG_REGEX.test(line)) {
      findings.push({ file: relPath, line: i + 1, kind: "inline-svg", match: "<svg>" });
    }
  }
  return findings;
}

function format(findings: Finding[]): string {
  if (findings.length === 0) return "✓ no reuse-drift candidates";
  const by: Record<string, Finding[]> = {};
  for (const f of findings) {
    by[f.kind] ??= [];
    by[f.kind].push(f);
  }
  const out: string[] = [`⚠ reuse-drift candidates (${findings.length}):`];
  for (const kind of Object.keys(by).sort()) {
    out.push(`  [${kind}] ${by[kind].length}`);
    for (const f of by[kind]) {
      out.push(`    ${f.file}:${f.line}  ${f.match}`);
    }
  }
  return out.join("\n");
}

describe("reusability — inline-literal drift detector", () => {
  it("scans src/ for hex / font-family / inline-svg drift", () => {
    const findings: Finding[] = [];
    for (const dir of SCAN_ROOTS) {
      const root = join(ROOT, dir);
      for (const absPath of walk(root)) {
        const relPath = relative(ROOT, absPath);
        findings.push(...scanFile(absPath, relPath));
      }
    }
    // eslint-disable-next-line no-console
    console.log(format(findings));
    if (FAIL_ON_FINDINGS && findings.length > 0) {
      throw new Error(`${findings.length} reuse-drift finding(s); see log above`);
    }
  });
});

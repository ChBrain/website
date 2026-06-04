#!/usr/bin/env node
// Prebuild: pack each installed engine and each khai skill into a zip artifact,
// then write the zip + a sidecar JSON to public/downloads/{engines,skills}/.
// The sidecar carries everything the pages need to render the download
// back-cover spread (filename, size, sha256, and for skills the bodyHtml).
//
// Runs via `npm run prebuild` (before astro build). When @chbrain packages are
// not installed (CI sandbox, no registry token) the script exits 0 cleanly so
// astro build can continue without generating download artifacts.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const _require = createRequire(import.meta.url);
const md = new MarkdownIt({ html: false, breaks: false, linkify: false });

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Try loading @chbrain packages. If they are not installed (CI sandbox with no
// registry token) exit 0 so astro build can continue without downloads.
let packBundle, buildAll;
try {
  ({ packBundle } = await import("@chbrain/khai-pack"));
  ({ buildAll } = await import("@chbrain/khai-skills/build"));
} catch (e) {
  console.log(`build-downloads: skipping — ${e.message}`);
  console.log("  Run npm run deps:sync on a machine with the GitHub Packages token.");
  process.exit(0);
}

// ── engines ────────────────────────────────────────────────────────────────

function buildEngineDownloads() {
  const scope = join(process.cwd(), "node_modules", "@chbrain");
  if (!existsSync(scope)) return;

  const outDir = join(process.cwd(), "public", "downloads", "engines");
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const name of readdirSync(scope).sort()) {
    if (!name.startsWith("khai-engine-")) continue;
    const id = name.slice("khai-engine-".length);
    const dir = join(scope, name);

    // Overhead: package.json (the khai manifest) + all markdown files.
    const overhead = [
      { path: "package.json", data: readFileSync(join(dir, "package.json")) },
      ...readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => ({ path: f, data: readFileSync(join(dir, f)) })),
    ];
    if (overhead.length === 0) continue;

    const packed = packBundle({ name: id, overhead, stamp: { kind: "engine", engine: id } });
    writeFileSync(join(outDir, `${id}.zip`), packed.zip);
    writeFileSync(
      join(outDir, `${id}.json`),
      JSON.stringify({
        filename: `${id}.zip`,
        size: fmtBytes(packed.zip.length),
        sha256: packed.zipSha256,
      }) + "\n",
    );
    console.log(
      `  engine ${id}: ${fmtBytes(packed.zip.length)} sha256=${packed.zipSha256.slice(0, 12)}…`,
    );
    count++;
  }
  if (count === 0) console.log("  engines: none installed");
}

// ── skills ─────────────────────────────────────────────────────────────────

function buildSkillDownloads() {
  let skillsPkg;
  try {
    skillsPkg = dirname(_require.resolve("@chbrain/khai-skills/package.json"));
  } catch {
    console.log("  skills: @chbrain/khai-skills not found");
    return;
  }

  const outDir = join(process.cwd(), "public", "downloads", "skills");
  mkdirSync(outDir, { recursive: true });

  // buildAll with write:true composes each skill and writes zips to
  // khai-skills/dist/ inside the installed package. We then copy them to
  // public/downloads/skills/ alongside a sidecar JSON the skillbook page reads.
  const { results } = buildAll({ root: skillsPkg, write: true });
  const distRoot = join(skillsPkg, "dist");

  for (const r of results) {
    if (r.errors.length > 0) {
      console.error(`  skill ${r.name}: errors — ${r.errors.join("; ")}`);
      continue;
    }

    const zip = readFileSync(join(distRoot, `${r.name}.zip`));
    writeFileSync(join(outDir, `${r.name}.zip`), zip);

    // The sidecar carries the title, rendered body (for the content spread),
    // and download metadata (for the download spread).
    const skillMdPath = join(skillsPkg, "src", r.name, "SKILL.md");
    const { data, content } = matter(readFileSync(skillMdPath, "utf8"));
    const h1 = content.match(/^# (.+)$/m);
    const title = h1 ? h1[1] : data.name;
    // Strip the H1: the spread chassis already renders the title; a second
    // heading in bodyHtml would duplicate it.
    const bodyWithoutH1 = content.replace(/^# .+\n+/, "");
    // Strip relative .md links — they reference bundle files that aren't pages.
    // Replace with the link text so prose reads naturally without broken hrefs.
    const bodyMd = bodyWithoutH1.replace(/\[([^\]]+)\]\((?!https?:\/\/|#)[^)]*\.md\)/g, "$1");
    const bodyHtml = md.render(bodyMd);

    writeFileSync(
      join(outDir, `${r.name}.json`),
      JSON.stringify({
        name: data.name,
        slug: data.name,
        title,
        bodyHtml,
        filename: `${r.name}.zip`,
        size: fmtBytes(zip.length),
        sha256: r.zipSha,
      }) + "\n",
    );
    console.log(
      `  skill ${r.name}: ${fmtBytes(zip.length)} sha256=${(r.zipSha ?? "?").slice(0, 12)}…`,
    );
  }
}

// ── run ────────────────────────────────────────────────────────────────────

console.log("build-downloads: building engine and skill artifacts…");
buildEngineDownloads();
buildSkillDownloads();
console.log("build-downloads: done");

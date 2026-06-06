// Astro emits `public/` files at `dist/` root, but each surface
// (`dist/main/`, `dist/architecture/`, `dist/cultures/`) deploys to its own
// doc root via rsync — the root files never come along. This script copies
// the shared static assets into each surface's dist subdir so they resolve at
// `<surface>/favicon.svg`, `<surface>/.well-known/security.txt`, etc.

import { cp, stat } from "node:fs/promises";
import { join } from "node:path";

const DIST = "dist";
const SURFACES = ["main", "architecture", "cultures", "plays"];
// Only copy real shared assets — not the per-surface HTML/JS that Astro
// already routed correctly.
const SHARED = [
  "favicon.ico",
  "favicon.svg",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "site.webmanifest",
];
// Shared directories copied recursively (e.g. RFC 9116 security.txt). On the
// apex these resolve via the .htaccess rewrite (kaihacks.ai/.well-known/... ->
// /main/.well-known/...); on the subdomains they're served from their own root.
// downloads/ holds engine and skill zips built by the prebuild script; the
// exists() guard below makes this a no-op when khai-pack is not installed.
const SHARED_DIRS = [".well-known", "downloads"];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(DIST))) {
    console.error(`[copy-public-to-surfaces] ${DIST}/ not found — did astro build run?`);
    process.exitCode = 1;
    return;
  }

  for (const surface of SURFACES) {
    const surfaceDir = join(DIST, surface);
    if (!(await exists(surfaceDir))) {
      console.log(`[copy-public-to-surfaces] skipping ${surface} (no dist/${surface}/)`);
      continue;
    }
    let copied = 0;
    for (const name of SHARED) {
      const src = join(DIST, name);
      if (!(await exists(src))) continue;
      const dest = join(surfaceDir, name);
      await cp(src, dest);
      copied++;
    }
    for (const dir of SHARED_DIRS) {
      const src = join(DIST, dir);
      if (!(await exists(src))) continue;

      if (dir === "downloads") {
        if (surface === "architecture" || surface === "plays") {
          const destDir = join(surfaceDir, "downloads");
          const htaccessSrc = join(src, ".htaccess");
          if (await exists(htaccessSrc)) {
            await cp(htaccessSrc, join(destDir, ".htaccess"));
          }

          if (surface === "architecture") {
            const enginesSrc = join(src, "engines");
            if (await exists(enginesSrc)) {
              await cp(enginesSrc, join(destDir, "engines"), { recursive: true });
            }
            const skillsSrc = join(src, "skills");
            if (await exists(skillsSrc)) {
              await cp(skillsSrc, join(destDir, "skills"), { recursive: true });
            }
            copied++;
          } else if (surface === "plays") {
            const playsSrc = join(src, "plays");
            if (await exists(playsSrc)) {
              await cp(playsSrc, join(destDir, "plays"), { recursive: true });
            }
            copied++;
          }
        }
      } else {
        await cp(src, join(surfaceDir, dir), { recursive: true });
        copied++;
      }
    }
    const total = SHARED.length + SHARED_DIRS.length;
    console.log(`[copy-public-to-surfaces] ${surface}: copied ${copied}/${total}`);
  }
}

await main();

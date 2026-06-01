// Astro emits `public/` files at `dist/` root, but each surface
// (`dist/main/`, `dist/architecture/`) deploys to its own doc root
// via rsync — the root files never come along. This script copies
// the shared static assets into each surface's dist subdir so they
// resolve at `<surface>/favicon.svg` etc. on the served site.

import { cp, stat } from "node:fs/promises";
import { join } from "node:path";

const DIST = "dist";
const SURFACES = ["main", "architecture", "privacy"];
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
    console.log(`[copy-public-to-surfaces] ${surface}: copied ${copied}/${SHARED.length}`);
  }
}

await main();

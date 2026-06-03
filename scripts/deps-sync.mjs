#!/usr/bin/env node
// deps:sync -- bring every @chbrain/* dependency to its latest published
// version, updating BOTH package.json and the lockfile in one step.
//
// Run this AT HOME (a machine with the GitHub Packages token configured); the
// CI sandbox cannot reach the @chbrain registry. The whole handoff is then one
// command -- no hand-written recipe:
//
//   npm run deps:sync
//
// It does NOT commit. Review `git diff package.json package-lock.json`, then
// commit + push on a chore/* branch (deps are unowned, so the branch-scope
// gate allows it).

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// Discover the scoped deps from the manifest, so a new @chbrain/* package is
// picked up automatically -- the script never goes stale.
const scoped = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
].filter((name) => name.startsWith("@chbrain/"));

if (scoped.length === 0) {
  console.log("deps:sync -- no @chbrain/* dependencies; nothing to do.");
  process.exit(0);
}

console.log("deps:sync -- syncing to latest published:");
for (const name of scoped) console.log("  " + name);

const targets = scoped.map((name) => `${name}@latest`).join(" ");
try {
  execSync(`npm install ${targets}`, { stdio: "inherit" });
} catch {
  console.error(
    "\ndeps:sync -- npm install failed. Run this on a machine with the GitHub\n" +
      "Packages token configured; the CI sandbox cannot reach @chbrain.",
  );
  process.exit(1);
}

console.log(
  "\ndeps:sync -- done. Review `git diff package.json package-lock.json`,\n" +
    "then commit + push on a chore/* branch.",
);

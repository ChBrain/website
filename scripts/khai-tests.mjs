#!/usr/bin/env node
// khai-tests -- run the website conformance suite in bounded groups.
//
// The a11y suite runs axe over every built page in a jsdom per page. As houses
// add plays the page count climbs, and a single combined run accumulates heap
// until a worker fork is OOM-killed ("Worker exited unexpectedly"). So we run it
// one group at a time, each in its OWN vitest process, so the per-page heap is
// reclaimed between groups. Groups are split by domain (architecture, the site
// shell, plays) and, within plays, by house -- discovered from the built pages,
// so a new house is picked up with no edit here ("khai-tests plays <house>").
//
// Layout: unit tests are the top-level tests/*.test.ts; the a11y suite is the
// single parameterized tests/a11y/group.test.ts, filtered by the A11Y_GROUP env.
// Run AFTER `npm run build` (the a11y suite reads dist/).

import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { assignGroups, groupLabel } from "../tests/helpers/a11y-groups.mjs";

const A11Y_FILE = "tests/a11y/group.test.ts";
// Headroom for a single group's jsdom run, plus an exposed GC the suite calls
// after each page so memory stays flat within the group.
const A11Y_NODE_OPTIONS = "--max-old-space-size=4096 --expose-gc";

function vitest(files, env = {}) {
  execFileSync("npx", ["vitest", "run", ...files], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function walkHtml(dir, base, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walkHtml(abs, base, out);
    else if (entry.endsWith(".html")) out.push(relative(base, abs).replace(/\\/g, "/"));
  }
  return out;
}

if (!existsSync("dist")) {
  console.error("khai-tests: dist/ not found -- run `npm run build` first (npm test does both).");
  process.exit(1);
}

// Unit tests: every top-level tests/*.test.ts. The a11y suite lives in
// tests/a11y/, so it is not in this list and is run per-group below.
const unit = readdirSync("tests")
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => `tests/${f}`);

const { groups } = assignGroups(walkHtml("dist", "dist"));

const failed = [];

console.log("\n=== khai-tests: unit ===");
try {
  if (unit.length) vitest(unit);
} catch {
  failed.push("unit");
}

for (const group of groups) {
  console.log(`\n=== ${groupLabel(group)} ===`);
  try {
    vitest([A11Y_FILE], { A11Y_GROUP: group, NODE_OPTIONS: A11Y_NODE_OPTIONS });
  } catch {
    failed.push(groupLabel(group));
  }
}

if (failed.length) {
  console.error(`\nkhai-tests: FAILED -- ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`\nkhai-tests: passed (unit + ${groups.length} group(s): ${groups.join(", ")})`);

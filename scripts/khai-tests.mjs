#!/usr/bin/env node
// khai-tests -- run the website conformance suite in bounded groups.
//
// The a11y suite runs axe over every built page in a jsdom per page. As houses
// add plays the page count climbs, and a single combined run accumulates heap
// until a worker fork is OOM-killed ("Worker exited unexpectedly"). So each group
// runs in its OWN vitest process and the per-page heap is reclaimed between them.
// Groups are split by domain (architecture, the site shell, plays) and, within
// plays, by house, with a large house batched (see tests/helpers/a11y-groups.mjs).
// The unit tests (top-level tests/*.test.ts) are one more group, "unit".
//
// Three modes (the a11y suite reads dist/, so build first):
//   (default)        run every group sequentially -- used by `npm test` locally.
//   --list           print the group list as JSON -- feeds the CI matrix.
//   --group <name>   run one group -- one CI matrix job per group.

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

function requireDist() {
  if (!existsSync("dist")) {
    console.error("khai-tests: dist/ not found -- run `npm run build` first (npm test does both).");
    process.exit(1);
  }
}

// The unit group: every top-level tests/*.test.ts. The a11y suite lives in
// tests/a11y/, so it is excluded here and run per a11y group.
const unitFiles = () =>
  readdirSync("tests")
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => `tests/${f}`);

// Every group, "unit" first, then the a11y groups discovered from the build.
function allGroups() {
  return ["unit", ...assignGroups(walkHtml("dist", "dist")).groups];
}

// Run a single group; throws (non-zero vitest exit) on failure.
function runGroup(group) {
  if (group === "unit") {
    vitest(unitFiles());
  } else {
    vitest([A11Y_FILE], { A11Y_GROUP: group, NODE_OPTIONS: A11Y_NODE_OPTIONS });
  }
}

const label = (group) => (group === "unit" ? "khai-tests unit" : groupLabel(group));

const mode = process.argv[2];

if (mode === "--list") {
  requireDist();
  // One line of JSON for the CI matrix (GITHUB_OUTPUT).
  process.stdout.write(JSON.stringify(allGroups()) + "\n");
  process.exit(0);
}

if (mode === "--group") {
  const group = process.argv[3];
  if (!group) {
    console.error("khai-tests: --group requires a group name");
    process.exit(2);
  }
  requireDist();
  console.log(`=== ${label(group)} ===`);
  try {
    runGroup(group);
  } catch {
    process.exit(1);
  }
  process.exit(0);
}

// Default: run every group sequentially (local `npm test`), aggregating failures
// so one bad group does not hide the rest.
requireDist();
const groups = allGroups();
const failed = [];
for (const group of groups) {
  console.log(`\n=== ${label(group)} ===`);
  try {
    runGroup(group);
  } catch {
    failed.push(label(group));
  }
}
if (failed.length) {
  console.error(`\nkhai-tests: FAILED -- ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`\nkhai-tests: passed (${groups.length} group(s): ${groups.join(", ")})`);

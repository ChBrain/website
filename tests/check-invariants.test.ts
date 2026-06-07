import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Offline test of the origin tripwire (ops/check-invariants.sh) by running it
// against a scaffolded temp PUBLIC_HTML. Issue 149 (Phase 4b).

let cachedIsWsl: boolean | null = null;
function getIsWsl(): boolean {
  if (cachedIsWsl !== null) return cachedIsWsl;
  try {
    const wslCheck = execFileSync("bash", ["-c", "[ -d /mnt/c ] && echo wsl"], {
      encoding: "utf8",
    });
    cachedIsWsl = wslCheck.trim() === "wsl";
  } catch {
    cachedIsWsl = false;
  }
  return cachedIsWsl;
}

function run(publicHtml: string): { code: number; out: string } {
  try {
    const isWsl = getIsWsl();
    const drivePrefix = isWsl ? "/mnt/c" : "/c";
    const posixPath = publicHtml.replace(/\\/g, "/").replace(/^[A-Za-z]:/, drivePrefix);
    const out = execFileSync(
      "bash",
      ["-c", `PUBLIC_HTML='${posixPath}' bash ops/check-invariants.sh`],
      {
        encoding: "utf8",
      },
    );
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: (err.stdout ?? "") + (err.stderr ?? "") };
  }
}

function scaffold(): string {
  const root = mkdtempSync(join(tmpdir(), "publichtml-"));
  for (const d of ["main", "architecture.kaihacks.ai", "cultures.kaihacks.ai"]) {
    mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, d, "index.html"), "<!doctype html><h1>ok</h1>");
  }
  return root;
}

describe("check-invariants.sh", () => {
  it("passes silently (exit 0) when every surface index exists", () => {
    const root = scaffold();
    const r = run(root);
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe("");
    rmSync(root, { recursive: true, force: true });
  });

  it("fails when a surface index is missing or empty", () => {
    const root = scaffold();
    writeFileSync(join(root, "cultures.kaihacks.ai", "index.html"), ""); // empty
    const r = run(root);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/cultures/);
    rmSync(root, { recursive: true, force: true });
  });

  it("flags an UNSCOPED apex .htaccess /main rewrite (the leak footgun)", () => {
    const root = scaffold();
    writeFileSync(join(root, ".htaccess"), "RewriteEngine On\nRewriteRule ^(.*)$ /main/$1 [L]\n");
    const r = run(root);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/HTTP_HOST/);
    rmSync(root, { recursive: true, force: true });
  });

  it("accepts a host-scoped apex .htaccess", () => {
    const root = scaffold();
    writeFileSync(
      join(root, ".htaccess"),
      "RewriteEngine On\nRewriteCond %{HTTP_HOST} ^(www\\.)?kaihacks\\.ai$ [NC]\nRewriteRule ^(.*)$ /main/$1 [L]\n",
    );
    const r = run(root);
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe("");
    rmSync(root, { recursive: true, force: true });
  });
}, 60000);

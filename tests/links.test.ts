import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

const repoRoot = process.cwd();
const distDir = join(repoRoot, "dist");
const pages = loadBuiltPages(repoRoot);

function isExternal(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

function isFragment(href: string): boolean {
  return href.startsWith("#");
}

function isMailto(href: string): boolean {
  return href.startsWith("mailto:");
}

function resolveInternal(pagePath: string, href: string): string {
  const [pathPart] = href.split("#");
  if (!pathPart) return pagePath;
  if (pathPart.startsWith("/")) {
    return resolve(distDir, "." + pathPart);
  }
  return resolve(dirname(join(distDir, pagePath)), pathPart);
}

function targetExists(absolutePath: string): boolean {
  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) return true;
  const asIndex = join(absolutePath, "index.html");
  if (existsSync(asIndex) && statSync(asIndex).isFile()) return true;
  return false;
}

describe("link integrity — internal links resolve", () => {
  for (const page of pages) {
    it(`${page.path} has all internal links resolving`, () => {
      const dom = new JSDOM(page.html);
      const anchors = Array.from(
        dom.window.document.querySelectorAll("a[href]"),
      ) as HTMLAnchorElement[];
      const failures: string[] = [];

      for (const a of anchors) {
        const href = a.getAttribute("href")!;
        if (isExternal(href) || isFragment(href) || isMailto(href)) continue;
        const target = resolveInternal(page.path, href);
        if (!targetExists(target)) {
          failures.push(`${href} → ${target}`);
        }
      }

      dom.window.close();
      if (failures.length > 0) {
        throw new Error(`unresolved internal links in ${page.path}:\n${failures.join("\n")}`);
      }
      expect(failures.length).toBe(0);
    });
  }
});

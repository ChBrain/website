import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

function stripHtmlComments(input: string): string {
  let current = input;
  let previous: string;
  do {
    previous = current;
    current = current.replace(/<!--[\s\S]*?-->/g, "");
  } while (current !== previous);
  return current;
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

describe("link integrity", () => {
  it("resolves all internal links across all pages", () => {
    const allFailures: string[] = [];

    for (const page of pages) {
      // Strip HTML comments to avoid checking commented-out links
      const cleanHtml = stripHtmlComments(page.html);
      const aTagRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
      let match;
      const pageFailures: string[] = [];

      while ((match = aTagRegex.exec(cleanHtml)) !== null) {
        const href = match[1];
        if (isExternal(href) || isFragment(href) || isMailto(href)) continue;
        const target = resolveInternal(page.path, href);
        if (!targetExists(target)) {
          pageFailures.push(`  ${href} → ${target}`);
        }
      }

      if (pageFailures.length > 0) {
        allFailures.push(`unresolved internal links in ${page.path}:\n${pageFailures.join("\n")}`);
      }
    }

    if (allFailures.length > 0) {
      throw new Error(allFailures.join("\n\n"));
    }
    expect(allFailures.length).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

const pages = loadBuiltPages(process.cwd());

describe("content sanity — placeholder index", () => {
  it("at least one page was built", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  const index = pages.find((p) => p.path === "index.html");

  it("index.html exists", () => {
    expect(index).toBeDefined();
  });

  it("index.html has a <title> containing 'kaihacks'", () => {
    expect(index!.html).toMatch(/<title[^>]*>[^<]*kaihacks[^<]*<\/title>/i);
  });

  it("index.html has an h1", () => {
    expect(index!.html).toMatch(/<h1[^>]*>/i);
  });

  it("index.html declares utf-8", () => {
    expect(index!.html).toMatch(/<meta charset="utf-8"/i);
  });

  it("index.html declares viewport", () => {
    expect(index!.html).toMatch(/<meta name="viewport"/i);
  });
});

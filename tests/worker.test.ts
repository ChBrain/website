import { describe, it, expect } from "vitest";
import { runAndReport } from "../workers/smoke/check";
import { targetsFor } from "../smoke/targets";

// Offline unit test for the edge monitor's check-and-alert logic (mock fetch,
// no network, no Worker runtime). The Worker glue (index.ts) is just wiring.
// Issue 149.

const stamp = (s: string) =>
  `<!doctype html><html><head><meta name="x-surface" content="${s}" /></head><body></body></html>`;

// Mock fetch: serves a correctly-stamped page for every target of `env`
// (apply `overrides` to break specific URLs), and records webhook POSTs.
function mockFor(env: string, overrides: Record<string, string> = {}) {
  const table: Record<string, string> = {};
  for (const t of targetsFor(env)) table[t.url] = stamp(t.surface);
  Object.assign(table, overrides);
  const posts: Array<{ url: string; body: string }> = [];

  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") {
      posts.push({ url, body: String(init.body) });
      return {
        status: 200,
        url,
        async text() {
          return "ok";
        },
      } as unknown as Response;
    }
    return {
      status: url in table ? 200 : 404,
      url,
      async text() {
        return table[url] ?? "<h1>not found</h1>";
      },
    } as unknown as Response;
  }) as unknown as typeof fetch;

  return { fetchImpl, posts };
}

describe("worker runAndReport", () => {
  it("passes and posts nothing when every surface is stamped", async () => {
    const { fetchImpl, posts } = mockFor("production");
    const r = await runAndReport({ env: "production", webhookUrl: "https://hook/", fetchImpl });
    expect(r.ok).toBe(true);
    expect(posts).toEqual([]);
  });

  it("posts one webhook alert when a surface leaks", async () => {
    const cultures = targetsFor("production").find((t) => t.surface === "cultures")!;
    // cultures.kaihacks.ai serves the main surface -> a routing leak.
    const { fetchImpl, posts } = mockFor("production", { [cultures.url]: stamp("main") });
    const r = await runAndReport({ env: "production", webhookUrl: "https://hook/", fetchImpl });
    expect(r.ok).toBe(false);
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("https://hook/");
    expect(posts[0].body).toMatch(/FAILED/);
  });

  it("does not post when no webhook is configured", async () => {
    const cultures = targetsFor("production").find((t) => t.surface === "cultures")!;
    const { fetchImpl, posts } = mockFor("production", { [cultures.url]: stamp("main") });
    const r = await runAndReport({ env: "production", fetchImpl });
    expect(r.ok).toBe(false);
    expect(posts).toEqual([]);
  });
});

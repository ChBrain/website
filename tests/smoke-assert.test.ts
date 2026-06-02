import { describe, it, expect } from "vitest";
import { runChecks, type Target } from "../smoke/assert";
import { targetsFor } from "../smoke/targets";

// Offline unit test for the smoke ASSERTION LOGIC (hermetic - mock fetch, no
// network). The live run lives in smoke/checks.smoke.ts. #149.

function fakeFetch(
  table: Record<string, { status?: number; finalUrl?: string; body?: string }>,
): typeof fetch {
  return (async (input: string | URL) => {
    const url = String(input);
    const e = table[url] ?? { status: 404, body: "" };
    return {
      status: e.status ?? 200,
      url: e.finalUrl ?? url,
      async text() {
        return e.body ?? "";
      },
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

const stamp = (s: string) =>
  `<!doctype html><html><head><meta name="x-surface" content="${s}" /></head><body><h1>hi</h1></body></html>`;

const T = (name: string, url: string, surface: string): Target => ({ name, url, surface });

describe("runChecks", () => {
  it("passes when each target serves its own stamped 200", async () => {
    const res = await runChecks(
      [T("architecture", "https://a/", "architecture"), T("main", "https://m/", "main")],
      {
        fetchImpl: fakeFetch({
          "https://a/": { body: stamp("architecture") },
          "https://m/": { body: stamp("main") },
        }),
      },
    );
    expect(res.every((r) => r.ok)).toBe(true);
  });

  it("fails on the wrong surface (the subdomain-leak bug)", async () => {
    const res = await runChecks([T("architecture", "https://a/", "architecture")], {
      fetchImpl: fakeFetch({ "https://a/": { body: stamp("main") } }),
    });
    expect(res[0].ok).toBe(false);
    expect(res[0].errors.join(" ")).toMatch(/x-surface/);
  });

  it("fails on a 404 (missing deploy)", async () => {
    const res = await runChecks([T("cultures", "https://c/", "cultures")], {
      fetchImpl: fakeFetch({ "https://c/": { status: 404, body: "" } }),
    });
    expect(res[0].ok).toBe(false);
    expect(res[0].errors.join(" ")).toMatch(/status 404/);
  });

  it("fails on a parked placeholder (unstamped)", async () => {
    const res = await runChecks([T("main", "https://m/", "main")], {
      fetchImpl: fakeFetch({
        "https://m/": { body: "<h1>This site is parked free, courtesy of GoDaddy</h1>" },
      }),
    });
    expect(res[0].ok).toBe(false);
    expect(res[0].errors.join(" ")).toMatch(/placeholder/);
    expect(res[0].errors.join(" ")).toMatch(/x-surface/);
  });

  it("does NOT flag a correctly-stamped page that names a host (privacy policy)", async () => {
    // Regression: the real /privacy/ page lists GoDaddy + Cloudflare as data
    // processors. A stamped page is ours - the placeholder heuristic must not
    // fire on it. (This was a live false positive caught on staging.)
    const body =
      stamp("main") + "<p>We use GoDaddy as our host and Cloudflare as our reverse proxy.</p>";
    const res = await runChecks([T("privacy", "https://kaihacks.ai/privacy/", "main")], {
      fetchImpl: fakeFetch({ "https://kaihacks.ai/privacy/": { body } }),
    });
    expect(res[0].ok).toBe(true);
    expect(res[0].errors).toEqual([]);
  });

  it("forwards extra headers (the X-Monitor bot-bypass token)", async () => {
    let seen: Record<string, string> | undefined;
    const capturing = (async (_input: string | URL, init?: RequestInit) => {
      seen = init?.headers as Record<string, string>;
      return {
        status: 200,
        url: "https://m/",
        async text() {
          return stamp("main");
        },
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const res = await runChecks([T("main", "https://m/", "main")], {
      fetchImpl: capturing,
      headers: { "x-monitor": "s3cret" },
    });
    expect(res[0].ok).toBe(true);
    expect(seen?.["x-monitor"]).toBe("s3cret");
  });

  it("flags a cross-host redirect", async () => {
    const res = await runChecks([T("main", "https://m/", "main")], {
      fetchImpl: fakeFetch({
        "https://m/": { finalUrl: "https://elsewhere/main/", body: stamp("main") },
      }),
    });
    expect(res[0].ok).toBe(false);
    expect(res[0].errors.join(" ")).toMatch(/redirected/);
  });
});

describe("targetsFor", () => {
  it("folds cvi/privacy/contact into the main surface", () => {
    const byName = Object.fromEntries(targetsFor("production").map((t) => [t.name, t.surface]));
    expect(byName.cvi).toBe("main");
    expect(byName.privacy).toBe("main");
    expect(byName.contact).toBe("main");
    expect(byName.architecture).toBe("architecture");
    expect(byName.cultures).toBe("cultures");
  });

  it("points at the apex in production and at staging.kaihacks.ai in staging", () => {
    const prod = Object.fromEntries(targetsFor("production").map((t) => [t.name, t.url]));
    const stg = Object.fromEntries(targetsFor("staging").map((t) => [t.name, t.url]));
    expect(prod.main).toBe("https://kaihacks.ai/");
    expect(stg.main).toBe("https://staging.kaihacks.ai/main/");
  });
});

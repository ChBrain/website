// Portable smoke assertions for the live origin.
//
// Runs in BOTH Node (vitest, via `npm run smoke`) and a Cloudflare Worker
// (workerd, the scheduled monitor) - so it leans on nothing but `fetch`,
// strings, and regex: no jsdom, no node:* imports. Issue #149.
//
// The core assertion is host -> surface: each canonical URL must answer 200
// with the <meta name="x-surface"> its surface stamps (BaseLayout.astro).
// That is what catches a routing leak - e.g. a subdomain that silently serves
// `main`, or an apex that falls back to the parked placeholder - which a bare
// status check would wave through as a 200.

export interface Target {
  /** label for reporting, e.g. "cvi" */
  name: string;
  /** canonical URL to fetch */
  url: string;
  /** the surface that URL must be served by (cvi/privacy/contact -> "main") */
  surface: string;
}

export interface CheckResult extends Target {
  ok: boolean;
  errors: string[];
}

export interface RunOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

const SURFACE_META = /<meta\s+name=["']x-surface["']\s+content=["']([^"']*)["']/i;

// The cPanel/GoDaddy default parked page - must never be served by any surface.
const PLACEHOLDER =
  /(this (web ?)?site is parked|godaddy|coming soon|under construction|default web ?page|future home)/i;

export async function runChecks(targets: Target[], opts: RunOptions = {}): Promise<CheckResult[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  // Browser-ish UA: the shared host 403s unknown bots.
  const ua = opts.userAgent ?? "kaihacks-smoke/1 (+https://kaihacks.ai)";
  const results: CheckResult[] = [];

  for (const t of targets) {
    const errors: string[] = [];
    try {
      const res = await doFetch(t.url, {
        headers: { "user-agent": ua, "cache-control": "no-cache" },
        redirect: "follow",
      });

      if (res.status !== 200) {
        errors.push(`status ${res.status} (expected 200)`);
      }

      // Did the request get bounced to a different host? (a stray apex/
      // subdomain redirect - the kind that would expose /main/).
      const wantHost = safeHost(t.url);
      const finalHost = safeHost(res.url) ?? wantHost;
      if (wantHost && finalHost && finalHost !== wantHost) {
        errors.push(`redirected ${wantHost} -> ${finalHost}`);
      }

      const body = await res.text();

      if (PLACEHOLDER.test(body)) {
        errors.push("served a parked/placeholder page");
      }

      const got = body.match(SURFACE_META)?.[1];
      if (!got) {
        errors.push("missing <meta name=x-surface> (wrong or placeholder page?)");
      } else if (got !== t.surface) {
        errors.push(`x-surface "${got}" != expected "${t.surface}"`);
      }
    } catch (err) {
      errors.push(`fetch failed: ${(err as Error).message}`);
    }
    results.push({ ...t, ok: errors.length === 0, errors });
  }

  return results;
}

/** Human-readable pass/fail block for CI logs and alert payloads. */
export function formatResults(results: CheckResult[]): string {
  return results
    .map(
      (r) =>
        `${r.ok ? "OK  " : "FAIL"} ${r.name} (${r.surface})\t${r.url}` +
        (r.errors.length ? "\n      - " + r.errors.join("\n      - ") : ""),
    )
    .join("\n");
}

function safeHost(u?: string): string | undefined {
  if (!u) return undefined;
  try {
    return new URL(u).host;
  } catch {
    return undefined;
  }
}

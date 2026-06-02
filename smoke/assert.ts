// Portable smoke assertions for the live origin.
//
// Runs in BOTH Node (vitest, via `npm run smoke`) and a Cloudflare Worker
// (workerd, the scheduled monitor) - so it leans on nothing but `fetch`,
// strings, and regex: no jsdom, no node:* imports. Issue 149.
//
// Tolerant by design. Surfaces are independently versioned and adopt the
// x-surface stamp (BaseLayout.astro) on their own release cadence, so the
// checks must not assume lockstep or punish a not-yet-stamped surface:
//   - always:   reachable (200), no stray cross-host redirect, not a parked page
//   - stamped:  assert it's the RIGHT surface (catches a routing leak)
//   - unstamped (pre-stamp build): tolerate - note "unverified", do not fail
// The two failures we actually hit still trip it: an apex placeholder (parked
// page) and a subdomain leak (404). Surface-identity coverage strengthens
// automatically as each surface ships its stamp - no release is forced for it.

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
  /** non-failing observations (e.g. a surface not yet carrying its stamp) */
  notes: string[];
}

export interface RunOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

const SURFACE_META = /<meta\s+name=["']x-surface["']\s+content=["']([^"']*)["']/i;

// Signature of a cPanel/host default-parked page - never legitimate content.
// Consulted only when a page carries no stamp, to tell a parked page apart from
// a pre-stamp build. Brand/host names like "godaddy" are deliberately absent:
// they appear legitimately in e.g. the privacy policy's data-processor list.
const PLACEHOLDER =
  /(this (web ?)?site is parked|coming soon|under construction|default web ?page|future home of)/i;

export async function runChecks(targets: Target[], opts: RunOptions = {}): Promise<CheckResult[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  // Browser-ish UA, in case the origin ever filters unknown clients.
  const ua = opts.userAgent ?? "kaihacks-smoke/1 (+https://kaihacks.ai)";
  const results: CheckResult[] = [];

  for (const t of targets) {
    const errors: string[] = [];
    const notes: string[] = [];
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
      const got = body.match(SURFACE_META)?.[1];

      if (got === t.surface) {
        // Correct, stamped surface - fully verified.
      } else if (got) {
        // Stamped, but the WRONG surface answered - a routing leak.
        errors.push(`x-surface "${got}" != expected "${t.surface}"`);
      } else if (PLACEHOLDER.test(body)) {
        // No stamp AND parked-page text - the origin is serving a placeholder.
        errors.push("served a parked/placeholder page");
      } else {
        // No stamp, but live and not parked: a pre-stamp build. Tolerated -
        // identity is unverifiable until this surface ships its stamp.
        notes.push("no x-surface yet (pre-stamp build); surface identity unverified");
      }
    } catch (err) {
      errors.push(`fetch failed: ${(err as Error).message}`);
    }
    results.push({ ...t, ok: errors.length === 0, errors, notes });
  }

  return results;
}

/** Human-readable pass/fail block for CI logs and alert payloads. */
export function formatResults(results: CheckResult[]): string {
  return results
    .map((r) => {
      const lines = [...r.errors.map((e) => `- ${e}`), ...r.notes.map((n) => `~ ${n}`)];
      return (
        `${r.ok ? "OK  " : "FAIL"} ${r.name} (${r.surface})\t${r.url}` +
        (lines.length ? "\n      " + lines.join("\n      ") : "")
      );
    })
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

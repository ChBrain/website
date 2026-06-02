import { describe, it, expect } from "vitest";
import { targetsFor } from "./targets";
import { runChecks, formatResults } from "./assert";

// Live smoke checks against the DEPLOYED origin. NOT part of the hermetic
// `npm test` suite (this hits the network) - run on demand via:
//   SMOKE_ENV=staging   npm run smoke
//   SMOKE_ENV=production npm run smoke   (default)
// Wired into CI post-deploy and the CF monitor later. Issue #149.
const env = process.env.SMOKE_ENV ?? "production";

// Bypass token for Cloudflare bot protection: a WAF "skip" rule lets requests
// carrying X-Monitor through Bot Fight Mode, which otherwise 403s datacenter-IP
// clients (GitHub runners). Without it the checks fail closed with 403.
const token = process.env.MONITOR_TOKEN;
const headers = token ? { "x-monitor": token } : {};

describe(`smoke: ${env}`, () => {
  it("every canonical URL serves its own stamped surface", async () => {
    const results = await runChecks(targetsFor(env), { headers });
    const failed = results.filter((r) => !r.ok);
    // Attach the full report so a CI failure shows exactly what broke.
    expect(failed, "\n" + formatResults(results) + "\n").toEqual([]);
  }, 30_000);
});

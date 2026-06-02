// Edge smoke monitor (Cloudflare Worker).
//
// Runs the host -> surface checks from Cloudflare's own edge - the one vantage
// that is never an "external datacenter client", so it keeps working even if
// Bot Fight Mode is ever switched on as an emergency shield. Two entrypoints:
//   - scheduled: the continuous monitor (cron in wrangler.toml), alerts on fail
//   - fetch:     on-demand - GET ?env=production[&token=...] returns the report
//
// Pure logic lives in ./check (unit-tested in Node); this file is just the
// Worker glue. Issue 149.

import { runAndReport } from "./check";

export interface Env {
  /** generic incoming-webhook (Slack/Discord) for failure alerts */
  WEBHOOK_URL?: string;
  /** comma-separated envs to check on cron, e.g. "production,staging" */
  SMOKE_ENVS?: string;
  /** if set, the on-demand fetch endpoint requires ?token=<this> */
  TRIGGER_TOKEN?: string;
}

function envList(env: Env): string[] {
  return (env.SMOKE_ENVS ?? "production")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default {
  // Continuous monitor. Checks each configured env from the edge; runAndReport
  // POSTs to WEBHOOK_URL on failure.
  async scheduled(
    _event: unknown,
    env: Env,
    ctx: { waitUntil(p: Promise<unknown>): void },
  ): Promise<void> {
    ctx.waitUntil(
      Promise.all(
        envList(env).map((e) => runAndReport({ env: e, webhookUrl: env.WEBHOOK_URL })),
      ).then(() => undefined),
    );
  },

  // On-demand check: GET https://<worker>/?env=production[&token=...]
  // Returns the plain-text report; 200 if all good, 503 if anything failed.
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (env.TRIGGER_TOKEN && url.searchParams.get("token") !== env.TRIGGER_TOKEN) {
      return new Response("forbidden\n", { status: 403 });
    }
    const which = url.searchParams.get("env") ?? "production";
    const { ok, report } = await runAndReport({ env: which, webhookUrl: env.WEBHOOK_URL });
    return new Response(report + "\n", {
      status: ok ? 200 : 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};

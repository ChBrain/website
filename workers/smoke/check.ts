// Pure check-and-report logic for the edge monitor (testable in plain Node).
// Kept separate from index.ts (the Worker entrypoint) so it has zero Worker-
// runtime dependencies and can be unit-tested with a mock fetch. Issue 149.

import { runChecks, formatResults, type CheckResult } from "../../smoke/assert";
import { targetsFor } from "../../smoke/targets";

export interface ReportOptions {
  /** "production" | "staging" - selects the URL set from src/lib/urls.ts */
  env: string;
  /** generic incoming-webhook URL (Slack/Discord shape) for failure alerts */
  webhookUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface ReportResult {
  ok: boolean;
  report: string;
  results: CheckResult[];
}

/**
 * Run the smoke checks for one environment and, if anything failed and a
 * webhook is configured, POST a single alert. Returns the outcome either way.
 */
export async function runAndReport(opts: ReportOptions): Promise<ReportResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const results = await runChecks(targetsFor(opts.env), { fetchImpl });
  const report = formatResults(results);
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0 && opts.webhookUrl) {
    await fetchImpl(opts.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `kaihacks smoke FAILED - ${opts.env}: ${failed.length}/${results.length} surface(s)\n\n${report}`,
      }),
    });
  }

  return { ok: failed.length === 0, report, results };
}

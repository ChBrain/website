import { urlsFor, type SurfaceUrls } from "../src/lib/urls";
import type { Target } from "./assert";

// Which surface actually serves each canonical URL.
//
// cvi/privacy/contact are folded into the `main` surface (built under
// dist/main/, served at the apex root via the rewrite), so they must answer
// with x-surface=main - NOT a surface of their own. Keeping this map next to
// the smoke (rather than in urls.ts) means the build stays oblivious; only the
// checks care about the fold. Issue #149.
const SURFACE_OF: Record<keyof SurfaceUrls, string> = {
  architecture: "architecture",
  main: "main",
  cvi: "main",
  privacy: "main",
  contact: "main",
  cultures: "cultures",
};

/** Build the live-check targets for an environment from the canonical URLS. */
export function targetsFor(env?: string): Target[] {
  const urls = urlsFor(env);
  return (Object.keys(urls) as (keyof SurfaceUrls)[]).map((name) => ({
    name,
    url: urls[name],
    surface: SURFACE_OF[name],
  }));
}

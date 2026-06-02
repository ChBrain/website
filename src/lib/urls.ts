// Surface URLs, switched by the DEPLOY_ENV env var at build time.
//
// Production (default): main is the apex (kaihacks.ai/), with its cvi,
// privacy, and contact pages under it (/cvi/, /privacy/, /contact/);
// architecture and cultures are subdomains.
// Staging: collapsed onto staging.kaihacks.ai with main under /main/ and
// its pages nested there (/main/cvi/, /main/privacy/, /main/contact/);
// the subdomains stage at /architecture/, /cultures/.
//
// The set of canonical cross-surface URLs that any chrome or page can
// link to. Read this constant in components/pages instead of hardcoding
// strings - that way a staging build with DEPLOY_ENV=staging stays
// inside staging, and a production build (env unset) stays inside
// production.
//
// Build wiring: see .github/workflows/deploy-staging.yml which exports
// DEPLOY_ENV=staging on the build step. Production needs no flag - the
// unset case is production.

export interface SurfaceUrls {
  architecture: string;
  main: string;
  cvi: string;
  privacy: string;
  cultures: string;
  contact: string;
}

const PRODUCTION: SurfaceUrls = {
  architecture: "https://architecture.kaihacks.ai/",
  main: "https://kaihacks.ai/",
  cvi: "https://kaihacks.ai/cvi/",
  privacy: "https://kaihacks.ai/privacy/",
  cultures: "https://cultures.kaihacks.ai/",
  contact: "https://kaihacks.ai/contact/",
};

const STAGING_BASE = "https://staging.kaihacks.ai";

const STAGING: SurfaceUrls = {
  architecture: `${STAGING_BASE}/architecture/`,
  main: `${STAGING_BASE}/main/`,
  cvi: `${STAGING_BASE}/main/cvi/`,
  privacy: `${STAGING_BASE}/main/privacy/`,
  cultures: `${STAGING_BASE}/cultures/`,
  contact: `${STAGING_BASE}/main/contact/`,
};

// Resolve the URL set for an environment. Exported (alongside the URLS
// constant) so the live smoke checks and the Cloudflare monitor Worker can
// derive the exact same canonical URLs the site builds with - one source of
// truth for "what should be reachable". See smoke/ and issue 149.
export function urlsFor(env?: string): SurfaceUrls {
  return env === "staging" ? STAGING : PRODUCTION;
}

export const URLS: SurfaceUrls = urlsFor(process.env.DEPLOY_ENV);

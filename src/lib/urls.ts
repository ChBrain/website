// Surface URLs, switched by the DEPLOY_ENV env var at build time.
//
// Production (default): subdomain split - architecture lives at
// architecture.kaihacks.ai, main lives at the apex kaihacks.ai/main/.
// Staging: collapsed onto staging.kaihacks.ai with per-surface subpaths
// (staging.kaihacks.ai/architecture/, /main/, /privacy/...).
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
  main: "https://kaihacks.ai/main/",
  cvi: "https://kaihacks.ai/main/cvi/",
  privacy: "https://kaihacks.ai/privacy/",
  cultures: "https://cultures.kaihacks.ai/",
  contact: "https://kaihacks.ai/contact/",
};

const STAGING_BASE = "https://staging.kaihacks.ai";

const STAGING: SurfaceUrls = {
  architecture: `${STAGING_BASE}/architecture/`,
  main: `${STAGING_BASE}/main/`,
  cvi: `${STAGING_BASE}/main/cvi/`,
  privacy: `${STAGING_BASE}/privacy/`,
  cultures: `${STAGING_BASE}/cultures/`,
  contact: `${STAGING_BASE}/contact/`,
};

export const URLS: SurfaceUrls = process.env.DEPLOY_ENV === "staging" ? STAGING : PRODUCTION;

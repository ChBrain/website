# Deploy targets

The chbrain/website Astro build emits one sub-folder per surface
under `dist/`. Each surface rsyncs to a different vhost on the
shared cPanel host (`92.205.150.56`, user `c216mkgp1lzk`).

## Host layout

The apex `kaihacks.ai` is the main domain and serves directly from
`/public_html/`. Each subdomain has its own document root inside
`/public_html/`. From the cPanel domain table:

| Domain                     | Document root on host                    |
| -------------------------- | ---------------------------------------- |
| `kaihacks.ai` (main)       | `/public_html/`                          |
| `architecture.kaihacks.ai` | `/public_html/architecture.kaihacks.ai/` |
| `cultures.kaihacks.ai`     | `/public_html/cultures.kaihacks.ai/`     |
| `staging.kaihacks.ai`      | `/public_html/staging.kaihacks.ai/`      |

Note: the apex maps to `/public_html/` directly, NOT
`/public_html/kaihacks.ai/`. Anything URL-pathed under the apex
(e.g. `kaihacks.ai/main/`) lives at `/public_html/<path>/` on the
host - the `kaihacks.ai/` segment does not appear in the host path.

## Build outputs -> deploy targets

| `dist/` subfolder    | Production rsync target                  | Staging rsync target                             |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| `dist/architecture/` | `/public_html/architecture.kaihacks.ai/` | `/public_html/staging.kaihacks.ai/architecture/` |
| `dist/main/`         | `/public_html/main/`                     | `/public_html/staging.kaihacks.ai/main/`         |
| `dist/privacy/`      | `/public_html/privacy/`                  | `/public_html/staging.kaihacks.ai/privacy/`      |
| `dist/cultures/`     | `/public_html/cultures.kaihacks.ai/`     | `/public_html/staging.kaihacks.ai/cultures/`     |
| `dist/contact/`      | `/public_html/contact/` ⚠️               | `/public_html/staging.kaihacks.ai/contact/`      |

⚠️ **contact production root is unverified.** It follows the apex-subpath
convention (`/public_html/contact/`, matching `main` and `privacy`), but
unlike the other surfaces it has not been confirmed against the cPanel
domain table. Confirm the vhost / document root exists before the first
`contact-v*` production tag — the rsync uses `--delete`.

Production URLs:

- `https://architecture.kaihacks.ai/` (subdomain root, clean URL)
- `https://kaihacks.ai/main/` (apex `/main/` subpath)
- `https://kaihacks.ai/main/cvi/` (the CVI colophon, nested under main)
- `https://kaihacks.ai/privacy/` (apex `/privacy/` subpath; site-wide legal page)
- `https://cultures.kaihacks.ai/` (subdomain root, clean URL)
- `https://kaihacks.ai/contact/` (apex `/contact/` subpath)

Staging URLs:

- `https://staging.kaihacks.ai/architecture/`
- `https://staging.kaihacks.ai/main/`
- `https://staging.kaihacks.ai/main/cvi/`
- `https://staging.kaihacks.ai/privacy/`
- `https://staging.kaihacks.ai/cultures/`
- `https://staging.kaihacks.ai/contact/`

## How deploys are triggered

All deploys flow through one reusable workflow,
`.github/workflows/deploy-surface.yml`, which builds the site and
rsyncs a single `dist/<surface>/` to the resolved target. The
surface -> document-root mapping above lives in that workflow as the
single source of truth. Three ways to invoke it:

- **Auto-staging** (`deploy-staging.yml`): on CI green on `main`, a
  matrix calls the reusable workflow once per surface with
  `env: staging`. Surfaces deploy independently (fail-fast disabled),
  so one failing surface never blocks the rest.
- **Production tags** (`deploy-production.yml`): pushing a per-surface
  tag (`main-v0.0.1`, `architecture-v0.0.3`, …) rebuilds and deploys
  only that surface with `env: production`.
- **Manual** (`workflow_dispatch`): run `deploy-surface` from the
  Actions tab (or `gh workflow run deploy-surface.yml -f surface=main
  -f env=staging`) to deploy any one surface to either environment on
  demand.

## Versioning

Production tags are per-surface (`<surface>-v<semver>`) so each site
releases on its own cadence. There is currently a single repo-level
`package.json` version and **no per-surface version file**, so the
production workflow does not gate on a version match — the tag is the
release record. If independent per-surface version numbers become
worth enforcing, add a version source per surface (e.g. a
`surfaces/<name>/version` file or a manifest) and reinstate the
tag-vs-version check in `deploy-surface.yml` for `env: production`.

## Adding a surface

A new surface needs three touches: emit `dist/<surface>/` from the
build, add it to the `surface` choice/matrix lists in the three deploy
workflows, and add its production + staging targets to the `case`
mapping in `deploy-surface.yml` (and to the table above). Subdomains
go to `/public_html/<subdomain>/` in production and
`/public_html/staging.kaihacks.ai/<subdomain>/` in staging; apex
subpaths go to `/public_html/<path>/` in production.

## Why the apex uses a `/main/` subpath rather than the bare root

The apex `kaihacks.ai/` document root (`/public_html/`) is also the
cPanel home web root and is owned by the placeholder in
`chbrain/kaihacks`. Putting the chbrain/website-built company front
door at `/public_html/main/` (URL `kaihacks.ai/main/`) gives a
scoped, stable namespace for apex pages without colliding with
whatever else lives at the bare apex root.

## SSH

Deploy workflows use `ssh -i ~/.ssh/kaihacksai` (key set up from
`secrets.SSH_PRIVATE_KEY`) against `c216mkgp1lzk@92.205.150.56`.
The `--delete` flag on each rsync means the deploy target is the
source of truth; anything in the target that's not in the rsync
source is removed. Never point a rsync with `--delete` at a target
you don't fully own.

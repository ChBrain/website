# Deploy targets

The chbrain/website Astro build emits one sub-folder per surface
under `dist/`. Each surface rsyncs to a different vhost on the
shared cPanel host (`92.205.150.56`, user `c216mkgp1lzk`).

## Host layout

The apex `kaihacks.ai` is the company front door. Its document root is fixed
at `/public_html/` (cPanel won't repoint the primary domain), so the apex
serves the `main` surface — deployed to `/public_html/main/` — via a path
rewrite (a Cloudflare edge rule, with an origin `.htaccess` fallback; see
"Apex routing" below). Each subdomain has its own document root inside
`/public_html/`. From the cPanel domain table:

| Domain                     | Document root on host                    |
| -------------------------- | ---------------------------------------- |
| `kaihacks.ai` (apex)       | `/public_html/` (rewrites to `/main/`)   |
| `architecture.kaihacks.ai` | `/public_html/architecture.kaihacks.ai/` |
| `cultures.kaihacks.ai`     | `/public_html/cultures.kaihacks.ai/`     |
| `plays.kaihacks.ai`        | `/public_html/plays.kaihacks.ai/`        |
| `writing.kaihacks.ai`      | `/public_html/writing.kaihacks.ai/`      |
| `staging.kaihacks.ai`      | `/public_html/staging.kaihacks.ai/`      |

`main` deploys to its own dedicated root `/public_html/main/`, so `rsync
--delete` is safe. Its own pages — `cvi/`, `privacy/`, `contact/` — live inside
that root and serve as the clean `kaihacks.ai/cvi/`, `/privacy/`, `/contact/`
(the rewrite hides the `/main/` prefix).

## Build outputs -> deploy targets

There are five surfaces: `main` (the apex, with its sub-pages inside it),
and the subdomains `architecture`, `cultures`, `plays`, and `writing`.

| `dist/` subfolder    | Production rsync target                  | Staging rsync target                             |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| `dist/main/`         | `/public_html/main/`                     | `/public_html/staging.kaihacks.ai/main/`         |
| `dist/architecture/` | `/public_html/architecture.kaihacks.ai/` | `/public_html/staging.kaihacks.ai/architecture/` |
| `dist/cultures/`     | `/public_html/cultures.kaihacks.ai/`     | `/public_html/staging.kaihacks.ai/cultures/`     |
| `dist/plays/`        | `/public_html/plays.kaihacks.ai/`        | `/public_html/staging.kaihacks.ai/plays/`        |
| `dist/writing/`      | `/public_html/writing.kaihacks.ai/`      | `/public_html/staging.kaihacks.ai/writing/`      |

`main`'s build includes its `cvi/`, `privacy/`, and `contact/` pages, so the
whole apex ships as one surface and every rsync uses `--delete` against a
dedicated root.

Production URLs:

- `https://kaihacks.ai/` (apex root — the `main` surface)
- `https://kaihacks.ai/cvi/` (the CVI colophon)
- `https://kaihacks.ai/privacy/` (site-wide legal page)
- `https://kaihacks.ai/contact/`
- `https://architecture.kaihacks.ai/` (subdomain root, clean URL)
- `https://cultures.kaihacks.ai/` (subdomain root, clean URL)
- `https://plays.kaihacks.ai/` (subdomain root, clean URL)
- `https://writing.kaihacks.ai/` (subdomain root, clean URL)

Staging URLs (every surface under the single staging vhost):

- `https://staging.kaihacks.ai/main/` (and `/main/cvi/`, `/main/privacy/`, `/main/contact/`)
- `https://staging.kaihacks.ai/architecture/`
- `https://staging.kaihacks.ai/cultures/`
- `https://staging.kaihacks.ai/plays/`
- `https://staging.kaihacks.ai/writing/`

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
  tag (`main-v0.1.0`, `architecture-v0.1.0`, …) rebuilds and deploys
  only that surface with `env: production`.
- **Manual** (`workflow_dispatch`): run `deploy-surface` from the
  Actions tab to deploy any one surface to either environment on demand.

## Versioning

Production tags are per-surface (`<surface>-v<semver>`) so each site
releases on its own cadence. There is currently a single repo-level
`package.json` version and **no per-surface version file**, so the
production workflow does not gate on a version match — the tag is the
release record.

## Adding a surface

A new surface needs three touches: emit `dist/<surface>/` from the
build, add it to the `surface` choice/matrix lists in the three deploy
workflows, and add its production + staging targets to the `case`
mapping in `deploy-surface.yml` (and to the table above). Subdomains
go to `/public_html/<subdomain>/` in production and
`/public_html/staging.kaihacks.ai/<subdomain>/` in staging. Pages that
belong under the apex are folded into the `main` surface rather than
deployed separately, so the apex root stays owned by one surface.

## Apex routing

`kaihacks.ai`'s document root is fixed at `/public_html/` (cPanel won't repoint
the primary domain), so the bare apex serves the `main` surface (deployed to
`/public_html/main/`) by rewriting the path to `/main/…`. The visitor URL stays
clean (`kaihacks.ai/`, `/privacy/`, `/cvi/`, `/contact/`).

**Primary — Cloudflare Transform Rule (Rewrite URL), at the edge.** This is the
source of truth for apex routing:

- _When:_ `(http.host eq "kaihacks.ai" or http.host eq "www.kaihacks.ai") and not starts_with(http.request.uri.path, "/main/")`
- _Then:_ Path → Rewrite to → Dynamic → `concat("/main", http.request.uri.path)`

Being matched on `http.host`, it can only ever affect the apex — never the
`architecture` / `cultures` subdomains.

**Fallback — origin `apex/.htaccess`**, deployed to `/public_html/.htaccess` by
the `deploy-apex` workflow. Kept as a redundant origin-level rewrite in case the
edge rule is ever removed. It is **host-scoped** so the nested subdomain
docroots that inherit this file are left untouched (an earlier unscoped version
leaked into them and 404'd the subdomains — see #148):

```apache
RewriteEngine On
RewriteBase /
RewriteCond %{HTTP_HOST} ^(www\.)?kaihacks\.ai$ [NC]
RewriteCond %{REQUEST_URI} !^/main/
RewriteRule ^(.*)$ /main/$1 [L]
```

The two **coexist safely**: the edge rule rewrites `kaihacks.ai/x` to origin
`/main/x`; the `.htaccess` then sees `^/main/` and leaves it (no double
rewrite). `main` keeps a dedicated `/public_html/main/` root, so its `--delete`
is safe.

`deploy-apex` (`workflow_dispatch`) rsyncs `apex/` to `/public_html/` **without**
`--delete` (it only places the file, never touching the siblings sharing that
root). Static and set-and-forget; re-run only when `apex/` changes. Keep
internal links trailing-slashed (the build does) so `mod_dir` never redirects in
a way that exposes `/main/`.

## SSH

Deploy workflows use `ssh -i ~/.ssh/kaihacksai` (key set up from
`secrets.SSH_PRIVATE_KEY`) against `c216mkgp1lzk@92.205.150.56`.
Surface rsyncs use `--delete` — each surface writes to a dedicated
document root, so the target is the source of truth and anything in it
not in the rsync source is removed. The one exception is `deploy-apex`,
which writes to the shared `/public_html/` root and therefore runs
**without** `--delete`. Never point a rsync with `--delete` at a target
you don't fully own.

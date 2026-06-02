# Deploy targets

The chbrain/website Astro build emits one sub-folder per surface
under `dist/`. Each surface rsyncs to a different vhost on the
shared cPanel host (`92.205.150.56`, user `c216mkgp1lzk`).

## Host layout

The apex `kaihacks.ai` is the company front door. Its document root is fixed
at `/public_html/` (cPanel won't repoint the primary domain), so the apex
serves the `main` surface — deployed to `/public_html/main/` — via an
`.htaccess` rewrite (see "The apex rewrite" below). Each subdomain has its own
document root inside `/public_html/`. From the cPanel domain table:

| Domain                     | Document root on host                    |
| -------------------------- | ---------------------------------------- |
| `kaihacks.ai` (apex)       | `/public_html/` (rewrites to `/main/`)   |
| `architecture.kaihacks.ai` | `/public_html/architecture.kaihacks.ai/` |
| `cultures.kaihacks.ai`     | `/public_html/cultures.kaihacks.ai/`     |
| `staging.kaihacks.ai`      | `/public_html/staging.kaihacks.ai/`      |

`main` deploys to its own dedicated root `/public_html/main/`, so `rsync
--delete` is safe. Its own pages — `cvi/`, `privacy/`, `contact/` — live inside
that root and serve as the clean `kaihacks.ai/cvi/`, `/privacy/`, `/contact/`
(the rewrite hides the `/main/` prefix).

## Build outputs -> deploy targets

There are three surfaces: `main` (the apex, with its sub-pages inside it),
and the two subdomains `architecture` and `cultures`.

| `dist/` subfolder    | Production rsync target                  | Staging rsync target                             |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| `dist/main/`         | `/public_html/main/`                     | `/public_html/staging.kaihacks.ai/main/`         |
| `dist/architecture/` | `/public_html/architecture.kaihacks.ai/` | `/public_html/staging.kaihacks.ai/architecture/` |
| `dist/cultures/`     | `/public_html/cultures.kaihacks.ai/`     | `/public_html/staging.kaihacks.ai/cultures/`     |

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

Staging URLs (every surface under the single staging vhost):

- `https://staging.kaihacks.ai/main/` (and `/main/cvi/`, `/main/privacy/`, `/main/contact/`)
- `https://staging.kaihacks.ai/architecture/`
- `https://staging.kaihacks.ai/cultures/`

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

## The apex rewrite

cPanel won't repoint the primary domain, so `kaihacks.ai`'s document root
stays `/public_html/`. The apex serves the `main` surface (at
`/public_html/main/`) via `apex/.htaccess`, deployed to `/public_html/.htaccess`:

```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_URI} !^/main/
RewriteRule ^(.*)$ /main/$1 [L]
```

Every apex request is internally rewritten to `/main/` — the URL stays clean
(`kaihacks.ai/`, `/privacy/`, `/cvi/`), the old `chbrain/kaihacks` placeholder
is never served (the rewrite runs before any apex directory index), and
subdomains are unaffected (their own vhosts never read this file). `main` keeps
a dedicated `/public_html/main/` root, so its `--delete` is safe.

Deploy it with the `deploy-apex` workflow (`workflow_dispatch`), which rsyncs
`apex/` to `/public_html/` **without** `--delete` (it only places the file and
never touches the siblings sharing that root). It is static and set-and-forget;
re-run only when `apex/` changes. Keep internal links trailing-slashed (the
build does) so `mod_dir` never redirects in a way that exposes `/main/`.

## SSH

Deploy workflows use `ssh -i ~/.ssh/kaihacksai` (key set up from
`secrets.SSH_PRIVATE_KEY`) against `c216mkgp1lzk@92.205.150.56`.
Surface rsyncs use `--delete` — each surface writes to a dedicated
document root, so the target is the source of truth and anything in it
not in the rsync source is removed. The one exception is `deploy-apex`,
which writes to the shared `/public_html/` root and therefore runs
**without** `--delete`. Never point a rsync with `--delete` at a target
you don't fully own.

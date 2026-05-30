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

Production URLs:

- `https://architecture.kaihacks.ai/` (subdomain root, clean URL)
- `https://kaihacks.ai/main/` (apex `/main/` subpath)
- `https://kaihacks.ai/main/cvi/` (the CVI colophon, nested under main)
- `https://kaihacks.ai/privacy/` (apex `/privacy/` subpath; site-wide legal page)

Staging URLs:

- `https://staging.kaihacks.ai/architecture/`
- `https://staging.kaihacks.ai/main/`
- `https://staging.kaihacks.ai/main/cvi/`
- `https://staging.kaihacks.ai/privacy/`

## Future surfaces

`cultures.kaihacks.ai` already exists as a vhost with document root
`/public_html/cultures.kaihacks.ai/`. When a `dist/cultures/` build
output comes online (likely from chbrain/cultures, or from a future
subpages tree under chbrain/website), the deploy workflows extend
the same way:

- production: `rsync ./dist/cultures/ ... c216mkgp1lzk@...:/public_html/cultures.kaihacks.ai/`
- staging: `rsync ./dist/cultures/ ... c216mkgp1lzk@...:/public_html/staging.kaihacks.ai/cultures/`

Any additional subdomain follows the same pattern: production at
`/public_html/<subdomain>/`, staging at
`/public_html/staging.kaihacks.ai/<subdomain>/`.

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

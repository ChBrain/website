# Branch naming and scope (website)

The single source of truth for which branch may touch what. The mechanism is
the shared `@chbrain/khai-guard` package (the repo-agnostic classifier,
`checkBranchScope` deny-by-default ownership, and `advise`); this repo supplies
the policy below in `khai-guard.config.json` under `"branchScope"`. The guard is
the engine; this config is the website's lanes. If this document and the guard
disagree, the guard wins; fix the document.

## Why

The website already separates the product from its verifiers at the diff level
(the source/test gate). Branch scope extends the same honesty to the branch
level.

Every branch is classified by its **name** into a **lane**. Scope is decided by
**ownership**, deny-by-default: each path is locked to the one lane that owns
it, and a branch may touch a path only if it is that path's owner (plus shared
metadata, below). The lanes encode a layered order:

```
architecture  ->  governance  ->  solution
  (chassis)        (the gates)     (the surfaces)
```

You cannot weaken the gate inside the same branch that needs it to pass: the
governance layer (the guard config, CI, hooks) sits above the solution layer
(the page surfaces) it judges, and architecture (the shared chassis) sits above
governance. A branch named for a surface cannot edit the gates; a branch named
for the gates cannot rewrite the chassis. A wrong name fails fast, before any
path is examined.

## The defining unit is the surface

The website's solution unit is the **surface** (a page area under `src/pages/`),
not the package. Each surface is its own lane: `surface/<name>/<change>`. The
shared chassis (components, libs, layouts, styles, marks) is the architecture
layer; the gates (CI, hooks, this guard config) are governance.

## Lanes

| Branch pattern                                  | Layer        | May touch                                                                       |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| `chassis/<change>`                              | architecture | `src/components/**`, `src/lib/**`, `src/layouts/**`, `src/styles/**`, `src/marks/**` |
| `governance/<change>`                           | governance   | `.github/**`, `.husky/**`, `khai-guard.config.json`                             |
| `surface/<name>/<change>`                       | solution     | `src/pages/**/<name>/**` (the `<name>` segment binds to the surface dir)         |
| `surface/architecture/<change>`                 | solution     | the loose canon pages (see "Loose canon pages" below)                            |
| `repo/<change>`                                 | infra        | only **unowned** paths (root configs, `README.md`, `docs/`, ...); owns nothing  |
| `chore/<change>` `fix/<change>` `docs/<change>` | general      | only **unowned** paths; owns nothing                                            |

`<change>` is a free kebab-case topic. The layer is derived from the prefix.

### Ownership is deny-by-default

The `chassis`, `governance`, and `surface` lanes are **protected**: the paths in
their `allow` are **owned**, and an owned path may be touched only by its owning
lane. A general or infra lane (`repo`, `chore`, `fix`, `docs`) owns **nothing**;
it may touch only paths that no protected lane claims (**unowned**). This is the
load-bearing half of the rule: a `chore/` or `repo/` branch can no longer reach
a governance-owned path (for example `.github/workflows/deploy.yml` or
`khai-guard.config.json`) and weaken the gate from outside `governance/`.
Conversely, a protected lane may **not** stray onto an unowned path: a
`chassis/` branch that edits `README.md` is rejected and told to use a `repo/`
or `chore/` branch.

### The solution layer fans out per surface

There is no single "solution" lane. The solution layer is the set of surfaces
under `src/pages/`, and each surface is its own lane: `surface/<name>/<change>`.
The `<name>` branch segment **binds** to the surface directory via the `{name}`
placeholder in the glob `src/pages/**/{name}/**`. The `**` before `{name}`
lets the binding resolve a surface wherever it sits in the page tree, so the
same lane shape covers surfaces nested at different depths:

- `surface/playbook/<change>` binds `src/pages/architecture/playbook/**`
- `surface/enginebooks/<change>` binds `src/pages/architecture/enginebooks/**`
- `surface/cultures/<change>` binds `src/pages/cultures/**`
- `surface/main/<change>` binds `src/pages/main/**`

A mismatch (a `surface/cultures/...` branch editing `src/pages/main/**`) is
rejected. This keeps surfaces independent and lets them land in parallel without
one surface's branch silently reaching into another.

### Loose canon pages

A few canon pages live directly in the page tree rather than inside a surface
`<name>/` directory: the apex `src/pages/index.astro`, the canon index
`src/pages/architecture/index.astro`, and the canon type page
`src/pages/architecture/[slug].astro`. Rather than leave these unowned (where any
general lane could touch them), they are a real surface: the explicit
`surface/architecture/<change>` lane owns exactly those three files. Because that
lane is more specific than the generic `surface/*/*` lane, it is listed first in
`khai-guard.config.json` so the classifier matches it before the fan-out lane.

### Shared metadata

`branchScope.shared` is the set of unowned safe metadata any lane may touch. The
website versions manually (no changesets), so there is no shared set here; it is
left empty (`[]`).

### Multi-lane work is illegal

A single change set that spans more than one lane cannot live on one branch.
Split it into per-lane branches and merge them in layer order: chassis
(architecture), then governance, then surface (solution). Ask the advisor
(below) and it prints the exact branches and the order.

## Pre-flight: ask the advisor

Before you `git checkout -b`, let the guard tell you the lane(s) for the files
you expect to change:

```bash
npx khai-guard advise --files src/pages/cultures/index.astro
# -> one lane (solution): git checkout -b surface/cultures/<change> origin/main

npx khai-guard advise --files src/lib/foo.ts src/pages/main/index.astro
# -> SPLIT REQUIRED: a chassis branch and a surface branch, in order
```

## Config

The lanes live in `khai-guard.config.json` under `"branchScope"`. Each lane is a
branch-name `pattern` bound to a list of **owned** path globs (`allow`). For a
protected lane those globs are what it owns; a general/infra lane carries an
empty `allow` (`[]`) because it owns nothing and is permitted only unowned
paths. A fan-out lane sets `unit` (the segment index of the bound name) and uses
the `{name}` placeholder in its globs, which the classifier substitutes from the
matched branch segment. `branchScope.shared` is a separate glob list of unowned
metadata any lane may touch (empty here). See that file for the live values.

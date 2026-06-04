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

| Branch pattern                                  | Layer        | May touch                                                                            |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| `chassis/<change>`                              | architecture | `src/components/**`, `src/lib/**`, `src/layouts/**`, `src/styles/**`, `src/marks/**` |
| `governance/<change>`                           | governance   | `.github/**`, `.husky/**`, `khai-guard.config.json`, `tests/**`                      |
| `surface/<surface>/<change>`                    | solution     | that surface's page dir — one explicit lane per surface (see below)                  |
| `surface/pages/<change>`                        | solution     | the loose top-level / index / `[slug]` pages                                         |
| `repo/<change>`                                 | infra        | only **unowned** paths (root configs, `README.md`, `docs/`, ...); owns nothing       |
| `chore/<change>` `fix/<change>` `docs/<change>` | general      | only **unowned** paths; owns nothing                                                 |

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

### The solution layer is explicit, per surface

There is no single "solution" lane and **no fan-out**. Each surface under
`src/pages/` is its **own explicit lane** with a literal `allow`:

| Branch                         | Owns                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `surface/enginebooks/<change>` | `src/pages/architecture/enginebooks/**`                                                     |
| `surface/playbook/<change>`    | `src/pages/architecture/playbook/**`                                                        |
| `surface/cvi/<change>`         | `src/pages/main/cvi/**`                                                                     |
| `surface/privacy/<change>`     | `src/pages/main/privacy/**`                                                                 |
| `surface/contact/<change>`     | `src/pages/main/contact/**`                                                                 |
| `surface/pages/<change>`       | the loose pages: `src/pages/*.astro`, `src/pages/*/*.astro` (apex, group indexes, `[slug]`) |

A **new surface must be added here first.** Until its lane exists, the branch
name `surface/<new>/...` matches no lane and its pages are unowned, so the
change is rejected. Creating a surface is therefore a governance act
(architecture → governance → solution), not a side effect of a feature branch.

> **Why explicit, not a `surface/*/*` fan-out?** A fan-out lane with a glob like
> `src/pages/**/{name}/**` cannot be made to work here. The guard recovers the
> bound `{name}` from a path by slicing at the **literal length** of the glob's
> prefix; a `**` in that prefix makes the slice land on the wrong segment, so
> every surface page resolves as **unowned**. It was latent under advisory mode
> and only surfaced once the gate was enforced. Explicit literal lanes are
> unambiguous, so the guard owns each page correctly. Bracketed dynamic routes
> (`[engine]`, `[slug]`) are fine: they sit inside a `**` or are matched by `*`,
> never written as a literal `[...]` glob (which picomatch would read as a
> character class).

### What this isolates — and what it does not

These lanes deliver two of the three properties you might want:

1. **Layer isolation (enforced).** A `surface/*` branch cannot touch
   `src/components/**` etc. (chassis) or `.github/**` / `khai-guard.config.json`
   / `tests/**` (governance). The load-bearing rule — a solution can't edit the
   chassis or the gates — holds.
2. **New-surface gating (enforced).** A surface with no lane is unowned, so it
   cannot be created without a governance PR.
3. **Mutual per-surface isolation — _not_ enforced.** A `surface/enginebooks`
   branch _can_ edit a `surface/privacy` file and the guard will not object.

The third is a property of the **guard**, not this config: `khai-guard` keys a
lane's identity off the **first segment of its pattern** (`laneForPath` returns
`pattern.split("/")[0]`), so every `surface/<x>/*` lane shares the one identity
`surface`. Distinct identities — and therefore mutual isolation — require the
`{name}`-binding `unit` mechanism, which (per the note above) the website's
nested page tree cannot feed correctly today.

**To get true per-surface isolation you would change the guard, not this repo:**
teach `laneForPath`'s `{name}` extraction to _match the glob_ (or iterate the
allow globs by literal prefix) rather than slice one prefix, then give a single
`surface/*/*` lane two literal-prefix globs — `src/pages/main/{name}/**` and
`src/pages/architecture/{name}/**`. Lane identity then becomes `surface/<name>`,
and a privacy branch can no longer reach a cvi file. It is a small, contained
change to `@chbrain/khai-guard`; until then, **layer isolation + new-surface
gating** is the honest guarantee, and that is the load-bearing half.

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

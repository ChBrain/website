# CLAUDE.md

## Branch scope

Branch by subject, not by worker. The defining unit is the **surface** (a page
area under `src/pages/`).

- Surface work -> `surface/<name>/<change>` (binds `src/pages/**/<name>/**`).
- Shared chassis (components, libs, layouts, styles, marks) -> `chassis/<change>`.
- Gates (CI, hooks, this guard config) -> `governance/<change>`.

Ask `npx khai-guard advise --files <paths>` before `git checkout -b`. Never
`claude/*`. Multi-lane work splits into per-lane branches and merges in layer
order: chassis -> governance -> surface.

The full contract lives in [docs/BRANCHING.md](docs/BRANCHING.md). The
mechanism is the shared `@chbrain/khai-guard` package; the policy is this repo's
`branchScope` section in `khai-guard.config.json`.

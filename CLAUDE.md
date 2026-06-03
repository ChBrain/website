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

## Local handoffs

Some steps must run on a machine with the GitHub Packages token (the CI sandbox
can't reach the `@chbrain` registry): dependency bumps, lockfile regens,
deploys. Hand these off **clean**, not as a prose recipe — a second agent
(Copilot) executes literally and chokes on mixed prose + commands.

- **Prefer a script.** A recurring local task is a repo script, so the handoff
  is one command. Dependency sync: **`npm run deps:sync`** — updates every
  `@chbrain/*` dep + the lockfile; then review the diff, commit, push on a
  `chore/*` branch.
- **One-off → commands only.** One fenced block, one command per line, **no
  inline comments, no conditionals**. Put "verify" and "on failure" notes as
  plain text _outside_ the block.

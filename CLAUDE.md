# CLAUDE.md

## Branch scope

Branch by subject, not by worker. The defining unit is the **surface** (a page
area under `src/pages/`).

- Surface work -> `surface/<surface>/<change>`, where `<surface>` is a
  **defined** lane (`enginebooks`, `playbook`, `cvi`, `privacy`, `contact`, or
  `pages` for the loose index/`[slug]` pages). A NEW surface must be added to
  `khai-guard.config.json` first (a `governance/` PR) — until then its pages are
  unowned and the branch is rejected. Each surface is its own explicit lane.
- Shared chassis (components, libs, layouts, styles, marks) -> `chassis/<change>`.
- Gates (CI, hooks, this guard config, `tests/**`) -> `governance/<change>`.

The guard gives **layer isolation** (a surface can't touch the chassis or the
gates) and **new-surface gating** (a surface needs a lane first), but _not_
mutual isolation between surfaces — see [docs/BRANCHING.md](docs/BRANCHING.md)
"What this isolates — and what it does not".

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
  is one command. Dependency sync: **`npm run deps:sync`** updates every
  `@chbrain/*` dep + the lockfile; then review the diff, commit, push on a
  `deps/*` branch (the lane that owns `package.json` + the lockfile; a manual
  sync is not a `dependabot/*` bot PR, and `chore/*` owns no package paths).
- **One-off → commands only.** One fenced block, one command per line, **no
  inline comments, no conditionals**. Put "verify" and "on failure" notes as
  plain text _outside_ the block.
- **Deliver via PR comment.** Post the command block on the PR that needs the
  work — not as chat output. The PR is the context; the comment is the
  traceability.

# Deploy, PLAYs & the configurator — design capture

> **Status:** design capture, not yet built. The canonical implementation
> belongs in **`@chbrain/khai-arch`** (the canon owns the Stack and the
> composition rules); this note lives in the website repo only because the
> discussion grew out of the Enginebook's download spread (see
> [enginebooks.md](./enginebooks.md), move #2 — which this **supersedes**).
> Move this note to khai when the work starts there.

This is the model behind "deploy an engine" — it turned out to be much bigger
than zipping one engine, so it's written down here so we don't lose it.

## The core idea: npm is the source, the zip is derived

Every engine and culture is a **manifest-bearing npm package**. The website
already reads the manifest (`loadEngineBook` → `khai.anchor`, `khai.expressions`)
to render; a packer reads the _same_ manifest the same way. So there is no
per-engine zip script to duplicate — **one manifest-driven packer** serves every
component.

| Asset           | Form                          | Consumed by                             | Frontmatter?             |
| --------------- | ----------------------------- | --------------------------------------- | ------------------------ |
| **npm package** | structured + manifest         | tooling (website renders, packer reads) | yes — it's the source    |
| **zip**         | flat, yaml-free, upload-ready | humans / AI platforms                   | no — stripped for upload |

One source, two consumption forms. The zip is **generated, never hand-kept** —
so "two assets" is not duplicate work.

## `pack(selection, target)`

Not `pack(engine, target)`. **The unit is a selection**, because "deploy to
Claude" is a _configurator_: scan everything available → pick a subset → compose
into one platform bundle. A single engine ("raw") is the degenerate case.

- **Scan** — generalize `loadEngines()` to discover engines + cultures (+ …) by manifest.
- **Select** — `{ engines: [...], cultures: [...] }`.
- **Compose** — `pack(selection, target)` merges content, wraps it in the
  target **Stack** (the **S of HACKS**, owned by `khai-arch`), strips YAML,
  flattens links → one bundle.

Bundle shape (the Cultures `build_zips.py` concept, manifest-driven):

```
<name>-<target>.zip
├── README.md       ← root: the target's deploy + staging instructions (from the Stack)
├── REFERENCES.md   ← root: the warrant (same one the book renders)
├── LICENSE
└── content/        ← just the needed files, frontmatter STRIPPED, links flattened
```

## The PLAY file drives it

The selection is declared by a **PLAY file** — already a canon citizen (the
theatrical idiom: play / plot / cast / stage). **Playbook : PLAY :: grammar :
sentence** — the Playbook is the canon spec; a PLAY is a _production_, a named,
version-pinned cast of engines + cultures.

```
khai-deploy <PLAY> --target=claude   # "stage this production, in Claude's idiom"
```

- **Target is orthogonal**: one PLAY → claude _and_ copilot _and_ gemini.
  PLAY = _what_; target = _idiom_.
- A PLAY is to a composition what `package-lock` is to deps: a reproducible
  manifest of a setup.
- The **configurator** is just a PLAY-authoring surface (website browser-side
  and/or CLI): tick components → emit a PLAY.
- A single **Enginebook download** is the degenerate PLAY (one engine), so it
  uses the exact same machinery.

## PLAY's dual life — and why the strip is a _compile_

A PLAY lives twice:

- **build-time** — `khai-deploy` composes the bundle from it.
- **runtime** — the deployed LLM is invoked **`stage Play_5`** and enacts it.

So stripping the YAML is **not deletion, it is compilation**. The packer:

1. reads the PLAY YAML to resolve the cast (build-time),
2. strips YAML from the _content_ files (yaml-free upload),
3. **promotes** the PLAY/staging keys **into the Stack's runtime instructions**,
   so the deployed assistant knows the `stage <play>` verb and its cast.

`khai-deploy` is therefore a **compiler: PLAY (declarative YAML) → a bundle the
LLM can stage (instructions + clean content)**. The Stack (S) is literally what
_stages_ the play.

## One `pack()` core, four surfaces

- **per-engine zip** — `pack([engine], target)`, run at website build / release CI.
- **the configurator** — website page; `pack(selection, target)` runs
  **in the browser** (JSZip over content bundled at build) → downloads.
  Fits the static cPanel host: no backend.
- **CLI** — `npm run deploy -- claude`.
- **release CI** — canonical bundles attached to the GitHub release.

Same core compiled for node + browser.

### Why this beats "link to the release zip"

The earlier plan (link to `releases/latest/download/<engine>.zip`) has two
problems we already hit: GitHub-release **access** (the staging 403s) and
**version skew** (installed package newer than "latest release"). Serving zips
the **website builds from the installed package** keeps the download in lockstep
with what's rendered. Release-attach stays a secondary off-site path, not the
dependency. **Nothing zip-shaped ships inside the npm tarball** (keep it lean).

## compose() lives in the canon

When 3 engines + 5 cultures combine, what governs order / dependencies /
conflicts? That is **canon** — it belongs in `khai-arch` next to the Stack,
because only the canon knows how its pieces compose. The reference warrant's
**`Limits → delegates to`** edges (e.g. gender's _"intersectionality → Cultures"_)
**are** the composition graph — authoring the reference and authoring
`compose()` are the same act.

## Locked

1. `khai-arch` owns the **Stack** (S of HACKS) + `pack()` + `compose()`.
   `khai-deploy` is a thin bin exposing `npm run deploy <target>`.
2. **npm = source, zip = derived** (yaml-free, root + `content/` split, links flattened).
3. Zips are **website-built-and-served (primary)** + **release-attached (secondary)**;
   none stored in npm.
4. PLAY is **version-pinned** (reproducible).

## Open questions

1. **Repertoire vs single** — does a bundle carry one PLAY or many
   (`Play_1…Play_N`) that the LLM stages among? (`stage Play_5` implies several.)
   _Load-bearing for the Stack template._
2. **PLAY file format + schema** — extend the _existing_ canon PLAY; confirm its
   current shape in khai before redefining. Likely `.play.md` (frontmatter +
   prose) with `name` + `cast: { engines:[…@ver], cultures:[…] }`.
3. **Stack template per target** — which YAML keys are "compile-to-instructions"
   vs "drop"? The Stack is a template the packer fills from the PLAY.
4. **Configurator surface** — website (browser-side `pack`) and/or CLI.

## Next artifact

A single khai-arch design note: **PLAY (existing) → `compose()` →
Stack-as-staging-template → `khai-deploy` compiler**, drafted _on top of_ the
current canon PLAY definition (needs khai repo access).

# Enginebooks

An **Enginebook** is the rendered field-manual for one khai engine: the same
book chassis as the canon Playbook, but with its spine driven by the engine's
own `khai` manifest instead of the canon's `model.md`. The **Enginebooks**
collection is the shelf above them.

Where the Playbook renders the canon (static types), an Enginebook renders an
_extension_ -- and treats it as a shippable **product**, not just a spec: its
warrant, its parts, its terms, and a way to take it home.

## Why a separate name

The Playbook lives inside the canon's theatrical idiom (play, plot, cast,
company, stage). An engine is explicitly _not_ canon: it is "what comes through
the seam," and it already speaks a different register (the **WIRES** card is
electrical, not theatrical). Giving the engine's manual its own name signals the
boundary:

```
Playbook   : canon
Enginebook : extension
```

The name is also the route. `engines` is already a canon type (`engines.md`), so
the canon owns `/engines`; the books live at `/enginebooks` (see Routes).

## Routes

| Path                     | Is                               | Page brand                |
| ------------------------ | -------------------------------- | ------------------------- |
| `/architecture`          | canon index                      | Architecture              |
| `/architecture/playbook` | the one canon Playbook           | Playbook                  |
| `/architecture/<slug>`   | one canon type (incl. `engines`) | (type name)               |
| `/enginebooks`           | the shelf (card/engine)          | **Enginebooks**           |
| `/enginebooks/<name>`    | one engine's book                | **`<Name>` · Enginebook** |

`/enginebooks/` renders `src/pages/architecture/enginebooks/index.astro`;
`/enginebooks/<name>/` renders `src/pages/architecture/enginebooks/[engine]/index.astro`.
(Source sits under `src/pages/architecture/` because only `dist/architecture/`
deploys to the subdomain, so these serve at `/enginebooks` beside `/playbook`.)

Rationale for `/enginebooks` (not `/engines`):

- **`engines` is taken by the canon.** It is a first-class type (`engines.md`),
  rendered as a spec page at `/engines` by `architecture/[slug].astro`. The shelf
  cannot live there without shadowing that page. So `/engines` is the canon type;
  `/enginebooks` is the installed books -- two distinct things, two paths.
- **Shelf and members share one root.** `/enginebooks` and `/enginebooks/<name>`
  keep the collection and its members together.
- **The brand carries.** `Enginebooks` (shelf) and `Enginebook` (book) name the
  pages, and the route matches the brand.

## The shelf: `/enginebooks`

A collection page that lists one **WIRES card per installed engine**, each
linking into its Enginebook. This is nearly free: `loadEngines()`
(`src/lib/load-engines.ts`) already discovers every installed
`@chbrain/khai-engine-*` and projects each manifest into a render-ready card via
the canon's `engineCard()`. The canon Playbook already uses it for its
"enriched by" group.

Today the shelf shows exactly one spine (`gender`). It grows to N untouched, in
the alphabetical order `loadEngines()` already guarantees.

## One Enginebook: `/enginebooks/<name>`

The spine is derived from the engine's `khai` manifest (`package.json`). The
default shape for a position-type engine, in order:

```
cover      <name> + tagline               (manifest.tagline)
wiring     the WIRES card                  (engineCard(manifest))
anchor     manifest.anchor                 (one spread)
<expr>     manifest.expressions[*]         (one spread each)
```

Worked example, `gender`:

| Spread | Source                 | Renders as                                      |
| ------ | ---------------------- | ----------------------------------------------- |
| cover  | `khai.tagline`         | title page                                      |
| wiring | `engineCard(manifest)` | WIRE / ISSUE / REQUIRE / ENFORCE / SETUP facets |
| anchor | `position_gender.md`   | HOLD facets                                     |
| male   | `position_male.md`     | HOLD facets                                     |
| female | `position_female.md`   | HOLD facets                                     |

~5 spreads. Linear, snap-scrolling, identical chassis to the Playbook.

### Why an Enginebook is its own artifact (not a second Playbook)

The Playbook is a spec; an engine is a shippable **product**. The Enginebook is
the product page: it carries the engine's warrant (reference), its parts
(content), its terms (license), and a way to take it home (download) -- none of
which a canon type page has. That product shape, not any single spread, is what
distinguishes it.

(The v1 ship included a generated `composed` spread -- the anchor and one
expression concatenated. It is **dropped**: it only re-shows bytes already on
the anchor/expression spreads, and the download is the real take-home assembly.
See "Deliberately dropped" below.)

## What it reuses

| Piece                         | From                                                      | New?        |
| ----------------------------- | --------------------------------------------------------- | ----------- |
| spread/cover/TOC/snap chassis | `architecture/playbook/index.astro`                       | reuse       |
| chapter -> facet parsing      | `parseSpec` (`src/lib/parse-spec.ts`)                     | reuse       |
| WIRES card                    | `engineCard()` (`@chbrain/khai-arch`)                     | reuse       |
| engine discovery              | `loadEngines()` (`src/lib/load-engines.ts`)               | reuse       |
| compose view                  | engine's `compose()`                                      | reuse       |
| `/enginebooks` shelf          | `src/pages/architecture/enginebooks/index.astro`          | new (small) |
| `/enginebooks/<name>` book    | `src/pages/architecture/enginebooks/[engine]/index.astro` | new (small) |

Engine content files (`position_male.md`, etc.) already carry frontmatter and
canon chapters, so they parse and render through the existing facet path with no
new rendering logic.

## Wiring back to the Playbook

In the canon Playbook the engine already appears as one WIRES card in the
"enriched by" group. That card becomes the **click-through** into the full
Enginebook. Card = teaser; Enginebook = deep dive. Because everything is
manifest-derived, a new engine gets a shelf entry, a card, and a full Enginebook
with no per-engine page authoring.

## Source of truth

The engine's `khai` manifest owns the spine (anchor + expression order). The
renderer never restates the order or grouping, exactly as the Playbook never
restates `model.md`. An engine that later needs custom grouping can declare an
optional `playbook:` block in its manifest; until then the default
`wiring -> anchor -> expressions` shape is derived generically.

## Scope (deliberate)

- **khai engines only.** The set is whatever `@chbrain/khai-engine-*` is
  installed. Today that is exactly `gender`; the package _is_ the engine.
- **Linear book.** No grouping, search, or map. Gender is ~6 spreads.
- **Cultures is out of scope here.** A ~198-expression engine would break the
  linear book and wants a grouped/searchable catalog (the existing
  `cultures.kaihacks.ai/map` is that surface). When Cultures becomes an engine,
  the catalog shape reuses the same facet renderer with different navigation;
  that is a separate design, not this one.

## v2 direction (next)

v1 ships the content book (cover, wiring, anchor, expressions). v2
turns the Enginebook into the engine's **product page**: the Playbook is a spec,
an engine is a shippable product, so it gains what products have -- a warrant, a
license, and a way to take it home. Three moves, in priority order.

### 1. Reference as warrant (the keystone, and a khai-canon change)

The reference is not back-matter; it is **the justification for the engine to
exist**, and it belongs near the front, framing the content. Gender's
`REFERENCES.md` already proves the shape: it carries the grounding (Risman,
West & Zimmerman, Manne, Connell, Bourdieu), a source -> constraint mapping per
file, and -- the load-bearing part -- the **limits**: what the engine refuses to
model and to whom it delegates (intersectionality -> Cultures). That refusal is
the intellectual honesty a reader trusts.

The move is **less is more, driven into khai**: today `REFERENCES.md` is rich
but sprawling. Give it canon discipline -- **predefined chapters** (a fixed
schema, no mnemonic: every engine's reference carries the same chapters in the
same order) authored in khai and projected like the WIRES card (`engineCard`).
Unlike a type's chapters, the reference is **not** squeezed onto one spread:
**one chapter, one snap** -- each predefined chapter is its own snap-scroll
panel, terse enough to need no scroll. "Less is more" applies per chapter, not
to the set.

The predefined chapters (no mnemonic; the canon fixes the set and order):

| Chapter     | Holds                                             |
| ----------- | ------------------------------------------------- |
| **Domain**  | what the engine models -- and what it isn't       |
| **Grounds** | the sources it rests on                           |
| **Limits**  | what it refuses to claim, and who it delegates to |
| **Mapping** | source -> constraint, per file                    |

**Mapping comes last on purpose**: it ties each source to a component file, so
it hands off directly into the content spreads (anchor, expressions) that
follow. The warrant ends pointing at the parts.

The authorship note collapses to a one-line coda on the last reference snap.
This is a **khai-canon change** (the fixed reference schema + its projector);
website only renders the snaps, the same dumb path the content uses.

### 2. Download as release link (no build step)

The back-cover spread is a CTA to the engine's GitHub **release** zip -- the
Cultures `releases/latest/download/<engine>.zip` pattern, release-based, derived
from the manifest's repo + version. No build-time zipping; the release is the
source of truth. This is what makes the Enginebook actionable: take the engine
home and drop it into a project.

### 3. License as colophon

The `license` field (`CC-BY-NC-4.0`) renders as a small colophon spread before
the back-cover, not a full page. Provenance (sources) lives in the warrant
(move 1), so license stays a one-line term, not a wall of text.

### Sequence (v2)

The warrant reorders the book so the engine is earned before its parts are
shown. The reference is not one spread but one snap per predefined chapter:

```
cover
-> reference: Domain -> Grounds -> Limits -> Mapping   (one chapter, one snap)
-> content: anchor -> expressions          (Mapping hands off straight to these)
-> wiring
-> colophon (license)
-> back-cover (download)
```

### Deliberately dropped

- **The `composed` spread.** v1 generated it (anchor + one expression,
  concatenated). It only re-shows bytes already on the anchor/expression
  spreads, and the download is the real take-home assembly. Dropping it removes
  a generated, derivative panel. (Code cleanup: remove the `composed` block from
  `[engine]/index.astro`, the `composed` builder from `load-engine-content.ts`,
  and its assertion from `enginebooks.test.ts`.)
- **No standalone README page.** The README is generated from the manifest, and
  the book already renders that manifest as the wiring (WIRES) spread; a README
  page would re-show it flatter. Link out to the package README on GitHub/npm
  instead.

### Where the work lives

The reference-as-warrant discipline is authored in **khai** (the canon owns the
shape and its projector, as it owns the WIRES card); the **website** renders the
new spread and adds the download/license spreads. The keystone is the khai
change -- which is the right home for "less is more."

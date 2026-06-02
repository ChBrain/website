# Enginebooks

An **Enginebook** is the rendered field-manual for one khai engine: the same
book chassis as the canon Playbook, but with its spine driven by the engine's
own `khai` manifest instead of the canon's `model.md`. The **Enginebooks**
collection is the shelf above them.

Where the Playbook renders the canon (static types), an Enginebook renders an
_extension_ and can show the one thing a type page never can: the engine's parts
**composed** into what a persona actually receives.

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

The name is also branding, not addressing. It belongs on the page and in the
megamenu, not in the URL (see Routes).

## Routes

The route names the _resource_ (the engine); "Enginebook" is how that resource
is _presented_. The brand does the pluralizing so the route can stay a stable
noun.

| Path                     | Is                      | Page brand                |
| ------------------------ | ----------------------- | ------------------------- |
| `/architecture`          | canon index             | Architecture              |
| `/architecture/playbook` | the one canon Playbook  | Playbook                  |
| `/architecture/<slug>`   | one canon type          | (type name)               |
| `/engines`               | the shelf (card/engine) | **Enginebooks**           |
| `/engines/<name>`        | one engine's book       | **`<Name>` · Enginebook** |

`/engines/` renders `src/pages/engines/index.astro` (a standard Astro index;
no literal `enginebooks/` directory). `/engines/<name>/` renders the per-engine
book from `src/pages/engines/[engine]/index.astro`.

Rationale for `engines` over `enginebooks` in the path:

- **URLs name resources, not render formats.** A future non-book view (raw
  manifest, references, a diff) hangs naturally off `/engines/<name>/...`;
  baking the format into the path forecloses that.
- **Clean collection/member shape.** `/engines` is the list, `/engines/<name>`
  is a member, paralleling `/architecture` -> `/architecture/<slug>`.
- **Singular/plural tell.** `playbook` is singular because the canon has one
  book; "enginebooks" would be plural with a singular member underneath
  (`/enginebooks/gender`), which is the slightly-off shape. `/engines/<name>`
  is the conventional plural-collection / singular-member form.

## The shelf: `/engines`

A collection page that lists one **WIRES card per installed engine**, each
linking into its Enginebook. This is nearly free: `loadEngines()`
(`src/lib/load-engines.ts`) already discovers every installed
`@chbrain/khai-engine-*` and projects each manifest into a render-ready card via
the canon's `engineCard()`. The canon Playbook already uses it for its
"enriched by" group.

Today the shelf shows exactly one spine (`gender`). It grows to N untouched, in
the alphabetical order `loadEngines()` already guarantees.

## One Enginebook: `/engines/<name>`

The spine is derived from the engine's `khai` manifest (`package.json`). The
default shape for a position-type engine, in order:

```
cover      <name> + tagline               (manifest.tagline)
wiring     the WIRES card                  (engineCard(manifest))
anchor     manifest.anchor                 (one spread)
<expr>     manifest.expressions[*]         (one spread each)
composed   compose({ expression })         (the assembled result)
```

Worked example, `gender`:

| Spread   | Source                    | Renders as                                       |
| -------- | ------------------------- | ------------------------------------------------ |
| cover    | `khai.tagline`            | title page                                       |
| wiring   | `engineCard(manifest)`    | WIRE / ISSUE / REQUIRE / ENFORCE / SETUP facets  |
| anchor   | `position_gender.md`      | HOLD facets                                      |
| male     | `position_male.md`        | HOLD facets                                      |
| female   | `position_female.md`      | HOLD facets                                      |
| composed | `compose({ expression })` | the anchor + expression a persona actually holds |

~6 spreads. Linear, snap-scrolling, identical chassis to the Playbook.

### The composed spread is the point

The canon Playbook renders types in isolation. An Enginebook can call the
engine's own `compose()` (gender's `index.mjs` exports it) to show the anchor
and a chosen expression **assembled into the instruction set a persona
receives**. That is the thing a type page can never do, and it is what an engine
exists to produce. This single spread is the argument for "Enginebook" being its
own artifact rather than a second copy of Playbook.

## What it reuses

| Piece                          | From                                        | New?        |
| ------------------------------ | ------------------------------------------- | ----------- |
| spread/cover/TOC/snap chassis  | `architecture/playbook/index.astro`         | reuse       |
| chapter -> facet parsing       | `parseSpec` (`src/lib/parse-spec.ts`)       | reuse       |
| WIRES card                     | `engineCard()` (`@chbrain/khai-arch`)       | reuse       |
| engine discovery               | `loadEngines()` (`src/lib/load-engines.ts`) | reuse       |
| compose view                   | engine's `compose()`                        | reuse       |
| `/engines` shelf               | `src/pages/engines/index.astro`             | new (small) |
| `/engines/<name>` book + spine | `src/pages/engines/[engine]/index.astro`    | new (small) |

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
`wiring -> anchor -> expressions -> composed` shape is derived generically.

## Scope (deliberate)

- **khai engines only.** The set is whatever `@chbrain/khai-engine-*` is
  installed. Today that is exactly `gender`; the package _is_ the engine.
- **Linear book.** No grouping, search, or map. Gender is ~6 spreads.
- **Cultures is out of scope here.** A ~198-expression engine would break the
  linear book and wants a grouped/searchable catalog (the existing
  `cultures.kaihacks.ai/map` is that surface). When Cultures becomes an engine,
  the catalog shape reuses the same facet renderer with different navigation;
  that is a separate design, not this one.

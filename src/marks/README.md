# khai marks · corrected set

Corrected, internally consistent mark family for **KAI HACKS AI**. Every colour shares one
geometry. Drop-in replacements for the files in `cvi/assets/marks/`, plus new monogram and
app-icon variants.

Brand voice note: this document follows the house punctuation rule. No em dashes; commas,
semicolons, colons, and parentheses carry the work. En dash only for numeric ranges.

---

## 1 · The geometry (do not change)

The lockup is live Newsreader text at `font-weight: 540`, `font-size: 280`, in
`viewBox="-34 -34 300 660"`. The **top of the lockup shows the dot alone**: ink `k`, ghost
`h` behind, then the coloured dot. The dot is positioned where the top `i`'s tittle sits.

The top `i` (`&#x131;`, dotless) is kept in the source **only as a transparent positioning
guide** (`fill="none"`); its stem is never drawn. This is the key rule: use the `i` to place
the dot, do not show the `i`.

| Element | Value | Drawn? |
|---|---|---|
| ghost `h` | `x=60  y=280` | yes |
| ink `k` | `x=0   y=280` | yes |
| top `i` (`&#x131;`) | `x=149.4  y=280`, `fill="none"` | **no (guide only)** |
| dot (the tittle) | `cx=189.4  cy=93.5  r=21` | yes |
| rule | `x=0  y=330  w=232.6  h=12.6  rx=6.3` | yes |
| `a` | `x=0      y=592.2` | yes |
| `i` | `x=149.4  y=592.2` | yes |

## 2 · Palette (CVI, unchanged)

`ink #16130f` · `ghost #c9bea7` · `brick #8d3a2c` · `sea #3a4a52` · `amber #c98e36` · `paper #f3ede2` · `paperWarm #fbf7ee`

The dot carries the accent; letters stay ink (or paper, reversed).

## 3 · File inventory

**Full lockup** (live Newsreader text; needs the font present, e.g. installed or via @font-face):
- `khai-mark.svg` · primary, brick dot
- `khai-mark-sea.svg` · sea dot (structure, product, infra)
- `khai-mark-amber.svg` · amber dot (warm emphasis)
- `khai-mark-ink.svg` · ink dot (mono / single-tone)
- `khai-mark-reverse.svg` · paper letters, ghost at 34% alpha, brick dot (dark grounds)

**Short kh monogram** (the lockup head, cropped: identical live Newsreader `k` + ghost `h` + transparent positioning `i` + the same `r=21` dot; rule and `ai` removed; `viewBox="-18 52 268 246"`):
- `khai-monogram.svg` (+ `-sea`, `-amber`, `-ink`, `-reverse`)

**App-icon tile** (rounded, the most-used touchpoint; outlined `kh` so it stays font-independent at favicon sizes, same `r=21` dot):
- `khai-icon.svg` · paper tile, brick dot (default favicon / app icon)
- `khai-icon-sea.svg`, `khai-icon-amber.svg` · paper tile, alt dot
- `khai-icon-reverse.svg` · ink tile, paper letters, **brick dot** (dark mode; matches the reverse lockup)

**Raster icons** (baked from the corrected `khai-icon.svg`; these are the files the site actually loads):
- `favicon.ico` · multi-res 16 / 32 / 48, PNG-embedded
- `apple-touch-icon.png` · 180x180, opaque paper (no alpha, so iOS rounds it cleanly)
- `icon-192.png`, `icon-512.png` · transparent rounded tile (webmanifest)
- `favicon-16.png`, `favicon-32.png` · individual PNG fallbacks

### Tile-design decision (confirm if you disagree)
The icon tile is **flat paper `#f3ede2`, no border**, matching the live `cvi/assets/favicon.svg`.
An earlier draft used `paperWarm #fbf7ee` plus a hairline ghost border; that was dropped for
consistency with the existing favicon. Say the word to switch back to the warmer treatment
(the rasters would need re-baking from the changed SVG).

## 4 · What to change in the CVI (`cvi/KAI HACKS AI · CVI.html`)

The CVI is mostly already correct; this set aligns the standalone files to it.

Note on the dot: it is `r=21` at `cx=189.4 cy=93.5` in the 280-unit em space, everywhere.
The monogram is the lockup head cropped at the same scale, so the dot is identical in both;
do not resize it per file.

### 4a. `logo()` generator: no change needed
It already renders the dot alone (no `i` stem). Leave it. (Optional: you may add a
transparent guide line `<text x="149.4" y="280" font-size="280" fill="none">&#x131;</text>`
right after the `k` line, purely to document where the dot comes from. It draws nothing.)

### 4b. Misuse rule: keep it
The existing "Don't" line is correct and should stay:
> ✕ Don't restore the top i's stem on the lockup; the dot stands alone.

### 4c. Fix one standalone file
`cvi/assets/marks/khai-mark.svg` (the primary) had a stray **visible** top `i` stem. Replace
it with `khai-mark.svg` from this set (dot-only top). The `-sea`, `-amber`, `-ink`, and
`-reverse` files were already dot-only; the versions here are identical in geometry, so
replacing them is optional but keeps the folder uniform.

### 4d. Register the new monogram and icon variants
The CVI icon section (06) currently shows only `favicon.svg`. The `kh` monogram now has a
full colour family (`khai-monogram-*.svg`) and tinted tiles (`khai-icon-*.svg`). Add them to
the icon section if you want the variants documented.

### 4e. Replace the four site raster icons
`BaseLayout` and `site.webmanifest` load `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`,
and `icon-512.png`. The current ones are the old tile. Replace all four with the versions in
this set (baked from the corrected `khai-icon.svg`). No markup changes needed; the filenames
match. If iOS ever shows dark corners on the apple-touch icon, it is already opaque here, so
no action is needed.

## 5 · The reduction rule (unchanged)

Full lockup holds as a square avatar to about 96px (LinkedIn uses 300px). Below roughly
28px, reduce to the `kh` monogram tile (`khai-icon.svg`), which holds to a 16px favicon.

## 6 · On the outlined lockup (optional, off-site only)

Newsreader is self-hosted in the site (`@fontsource-variable/newsreader`, imported in
`BaseLayout`), so the live-text lockup renders correctly on every on-site surface; **no
outlined version is needed for the website.** An `@font-face` does not travel with a
downloaded `.svg`, so the `khai-mark*.svg` files still fall back to Georgia if opened or
uploaded off-site (LinkedIn, social, third-party tools). Request a path-outlined lockup only
if you need those off-site uses. A 300px LinkedIn avatar PNG and larger lockup rasters
(256 / 1024) are likewise available on request.

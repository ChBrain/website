---
language: en
---

# kaihacks website

The rendered surface for the kaihacks system. Source for
[architecture.kaihacks.ai](https://architecture.kaihacks.ai) and surrounding pages.

Built with [Astro](https://astro.build).

## Develop

```bash
npm install
npm run dev     # local dev server
npm run build   # static build into dist/
npm test        # build + run baseline gates
```

## Architecture content

The `/architecture/` routes render the spec files published in
[`@chbrain/khai-arch`](https://github.com/chbrain/khai). That content is
licensed under [CC-BY-NC-SA-4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/);
this website's source code is [MIT](LICENSE).

## Baseline gates

Every PR runs:

- `build` — Astro builds without error
- `em-dash` — no U+2014 anywhere in built HTML
- `a11y` — axe-core finds no serious or critical violations
- `links` — every internal relative link resolves to a built file

Renderer-specific gates (snapshot regression, character-introduction, chrome
assertions) are added in `mvp/web-2-renderer`.

---
khai: order
title: "Align Engine ZIP layouts"
license: CC-BY-NC-SA-4.0
stamp:
  owner: "Choregos (Nicias and Pericles)"
  version: v1.0.0
  date: "2026-06-07"
---

# Order: Align Engine ZIP layouts

## Direction

The download ZIPs generated for engines (e.g., `gender`) should be structured consistently with play ZIPs (e.g., `woyzeck`). Currently, engine ZIPs put all files at the root level and lack standard licensing metadata, while play ZIPs place content files under `content/` and include `LICENSE`/`LICENSE-CODE` at the root. We must align them to ensure high-quality and consistent distribution packaging.

## Orders

1. **Lessing (Literary Manager)**: Refactor `buildEngineDownloads` inside `scripts/build-downloads.mjs` of the website repository.
2. Ensure the generated ZIP contains `package.json`, `README.md`, `REFERENCES.md`, `LICENSE`, and `LICENSE-CODE` at the root (`overhead`).
3. Ensure all engine content files (e.g., `position_*.md`, `process_*.md`) are packed in a nested `content/` directory.
4. Resolve `LICENSE` and `LICENSE-CODE` from the `@chbrain/khai-arch` package installed in `node_modules`.

## Implementation

- File to modify: [build-downloads.mjs](file:///c:/Code/website/scripts/build-downloads.mjs)
- Build command to run and test: `npm run prebuild` in the `website` repository.

## Targets

- [x] `website/scripts/build-downloads.mjs` refactored to align engine ZIP layout.
- [x] `LICENSE` and `LICENSE-CODE` resolved dynamically from `@chbrain/khai-arch` and packed in the engine ZIP overhead.
- [x] All engine content markdown files packed under `content/` in the engine ZIP.
- [x] ZIP generation verified locally via `npm run prebuild` with correct zip contents for `gender`.
- [ ] Pull request opened with the changes on `website`.

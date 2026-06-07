import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://architecture.kaihacks.ai",
  build: {
    format: "directory",
    assets: "_assets",
    // Inline all CSS into the HTML head. Avoids a stray `/_assets/*.css`
    // 404 when the page is served from the architecture/ subdirectory and
    // the deploy rsync ships only `dist/architecture/` (not `dist/_assets/`).
    // For this site the inline overhead is negligible.
    inlineStylesheets: "always",
  },
  trailingSlash: "always",
  compressHTML: false,
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
    ssr: {
      external: [
        "@chbrain/khai-arch",
        "@chbrain/khai-plays",
        "@chbrain/khai-plays-buechner",
        "@chbrain/khai-plays-grimm",
      ],
    },
  },
});

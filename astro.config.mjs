import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://architecture.kaihacks.ai",
  build: {
    format: "directory",
    assets: "_assets",
  },
  trailingSlash: "always",
  compressHTML: false,
});

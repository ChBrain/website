import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateProjectLanguages } from "@chbrain/khai-language";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The website is an English-language house. Language policy is inherited by any
// content files via the resolution chain: file > play > house README > default.
describe("website house: language policy", () => {
  it("all content satisfies the declared house language (en)", () => {
    const results = validateProjectLanguages(root);
    const errors = results.flatMap((r) => r.errors.map((e) => `${r.file}: ${e}`));
    expect(errors).toEqual([]);
  });
});

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
// The canon owns the WIRES shape; we never restate it here.
// @ts-expect-error -- the canon export is plain ESM (no .d.ts).
import { engineCard } from "@chbrain/khai-arch";

export interface EngineCard {
  id: string;
  type: string | null;
  anchor: string | null;
  mnemonic: string;
  chapters: string[];
  sections: Record<string, string>;
}

/**
 * Discover the installed engines and project each into a WIRES card.
 *
 * Engines are extensions, not canon: the canon (model.md) never names them, so
 * we find them by scanning node_modules for `@chbrain/khai-engine-*` and read
 * each one's `khai` manifest. The canon's `engineCard` validates the manifest
 * and returns the render-ready card (Wire, Issue, Require, Enforce, Setup).
 *
 * Returned alphabetically by id, so the playbook's "enriched by" group renders
 * deterministically regardless of install order.
 */
export function loadEngines(root: string = process.cwd()): EngineCard[] {
  const scope = join(root, "node_modules", "@chbrain");
  if (!existsSync(scope)) return [];

  const cards: EngineCard[] = [];
  for (const name of readdirSync(scope)) {
    if (!name.startsWith("khai-engine-")) continue;
    const pkgPath = join(scope, name, "package.json");
    if (!existsSync(pkgPath)) continue;
    const manifest = JSON.parse(readFileSync(pkgPath, "utf8")).khai;
    if (!manifest) continue;
    // engineCard throws on an invalid card -- a bad engine should fail the
    // build loudly rather than render a half card.
    cards.push(engineCard(manifest) as EngineCard);
  }
  return cards.sort((a, b) => a.id.localeCompare(b.id));
}

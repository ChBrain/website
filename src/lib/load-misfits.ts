// The misfits house, read the same way as a khai-plays house. khai-misfits is a
// single published package (@chbrain/khai-misfits) — a house that IS its own
// bill, not one card in the khai-plays registry. So there is no loadRegistry()
// here: the collection is the one package, resolved directly and parsed by the
// shared loadCollection() the plays surface uses.
//
// A misfit is a khai play staged as a misfit, so its on-disk grammar is a play's
// (play_*.md + persona_/position_/piece_/place_/plan_/plot_/process_/pitch_
// elements). Two names differ from a plays house and are absorbed by
// MISFITS_COLLECTION below: the productions live in `misfits/` (registry key
// `misfits`), and the research warrant is `REFERENCE.md` (singular).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCollection, getPackageDir, type CollectionOptions, type Play } from "./load-plays";

const MISFITS_PACKAGE = "@chbrain/khai-misfits";

/** The misfits house identity. Single-collection, so its id doubles as the
 *  houseId the book/stage/search carry; the surface root IS the shelf, so this
 *  id never appears in a URL (misfits live at /misfits/<misfit>/). */
export const MISFITS_HOUSE = { id: "misfits", title: "Misfits" };

const MISFITS_COLLECTION: CollectionOptions = {
  dir: "misfits",
  registryKey: "misfits",
  // A misfit's warrant is REFERENCE.md; accept the plural too so a house that
  // adopts the plays spelling still reads.
  referenceNames: ["REFERENCE.md", "REFERENCES.md"],
};

/** The house blurb + repo, read from the installed package's metadata (the
 *  `khai.card.wire` line and the repository URL). Falls back gracefully when the
 *  package is absent (CI without the registry token), matching the loaders. */
export function misfitsHouse(): { id: string; title: string; blurb: string; repo: string } {
  const fallback = {
    ...MISFITS_HOUSE,
    blurb: "The Misfits production house: a collection of khai plays staged as misfits.",
    repo: "https://github.com/ChBrain/khai-misfits",
  };
  const pkgDir = getPackageDir(MISFITS_PACKAGE);
  if (!pkgDir) return fallback;
  try {
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
    const repoUrl: string = pkg.repository?.url || pkg.repository || fallback.repo;
    const repo = repoUrl
      .replace(/^git\+/, "")
      .replace(/\.git$/, "")
      .replace(/^git:\/\//, "https://");
    const blurb = pkg.khai?.card?.wire || fallback.blurb;
    return { ...MISFITS_HOUSE, blurb, repo };
  } catch {
    return fallback;
  }
}

/** Every misfit in the installed package, as Play objects (a misfit IS a play).
 *  Empty when the package is not installed, so the build degrades cleanly. */
export function loadAllMisfits(): Play[] {
  const pkgDir = getPackageDir(MISFITS_PACKAGE);
  if (!pkgDir) {
    console.log(`Misfits package ${MISFITS_PACKAGE} is not installed; skipping.`);
    return [];
  }
  return loadCollection(pkgDir, MISFITS_HOUSE, MISFITS_COLLECTION);
}

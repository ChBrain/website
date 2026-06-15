// Assign each built page to a test group so the a11y suite can run one group per
// process and stay within memory as houses grow. The split is:
//   - by domain: "architecture", the site shell ("site"), and "plays";
//   - within plays, by house ("plays-grimm", "plays-kleist", ...);
//   - and a large house is batched into numbered sub-groups of at most
//     MAX_PLAYS_PER_BATCH plays ("plays-grimm-1", "plays-grimm-2", ...), so each
//     group holds a bounded number of plays however large the house grows.
//
// Shared by the per-group test file (tests/a11y/group.test.ts) and the runner
// (scripts/khai-tests.mjs) so the assignment is defined once and is identical on
// both sides. Plain .mjs so the Node runner imports it without a TS loader.

export const MAX_PLAYS_PER_BATCH = 50;

/** Parse a dist-relative page path into its domain and (for plays) house/play.
 * @param {string} path e.g. "plays/grimm/012_rapunzel/index.html"
 * @returns {{domain:string, house?:string, play?:string|null}} */
function parse(path) {
  if (path.startsWith("plays/")) {
    const rest = path.slice("plays/".length).split("/");
    const seg = rest[0];
    if (seg.endsWith(".html")) return { domain: "plays" }; // plays/index.html (the plays core)
    const next = rest[1];
    // A play is a directory under the house; a house-level page (e.g.
    // plays/grimm/index.html) has no play dir and rides its house's first batch.
    const play = next && !next.endsWith(".html") ? next : null;
    return { domain: "plays", house: seg, play };
  }
  if (path.startsWith("architecture/")) return { domain: "architecture" };
  return { domain: "site" }; // index.html, main/**, and any other top-level surface
}

const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });

/**
 * Build a deterministic path -> group assignment from the full page list.
 * @param {string[]} paths dist-relative page paths
 * @param {{maxPlaysPerBatch?:number}} [opts]
 * @returns {{ groups: string[], map: Map<string,string>, groupOf: (p:string)=>string }}
 */
export function assignGroups(paths, { maxPlaysPerBatch = MAX_PLAYS_PER_BATCH } = {}) {
  // Number the plays per house (sorted) so batch boundaries are stable.
  const housePlays = new Map(); // house -> Set<play>
  for (const p of paths) {
    const { domain, house, play } = parse(p);
    if (domain === "plays" && house && play) {
      if (!housePlays.has(house)) housePlays.set(house, new Set());
      housePlays.get(house).add(play);
    }
  }
  const playBatch = new Map(); // `${house}/${play}` -> batch number
  const houseBatches = new Map(); // house -> number of batches
  for (const [house, set] of housePlays) {
    const plays = [...set].sort(natural);
    houseBatches.set(house, Math.max(1, Math.ceil(plays.length / maxPlaysPerBatch)));
    plays.forEach((play, i) =>
      playBatch.set(`${house}/${play}`, Math.floor(i / maxPlaysPerBatch) + 1),
    );
  }

  const groupOf = (p) => {
    const { domain, house, play } = parse(p);
    if (domain !== "plays" || !house) return domain; // architecture, site, plays (core)
    if ((houseBatches.get(house) ?? 1) <= 1) return `plays-${house}`;
    const batch = play ? (playBatch.get(`${house}/${play}`) ?? 1) : 1;
    return `plays-${house}-${batch}`;
  };

  const map = new Map(paths.map((p) => [p, groupOf(p)]));
  const groups = [...new Set(map.values())].sort(natural);
  return { groups, map, groupOf };
}

/** Human label for a group, e.g. "plays-grimm-2" -> "khai-tests plays grimm 2".
 * @param {string} group */
export function groupLabel(group) {
  return "khai-tests " + group.replace(/-/g, " ");
}

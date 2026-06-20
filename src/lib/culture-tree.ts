// culture-tree: the cultures manifest -> a drill-down tree.
//
// A pure transform with no I/O, so it unit-tests in isolation and runs the
// same in the page build and in tests. It owns *structure* only; the website
// owns names/CVI and supplies hrefs/sizes — and, for synthesised or unnamed
// nodes, display names/regions — through the injected hooks.
//
// Anchoring is iso-only: each culture carries an ISO code — a country
// (ISO 3166-1 alpha-2, e.g. "DE") or a subdivision (ISO 3166-2, e.g. "DE-BY").
// The country a subdivision belongs to is *derived from the code* ("DE-BY" ->
// "DE"); an explicit `parent` overrides that for any deeper nesting the
// standard cannot express. The tree mirrors that containment:
//   • leaf   = an asset, no children            -> the map downloads it
//   • branch = has children                     -> the map drills into it
//   • both   = a branch that also has an asset  -> drills, surfacing its own
//              package inside its page (the "1a" mixed node)
//
// A country referenced only by its subdivisions (no culture anchored at the
// country itself) is *synthesised* so the geography is never orphaned; its
// name/region come from the injected atlases, falling back to the ISO code.
// Entries with no `iso` are non-mappable (e.g. a constructed-language culture)
// and entries of kind "group" carry no geo: both are skipped here — they still
// list in downloads and stay group-referenceable elsewhere.

export interface CultureEntry {
  id: string;
  /** discriminator from the manifest; "group" entries are skipped (no geo) */
  kind?: "culture" | "group";
  /** ISO 3166-1 alpha-2 (country) or 3166-2 (subdivision); absent = non-mappable */
  iso?: string | null;
  /** display override; otherwise the ISO atlas (or the code) names the node */
  title?: string;
  /** the built download filename, when this culture has a package */
  asset?: string;
  /** packed size, when known */
  size?: string;
  /** explicit parent ISO; overrides the code-derived country for deep nesting */
  parent?: string | null;
}

export interface CultureAsset {
  /** download href — a full URLS.* URL, not an absolute path */
  href: string;
  /** packed size, when the sidecar is known */
  size?: string;
}

export interface CultureNode {
  /** ISO 3166-1 alpha-2 (country) or ISO 3166-2 (subdivision), upper-cased */
  iso: string;
  name: string;
  region: string;
  /** this node's own package, when a culture is anchored here */
  asset?: CultureAsset;
  children: CultureNode[];
  /** true if this node or any descendant has a package — drives colouring */
  hasAssets: boolean;
}

export interface BuildOptions {
  /** download href for an entry's asset (a full URLS.* URL) */
  hrefFor: (entry: CultureEntry) => string;
  /** packed size override; defaults to the entry's own `size` */
  sizeFor?: (entry: CultureEntry) => string | null | undefined;
  /** display name for a node (the ISO 3166 atlas); falls back to the code */
  nameFor?: (iso: string) => string | null | undefined;
  /** region key for a node (the UN M49 atlas) */
  regionFor?: (iso: string) => string | null | undefined;
}

const norm = (iso: string): string => iso.trim().toUpperCase();

/** The ISO 3166-1 country a 3166-2 code belongs to ("DE-BY" -> "DE"); null for a country code. */
function countryOf(iso: string): string | null {
  const i = iso.indexOf("-");
  return i > 0 ? iso.slice(0, i) : null;
}

/**
 * Build the drill-down forest (top-level countries) from the manifest entries.
 * Children are sorted by display name for stable, deterministic output.
 */
export function buildCultureTree(entries: CultureEntry[], opts: BuildOptions): CultureNode[] {
  const nodes = new Map<string, CultureNode>();

  const ensure = (iso: string): CultureNode => {
    const key = norm(iso);
    let node = nodes.get(key);
    if (!node) {
      node = {
        iso: key,
        name: opts.nameFor?.(key) ?? key,
        region: opts.regionFor?.(key) ?? "",
        children: [],
        hasAssets: false,
      };
      nodes.set(key, node);
    }
    return node;
  };

  // Mappable cultures only: a group has no geo, a non-mappable culture no iso.
  const mappable = entries.filter(
    (e): e is CultureEntry & { iso: string } =>
      e.kind !== "group" && typeof e.iso === "string" && e.iso.trim() !== "",
  );

  // 1. A node per anchored culture, carrying its name + its own asset.
  for (const entry of mappable) {
    const node = ensure(entry.iso);
    node.name = entry.title ?? opts.nameFor?.(node.iso) ?? node.iso;
    if (entry.asset) {
      const size = opts.sizeFor?.(entry) ?? entry.size ?? undefined;
      node.asset = { href: opts.hrefFor(entry), ...(size ? { size } : {}) };
    }
  }

  // 2. Link each node under its country (explicit parent, else derived from the
  //    ISO code, synthesising the country node if no culture anchors it). A
  //    node never linked as a child is a root.
  const childIsos = new Set<string>();
  for (const entry of mappable) {
    const key = norm(entry.iso);
    const parentIso = entry.parent ? norm(entry.parent) : countryOf(key);
    if (parentIso && parentIso !== key) {
      ensure(parentIso).children.push(nodes.get(key)!);
      childIsos.add(key);
    }
  }

  const roots: CultureNode[] = [];
  for (const node of nodes.values()) {
    if (!childIsos.has(node.iso)) roots.push(node);
  }

  // 3. Stable order, then roll up availability from the leaves.
  sortTree(roots);
  for (const root of roots) computeHasAssets(root, new Set());

  return roots;
}

function sortTree(nodes: CultureNode[]): void {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  for (const node of nodes) sortTree(node.children);
}

function computeHasAssets(node: CultureNode, seen: Set<CultureNode>): boolean {
  if (seen.has(node)) return node.hasAssets;
  seen.add(node);
  let has = node.asset !== undefined;
  for (const child of node.children) {
    if (computeHasAssets(child, seen)) has = true;
  }
  node.hasAssets = has;
  return has;
}

/**
 * Resolve a node by its path of ISO codes from a root (e.g. ["DE", "DE-BY"]).
 * Case-insensitive. Returns null if any segment is missing.
 */
export function nodeByPath(roots: CultureNode[], path: string[]): CultureNode | null {
  let level = roots;
  let found: CultureNode | null = null;
  for (const segment of path) {
    const key = norm(segment);
    found = level.find((n) => n.iso === key) ?? null;
    if (!found) return null;
    level = found.children;
  }
  return found;
}

/**
 * Every branch node's path (a node with children), for the recursive route's
 * getStaticPaths. The world root (the empty path) is the route's own concern.
 */
export function branchPaths(roots: CultureNode[]): string[][] {
  const out: string[][] = [];
  const walk = (nodes: CultureNode[], prefix: string[]): void => {
    for (const node of nodes) {
      const here = [...prefix, node.iso];
      if (node.children.length > 0) {
        out.push(here);
        walk(node.children, here);
      }
    }
  };
  walk(roots, []);
  return out;
}

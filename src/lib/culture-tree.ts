// culture-tree: the flat cultures manifest -> a drill-down tree.
//
// A pure transform with no I/O, so it unit-tests in isolation and runs the
// same in the page build and in tests. It owns *structure* only; the website
// owns names/CVI and supplies hrefs/sizes (and, for synthesised nodes, display
// names) through the injected hooks.
//
// Anchoring: each culture sits at an ISO code (anchor.iso) — a country
// (ISO 3166-1 alpha-2, e.g. "DE") or a subdivision (ISO 3166-2, e.g. "DE-BY")
// — with `parent` pointing a subdivision at its country. The tree mirrors that
// containment:
//   • leaf   = an asset, no children            -> the map downloads it
//   • branch = has children                     -> the map drills into it
//   • both   = a branch that also has an asset  -> drills, and surfaces its own
//              package inside its page (the "1a" mixed node: a national pack
//              alongside its subdivisions)
//
// A country referenced only by its subdivisions (no culture anchored at the
// country itself) is *synthesised* so the geography is never orphaned; its
// display name/region come from the injected `nameFor`/`regionFor`, falling
// back to the ISO code. Synthesis is one level deep — a culture carries its own
// `parent`, but a purely synthesised node has none, so it is treated as a root.
// That covers the country -> subdivision case (Bundesländer, GB nations);
// deeper nesting needs the package to emit the intermediate culture.

export interface ManifestCulture {
  id: string;
  name: string;
  region: string;
  asset: string;
  anchor: { type: string; iso: string };
  parent?: string | null;
  state?: string | null;
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
  /** download href for a culture's asset (the zip) */
  hrefFor: (culture: ManifestCulture) => string;
  /** packed size for a culture's asset, when known */
  sizeFor?: (culture: ManifestCulture) => string | null | undefined;
  /** display name for a synthesised parent (no culture anchored there) */
  nameFor?: (iso: string) => string | null | undefined;
  /** region key for a synthesised parent */
  regionFor?: (iso: string) => string | null | undefined;
}

const norm = (iso: string): string => iso.trim().toUpperCase();

/**
 * Build the drill-down forest (top-level countries) from the flat manifest.
 * Children are sorted by display name for stable, deterministic output.
 */
export function buildCultureTree(
  cultures: ManifestCulture[],
  opts: BuildOptions,
): CultureNode[] {
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

  // 1. A node per anchored culture, carrying its facts + its own asset.
  for (const culture of cultures) {
    const node = ensure(culture.anchor.iso);
    node.name = culture.name;
    node.region = culture.region;
    const size = opts.sizeFor?.(culture) ?? undefined;
    node.asset = { href: opts.hrefFor(culture), ...(size ? { size } : {}) };
  }

  // 2. Link each culture's node under its parent (synthesising the parent if
  //    no culture is anchored there). A node that is never linked as a child
  //    is a root.
  const childIsos = new Set<string>();
  for (const culture of cultures) {
    const key = norm(culture.anchor.iso);
    const parentIso = culture.parent ? norm(culture.parent) : null;
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

import { describe, it, expect } from "vitest";
import {
  buildCultureTree,
  nodeByPath,
  branchPaths,
  type ManifestCulture,
} from "../src/lib/culture-tree";

// Minimal manifest factory: a country-anchored culture unless `parent` is set.
function culture(over: Partial<ManifestCulture> & { id: string; iso: string }): ManifestCulture {
  return {
    id: over.id,
    name: over.name ?? over.id,
    region: over.region ?? "",
    asset: over.asset ?? `${over.id}.zip`,
    anchor: { type: "region", iso: over.iso },
    parent: over.parent ?? null,
    state: over.state ?? null,
  };
}

const opts = {
  hrefFor: (c: ManifestCulture) => `https://cultures.example/downloads/cultures/${c.asset}`,
  sizeFor: () => "39.4 kB",
};

describe("buildCultureTree", () => {
  it("returns an empty forest for no cultures", () => {
    expect(buildCultureTree([], opts)).toEqual([]);
  });

  it("places a lone country culture as a leaf with an asset", () => {
    const roots = buildCultureTree([culture({ id: "germany", name: "Germany", iso: "DE" })], opts);
    expect(roots).toHaveLength(1);
    const de = roots[0];
    expect(de.iso).toBe("DE");
    expect(de.name).toBe("Germany");
    expect(de.children).toEqual([]);
    expect(de.hasAssets).toBe(true);
    expect(de.asset).toEqual({
      href: "https://cultures.example/downloads/cultures/germany.zip",
      size: "39.4 kB",
    });
    expect(branchPaths(roots)).toEqual([]);
  });

  it("nests subdivisions under their country (1a: national pack + children)", () => {
    const roots = buildCultureTree(
      [
        culture({ id: "germany", name: "Germany", iso: "DE" }),
        culture({ id: "bavaria", name: "Bavaria", iso: "DE-BY", parent: "DE" }),
        culture({ id: "bw", name: "Baden-Württemberg", iso: "DE-BW", parent: "DE" }),
      ],
      opts,
    );
    expect(roots).toHaveLength(1);
    const de = roots[0];
    expect(de.iso).toBe("DE");
    expect(de.asset).toBeDefined(); // mixed node keeps its own national package
    expect(de.children.map((c) => c.iso)).toEqual(["DE-BW", "DE-BY"]); // sorted by name
    expect(de.hasAssets).toBe(true);
    expect(branchPaths(roots)).toEqual([["DE"]]);
  });

  it("synthesises a country with no culture of its own from its subdivisions", () => {
    const roots = buildCultureTree(
      [culture({ id: "bavaria", name: "Bavaria", iso: "DE-BY", parent: "DE" })],
      { ...opts, nameFor: (iso) => (iso === "DE" ? "Germany" : null) },
    );
    expect(roots).toHaveLength(1);
    const de = roots[0];
    expect(de.iso).toBe("DE");
    expect(de.name).toBe("Germany"); // resolved via nameFor
    expect(de.asset).toBeUndefined(); // synthesised: no national package
    expect(de.hasAssets).toBe(true); // rolled up from Bavaria
    expect(de.children.map((c) => c.iso)).toEqual(["DE-BY"]);
  });

  it("falls back to the ISO code when a synthesised parent has no name", () => {
    const roots = buildCultureTree(
      [culture({ id: "bavaria", iso: "DE-BY", parent: "DE" })],
      opts,
    );
    expect(roots[0].name).toBe("DE");
  });

  it("omits size when no sidecar is known", () => {
    const roots = buildCultureTree([culture({ id: "germany", iso: "DE" })], {
      hrefFor: opts.hrefFor,
    });
    expect(roots[0].asset).toEqual({
      href: "https://cultures.example/downloads/cultures/germany.zip",
    });
  });

  it("normalises ISO case from anchor and parent", () => {
    const roots = buildCultureTree(
      [culture({ id: "bavaria", iso: "de-by", parent: "de" })],
      opts,
    );
    expect(roots[0].iso).toBe("DE");
    expect(roots[0].children[0].iso).toBe("DE-BY");
  });
});

describe("nodeByPath", () => {
  const roots = buildCultureTree(
    [
      culture({ id: "germany", name: "Germany", iso: "DE" }),
      culture({ id: "bavaria", name: "Bavaria", iso: "DE-BY", parent: "DE" }),
    ],
    opts,
  );

  it("resolves a country and a nested subdivision", () => {
    expect(nodeByPath(roots, ["DE"])?.name).toBe("Germany");
    expect(nodeByPath(roots, ["DE", "DE-BY"])?.name).toBe("Bavaria");
  });

  it("is case-insensitive", () => {
    expect(nodeByPath(roots, ["de", "de-by"])?.iso).toBe("DE-BY");
  });

  it("returns null for a missing segment", () => {
    expect(nodeByPath(roots, ["FR"])).toBeNull();
    expect(nodeByPath(roots, ["DE", "DE-XX"])).toBeNull();
  });
});

describe("branchPaths", () => {
  it("lists only branch nodes, deepest paths included", () => {
    const roots = buildCultureTree(
      [
        culture({ id: "germany", name: "Germany", iso: "DE" }),
        culture({ id: "bavaria", name: "Bavaria", iso: "DE-BY", parent: "DE" }),
        culture({ id: "france", name: "France", iso: "FR" }), // leaf, no children
      ],
      opts,
    );
    expect(branchPaths(roots)).toEqual([["DE"]]);
  });
});

import { describe, it, expect } from "vitest";
import {
  buildCultureTree,
  nodeByPath,
  branchPaths,
  type CultureEntry,
} from "../src/lib/culture-tree";

// A mappable culture by default; pass `iso: undefined` for a non-mappable one.
function entry(over: Partial<CultureEntry> & { id: string }): CultureEntry {
  return { kind: "culture", asset: `${over.id}.zip`, ...over };
}

// Base options: the page builds the href; size comes from the entry itself.
const opts = {
  hrefFor: (e: CultureEntry) => `https://cultures.example/downloads/cultures/${e.asset}`,
};

describe("buildCultureTree", () => {
  it("returns an empty forest for no entries", () => {
    expect(buildCultureTree([], opts)).toEqual([]);
  });

  it("places a lone country culture as a leaf with an asset", () => {
    const roots = buildCultureTree(
      [entry({ id: "germany", title: "Germany", iso: "DE", size: "39.4 kB" })],
      opts,
    );
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

  it("derives the country from the ISO 3166-2 code and nests (1a mixed node)", () => {
    const roots = buildCultureTree(
      [
        entry({ id: "germany", title: "Germany", iso: "DE" }),
        entry({ id: "bavaria", title: "Bavaria", iso: "DE-BY" }),
        entry({ id: "bw", title: "Baden-Württemberg", iso: "DE-BW" }),
      ],
      opts,
    );
    expect(roots).toHaveLength(1);
    const de = roots[0];
    expect(de.iso).toBe("DE");
    expect(de.asset).toBeDefined(); // keeps its own national package
    expect(de.children.map((c) => c.iso)).toEqual(["DE-BW", "DE-BY"]); // sorted by name
    expect(de.hasAssets).toBe(true);
    expect(branchPaths(roots)).toEqual([["DE"]]);
  });

  it("synthesises a country with no culture of its own from its subdivisions", () => {
    const roots = buildCultureTree([entry({ id: "bavaria", title: "Bavaria", iso: "DE-BY" })], {
      ...opts,
      nameFor: (iso) => (iso === "DE" ? "Germany" : null),
    });
    expect(roots).toHaveLength(1);
    const de = roots[0];
    expect(de.iso).toBe("DE");
    expect(de.name).toBe("Germany"); // resolved via the atlas
    expect(de.asset).toBeUndefined(); // synthesised: no national package
    expect(de.hasAssets).toBe(true); // rolled up from Bavaria
    expect(de.children.map((c) => c.iso)).toEqual(["DE-BY"]);
  });

  it("falls back to the ISO code when no atlas name is given", () => {
    const roots = buildCultureTree([entry({ id: "bavaria", iso: "DE-BY" })], opts);
    expect(roots[0].name).toBe("DE");
  });

  it("prefers an explicit title over the atlas name", () => {
    const roots = buildCultureTree([entry({ id: "germany", title: "Deutschland", iso: "DE" })], {
      ...opts,
      nameFor: () => "Germany",
    });
    expect(roots[0].name).toBe("Deutschland");
  });

  it("skips non-mappable cultures (no iso) and group entries", () => {
    const roots = buildCultureTree(
      [
        entry({ id: "germany", title: "Germany", iso: "DE" }),
        entry({ id: "esperanto", title: "Esperanto" }), // no iso
        { id: "dach", kind: "group", title: "DACH" }, // group: no geo
      ],
      opts,
    );
    expect(roots.map((r) => r.iso)).toEqual(["DE"]);
  });

  it("honours an explicit parent override over the code-derived country", () => {
    const roots = buildCultureTree(
      [entry({ id: "x", title: "X", iso: "AB-CD", parent: "ZZ" })],
      opts,
    );
    expect(roots).toHaveLength(1);
    expect(roots[0].iso).toBe("ZZ"); // not "AB"
    expect(roots[0].children.map((c) => c.iso)).toEqual(["AB-CD"]);
  });

  it("omits size when the entry has none", () => {
    const roots = buildCultureTree([entry({ id: "germany", iso: "DE" })], opts);
    expect(roots[0].asset).toEqual({
      href: "https://cultures.example/downloads/cultures/germany.zip",
    });
  });

  it("normalises ISO case from the code", () => {
    const roots = buildCultureTree([entry({ id: "bavaria", iso: "de-by" })], opts);
    expect(roots[0].iso).toBe("DE");
    expect(roots[0].children[0].iso).toBe("DE-BY");
  });
});

describe("nodeByPath", () => {
  const roots = buildCultureTree(
    [
      entry({ id: "germany", title: "Germany", iso: "DE" }),
      entry({ id: "bavaria", title: "Bavaria", iso: "DE-BY" }),
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
  it("lists only branch nodes", () => {
    const roots = buildCultureTree(
      [
        entry({ id: "germany", title: "Germany", iso: "DE" }),
        entry({ id: "bavaria", title: "Bavaria", iso: "DE-BY" }),
        entry({ id: "france", title: "France", iso: "FR" }), // leaf, no children
      ],
      opts,
    );
    expect(branchPaths(roots)).toEqual([["DE"]]);
  });
});

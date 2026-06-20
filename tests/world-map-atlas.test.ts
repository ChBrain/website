import { describe, it, expect } from "vitest";
import { countryName, regionKeyOf } from "../src/lib/world-map";

// Atlas resolvers derived from the bundled Natural Earth geojson (NAME /
// REGION_UN). Assertions are pinned to that data, so they double as a guard
// that the source still carries the fields the cultures map relies on.

describe("countryName", () => {
  it("names a country from its ISO 3166-1 alpha-2 code", () => {
    expect(countryName("DE")).toBe("Germany");
    expect(countryName("FR")).toBe("France");
  });

  it("is case-insensitive", () => {
    expect(countryName("de")).toBe("Germany");
  });

  it("returns null for a subdivision code (named by the culture, not the atlas)", () => {
    expect(countryName("DE-BY")).toBeNull();
  });

  it("returns null for an unknown code", () => {
    expect(countryName("ZZ")).toBeNull();
  });
});

describe("regionKeyOf", () => {
  it("maps countries to their UN M49 macro-region key", () => {
    expect(regionKeyOf("DE")).toBe("europe");
    expect(regionKeyOf("JP")).toBe("asia");
    expect(regionKeyOf("BR")).toBe("americas");
    expect(regionKeyOf("NG")).toBe("africa");
    expect(regionKeyOf("AU")).toBe("oceania");
  });

  it("lets a subdivision inherit its country's region", () => {
    expect(regionKeyOf("DE-BY")).toBe("europe");
    expect(regionKeyOf("de-by")).toBe("europe");
  });

  it("returns null for an unknown code", () => {
    expect(regionKeyOf("ZZ")).toBeNull();
  });
});

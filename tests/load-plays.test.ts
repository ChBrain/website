import { describe, it, expect } from "vitest";
import { loadAllPlays } from "../src/lib/load-plays";

describe("load-plays", () => {
  it("successfully loads all installed plays", () => {
    const plays = loadAllPlays();
    expect(plays).toBeInstanceOf(Array);

    if (plays.length === 0) {
      console.log("No plays packages installed; skipping Woyzeck assertions.");
      return;
    }

    const woyzeck = plays.find((p) => p.id === "woyzeck");
    expect(woyzeck).toBeDefined();
    expect(woyzeck!.title).toBe("Woyzeck");
    expect(woyzeck!.houseId).toBe("buechner");
    expect(woyzeck!.voice).toBe("stripped, clinical, direct; rhythmic, simple sentences");
    expect(woyzeck!.voiceRegister).toBe("clinical");
    expect(woyzeck!.license).toBe("CC-BY-NC-SA-4.0");

    // Check play sections
    expect(woyzeck!.sections).toHaveProperty("estate");
    expect(woyzeck!.sections).toHaveProperty("name");
    expect(woyzeck!.sections).toHaveProperty("arc");
    expect(woyzeck!.sections).toHaveProperty("company");
    expect(woyzeck!.sections).toHaveProperty("triggers");
    expect(woyzeck!.sections).toHaveProperty("stakes");

    // Check elements
    expect(woyzeck!.elements.length).toBeGreaterThanOrEqual(24);

    const marie = woyzeck!.elements.find((e) => e.id === "marie");
    expect(marie).toBeDefined();
    expect(marie!.type).toBe("persona");
    expect(marie!.title).toBe("Marie");
    expect(marie!.voiceRegister).toBe("clinical");
    expect(marie!.sections).toHaveProperty("taxonomy");
    expect(marie!.sections).toHaveProperty("owner");
    expect(marie!.sections).toHaveProperty("projection");

    const captain = woyzeck!.elements.find((e) => e.id === "the_captain");
    expect(captain).toBeDefined();
    expect(captain!.voiceRegister).toBe("melancholy");

    const razor = woyzeck!.elements.find((e) => e.id === "the_razor");
    expect(razor).toBeDefined();
    expect(razor!.type).toBe("piece");
    expect(razor!.title).toBe("The Razor");

    // Check reference/warrant
    expect(woyzeck!.reference).not.toBeNull();
    expect(woyzeck!.reference!.title).toBe("Woyzeck: Reference");
    expect(woyzeck!.reference!.sections).toHaveProperty("line of work");
    expect(woyzeck!.reference!.sections).toHaveProperty("origin");
    expect(woyzeck!.reference!.sections).toHaveProperty("restrictions");
    expect(woyzeck!.reference!.sections).toHaveProperty("encoding");
  });
});

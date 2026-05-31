import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";
import { URLS } from "../src/lib/urls";

/**
 * Main (company front door) — design contract.
 *
 * Mirrors tests/cvi.test.ts. The main page is the funnel — the conversion
 * surface of kaihacks.ai. Every structural piece (the funnel order, the
 * AIDE acrostic, the timeline bookends, the architecture card) is a
 * deliberate design choice. Locking it down hard means any silent edit
 * (reordered chapters, broken acrostic, missing bookend, renamed sub-
 * divider) breaks a test. That's the gate.
 *
 * Snap chassis is also locked at the chassis level (snap-scroll container
 * + N snap-panels) but NOT at the precise CSS-rule level — Vitest+JSDOM
 * doesn't evaluate <style> blocks, so we assert the class structure that
 * carries the snap, not the computed style.
 */

const pages = loadBuiltPages(process.cwd());
const main = pages.find((p) => p.path === "main/index.html");

// h2 accepts a string OR a string[] so masthead labels can be in motion.
// id accepts a string OR a string[] so the §02 "author → founder" rename
// can land without breaking the contract. note accepts a string OR a
// string[] so the section notes (which Kai is iterating on) can carry
// either the legacy wording or the new outcomes-grammar wording.
const SECTIONS: {
  n: string;
  id: string | string[];
  h2: string | string[];
  note: string | string[];
}[] = [
  {
    n: "§01",
    id: "services",
    h2: "Services",
    // Legacy: "have the method built for you" (the §01 framing).
    // New: "have outcomes delivered for you" (echoes the masthead's
    // Driving outcomes... line; §03 picks up the old "method" framing).
    note: ["have the method built for you", "have outcomes delivered for you"],
  },
  {
    n: "§02",
    // id: "author" is legacy; "founder" is the new id that matches the
    // h2 "The Founder" wording introduced earlier.
    id: ["author", "founder"],
    h2: ["The author", "The Founder"],
    // Legacy: "the range · AI → delivery → AI" (the timeline framing).
    // New: "have the founder work with you" (the services-grammar
    // parallel: "have outcomes delivered" / "have the founder work").
    note: ["the range · AI → delivery → AI", "have the founder work with you"],
  },
  {
    n: "§03",
    id: "method",
    h2: ["Method & architecture", "Method & Architecture"],
    // Legacy: "the name reads itself · and what it runs on".
    // New: "have the method built for you" (intentional reuse of the
    // old §01 note — the §03 architecture-card IS what the method is).
    note: ["the name reads itself · and what it runs on", "have the method built for you"],
  },
  { n: "§04", id: "apps", h2: "Applications", note: "what runs on the architecture" },
];

// AIDE acrostic — first letter of each domain is bricked. Two accepted forms:
// - DOMAINS_LEGACY: full names (Enterprise Architecture spelled out)
// - DOMAINS_EA: abbreviated form (EA with the full expansion in a gloss row).
// Both render the acrostic A·I·D·E at the initials. The bricked-initial
// assertion stays strict (initials must be exactly ["A","I","D","E"]).
const DOMAINS_LEGACY = ["AI", "ITSM", "DevOps", "Enterprise Architecture"];
const DOMAINS_EA = ["AI", "ITSM", "DevOps", "EA"];

// Engage names are in editorial flux: the current 3 (Advisory / Implementation /
// Workshops) is being lifted to a 4-item WAIT acrostic (Workshops / Advisory /
// Implementation / Transformation) so both columns are acrostics. We accept
// either set so the source lift can land without breaking this contract.
const ENGAGE_OLD = ["Advisory", "Implementation", "Workshops"];
const ENGAGE_WAIT = ["Workshops", "Advisory", "Implementation", "Transformation"];

// Canonical timeline. Bookends (index 0 and 5) carry ai:true.
// Year strings accept the legacy en-dash range form, the spaced-hyphen
// range form, AND the single-year form (the latter is the new mobile-
// friendly shape — the timeline arc already implies duration via the
// gap between rows, so the range numerals are redundant typography
// that broke the left-edge alignment on narrow viewports).
// Companies/order/bookends locked strict.
const TIMELINE: { y: string[]; co: string; ai: boolean }[] = [
  { y: ["2004"], co: "TU München", ai: true },
  { y: ["2006–’12", "2006 - ’12", "2006"], co: "Telefónica", ai: false },
  { y: ["2012–’20", "2012 - ’20", "2012"], co: "Danfoss", ai: false },
  { y: ["2021"], co: "q.beyond", ai: false },
  { y: ["2023"], co: "FLS", ai: false },
  { y: ["2026"], co: "KAI HACKS AI", ai: true },
];

// HACKS is bricked (the verbs) — the rest plain.
const MOVEMENTS = [
  { t: "KAI", sense: "the noun", accent: false },
  { t: "HACKS", sense: "the verbs", accent: true },
  { t: "AI", sense: "the verb", accent: false },
];

const APPS: { title: string; state: string; url: string[]; planned: boolean }[] = [
  { title: "Cultures", state: "live", url: ["cultures.kaihacks.ai"], planned: false },
  // url accepts the legacy en-dash "–" placeholder OR the hyphen "-" form
  // (per the CVI's no-en-dash sweep — the rendered placeholder uses a
  // plain hyphen-minus instead of U+2013).
  { title: "More applications", state: "in progress", url: ["–", "-"], planned: true },
];

describe("main (company front door) — design contract", () => {
  it("page exists at main/index.html (build tripwire)", () => {
    expect(main, "build did not emit dist/main/index.html").toBeDefined();
  });

  describe("global chrome (SiteHeader + SiteFooter)", () => {
    it("renders the SiteHeader with .ai TLD accent", () => {
      const dom = new JSDOM(main!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".ai");
    });

    it("SiteHeader nav: legacy 3-item apex menu OR removed for the location-label shape", () => {
      // Same two-shape contract as cvi.test.ts. After the chrome
      // restructure the nav goes away (the wordmark moves right, the
      // location label takes the left). Accept either form.
      const dom = new JSDOM(main!.html);
      const navLinks = [...dom.window.document.querySelectorAll(".topbar-nav a")];
      const labels = navLinks.map((a) => a.textContent?.trim());
      const isLegacy =
        labels.length === 3 &&
        labels[0] === "architecture" &&
        labels[1] === "cultures" &&
        labels[2] === "services";
      const isLocationLabel = labels.length === 0;
      expect(
        isLegacy || isLocationLabel,
        `nav "${labels.join(" · ")}" matched neither the legacy apex menu nor the location-label removal`,
      ).toBe(true);
    });

    it("renders the SiteFooter with the global Privacy + CVI links", () => {
      const dom = new JSDOM(main!.html);
      const links = [...dom.window.document.querySelectorAll(".footfed-legal-link")];
      const hrefs = links.map((a) => a.getAttribute("href"));
      expect(hrefs).toContain(URLS.privacy);
      expect(hrefs).toContain(URLS.cvi);
    });
  });

  describe("masthead", () => {
    it("overline anchors on 'the company'", () => {
      // The full overline string (and its est. year, optional "enterprise
      // architecture" subtitle, etc.) is editorial and in motion. The brand-
      // identifying token "the company" is the structural anchor — lock it.
      const dom = new JSDOM(main!.html);
      const overline = dom.window.document.querySelector(".masthead .overline");
      expect(overline).not.toBeNull();
      expect((overline?.textContent ?? "").toLowerCase()).toContain("the company");
    });

    it("h1 spells KAI HACKS AI with HACKS bricked", () => {
      const dom = new JSDOM(main!.html);
      const h1 = dom.window.document.querySelector("h1.masthead-title");
      expect(h1).not.toBeNull();
      const text = h1!.textContent ?? "";
      expect(text).toContain("KAI");
      expect(text).toContain("HACKS");
      expect(text).toContain("AI");
      // HACKS is the only token wrapped in the brick-accent span.
      const accent = h1!.querySelector(".masthead-title-accent");
      expect(accent?.textContent?.trim()).toBe("HACKS");
    });

    it("lede frames the offer (legacy disciplines list OR the new outcomes-to-delivery line)", () => {
      // Two accepted shapes:
      //   LEGACY — long form listing the four disciplines + the
      //   "with or without AI" tail: "An enterprise architect's method –
      //   applied across AI, ITSM, DevOps and enterprise architecture,
      //   with or without AI..."
      //   DRIVING — short positioning line that pairs with the new
      //   masthead grammar: "Driving outcomes, from Architecture to
      //   Delivery." (architecture + delivery as the bookend nouns).
      // Both must mention "architecture" — that's the brand-identifying
      // structural anchor.
      const dom = new JSDOM(main!.html);
      const lede = dom.window.document.querySelector(".lede");
      // Source wraps the lede across lines; collapse whitespace before matching.
      const text = (lede?.textContent ?? "").toLowerCase().replace(/\s+/g, " ");
      expect(text).toContain("architecture");
      const isLegacy =
        text.includes("itsm") &&
        text.includes("devops") &&
        text.includes("enterprise architecture") &&
        text.includes("with or without ai");
      const isDriving = text.includes("driving") && text.includes("delivery");
      expect(
        isLegacy || isDriving,
        `lede "${text}" matched neither the legacy disciplines list nor the new driving-to-delivery line`,
      ).toBe(true);
    });

    it("draft-marker tolerated (either present in legacy form, or removed in the final-fixes shape)", () => {
      // Kai removed the draft-marker line as part of the final-fixes
      // pass; the legacy shape kept it as an amber dot + label. Accept
      // either — when present, the textContent must still contain
      // "draft" (otherwise something other than the marker is rendering
      // with the class).
      const dom = new JSDOM(main!.html);
      const draft = dom.window.document.querySelector(".draft-marker");
      if (draft) {
        expect((draft.textContent ?? "").toLowerCase()).toContain("draft");
      }
    });
  });

  describe("4 canonical chapters (funnel order)", () => {
    for (const sec of SECTIONS) {
      const idTitle = Array.isArray(sec.id) ? sec.id.join("|") : sec.id;
      it(`${sec.n} #${idTitle}: has the canonical heading + note`, () => {
        const dom = new JSDOM(main!.html);
        // Pick the first id in the tolerated set that actually renders.
        const ids = Array.isArray(sec.id) ? sec.id : [sec.id];
        const section = ids
          .map((id) => dom.window.document.querySelector(`section#${id}.section`))
          .find((s) => s !== null);
        expect(section, `missing section for any of [${ids.join(", ")}]`).toBeDefined();
        expect(section!.querySelector(".section-no")?.textContent?.trim()).toBe(sec.n);
        const h2 = section!.querySelector(".section-title")?.textContent?.trim();
        if (Array.isArray(sec.h2)) {
          expect(sec.h2, `${section!.id} h2 "${h2}" not in tolerated set`).toContain(h2);
        } else {
          expect(h2).toBe(sec.h2);
        }
        const note = section!.querySelector(".section-note")?.textContent?.trim();
        if (Array.isArray(sec.note)) {
          expect(sec.note, `${section!.id} note "${note}" not in tolerated set`).toContain(note);
        } else {
          expect(note).toBe(sec.note);
        }
      });
    }

    it("sections appear in canonical funnel order (services → author|founder → method → apps)", () => {
      const dom = new JSDOM(main!.html);
      const ids = [...dom.window.document.querySelectorAll("main.snap-scroll section.section")].map(
        (s) => s.id,
      );
      // Build the expected id list by picking, for each canonical
      // section, the tolerated id that actually appears in the DOM.
      const expected = SECTIONS.map((sec) => {
        const tolerated = Array.isArray(sec.id) ? sec.id : [sec.id];
        return tolerated.find((id) => ids.includes(id)) ?? tolerated[0];
      });
      expect(ids).toEqual(expected);
    });
  });

  describe("snap chassis (CVI parity)", () => {
    it("main.snap-scroll wraps the chapters", () => {
      const dom = new JSDOM(main!.html);
      const scroll = dom.window.document.querySelector("main.snap-scroll");
      expect(scroll, "missing main.snap-scroll container").not.toBeNull();
    });

    it("renders 5 snap panels: masthead + 4 §s", () => {
      const dom = new JSDOM(main!.html);
      const panels = dom.window.document.querySelectorAll("main.snap-scroll .snap-panel");
      expect(panels.length).toBe(5);
    });

    it("masthead is the first snap panel", () => {
      const dom = new JSDOM(main!.html);
      const first = dom.window.document.querySelector("main.snap-scroll .snap-panel");
      expect(first?.classList.contains("masthead")).toBe(true);
    });

    it("SiteFooter lives OUTSIDE the snap container", () => {
      const dom = new JSDOM(main!.html);
      const snap = dom.window.document.querySelector("main.snap-scroll");
      const footer = dom.window.document.querySelector(".footfed");
      expect(footer).not.toBeNull();
      expect(snap?.contains(footer)).toBe(false);
    });
  });

  describe("§01 Services — AIDE acrostic + engagement + brick CTA", () => {
    it("renders 4 domains in canonical AIDE order (legacy or EA-abbreviated form)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const cols = section!.querySelectorAll(".services-col");
      const domainCol = cols[0];
      const domainRows = [...domainCol.querySelectorAll(".services-domain")].filter(
        (row) => !row.classList.contains("services-domain--coda"),
      );
      expect(domainRows.length).toBe(DOMAINS_LEGACY.length);
      // Each row carries a .services-domain-name (the bricked-initial + rest).
      // If the new structure adds a sibling gloss row, the name extractor only
      // looks at the name child so the gloss text doesn't leak in.
      const names = domainRows.map((row) => {
        const nameEl = row.querySelector(".services-domain-name") ?? row;
        const text = (nameEl.textContent ?? "").replace(/\s+/g, " ").trim();
        return text.length > 1 && text[1] === " " ? text[0] + text.slice(2) : text;
      });
      expect([DOMAINS_LEGACY, DOMAINS_EA]).toContainEqual(names);
    });

    it("first letter of each domain is bricked (AIDE acrostic preserved)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const initials = [...section!.querySelectorAll(".services-col .services-domain-initial")].map(
        (i) => i.textContent?.trim(),
      );
      // AIDE: A · I · D · E
      expect(initials).toEqual(["A", "I", "D", "E"]);
    });

    it("domain column ends with the '…you name it' coda", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const coda = section!.querySelector(".services-domain--coda");
      expect(coda?.textContent?.trim()).toBe("…you name it");
    });

    it("renders the engagement modes in canonical order (3 legacy or 4 WAIT)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const engageNames = [...section!.querySelectorAll(".services-engage-name")].map(
        (n) => n.textContent?.trim() ?? "",
      );
      // Strip any bricked-initial whitespace artefact so "W orkshops" matches
      // "Workshops" once the WAIT lift wraps the first letter in its own span.
      const normalised = engageNames.map((t) => {
        const s = t.replace(/\s+/g, " ").trim();
        return s.length > 1 && s[1] === " " ? s[0] + s.slice(2) : s;
      });
      expect([ENGAGE_OLD, ENGAGE_WAIT]).toContainEqual(normalised);
    });

    it("brick CTA 'Start a conversation →' points to the contact destination", () => {
      const dom = new JSDOM(main!.html);
      const cta = dom.window.document.querySelector("section#services a.services-cta");
      expect(cta).not.toBeNull();
      // Accept the legacy in-page anchor (#contact) or the new dedicated
      // contact surface (URLS.contact / /contact/) once the page lands.
      const href = cta!.getAttribute("href") ?? "";
      expect(href === "#contact" || /\/contact\/?$/.test(href)).toBe(true);
      expect(cta!.textContent?.trim()).toContain("Start a conversation");
    });
  });

  describe("§02 Author/Founder — timeline with AI bookends", () => {
    it(`renders ${TIMELINE.length} timeline entries in canonical order`, () => {
      const dom = new JSDOM(main!.html);
      const section =
        dom.window.document.querySelector("section#author") ??
        dom.window.document.querySelector("section#founder");
      const steps = [...section!.querySelectorAll("li.arc-step")];
      expect(steps.length).toBe(TIMELINE.length);
      steps.forEach((step, i) => {
        const year = step.querySelector(".arc-year")?.textContent?.trim() ?? "";
        const co = step.querySelector(".arc-co")?.textContent?.trim();
        expect(TIMELINE[i].y, `arc[${i}] year "${year}" not in tolerated set`).toContain(year);
        expect(co).toBe(TIMELINE[i].co);
      });
    });

    it("first (2004) and last (2026) are AI bookends with .arc-step--ai", () => {
      const dom = new JSDOM(main!.html);
      const section =
        dom.window.document.querySelector("section#author") ??
        dom.window.document.querySelector("section#founder");
      const steps = [...section!.querySelectorAll("li.arc-step")];
      const aiFlags = steps.map((s) => s.classList.contains("arc-step--ai"));
      expect(aiFlags).toEqual(TIMELINE.map((t) => t.ai));
      // Exactly the bookends are flagged.
      expect(aiFlags).toEqual([true, false, false, false, false, true]);
    });

    it("author-lede mentions architecture (the brand-identifying structural anchor)", () => {
      // The legacy lede emphasised "range" with .brick. The new lede
      // ("AI in 2004, AI in 2026... the method carries what was learned
      // in architecture, ITSM, DevOps, infrastructure and operations.")
      // drops "range" but keeps "architecture" as the anchor token.
      // Accept either by asserting only the anchor.
      const dom = new JSDOM(main!.html);
      const lede =
        dom.window.document.querySelector("section#author .author-lede") ??
        dom.window.document.querySelector("section#founder .author-lede");
      const text = (lede?.textContent ?? "").toLowerCase();
      expect(text).toContain("architecture");
    });
  });

  describe("§03 Method & architecture — name reads itself + folded card", () => {
    it("renders 3 movements (KAI · HACKS · AI) in canonical order", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#method");
      const tokens = [...section!.querySelectorAll(".movement-token")].map((t) =>
        t.textContent?.trim(),
      );
      expect(tokens).toEqual(MOVEMENTS.map((m) => m.t));
    });

    it("HACKS is the only bricked movement (the verbs)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#method");
      const tokens = [...section!.querySelectorAll(".movement-token")];
      const accentFlags = tokens.map((t) => t.classList.contains("movement-token--accent"));
      expect(accentFlags).toEqual(MOVEMENTS.map((m) => m.accent));
      expect(accentFlags).toEqual([false, true, false]);
    });

    it("architecture sub-divider label tolerates either 'what the method runs on' OR 'what the method is'", () => {
      // Legacy: "Architecture · what the method runs on" (framed
      // applications as runtime).
      // New: "Architecture · what the method is" (frames Architecture
      // as the method's definition — the architecture-card carries the
      // acronym expansion).
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#method");
      const label = section!.querySelector(".architecture-sub-label")?.textContent?.trim();
      expect([
        "Architecture · what the method runs on",
        "Architecture · what the method is",
      ]).toContain(label);
    });

    it("architecture card links to URLS.architecture", () => {
      const dom = new JSDOM(main!.html);
      const card = dom.window.document.querySelector("section#method a.architecture-card");
      expect(card).not.toBeNull();
      expect(card!.getAttribute("href")).toBe(URLS.architecture);
    });

    it("architecture card carries the canonical title + 'live · the foundation' state", () => {
      // Title accepts either the legacy short form 'Architecture' or
      // the new long form 'KAI HACKS AI Architecture' — same card,
      // the new form just hangs the brand prefix on the title.
      const dom = new JSDOM(main!.html);
      const card = dom.window.document.querySelector("section#method a.architecture-card");
      const title = card!.querySelector(".architecture-card-title")?.textContent?.trim();
      expect(["Architecture", "KAI HACKS AI Architecture"]).toContain(title);
      expect(card!.querySelector(".architecture-card-state")?.textContent?.trim()).toBe(
        "live · the foundation",
      );
    });
  });

  describe("§04 Applications — Cultures live + placeholder", () => {
    it("renders exactly 2 app cards in canonical order", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#apps");
      const cards = [...section!.querySelectorAll("a.app")];
      expect(cards.length).toBe(APPS.length);
      cards.forEach((card, i) => {
        const title = card.querySelector(".app-title")?.textContent?.trim();
        const state = card.querySelector(".app-state")?.textContent?.trim();
        const url = card.querySelector(".app-url")?.textContent?.trim() ?? "";
        expect(title).toBe(APPS[i].title);
        expect(state).toBe(APPS[i].state);
        expect(APPS[i].url, `app[${i}] url "${url}" not in tolerated set`).toContain(url);
      });
    });

    it("Cultures (live) carries the brick .app-state--live", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#apps");
      const cards = [...section!.querySelectorAll("a.app")];
      const live = cards[0].querySelector(".app-state--live");
      expect(live, "live app should carry .app-state--live for brick").not.toBeNull();
    });

    it("'More applications' placeholder carries .app--planned (dashed border)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#apps");
      const cards = [...section!.querySelectorAll("a.app")];
      expect(cards[1].classList.contains("app--planned")).toBe(true);
    });
  });
});

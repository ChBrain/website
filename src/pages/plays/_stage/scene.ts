// Stage data: turns a Play into stagecraft — the company (Cast / Set / Props)
// you can pick from, the Scene Plots that cast a whole scene at once, and the
// dynamics (Business / Objectives / Blocking) each scene brings.
//
// Everything here is REAL play data. A khai play already links its elements
// in prose: a plot's markdown references its personas, places, pieces,
// positions, processes and plans, and load-plays rewrites those links to
// `#el-<id>` anchors in the rendered HTML. We read those anchors back out to
// recover the graph — so "select a Scene Plot and it casts the scene" is the
// play's own wiring, not a mock.
//
// The only thing still mocked is the dialogue, composed client-side in
// Stage.astro from the casting. Cast/Set/Props/Business/Objectives are real.
import type { Play } from "../../../lib/load-plays";
import { stripHtml } from "../_search-index";

export interface StageItem {
  id: string;
  /** English face (the call board reads titles, like the shelf) */
  name: string;
  /** one line, derived from the element's real declared-language prose */
  blurb: string;
}

/** A scene: its full company (member ids) plus the dynamics it brings. */
export interface ScenePlot {
  id: string;
  name: string;
  blurb: string;
  cast: string[];
  set: string[];
  props: string[];
  business: StageItem[]; // processes — the stage action (Souffleur cues)
  objectives: StageItem[]; // plans — the intent (Souffleur cues)
  ranks: StageItem[]; // positions — the Blocking strip
}

export interface Stagecraft {
  cast: StageItem[];
  set: StageItem[];
  props: StageItem[];
  plots: ScenePlot[];
  defaultPlotId: string | null;
}

export interface Selection {
  cast: string[];
  set: string[];
  props: string[];
}

/** First sentence of a blob, clipped — the call-board one-liner. */
function firstSentence(text: string, max = 88): string {
  if (!text) return "";
  const m = text.match(/^.*?[.!?](\s|$)/);
  let s = (m ? m[0] : text).trim();
  if (s.length > max) {
    const cut = s.slice(0, max);
    const sp = cut.lastIndexOf(" ");
    s = (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
  }
  return s;
}

/** A one-line read on an element from its first substantive section. */
function deriveBlurb(sections: Record<string, string>): string {
  for (const [heading, html] of Object.entries(sections)) {
    if (heading === "taxonomy" || heading === "owner") continue;
    // stripHtml restores &mdash;/&ndash; to real dashes; normalise back to
    // " - " (like load-plays' cleanText) so built HTML stays U+2014-free.
    const text = stripHtml(html).replace(/\s*[—–]\s*/g, " - ");
    if (text) return firstSentence(text);
  }
  return "";
}

/** The element/plot titles in the play data are slugs ("youngest-kid",
 *  "02_three-attempts"). The call board and the stage eyebrow are the English
 *  face, so present them as words: drop a leading ordering prefix, unhyphenate,
 *  and title-case. (The German `declared` name, read by the book, is untouched.) */
function prettyName(s: string): string {
  return (s || "")
    .replace(/^\d+[_-]/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const toItem = (el: {
  id: string;
  title: string;
  sections: Record<string, string>;
}): StageItem => ({
  id: el.id,
  name: prettyName(el.title),
  blurb: deriveBlurb(el.sections),
});

/** The `#el-<id>` anchors load-plays minted from the element's prose links. */
function refsIn(sections: Record<string, string>): string[] {
  const ids = new Set<string>();
  const html = Object.values(sections).join(" ");
  for (const m of html.matchAll(/#el-([a-zA-Z0-9_-]+)/g)) ids.add(m[1]);
  return [...ids];
}

export function stagecraft(play: Play): Stagecraft {
  // Per-type id -> item maps. A `#el-<id>` ref is type-less, so resolving it
  // against the map for the *type* being asked avoids cross-type collisions
  // when a stripped id is shared (e.g. a piece and a place both "x").
  const byType = new Map<string, Map<string, StageItem>>();
  for (const el of play.elements) {
    let m = byType.get(el.type);
    if (!m) byType.set(el.type, (m = new Map()));
    m.set(el.id, toItem(el));
  }
  const itemsOfType = (t: string) => [...(byType.get(t)?.values() ?? [])];
  const cast = itemsOfType("persona");
  const set = itemsOfType("place");
  const props = itemsOfType("piece");

  const plots: ScenePlot[] = play.elements
    .filter((el) => el.type === "plot")
    .map((pl) => {
      // Strict: a scene's company is exactly what the plot LINKS in its prose
      // (the #el- anchors). No name-match fallback — a play whose plots don't
      // link their company casts nothing, which surfaces the data gap instead
      // of papering over it with a guess.
      const refs = refsIn(pl.sections);
      const idsOf = (t: string) => {
        const m = byType.get(t);
        return m ? refs.filter((id) => m.has(id)) : [];
      };
      const itemsOf = (t: string) => idsOf(t).map((id) => byType.get(t)!.get(id)!);
      return {
        id: pl.id,
        name: prettyName(pl.title),
        blurb: deriveBlurb(pl.sections),
        cast: idsOf("persona"),
        set: idsOf("place"),
        props: idsOf("piece"),
        business: itemsOf("process"),
        objectives: itemsOf("plan"),
        ranks: itemsOf("position"),
      };
    });

  return { cast, set, props, plots, defaultPlotId: plots[0]?.id ?? null };
}

/** The casting a fresh stage opens with: the default scene's company, exactly
 *  (empty if it links none — no fabricated fallback). */
export function defaultSelection(craft: Stagecraft): Selection {
  const p = craft.plots.find((pl) => pl.id === craft.defaultPlotId);
  return p ? { cast: p.cast, set: p.set, props: p.props } : { cast: [], set: [], props: [] };
}

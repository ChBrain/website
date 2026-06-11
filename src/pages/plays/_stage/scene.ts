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
// The only thing still mocked is the dialogue (composeScene) — the play has no
// script. Cast/Set/Props/Business/Objectives are all real.
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

export interface SceneBeat {
  type: "direction" | "line";
  cue?: string;
  text: string;
}

export interface Scene {
  act: string;
  scene: string;
  beats: SceneBeat[];
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

const toItem = (el: {
  id: string;
  title: string;
  sections: Record<string, string>;
}): StageItem => ({
  id: el.id,
  name: el.title,
  blurb: deriveBlurb(el.sections),
});

/** The `#el-<id>` anchors load-plays minted from the element's prose links. */
function refsIn(sections: Record<string, string>): string[] {
  const ids = new Set<string>();
  const html = Object.values(sections).join(" ");
  for (const m of html.matchAll(/#el-([a-z0-9_]+)/g)) ids.add(m[1]);
  return [...ids];
}

/**
 * True if any >=4-char token of a name appears at a word start in the prose, so
 * a German inflection ("Nationalkonvents") still matches its lemma
 * ("Nationalkonvent"). This is the fallback for plays whose plots NAME their
 * company in prose but don't link it (Danton's Death), unlike the ones that do
 * (Woyzeck).
 */
function proseNames(proseLc: string, names: (string | undefined)[]): boolean {
  for (const name of names) {
    if (!name) continue;
    for (const tok of name.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (tok.length < 4) continue;
      const re = new RegExp(
        "(^|[^\\p{L}\\p{N}])" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "u",
      );
      if (re.test(proseLc)) return true;
    }
  }
  return false;
}

export function stagecraft(play: Play): Stagecraft {
  // id -> {type, item}: refs come back type-less (`#el-the_captain`), so we
  // resolve each against the real element it names to recover its bucket.
  const byId = new Map<string, { type: string; item: StageItem }>();
  for (const el of play.elements) byId.set(el.id, { type: el.type, item: toItem(el) });

  const ofType = (t: string) => play.elements.filter((el) => el.type === t).map(toItem);
  const cast = ofType("persona");
  const set = ofType("place");
  const props = ofType("piece");

  const plots: ScenePlot[] = play.elements
    .filter((el) => el.type === "plot")
    .map((pl) => {
      const refs = refsIn(pl.sections);
      // Scene description (not the taxonomy/owner boilerplate) for the fallback.
      const prose = Object.entries(pl.sections)
        .filter(([h]) => h !== "taxonomy" && h !== "owner")
        .map(([, html]) => stripHtml(html))
        .join(" ")
        .toLowerCase();
      const linkedOf = (t: string) => refs.filter((id) => byId.get(id)?.type === t);
      const matchedOf = (t: string) =>
        play.elements
          .filter((el) => el.type === t && proseNames(prose, [el.declared, el.title]))
          .map((el) => el.id);
      // Prefer the play's own links; per bucket, fall back to naming a type's
      // elements in the scene prose. A link-rich play (Woyzeck) is untouched; a
      // play that only names its company (Danton's Death) still casts.
      const idsOf = (t: string) => {
        const linked = linkedOf(t);
        return linked.length ? linked : matchedOf(t);
      };
      const itemsOf = (t: string) => idsOf(t).map((id) => byId.get(id)!.item);
      return {
        id: pl.id,
        name: pl.title,
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

/** The casting a fresh stage opens with: the default scene, or a thin fallback. */
export function defaultSelection(craft: Stagecraft): Selection {
  const p = craft.plots.find((pl) => pl.id === craft.defaultPlotId);
  if (p && (p.cast.length || p.set.length || p.props.length)) {
    return { cast: p.cast, set: p.set, props: p.props };
  }
  return {
    cast: craft.cast.slice(0, 2).map((i) => i.id),
    set: craft.set.slice(0, 1).map((i) => i.id),
    props: craft.props.slice(0, 1).map((i) => i.id),
  };
}

/**
 * The mocked opening scene, composed from a casting selection. Generic on
 * purpose: it weaves in whatever cast/place/prop you've selected so it reads
 * for any casting, but the lines are placeholder stagecraft. The client mirrors
 * this exactly so the scene recomposes live as you re-cast.
 */
export function composeScene(craft: Stagecraft, sel: Selection): Scene {
  const nameOf = (arr: StageItem[], id?: string) => arr.find((i) => i.id === id)?.name;
  const castNames = sel.cast.map((id) => nameOf(craft.cast, id)).filter(Boolean) as string[];
  const placeName = nameOf(craft.set, sel.set[0]);
  const propName = nameOf(craft.props, sel.props[0]);
  const speakerA = castNames[0] ?? "A Voice";
  const speakerB = castNames[1] ?? "The House";

  const beats: SceneBeat[] = [];
  beats.push({
    type: "direction",
    text: `[ ${placeName ? `${placeName} holds the dark` : "The dark holds"}. ${speakerA} waits at the edge. ]`,
  });
  if (castNames[0])
    beats.push({ type: "line", cue: speakerA, text: "Every entrance is a kind of falling." });
  if (castNames[1])
    beats.push({ type: "line", cue: speakerB, text: "Then say the fall has already begun." });
  beats.push({
    type: "direction",
    text: propName
      ? `[ ${speakerB} turns. ${propName} catches the little light there is. ]`
      : `[ ${speakerB} turns toward the house. ]`,
  });
  if (castNames[0])
    beats.push({ type: "line", cue: speakerA, text: "The play will find its way without us." });
  if (castNames[1])
    beats.push({ type: "line", cue: speakerB, text: "Or we are the way it finds." });

  return { act: "Act I", scene: "Scene 1", beats };
}

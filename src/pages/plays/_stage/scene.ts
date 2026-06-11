// Stage data: turns a Play into what the theatre needs — the company split into
// cast / set / props (the Backstage call board), and a mocked opening scene.
//
// "Mock the scene" only: the cast, set, and props are REAL play elements
// (personas, places, pieces — the same data the books and search read). No
// dialogue script exists in the data, so `buildScene` stitches a short,
// deliberately generic opening from the play's own real cast/place/prop names.
// Swapping this for a real (or generated) scene is the later integration work.
import type { Play } from "../../../lib/load-plays";
import { stripHtml } from "../_search-index";

export interface StageItem {
  id: string;
  /** English face (the call board reads titles, like the shelf) */
  name: string;
  /** one line, derived from the element's real declared-language prose */
  blurb: string;
}

export interface SceneBeat {
  type: "direction" | "line";
  /** speaker, for a line */
  cue?: string;
  text: string;
}

export interface Scene {
  act: string;
  scene: string;
  beats: SceneBeat[];
  /** which company members the mocked scene puts on/near the stage */
  staged: { castIds: string[]; placeId?: string; propId?: string };
}

export interface Company {
  cast: StageItem[];
  set: StageItem[];
  props: StageItem[];
}

/** First sentence of a blob, clipped — the call-board one-liner. */
function firstSentence(text: string, max = 96): string {
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

/** A one-line read on an element from its first substantive section. The book
 *  page hides `taxonomy`/`owner` on element facets; the call board does too, so
 *  the blurb lands on the projection prose. */
function deriveBlurb(sections: Record<string, string>): string {
  for (const [heading, html] of Object.entries(sections)) {
    if (heading === "taxonomy" || heading === "owner") continue;
    // stripHtml restores &mdash;/&ndash; to real em/en dashes; normalise them
    // back to " - " (same as load-plays' cleanText) so the built HTML stays
    // U+2014-free for the em-dash guard.
    const text = stripHtml(html).replace(/\s*[—–]\s*/g, " - ");
    if (text) return firstSentence(text);
  }
  return "";
}

function itemsOfType(play: Play, type: string): StageItem[] {
  return play.elements
    .filter((el) => el.type === type)
    .map((el) => ({ id: el.id, name: el.title, blurb: deriveBlurb(el.sections) }));
}

export function company(play: Play): Company {
  return {
    cast: itemsOfType(play, "persona"),
    set: itemsOfType(play, "place"),
    props: itemsOfType(play, "piece"),
  };
}

/**
 * A mocked opening scene built from the play's real company. Generic on
 * purpose — it name-drops the play's own cast/place/prop so it reads plausibly
 * for ANY play, but the lines themselves are placeholder stagecraft, not the
 * production. Clearly flagged as a rehearsal in the Souffleur strip.
 */
export function buildScene(play: Play, co: Company): Scene {
  const a = co.cast[0];
  const b = co.cast[1];
  const place = co.set[0];
  const prop = co.props[0];
  const speakerA = a?.name ?? "A Voice";
  const speakerB = b?.name ?? "The House";

  const beats: SceneBeat[] = [];
  beats.push({
    type: "direction",
    text: `[ ${place ? `${place.name} holds the dark` : "The dark holds"}. ${speakerA} waits at the edge. ]`,
  });
  if (a) beats.push({ type: "line", cue: speakerA, text: "Every entrance is a kind of falling." });
  if (b) beats.push({ type: "line", cue: speakerB, text: "Then say the fall has already begun." });
  beats.push({
    type: "direction",
    text: prop
      ? `[ ${speakerB} turns. ${prop.name} catches the little light there is. ]`
      : `[ ${speakerB} turns toward the house. ]`,
  });
  if (a)
    beats.push({ type: "line", cue: speakerA, text: "The play will find its way without us." });
  if (b) beats.push({ type: "line", cue: speakerB, text: "Or we are the way it finds." });

  const castIds = [a?.id, b?.id].filter(Boolean) as string[];
  return {
    act: "Act I",
    scene: "Scene 1",
    beats,
    staged: { castIds, placeId: place?.id, propId: prop?.id },
  };
}

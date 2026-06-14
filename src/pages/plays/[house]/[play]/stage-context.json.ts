// Lazy per-play context for the Souffleur. Prerendered to
// `dist/plays/<house>/<play>/stage-context.json` and fetched by the stage ONLY
// when the user first generates a scene (keeps the stage page itself light).
//
// It carries the play's real prose — synopsis + each element's and plot's
// stripped text — so the client can build a Gemini prompt from the *staged
// slice* (the synopsis + whatever cast/set/props are selected + the lit Scene
// Plot). All real data; the model writes the dialogue.
import type { APIRoute } from "astro";
import { loadAllPlays } from "../../../../lib/load-plays";
import { stripHtml } from "../../_search-index";

/** Plain text from rendered HTML, dash-normalised (no U+2014). Deliberately
 *  unclipped: the user controls the prompt payload by what they cast, so the
 *  Souffleur gets each chosen element's full prose. gemini-2.5-flash accepts
 *  ~1M input tokens, so play prose never approaches the limit. */
function plain(html: string | undefined): string {
  return stripHtml(html || "").replace(/\s*[—–]\s*/g, " - ");
}

function sectionsText(sections: Record<string, string>): string {
  return plain(
    Object.entries(sections)
      .filter(([h]) => h !== "taxonomy" && h !== "owner")
      .map(([, html]) => html)
      .join(" "),
  );
}

export interface StageContext {
  title: string;
  declared: string;
  house: string;
  voiceRegister: string;
  language: string;
  synopsis: string;
  elements: Record<string, { name: string; declared: string; text: string }>;
  plots: Record<string, { name: string; declared: string; text: string }>;
}

export function getStaticPaths() {
  return loadAllPlays().map((play) => ({
    params: { house: play.houseId, play: play.id },
    props: { play },
  }));
}

export const prerender = true;

export const GET: APIRoute = ({ props }) => {
  const play = (props as any).play;

  const synopsis = plain(
    [play.sections.arc, play.sections.stakes, play.sections.estate].filter(Boolean).join(" "),
  );

  const elements: StageContext["elements"] = {};
  const plots: StageContext["plots"] = {};
  for (const el of play.elements) {
    const entry = { name: el.title, declared: el.declared, text: sectionsText(el.sections) };
    if (el.type === "plot") plots[el.id] = entry;
    else if (el.type === "persona" || el.type === "place" || el.type === "piece")
      elements[el.id] = entry;
  }

  const ctx: StageContext = {
    title: play.title,
    declared: play.declared,
    house: play.houseTitle,
    voiceRegister: play.voiceRegister,
    language: play.language,
    synopsis,
    elements,
    plots,
  };

  return new Response(JSON.stringify(ctx), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};

// Lazy per-misfit context for the Souffleur. Prerendered to
// `dist/misfits/<misfit>/stage-context.json` and fetched by the stage ONLY when
// the user first generates a scene (keeps the stage page itself light). Mirrors
// plays/[house]/[play]/stage-context.json.ts, over the misfits collection.
//
// It carries the misfit's real prose — synopsis + each element's and plot's
// stripped text — so the client can build a prompt from the *staged slice*. All
// real data; the model writes the dialogue.
import type { APIRoute } from "astro";
import { loadAllMisfits } from "../../../lib/load-misfits";
import { stripHtml } from "../../plays/_search-index";

/** Plain text from rendered HTML, dash-normalised (no U+2014). */
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
  plans: Record<string, { name: string; declared: string; text: string }>;
}

export function getStaticPaths() {
  return loadAllMisfits().map((misfit) => ({
    params: { misfit: misfit.id },
    props: { misfit },
  }));
}

export const prerender = true;

export const GET: APIRoute = ({ props }) => {
  const play = (props as any).misfit;

  const synopsis = plain(
    [play.sections.arc, play.sections.stakes, play.sections.estate].filter(Boolean).join(" "),
  );

  const elements: StageContext["elements"] = {};
  const plots: StageContext["plots"] = {};
  const plans: StageContext["plans"] = {};
  for (const el of play.elements) {
    const entry = { name: el.title, declared: el.declared, text: sectionsText(el.sections) };
    if (el.type === "plot") plots[el.id] = entry;
    else if (el.type === "plan") plans[el.id] = entry;
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
    plans,
  };

  return new Response(JSON.stringify(ctx), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};

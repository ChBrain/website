import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import { loadRegistry } from "@chbrain/khai-plays";

const _require = createRequire(import.meta.url);
const md = new MarkdownIt({ html: true, breaks: false, linkify: false });

export function cleanText(s: string): string {
  if (!s) return "";
  return s.replace(/—/g, " - ").replace(/–/g, " - ");
}

export function cleanHtml(s: string): string {
  if (!s) return "";
  return s.replace(/—/g, "&mdash;").replace(/–/g, "&ndash;");
}

export type VoiceRegister = "clinical" | "melancholy" | "editorial";

export interface PlayElement {
  id: string;
  type: string; // "persona" | "position" | "piece" | "place" | "process" | "plot"
  title: string;
  voice?: string;
  voiceRegister: VoiceRegister;
  frontmatter: any;
  sections: Record<string, string>; // heading -> rendered HTML
}

export interface PlayReference {
  updated: string;
  title: string;
  sections: Record<string, string>; // heading -> rendered HTML
}

export interface Play {
  id: string;
  houseId: string;
  houseTitle: string;
  title: string;
  description: string;
  voice: string;
  voiceRegister: VoiceRegister;
  license: string;
  stamp: {
    owner: string;
    version: string;
    date: string;
  };
  sections: Record<string, string>; // heading -> rendered HTML
  elements: PlayElement[];
  reference: PlayReference | null;
}

export function getVoiceRegister(voice: string = ""): VoiceRegister {
  const v = voice.toLowerCase();
  if (v.includes("melancholy") || v.includes("verbose") || v.includes("patronizing")) {
    return "melancholy";
  }
  if (
    v.includes("stripped") ||
    v.includes("clinical") ||
    v.includes("sparse") ||
    v.includes("urgent")
  ) {
    return "clinical";
  }
  return "editorial";
}

function getPackageDir(pkgName: string): string | null {
  try {
    const pkgJsonPath = _require.resolve(`${pkgName}/package.json`);
    return dirname(pkgJsonPath);
  } catch {
    return null;
  }
}

function rewriteLinks(html: string): string {
  return html
    .replace(/href="(?:\.\.\/)*README\.md"/g, 'href="../../"')
    .replace(/href="play_[a-zA-Z0-9_-]+\.md"/g, 'href="./"')
    .replace(
      /href="(?:persona|position|piece|place|process|plot)_([a-zA-Z0-9_-]+)\.md"/g,
      'href="#el-$1"',
    );
}

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const regex = /^##\s+(.+)$/gm;
  let match;
  let lastIndex = 0;
  let lastHeading: string | null = null;

  while ((match = regex.exec(content)) !== null) {
    if (lastHeading) {
      const rawText = content.slice(lastIndex, match.index).trim();
      sections[lastHeading] = rewriteLinks(md.render(rawText));
    }
    lastHeading = match[1].trim().toLowerCase();
    lastIndex = regex.lastIndex;
  }
  if (lastHeading) {
    const rawText = content.slice(lastIndex).trim();
    sections[lastHeading] = rewriteLinks(md.render(rawText));
  }
  return sections;
}

export function loadAllPlays(): Play[] {
  let houses;
  try {
    houses = loadRegistry();
  } catch (e: any) {
    console.error("Failed to load plays registry:", e.message);
    return [];
  }

  const plays: Play[] = [];

  for (const house of houses) {
    const pkgDir = getPackageDir(house.package);
    if (!pkgDir) {
      console.log(`House package ${house.package} is not installed; skipping.`);
      continue;
    }

    let registry: any = null;
    try {
      registry = _require(`${house.package}/registry.json`);
    } catch {
      // Fallback if registry.json is not present or exported
    }

    // Read house voice from README.md
    let houseVoice = "";
    const readmePath = join(pkgDir, "README.md");
    if (existsSync(readmePath)) {
      const readmeSrc = readFileSync(readmePath, "utf8");
      const { data: readmeFm } = matter(readmeSrc);
      houseVoice = readmeFm.voice || "";
    }

    const playsDir = join(pkgDir, "plays");
    if (!existsSync(playsDir)) continue;

    for (const ent of readdirSync(playsDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const dirName = ent.name;
      const playPath = join(playsDir, dirName);
      const playFiles = readdirSync(playPath).filter(
        (f) => f.startsWith("play_") && f.endsWith(".md"),
      );
      if (playFiles.length === 0) continue;
      const mainPlayFile = join(playPath, playFiles[0]);

      // Read main play markdown
      const mainPlaySrc = readFileSync(mainPlayFile, "utf8");
      const { data: mainFm, content: mainContent } = matter(mainPlaySrc);

      let title = cleanText(mainFm.title || dirName);
      let description = "";
      let foundInRegistry = false;

      if (registry && Array.isArray(registry.plays)) {
        const regPlay = registry.plays.find((p: any) => p && p.id === dirName);
        if (regPlay) {
          title = cleanText(regPlay.title);
          description = cleanHtml(regPlay.description);
          foundInRegistry = true;
        }
      }

      if (!foundInRegistry) {
        console.warn(
          `[Migration Warning] Play "${dirName}" in house "${house.package}" not found in registry.json. Falling back to parsing ## Arc section.`,
        );
        const arcMatch = mainContent.match(/^##\s+Arc\s*$/im);
        if (arcMatch) {
          const startIndex = arcMatch.index! + arcMatch[0].length;
          const rest = mainContent.slice(startIndex).trim();
          const nextHeadingMatch = rest.match(/^##\s+/m);
          const sectionText = nextHeadingMatch
            ? rest.slice(0, nextHeadingMatch.index).trim()
            : rest;
          const paragraphs = sectionText
            .split(/\r?\n\r?\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
          description = cleanHtml(paragraphs[0] || "");
        } else {
          description = cleanHtml(mainFm.description || "");
        }
      }
      const playVoice = mainFm.voice || houseVoice || "";
      const voiceRegister = getVoiceRegister(playVoice);
      const license = mainFm.license || "";
      const stamp = mainFm.stamp || { owner: "", version: "", date: "" };

      const playSections = parseSections(mainContent);
      for (const k of Object.keys(playSections)) {
        playSections[k] = cleanHtml(playSections[k]);
      }

      // Read elements in the play directory
      const elements: PlayElement[] = [];
      let reference: PlayReference | null = null;

      for (const fileName of readdirSync(playPath)) {
        if (!fileName.endsWith(".md")) continue;
        const filePath = join(playPath, fileName);

        if (fileName === `play_${dirName}.md`) continue;

        if (fileName === "REFERENCES.md") {
          const refSrc = readFileSync(filePath, "utf8");
          const { data: refFm, content: refContent } = matter(refSrc);
          const h1Match = refContent.match(/^#\s+(.+)$/m);
          const refTitle = cleanText(h1Match ? h1Match[1].trim() : `${title} Reference`);
          const contentWithoutH1 = refContent.replace(/^#\s+.+$/m, "").trim();
          const refSections = parseSections(contentWithoutH1);
          for (const k of Object.keys(refSections)) {
            refSections[k] = cleanHtml(refSections[k]);
          }
          reference = {
            updated: refFm.updated || "",
            title: refTitle,
            sections: refSections,
          };
          continue;
        }

        const elSrc = readFileSync(filePath, "utf8");
        const { data: elFm, content: elContent } = matter(elSrc);

        if (!elFm.khai) continue;

        const elTitle = cleanText(elFm.title || fileName.replace(/\.md$/, ""));
        const elVoice = elFm.voice;
        const elVoiceResolved = elVoice || playVoice;
        const elVoiceRegister = getVoiceRegister(elVoiceResolved);
        const contentWithoutH1 = elContent.replace(/^#\s+.+$/m, "").trim();
        const elSections = parseSections(contentWithoutH1);
        for (const k of Object.keys(elSections)) {
          elSections[k] = cleanHtml(elSections[k]);
        }

        elements.push({
          id: fileName.replace(/\.md$/, "").replace(/^[a-z]+_/, ""),
          type: elFm.khai,
          title: elTitle,
          voice: elVoice,
          voiceRegister: elVoiceRegister,
          frontmatter: elFm,
          sections: elSections,
        });
      }

      plays.push({
        id: dirName,
        houseId: house.id,
        houseTitle: house.title,
        title,
        description: description || "",
        voice: playVoice,
        voiceRegister,
        license,
        stamp,
        sections: playSections,
        elements,
        reference,
      });
    }
  }

  return plays;
}

import { frontmatter as parseFrontmatter } from "./frontmatter";

export interface SpecFrontmatter {
  id: string;
  type: string;
  class: "system" | "element" | "meta";
  mnemonic: string;
  chapters: string[];
  subtitle: string;
  status: "draft" | "published";
  version: string;
}

export interface Chapter {
  /** the bolded first letter, e.g. "P" */
  letter: string;
  /** the full chapter name, e.g. "Place" or "Initiated by" */
  name: string;
  /** the body text after "**X**name: " up to the next bullet or coda */
  body: string;
}

export interface ParsedSpec {
  frontmatter: SpecFrontmatter;
  /** the opening paragraph between frontmatter and the first bullet */
  lede: string;
  /** the N bullet items, one per chapter */
  chapters: Chapter[];
  /** the closing paragraph after the "---" separator */
  coda: string;
}

export function parseSpec(text: string): ParsedSpec {
  const parsed = parseFrontmatter(text);
  const frontmatter = parsed.data as SpecFrontmatter;
  const body = parsed.content.trim();

  const sections = body.split(/\n---\n/).map((s) => s.trim());

  if (sections.length < 2) {
    throw new Error(
      `Spec body must have at least one "---" coda separator (got ${sections.length - 1})`,
    );
  }

  const mainSection = sections[0];
  const coda = sections[1];

  const bulletRe = /^[-*] /m;
  const firstBulletIndex = mainSection.search(bulletRe);
  if (firstBulletIndex === -1) {
    throw new Error("No bullets found in spec body");
  }
  const lede = mainSection.slice(0, firstBulletIndex).trim();
  const bulletBlock = mainSection.slice(firstBulletIndex);

  const bulletLines = bulletBlock.split(/\n(?=[-*] )/);
  const chapters: Chapter[] = bulletLines.map((line, i) => {
    const m = line.match(/^[-*] \*\*([A-Z])\*\*([\w\s]*?): (.*)/s);
    if (!m) {
      throw new Error(`Bullet ${i + 1} does not match expected pattern: ${line.slice(0, 80)}`);
    }
    const letter = m[1];
    const restOfName = m[2];
    const name = (letter + restOfName).trim();
    const bodyText = m[3].trim();
    return { letter, name, body: bodyText };
  });

  if (chapters.length !== frontmatter.chapters.length) {
    throw new Error(
      `Chapter count mismatch: frontmatter declares ${frontmatter.chapters.length}, body has ${chapters.length}`,
    );
  }
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].name !== frontmatter.chapters[i]) {
      throw new Error(
        `Chapter ${i + 1} name mismatch: frontmatter says "${frontmatter.chapters[i]}", body parsed "${chapters[i].name}"`,
      );
    }
  }

  return { frontmatter, lede, chapters, coda };
}

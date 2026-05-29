const TYPE_IDS = ["plot", "process", "position", "piece", "place", "persona", "instructions"];

/**
 * Auto-link uppercase type-name tokens in body prose to their sibling type pages.
 *
 * Rules:
 *  - Capitalised match: "Place" -> linked. "place" -> not linked.
 *  - Skip own type (the file's own self-name)
 *  - Skip own chapter names (e.g. piece.md has "Place" as a chapter - don't link)
 *  - Skip if already inside an <a> tag (won't nest links)
 *  - Match plural forms too: "Pieces" -> ../piece/
 *
 * Links are emitted as relative paths (../<slug>/) so the same build works at
 * both staging.kaihacks.ai/architecture/<slug>/ and architecture.kaihacks.ai/<slug>/.
 */
export function autoLink(bodyHtml: string, ownTypeId: string, ownChapterNames: string[]): string {
  let result = bodyHtml;
  const exclude = new Set<string>(ownChapterNames);
  const ownTypeNameUpper = ownTypeId.charAt(0).toUpperCase() + ownTypeId.slice(1);
  exclude.add(ownTypeNameUpper);

  for (const typeId of TYPE_IDS) {
    const typeNameUpper = typeId.charAt(0).toUpperCase() + typeId.slice(1);
    if (exclude.has(typeNameUpper)) continue;

    const pattern = new RegExp(`\\b(${typeNameUpper})(s?)\\b(?![^<]*</a>)`, "g");
    result = result.replace(pattern, `<a href="../${typeId}/">$1$2</a>`);
  }

  return result;
}

/**
 * Rewrite bare .md hrefs to sibling architecture page routes.
 *
 * Source markdown like `[Stack](stack.md)` renders to `<a href="stack.md">`,
 * which the browser resolves relative to the current page (yielding a 404).
 * Rewrite to ../<name>/ so the link resolves correctly at both
 * staging.kaihacks.ai/architecture/<slug>/ and architecture.kaihacks.ai/<slug>/.
 *
 * Matches: href="<lowercase-slug>.md"
 * Does not match: href containing /, ./, ../, or http(s)://
 */
export function rewriteMdLinks(html: string): string {
  return html.replace(/href="([a-z][a-z0-9-]*)\.md"/g, 'href="../$1/"');
}

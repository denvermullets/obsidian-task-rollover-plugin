import { lineHasCheckedBox, lineHasUncheckedBox, stripMarkersFromLine } from "./util";
import { logger } from "./logger";
import type { Pos, App, TFile } from "obsidian";
import { CALLOUT_PREFIX, CHECKBOX_STRING, EMPTY_LINE_MARKERS } from "./constants";

export type Section = {
  type: string;
  position: Pos;
  content: string[];
  filteredContent: string[];
  header: string;
  checkedTasks: string[];
  uncheckedTasks: string[];
};

export async function getSections({ note, app }: { note: TFile; app: App }): Promise<Section[]> {
  await app.metadataCache.computeFileMetadataAsync(note);

  const metadata = app.metadataCache.getFileCache(note);
  if (!metadata) {
    logger.error(`No metadata found for note: ${note}`);
    return [];
  }
  const sections = metadata.sections;

  if (!sections) {
    logger.info(`No sections found for the note ${note}`);
    return [];
  }

  const content = await app.vault.read(note);
  const lines = content.split("\n");

  const extractedSections = sections?.map((section) => {
    const startLine = section.position.start.line;
    const endLine = section.position.end.line;
    const filteredContent = lines
      .slice(startLine + 1, endLine + 1)
      .filter((line) => !EMPTY_LINE_MARKERS.includes(line.trim()));
    const content = lines.slice(startLine + 1, endLine + 1);
    const header = lines.slice(startLine, startLine + 1).join("");

    const uncheckedTasks: string[] = [];
    const checkedTasks: string[] = [];

    for (const line of content) {
      const hasUncheckedBox = lineHasUncheckedBox({ line });
      const hasCheckedBox = lineHasCheckedBox({ line });

      if (hasUncheckedBox) {
        uncheckedTasks.push(stripMarkersFromLine({ line }));
      }
      if (hasCheckedBox) {
        checkedTasks.push(stripMarkersFromLine({ line }));
      }
    }

    return {
      header,
      checkedTasks,
      uncheckedTasks,
      type: section.type,
      position: section.position,
      filteredContent,
      content,
    };
  });

  return extractedSections;
}

// Left in case we decide to check for section content again.
// Shouldn't be needed as `create` should only be ran on a new template
// appending to content that exists on a new template is likely valid.
export function sectionHasContent({ section }: { section: Section }): boolean {
  return section.content.length > 0;
}

export async function extractUncheckedItemsFromSections({
  sections,
  skippedSections,
}: {
  sections: Section[];
  skippedSections: string[];
}): Promise<string[]> {
  const unchecked: string[] = [];
  for (const section of sections) {
    if (skippedSections.includes(section.header)) continue;
    unchecked.push(...section.uncheckedTasks);
  }

  return unchecked.map((line) => `${CHECKBOX_STRING} ${line}`);
}

export function appendItemsToSection({
  sections,
  items,
  targetHeading,
}: {
  sections: Section[];
  items: string[];
  targetHeading: string;
}): Section[] {
  const sectionIndex = sections.findIndex((section) => section.header === targetHeading);

  if (sectionIndex === -1) {
    return [
      ...sections,
      {
        type: targetHeading[0] === CALLOUT_PREFIX ? "callout" : "other",
        position: {
          start: {
            line: 0,
            col: 0,
            offset: 0,
          },
          end: {
            line: 0,
            col: 0,
            offset: 0,
          },
        },
        content: items,
        filteredContent: items,
        header: targetHeading,
        uncheckedTasks: items,
        checkedTasks: [],
      },
    ];
  }

  return sections.map((section, index) =>
    index === sectionIndex
      ? {
          ...section,
          content: [...section.content, ...items],
          filteredContent: [...section.filteredContent, ...items],
          uncheckedTasks: [...section.uncheckedTasks, ...items],
        }
      : section
  );
}

export const convertSectionsToContent = ({ sections }: { sections: Section[] }): string => {
  let content = "\n";
  for (const section of sections) {
    content += `${section.header}\n`;
    for (const line of section.filteredContent) {
      if (section.type === "callout" && line[0] !== CALLOUT_PREFIX) {
        content += `${CALLOUT_PREFIX} `;
      }
      content += `${line}\n`;
    }
    content += "\n";
  }
  return content;
};

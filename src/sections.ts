import { isCalloutHeader } from "./util";
import { DailyNoteRolloverSettings } from "./types";
import { CALLOUT_PREFIX } from "./constants";

export function sectionHasContent(content: string, sectionHeading: string): boolean {
  const lines = content.split("\n");
  let inSection = false;
  console.log(`Checking section ${sectionHeading}`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === sectionHeading.trim()) {
      inSection = true;
      continue;
    }
    if (inSection && (line.trim().match(/^#+\s/) || isCalloutHeader(line.trim()))) return false;
    // Ignore empty callout lines (just ">") when checking for content
    if (inSection && line.trim() !== "" && line.trim() !== ">") return true;
  }
  return false;
}

export async function extractUncheckedItemsFromSections({
  content,
  settings,
  calloutPrefix = "",
}: {
  content: string;
  settings: DailyNoteRolloverSettings;
  calloutPrefix?: string;
}): Promise<string[]> {
  const lines = content.split("\n");

  const unchecked: string[] = [];

  let shouldSkip = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (settings.skippedTaskExtractionSections.includes(line.trim())) {
      shouldSkip = true;
      continue;
    }

    if (line === "") {
      shouldSkip = false;
    }

    if (shouldSkip) continue;
    if (line.trim().match(/^[-*+]\s+\[\s\]/)) unchecked.push(`${calloutPrefix}${line}`);
    // This line already has a callout prefix, don't add another
    if (line.trim().match(/^>[-*+]\s+\[\s\]/)) unchecked.push(`${line}`);
  }

  return unchecked;
}

export function appendItemsToSection(
  todayContent: string,
  items: string[],
  targetHeading: string
): string {
  const lines = todayContent.split("\n");
  let insertIndex = -1;
  const isCallout = isCalloutHeader(targetHeading);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === targetHeading.trim()) {
      insertIndex = i + 1;
      break;
    }
  }

  if (insertIndex === -1) {
    let newContent = todayContent.endsWith("\n") ? todayContent : todayContent + "\n";
    newContent += `\n${targetHeading}\n` + items.join("\n") + "\n";
    return newContent;
  }

  // For callouts, skip over empty callout lines (just ">") to find the insertion point
  if (isCallout) {
    while (insertIndex < lines.length && lines[insertIndex].trim() === ">") {
      insertIndex++;
    }
  }

  while (
    insertIndex < lines.length &&
    lines[insertIndex].trim() !== "" &&
    !lines[insertIndex].trim().match(/^#+\s/) &&
    !isCalloutHeader(lines[insertIndex].trim())
  ) {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, ...items);
  return lines.join("\n");
}

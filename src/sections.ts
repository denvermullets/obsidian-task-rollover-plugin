import { isCalloutHeader } from "./util";
import { DailyNoteRolloverSettings } from "./types";
import { logger } from "./logger";

export function sectionHasContent(content: string, sectionHeading: string): boolean {
  const lines = content.split("\n");
  let inSection = false;
  logger.info(`Checking section ${sectionHeading}`);
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
  let inCallout = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if we're entering a skipped section
    if (settings.skippedTaskExtractionSections.includes(trimmedLine)) {
      shouldSkip = true;
      inCallout = false;
      logger.info(`Skipping section: ${trimmedLine}`);
      continue;
    }

    // Check if we're starting a new callout block
    if (isCalloutHeader(trimmedLine)) {
      inCallout = true;
      // Only skip if this specific callout header is in the skip list
      if (settings.skippedTaskExtractionSections.includes(trimmedLine)) {
        shouldSkip = true;
        logger.info(`Skipping callout: ${trimmedLine}`);
      } else {
        shouldSkip = false;
      }
      continue;
    }

    // Check if we're exiting a callout block or skipped section
    // Callouts end when we hit a non-callout line that doesn't start with ">"
    // Regular sections end at empty lines or new headers
    if (trimmedLine === "") {
      shouldSkip = false;
      inCallout = false;
    } else if (inCallout && !trimmedLine.startsWith(">")) {
      // We've left the callout block
      inCallout = false;
      shouldSkip = false;
    } else if (trimmedLine.match(/^#+\s/)) {
      // New heading section
      shouldSkip = false;
      inCallout = false;
    }

    if (shouldSkip) continue;

    // Match tasks inside callouts: "> - [ ]" or ">- [ ]" (with or without space after >)
    // Also supports nested tasks with indentation: ">    - [ ]"
    if (trimmedLine.match(/^>\s*[-*+]\s+\[\s\]/)) {
      // Preserve the original spacing from the source file
      unchecked.push(line);
      logger.info(`Found unchecked task in callout: ${trimmedLine}`);
    }
    // Match regular tasks: "- [ ]", including nested tasks with leading whitespace
    else if (trimmedLine.match(/^\s*[-*+]\s+\[\s\]/)) {
      unchecked.push(`${calloutPrefix}${line}`);
      logger.info(`Found unchecked task: ${trimmedLine}`);
    }
  }

  return unchecked;
}

export function appendItemsToSection(
  todayContent: string,
  items: string[],
  targetHeading: string
): string {
  if (items.length === 0) {
    logger.info("No items to append");
    return todayContent;
  }

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
    logger.info(`Section "${targetHeading}" not found, creating new section at end of file`);
    let newContent = todayContent.endsWith("\n") ? todayContent : todayContent + "\n";
    newContent += `\n${targetHeading}\n` + items.join("\n") + "\n";
    logger.info(`Successfully created section and inserted ${items.length} items`);
    return newContent;
  }

  logger.info(`Found section "${targetHeading}" at line ${insertIndex}, inserting ${items.length} items`);

  // For callouts, skip over empty callout lines (just ">") to find the insertion point
  if (isCallout) {
    const startIndex = insertIndex;
    while (insertIndex < lines.length && lines[insertIndex].trim() === ">") {
      insertIndex++;
    }
    if (insertIndex !== startIndex) {
      logger.info(`Skipped ${insertIndex - startIndex} empty callout lines`);
    }
  }

  const beforeSkip = insertIndex;
  while (
    insertIndex < lines.length &&
    lines[insertIndex].trim() !== "" &&
    !lines[insertIndex].trim().match(/^#+\s/) &&
    !isCalloutHeader(lines[insertIndex].trim())
  ) {
    insertIndex++;
  }

  if (insertIndex !== beforeSkip) {
    logger.info(`Skipped ${insertIndex - beforeSkip} existing content lines, inserting at line ${insertIndex}`);
  }

  try {
    lines.splice(insertIndex, 0, ...items);
    logger.info(`Successfully inserted ${items.length} items at line ${insertIndex}`);
    return lines.join("\n");
  } catch (error) {
    logger.error(`Failed to insert items at line ${insertIndex}: ${error}`);
    return todayContent;
  }
}

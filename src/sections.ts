export function sectionHasContent(content: string, sectionHeading: string): boolean {
  const lines = content.split("\n");
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === sectionHeading.trim()) {
      inSection = true;
      continue;
    }
    if (inSection && line.trim().match(/^#+\s/)) return false;
    if (inSection && line.trim() !== "") return true;
  }
  return false;
}

export function extractUncheckedItems(content: string): string[] {
  const lines = content.split("\n");
  const unchecked: string[] = [];
  for (const line of lines) {
    if (line.trim().match(/^[-*+]\s+\[\s\]/)) unchecked.push(line);
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

  while (
    insertIndex < lines.length &&
    lines[insertIndex].trim() !== "" &&
    !lines[insertIndex].trim().match(/^#+\s/)
  ) {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, ...items);
  return lines.join("\n");
}

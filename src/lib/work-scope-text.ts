/** Zakres prac jako tekst z listą (kropki, numeracja, podpunkty) — zamiast osobnych pól per punkt. */

export interface WorkScopeLineItem {
  id: string;
  text: string;
  note: string;
}

export function scopeTextHasContent(text: string): boolean {
  return Boolean(text.trim());
}

export function scopeTextLineCount(text: string): number {
  return text.split("\n").filter((l) => l.trim()).length;
}

/** Stare raporty (punkty + opisy) → jeden blok tekstu. */
export function workItemsToScopeText(items: WorkScopeLineItem[]): string {
  const lines: string[] = [];
  for (const item of items) {
    const t = item.text.trim();
    if (!t) continue;
    const line = t.startsWith("•") || t.startsWith("-") || /^\d+\./.test(t) ? t : `• ${t}`;
    lines.push(line);
    if (item.note.trim()) lines.push(`  → ${item.note.trim()}`);
  }
  return lines.join("\n");
}

/** Tekst → punkty (kompatybilność email / stary kod). Każda linia = jeden punkt. */
export function scopeTextToWorkItems(text: string): WorkScopeLineItem[] {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .map((line) => ({
      id: crypto.randomUUID(),
      text: line,
      note: "",
    }));
}

export function getReportWorkScopeText(report: {
  workScopeText?: string;
  workItems?: WorkScopeLineItem[];
}): string {
  if (report.workScopeText?.trim()) return report.workScopeText;
  if (report.workItems?.length) return workItemsToScopeText(report.workItems);
  return "";
}

export function reportHasWorkScope(report: {
  workScopeText?: string;
  workItems?: WorkScopeLineItem[];
}): boolean {
  return scopeTextHasContent(getReportWorkScopeText(report));
}

/** Porządkuje wklejony tekst z Notatek, Worda, WhatsApp itd. */
export function normalizePastedScopeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .split("\n")
    .map((line) =>
      line
        .replace(/^(\s*)[•●○◦▪▫‣⁃·∙]\s*/u, "$1• ")
        .replace(/^(\s*)[-–—]\s+(?=\S)/u, "$1• ")
        .replace(/^(\s*)\*\s+/, "$1• ")
        .replace(/^(\s*)(\d+)[.)]\s+/, "$1$2. ")
        .replace(/^(\s*)->\s+/, "$1→ "),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

/** Wstaw prefiks listy w bieżącej linii (początek lub kursor). */
export function insertLinePrefix(value: string, cursor: number, prefix: string): { value: string; cursor: number } {
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = after.indexOf("\n");
  const lineBefore = before.slice(lineStart);
  const lineAfter = lineEnd === -1 ? after : after.slice(0, lineEnd);
  const rest = lineEnd === -1 ? "" : after.slice(lineEnd);
  const trimmed = (lineBefore + lineAfter).trimStart();
  const indent = (lineBefore + lineAfter).match(/^(\s*)/)?.[1] ?? "";
  const newLine = trimmed ? `${indent}${prefix}${trimmed}` : `${indent}${prefix}`;
  const newValue = before.slice(0, lineStart) + newLine + rest;
  const newCursor = lineStart + newLine.length;
  return { value: newValue, cursor: newCursor };
}

/** Enter — kontynuuj styl listy z poprzedniej linii. */
export function continueListOnNewLine(value: string, cursor: number): { value: string; cursor: number } | null {
  const before = value.slice(0, cursor);
  const lineStart = before.lastIndexOf("\n") + 1;
  const currentLine = before.slice(lineStart);

  const bullet = currentLine.match(/^(\s*)(•|\*|-)\s/);
  if (bullet) {
    const prefix = `${bullet[1]}• `;
    return insertAtCursor(value, cursor, `\n${prefix}`);
  }

  const numbered = currentLine.match(/^(\s*)(\d+)\.\s/);
  if (numbered) {
    const n = parseInt(numbered[2], 10) + 1;
    const prefix = `${numbered[1]}${n}. `;
    return insertAtCursor(value, cursor, `\n${prefix}`);
  }

  const arrow = currentLine.match(/^(\s*)(→|->)\s/);
  if (arrow) {
    const prefix = `${arrow[1]}→ `;
    return insertAtCursor(value, cursor, `\n${prefix}`);
  }

  const subBullet = currentLine.match(/^(\s{2,})(•|\*|-)\s/);
  if (subBullet) {
    const prefix = `${subBullet[1]}• `;
    return insertAtCursor(value, cursor, `\n${prefix}`);
  }

  return null;
}

function insertAtCursor(value: string, cursor: number, insert: string): { value: string; cursor: number } {
  const newValue = value.slice(0, cursor) + insert + value.slice(cursor);
  return { value: newValue, cursor: cursor + insert.length };
}

/** Nowa linia z wybranym prefiksem (przycisk na pustym polu lub na końcu). */
export function appendListLine(value: string, prefix: string): { value: string; cursor: number } {
  const trimmed = value.trimEnd();
  const base = trimmed ? `${trimmed}\n` : "";
  const newValue = `${base}${prefix}`;
  return { value: newValue, cursor: newValue.length };
}

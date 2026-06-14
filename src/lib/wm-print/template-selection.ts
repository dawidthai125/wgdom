import { getEnabledWmPrintTemplates } from "@/lib/wm-print/templates";
import type { WmPrintTemplate } from "@/lib/wm-print/types";

/** Wszystkie aktywne szablony — domyślna selekcja (P1.0.4). */
export function getDefaultWmPrintSelectedTemplateIds(templates: WmPrintTemplate[]): string[] {
  return getEnabledWmPrintTemplates(templates).map((t) => t.id);
}

export function createDefaultWmPrintTemplateSelection(templates: WmPrintTemplate[]): Set<string> {
  return new Set(getDefaultWmPrintSelectedTemplateIds(templates));
}

export function toggleWmPrintTemplateSelection(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function selectAllWmPrintTemplates(templates: WmPrintTemplate[]): Set<string> {
  return createDefaultWmPrintTemplateSelection(templates);
}

export function deselectAllWmPrintTemplates(): Set<string> {
  return new Set();
}

export function countWmPrintTemplateSelection(
  templates: WmPrintTemplate[],
  selected: Set<string> | Iterable<string>,
): { selected: number; total: number } {
  const enabled = getEnabledWmPrintTemplates(templates);
  const sel = selected instanceof Set ? selected : new Set(selected);
  const selectedCount = enabled.filter((t) => sel.has(t.id)).length;
  return { selected: selectedCount, total: enabled.length };
}

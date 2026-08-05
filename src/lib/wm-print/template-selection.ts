import {
  findActiveWmPrintOstTemplate,
  getEnabledWmPrintTemplates,
  isActiveWmPrintOstTemplate,
} from "@/lib/wm-print/templates";
import type { WmPrintTemplate } from "@/lib/wm-print/types";

/** Wszystkie aktywne szablony — domyślna selekcja (P1.0.4). */
export function getDefaultWmPrintSelectedTemplateIds(templates: WmPrintTemplate[]): string[] {
  return getEnabledWmPrintTemplates(templates).map((t) => t.id);
}

export function createDefaultWmPrintTemplateSelection(templates: WmPrintTemplate[]): Set<string> {
  return new Set(getDefaultWmPrintSelectedTemplateIds(templates));
}

/** S2 — ACTIVE OST zawsze w selekcji UI (checkbox locked). */
export function ensureActiveOstInWmPrintTemplateSelection(
  templates: WmPrintTemplate[],
  selected: Set<string>,
): Set<string> {
  const ost = findActiveWmPrintOstTemplate(getEnabledWmPrintTemplates(templates));
  if (!ost || selected.has(ost.id)) return selected;
  const next = new Set(selected);
  next.add(ost.id);
  return next;
}

export function toggleWmPrintTemplateSelection(
  selected: Set<string>,
  id: string,
  templates?: WmPrintTemplate[],
): Set<string> {
  if (templates) {
    const t = templates.find((x) => x.id === id);
    if (t && isActiveWmPrintOstTemplate(t)) return selected;
  }
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function selectAllWmPrintTemplates(templates: WmPrintTemplate[]): Set<string> {
  return createDefaultWmPrintTemplateSelection(templates);
}

export function deselectAllWmPrintTemplates(templates?: WmPrintTemplate[]): Set<string> {
  const empty = new Set<string>();
  if (!templates) return empty;
  return ensureActiveOstInWmPrintTemplateSelection(templates, empty);
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

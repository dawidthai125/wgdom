import { countWmPrintTemplateFiles, migrateWmPrintTemplate } from "@/lib/wm-print/templates";
import type { WmPrintTemplate } from "@/lib/wm-print/types";

export interface WmPrintCleanupEntry {
  id: string;
  name: string;
  filesCount: number;
  createdAt: string;
  updatedAt: string;
  reason: string;
}

export interface WmPrintCleanupPlan {
  keep: WmPrintCleanupEntry[];
  delete: WmPrintCleanupEntry[];
  keptTemplates: WmPrintTemplate[];
}

function templateSortKey(t: WmPrintTemplate): string {
  return t.createdAt || t.updatedAt || t.id;
}

function summarizeTemplate(t: WmPrintTemplate, reason: string): WmPrintCleanupEntry {
  const m = migrateWmPrintTemplate(t);
  return {
    id: m.id,
    name: (m.name || "").trim(),
    filesCount: countWmPrintTemplateFiles(m),
    createdAt: m.createdAt || "",
    updatedAt: m.updatedAt || "",
    reason,
  };
}

/**
 * P0 cleanup — KEEP: filesCount>0 lub najstarszy per name.
 * DELETE: filesCount===0 gdy istnieje starszy rekord tej samej nazwy.
 */
export function planWmPrintTemplateCleanup(templates: WmPrintTemplate[]): WmPrintCleanupPlan {
  const normalized = templates
    .filter((t) => !!t && typeof t.id === "string")
    .map((t) => migrateWmPrintTemplate(t));

  const byName = new Map<string, WmPrintTemplate[]>();
  const unnamed: WmPrintTemplate[] = [];

  for (const t of normalized) {
    const name = (t.name || "").trim();
    if (!name) {
      unnamed.push(t);
      continue;
    }
    const list = byName.get(name) ?? [];
    list.push(t);
    byName.set(name, list);
  }

  const keepIds = new Set<string>();
  const deleteIds = new Set<string>();

  for (const [name, group] of byName) {
    const sorted = [...group].sort((a, b) => templateSortKey(a).localeCompare(templateSortKey(b)));
    const oldest = sorted[0];
    keepIds.add(oldest.id);

    for (const t of group) {
      const files = countWmPrintTemplateFiles(t);
      if (files > 0) {
        keepIds.add(t.id);
        continue;
      }
      const idx = sorted.findIndex((x) => x.id === t.id);
      if (idx === 0) {
        keepIds.add(t.id);
        continue;
      }
      deleteIds.add(t.id);
    }
  }

  for (const t of unnamed) keepIds.add(t.id);

  for (const id of deleteIds) {
    if (keepIds.has(id)) deleteIds.delete(id);
  }

  const keep: WmPrintCleanupEntry[] = [];
  const del: WmPrintCleanupEntry[] = [];

  for (const t of normalized) {
    if (deleteIds.has(t.id)) {
      del.push(summarizeTemplate(t, "filesCount=0 + starszy rekord tej samej nazwy"));
    } else {
      const files = countWmPrintTemplateFiles(t);
      const name = (t.name || "").trim();
      const group = name ? (byName.get(name) ?? []) : [];
      const sorted = [...group].sort((a, b) => templateSortKey(a).localeCompare(templateSortKey(b)));
      const isOldest = sorted[0]?.id === t.id;
      const reason = files > 0 ? "filesCount>0" : isOldest ? "najstarszy per name" : "bez reguły DELETE";
      keep.push(summarizeTemplate(t, reason));
    }
  }

  for (const t of unnamed) {
    if (!keep.some((k) => k.id === t.id)) {
      keep.push(summarizeTemplate(t, "brak name — zachowaj"));
    }
  }

  const keptTemplates = normalized.filter((t) => !deleteIds.has(t.id));

  return {
    keep: keep.sort((a, b) => a.name.localeCompare(b.name) || a.createdAt.localeCompare(b.createdAt)),
    delete: del.sort((a, b) => a.name.localeCompare(b.name) || a.createdAt.localeCompare(b.createdAt)),
    keptTemplates,
  };
}

export function applyWmPrintTemplateCleanup(templates: WmPrintTemplate[]): WmPrintTemplate[] {
  return planWmPrintTemplateCleanup(templates).keptTemplates;
}

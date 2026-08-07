/**
 * GLOBAL-KNOWLEDGE-E1B — Identity ops (aliases · usable set). Pure.
 */

import { foldGlobalText } from "./canonical-id";
import { isLifecycleUsableForIdentity } from "./lifecycle";
import type { GlobalKnowledgeEntry, GlobalKnowledgeStore } from "./types";

/** Fold + trim + dedupe aliasów (kolejność zachowana). */
export function normalizeAliasList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const folded = foldGlobalText(String(item ?? ""));
    if (!folded || seen.has(folded)) continue;
    seen.add(folded);
    out.push(folded);
  }
  return out;
}

export function listUsableIdentity(
  store: GlobalKnowledgeStore | null | undefined,
): GlobalKnowledgeEntry[] {
  if (!store?.entries?.length) return [];
  return store.entries.filter((e) => isLifecycleUsableForIdentity(e.lifecycle));
}

/**
 * Lookup Identity po aliasie / namePl (fold).
 * Tylko usable (ACTIVE | DEPRECATED).
 */
export function lookupByAlias(
  store: GlobalKnowledgeStore | null | undefined,
  raw: string,
): GlobalKnowledgeEntry | null {
  const needle = foldGlobalText(raw);
  if (!needle) return null;
  for (const e of listUsableIdentity(store)) {
    if (foldGlobalText(e.namePl) === needle) return e;
    const aliases = e.aliases ?? [];
    for (const a of aliases) {
      if (foldGlobalText(a) === needle) return e;
    }
  }
  return null;
}

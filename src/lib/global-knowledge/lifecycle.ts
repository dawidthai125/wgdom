/**
 * GLOBAL-KNOWLEDGE-E1A — Lifecycle gates (pure).
 */

import type { GlobalKnowledgeEntry, GlobalKnowledgeLifecycle } from "./types";

export const GLOBAL_KNOWLEDGE_LIFECYCLES: readonly GlobalKnowledgeLifecycle[] = [
  "ACTIVE",
  "DEPRECATED",
  "SUPERSEDED",
  "OBSOLETE",
] as const;

export function isGlobalKnowledgeLifecycle(value: unknown): value is GlobalKnowledgeLifecycle {
  return (GLOBAL_KNOWLEDGE_LIFECYCLES as readonly string[]).includes(String(value));
}

/** Czy entry może brać udział w identity mapping (E1A — tylko reguły, bez wire). */
export function isLifecycleUsableForIdentity(lifecycle: GlobalKnowledgeLifecycle): boolean {
  return lifecycle === "ACTIVE" || lifecycle === "DEPRECATED";
}

export function isLifecycleObsolete(lifecycle: GlobalKnowledgeLifecycle): boolean {
  return lifecycle === "OBSOLETE";
}

export type LifecycleValidationCode =
  | "INVALID_LIFECYCLE"
  | "SUPERSEDED_REQUIRES_TARGET"
  | "SUPERSEDED_SELF_REF"
  | "OBSOLETE_HAS_SUPERSEDED_BY";

export function validateLifecycleFields(entry: {
  lifecycle: GlobalKnowledgeLifecycle;
  supersededBy?: string | null;
  globalId?: string;
}): { ok: boolean; codes: LifecycleValidationCode[] } {
  const codes: LifecycleValidationCode[] = [];
  if (!isGlobalKnowledgeLifecycle(entry.lifecycle)) {
    return { ok: false, codes: ["INVALID_LIFECYCLE"] };
  }
  const target = entry.supersededBy?.trim() || null;
  if (entry.lifecycle === "SUPERSEDED") {
    if (!target) codes.push("SUPERSEDED_REQUIRES_TARGET");
    if (target && entry.globalId && target === entry.globalId) codes.push("SUPERSEDED_SELF_REF");
  }
  if (entry.lifecycle === "OBSOLETE" && target) {
    codes.push("OBSOLETE_HAS_SUPERSEDED_BY");
  }
  return { ok: codes.length === 0, codes };
}

/** Follow SUPERSEDED → ACTIVE max 1 hop (pure; lista entries). */
export function resolveSupersededTarget(
  entry: GlobalKnowledgeEntry,
  entries: readonly GlobalKnowledgeEntry[],
): GlobalKnowledgeEntry | null {
  if (entry.lifecycle !== "SUPERSEDED" || !entry.supersededBy) return null;
  const next = entries.find((e) => e.globalId === entry.supersededBy) ?? null;
  if (!next) return null;
  if (next.lifecycle === "SUPERSEDED") return null; // DF: max 1 hop
  return next;
}

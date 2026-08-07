/**
 * GLOBAL-KNOWLEDGE-E1B — Collision policy Variant A (FROZEN).
 *
 * - brak existing globalId → INSERT
 * - ten sam globalId + ten sam contentHash → IDEMPOTENT NO-OP
 * - ten sam globalId + inny contentHash → REJECT
 * - nowa revision → nowy globalId (hash) → INSERT (osobna ścieżka naturalna)
 */

import type { GlobalKnowledgeEntry } from "./types";

export type CollisionAction = "insert" | "noop" | "reject";

export type CollisionRejectCode = "COLLISION_DIVERGENT_HASH";

export interface CollisionResult {
  action: CollisionAction;
  code?: CollisionRejectCode;
}

export function applyCollisionPolicy(
  existing: GlobalKnowledgeEntry | null | undefined,
  incoming: GlobalKnowledgeEntry,
): CollisionResult {
  if (!existing) return { action: "insert" };
  const a = existing.provenance.contentHash;
  const b = incoming.provenance.contentHash;
  if (a === b) return { action: "noop" };
  return { action: "reject", code: "COLLISION_DIVERGENT_HASH" };
}

export function findEntryByGlobalId(
  entries: readonly GlobalKnowledgeEntry[],
  globalId: string,
): GlobalKnowledgeEntry | undefined {
  return entries.find((e) => e.globalId === globalId);
}

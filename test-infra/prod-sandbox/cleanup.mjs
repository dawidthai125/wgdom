/**
 * TEST-HARNESS-01 H0 — Cleanup Guarantee
 *
 * Owner GO H0 names this rule **PSB-001 Cleanup Guarantee**:
 * every entity registered as created by the harness MUST be removed
 * after PASS and after FAIL. Cleanup failure → exit WARNING/FAIL + leftover list.
 *
 * Maps to Design Freeze D9 + #PSB-005 (cleanup is part of PASS).
 * DF table #PSB-001 ("Never touch") remains enforced by mutate-guard.mjs.
 */
import { isPsbId } from "./markers.mjs";

export const PSB_001_CLEANUP_GUARANTEE = "PSB-001";

/**
 * @typedef {{
 *   id: string,
 *   kind: string,
 *   cleanup: () => Promise<{ ok: boolean, detail?: string }> | { ok: boolean, detail?: string },
 * }} TrackedEntity
 */

/**
 * @typedef {{
 *   status: "PASS"|"FAIL"|"WARNING",
 *   code: typeof PSB_001_CLEANUP_GUARANTEE,
 *   cleaned: string[],
 *   leftovers: { id: string, kind: string, detail?: string }[],
 *   errors: string[],
 * }} CleanupResult
 */

export class CleanupTracker {
  constructor() {
    /** @type {Map<string, TrackedEntity>} */
    this.entities = new Map();
  }

  /**
   * Register a created entity + its cleaner. Prefer psb-* ids.
   * @param {TrackedEntity} entity
   */
  track(entity) {
    if (!entity?.id) throw new Error("PSB_CLEANUP_TRACK_INVALID: missing id");
    if (!isPsbId(entity.id)) {
      // Allow tracking only sandbox-marked IDs (hard safety)
      throw new Error(`PSB_CLEANUP_TRACK_DENIED: id must be psb-* (got ${entity.id})`);
    }
    if (typeof entity.cleanup !== "function") {
      throw new Error(`PSB_CLEANUP_TRACK_INVALID: cleanup fn required for ${entity.id}`);
    }
    this.entities.set(entity.id, {
      id: entity.id,
      kind: entity.kind || "other",
      cleanup: entity.cleanup,
    });
  }

  /** @param {string} id */
  untrack(id) {
    this.entities.delete(id);
  }

  listTracked() {
    return [...this.entities.values()].map(({ id, kind }) => ({ id, kind }));
  }

  /**
   * Run all cleaners (LIFO — children before parents when registered later).
   * Always attempts every remaining entity (best-effort), then reports leftovers.
   * @returns {Promise<CleanupResult>}
   */
  async runAll() {
    const cleaned = [];
    const leftovers = [];
    const errors = [];
    const ids = [...this.entities.keys()].reverse();

    for (const id of ids) {
      const ent = this.entities.get(id);
      if (!ent) continue;
      try {
        const result = await Promise.resolve(ent.cleanup());
        if (result && result.ok) {
          cleaned.push(id);
          this.entities.delete(id);
        } else {
          const detail = result?.detail || "cleanup returned ok:false";
          leftovers.push({ id, kind: ent.kind, detail });
          errors.push(`${id}: ${detail}`);
        }
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        leftovers.push({ id, kind: ent.kind, detail });
        errors.push(`${id}: ${detail}`);
      }
    }

    let status = /** @type {CleanupResult["status"]} */ ("PASS");
    if (leftovers.length > 0) {
      // Owner: WARNING or FAIL — FAIL when any leftover remains (strict H0)
      status = "FAIL";
    }

    return {
      status,
      code: PSB_001_CLEANUP_GUARANTEE,
      cleaned,
      leftovers,
      errors,
    };
  }
}

/**
 * Map cleanup result → process exit code (Design Freeze §6).
 * @param {CleanupResult} result
 * @param {"PASS"|"FAIL"|"WARNING"|string} scenarioStatus
 */
export function exitCodeForRun(scenarioStatus, result) {
  if (result.status === "FAIL" || result.leftovers.length > 0) return 4; // Cleanup FAIL
  if (scenarioStatus === "FAIL") return 3;
  if (scenarioStatus === "WARNING") return 0; // warnings non-blocking for H0 foundation
  return 0;
}

/**
 * TEST-HARNESS-01 H0.x — Bridge CleanupTracker ↔ Persist Ledger
 * Semantics DF §5.5 · #H0X-001/002
 */
import {
  ledgerUpsert,
  ledgerSetStatus,
  ledgerPrune,
  ledgerCloseAndPrune,
} from "./persist-ledger.mjs";
import { CleanupTracker } from "./cleanup.mjs";
import { defaultKvKeyForKind } from "./cleaner-registry.mjs";

/**
 * @typedef {{
 *   scenario: string,
 *   enabled: boolean,
 * }} LedgerBridgeCtx
 */

/**
 * Tracker that mirrors track/cleanup/untrack into the file ledger when enabled.
 */
export class LedgerCleanupTracker extends CleanupTracker {
  /**
   * @param {LedgerBridgeCtx} [ctx]
   */
  constructor(ctx) {
    super();
    this.ledgerCtx = ctx || { scenario: "unknown", enabled: false };
    /** @type {Map<string, { kind: string, kvKey: string, meta?: Record<string, unknown> }>} */
    this._ledgerMeta = new Map();
  }

  /**
   * @param {{
   *   id: string,
   *   kind: string,
   *   cleanup: Function,
   *   kvKey?: string,
   *   meta?: Record<string, unknown>,
   *   skipLedger?: boolean,
   * }} entity
   */
  track(entity) {
    super.track(entity);
    const kvKey = entity.kvKey || defaultKvKeyForKind(entity.kind);
    this._ledgerMeta.set(entity.id, {
      kind: entity.kind || "other",
      kvKey,
      meta: entity.meta,
    });
  }

  /**
   * pending BEFORE batch-set (call explicitly after track, or via markPending)
   * @param {string} id
   */
  async markPending(id) {
    if (!this.ledgerCtx.enabled) return;
    const meta = this._ledgerMeta.get(id);
    if (!meta) return;
    await ledgerUpsert({
      id,
      kind: meta.kind,
      kvKey: meta.kvKey,
      scenario: this.ledgerCtx.scenario,
      status: "pending",
      pid: process.pid,
      meta: meta.meta,
    });
  }

  /**
   * @param {string} id
   */
  async markOpen(id) {
    if (!this.ledgerCtx.enabled) return;
    const existing = this._ledgerMeta.get(id);
    if (!existing) return;
    // Ensure row exists (pending may have been skipped)
    await ledgerUpsert({
      id,
      kind: existing.kind,
      kvKey: existing.kvKey,
      scenario: this.ledgerCtx.scenario,
      status: "open",
      pid: process.pid,
      meta: existing.meta,
    });
  }

  /**
   * @param {string} id
   */
  async markWriteFailed(id) {
    if (!this.ledgerCtx.enabled) return;
    await ledgerPrune(id);
  }

  untrack(id) {
    super.untrack(id);
    this._ledgerMeta.delete(id);
  }

  /**
   * After successful in-scenario delete — prune ledger without waiting for runAll.
   * @param {string} id
   */
  async pruneLedger(id) {
    if (!this.ledgerCtx.enabled) return;
    await ledgerPrune(id);
    this._ledgerMeta.delete(id);
  }

  async runAll() {
    const ids = [...this.entities.keys()].reverse();
    if (this.ledgerCtx.enabled) {
      for (const id of ids) {
        try {
          await ledgerSetStatus(id, "cleaning");
        } catch {
          /* best-effort */
        }
      }
    }
    const result = await super.runAll();
    if (this.ledgerCtx.enabled) {
      for (const id of result.cleaned) {
        try {
          await ledgerCloseAndPrune(id);
        } catch {
          /* best-effort */
        }
        this._ledgerMeta.delete(id);
      }
    }
    return result;
  }
}

/**
 * Helper: track + pending in one step (before batch-set).
 * @param {LedgerCleanupTracker} cleanup
 * @param {{ id: string, kind: string, cleanup: Function, kvKey?: string, meta?: Record<string, unknown> }} entity
 */
export async function trackPending(cleanup, entity) {
  cleanup.track(entity);
  if (cleanup instanceof LedgerCleanupTracker) {
    await cleanup.markPending(entity.id);
  }
}

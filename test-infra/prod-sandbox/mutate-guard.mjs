/**
 * TEST-HARNESS-01 H0 — mutate guard (Design Freeze D8, #PSB-001 Never touch)
 */
import { isPsbId } from "./markers.mjs";
import { allowlistIdSet } from "./allowlist.mjs";

export class PsbMutateDeniedError extends Error {
  /**
   * @param {string} id
   * @param {string} [detail]
   */
  constructor(id, detail = "") {
    super(`PSB_MUTATE_DENIED: id=${id}${detail ? ` ${detail}` : ""}`);
    this.name = "PsbMutateDeniedError";
    this.code = "PSB_MUTATE_DENIED";
    this.entityId = id;
  }
}

/**
 * Tracks entities created in this harness run (session-created psb-*).
 */
export class SessionEntityRegistry {
  constructor() {
    /** @type {Map<string, { kind: string, createdAt: string, meta?: Record<string, unknown> }>} */
    this.created = new Map();
  }

  /**
   * @param {string} id
   * @param {string} [kind]
   * @param {Record<string, unknown>} [meta]
   */
  registerCreated(id, kind = "other", meta) {
    if (!isPsbId(id)) {
      throw new PsbMutateDeniedError(id, "(session create requires psb-* id)");
    }
    this.created.set(id, { kind, createdAt: new Date().toISOString(), meta });
  }

  /** @param {string} id */
  wasCreatedInThisRun(id) {
    return this.created.has(id);
  }

  /** @param {string} id */
  unregister(id) {
    this.created.delete(id);
  }

  listCreated() {
    return [...this.created.entries()].map(([id, info]) => ({ id, ...info }));
  }
}

/**
 * @param {{
 *   allowlist: import("./allowlist.mjs").PsbAllowlist,
 *   session: SessionEntityRegistry,
 *   dryRun?: boolean,
 * }} opts
 */
export function createMutateGuard(opts) {
  const allowIds = allowlistIdSet(opts.allowlist);

  /**
   * @param {{ id: string, kind?: string }} entity
   */
  function assertWritable(entity) {
    const id = entity?.id;
    if (!id || typeof id !== "string") {
      throw new PsbMutateDeniedError(String(id), "(missing id)");
    }
    if (allowIds.has(id)) return { ok: true, reason: "allowlist" };
    if (isPsbId(id) && opts.session.wasCreatedInThisRun(id)) {
      return { ok: true, reason: "session-created-psb" };
    }
    throw new PsbMutateDeniedError(
      id,
      `(not in allowlist and not session-created psb-*; kind=${entity.kind || "?"})`,
    );
  }

  /**
   * Dry-run: still validates, but caller must not perform side effects.
   * @param {{ id: string, kind?: string }} entity
   */
  function assertWritableOrDryRun(entity) {
    const result = assertWritable(entity);
    return { ...result, dryRun: !!opts.dryRun };
  }

  return { assertWritable, assertWritableOrDryRun, allowIds };
}

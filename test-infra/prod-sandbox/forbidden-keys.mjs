/**
 * TEST-HARNESS-01 H4 — FORBIDDEN write keys gate (D-H4 / DF §6.1)
 * Fail-loud before any batch-set. Does not duplicate kv-client.
 */

/** @type {ReadonlySet<string>} */
export const H4_FORBIDDEN_WRITE_KEYS = new Set([
  "kw-week-employees",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-archive",
  "kw-week-employees-deleted-ids",
  "kw-employee-leaves",
  "kw-employee-leaves-deleted-ids",
  "kw-admin-hash",
  "kw-admin-passwords",
  "kw-admin-users-config",
  "kw-app-settings",
  "kw-recoverable-charges",
  "kw-recoverable-charges-deleted-ids",
]);

/** Keys H4 may write (DF §6.3) */
export const H4_ALLOWED_WRITE_KEYS = new Set([
  "kw-tenders-pipeline",
  "kw-tenders-deleted-ids",
]);

export class H4ForbiddenKeyError extends Error {
  /**
   * @param {string} key
   */
  constructor(key) {
    super(`H4_FORBIDDEN_KEY: ${key}`);
    this.name = "H4ForbiddenKeyError";
    this.code = "H4_FORBIDDEN_KEY";
    this.key = key;
  }
}

/**
 * @param {string[]} keys
 */
export function assertH4KeysWritable(keys) {
  if (!Array.isArray(keys)) {
    throw new Error("H4_FORBIDDEN_KEY: keys must be an array");
  }
  for (const k of keys) {
    const key = String(k || "");
    if (H4_FORBIDDEN_WRITE_KEYS.has(key)) {
      throw new H4ForbiddenKeyError(key);
    }
    if (!H4_ALLOWED_WRITE_KEYS.has(key)) {
      throw new H4ForbiddenKeyError(key);
    }
  }
}

/**
 * Wrap kv-client so every batchSet is gated. Reuses same client methods.
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 */
export function wrapKvWithH4ForbiddenGate(kv) {
  return {
    base: kv.base,
    projectId: kv.projectId,
    batchGet: (keys) => kv.batchGet(keys),
    /**
     * @param {string[]} keys
     * @param {unknown[]} values
     */
    batchSet: async (keys, values) => {
      assertH4KeysWritable(keys);
      return kv.batchSet(keys, values);
    },
  };
}

/**
 * TEST-HARNESS-01 — FORBIDDEN write keys gate (H4 + H5)
 * Fail-loud before any batch-set. Does not duplicate kv-client.
 * Shared payroll/auth/billing base — slice-specific ALLOWED/FORBIDDEN.
 */

/** @type {ReadonlySet<string>} */
export const PSB_BASE_FORBIDDEN_WRITE_KEYS = new Set([
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

/** @type {ReadonlySet<string>} */
export const H4_FORBIDDEN_WRITE_KEYS = PSB_BASE_FORBIDDEN_WRITE_KEYS;

/** Keys H4 may write (DF §6.3) */
export const H4_ALLOWED_WRITE_KEYS = new Set([
  "kw-tenders-pipeline",
  "kw-tenders-deleted-ids",
]);

/** H5 extra deny (D-H5 / ARCH REVIEW) — cost-catalog REJECT + other PSB domains */
export const H5_FORBIDDEN_WRITE_KEYS = new Set([
  ...PSB_BASE_FORBIDDEN_WRITE_KEYS,
  "kw-wgdom-cost-catalog",
  "kw-wgdom-cost-catalog-history",
  "kw-wgdom-work-bundles",
  "kw-tenders-pipeline",
  "kw-tenders-deleted-ids",
  "kw-jobs",
  "kw-jobs-deleted-ids",
]);

/** Keys H5 may write (D-H5-01) */
export const H5_ALLOWED_WRITE_KEYS = new Set(["kw-wgdom-work-catalog"]);

export const WORK_CATALOG_KEY = "kw-wgdom-work-catalog";

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

export class H5ForbiddenKeyError extends Error {
  /**
   * @param {string} key
   */
  constructor(key) {
    super(`H5_FORBIDDEN_KEY: ${key}`);
    this.name = "H5ForbiddenKeyError";
    this.code = "H5_FORBIDDEN_KEY";
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
 * @param {string[]} keys
 */
export function assertH5KeysWritable(keys) {
  if (!Array.isArray(keys)) {
    throw new Error("H5_FORBIDDEN_KEY: keys must be an array");
  }
  for (const k of keys) {
    const key = String(k || "");
    if (H5_FORBIDDEN_WRITE_KEYS.has(key)) {
      throw new H5ForbiddenKeyError(key);
    }
    if (!H5_ALLOWED_WRITE_KEYS.has(key)) {
      throw new H5ForbiddenKeyError(key);
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

/**
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 */
export function wrapKvWithH5ForbiddenGate(kv) {
  return {
    base: kv.base,
    projectId: kv.projectId,
    batchGet: (keys) => kv.batchGet(keys),
    /**
     * @param {string[]} keys
     * @param {unknown[]} values
     */
    batchSet: async (keys, values) => {
      assertH5KeysWritable(keys);
      return kv.batchSet(keys, values);
    },
  };
}

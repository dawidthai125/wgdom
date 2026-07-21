/**
 * TEST-HARNESS-01 H0.x — Cleaner registry (D-H0X-15/16 · REUSE H1/H2/H4/H5)
 */
import { PIPELINE_KEY } from "./kv-client.mjs";
import { cleanupSandboxTender } from "./tender-helpers.mjs";
import { cleanupSandboxJob, JOBS_KEY } from "./job-helpers.mjs";
import {
  WORK_CATALOG_KEY,
  cleanupSandboxCatalogWork,
} from "./catalog-helpers.mjs";

export const H0X_SCAN_KEYS = [
  PIPELINE_KEY,
  JOBS_KEY,
  WORK_CATALOG_KEY,
];

/**
 * @param {string} id
 * @returns {"tender"|"cloud"|"job"|"catalog"|null}
 */
export function inferKindFromId(id) {
  const s = String(id || "");
  if (s.startsWith("psb-tender-")) return "tender";
  if (s.startsWith("psb-cloud-")) return "cloud";
  if (s.startsWith("psb-job-")) return "job";
  if (s.startsWith("psb-catalog-") || s.startsWith("psb-")) return "catalog";
  return null;
}

/**
 * @param {string} kind
 */
export function defaultKvKeyForKind(kind) {
  if (kind === "tender" || kind === "cloud") return PIPELINE_KEY;
  if (kind === "job") return JOBS_KEY;
  if (kind === "catalog") return WORK_CATALOG_KEY;
  return "";
}

/**
 * @param {{
 *   kind: string,
 *   id: string,
 *   kvKey?: string,
 *   kv: { batchGet: Function, batchSet: Function },
 *   dryRun?: boolean,
 *   assertWritable: (e: { id: string, kind?: string }) => unknown,
 *   meta?: Record<string, unknown>,
 * }} ctx
 */
export async function runCleaner(ctx) {
  const kind = String(ctx.kind || "");
  const id = String(ctx.id || "");
  const dryRun = !!ctx.dryRun;
  const assertWritable = ctx.assertWritable;

  if (kind === "other") {
    return { ok: true, detail: "other/no-kv" };
  }

  if (kind === "tender" || kind === "cloud") {
    return cleanupSandboxTender(ctx.kv, id, { dryRun, assertWritable });
  }
  if (kind === "job") {
    return cleanupSandboxJob(ctx.kv, id, { dryRun, assertWritable });
  }
  if (kind === "catalog") {
    return cleanupSandboxCatalogWork(ctx.kv, id, { dryRun, assertWritable });
  }

  throw new Error(`PSB_H0X_UNKNOWN_KIND: ${kind} (id=${id})`);
}

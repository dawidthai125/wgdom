/**
 * TEST-HARNESS-01 H0 — allowlist loader (Design Freeze D7)
 *
 * Sources (merged, later wins for scalars):
 * 1. allowlist.example.json shape via PSB_ALLOWLIST_PATH or local allowlist.json
 * 2. Env: PSB_JOB_IDS, PSB_TENDER_IDS, PSB_CATALOG_ROW_IDS, PSB_PAYROLL_WEEK_ID
 *
 * allowlist.json is gitignored (local secrets / prod IDs).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join, isAbsolute } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @typedef {{
 *   jobIds: string[],
 *   tenderIds: string[],
 *   catalogRowIds: string[],
 *   payrollWeekId: string | null,
 *   sources: string[],
 * }} PsbAllowlist */

function splitCsv(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function uniq(arr) {
  return [...new Set(arr.filter((x) => typeof x === "string" && x.length > 0))];
}

/**
 * @param {string} [explicitPath]
 * @returns {PsbAllowlist}
 */
export function loadAllowlist(explicitPath) {
  /** @type {PsbAllowlist} */
  const out = {
    jobIds: [],
    tenderIds: [],
    catalogRowIds: [],
    payrollWeekId: null,
    sources: [],
  };

  const candidates = [];
  if (explicitPath) candidates.push(explicitPath);
  if (process.env.PSB_ALLOWLIST_PATH) candidates.push(process.env.PSB_ALLOWLIST_PATH);
  candidates.push(join(__dirname, "allowlist.json"));

  for (const cand of candidates) {
    const abs = isAbsolute(cand) ? cand : join(process.cwd(), cand);
    if (!existsSync(abs)) continue;
    try {
      const raw = JSON.parse(readFileSync(abs, "utf8"));
      out.jobIds.push(...(raw.jobIds || raw.PSB_JOB_IDS || []));
      out.tenderIds.push(...(raw.tenderIds || raw.PSB_TENDER_IDS || []));
      out.catalogRowIds.push(...(raw.catalogRowIds || raw.PSB_CATALOG_ROW_IDS || []));
      if (raw.payrollWeekId || raw.PSB_PAYROLL_WEEK_ID) {
        out.payrollWeekId = String(raw.payrollWeekId || raw.PSB_PAYROLL_WEEK_ID);
      }
      out.sources.push(abs);
      break; // first existing file wins as base
    } catch (e) {
      throw new Error(`PSB_ALLOWLIST_INVALID: ${abs}: ${e instanceof Error ? e.message : e}`);
    }
  }

  out.jobIds.push(...splitCsv(process.env.PSB_JOB_IDS));
  out.tenderIds.push(...splitCsv(process.env.PSB_TENDER_IDS));
  out.catalogRowIds.push(...splitCsv(process.env.PSB_CATALOG_ROW_IDS));
  if (process.env.PSB_PAYROLL_WEEK_ID) {
    out.payrollWeekId = process.env.PSB_PAYROLL_WEEK_ID.trim() || null;
    out.sources.push("env:PSB_PAYROLL_WEEK_ID");
  }
  if (process.env.PSB_JOB_IDS) out.sources.push("env:PSB_JOB_IDS");
  if (process.env.PSB_TENDER_IDS) out.sources.push("env:PSB_TENDER_IDS");
  if (process.env.PSB_CATALOG_ROW_IDS) out.sources.push("env:PSB_CATALOG_ROW_IDS");

  out.jobIds = uniq(out.jobIds);
  out.tenderIds = uniq(out.tenderIds);
  out.catalogRowIds = uniq(out.catalogRowIds);
  if (out.sources.length === 0) out.sources.push("(empty)");

  return out;
}

/**
 * @param {PsbAllowlist} allowlist
 * @param {string} id
 * @param {"job"|"tender"|"catalog"|"payroll_week"|"any"} [kind]
 */
export function isAllowlisted(allowlist, id, kind = "any") {
  if (!id || typeof id !== "string") return false;
  if (kind === "job" || kind === "any") {
    if (allowlist.jobIds.includes(id)) return true;
  }
  if (kind === "tender" || kind === "any") {
    if (allowlist.tenderIds.includes(id)) return true;
  }
  if (kind === "catalog" || kind === "any") {
    if (allowlist.catalogRowIds.includes(id)) return true;
  }
  if (kind === "payroll_week" || kind === "any") {
    if (allowlist.payrollWeekId && allowlist.payrollWeekId === id) return true;
  }
  return false;
}

/**
 * Flat set of all allowlisted IDs (for mutate-guard).
 * @param {PsbAllowlist} allowlist
 */
export function allowlistIdSet(allowlist) {
  const s = new Set([
    ...allowlist.jobIds,
    ...allowlist.tenderIds,
    ...allowlist.catalogRowIds,
  ]);
  if (allowlist.payrollWeekId) s.add(allowlist.payrollWeekId);
  return s;
}

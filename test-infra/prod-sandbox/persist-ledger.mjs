/**
 * TEST-HARNESS-01 H0.x — Persist Ledger (file-backed open-set)
 * DF: D-H0X-03/06/07/08/09 · #H0X-002/011
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { isPsbId } from "./markers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

export const H0X_SCHEMA_VERSION = 1;
export const H0X_OUT_DIR = join(ROOT, ".tmp", "prod-sandbox-out");
export const H0X_LEDGER_PATH = join(H0X_OUT_DIR, "h0x-open-entities.json");

/** @typedef {"pending"|"open"|"cleaning"|"closed"} LedgerStatus */

/**
 * @typedef {{
 *   id: string,
 *   kind: "tender"|"cloud"|"job"|"catalog"|"other"|string,
 *   kvKey: string,
 *   scenario: string,
 *   status: LedgerStatus,
 *   createdAt: string,
 *   updatedAt: string,
 *   pid?: number,
 *   meta?: Record<string, unknown>,
 * }} LedgerEntity
 */

/**
 * @typedef {{
 *   schemaVersion: number,
 *   updatedAt: string,
 *   entities: LedgerEntity[],
 * }} LedgerDoc
 */

export function getLedgerPath() {
  return H0X_LEDGER_PATH;
}

function emptyDoc() {
  return {
    schemaVersion: H0X_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    entities: /** @type {LedgerEntity[]} */ ([]),
  };
}

/**
 * @returns {Promise<LedgerDoc>}
 */
export async function loadLedger() {
  const path = H0X_LEDGER_PATH;
  if (!existsSync(path)) return emptyDoc();
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw new Error(
      `PSB_H0X_LEDGER_CORRUPT: read failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `PSB_H0X_LEDGER_CORRUPT: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entities)) {
    throw new Error("PSB_H0X_LEDGER_CORRUPT: invalid shape");
  }
  return {
    schemaVersion: Number(parsed.schemaVersion) || H0X_SCHEMA_VERSION,
    updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    entities: parsed.entities,
  };
}

/**
 * @param {LedgerDoc} doc
 */
export async function saveLedgerAtomic(doc) {
  mkdirSync(H0X_OUT_DIR, { recursive: true });
  const next = {
    schemaVersion: H0X_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    entities: Array.isArray(doc.entities) ? doc.entities : [],
  };
  const tmp = `${H0X_LEDGER_PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
  renameSync(tmp, H0X_LEDGER_PATH);
}

/**
 * @param {Omit<LedgerEntity, "createdAt"|"updatedAt"|"status"> & { status?: LedgerStatus }} entity
 */
export async function ledgerUpsert(entity) {
  if (!entity?.id || !isPsbId(entity.id)) {
    throw new Error(`PSB_H0X_LEDGER_DENIED: id must be psb-* (got ${entity?.id})`);
  }
  const now = new Date().toISOString();
  const doc = await loadLedger();
  const idx = doc.entities.findIndex((e) => e.id === entity.id);
  /** @type {LedgerEntity} */
  const row = {
    id: entity.id,
    kind: entity.kind || "other",
    kvKey: entity.kvKey || "",
    scenario: entity.scenario || "unknown",
    status: entity.status || "pending",
    createdAt: idx >= 0 ? doc.entities[idx].createdAt : now,
    updatedAt: now,
    pid: entity.pid ?? process.pid,
    meta: entity.meta,
  };
  if (idx >= 0) doc.entities[idx] = { ...doc.entities[idx], ...row };
  else doc.entities.push(row);
  await saveLedgerAtomic(doc);
  return row;
}

/**
 * @param {string} id
 * @param {LedgerStatus} status
 */
export async function ledgerSetStatus(id, status) {
  const doc = await loadLedger();
  const idx = doc.entities.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  doc.entities[idx] = {
    ...doc.entities[idx],
    status,
    updatedAt: new Date().toISOString(),
  };
  await saveLedgerAtomic(doc);
  return doc.entities[idx];
}

/**
 * @param {string} id
 */
export async function ledgerPrune(id) {
  const doc = await loadLedger();
  const before = doc.entities.length;
  doc.entities = doc.entities.filter((e) => e.id !== id);
  if (doc.entities.length !== before) await saveLedgerAtomic(doc);
}

/**
 * @returns {Promise<LedgerEntity[]>}
 */
export async function ledgerListRecoverable() {
  const doc = await loadLedger();
  return doc.entities
    .filter((e) => e && ["pending", "open", "cleaning"].includes(e.status))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/**
 * closed → prune synchronously (D-H0X-26)
 * @param {string} id
 */
export async function ledgerCloseAndPrune(id) {
  await ledgerSetStatus(id, "closed");
  await ledgerPrune(id);
}

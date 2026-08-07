/**
 * GLOBAL-KNOWLEDGE — Empty Identity Store + normalize + internal persist.
 * E1B: saveLocal = persistGlobalKnowledgeStoreLocal — NIE eksportować z index (AR-C2).
 */

import { normalizeAliasList, listUsableIdentity } from "./identity-ops";
import { createOwnerManualLicence } from "./legal-gate";
import { isGlobalKnowledgeLifecycle } from "./lifecycle";
import {
  GLOBAL_KNOWLEDGE_SCHEMA_VERSION,
  GLOBAL_KNOWLEDGE_STORAGE_KEY,
  type GlobalKnowledgeAllowedUse,
  type GlobalKnowledgeConfidence,
  type GlobalKnowledgeEntry,
  type GlobalKnowledgeEntryKind,
  type GlobalKnowledgeLicenceRecord,
  type GlobalKnowledgeProvenance,
  type GlobalKnowledgeStore,
} from "./types";

const KINDS: GlobalKnowledgeEntryKind[] = [
  "norm",
  "technology",
  "material",
  "pack_ref",
  "other",
];
const CONF: GlobalKnowledgeConfidence[] = ["high", "medium", "low"];
const USES: GlobalKnowledgeAllowedUse[] = ["identity", "lexicon", "graph", "indicative_rate"];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeProvenance(raw: unknown): GlobalKnowledgeProvenance | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const licenceId = asString(o.licenceId).trim();
  const originId = asString(o.originId).trim();
  const importedBy = asString(o.importedBy).trim();
  const contentHash = asString(o.contentHash).trim();
  const importedAt = asString(o.importedAt).trim() || new Date(0).toISOString();
  const allowedUse = Array.isArray(o.allowedUse)
    ? o.allowedUse.filter((u): u is GlobalKnowledgeAllowedUse =>
        USES.includes(u as GlobalKnowledgeAllowedUse),
      )
    : [];
  if (!licenceId || !originId || !importedBy || !contentHash) return null;
  return {
    originId,
    licenceId,
    sourceFilename: o.sourceFilename == null ? null : asString(o.sourceFilename),
    importedAt,
    importedBy,
    contentHash,
    allowedUse,
  };
}

function normalizeEntry(raw: unknown): GlobalKnowledgeEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const globalId = asString(o.globalId).trim();
  const kind = o.kind as GlobalKnowledgeEntryKind;
  const namePl = asString(o.namePl).trim();
  const lifecycle = o.lifecycle;
  const confidence = o.confidence as GlobalKnowledgeConfidence;
  const revision = asString(o.revision).trim() || "1";
  const validFrom = asString(o.validFrom).trim() || new Date(0).toISOString();
  const provenance = normalizeProvenance(o.provenance);
  if (!globalId || !namePl || !provenance) return null;
  if (!KINDS.includes(kind)) return null;
  if (!isGlobalKnowledgeLifecycle(lifecycle)) return null;
  if (!CONF.includes(confidence)) return null;
  return {
    globalId,
    kind,
    namePl,
    unit: o.unit == null ? null : asString(o.unit),
    normCode: o.normCode == null ? null : asString(o.normCode),
    aliases: normalizeAliasList(o.aliases),
    lifecycle,
    supersededBy: o.supersededBy == null ? null : asString(o.supersededBy),
    confidence,
    revision,
    validFrom,
    validTo: o.validTo == null ? null : asString(o.validTo),
    provenance,
  };
}

function normalizeLicence(raw: unknown): GlobalKnowledgeLicenceRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const licenceId = asString(o.licenceId).trim();
  const labelPl = asString(o.labelPl).trim();
  if (!licenceId || !labelPl) return null;
  return {
    licenceId,
    labelPl,
    originsAllowed: Array.isArray(o.originsAllowed)
      ? o.originsAllowed.map((x) => String(x))
      : [],
    allowedUse: Array.isArray(o.allowedUse)
      ? o.allowedUse.filter((u): u is GlobalKnowledgeAllowedUse =>
          USES.includes(u as GlobalKnowledgeAllowedUse),
        )
      : [],
    active: o.active !== false,
    validTo: o.validTo == null ? null : asString(o.validTo),
    notes: o.notes == null ? null : asString(o.notes),
  };
}

/** Pusty store z licencją Owner (foundation) — 0 entries = NO-OP danych. */
export function createEmptyGlobalKnowledgeStore(opts?: {
  contentVersion?: string;
  includeOwnerLicence?: boolean;
}): GlobalKnowledgeStore {
  const includeOwnerLicence = opts?.includeOwnerLicence !== false;
  return {
    schemaVersion: GLOBAL_KNOWLEDGE_SCHEMA_VERSION,
    contentVersion: opts?.contentVersion ?? "0.0.0-empty",
    licences: includeOwnerLicence ? [createOwnerManualLicence()] : [],
    entries: [],
    updatedAt: null,
  };
}

export function isGlobalKnowledgeStoreEmpty(store: GlobalKnowledgeStore): boolean {
  return !store.entries || store.entries.length === 0;
}

/**
 * NO-OP guard — true gdy brak usable Identity (ACTIVE|DEPRECATED).
 * Licencje / OBSOLETE mogą istnieć bez wpływu na wycenę.
 */
export function isGlobalKnowledgeNoOp(store: GlobalKnowledgeStore | null | undefined): boolean {
  if (!store) return true;
  return listUsableIdentity(store).length === 0;
}

export function normalizeGlobalKnowledgeStore(raw: unknown): GlobalKnowledgeStore {
  if (!raw || typeof raw !== "object") {
    return createEmptyGlobalKnowledgeStore();
  }
  const o = raw as Record<string, unknown>;
  const licences = Array.isArray(o.licences)
    ? o.licences.map(normalizeLicence).filter((x): x is GlobalKnowledgeLicenceRecord => !!x)
    : [];
  const entries = Array.isArray(o.entries)
    ? o.entries.map(normalizeEntry).filter((x): x is GlobalKnowledgeEntry => !!x)
    : [];
  const schemaVersion =
    typeof o.schemaVersion === "number" ? o.schemaVersion : GLOBAL_KNOWLEDGE_SCHEMA_VERSION;
  return {
    schemaVersion,
    contentVersion: asString(o.contentVersion).trim() || "0.0.0-empty",
    licences: licences.length ? licences : [createOwnerManualLicence()],
    entries,
    updatedAt: o.updatedAt == null ? null : asString(o.updatedAt),
  };
}

/** Opcjonalny odczyt LS — nie używany przez App w E1B (NO-OP wyceny). */
export function loadGlobalKnowledgeStoreLocal(): GlobalKnowledgeStore {
  if (typeof localStorage === "undefined") return createEmptyGlobalKnowledgeStore();
  try {
    const raw = localStorage.getItem(GLOBAL_KNOWLEDGE_STORAGE_KEY);
    if (!raw) return createEmptyGlobalKnowledgeStore();
    return normalizeGlobalKnowledgeStore(JSON.parse(raw));
  } catch {
    return createEmptyGlobalKnowledgeStore();
  }
}

/** Bump contentVersion przy mutacji (additive schemaVersion=1). */
export function bumpContentVersion(prev: string, nowIso: string): string {
  const base = String(prev || "").trim() || "0.0.0-empty";
  return `1.e1b.${base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 24)}.${nowIso}`;
}

/**
 * Internal saveLocal (AR-C2) — NIE re-eksportować z public index.
 * Normalize before write.
 */
export function persistGlobalKnowledgeStoreLocal(store: GlobalKnowledgeStore): void {
  if (typeof localStorage === "undefined") return;
  const next = normalizeGlobalKnowledgeStore(store);
  localStorage.setItem(GLOBAL_KNOWLEDGE_STORAGE_KEY, JSON.stringify(next));
}

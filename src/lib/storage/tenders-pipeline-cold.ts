/**
 * LOCALSTORAGE-ARCH-02 C — lean pipeline w LS + full cold w IndexedDB.
 *
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 Phase 1 — NEW-01: IDB FULL envelope v1
 * (Design Freeze v1.1 §1). Adapter `storage-idb.ts` bez zmian; klucz `tenders-pipeline-full`
 * bez zmian. LEGACY_ARRAY (surowa tablica) nadal czytelna; envelope zapisywany przy
 * pierwszym zapisie (§8.3). INDEX (`_lsIndex`) nigdy nie jest FULL (§A.6 D backstop).
 *
 * Phase 2 — NEW-02: `buildTenderPipelineLsIndex` (DF §2.2–§2.3) — czysta projekcja FULL → INDEX
 * przez jawny allow-list. Kierunek odwrotny (INDEX → FULL) nie istnieje (PIPELINE-NO-CONVERSION-01).
 *
 * Phase 3 — `detectPipelineLsKind` (DF §2.4): klasyfikacja surowego LS (INDEX / LEGACY_* / EMPTY /
 * MISSING / CORRUPT) dla `resolvePipelineFullSource()` (tenders-bzp.ts, §A.5.2). Dual-write orkiestruje
 * canonical writer `saveTendersPipelineLocal` (tenders-bzp.ts) — ten moduł pozostaje jedynym IDB writerem.
 *
 * Phase 7 — NEW-06: `evaluatePipelineIndexBudget` (DF §7 B) — per-key budżet INDEX (MEASURE → WARN →
 * BLOCK). BLOCK pomija `setItem`; envelope FULL w IDB pozostaje durable (PIPELINE-QUOTA-01).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPipelineGuardV1 } from "@/lib/tender-pipeline/tender-pipeline-guard";
import type { IkG3FinalBidRecord } from "@/lib/intelligent-estimator/ik-g3-final-bid";
import type { TenderAwardResult } from "@/lib/tenders-bzp-award";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { idbGet, idbSet } from "@/lib/storage/storage-idb";
import { PIPELINE_INDEX_LS_BLOCK, PIPELINE_INDEX_LS_WARN } from "@/lib/storage/storage-budget";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";
import {
  classifyPipelineRepresentation,
  hasLsIndexMarker,
  PipelineIndexNotFullError,
  setPipelineFullAvailability,
} from "@/lib/tender-pipeline/tender-pipeline-representation";

export const PIPELINE_COLD_IDB_KEY = "tenders-pipeline-full";

// ---------------------------------------------------------------------------
// NEW-01 — envelope type (§1.1)
// ---------------------------------------------------------------------------

export const PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION = 1 as const;

export interface TenderPipelineIdbEnvelopeV1 {
  schemaVersion: typeof PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION;
  /** Ostatni widziany cloud guard.bundleRevision (0 = nigdy). Nie rośnie offline. */
  bundleRevision: number;
  /** Monotoniczna sekwencja zapisu per device (++ na każdy zapis canonical writera). */
  localSeq: number;
  /** items.length — bez filtrowania tombstonów. */
  itemCount: number;
  /** ISO */
  writtenAt: string;
  /** max(items[].updatedAt) lub "" gdy brak. */
  maxUpdatedAt: string;
  items: TenderPipelineItem[];
  deletedIdsRevision?: string;
  appVersion?: string;
  writer?: string;
}

// ---------------------------------------------------------------------------
// Parser / validation (§1.3) — validity ≠ freshness
// ---------------------------------------------------------------------------

export type PipelineIdbReadStatus = "OK" | "MISSING" | "LEGACY_ARRAY" | "CORRUPT";

export type PipelineIdbCorruptReason =
  | "schema_version"
  | "items_not_array"
  | "item_count_mismatch"
  | "item_without_id"
  | "duplicate_id"
  | "item_index_marker"
  | "seq_not_finite"
  | "parse_failed";

export interface PipelineIdbReadResult {
  status: PipelineIdbReadStatus;
  /** OK → envelope; LEGACY_ARRAY → envelope syntetyczny (localSeq 0, bundleRevision 0, writtenAt "", writer "legacy_array"). */
  envelope: TenderPipelineIdbEnvelopeV1 | null;
  reason?: PipelineIdbCorruptReason;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasValidId(item: unknown): item is { id: string } {
  return isRecord(item) && typeof item.id === "string" && item.id !== "";
}

function computeMaxUpdatedAt(items: readonly unknown[]): string {
  let max = "";
  for (const item of items) {
    if (!isRecord(item)) continue;
    const u = item.updatedAt;
    if (typeof u === "string" && u > max) max = u;
  }
  return max;
}

/** Wspólna walidacja kolekcji items: id · duplikaty · marker INDEX (backstop PIPELINE-INDEX-01). */
function validateItemsCollection(items: unknown[]): PipelineIdbCorruptReason | null {
  const seen = new Set<string>();
  for (const item of items) {
    if (!hasValidId(item)) return "item_without_id";
    if (seen.has(item.id)) return "duplicate_id";
    seen.add(item.id);
  }
  if (hasLsIndexMarker(items)) return "item_index_marker";
  return null;
}

export function parsePipelineIdbEnvelope(raw: unknown): PipelineIdbReadResult {
  if (raw == null) return { status: "MISSING", envelope: null };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!hasValidId(item)) return { status: "CORRUPT", envelope: null, reason: "item_without_id" };
    }
    // INDEX nigdy nie jest LEGACY_FULL (§A.4, §A.6 D).
    if (hasLsIndexMarker(raw)) return { status: "CORRUPT", envelope: null, reason: "item_index_marker" };
    const items = raw as TenderPipelineItem[];
    return {
      status: "LEGACY_ARRAY",
      envelope: {
        schemaVersion: PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION,
        bundleRevision: 0,
        localSeq: 0,
        itemCount: items.length,
        writtenAt: "",
        maxUpdatedAt: computeMaxUpdatedAt(items),
        items,
        writer: "legacy_array",
      },
    };
  }

  if (!isRecord(raw)) return { status: "CORRUPT", envelope: null, reason: "parse_failed" };
  if (raw.schemaVersion !== PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION) {
    return { status: "CORRUPT", envelope: null, reason: "schema_version" };
  }
  if (!Array.isArray(raw.items)) return { status: "CORRUPT", envelope: null, reason: "items_not_array" };
  if (raw.items.length !== raw.itemCount) {
    return { status: "CORRUPT", envelope: null, reason: "item_count_mismatch" };
  }
  const collectionReason = validateItemsCollection(raw.items);
  if (collectionReason) return { status: "CORRUPT", envelope: null, reason: collectionReason };

  const localSeq = raw.localSeq;
  const bundleRevision = raw.bundleRevision;
  if (
    typeof localSeq !== "number" || !Number.isFinite(localSeq) || localSeq < 0 ||
    typeof bundleRevision !== "number" || !Number.isFinite(bundleRevision)
  ) {
    return { status: "CORRUPT", envelope: null, reason: "seq_not_finite" };
  }

  const envelope: TenderPipelineIdbEnvelopeV1 = {
    schemaVersion: PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION,
    bundleRevision,
    localSeq,
    itemCount: raw.items.length,
    writtenAt: typeof raw.writtenAt === "string" ? raw.writtenAt : "",
    maxUpdatedAt: typeof raw.maxUpdatedAt === "string" ? raw.maxUpdatedAt : computeMaxUpdatedAt(raw.items),
    items: raw.items as TenderPipelineItem[],
  };
  if (typeof raw.deletedIdsRevision === "string") envelope.deletedIdsRevision = raw.deletedIdsRevision;
  if (typeof raw.appVersion === "string") envelope.appVersion = raw.appVersion;
  if (typeof raw.writer === "string") envelope.writer = raw.writer;
  return { status: "OK", envelope };
}

// ---------------------------------------------------------------------------
// Freshness (§1.4) — STALE nigdy nie odrzuca FULL
// ---------------------------------------------------------------------------

export type PipelineIdbFreshness =
  | "FRESH"
  | "NO_REFERENCE"
  | "STALE_REVISION"
  | "STALE_UPDATED_AT"
  | "SUBSET_MISSING_IDS";

const FRESHNESS_MISSING_IDS_CAP = 50;

export function evaluatePipelineIdbFreshness(
  env: TenderPipelineIdbEnvelopeV1,
  guard: TenderPipelineGuardV1 | null,
  deletedIds: Iterable<string>,
): { freshness: PipelineIdbFreshness; missingIds: string[] } {
  if (guard == null) return { freshness: "NO_REFERENCE", missingIds: [] };
  if (env.bundleRevision < guard.bundleRevision) return { freshness: "STALE_REVISION", missingIds: [] };

  const envIds = new Set<string>();
  for (const item of env.items) envIds.add(String(item.id));
  const deleted = new Set<string>();
  for (const id of deletedIds) deleted.add(String(id));

  const missingIds: string[] = [];
  let guardMaxUpdatedAt = "";
  for (const g of guard.items) {
    const id = String(g.id);
    if (!envIds.has(id) && !deleted.has(id) && missingIds.length < FRESHNESS_MISSING_IDS_CAP) {
      missingIds.push(id);
    }
    const u = String(g.updatedAt ?? "");
    if (u > guardMaxUpdatedAt) guardMaxUpdatedAt = u;
  }
  if (missingIds.length > 0) return { freshness: "SUBSET_MISSING_IDS", missingIds };
  if (guardMaxUpdatedAt > env.maxUpdatedAt) return { freshness: "STALE_UPDATED_AT", missingIds: [] };
  return { freshness: "FRESH", missingIds: [] };
}

// ---------------------------------------------------------------------------
// Validate FULL for write (§3.1 — czysta funkcja; Phase 3 writer REUSE)
// ---------------------------------------------------------------------------

export type PipelineFullValidationReason =
  | "not_array"
  | "item_not_object"
  | "item_without_id"
  | "duplicate_id"
  | "index_not_full";

export function validatePipelineFullForWrite(
  items: unknown,
): { ok: true } | { ok: false; reason: PipelineFullValidationReason } {
  if (!Array.isArray(items)) return { ok: false, reason: "not_array" };
  // Marker INDEX sprawdzany jako pierwszy: INDEX nigdy nie jest FULL, niezależnie od reszty kształtu.
  if (hasLsIndexMarker(items)) return { ok: false, reason: "index_not_full" };
  const seen = new Set<string>();
  for (const item of items) {
    if (!isRecord(item)) return { ok: false, reason: "item_not_object" };
    if (!hasValidId(item)) return { ok: false, reason: "item_without_id" };
    if (seen.has(item.id)) return { ok: false, reason: "duplicate_id" };
    seen.add(item.id);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// NEW-02 — INDEX (DF §2.2 / §2.3): hot LS representation, lean, regenerowalna, NIGDY FULL.
// Kierunek WYŁĄCZNIE FULL → INDEX. Brak jakiejkolwiek funkcji INDEX → FULL w tym module.
// ---------------------------------------------------------------------------

export interface TenderPipelineLsIndexMarker {
  v: 1;
  /** `envelope.localSeq`, z którym INDEX został zbudowany (DF §2.3, §2.4). */
  seq: number;
}

export type TenderPipelineIndexItemV1 =
  Pick<
    TenderPipelineItem,
    | "id" | "updatedAt" | "title" | "status" | "submittingOffersDate" | "publicationDate"
    | "organizationName" | "organizationCity" | "organizationProvince" | "cpvCode" | "tenderId" | "bzpNumber"
    | "relevanceScore" | "matchedKeywords" | "isWroclaw" | "priorityBuyerId" | "priorityBuyerLabel" | "addedAt"
  > & {
    ikFinalBid: IkG3FinalBidRecord | null;
    linkedJobId: string | null;
    ourEstimatePln: number | null;
    tenderState: string | null;
    awardResult: Pick<TenderAwardResult, "isUs" | "fetchedAt"> | null;
    tenderFit: Pick<TenderFitAssessment, "fitLabel" | "winChancePct"> | null;
    swzAnalysis: Pick<
      TenderSwzAnalysis,
      "profitabilityHint" | "estimatedValuePln" | "estimatedValueRaw" | "implementationDays"
      | "wadiumPercent" | "wadiumPln" | "wadiumRaw"
    > | null;
    _lsIndex: TenderPipelineLsIndexMarker;
  };

/** LS value = tablica (kompatybilność old client `Array.isArray`); brak envelope/meta w LS (DF §2.3). */
export type TenderPipelineIndexCollectionV1 = TenderPipelineIndexItemV1[];

/**
 * Allow-list INDEX (DF §2.2) — SSOT kluczy wyjściowych. Wyłącznie do testów/audytu kontraktu;
 * builder NIE iteruje po tej liście (projekcja jest jawna, pole po polu), lista jest jej lustrem.
 */
export const PIPELINE_INDEX_BASE_FIELDS = [
  "id", "updatedAt", "ikFinalBid", "title", "status", "submittingOffersDate", "publicationDate",
  "organizationName", "organizationCity", "organizationProvince", "cpvCode", "tenderId", "bzpNumber",
  "relevanceScore", "matchedKeywords", "isWroclaw", "priorityBuyerId", "priorityBuyerLabel", "addedAt",
  "linkedJobId", "ourEstimatePln", "tenderState",
] as const;
export const PIPELINE_INDEX_NESTED_FIELDS = {
  awardResult: ["isUs", "fetchedAt"],
  tenderFit: ["fitLabel", "winChancePct"],
  swzAnalysis: [
    "profitabilityHint", "estimatedValuePln", "estimatedValueRaw", "implementationDays",
    "wadiumPercent", "wadiumPln", "wadiumRaw",
  ],
} as const;
export const PIPELINE_INDEX_MARKER_FIELD = "_lsIndex" as const;

export type PipelineIndexBuildRejectReason =
  | "not_array"
  | "index_not_full"
  | "index_invalid"
  | "full_invalid"
  | "seq_invalid";

export type PipelineIndexBuildResult =
  | { ok: true; index: TenderPipelineIndexCollectionV1; seq: number }
  | { ok: false; reason: PipelineIndexBuildRejectReason; validationReason?: PipelineFullValidationReason };

export class PipelineIndexBuildRejectedError extends Error {
  readonly code = "PIPELINE_INDEX_BUILD_REJECTED" as const;
  readonly reason: PipelineIndexBuildRejectReason;

  constructor(reason: PipelineIndexBuildRejectReason, validationReason?: PipelineFullValidationReason) {
    super(`PIPELINE_INDEX_BUILD_REJECTED: ${reason}${validationReason ? `:${validationReason}` : ""}`);
    this.name = "PipelineIndexBuildRejectedError";
    this.reason = reason;
  }
}

/** Projekcja pojedynczego item — wyłącznie jawny allow-list (bez spread, bez clone+delete). */
function projectIndexItem(item: TenderPipelineItem, marker: TenderPipelineLsIndexMarker): TenderPipelineIndexItemV1 {
  const award = item.awardResult ?? null;
  const fit = item.tenderFit ?? null;
  const swz = item.swzAnalysis ?? null;
  return {
    id: item.id,
    updatedAt: item.updatedAt,
    ikFinalBid: item.ikFinalBid ?? null,
    title: item.title,
    status: item.status,
    submittingOffersDate: item.submittingOffersDate,
    publicationDate: item.publicationDate,
    organizationName: item.organizationName,
    organizationCity: item.organizationCity,
    organizationProvince: item.organizationProvince,
    cpvCode: item.cpvCode,
    tenderId: item.tenderId,
    bzpNumber: item.bzpNumber,
    relevanceScore: item.relevanceScore,
    matchedKeywords: item.matchedKeywords,
    isWroclaw: item.isWroclaw,
    priorityBuyerId: item.priorityBuyerId,
    priorityBuyerLabel: item.priorityBuyerLabel,
    addedAt: item.addedAt,
    linkedJobId: item.linkedJobId ?? null,
    ourEstimatePln: item.ourEstimatePln ?? null,
    tenderState: item.tenderState ?? null,
    awardResult: award ? { isUs: award.isUs, fetchedAt: award.fetchedAt } : null,
    tenderFit: fit ? { fitLabel: fit.fitLabel, winChancePct: fit.winChancePct } : null,
    swzAnalysis: swz
      ? {
          profitabilityHint: swz.profitabilityHint,
          estimatedValuePln: swz.estimatedValuePln,
          estimatedValueRaw: swz.estimatedValueRaw,
          implementationDays: swz.implementationDays,
          wadiumPercent: swz.wadiumPercent,
          wadiumPln: swz.wadiumPln,
          wadiumRaw: swz.wadiumRaw,
        }
      : null,
    _lsIndex: marker,
  };
}

/**
 * NEW-02 — FULL → INDEX (DF §2.3), wariant z jawnym wynikiem (bez throw).
 *
 * Bramka wejścia (Phase 1 REUSE): `classifyPipelineRepresentation` musi dać `FULL` (kształt: żaden item
 * bez `_lsIndex`) ∧ `validatePipelineFullForWrite` PASS ∧ `seq` = dodatnia liczba całkowita
 * (= `localSeq` envelope po ACK, DF §3.2 krok 5; INDEX bez ACK-owanego `seq` nie istnieje).
 *
 * Provenance (DF §A.4 iii) dokłada caller: builder wywoływany WYŁĄCZNIE na items, które przeszły
 * VALIDATE §3.1 + ACK envelope (§3.2). LEGACY_LEAN / CLOUD_LEAN są klasami FULL-compatible (§A.4);
 * ich rozpoznanie po kształcie jest zakazane (§A.4 ii) i niemożliwe dla FULL′ po recovery §8.2/§A.5.3
 * (FULL′ zachowuje `_cloudLean`). Builder nie wykonuje recovery, merge, kalkulacji ani I/O.
 * Kolejność items zachowana 1:1; brak deduplikacji (duplikaty odrzuca VALIDATE).
 */
export function tryBuildTenderPipelineLsIndex(items: unknown, seq: number): PipelineIndexBuildResult {
  const representation = classifyPipelineRepresentation(items);
  if (representation === "NOT_ARRAY") return { ok: false, reason: "not_array" };
  if (representation === "INDEX") return { ok: false, reason: "index_not_full" };
  if (representation === "INDEX_INVALID") return { ok: false, reason: "index_invalid" };
  // FULL | EMPTY (kształt) → walidacja §3.1 (id / duplikaty / marker backstop)
  const validation = validatePipelineFullForWrite(items);
  if (!validation.ok) {
    return validation.reason === "index_not_full"
      ? { ok: false, reason: "index_not_full" }
      : { ok: false, reason: "full_invalid", validationReason: validation.reason };
  }
  if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 1) return { ok: false, reason: "seq_invalid" };

  const source = items as TenderPipelineItem[];
  const index: TenderPipelineIndexCollectionV1 = new Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    // Osobny obiekt markera per item — brak współdzielonej referencji między items.
    index[i] = projectIndexItem(source[i], { v: 1, seq });
  }
  return { ok: true, index, seq };
}

/**
 * NEW-02 — sygnatura zamrożona DF §2.3. Rzuca `PipelineIndexNotFullError` (NEW-08) dla wejścia INDEX /
 * INDEX_INVALID, `PipelineIndexBuildRejectedError` dla pozostałych odrzuceń. Nigdy nie zwraca „częściowego” INDEX.
 */
export function buildTenderPipelineLsIndex(items: TenderPipelineItem[], seq: number): TenderPipelineIndexCollectionV1 {
  const result = tryBuildTenderPipelineLsIndex(items, seq);
  if (result.ok) return result.index;
  if (result.reason === "index_not_full" || result.reason === "index_invalid") {
    throw new PipelineIndexNotFullError(`buildTenderPipelineLsIndex:${result.reason}`);
  }
  throw new PipelineIndexBuildRejectedError(result.reason, result.validationReason);
}

// ---------------------------------------------------------------------------
// NEW-06 (DF §7 B) — per-key budżet INDEX. Czysta funkcja: bajty → decyzja.
// Nie mierzy LS (zero skanów), nie zapisuje, nie zna localStorage. MEASURE wykonuje
// caller na tym samym payloadzie, który trafia do `setItem` (jedna serializacja).
// ---------------------------------------------------------------------------

export type PipelineIndexBudgetState = "ok" | "warning" | "block";

export interface PipelineIndexBudgetDecision {
  state: PipelineIndexBudgetState;
  bytes: number;
  warn: number;
  block: number;
  /** Gotowa nota telemetryczna DF §7 B; `undefined` dla `ok`. */
  note?: "index_budget_warning" | "index_budget_block";
}

export function evaluatePipelineIndexBudget(bytes: number): PipelineIndexBudgetDecision {
  const base = { bytes, warn: PIPELINE_INDEX_LS_WARN, block: PIPELINE_INDEX_LS_BLOCK };
  if (bytes >= PIPELINE_INDEX_LS_BLOCK) return { ...base, state: "block", note: "index_budget_block" };
  if (bytes >= PIPELINE_INDEX_LS_WARN) return { ...base, state: "warning", note: "index_budget_warning" };
  return { ...base, state: "ok" };
}

// ---------------------------------------------------------------------------
// §2.4 — detekcja kształtu LS (reader). Czysta klasyfikacja surowego stringa; ZERO I/O.
// Wynik jest klasą reprezentacji — nigdy nie „promuje” INDEX do FULL.
// ---------------------------------------------------------------------------

export type PipelineLsKind = "INDEX" | "LEGACY_LEAN" | "LEGACY_FULL" | "EMPTY" | "MISSING" | "CORRUPT";

export interface PipelineLsKindResult {
  kind: PipelineLsKind;
  /** Tylko dla INDEX — wspólny `_lsIndex.seq` wszystkich items. */
  seq?: number;
  /** Sparsowane items (INDEX / LEGACY_*) — surowe, bez konwersji reprezentacji. */
  items?: unknown[];
  /** Tylko dla CORRUPT. */
  reason?: "parse_failed" | "not_array" | "index_mixed";
}

function kosztorysOf(item: unknown): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  const dossier = item.tenderDossier;
  if (!isRecord(dossier)) return null;
  const kosztorys = dossier.kosztorys;
  return isRecord(kosztorys) ? kosztorys : null;
}

function hasColdRowsMarker(item: unknown): boolean {
  const k = kosztorysOf(item);
  return k != null && typeof k._coldRowsCount === "number";
}

function hasEmptyRowsWithCount(item: unknown): boolean {
  const k = kosztorysOf(item);
  if (k == null) return false;
  return Array.isArray(k.rows) && k.rows.length === 0 && typeof k.rowCount === "number" && k.rowCount > 0;
}

/**
 * DF §2.4 — kolejność warunków zamrożona: MISSING → CORRUPT (parse / not array) → EMPTY →
 * INDEX (∀ `_lsIndex.v === 1` ∧ jeden `seq`) → CORRUPT `index_mixed` (mieszane / różne seq) →
 * LEGACY_LEAN (∃ `_coldRowsCount` ∨ (∀ brak `noticeHtml` ∧ ∃ `rows=[]` ∧ `rowCount>0`)) → LEGACY_FULL.
 * Ważność INDEX względem IDB (VALID/STALE/INDEX_WITHOUT_FULL) rozstrzyga caller po hydracji — nie tutaj.
 */
export function detectPipelineLsKind(raw: string | null): PipelineLsKindResult {
  if (raw == null) return { kind: "MISSING" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "CORRUPT", reason: "parse_failed" };
  }
  if (!Array.isArray(parsed)) return { kind: "CORRUPT", reason: "not_array" };
  if (parsed.length === 0) return { kind: "EMPTY" };

  const representation = classifyPipelineRepresentation(parsed);
  if (representation === "INDEX") {
    const first = parsed[0] as { _lsIndex: TenderPipelineLsIndexMarker };
    return { kind: "INDEX", seq: first._lsIndex.seq, items: parsed };
  }
  if (representation === "INDEX_INVALID") return { kind: "CORRUPT", reason: "index_mixed" };

  // FULL (kształt) → LEGACY_LEAN vs LEGACY_FULL wg markerów strip (`stripTenderPipelineForLocalStorage`).
  if (parsed.some(hasColdRowsMarker)) return { kind: "LEGACY_LEAN", items: parsed };
  const noNoticeHtml = parsed.every((item) => !isRecord(item) || item.noticeHtml == null);
  if (noNoticeHtml && parsed.some(hasEmptyRowsWithCount)) return { kind: "LEGACY_LEAN", items: parsed };
  return { kind: "LEGACY_FULL", items: parsed };
}

// ---------------------------------------------------------------------------
// RAM state
// ---------------------------------------------------------------------------

let coldMem: TenderPipelineItem[] | null = null;
let coldHydrated = false;
/** SSOT `localSeq` = IDB envelope; RAM inicjalizowany z hydrate (MISSING/LEGACY/CORRUPT → 0). */
let localSeq = 0;
let lastReadStatus: PipelineIdbReadStatus | null = null;
let lastEnvelope: TenderPipelineIdbEnvelopeV1 | null = null;
let lastBundleRevision = 0;
/** Serializacja zapisów — read-back musi odpowiadać własnemu zapisowi. */
let writeChain: Promise<unknown> = Promise.resolve();

/** Usuń pola ciężkie z kopii hot (LS). Full zostaje w IDB / coldMem. */
export function stripTenderPipelineForLocalStorage(items: TenderPipelineItem[]): TenderPipelineItem[] {
  return items.map((item) => {
    const next: TenderPipelineItem = { ...item };
    if (next.noticeHtml) {
      delete next.noticeHtml;
    }
    if (next.tenderDossier && typeof next.tenderDossier === "object") {
      const dossier = { ...next.tenderDossier } as Record<string, unknown>;
      const kosztorys = dossier.kosztorys;
      if (kosztorys && typeof kosztorys === "object") {
        const k = { ...(kosztorys as Record<string, unknown>) };
        const rows = Array.isArray(k.rows) ? k.rows : [];
        k.rows = [];
        k._coldRowsCount = rows.length;
        dossier.kosztorys = k;
      }
      next.tenderDossier = dossier as TenderPipelineItem["tenderDossier"];
    }
    return next;
  });
}

// ---------------------------------------------------------------------------
// Write (§1.6) + ACK (§1.7)
// ---------------------------------------------------------------------------

export interface PipelineIdbWriteMeta {
  /** Referencja cloud guard.bundleRevision; brak → ostatnia widziana (0 = nigdy). */
  bundleRevision?: number;
  writer?: string;
  deletedIdsRevision?: string;
  appVersion?: string;
}

export type PipelineIdbWriteFailReason =
  | "idb_unavailable"
  | "idb_write_failed"
  | "readback_mismatch"
  | "validation_failed";

export interface PipelineIdbWriteResult {
  /** ACK = true wyłącznie po read-back: parse OK ∧ ten sam localSeq ∧ itemCount. */
  ok: boolean;
  localSeq: number;
  bytes: number;
  ms: number;
  reason?: PipelineIdbWriteFailReason;
  validationReason?: PipelineFullValidationReason;
  readbackStatus?: PipelineIdbReadStatus;
  readbackReason?: PipelineIdbCorruptReason;
}

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function payloadBytes(payload: string): number {
  return typeof Blob !== "undefined" ? new Blob([payload]).size : payload.length * 2;
}

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB != null;
}

async function writeEnvelopeWithAck(
  items: TenderPipelineItem[],
  meta: PipelineIdbWriteMeta,
  startedAt: number,
): Promise<PipelineIdbWriteResult> {
  const writer = meta.writer ?? "tenders-pipeline.cold";
  const bundleRevision = Number.isFinite(meta.bundleRevision) && (meta.bundleRevision as number) >= 0
    ? (meta.bundleRevision as number)
    : lastBundleRevision;
  lastBundleRevision = bundleRevision;

  localSeq += 1;
  const seq = localSeq;

  const envelope: TenderPipelineIdbEnvelopeV1 = {
    schemaVersion: PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION,
    bundleRevision,
    localSeq: seq,
    itemCount: items.length,
    writtenAt: new Date().toISOString(),
    maxUpdatedAt: computeMaxUpdatedAt(items),
    items,
  };
  if (meta.deletedIdsRevision !== undefined) envelope.deletedIdsRevision = meta.deletedIdsRevision;
  if (meta.appVersion !== undefined) envelope.appVersion = meta.appVersion;
  envelope.writer = writer;

  // P-4: dokładnie jedna serializacja FULL na zapis (tylko do pomiaru bytes; IDB dostaje obiekt).
  const bytes = payloadBytes(JSON.stringify(envelope));

  const fail = (reason: PipelineIdbWriteFailReason, extra?: Partial<PipelineIdbWriteResult>): PipelineIdbWriteResult => {
    const result: PipelineIdbWriteResult = { ok: false, localSeq: seq, bytes, ms: nowMs() - startedAt, reason, ...extra };
    recordStorageWrite({
      key: PIPELINE_COLD_IDB_KEY,
      bytes,
      writer,
      ok: false,
      tier: 2,
      note: `envelope:${reason}${extra?.readbackReason ? `:${extra.readbackReason}` : extra?.readbackStatus ? `:${extra.readbackStatus}` : ""}`,
    });
    return result;
  };

  if (!idbAvailable()) return fail("idb_unavailable");

  const written = await idbSet(PIPELINE_COLD_IDB_KEY, envelope);
  if (!written) return fail("idb_write_failed");

  const readBack = await idbGet<unknown>(PIPELINE_COLD_IDB_KEY);
  const parsed = parsePipelineIdbEnvelope(readBack);
  if (parsed.status !== "OK" || parsed.envelope == null) {
    return fail("readback_mismatch", { readbackStatus: parsed.status, readbackReason: parsed.reason });
  }
  if (parsed.envelope.localSeq !== seq || parsed.envelope.itemCount !== items.length) {
    return fail("readback_mismatch", { readbackStatus: "OK" });
  }

  lastReadStatus = "OK";
  lastEnvelope = parsed.envelope;
  const result: PipelineIdbWriteResult = { ok: true, localSeq: seq, bytes, ms: nowMs() - startedAt };
  recordStorageWrite({
    key: PIPELINE_COLD_IDB_KEY,
    bytes,
    writer,
    ok: true,
    tier: 2,
    note: `envelope:ack:seq=${seq}`,
  });
  return result;
}

/**
 * RAM `coldMem` ustawiany synchronicznie (jak dotychczas), IDB envelope zapisywany asynchronicznie
 * z read-back ACK. Zwrócony Promise = ACK kontrakt (§1.7). Istniejący caller (`saveTendersPipelineLocal`)
 * może ignorować wynik — semantyka fire-and-forget z MAIN zachowana.
 */
export function setPipelineColdMemory(
  items: TenderPipelineItem[],
  meta: PipelineIdbWriteMeta = {},
): Promise<PipelineIdbWriteResult> {
  const startedAt = nowMs();
  const validation = validatePipelineFullForWrite(items);
  if (!validation.ok) {
    // §3.1: dla `index_not_full` RAM NIE jest aktualizowany — coldMem zawiera wyłącznie FULL.
    if (validation.reason !== "index_not_full") {
      coldMem = items;
      coldHydrated = true;
    }
    recordStorageWrite({
      key: PIPELINE_COLD_IDB_KEY,
      bytes: 0,
      writer: meta.writer ?? "tenders-pipeline.cold",
      ok: false,
      tier: 2,
      note: `writer_validation_failed:${validation.reason}`,
    });
    return Promise.resolve({
      ok: false,
      localSeq,
      bytes: 0,
      ms: nowMs() - startedAt,
      reason: "validation_failed",
      validationReason: validation.reason,
    });
  }

  coldMem = items;
  coldHydrated = true;
  setPipelineFullAvailability("FULL", "cold_write");

  const run = writeChain.then(() => writeEnvelopeWithAck(items, meta, startedAt));
  writeChain = run.catch(() => undefined);
  return run;
}

export function getPipelineColdMemory(): TenderPipelineItem[] | null {
  return coldMem;
}

/** Prefer full cold; w przeciwnym razie lean. */
export function resolvePipelineLocalWithCold(lean: TenderPipelineItem[]): TenderPipelineItem[] {
  if (coldMem && coldMem.length > 0) return coldMem;
  return lean;
}

// ---------------------------------------------------------------------------
// Read (§1.8)
// ---------------------------------------------------------------------------

/** `localSeq` monotoniczny per device: nigdy nie cofamy poniżej wartości odczytanej z IDB (§1.2). */
function adoptEnvelopeCounters(env: TenderPipelineIdbEnvelopeV1): void {
  if (env.localSeq > localSeq) localSeq = env.localSeq;
  if (env.bundleRevision > lastBundleRevision) lastBundleRevision = env.bundleRevision;
}

export interface PipelineIdbHydrateResult {
  items: TenderPipelineItem[] | null;
  status: PipelineIdbReadStatus;
  envelope: TenderPipelineIdbEnvelopeV1 | null;
  reason?: PipelineIdbCorruptReason;
}

/**
 * Pełny odczyt envelope z IDB (status + envelope). LEGACY_ARRAY ⇒ FULL bez metadanych
 * (migracja do envelope przy pierwszym zapisie §8.3). CORRUPT ⇒ ignorowany, nie kasowany.
 */
export async function hydratePipelineColdEnvelopeFromIdb(): Promise<PipelineIdbHydrateResult> {
  if (coldHydrated && coldMem) {
    // RAM = prawda sesji (nie nadpisujemy coldMem). Status IDB dokładany tylko gdy nigdy nie odczytany.
    if (lastReadStatus == null) {
      const parsed = parsePipelineIdbEnvelope(await idbGet<unknown>(PIPELINE_COLD_IDB_KEY));
      lastReadStatus = parsed.status;
      lastEnvelope = parsed.envelope;
      if (parsed.envelope) adoptEnvelopeCounters(parsed.envelope);
      return { items: coldMem, status: parsed.status, envelope: parsed.envelope, reason: parsed.reason };
    }
    return { items: coldMem, status: lastReadStatus, envelope: lastEnvelope };
  }
  const raw = await idbGet<unknown>(PIPELINE_COLD_IDB_KEY);
  const parsed = parsePipelineIdbEnvelope(raw);
  coldHydrated = true;
  lastReadStatus = parsed.status;
  lastEnvelope = parsed.envelope;

  if ((parsed.status === "OK" || parsed.status === "LEGACY_ARRAY") && parsed.envelope) {
    const items = parsed.envelope.items;
    adoptEnvelopeCounters(parsed.envelope);
    if (items.length > 0) {
      coldMem = items;
      setPipelineFullAvailability("FULL", parsed.status === "OK" ? "idb_ok" : "idb_legacy_array");
      return { items, status: parsed.status, envelope: parsed.envelope };
    }
    return { items: null, status: parsed.status, envelope: parsed.envelope };
  }

  // MISSING / CORRUPT ⇒ localSeq pozostaje na wartości RAM (0 przy świeżym starcie — §1.2).
  recordStorageWrite({
    key: PIPELINE_COLD_IDB_KEY,
    bytes: 0,
    writer: "tenders-pipeline.cold.read",
    ok: false,
    tier: 2,
    note: parsed.status === "CORRUPT" ? `idb_corrupt:${parsed.reason}` : "idb_missing",
  });
  return { items: null, status: parsed.status, envelope: null, reason: parsed.reason };
}

/** Adapter dla istniejących callerów (`loadTendersPipeline`): kontrakt zwrotu MAIN zachowany. */
export async function hydratePipelineColdFromIdb(): Promise<TenderPipelineItem[] | null> {
  const { items } = await hydratePipelineColdEnvelopeFromIdb();
  return items && items.length > 0 ? items : null;
}

/** RAM, sync. `null` przed pierwszym hydrate/zapisem. */
export function getPipelineColdEnvelopeMeta(): {
  localSeq: number;
  bundleRevision: number;
  status: PipelineIdbReadStatus;
} | null {
  if (lastReadStatus == null) return null;
  return { localSeq, bundleRevision: lastBundleRevision, status: lastReadStatus };
}

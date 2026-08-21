/**
 * KL-7-UX-1 — read-only view-model for Firma → Katalog KNR.
 * Presentation only. ZERO HTTP · ZERO VERIFY write · ZERO cloud · ZERO PLN.
 */

import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import { listKnrCatalogEntries } from "./knr-catalog-authority";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { emptyKnrCatalogStore, loadKnrCatalogStoreLocal } from "./knr-catalog-store";
import { foldIdentityKeyV2 } from "./knr-identity-v2";
import type { KnrLifecycleState, KnrVerificationStatus } from "./types";

/** Same page size as Nasz katalog cen / Nasz Katalog Robót. */
export const KNR_CATALOG_UI_PAGE_SIZE = 100 as const;

/** Ops freshness window (OD-KNR-STALE-1) — independent of verificationStatus. */
export const KNR_CATALOG_OPS_FRESHNESS_DAYS = 90 as const;

export type KnrCatalogOpsFreshness = "FRESH" | "STALE";

/** Filter chips — maps to shared CatalogFreshnessToolbar chrome (CURRENT≈FRESH). */
export type KnrCatalogUiFreshnessFilter = "ALL" | "CURRENT" | "STALE";

export type KnrCatalogUiVerificationFilter =
  | "ALL"
  | "VERIFIED"
  | "PENDING_VERIFY"
  | "OTHER";

export type KnrCatalogUiRow = {
  rowId: string;
  identityKeyV2: string;
  evidenceKeyV1: string;
  displayCode: string;
  description: string;
  unit: string;
  family: string;
  publisher: string;
  edition: string;
  laborCount: number;
  materialCount: number;
  equipmentCount: number;
  normsSummaryPl: string;
  verificationStatus: KnrVerificationStatus;
  verificationLabelPl: string;
  lifecycleState: KnrLifecycleState;
  opsFreshness: KnrCatalogOpsFreshness;
  /** Shared chrome token: CURRENT | STALE (FRESH→CURRENT). */
  freshnessChrome: "CURRENT" | "STALE";
  freshnessLabelPl: string;
  sourceLabelPl: string;
  updatedAt: string;
  verifiedAt: string | null;
  isUxFixture: boolean;
  entry: KnrCatalogEntry;
};

export const KNR_CATALOG_UI_FRESHNESS_FILTERS: {
  id: KnrCatalogUiFreshnessFilter;
  label: string;
}[] = [
  { id: "ALL", label: "Wszystkie" },
  { id: "CURRENT", label: "Aktualne" },
  { id: "STALE", label: "Przeterminowane" },
];

export const KNR_CATALOG_UI_VERIFICATION_FILTERS: {
  id: KnrCatalogUiVerificationFilter;
  label: string;
}[] = [
  { id: "ALL", label: "Wszystkie statusy" },
  { id: "VERIFIED", label: "Zweryfikowane" },
  { id: "PENDING_VERIFY", label: "Do weryfikacji" },
  { id: "OTHER", label: "Pozostałe" },
];

export function knrVerificationLabelPl(status: KnrVerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "Zweryfikowany";
    case "PENDING_VERIFY":
      return "Do weryfikacji";
    case "STRUCTURAL":
      return "Strukturalny";
    case "NORMATIVE":
      return "Normatywny";
    case "RESEARCHED":
      return "Zbadany";
    case "INCOMPLETE":
      return "Niekompletny";
    case "CONFLICTED":
      return "Konflikt";
    case "REJECTED":
      return "Odrzucony";
    case "STALE":
      return "STALE (weryfikacja)";
    case "SUPERSEDED":
      return "Zastąpiony";
    default:
      return String(status);
  }
}

export function knrSourceLabelPl(entry: KnrCatalogEntry): string {
  const parts: string[] = [];
  const st = entry.provenance.sourceType;
  if (st && st !== "UNSPECIFIED") parts.push(st);
  const id = String(entry.provenance.sourceIdentifier ?? "").trim();
  if (id) parts.push(id);
  const method = entry.provenance.acquisitionMethod;
  if (method && method !== "NOT_ACQUIRED") parts.push(method);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function computeKnrOpsFreshness(
  updatedAtIso: string,
  nowMs: number,
  windowDays = KNR_CATALOG_OPS_FRESHNESS_DAYS,
): KnrCatalogOpsFreshness {
  const t = Date.parse(updatedAtIso);
  if (!Number.isFinite(t)) return "STALE";
  const ageMs = nowMs - t;
  if (ageMs < 0) return "FRESH";
  const limitMs = windowDays * 24 * 60 * 60 * 1000;
  return ageMs <= limitMs ? "FRESH" : "STALE";
}

function normsSummaryPl(entry: KnrCatalogEntry): string {
  const r = entry.norms.laborNorms.length;
  const m = entry.norms.materialNorms.length;
  const s = entry.norms.equipmentNorms.length;
  if (r === 0 && m === 0 && s === 0) return "R/M/S: —";
  return `R:${r} · M:${m} · S:${s}`;
}

export function toKnrCatalogUiRow(
  entry: KnrCatalogEntry,
  opts: { nowMs: number; isUxFixture?: boolean },
): KnrCatalogUiRow {
  const ops = computeKnrOpsFreshness(entry.updatedAt, opts.nowMs);
  const family = String(entry.identity.family ?? "—").trim() || "—";
  return {
    rowId: entry.identityKeyV2,
    identityKeyV2: entry.identityKeyV2,
    evidenceKeyV1: entry.evidenceKeyV1,
    displayCode: entry.displayCode || entry.originalSourceCode || entry.evidenceKeyV1,
    description: entry.description.trim() || "—",
    unit: entry.unit.trim() || "—",
    family,
    publisher: String(entry.identity.publisher ?? "").trim() || "—",
    edition: String(entry.identity.edition ?? "").trim() || "—",
    laborCount: entry.norms.laborNorms.length,
    materialCount: entry.norms.materialNorms.length,
    equipmentCount: entry.norms.equipmentNorms.length,
    normsSummaryPl: normsSummaryPl(entry),
    verificationStatus: entry.verificationStatus,
    verificationLabelPl: knrVerificationLabelPl(entry.verificationStatus),
    lifecycleState: entry.lifecycleState,
    opsFreshness: ops,
    freshnessChrome: ops === "FRESH" ? "CURRENT" : "STALE",
    freshnessLabelPl: ops === "FRESH" ? "AKTUALNY" : "PRZETERMINOWANY",
    sourceLabelPl: knrSourceLabelPl(entry),
    updatedAt: entry.updatedAt,
    verifiedAt: entry.verifiedAt ?? null,
    isUxFixture: opts.isUxFixture === true,
    entry,
  };
}

/**
 * UX-1 demo fixture — structural shell only.
 * Empty R/M/S · NOT VERIFIED · no PLN · does not invent norms.
 * Uses Owner-known evidenceKey only as display identity hint.
 */
export function buildKnrCatalogUx1DemoFixtureEntries(
  nowIso = "2026-08-21T12:00:00.000Z",
): KnrCatalogEntry[] {
  const identity = {
    family: "KNR-W" as const,
    catalog: "4-01",
    table: "1202-07",
  };
  const identityKeyV2 = foldIdentityKeyV2(identity);
  const evidenceKeyV1 = "KNR-W|4-01|1202-07";
  return [
    {
      schemaVersion: 1,
      identityKeyV2,
      evidenceKeyV1,
      identity,
      originalSourceCode: evidenceKeyV1,
      displayCode: evidenceKeyV1,
      description: "",
      unit: "",
      norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
      provenance: {
        sourceType: "UNSPECIFIED",
        sourceIdentifier: "ux1-demo-fixture",
        acquisitionMethod: "NOT_ACQUIRED",
        capturedAt: nowIso,
        parserVersion: "KL-7-UX-1-fixture",
        contentHash: "",
        rawEvidenceRef: null,
        revision: 0,
      },
      verificationStatus: "STRUCTURAL",
      validationState: "INCOMPLETE",
      lifecycleState: "ACTIVE",
      contentHash: "",
      verifiedAt: null,
      verifiedBy: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

export function loadKnrCatalogEntriesForUi(input?: {
  store?: KnrCatalogStore;
  /** When local store empty — show UX-1 structural demo (no norms). Default true. */
  useDemoWhenEmpty?: boolean;
  nowIso?: string;
}): { entries: KnrCatalogEntry[]; source: "local_store" | "ux1_demo" | "empty" } {
  const store = input?.store ?? loadKnrCatalogStoreLocal();
  const listed = listKnrCatalogEntries(store);
  if (listed.length > 0) {
    return { entries: listed, source: "local_store" };
  }
  if (input?.useDemoWhenEmpty === false) {
    return { entries: [], source: "empty" };
  }
  const demo = buildKnrCatalogUx1DemoFixtureEntries(input?.nowIso);
  return { entries: demo, source: "ux1_demo" };
}

export function buildKnrCatalogUiRows(input: {
  entries: readonly KnrCatalogEntry[];
  search?: string;
  freshnessFilter?: KnrCatalogUiFreshnessFilter;
  verificationFilter?: KnrCatalogUiVerificationFilter;
  nowMs?: number;
  isUxFixture?: boolean;
}): KnrCatalogUiRow[] {
  const nowMs = input.nowMs ?? Date.now();
  const q = String(input.search ?? "")
    .trim()
    .toLowerCase();
  const freshnessFilter = input.freshnessFilter ?? "ALL";
  const verificationFilter = input.verificationFilter ?? "ALL";
  const isUxFixture = input.isUxFixture === true;

  const rows = input.entries.map((e) => toKnrCatalogUiRow(e, { nowMs, isUxFixture }));

  return rows.filter((row) => {
    if (freshnessFilter === "CURRENT" && row.freshnessChrome !== "CURRENT") return false;
    if (freshnessFilter === "STALE" && row.freshnessChrome !== "STALE") return false;

    if (verificationFilter === "VERIFIED" && row.verificationStatus !== "VERIFIED") {
      return false;
    }
    if (
      verificationFilter === "PENDING_VERIFY"
      && row.verificationStatus !== "PENDING_VERIFY"
    ) {
      return false;
    }
    if (verificationFilter === "OTHER") {
      if (
        row.verificationStatus === "VERIFIED"
        || row.verificationStatus === "PENDING_VERIFY"
      ) {
        return false;
      }
    }

    if (!q) return true;
    const hay = [
      row.displayCode,
      row.evidenceKeyV1,
      row.identityKeyV2,
      row.description,
      row.family,
      row.unit,
      row.verificationLabelPl,
      row.sourceLabelPl,
      row.publisher,
      row.edition,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function paginateKnrCatalogUiRows<T>(
  rows: readonly T[],
  page: number,
  pageSize = KNR_CATALOG_UI_PAGE_SIZE,
): { page: number; pageSize: number; total: number; totalPages: number; items: T[] } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    items: rows.slice(start, start + pageSize) as T[],
  };
}

/** Test helper — empty store without demo. */
export function emptyKnrCatalogStoreForUiTests(): KnrCatalogStore {
  return emptyKnrCatalogStore();
}

/**
 * MULTI-DWELLING-01 — localStorage package store (mapping + units).
 * Cloud Sync / DATA_KEYS / Edge = OUT.
 */

import {
  MULTI_DWELLING_PACKAGE_LS_KEY,
  MULTI_DWELLING_PACKAGE_SCHEMA_VERSION,
  normalizeDwellingId,
} from "@/lib/multi-dwelling/constants";
import { dwellingHasValidDocumentMapping } from "@/lib/multi-dwelling/package-gate";
import type {
  DwellingCostUnit,
  MultiDwellingPackageStore,
  TenderPackage,
  TenderPackageMode,
} from "@/lib/multi-dwelling/types";

export function emptyMultiDwellingPackageStore(): MultiDwellingPackageStore {
  return { version: MULTI_DWELLING_PACKAGE_SCHEMA_VERSION, byTenderId: {} };
}

export function emptyTenderPackage(
  tenderId: string,
  mode: TenderPackageMode = "legacy_single",
): TenderPackage {
  return {
    tenderId: String(tenderId ?? "").trim(),
    expectedDwellingCount: mode === "legacy_single" ? 1 : 0,
    dwellings: [],
    mode,
    documentToDwelling: {},
  };
}

function isUnit(raw: unknown): raw is DwellingCostUnit {
  if (!raw || typeof raw !== "object") return false;
  const u = raw as Partial<DwellingCostUnit>;
  if (typeof u.dwellingId !== "string" || !u.dwellingId.trim()) return false;
  if (typeof u.labelPl !== "string") return false;
  if (!Array.isArray(u.sourceDocumentIds)) return false;
  return true;
}

function normalizePackage(raw: unknown): TenderPackage | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<TenderPackage>;
  const tenderId = String(p.tenderId ?? "").trim();
  if (!tenderId) return null;
  const mode: TenderPackageMode =
    p.mode === "multi" ? "multi" : "legacy_single";
  const expected =
    typeof p.expectedDwellingCount === "number" && Number.isFinite(p.expectedDwellingCount)
      ? Math.floor(p.expectedDwellingCount)
      : mode === "legacy_single"
        ? 1
        : 0;
  const dwellings = Array.isArray(p.dwellings)
    ? p.dwellings.filter(isUnit).map((u) => ({
        dwellingId: normalizeDwellingId(u.dwellingId),
        labelPl: String(u.labelPl ?? "").trim() || normalizeDwellingId(u.dwellingId),
        sourceDocumentIds: (u.sourceDocumentIds ?? [])
          .map((id) => String(id ?? "").trim())
          .filter(Boolean),
        offerBoq: u.offerBoq ?? null,
        costMulti: u.costMulti ?? null,
        f5Gate: u.f5Gate ?? null,
        subtotals: u.subtotals ?? null,
      }))
    : [];
  const documentToDwelling: Record<string, string> = {};
  if (p.documentToDwelling && typeof p.documentToDwelling === "object") {
    for (const [docId, did] of Object.entries(p.documentToDwelling)) {
      const d = String(docId ?? "").trim();
      const v = normalizeDwellingId(did);
      if (d) documentToDwelling[d] = v;
    }
  }
  return {
    tenderId,
    expectedDwellingCount: expected,
    dwellings,
    mode,
    ...(typeof p.labelPl === "string" && p.labelPl.trim()
      ? { labelPl: p.labelPl.trim() }
      : {}),
    documentToDwelling,
  };
}

export function loadMultiDwellingPackageStore(): MultiDwellingPackageStore {
  try {
    if (typeof localStorage === "undefined") return emptyMultiDwellingPackageStore();
    const raw = localStorage.getItem(MULTI_DWELLING_PACKAGE_LS_KEY);
    if (!raw) return emptyMultiDwellingPackageStore();
    const parsed = JSON.parse(raw) as Partial<MultiDwellingPackageStore>;
    if (parsed.version !== MULTI_DWELLING_PACKAGE_SCHEMA_VERSION) {
      return emptyMultiDwellingPackageStore();
    }
    const byTenderId: Record<string, TenderPackage> = {};
    if (parsed.byTenderId && typeof parsed.byTenderId === "object") {
      for (const [tid, pkg] of Object.entries(parsed.byTenderId)) {
        const n = normalizePackage(pkg);
        if (n) byTenderId[String(tid).trim()] = n;
      }
    }
    return { version: MULTI_DWELLING_PACKAGE_SCHEMA_VERSION, byTenderId };
  } catch {
    return emptyMultiDwellingPackageStore();
  }
}

export function saveMultiDwellingPackageStore(
  store: MultiDwellingPackageStore,
): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function clearMultiDwellingPackageStore(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.removeItem(MULTI_DWELLING_PACKAGE_LS_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getTenderPackage(tenderId: string): TenderPackage | null {
  const tid = String(tenderId ?? "").trim();
  if (!tid) return null;
  return loadMultiDwellingPackageStore().byTenderId[tid] ?? null;
}

export function upsertTenderPackage(pkg: TenderPackage): TenderPackage | null {
  const tid = String(pkg.tenderId ?? "").trim();
  if (!tid) return null;
  const normalized = normalizePackage({ ...pkg, tenderId: tid });
  if (!normalized) return null;
  const store = loadMultiDwellingPackageStore();
  store.byTenderId[tid] = normalized;
  if (!saveMultiDwellingPackageStore(store)) return null;
  return normalized;
}

/** Opt-in multi mode — does not create SSOT dwellings automatically. */
export function enableMultiDwellingMode(
  tenderId: string,
  opts?: { labelPl?: string; expectedDwellingCount?: number },
): TenderPackage | null {
  const tid = String(tenderId ?? "").trim();
  if (!tid) return null;
  const existing = getTenderPackage(tid);
  const pkg: TenderPackage = {
    ...(existing ?? emptyTenderPackage(tid, "multi")),
    tenderId: tid,
    mode: "multi",
    expectedDwellingCount:
      opts?.expectedDwellingCount != null && opts.expectedDwellingCount > 0
        ? Math.floor(opts.expectedDwellingCount)
        : existing?.mode === "multi"
          ? existing.expectedDwellingCount
          : 0,
    ...(opts?.labelPl?.trim() ? { labelPl: opts.labelPl.trim() } : {}),
  };
  return upsertTenderPackage(pkg);
}

export function setExpectedDwellingCount(
  tenderId: string,
  count: number,
): TenderPackage | null {
  const pkg = getTenderPackage(tenderId) ?? emptyTenderPackage(tenderId, "multi");
  if (pkg.mode !== "multi") {
    pkg.mode = "multi";
  }
  if (!(count > 0) || !Number.isInteger(count)) return null;
  pkg.expectedDwellingCount = count;
  return upsertTenderPackage(pkg);
}

/**
 * Owner-confirmed dwelling create. Rejects duplicate dwellingId.
 * AUTO must NOT call this from filename alone.
 */
export function confirmDwelling(opts: {
  tenderId: string;
  dwellingId: string;
  labelPl: string;
}): { ok: true; package: TenderPackage } | { ok: false; reason: string } {
  const tid = String(opts.tenderId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  if (!tid) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!String(opts.dwellingId ?? "").trim()) {
    return { ok: false, reason: "MISSING_DWELLING_ID" };
  }
  const pkg =
    getTenderPackage(tid) ??
    emptyTenderPackage(tid, "multi");
  pkg.mode = "multi";
  if (pkg.dwellings.some((d) => normalizeDwellingId(d.dwellingId) === dwellingId)) {
    return { ok: false, reason: "DUPLICATE_DWELLING_ID" };
  }
  pkg.dwellings = [
    ...pkg.dwellings,
    {
      dwellingId,
      labelPl: String(opts.labelPl ?? "").trim() || dwellingId,
      sourceDocumentIds: [],
      offerBoq: null,
      costMulti: null,
      f5Gate: null,
      subtotals: null,
    },
  ];
  const saved = upsertTenderPackage(pkg);
  if (!saved) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  return { ok: true, package: saved };
}

/**
 * Owner map documentId → dwellingId. Filename is NOT accepted as dwellingId.
 * documentId === dwellingId is REJECTED (not valid identity).
 */
export function mapDocumentToDwelling(opts: {
  tenderId: string;
  documentId: string;
  dwellingId: string;
}): { ok: true; package: TenderPackage } | { ok: false; reason: string } {
  const tid = String(opts.tenderId ?? "").trim();
  const documentId = String(opts.documentId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  if (!tid) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!documentId) return { ok: false, reason: "MISSING_DOCUMENT_ID" };
  if (!String(opts.dwellingId ?? "").trim()) {
    return { ok: false, reason: "MISSING_DWELLING_ID" };
  }
  if (documentId === dwellingId) {
    return { ok: false, reason: "DOCUMENT_ID_EQUALS_DWELLING_ID" };
  }
  const pkg = getTenderPackage(tid);
  if (!pkg || pkg.mode !== "multi") {
    return { ok: false, reason: "MULTI_MODE_REQUIRED" };
  }
  if (!pkg.dwellings.some((d) => normalizeDwellingId(d.dwellingId) === dwellingId)) {
    return { ok: false, reason: "DWELLING_NOT_FOUND" };
  }
  // Remap: remove document from any previous dwelling source lists.
  pkg.dwellings = pkg.dwellings.map((d) => {
    const did = normalizeDwellingId(d.dwellingId);
    const nextIds = (d.sourceDocumentIds ?? []).filter((id) => id !== documentId);
    if (did === dwellingId) {
      const ids = new Set(nextIds);
      ids.add(documentId);
      return { ...d, sourceDocumentIds: [...ids] };
    }
    if (nextIds.length !== (d.sourceDocumentIds ?? []).length) {
      return { ...d, sourceDocumentIds: nextIds };
    }
    return d;
  });
  pkg.documentToDwelling = { ...pkg.documentToDwelling, [documentId]: dwellingId };
  const saved = upsertTenderPackage(pkg);
  if (!saved) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  return { ok: true, package: saved };
}

export function attachOfferBoqToDwelling(opts: {
  tenderId: string;
  dwellingId: string;
  offerBoq: DwellingCostUnit["offerBoq"];
}): { ok: true; package: TenderPackage } | { ok: false; reason: string } {
  const tid = String(opts.tenderId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  if (!tid) return { ok: false, reason: "MISSING_TENDER_ID" };
  const pkg = getTenderPackage(tid);
  if (!pkg) return { ok: false, reason: "PACKAGE_NOT_FOUND" };
  const idx = pkg.dwellings.findIndex(
    (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
  );
  if (idx < 0) return { ok: false, reason: "DWELLING_NOT_FOUND" };

  // MULTI: require Owner document mapping BEFORE attach (no auto-map).
  if (pkg.mode === "multi") {
    const unit = pkg.dwellings[idx]!;
    if (!dwellingHasValidDocumentMapping(pkg, unit)) {
      return { ok: false, reason: "DOCUMENT_MAPPING_REQUIRED" };
    }
  }

  const next = [...pkg.dwellings];
  next[idx] = {
    ...next[idx]!,
    offerBoq: opts.offerBoq,
    f5Gate: null,
    subtotals: null,
  };
  pkg.dwellings = next;
  const saved = upsertTenderPackage(pkg);
  if (!saved) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  return { ok: true, package: saved };
}

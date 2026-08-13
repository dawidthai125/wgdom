/**
 * TRANSPORT MODEL-1B — explicit Bid Transport candidate marks (A1).
 * localStorage only · ZERO Cloud Sync / DATA_KEYS / OfferBoq mutation.
 * Identity only — NOT a price (price = Owner Input owner_input).
 * MULTI-DWELLING-01: scope tenderId + dwellingId + lineId (legacy dwelling = DEFAULT).
 */

import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

export const TRANSPORT_BID_CANDIDATE_LS_KEY = "kw-transport-bid-candidate-v1";

export const TRANSPORT_BID_CANDIDATE_SCHEMA_VERSION = 1 as const;

export type TransportBidCandidateMarkedByRole =
  | "cost_expert"
  | "chief"
  | "owner"
  | "system"
  | "admin";

export type TransportBidCandidateRecord = {
  tenderId: string;
  lineId: string;
  /** MULTI-DWELLING-01 — optional; absent ⇒ DEFAULT_DWELLING_ID on match. */
  dwellingId?: string;
  domain: "transport";
  identityKind: "transport_line";
  sourceClass: "bid_candidate";
  markedAt: string;
  markedByRole?: TransportBidCandidateMarkedByRole;
};

export type TransportBidCandidateStore = {
  version: typeof TRANSPORT_BID_CANDIDATE_SCHEMA_VERSION;
  records: TransportBidCandidateRecord[];
};

export type TransportBidCandidateGuard = {
  isNoise?: boolean;
  noiseKind?: string | null;
  categoryId?: string | null;
  signalKind?: string | null;
};

export type MarkTransportBidCandidateInput = {
  tenderId: string;
  lineId: string;
  dwellingId?: string | null;
  markedAt?: string;
  markedByRole?: TransportBidCandidateMarkedByRole;
  /** Optional — reject noise transport / utylizacja when provided. */
  guard?: TransportBidCandidateGuard;
};

export type MarkTransportBidCandidateFailureReason =
  | "MISSING_TENDER_ID"
  | "MISSING_LINE_ID"
  | "NOISE_TRANSPORT"
  | "UTYLIZACJA_ONLY"
  | "STORAGE_UNAVAILABLE";

export type MarkTransportBidCandidateResult =
  | { ok: true; record: TransportBidCandidateRecord; created: boolean }
  | { ok: false; reason: MarkTransportBidCandidateFailureReason };

export type UnmarkTransportBidCandidateInput = {
  tenderId: string;
  lineId: string;
  dwellingId?: string | null;
};

export type UnmarkTransportBidCandidateResult =
  | { ok: true; removed: boolean }
  | { ok: false; reason: "MISSING_TENDER_ID" | "MISSING_LINE_ID" | "STORAGE_UNAVAILABLE" };

export function emptyTransportBidCandidateStore(): TransportBidCandidateStore {
  return { version: 1, records: [] };
}

function isRecord(raw: unknown): raw is TransportBidCandidateRecord {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Partial<TransportBidCandidateRecord>;
  if (typeof r.tenderId !== "string" || !r.tenderId.trim()) return false;
  if (typeof r.lineId !== "string" || !r.lineId.trim()) return false;
  if (r.dwellingId != null && typeof r.dwellingId !== "string") return false;
  if (r.domain !== "transport") return false;
  if (r.identityKind !== "transport_line") return false;
  if (r.sourceClass !== "bid_candidate") return false;
  if (typeof r.markedAt !== "string" || !r.markedAt) return false;
  if (r.markedByRole != null && typeof r.markedByRole !== "string") return false;
  return true;
}

function normalizeStore(raw: unknown): TransportBidCandidateStore {
  if (!raw || typeof raw !== "object") return emptyTransportBidCandidateStore();
  const s = raw as { version?: unknown; records?: unknown };
  if (s.version !== 1) return emptyTransportBidCandidateStore();
  if (!Array.isArray(s.records)) return emptyTransportBidCandidateStore();
  return {
    version: 1,
    records: s.records.filter(isRecord).map((r) => ({
      tenderId: r.tenderId.trim(),
      lineId: r.lineId.trim(),
      ...(r.dwellingId?.trim()
        ? { dwellingId: normalizeDwellingId(r.dwellingId) }
        : {}),
      domain: "transport" as const,
      identityKind: "transport_line" as const,
      sourceClass: "bid_candidate" as const,
      markedAt: r.markedAt,
      ...(r.markedByRole ? { markedByRole: r.markedByRole } : {}),
    })),
  };
}

function recordMatches(
  r: TransportBidCandidateRecord,
  tenderId: string,
  lineId: string,
  dwellingId: string,
): boolean {
  return (
    r.tenderId === tenderId &&
    r.lineId === lineId &&
    normalizeDwellingId(r.dwellingId) === dwellingId
  );
}

export function loadTransportBidCandidateStore(): TransportBidCandidateStore {
  try {
    if (typeof localStorage === "undefined") return emptyTransportBidCandidateStore();
    const raw = localStorage.getItem(TRANSPORT_BID_CANDIDATE_LS_KEY);
    if (!raw) return emptyTransportBidCandidateStore();
    return normalizeStore(JSON.parse(raw));
  } catch {
    return emptyTransportBidCandidateStore();
  }
}

function saveTransportBidCandidateStore(store: TransportBidCandidateStore): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(TRANSPORT_BID_CANDIDATE_LS_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function clearTransportBidCandidateStore(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.removeItem(TRANSPORT_BID_CANDIDATE_LS_KEY);
    return true;
  } catch {
    return false;
  }
}

function evaluateMarkGuard(
  guard: TransportBidCandidateGuard | undefined,
): MarkTransportBidCandidateFailureReason | null {
  if (!guard) return null;
  if (guard.isNoise === true && guard.noiseKind === "transport") {
    return "NOISE_TRANSPORT";
  }
  if (guard.isNoise === true) {
    return "NOISE_TRANSPORT";
  }
  const cat = String(guard.categoryId ?? "").trim().toUpperCase();
  const signal = String(guard.signalKind ?? "").trim();
  if (
    cat === "TRANSPORT_UTYLIZACJA" ||
    signal === "TRANSPORT_UTYLIZACJA" ||
    signal === "utylizacja" ||
    signal === "disposal_only"
  ) {
    return "UTYLIZACJA_ONLY";
  }
  return null;
}

export function isTransportBidCandidate(
  tenderId: string,
  lineId: string,
  dwellingId?: string | null,
): boolean {
  const tid = String(tenderId ?? "").trim();
  const lid = String(lineId ?? "").trim();
  const did = normalizeDwellingId(dwellingId);
  if (!tid || !lid) return false;
  return loadTransportBidCandidateStore().records.some((r) =>
    recordMatches(r, tid, lid, did),
  );
}

export function listTransportBidCandidates(
  tenderId: string,
  dwellingId?: string | null,
): TransportBidCandidateRecord[] {
  const tid = String(tenderId ?? "").trim();
  if (!tid) return [];
  const records = loadTransportBidCandidateStore().records.filter(
    (r) => r.tenderId === tid,
  );
  if (dwellingId === undefined) return records;
  const did = normalizeDwellingId(dwellingId);
  return records.filter((r) => normalizeDwellingId(r.dwellingId) === did);
}

export function markTransportBidCandidate(
  input: MarkTransportBidCandidateInput,
): MarkTransportBidCandidateResult {
  const tenderId = String(input.tenderId ?? "").trim();
  const lineId = String(input.lineId ?? "").trim();
  const dwellingId = normalizeDwellingId(input.dwellingId);
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!lineId) return { ok: false, reason: "MISSING_LINE_ID" };

  const guardFail = evaluateMarkGuard(input.guard);
  if (guardFail) return { ok: false, reason: guardFail };

  const store = loadTransportBidCandidateStore();
  const idx = store.records.findIndex((r) =>
    recordMatches(r, tenderId, lineId, dwellingId),
  );
  const persistDwelling =
    input.dwellingId != null && String(input.dwellingId).trim()
      ? dwellingId
      : undefined;
  const record: TransportBidCandidateRecord = {
    tenderId,
    lineId,
    ...(persistDwelling ? { dwellingId: persistDwelling } : {}),
    domain: "transport",
    identityKind: "transport_line",
    sourceClass: "bid_candidate",
    markedAt: input.markedAt ?? new Date().toISOString(),
    ...(input.markedByRole ? { markedByRole: input.markedByRole } : {}),
  };

  // When multi passes dwellingId explicitly, always persist it (incl. default).
  if (input.dwellingId != null && String(input.dwellingId).trim()) {
    record.dwellingId = dwellingId;
  }

  if (idx >= 0) {
    store.records[idx] = record;
    if (!saveTransportBidCandidateStore(store)) {
      return { ok: false, reason: "STORAGE_UNAVAILABLE" };
    }
    return { ok: true, record, created: false };
  }

  store.records.push(record);
  if (!saveTransportBidCandidateStore(store)) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }
  return { ok: true, record, created: true };
}

export function unmarkTransportBidCandidate(
  input: UnmarkTransportBidCandidateInput,
): UnmarkTransportBidCandidateResult {
  const tenderId = String(input.tenderId ?? "").trim();
  const lineId = String(input.lineId ?? "").trim();
  const dwellingId = normalizeDwellingId(input.dwellingId);
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!lineId) return { ok: false, reason: "MISSING_LINE_ID" };

  const store = loadTransportBidCandidateStore();
  const next = store.records.filter(
    (r) => !recordMatches(r, tenderId, lineId, dwellingId),
  );
  const removed = next.length !== store.records.length;
  if (!removed) return { ok: true, removed: false };
  if (!saveTransportBidCandidateStore({ version: 1, records: next })) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }
  return { ok: true, removed: true };
}

/** True when catalog categoryId is TRANSPORT_UTYLIZACJA (not logistics Bid). */
export function isTransportUtylizacjaLine(line: {
  categoryId?: string | null;
}): boolean {
  return String(line.categoryId ?? "").trim().toUpperCase() === "TRANSPORT_UTYLIZACJA";
}

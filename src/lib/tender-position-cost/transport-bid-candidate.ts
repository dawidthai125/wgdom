/**
 * TRANSPORT MODEL-1B — explicit Bid Transport candidate marks (A1).
 * localStorage only · ZERO Cloud Sync / DATA_KEYS / OfferBoq mutation.
 * Identity only — NOT a price (price = Owner Input owner_input).
 */

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
      domain: "transport",
      identityKind: "transport_line",
      sourceClass: "bid_candidate",
      markedAt: r.markedAt,
      ...(r.markedByRole ? { markedByRole: r.markedByRole } : {}),
    })),
  };
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
    // Any noise line is not Bid Transport logistics.
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

export function isTransportBidCandidate(tenderId: string, lineId: string): boolean {
  const tid = String(tenderId ?? "").trim();
  const lid = String(lineId ?? "").trim();
  if (!tid || !lid) return false;
  return loadTransportBidCandidateStore().records.some(
    (r) => r.tenderId === tid && r.lineId === lid,
  );
}

export function listTransportBidCandidates(tenderId: string): TransportBidCandidateRecord[] {
  const tid = String(tenderId ?? "").trim();
  if (!tid) return [];
  return loadTransportBidCandidateStore().records.filter((r) => r.tenderId === tid);
}

export function markTransportBidCandidate(
  input: MarkTransportBidCandidateInput,
): MarkTransportBidCandidateResult {
  const tenderId = String(input.tenderId ?? "").trim();
  const lineId = String(input.lineId ?? "").trim();
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!lineId) return { ok: false, reason: "MISSING_LINE_ID" };

  const guardFail = evaluateMarkGuard(input.guard);
  if (guardFail) return { ok: false, reason: guardFail };

  const store = loadTransportBidCandidateStore();
  const idx = store.records.findIndex(
    (r) => r.tenderId === tenderId && r.lineId === lineId,
  );
  const record: TransportBidCandidateRecord = {
    tenderId,
    lineId,
    domain: "transport",
    identityKind: "transport_line",
    sourceClass: "bid_candidate",
    markedAt: input.markedAt ?? new Date().toISOString(),
    ...(input.markedByRole ? { markedByRole: input.markedByRole } : {}),
  };

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
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!lineId) return { ok: false, reason: "MISSING_LINE_ID" };

  const store = loadTransportBidCandidateStore();
  const next = store.records.filter(
    (r) => !(r.tenderId === tenderId && r.lineId === lineId),
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

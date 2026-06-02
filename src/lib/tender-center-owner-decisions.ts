/**
 * Tender Center PRO — decyzje właściciela (ETAP 3A).
 * Tylko localStorage — bez KV i cloud-sync.
 */

import type { TenderDecision } from "@/lib/tender-center-decision";

export const TENDER_DECISIONS_STORAGE_KEY = "kw-tender-decisions";

export interface OwnerTenderDecisionRecord {
  id: string;
  decision: TenderDecision;
  createdAt: string;
  updatedAt: string;
  systemDecision: TenderDecision;
  opportunityScore: number;
  strategicScore: number;
}

export interface OwnerDecisionsStore {
  version: 1;
  byId: Record<string, OwnerTenderDecisionRecord>;
}

export interface OwnerDecisionStats {
  go: number;
  hold: number;
  noGo: number;
  total: number;
}

export interface OwnerSystemAlignment {
  /** Procent decyzji właściciela zgodnych z systemDecision (snapshot przy zapisie). */
  agreementPct: number;
  aligned: number;
  compared: number;
}

function emptyStore(): OwnerDecisionsStore {
  return { version: 1, byId: {} };
}

function isTenderDecision(v: unknown): v is TenderDecision {
  return v === "GO" || v === "HOLD" || v === "NO-GO";
}

function parseRecord(raw: unknown): OwnerTenderDecisionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OwnerTenderDecisionRecord>;
  if (typeof r.id !== "string" || !r.id) return null;
  if (!isTenderDecision(r.decision) || !isTenderDecision(r.systemDecision)) return null;
  if (typeof r.createdAt !== "string" || typeof r.updatedAt !== "string") return null;
  const opp = Number(r.opportunityScore);
  const strat = Number(r.strategicScore);
  if (!Number.isFinite(opp) || !Number.isFinite(strat)) return null;
  return {
    id: r.id,
    decision: r.decision,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    systemDecision: r.systemDecision,
    opportunityScore: opp,
    strategicScore: strat,
  };
}

export function loadOwnerDecisions(): OwnerDecisionsStore {
  try {
    const raw = localStorage.getItem(TENDER_DECISIONS_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<OwnerDecisionsStore>;
    if (parsed.version !== 1 || !parsed.byId || typeof parsed.byId !== "object") {
      return emptyStore();
    }
    const byId: Record<string, OwnerTenderDecisionRecord> = {};
    for (const [key, val] of Object.entries(parsed.byId)) {
      const rec = parseRecord(val);
      if (rec) byId[key] = rec;
    }
    return { version: 1, byId };
  } catch {
    return emptyStore();
  }
}

export function saveOwnerDecisions(store: OwnerDecisionsStore): void {
  try {
    localStorage.setItem(TENDER_DECISIONS_STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore quota */ }
}

export function upsertOwnerDecision(
  store: OwnerDecisionsStore,
  input: {
    id: string;
    decision: TenderDecision;
    systemDecision: TenderDecision;
    opportunityScore: number;
    strategicScore: number;
    now?: string;
  },
): OwnerDecisionsStore {
  const now = input.now ?? new Date().toISOString();
  const prev = store.byId[input.id];
  const record: OwnerTenderDecisionRecord = {
    id: input.id,
    decision: input.decision,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    systemDecision: input.systemDecision,
    opportunityScore: input.opportunityScore,
    strategicScore: input.strategicScore,
  };
  return {
    version: 1,
    byId: { ...store.byId, [input.id]: record },
  };
}

export function removeOwnerDecision(store: OwnerDecisionsStore, id: string): OwnerDecisionsStore {
  if (!store.byId[id]) return store;
  const next = { ...store.byId };
  delete next[id];
  return { version: 1, byId: next };
}

export function listOwnerDecisions(store: OwnerDecisionsStore): OwnerTenderDecisionRecord[] {
  return Object.values(store.byId).sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function computeOwnerDecisionStats(store: OwnerDecisionsStore): OwnerDecisionStats {
  const records = Object.values(store.byId);
  return {
    go: records.filter((r) => r.decision === "GO").length,
    hold: records.filter((r) => r.decision === "HOLD").length,
    noGo: records.filter((r) => r.decision === "NO-GO").length,
    total: records.length,
  };
}

/** Zgodność decyzji właściciela z rekomendacją systemu (snapshot przy zapisie). */
export function computeOwnerSystemAlignment(store: OwnerDecisionsStore): OwnerSystemAlignment {
  const records = Object.values(store.byId);
  if (records.length === 0) {
    return { agreementPct: 0, aligned: 0, compared: 0 };
  }
  const aligned = records.filter((r) => r.decision === r.systemDecision).length;
  const agreementPct = Math.round((aligned / records.length) * 100);
  return { agreementPct, aligned, compared: records.length };
}

/** Zgodność bieżących decyzji właściciela z aktualną rekomendacją systemu. */
export function computeLiveSystemAlignment(
  store: OwnerDecisionsStore,
  currentSystemById: Record<string, TenderDecision>,
): OwnerSystemAlignment {
  const entries = Object.values(store.byId).filter((r) => currentSystemById[r.id] != null);
  if (entries.length === 0) {
    return { agreementPct: 0, aligned: 0, compared: 0 };
  }
  const aligned = entries.filter((r) => r.decision === currentSystemById[r.id]).length;
  return {
    agreementPct: Math.round((aligned / entries.length) * 100),
    aligned,
    compared: entries.length,
  };
}

export function ownerDecisionMatchesSystem(
  owner: TenderDecision | null | undefined,
  system: TenderDecision,
): boolean {
  return owner != null && owner === system;
}

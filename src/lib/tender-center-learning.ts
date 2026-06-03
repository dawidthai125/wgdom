/**
 * W&G DOM COMMAND CENTER AI — Learning Engine (ETAP 7A).
 * Osobny localStorage — bez KV i cloud-sync.
 */

import type { TenderDecision } from "@/lib/tender-center-decision";

export const TENDER_LEARNING_STORAGE_KEY = "kw-tender-learning";

export type LearningReasonId =
  | "brak_ludzi"
  | "za_wysokie_wadium"
  | "za_duze_ryzyko"
  | "za_mala_marza"
  | "za_krotki_termin"
  | "brak_referencji"
  | "poza_regionem"
  | "inne";

export const LEARNING_REASON_OPTIONS: ReadonlyArray<{
  id: LearningReasonId;
  label: string;
}> = [
  { id: "brak_ludzi", label: "Brak ludzi" },
  { id: "za_wysokie_wadium", label: "Za wysokie wadium" },
  { id: "za_duze_ryzyko", label: "Za duże ryzyko" },
  { id: "za_mala_marza", label: "Za mała marża" },
  { id: "za_krotki_termin", label: "Za krótki termin" },
  { id: "brak_referencji", label: "Brak referencji" },
  { id: "poza_regionem", label: "Poza regionem" },
  { id: "inne", label: "Inne" },
];

export interface TenderLearningEntry {
  id: string;
  tenderId: string;
  ownerDecision: TenderDecision;
  reason: LearningReasonId;
  customReason: string;
  systemDecision: TenderDecision;
  opportunityScore: number;
  strategicScore: number;
  impactScore: number;
  createdAt: string;
}

export interface TenderLearningStore {
  version: 1;
  entries: TenderLearningEntry[];
}

export interface LearningStats {
  total: number;
  go: number;
  hold: number;
  noGo: number;
  reasons: Record<string, number>;
}

function emptyStore(): TenderLearningStore {
  return { version: 1, entries: [] };
}

function isLearningReasonId(v: unknown): v is LearningReasonId {
  return LEARNING_REASON_OPTIONS.some((o) => o.id === v);
}

function isTenderDecision(v: unknown): v is TenderDecision {
  return v === "GO" || v === "HOLD" || v === "NO-GO";
}

function parseEntry(raw: unknown): TenderLearningEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<TenderLearningEntry>;
  if (typeof e.id !== "string" || !e.id) return null;
  if (typeof e.tenderId !== "string" || !e.tenderId) return null;
  if (!isTenderDecision(e.ownerDecision) || !isTenderDecision(e.systemDecision)) return null;
  if (!isLearningReasonId(e.reason)) return null;
  if (typeof e.createdAt !== "string") return null;
  const opp = Number(e.opportunityScore);
  const strat = Number(e.strategicScore);
  const impact = Number(e.impactScore);
  if (!Number.isFinite(opp) || !Number.isFinite(strat) || !Number.isFinite(impact)) return null;
  return {
    id: e.id,
    tenderId: e.tenderId,
    ownerDecision: e.ownerDecision,
    reason: e.reason,
    customReason: typeof e.customReason === "string" ? e.customReason : "",
    systemDecision: e.systemDecision,
    opportunityScore: opp,
    strategicScore: strat,
    impactScore: impact,
    createdAt: e.createdAt,
  };
}

export function loadTenderLearning(): TenderLearningStore {
  try {
    const raw = localStorage.getItem(TENDER_LEARNING_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<TenderLearningStore>;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return emptyStore();
    const entries = parsed.entries
      .map(parseEntry)
      .filter((e): e is TenderLearningEntry => e != null);
    return { version: 1, entries };
  } catch {
    return emptyStore();
  }
}

export function saveTenderLearning(store: TenderLearningStore): void {
  try {
    localStorage.setItem(TENDER_LEARNING_STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore quota */ }
}

export function recordTenderLearningDecision(input: {
  tenderId: string;
  ownerDecision: TenderDecision;
  reason: LearningReasonId;
  customReason?: string;
  systemDecision: TenderDecision;
  opportunityScore: number;
  strategicScore: number;
  impactScore: number;
  now?: string;
}): TenderLearningStore {
  const store = loadTenderLearning();
  const now = input.now ?? new Date().toISOString();
  const entry: TenderLearningEntry = {
    id: `${input.tenderId}-${now}`,
    tenderId: input.tenderId,
    ownerDecision: input.ownerDecision,
    reason: input.reason,
    customReason: input.customReason?.trim() ?? "",
    systemDecision: input.systemDecision,
    opportunityScore: input.opportunityScore,
    strategicScore: input.strategicScore,
    impactScore: input.impactScore,
    createdAt: now,
  };
  const next: TenderLearningStore = {
    version: 1,
    entries: [entry, ...store.entries],
  };
  saveTenderLearning(next);
  return next;
}

export function getLearningStats(store?: TenderLearningStore): LearningStats {
  const s = store ?? loadTenderLearning();
  const reasons: Record<string, number> = {};
  for (const e of s.entries) {
    reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
  }
  return {
    total: s.entries.length,
    go: s.entries.filter((e) => e.ownerDecision === "GO").length,
    hold: s.entries.filter((e) => e.ownerDecision === "HOLD").length,
    noGo: s.entries.filter((e) => e.ownerDecision === "NO-GO").length,
    reasons,
  };
}

export function learningReasonLabel(reason: LearningReasonId | string): string {
  const found = LEARNING_REASON_OPTIONS.find((o) => o.id === reason);
  return found?.label ?? reason;
}

export function topLearningReasons(
  stats: LearningStats,
  limit = 5,
): Array<{ id: string; label: string; count: number }> {
  return Object.entries(stats.reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      id,
      label: learningReasonLabel(id),
      count,
    }));
}

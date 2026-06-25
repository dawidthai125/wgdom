/**
 * Przetargi → Lista — UX V2/V3 (workspace właściciela, filtry, sort, prefs localStorage).
 * Bez zmian pipeline/KV/sync — tylko warstwa prezentacji.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  daysUntilTenderDeadline,
  isActionableTender,
  isTenderOpenForOffers,
  parseTenderDeadline,
  type TenderPipelineStatus,
} from "@/lib/tenders-bzp";
import type { TenderQuickFilter } from "@/lib/tenders-actions";
import { matchesQuickFilter } from "@/lib/tenders-actions";
import type { StrategicClientFilterId } from "@/lib/tenders-strategic-client-filters";
import type { OwnerDecisionsStore } from "@/lib/tenders-strategy-owner-decisions";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";

export type TenderPipelineLocalFilter =
  | "actionable"
  | "active"
  | "priority"
  | "wroclaw"
  | "high"
  | "archive"
  | "all";

export const TENDERS_LIST_FILTER_PREFS_KEY = "wg-tenders-list-filter-prefs-v3";
export const TENDERS_LIST_FILTER_PREFS_KEY_V2 = "wg-tenders-list-filter-prefs-v2";
export const TENDERS_LIST_FAVORITES_KEY = "wg-tenders-list-favorites-v3";

export type TendersListQueueId =
  | "needs_decision"
  | "deadline_today"
  | "deadline_tomorrow"
  | "no_kosztorys"
  | "reference_gap";

export const TENDERS_LIST_QUEUE: readonly { id: TendersListQueueId; label: string }[] = [
  { id: "needs_decision", label: "Do decyzji" },
  { id: "deadline_today", label: "Kończy się dziś" },
  { id: "deadline_tomorrow", label: "Kończy się jutro" },
  { id: "no_kosztorys", label: "Brak kosztorysu" },
  { id: "reference_gap", label: "Brak referencji" },
] as const;

export type TendersListQuickBarId =
  | "all"
  | "mine"
  | "actionable"
  | "deadline_7d"
  | "no_kosztorys"
  | "wm"
  | "zzk";

export type TendersListKpiId = "active" | "actionable" | "urgent" | "priority";

export interface TendersListFilterPrefs {
  version: 3;
  search: string;
  localFilter: TenderPipelineLocalFilter;
  statusFilter: TenderPipelineStatus | "all";
  quickFilter: TenderQuickFilter | null;
  strategicClientFilter: StrategicClientFilterId | null;
  mineOnly: boolean;
  quickBarId: TendersListQuickBarId | null;
  queueFilter: TendersListQueueId | null;
}

export interface TendersListFavoritePreset {
  id: string;
  name: string;
  pinned: boolean;
  createdAt: string;
  search: string;
  localFilter: TenderPipelineLocalFilter;
  statusFilter: TenderPipelineStatus | "all";
  quickFilter: TenderQuickFilter | null;
  strategicClientFilter: StrategicClientFilterId | null;
  mineOnly: boolean;
  queueFilter: TendersListQueueId | null;
}

export interface TendersListAiInsight {
  text: string;
  tone: "neutral" | "action" | "positive";
}

export interface MyQueueCounts {
  needs_decision: number;
  deadline_today: number;
  deadline_tomorrow: number;
  no_kosztorys: number;
  reference_gap: number;
}

export const TENDERS_LIST_QUICK_BAR: readonly { id: TendersListQuickBarId; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "mine", label: "Moje" },
  { id: "actionable", label: "Do zgłoszenia" },
  { id: "deadline_7d", label: "≤7 dni" },
  { id: "no_kosztorys", label: "Bez kosztorysu" },
  { id: "wm", label: "WM" },
  { id: "zzk", label: "ZZK" },
] as const;

const MINE_STATUSES: TenderPipelineStatus[] = ["interested", "preparing", "submitted"];
const MINE_DECISIONS: TenderDecision[] = ["GO", "HOLD"];

const LOCAL_FILTERS: TenderPipelineLocalFilter[] = [
  "actionable", "active", "priority", "wroclaw", "high", "archive", "all",
];

const QUICK_FILTERS: TenderQuickFilter[] = [
  "deadline_no_bid", "wadium_blocked", "no_kosztorys", "deadline_7d", "reference_gap", "overload",
];

const STRATEGIC_IDS: StrategicClientFilterId[] = ["wm", "zzk", "mops", "tbs", "gminy", "uczelnie"];

const STATUS_VALUES: (TenderPipelineStatus | "all")[] = [
  "all", "new", "seen", "interested", "preparing", "submitted", "won", "lost", "ignored",
];

const QUEUE_IDS: TendersListQueueId[] = [
  "needs_decision", "deadline_today", "deadline_tomorrow", "no_kosztorys", "reference_gap",
];

function parseFilterPrefs(raw: Partial<TendersListFilterPrefs>, version: 2 | 3): TendersListFilterPrefs | null {
  if (typeof raw.search !== "string") return null;
  if (!LOCAL_FILTERS.includes(raw.localFilter as TenderPipelineLocalFilter)) return null;
  if (!STATUS_VALUES.includes(raw.statusFilter as TenderPipelineStatus | "all")) return null;
  if (raw.quickFilter != null && !QUICK_FILTERS.includes(raw.quickFilter as TenderQuickFilter)) return null;
  if (raw.strategicClientFilter != null && !STRATEGIC_IDS.includes(raw.strategicClientFilter as StrategicClientFilterId)) {
    return null;
  }
  const queueFilter = version === 3
    ? ((raw.queueFilter as TendersListQueueId | null) ?? null)
    : null;
  if (queueFilter != null && !QUEUE_IDS.includes(queueFilter)) return null;
  const base = {
    search: raw.search,
    localFilter: raw.localFilter as TenderPipelineLocalFilter,
    statusFilter: raw.statusFilter as TenderPipelineStatus | "all",
    quickFilter: (raw.quickFilter as TenderQuickFilter | null) ?? null,
    strategicClientFilter: (raw.strategicClientFilter as StrategicClientFilterId | null) ?? null,
    mineOnly: raw.mineOnly === true,
    quickBarId: (raw.quickBarId as TendersListQuickBarId | null) ?? null,
    queueFilter,
  };
  return { version: 3, ...base };
}

export function loadTendersListFilterPrefs(): TendersListFilterPrefs | null {
  try {
    const rawV3 = localStorage.getItem(TENDERS_LIST_FILTER_PREFS_KEY);
    if (rawV3) {
      const p = JSON.parse(rawV3) as Partial<TendersListFilterPrefs>;
      if (p.version === 3) return parseFilterPrefs(p, 3);
    }
    const rawV2 = localStorage.getItem(TENDERS_LIST_FILTER_PREFS_KEY_V2);
    if (rawV2) {
      const p = JSON.parse(rawV2) as Partial<TendersListFilterPrefs>;
      if (p.version === 2) return parseFilterPrefs(p, 2);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveTendersListFilterPrefs(prefs: TendersListFilterPrefs): void {
  try {
    localStorage.setItem(TENDERS_LIST_FILTER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}

export function isTenderMine(
  item: TenderPipelineItem,
  ownerStore: OwnerDecisionsStore,
): boolean {
  const rec = ownerStore.byId[item.id];
  if (rec && MINE_DECISIONS.includes(rec.decision)) return true;
  return MINE_STATUSES.includes(item.status);
}

export function isTenderNeedsDecision(
  item: TenderPipelineItem,
  ownerStore: OwnerDecisionsStore,
): boolean {
  if (!isActionableTender(item)) return false;
  if (["ignored", "lost", "won", "submitted"].includes(item.status)) return false;
  if (ownerStore.byId[item.id]) return false;
  return ["new", "seen", "interested", "preparing"].includes(item.status);
}

const PL_TZ = "Europe/Warsaw";

function plCalendarDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: PL_TZ });
}

/** Dni kalendarzowe do terminu (PL) — spójne z tenders-attention „Termin dziś/jutro”. */
function calendarDaysUntilDeadline(
  iso: string | null | undefined,
  now = new Date(),
): number | null {
  const d = parseTenderDeadline(iso);
  if (!d || d.getTime() <= now.getTime()) return null;
  const today = plCalendarDayKey(now);
  const deadline = plCalendarDayKey(d);
  const t0 = new Date(`${today}T12:00:00`);
  const t1 = new Date(`${deadline}T12:00:00`);
  return Math.round((t1.getTime() - t0.getTime()) / 86400000);
}

export function isDeadlineToday(item: TenderPipelineItem, now = new Date()): boolean {
  const d = calendarDaysUntilDeadline(item.submittingOffersDate, now);
  return isTenderOpenForOffers(item.submittingOffersDate, now) && d === 0;
}

export function isDeadlineTomorrow(item: TenderPipelineItem, now = new Date()): boolean {
  const d = calendarDaysUntilDeadline(item.submittingOffersDate, now);
  return isTenderOpenForOffers(item.submittingOffersDate, now) && d === 1;
}

export function computeMyQueueCounts(
  items: TenderPipelineItem[],
  ownerStore: OwnerDecisionsStore,
): MyQueueCounts {
  return {
    needs_decision: items.filter((i) => isTenderNeedsDecision(i, ownerStore)).length,
    deadline_today: items.filter((i) => isDeadlineToday(i)).length,
    deadline_tomorrow: items.filter((i) => isDeadlineTomorrow(i)).length,
    no_kosztorys: items.filter((i) => matchesQuickFilter(i, "no_kosztorys")).length,
    reference_gap: items.filter((i) => matchesQuickFilter(i, "reference_gap")).length,
  };
}

export function matchesQueueFilter(
  item: TenderPipelineItem,
  queueId: TendersListQueueId,
  ownerStore: OwnerDecisionsStore,
): boolean {
  switch (queueId) {
    case "needs_decision":
      return isTenderNeedsDecision(item, ownerStore);
    case "deadline_today":
      return isDeadlineToday(item);
    case "deadline_tomorrow":
      return isDeadlineTomorrow(item);
    case "no_kosztorys":
      return matchesQuickFilter(item, "no_kosztorys");
    case "reference_gap":
      return matchesQuickFilter(item, "reference_gap");
    default:
      return true;
  }
}

export function applyQueuePreset(
  queueId: TendersListQueueId,
): Pick<TendersListFilterPrefs, "localFilter" | "quickFilter" | "strategicClientFilter" | "mineOnly" | "quickBarId" | "statusFilter" | "queueFilter"> {
  switch (queueId) {
    case "needs_decision":
      return {
        localFilter: "actionable",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
        queueFilter: "needs_decision",
      };
    case "deadline_today":
      return {
        localFilter: "active",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
        queueFilter: "deadline_today",
      };
    case "deadline_tomorrow":
      return {
        localFilter: "active",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
        queueFilter: "deadline_tomorrow",
      };
    case "no_kosztorys":
      return { ...applyListQuickBarPreset("no_kosztorys"), queueFilter: "no_kosztorys" };
    case "reference_gap":
      return {
        localFilter: "active",
        quickFilter: "reference_gap",
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
        queueFilter: "reference_gap",
      };
    default:
      return { ...applyListQuickBarPreset("actionable"), queueFilter: null };
  }
}

export function loadTendersListFavorites(): TendersListFavoritePreset[] {
  try {
    const raw = localStorage.getItem(TENDERS_LIST_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: TendersListFavoritePreset[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Partial<TendersListFavoritePreset>;
      if (typeof r.id !== "string" || typeof r.name !== "string") continue;
      if (!LOCAL_FILTERS.includes(r.localFilter as TenderPipelineLocalFilter)) continue;
      out.push({
        id: r.id,
        name: r.name.slice(0, 40),
        pinned: r.pinned === true,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
        search: typeof r.search === "string" ? r.search : "",
        localFilter: r.localFilter as TenderPipelineLocalFilter,
        statusFilter: (STATUS_VALUES.includes(r.statusFilter as TenderPipelineStatus | "all")
          ? r.statusFilter
          : "all") as TenderPipelineStatus | "all",
        quickFilter: (r.quickFilter as TenderQuickFilter | null) ?? null,
        strategicClientFilter: (r.strategicClientFilter as StrategicClientFilterId | null) ?? null,
        mineOnly: r.mineOnly === true,
        queueFilter: (r.queueFilter as TendersListQueueId | null) ?? null,
      });
    }
    return out.slice(0, 12);
  } catch {
    return [];
  }
}

export function saveTendersListFavorites(presets: TendersListFavoritePreset[]): void {
  try {
    localStorage.setItem(TENDERS_LIST_FAVORITES_KEY, JSON.stringify(presets.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

export function createFavoriteFromState(
  name: string,
  state: Omit<TendersListFilterPrefs, "version" | "quickBarId">,
): TendersListFavoritePreset {
  return {
    id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 40) || "Preset",
    pinned: true,
    createdAt: new Date().toISOString(),
    search: state.search,
    localFilter: state.localFilter,
    statusFilter: state.statusFilter,
    quickFilter: state.quickFilter,
    strategicClientFilter: state.strategicClientFilter,
    mineOnly: state.mineOnly,
    queueFilter: state.queueFilter,
  };
}

export function applyFavoritePreset(
  preset: TendersListFavoritePreset,
): TendersListFilterPrefs {
  return {
    version: 3,
    search: preset.search,
    localFilter: preset.localFilter,
    statusFilter: preset.statusFilter,
    quickFilter: preset.quickFilter,
    strategicClientFilter: preset.strategicClientFilter,
    mineOnly: preset.mineOnly,
    queueFilter: preset.queueFilter,
    quickBarId: detectListQuickBarId({
      localFilter: preset.localFilter,
      quickFilter: preset.quickFilter,
      strategicClientFilter: preset.strategicClientFilter,
      mineOnly: preset.mineOnly,
      statusFilter: preset.statusFilter,
    }),
  };
}

function pickBestOpportunityLabel(items: TenderPipelineItem[]): string | null {
  const candidates = items.filter((i) => isActionableTender(i));
  if (candidates.length === 0) return null;
  const sorted = sortTendersForListDisplay(candidates);
  const top = sorted[0];
  if (!top) return null;
  if (top.priorityBuyerLabel) return top.priorityBuyerLabel;
  if (top.priorityBuyerId === "wm") return "WM";
  const short = top.organizationName.split(/[,\-]/)[0]?.trim();
  return short && short.length <= 32 ? short : top.title.slice(0, 32);
}

export function buildTendersListAiInsight(
  items: TenderPipelineItem[],
  ownerStore: OwnerDecisionsStore,
  queueCounts: MyQueueCounts,
): TendersListAiInsight {
  const decisions = queueCounts.needs_decision;
  if (decisions > 0) {
    const word = decisions === 1 ? "przetarg" : decisions < 5 ? "przetargi" : "przetargów";
    return {
      text: `Masz dziś ${decisions} ${word} wymagających decyzji.`,
      tone: "action",
    };
  }
  const best = pickBestOpportunityLabel(items);
  if (best) {
    return {
      text: `Największy potencjał ma przetarg ${best}.`,
      tone: "positive",
    };
  }
  const urgent = queueCounts.deadline_today + queueCounts.deadline_tomorrow;
  if (urgent === 0 && items.filter(isTenderNeedsReactionToday).length === 0) {
    return { text: "Nie wykryto pilnych zadań.", tone: "neutral" };
  }
  return { text: "Przejrzyj kolejkę — są terminy do ogarnięcia.", tone: "action" };
}

/** Zadania wymagające reakcji dziś (operacyjne, nie analityczne). */
export function isTenderNeedsReactionToday(item: TenderPipelineItem): boolean {
  if (!isActionableTender(item)) return false;
  if (item.status === "new") return true;
  if (matchesQuickFilter(item, "deadline_no_bid")) return true;
  if (matchesQuickFilter(item, "wadium_blocked")) return true;
  if (
    matchesQuickFilter(item, "no_kosztorys")
    && (item.status === "interested" || item.status === "preparing")
  ) {
    return true;
  }
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  if (
    matchesQuickFilter(item, "deadline_7d")
    && ["new", "seen", "interested", "preparing"].includes(item.status)
    && days !== null
    && days <= 3
  ) {
    return true;
  }
  return false;
}

function listUrgencyScore(item: TenderPipelineItem): number {
  let score = 0;
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const open = isTenderOpenForOffers(item.submittingOffersDate);

  if (matchesQuickFilter(item, "deadline_no_bid")) score += 10_000;
  else if (matchesQuickFilter(item, "wadium_blocked") && isActionableTender(item)) score += 9_000;
  else if (open && days !== null && days >= 0 && days <= 3) score += 8_000;
  else if (matchesQuickFilter(item, "deadline_7d")) score += 6_000;

  if (item.status === "new" && isActionableTender(item)) score += 5_000;

  if (item.priorityBuyerId) score += 2_000;
  if (item.isWroclaw) score += 1_000;
  if (item.relevanceScore >= 20) score += 500;

  if (open && days !== null && days >= 0) {
    score += Math.max(0, 30 - days) * 10;
  }

  return score;
}

/** Sort: pilne → strategiczne → reszta (deadline jako tie-break). */
export function sortTendersForListDisplay(items: TenderPipelineItem[]): TenderPipelineItem[] {
  return [...items].sort((a, b) => {
    const scoreDiff = listUrgencyScore(b) - listUrgencyScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    const aOpen = isTenderOpenForOffers(a.submittingOffersDate);
    const bOpen = isTenderOpenForOffers(b.submittingOffersDate);
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    if (aOpen && bOpen) {
      return (a.submittingOffersDate || "").localeCompare(b.submittingOffersDate || "");
    }
    return (b.publicationDate || "").localeCompare(a.publicationDate || "");
  });
}

export function applyListQuickBarPreset(
  id: TendersListQuickBarId,
): Pick<TendersListFilterPrefs, "localFilter" | "quickFilter" | "strategicClientFilter" | "mineOnly" | "quickBarId" | "statusFilter"> {
  switch (id) {
    case "all":
      return {
        localFilter: "all",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: "all",
        statusFilter: "all",
      };
    case "mine":
      return {
        localFilter: "active",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: true,
        quickBarId: "mine",
        statusFilter: "all",
      };
    case "actionable":
      return {
        localFilter: "actionable",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: "actionable",
        statusFilter: "all",
      };
    case "deadline_7d":
      return {
        localFilter: "active",
        quickFilter: "deadline_7d",
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: "deadline_7d",
        statusFilter: "all",
      };
    case "no_kosztorys":
      return {
        localFilter: "active",
        quickFilter: "no_kosztorys",
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: "no_kosztorys",
        statusFilter: "all",
      };
    case "wm":
      return {
        localFilter: "active",
        quickFilter: null,
        strategicClientFilter: "wm",
        mineOnly: false,
        quickBarId: "wm",
        statusFilter: "all",
      };
    case "zzk":
      return {
        localFilter: "active",
        quickFilter: null,
        strategicClientFilter: "zzk",
        mineOnly: false,
        quickBarId: "zzk",
        statusFilter: "all",
      };
    default:
      return {
        localFilter: "actionable",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
      };
  }
}

export function applyListKpiPreset(
  kpi: TendersListKpiId,
): Pick<TendersListFilterPrefs, "localFilter" | "quickFilter" | "strategicClientFilter" | "mineOnly" | "quickBarId" | "statusFilter"> {
  switch (kpi) {
    case "active":
      return {
        localFilter: "active",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
      };
    case "actionable":
      return applyListQuickBarPreset("actionable");
    case "urgent":
      return applyListQuickBarPreset("deadline_7d");
    case "priority":
      return {
        localFilter: "priority",
        quickFilter: null,
        strategicClientFilter: null,
        mineOnly: false,
        quickBarId: null,
        statusFilter: "all",
      };
    default:
      return applyListQuickBarPreset("actionable");
  }
}

export function detectActiveListKpi(state: {
  localFilter: TenderPipelineLocalFilter;
  quickFilter: TenderQuickFilter | null;
  strategicClientFilter: StrategicClientFilterId | null;
  mineOnly: boolean;
}): TendersListKpiId | null {
  if (state.mineOnly) return null;
  if (state.localFilter === "active" && !state.quickFilter && !state.strategicClientFilter) return "active";
  if (state.localFilter === "actionable" && !state.quickFilter && !state.strategicClientFilter) return "actionable";
  if (state.quickFilter === "deadline_7d") return "urgent";
  if (state.localFilter === "priority" && !state.quickFilter && !state.strategicClientFilter) return "priority";
  return null;
}

export function detectListQuickBarId(state: {
  localFilter: TenderPipelineLocalFilter;
  quickFilter: TenderQuickFilter | null;
  strategicClientFilter: StrategicClientFilterId | null;
  mineOnly: boolean;
  statusFilter: TenderPipelineStatus | "all";
}): TendersListQuickBarId | null {
  if (state.statusFilter !== "all") return null;
  if (state.mineOnly) return "mine";
  if (state.localFilter === "all" && !state.quickFilter && !state.strategicClientFilter) return "all";
  if (state.localFilter === "actionable" && !state.quickFilter && !state.strategicClientFilter) return "actionable";
  if (state.localFilter === "active" && state.quickFilter === "deadline_7d" && !state.strategicClientFilter) return "deadline_7d";
  if (state.localFilter === "active" && state.quickFilter === "no_kosztorys" && !state.strategicClientFilter) return "no_kosztorys";
  if (state.localFilter === "active" && !state.quickFilter && state.strategicClientFilter === "wm") return "wm";
  if (state.localFilter === "active" && !state.quickFilter && state.strategicClientFilter === "zzk") return "zzk";
  return null;
}

export function buildTendersListFilterPrefs(state: {
  search: string;
  localFilter: TenderPipelineLocalFilter;
  statusFilter: TenderPipelineStatus | "all";
  quickFilter: TenderQuickFilter | null;
  strategicClientFilter: StrategicClientFilterId | null;
  mineOnly: boolean;
  queueFilter: TendersListQueueId | null;
}): TendersListFilterPrefs {
  return {
    version: 3,
    search: state.search,
    localFilter: state.localFilter,
    statusFilter: state.statusFilter,
    quickFilter: state.quickFilter,
    strategicClientFilter: state.strategicClientFilter,
    mineOnly: state.mineOnly,
    queueFilter: state.queueFilter,
    quickBarId: detectListQuickBarId(state),
  };
}

/**
 * UX.2S — Strategy Simplification (UI-only helpers).
 * Strategia = centrum decyzji, nie centrum analityki.
 */

import {
  daysUntilTenderDeadline,
  isTenderOpenForOffers,
  type TenderPipelineItem,
} from "@/lib/tenders-bzp";
import type { TenderScoringBundle, TenderDecision } from "@/lib/tenders-strategy-decision";
import { DECISION_LABEL_PL } from "@/lib/tenders-strategy-decision";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { OwnerDecisionsStore } from "@/lib/tenders-strategy-owner-decisions";
import type { TendersStrategyMarketKpi } from "@/lib/tenders-strategy-kpi";
import type { CompanyHealthResult } from "@/lib/tenders-strategy-health";
import { HEALTH_LABEL_PL } from "@/lib/tenders-strategy-health";
import type { FinancialCapacityResult } from "@/lib/tenders-strategy-financial-capacity";
import type { Forecast90DaysResult } from "@/lib/tenders-strategy-forecast-90d";
import { primaryForecastScenario } from "@/lib/tenders-strategy-forecast-90d";
import type { PortfolioDecisionCounts } from "@/lib/tenders-strategy-decision";
import type { GrowthMode } from "@/lib/tenders-strategy-growth-mode";
import { GROWTH_MODE_LABELS } from "@/lib/tenders-strategy-growth-mode";
import { WHAT_IF_PRESET_LABELS } from "@/lib/tenders-strategy-what-if";
import {
  collectAllChangeEvents,
  type TenderChangeEvent,
} from "@/lib/tender-change-monitor";
import {
  collectAllQaEvents,
  type TenderQaEvent,
} from "@/lib/tender-qa-monitor";
import { formatForecastSlots } from "@/lib/tenders-strategy-forecast-display";

export const STRATEGY_DECISION_TOP_LIMIT = 5;
export const STRATEGY_URGENT_TOP_LIMIT = 5;
export const STRATEGY_MONITORING_TOP_LIMIT = 5;
export const STRATEGY_MIN_DECISION_SCORE = 55;

const PL_TZ = "Europe/Warsaw";

function plCalendarDayKey(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return plCalendarDayKey(now.toISOString(), now);
  return d.toLocaleDateString("en-CA", { timeZone: PL_TZ });
}

export interface StrategyKpiCounts {
  pendingDecisions: number;
  urgentDeadlines: number;
  monitoring: number;
  wonWithoutJob: number;
}

export interface StrategyDecisionTodayItem {
  tenderItemId: string;
  title: string;
  bzpNumber: string;
  score: number;
  systemDecision: TenderDecision;
  ownerDecision: TenderDecision | null;
  daysUntilDeadline: number | null;
}

export interface StrategyUrgentDeadlineItem {
  tenderItemId: string;
  title: string;
  bzpNumber: string;
  daysUntil: number;
  tier: "critical" | "urgent";
  submittingOffersDate: string | null;
}

export type StrategyMonitoringEventKind =
  | "change_document"
  | "change_deadline"
  | "change_qa"
  | "qa_new"
  | "qa_updated";

export interface StrategyMonitoringFeedItem {
  id: string;
  tenderItemId: string;
  title: string;
  bzpNumber: string;
  kind: StrategyMonitoringEventKind;
  summary: string;
  at: string;
  dedupeKey: string;
}

export interface StrategyPrioritizedList<T> {
  top: T[];
  rest: T[];
  total: number;
}

export interface StrategyBestOpportunityLite {
  title: string;
  deadlineLabel: string;
  daysUntil: number | null;
  systemDecision: TenderDecision;
  systemDecisionLabel: string;
  ownerDecision: TenderDecision | null;
  ownerDecisionLabel: string | null;
  score: number;
}

export interface StrategyHealthSummary {
  index: number;
  label: string;
  growthMode: string;
}

export interface StrategyFinancialSummary {
  wadiumLabel: string;
  impactLabel: string;
}

export interface StrategyForecastSummary {
  h30: string;
  h60: string;
  h90: string;
}

export interface StrategyPortfolioSummary {
  go: number;
  hold: number;
  noGo: number;
}

function isPendingDecisionBundle(
  bundle: TenderScoringBundle,
  ownerStore: Pick<OwnerDecisionsStore, "byId">,
): boolean {
  if (ownerStore.byId[bundle.item.id]) return false;
  if (!isTenderOpenForOffers(bundle.item.submittingOffersDate)) return false;
  if (bundle.item.status === "ignored" || bundle.item.status === "lost") return false;
  return bundle.opportunity.score >= STRATEGY_MIN_DECISION_SCORE
    || bundle.decision === "GO"
    || bundle.decision === "HOLD";
}

export function buildStrategyKpiCounts(input: {
  scoredBundles: TenderScoringBundle[];
  ownerStore: Pick<OwnerDecisionsStore, "byId">;
  marketKpi: TendersStrategyMarketKpi;
  pipelineItems: TenderPipelineItem[];
  monitoringFeed?: StrategyMonitoringFeedItem[];
  now?: Date;
}): StrategyKpiCounts {
  const pendingDecisions = input.scoredBundles.filter((b) =>
    isPendingDecisionBundle(b, input.ownerStore),
  ).length;

  const wonWithoutJob = input.pipelineItems.filter(
    (i) => i.status === "won" && !i.linkedJobId,
  ).length;

  const feed = input.monitoringFeed
    ?? buildStrategyMonitoringFeed(input.pipelineItems, input.now);

  return {
    pendingDecisions,
    urgentDeadlines: input.marketKpi.urgentCount,
    monitoring: feed.length,
    wonWithoutJob,
  };
}

export function buildStrategyDecisionsToday(
  scoredBundles: TenderScoringBundle[],
  ownerStore: Pick<OwnerDecisionsStore, "byId">,
  now = new Date(),
): StrategyDecisionTodayItem[] {
  return scoredBundles
    .filter((b) => isPendingDecisionBundle(b, ownerStore))
    .map((b) => ({
      tenderItemId: b.item.id,
      title: b.item.title,
      bzpNumber: b.item.bzpNumber,
      score: b.opportunity.score,
      systemDecision: b.decision,
      ownerDecision: ownerStore.byId[b.item.id]?.decision ?? null,
      daysUntilDeadline: daysUntilTenderDeadline(b.item.submittingOffersDate, now),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = a.daysUntilDeadline ?? 999;
      const db = b.daysUntilDeadline ?? 999;
      return da - db;
    });
}

export function prioritizeStrategyList<T>(
  items: T[],
  limit: number,
): StrategyPrioritizedList<T> {
  return {
    top: items.slice(0, limit),
    rest: items.slice(limit),
    total: items.length,
  };
}

export function buildStrategyUrgentDeadlines(
  items: TenderPipelineItem[],
  now = new Date(),
): StrategyUrgentDeadlineItem[] {
  const out: StrategyUrgentDeadlineItem[] = [];

  for (const item of items) {
    if (item.status === "ignored" || item.status === "lost" || item.status === "won") continue;
    if (!isTenderOpenForOffers(item.submittingOffersDate, now)) continue;

    const days = daysUntilTenderDeadline(item.submittingOffersDate, now);
    if (days == null || days < 0 || days > 7) continue;

    out.push({
      tenderItemId: item.id,
      title: item.title,
      bzpNumber: item.bzpNumber,
      daysUntil: days,
      tier: days <= 3 ? "critical" : "urgent",
      submittingOffersDate: item.submittingOffersDate ?? null,
    });
  }

  return out.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.title.localeCompare(b.title, "pl");
  });
}

function mapChangeEvent(event: TenderChangeEvent): StrategyMonitoringFeedItem {
  const kind: StrategyMonitoringEventKind =
    event.type === "DEADLINE_CHANGED"
      ? "change_deadline"
      : event.type === "NEW_QA"
        ? "change_qa"
        : "change_document";

  return {
    id: `chg-${event.id}`,
    tenderItemId: event.tenderItemId,
    title: event.tenderTitle,
    bzpNumber: event.bzpNumber,
    kind,
    summary: event.summary,
    at: event.at,
    dedupeKey: `${event.tenderItemId}:${kind}:${plCalendarDayKey(event.at)}`,
  };
}

function mapQaEvent(event: TenderQaEvent): StrategyMonitoringFeedItem {
  const kind: StrategyMonitoringEventKind =
    event.type === "QA_UPDATED" ? "qa_updated" : "qa_new";

  return {
    id: `qa-${event.id}`,
    tenderItemId: event.tenderItemId,
    title: event.tenderTitle,
    bzpNumber: event.bzpNumber,
    kind,
    summary: event.summary,
    at: event.at,
    dedupeKey: `${event.tenderItemId}:${kind}:${plCalendarDayKey(event.at)}`,
  };
}

/** Jeden feed monitoringu — dedup: tenderItemId + typ + dzień (PL). */
export function buildStrategyMonitoringFeed(
  items: TenderPipelineItem[],
  now = new Date(),
): StrategyMonitoringFeedItem[] {
  const recentCutoff = now.getTime() - 7 * 24 * 3600_000;
  const merged: StrategyMonitoringFeedItem[] = [
    ...collectAllChangeEvents(items).map(mapChangeEvent),
    ...collectAllQaEvents(items).map(mapQaEvent),
  ].filter((e) => new Date(e.at).getTime() >= recentCutoff);

  merged.sort((a, b) => b.at.localeCompare(a.at));

  const seen = new Set<string>();
  const deduped: StrategyMonitoringFeedItem[] = [];
  for (const item of merged) {
    if (seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    deduped.push(item);
  }
  return deduped;
}

export function buildBestOpportunityLite(
  bundle: TenderScoringBundle | null,
  ownerRecord: OwnerTenderDecisionRecord | null | undefined,
  now = new Date(),
): StrategyBestOpportunityLite | null {
  if (!bundle) return null;
  const days = daysUntilTenderDeadline(bundle.item.submittingOffersDate, now);
  const iso = bundle.item.submittingOffersDate;
  let deadlineLabel = "—";
  if (iso) {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
    if (!Number.isNaN(d.getTime())) {
      deadlineLabel = d.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }
  if (days != null && days >= 0) {
    deadlineLabel += days === 0 ? " · dziś" : days === 1 ? " · jutro" : ` · za ${days} dni`;
  }

  return {
    title: bundle.item.title,
    deadlineLabel,
    daysUntil: days,
    systemDecision: bundle.decision,
    systemDecisionLabel: DECISION_LABEL_PL[bundle.decision],
    ownerDecision: ownerRecord?.decision ?? null,
    ownerDecisionLabel: ownerRecord ? DECISION_LABEL_PL[ownerRecord.decision] : null,
    score: bundle.opportunity.score,
  };
}

export function buildStrategyHealthSummary(
  health: CompanyHealthResult,
  growthMode: GrowthMode,
): StrategyHealthSummary {
  return {
    index: health.index,
    label: HEALTH_LABEL_PL[health.label],
    growthMode: GROWTH_MODE_LABELS[growthMode],
  };
}

export function buildStrategyFinancialSummary(
  capacity: FinancialCapacityResult | null,
): StrategyFinancialSummary {
  if (!capacity) {
    return { wadiumLabel: "—", impactLabel: "Brak danych" };
  }
  const wadiumLabel =
    capacity.depositValue != null
      ? `${Math.round(capacity.depositValue).toLocaleString("pl-PL")} zł`
      : "—";
  return {
    wadiumLabel,
    impactLabel: capacity.depositImpact,
  };
}

export function buildStrategyForecastSummary(
  forecast: Forecast90DaysResult,
): StrategyForecastSummary {
  const primary = primaryForecastScenario(forecast);
  const fmt = (days: number) => {
    const h = primary.horizons.find((x) => x.days === days);
    if (!h) return "—";
    const slots = formatForecastSlots(h.activeJobs, forecast.maxConcurrentProjects);
    return `${slots.primaryLabel} (${slots.utilizationPct}%)`;
  };
  return {
    h30: fmt(30),
    h60: fmt(60),
    h90: fmt(90),
  };
}

export function buildStrategyWhatIfSummary(): string {
  return WHAT_IF_PRESET_LABELS.baseline;
}

export function buildStrategyPortfolioSummary(
  counts: PortfolioDecisionCounts,
): StrategyPortfolioSummary {
  return {
    go: counts.GO,
    hold: counts.HOLD,
    noGo: counts["NO-GO"],
  };
}

export function strategyMonitoringKindEmoji(kind: StrategyMonitoringEventKind): string {
  switch (kind) {
    case "change_deadline":
      return "⏰";
    case "change_document":
      return "📄";
    case "change_qa":
    case "qa_new":
      return "💬";
    case "qa_updated":
      return "🔄";
  }
}

export function strategyUrgentTierEmoji(tier: StrategyUrgentDeadlineItem["tier"]): string {
  return tier === "critical" ? "🔴" : "🟠";
}

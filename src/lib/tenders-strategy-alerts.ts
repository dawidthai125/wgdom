/**
 * Przetargi — alerty strategiczne (ex- buildOwnerStrategicAlerts z ETAP 3C).
 * Runtime only — bez KV.
 */

import type { Job, WeekSnapshot } from "@/app/app-domain";
import {
  daysUntilTenderDeadline,
  isActionableTender,
} from "@/lib/tenders-bzp";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { DECISION_LABEL_PL } from "@/lib/tenders-strategy-decision";
import { OPPORTUNITY_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import type { Forecast90DaysResult } from "@/lib/tenders-strategy-forecast-90d";
import {
  collectGoCandidates,
  primaryForecastScenario,
} from "@/lib/tenders-strategy-forecast-90d";
import type { OwnerDecisionsStore } from "@/lib/tenders-strategy-owner-decisions";
import { wmJobsWithOverduePlanned } from "@/lib/job-wm";
import { collectAllChangeEvents, formatRelativeChangeTime } from "@/lib/tender-change-monitor";

export type OwnerAlertTone = "warning" | "info" | "danger" | "success";

export interface OwnerStrategicAlert {
  id: string;
  tone: OwnerAlertTone;
  message: string;
  source: string;
}

export interface OwnerAlertsInput {
  jobs: Job[];
  items: TenderPipelineItem[];
  goBundles: TenderScoringBundle[];
  forecast: Forecast90DaysResult;
  profile: TenderCompanyProfile;
  ownerStore?: OwnerDecisionsStore;
  savedWeeks?: WeekSnapshot[];
  now?: Date;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function parseIso(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildOwnerStrategicAlerts(input: OwnerAlertsInput): OwnerStrategicAlert[] {
  const now = input.now ?? new Date();
  const alerts: OwnerStrategicAlert[] = [];

  const ending45 = input.jobs.filter((j) => {
    if (j.status !== "in_progress") return false;
    const end = parseIso(j.plannedHandoverDate) ?? parseIso(j.endDate);
    if (!end) return false;
    const limit = addDays(now, 45);
    return end >= now && end <= limit;
  });

  if (ending45.length >= 2) {
    alerts.push({
      id: "jobs-ending-45",
      tone: "warning",
      message: `Za 45 dni kończą się ${ending45.length} roboty`,
      source: "jobs · plannedHandoverDate / endDate",
    });
  } else if (ending45.length === 1) {
    alerts.push({
      id: "jobs-ending-45-one",
      tone: "info",
      message: `Za 45 dni kończy się robota: ${(ending45[0].address || "—").slice(0, 40)}`,
      source: "jobs · plannedHandoverDate",
    });
  }

  const goCandidates = collectGoCandidates(input.goBundles, input.ownerStore);
  const urgentGo = goCandidates.filter((b) => {
    const d = daysUntilTenderDeadline(b.item.submittingOffersDate, now);
    return d != null && d >= 0 && d <= 7;
  });

  if (urgentGo.length >= 2) {
    alerts.push({
      id: "go-deadline-7",
      tone: "warning",
      message: `Termin składania ${urgentGo.length} przetargów ${DECISION_LABEL_PL.GO} w ciągu 7 dni`,
      source: "pipeline + kw-tender-decisions · submittingOffersDate",
    });
  } else if (urgentGo.length === 1) {
    alerts.push({
      id: "go-deadline-7-one",
      tone: "warning",
      message: `Termin składania ${DECISION_LABEL_PL.GO} ≤7 dni: ${urgentGo[0].item.title.slice(0, 50)}…`,
      source: "pipeline · submittingOffersDate",
    });
  }

  const primary = primaryForecastScenario(input.forecast);
  const h60 = primary.horizons.find((h) => h.days === 60);
  if (h60 && h60.utilizationPct > 100) {
    alerts.push({
      id: "overload-60",
      tone: "danger",
      message: `Możliwe przeciążenie firmy za 60 dni (${h60.utilizationPct}% obłożenia)`,
      source: "tenders-strategy-forecast-90d · scenariusz C",
    });
  }

  const h30 = primary.horizons.find((h) => h.days === 30);
  if (
    input.forecast.freeSlotsToday >= 1
    && h30
    && h30.utilizationPct <= 85
    && input.forecast.activeJobsNow < input.profile.maxConcurrentProjects
  ) {
    alerts.push({
      id: "capacity-one-more",
      tone: "success",
      message: "Możesz bezpiecznie przyjąć jeszcze 1 średni kontrakt",
      source: `jobs (${input.forecast.activeJobsNow}/${input.profile.maxConcurrentProjects}) + freeSlots ${input.forecast.freeSlotsToday}`,
    });
  }

  const highQuality = input.goBundles.filter((b) => b.opportunity.score >= 65);
  if (highQuality.length === 0) {
    const anyActionable = input.items.some((i) => isActionableTender(i, now));
    if (anyActionable) {
      alerts.push({
        id: "no-high-quality",
        tone: "info",
        message: `Brak przetargów wysokiej jakości (${OPPORTUNITY_LABEL_PL.short} ≥65) — rozważ poszerzenie kryteriów`,
        source: "tenders-strategy-opportunity-score · pipeline",
      });
    } else {
      alerts.push({
        id: "no-actionable",
        tone: "warning",
        message: "Brak nowych przetargów wysokiej jakości w radarze",
        source: "tenders-bzp · isActionableTender",
      });
    }
  }

  const h90 = primary.horizons.find((h) => h.days === 90);
  if (h90 && h90.utilizationPct < 35) {
    alerts.push({
      id: "low-load-90",
      tone: "warning",
      message: `Niskie obłożenie za 90 dni (${h90.utilizationPct}%) — planuj akwizycję kontraktów`,
      source: "tenders-strategy-forecast-90d · scenariusz C",
    });
  }

  const overdue = wmJobsWithOverduePlanned(input.jobs).length;
  if (overdue > 0) {
    alerts.push({
      id: "wm-overdue",
      tone: "danger",
      message: `${overdue} robot(y) z opóźnionym terminem odbioru WM`,
      source: "job-wm · plannedHandoverDate",
    });
  }

  const recentChanges = collectAllChangeEvents(input.items).filter(
    (e) => now.getTime() - new Date(e.at).getTime() < 7 * 24 * 3600_000,
  );
  if (recentChanges.length > 0) {
    const top = recentChanges[0];
    alerts.push({
      id: "tender-doc-changes",
      tone: "warning",
      message: `${recentChanges.length} zmian(y) dokumentacji przetargów — ostatnia ${formatRelativeChangeTime(top.at, now)}`,
      source: "tender-change-monitor · snapshot diff",
    });
  }

  return alerts.slice(0, 8);
}

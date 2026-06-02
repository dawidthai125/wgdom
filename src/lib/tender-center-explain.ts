/**
 * Tender Center PRO — warstwa wyjaśnień (ETAP 3C).
 * Runtime only — bez AI, bez KV.
 */

import type { Job, WeekSnapshot } from "@/app/app-domain";
import {
  daysUntilTenderDeadline,
  isActionableTender,
  isTenderOpenForOffers,
} from "@/lib/tenders-bzp";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import type { TenderDecision, TenderScoringBundle } from "@/lib/tender-center-decision";
import { DECISION_LABEL_PL } from "@/lib/tender-center-decision";
import type { CompanyHealthInput, CompanyHealthResult, HealthDimension } from "@/lib/tender-center-health";
import { HEALTH_LABEL_PL } from "@/lib/tender-center-health";
import type { OpportunityScoreResult } from "@/lib/tender-center-opportunity-score";
import type {
  Forecast90DaysResult,
  ForecastHorizon,
  SimulatedJobSpan,
} from "@/lib/tender-center-forecast-90d";
import {
  collectGoCandidates,
  primaryForecastScenario,
} from "@/lib/tender-center-forecast-90d";
import type { OwnerDecisionsStore } from "@/lib/tender-center-owner-decisions";
import { wmJobsWithOverduePlanned } from "@/lib/job-wm";

export interface ExplainLine {
  text: string;
  source: string;
}

export interface HealthExplanation {
  index: number;
  label: string;
  summary: string;
  plus: ExplainLine[];
  minus: ExplainLine[];
}

export interface OpportunityExplanation {
  score: number;
  label: string;
  plus: ExplainLine[];
  minus: ExplainLine[];
}

export interface StrategicDecisionExplanation {
  decision: TenderDecision;
  decisionLabel: string;
  strategicScore: number;
  summary: string;
  reasons: ExplainLine[];
}

export interface ForecastHorizonExplanation {
  horizon: ForecastHorizon;
  reasons: ExplainLine[];
  recommendation: string | null;
}

export type OwnerAlertTone = "warning" | "info" | "danger" | "success";

export interface OwnerStrategicAlert {
  id: string;
  tone: OwnerAlertTone;
  message: string;
  source: string;
}

const DIMENSION_LABELS: Record<HealthDimension, string> = {
  O: "Operacje",
  Z: "Zasoby",
  F: "Finanse",
  R: "Rynek",
  D: "Doświadczenie",
};

function line(text: string, source: string): ExplainLine {
  return { text, source };
}

function splitPolarizedReasons(reasons: string[], source: string): { plus: ExplainLine[]; minus: ExplainLine[] } {
  const plus: ExplainLine[] = [];
  const minus: ExplainLine[] = [];
  for (const r of reasons) {
    const t = r.trim();
    if (t.startsWith("+")) plus.push(line(t.replace(/^\+\s*/, ""), source));
    else if (t.startsWith("−") || t.startsWith("-")) minus.push(line(t.replace(/^[−-]\s*/, ""), source));
  }
  return { plus, minus };
}

function topN(lines: ExplainLine[], n: number): ExplainLine[] {
  return lines.slice(0, n);
}

export function explainOpportunityScore(
  result: OpportunityScoreResult,
): OpportunityExplanation {
  const { plus, minus } = splitPolarizedReasons(result.reasons, "Opportunity Score");
  return {
    score: result.score,
    label: result.label,
    plus: topN(plus, 3),
    minus: topN(minus, 3),
  };
}

export function explainStrategicDecision(bundle: TenderScoringBundle): StrategicDecisionExplanation {
  const { plus, minus } = splitPolarizedReasons(bundle.strategic.reasons, "Strategic Score");
  const reasons = topN([...plus, ...minus], 5);

  let summary: string;
  switch (bundle.decision) {
    case "GO":
      summary = `System rekomenduje ${bundle.decision} (${DECISION_LABEL_PL.GO}) — strategicznie firma jest gotowa na ten kontrakt.`;
      break;
    case "HOLD":
      summary = `System rekomenduje ${bundle.decision} (${DECISION_LABEL_PL.HOLD}) — atrakcyjny przetarg, ale firma wymaga ostrożności lub dodatkowej analizy.`;
      break;
    case "NO-GO":
      summary = `System rekomenduje ${bundle.decision} (${DECISION_LABEL_PL["NO-GO"]}) — kontrakt lub kondycja firmy nie sprzyjają startowi.`;
      break;
  }

  return {
    decision: bundle.decision,
    decisionLabel: bundle.decisionLabel,
    strategicScore: bundle.strategic.score,
    summary,
    reasons,
  };
}

export function explainHealth(
  input: CompanyHealthInput,
  health: CompanyHealthResult,
  forecast?: Forecast90DaysResult | null,
): HealthExplanation {
  const plus: ExplainLine[] = [];
  const minus: ExplainLine[] = [];

  const activeJobs = input.jobs.filter((j) => j.status === "in_progress");
  const maxConcurrent = Math.max(input.profile.maxConcurrentProjects, 1);

  if (activeJobs.length > 0) {
    plus.push(line(
      `${activeJobs.length} aktywne roboty (${activeJobs.length}/${maxConcurrent} limitu)`,
      "jobs · status in_progress",
    ));
  } else {
    minus.push(line("Brak aktywnych robót w pipeline", "jobs"));
  }

  if (health.freeSlots >= 2) {
    plus.push(line(
      `Dobre wykorzystanie zasobów — ${health.freeSlots} wolne sloty dziś`,
      "weekEmployees · grafik bieżący",
    ));
  } else if (health.freeSlots === 0) {
    minus.push(line("Brak wolnych slotów zespołu dziś", "weekEmployees · todayFieldWorkStats"));
  }

  const dims = health.dimensions;
  for (const key of ["O", "Z", "F", "R", "D"] as HealthDimension[]) {
    const score = dims[key];
    const label = DIMENSION_LABELS[key];
    if (score >= 75) {
      plus.push(line(`Silny wymiar ${label} (${score}/100)`, `Health · wymiar ${key}`));
    } else if (score < 50) {
      minus.push(line(`Słaby wymiar ${label} (${score}/100)`, `Health · wymiar ${key}`));
    }
  }

  const actionable = input.items.filter((i) => isActionableTender(i, input.now)).length;
  if (actionable >= 3) {
    plus.push(line(`${actionable} przetargów do rozważenia w pipeline`, "tenders-bzp · isActionableTender"));
  } else if (actionable === 0) {
    minus.push(line("Mały pipeline nowych kontraktów publicznych", "tenders-bzp · pipeline"));
  } else {
    minus.push(line(`Tylko ${actionable} przetarg(i) do rozważenia`, "tenders-bzp · pipeline"));
  }

  if (health.overloadIndex >= 1) {
    minus.push(line(
      `Przeciążenie pipeline ofert (${Math.round(health.overloadIndex * 100)}%)`,
      "tender-center-kpi · overloadIndex",
    ));
  } else if (health.overloadIndex < 0.5) {
    plus.push(line("Pipeline ofert nie jest przeciążony", "tender-center-kpi"));
  }

  const overdue = wmJobsWithOverduePlanned(input.jobs).length;
  if (overdue > 0) {
    minus.push(line(`${overdue} robot(y) z opóźnionym planem odbioru`, "job-wm · plannedHandoverDate"));
  }

  if (forecast) {
    const primary = primaryForecastScenario(forecast);
    const h90 = primary.horizons.find((h) => h.days === 90);
    if (h90) {
      if (h90.utilizationPct < 50) {
        minus.push(line(
          `Niskie obłożenie za 90 dni (${h90.utilizationPct}% — scenariusz C)`,
          "tender-center-forecast-90d",
        ));
      } else if (h90.utilizationPct >= 50 && h90.utilizationPct <= 100) {
        plus.push(line(
          `Stabilne obłożenie za 90 dni (${h90.utilizationPct}%)`,
          "tender-center-forecast-90d",
        ));
      } else if (h90.utilizationPct > 100) {
        minus.push(line(
          `Ryzyko przeciążenia za 90 dni (${h90.utilizationPct}%)`,
          "tender-center-forecast-90d",
        ));
      }
    }
  }

  const refPln = input.profile.referenceExperiencePln;
  if (input.profile.totalReferencesPln >= refPln) {
    plus.push(line(
      `Portfolio referencji (${Math.round(input.profile.totalReferencesPln / 1000)}k PLN) powyżej progu doświadczenia`,
      "tenders-bzp-company · profil",
    ));
  }

  return {
    index: health.index,
    label: HEALTH_LABEL_PL[health.label],
    summary: `Health Index ${health.index} — ${HEALTH_LABEL_PL[health.label]}. ${health.recommendation}`,
    plus: topN(plus, 5),
    minus: topN(minus, 5),
  };
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function spansEndingBetween(
  spans: SimulatedJobSpan[],
  fromIso: string,
  toIsoExclusive: string,
): SimulatedJobSpan[] {
  return spans.filter((s) => s.endIso >= fromIso && s.endIso < toIsoExclusive);
}

function spansActiveAt(spans: SimulatedJobSpan[], targetIso: string): SimulatedJobSpan[] {
  return spans.filter((s) => s.startIso <= targetIso && s.endIso >= targetIso);
}

function spansStartingBetween(
  spans: SimulatedJobSpan[],
  fromIso: string,
  toIsoInclusive: string,
): SimulatedJobSpan[] {
  return spans.filter((s) => s.startIso >= fromIso && s.startIso <= toIsoInclusive && s.source === "won_go");
}

function recommendationForHorizon(h: ForecastHorizon): string | null {
  if (h.utilizationPct < 50) return "Szukaj nowych kontraktów.";
  if (h.utilizationPct > 120) return "Brakuje zasobów — rozważ zatrudnienie lub rezygnację z części GO.";
  if (h.utilizationPct > 100) return "Ogranicz nowe oferty lub rozłóż terminy startów.";
  if (h.utilizationPct >= 50 && h.utilizationPct <= 85) return "Utrzymaj bieżące tempo — pojemność w normie.";
  return null;
}

/** Wyjaśnienie prognozy — wymaga spanów z buildForecastExplainContext. */
export function explainForecastHorizon(
  horizon: ForecastHorizon,
  spans: SimulatedJobSpan[],
  goCountScenarioC: number,
  now: Date,
): ForecastHorizonExplanation {
  const todayIso = toIso(now);
  const target = addDays(now, horizon.days);
  const targetIso = toIso(target);

  const reasons: ExplainLine[] = [];

  const endingInWindow = spansEndingBetween(spans, todayIso, targetIso);
  for (const s of endingInWindow.slice(0, 4)) {
    reasons.push(line(
      `Kończy się robota: ${s.label} (${s.endIso})`,
      s.source === "active" ? "jobs · plannedHandoverDate/endDate" : "prognoza · GO",
    ));
  }

  const activeAt = spansActiveAt(spans, targetIso);
  const wonActive = activeAt.filter((s) => s.source === "won_go");
  if (wonActive.length > 0) {
    for (const s of wonActive.slice(0, 3)) {
      reasons.push(line(`Aktywny wygrany kontrakt: ${s.label}`, "tender-center-forecast-90d · scenariusz C"));
    }
  } else if (goCountScenarioC > 0 && horizon.utilizationPct < 50) {
    reasons.push(line(
      `Brak aktywnych wygranych GO w horyzoncie (kandydaci: ${goCountScenarioC})`,
      "kw-tender-decisions + scoring GO",
    ));
  }

  if (endingInWindow.length >= 2 && horizon.utilizationPct < 50) {
    reasons.push(line(
      `${endingInWindow.length} robot(y) kończą się przed +${horizon.days} dni bez pełnego zastępstwa`,
      "jobs · terminy zakończenia",
    ));
  }

  if (activeAt.length === 0) {
    reasons.push(line("Brak równoległych kontraktów w tym horyzoncie", "prognoza 90 dni"));
  } else {
    reasons.push(line(
      `${activeAt.length} równoległych kontraktów → ${horizon.utilizationPct}% obłożenia`,
      "maxConcurrentProjects · jobs + GO",
    ));
  }

  if (goCountScenarioC === 0 && horizon.utilizationPct < 75) {
    reasons.push(line("Brak kandydatów GO w pipeline", "Opportunity/Strategic Score · GO"));
  } else if (goCountScenarioC === 1 && horizon.days >= 60) {
    reasons.push(line(`Tylko ${Math.ceil(goCountScenarioC * 0.5) || 1} przetarg GO w scenariuszu C`, "kw-tender-decisions"));
  }

  return {
    horizon,
    reasons: reasons.slice(0, 6),
    recommendation: recommendationForHorizon(horizon),
  };
}

export interface ForecastExplainContext {
  spansScenarioC: SimulatedJobSpan[];
  goCountScenarioC: number;
  now: Date;
}

/** Buduje kontekst spanów dla scenariusza C (używany przez explain + alerty). */
export function buildForecastExplainContext(
  jobs: Job[],
  goItems: TenderPipelineItem[],
  now: Date = new Date(),
): ForecastExplainContext {
  const { activeJobSpans, wonJobSpans } = requireSpansHelpers(jobs, goItems, now);
  const half = goItems.slice(0, Math.ceil(goItems.length * 0.5));
  return {
    spansScenarioC: [...activeJobSpans, ...wonJobSpans(half)],
    goCountScenarioC: half.length,
    now,
  };
}

function requireSpansHelpers(jobs: Job[], goItems: TenderPipelineItem[], now: Date) {
  return {
    activeJobSpans: buildActiveSpans(jobs, now),
    wonJobSpans: (items: TenderPipelineItem[]) => buildWonSpans(items, now),
  };
}

function parseIso(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildActiveSpans(jobs: Job[], now: Date): SimulatedJobSpan[] {
  return jobs
    .filter((j) => j.status === "in_progress")
    .map((j) => {
      const start = parseIso(j.startDate) ?? now;
      const end = parseIso(j.plannedHandoverDate) ?? parseIso(j.endDate) ?? addDays(start, 90);
      const label = (j.address?.trim() || "Robota").slice(0, 48);
      return {
        id: j.id,
        label,
        startIso: toIso(start),
        endIso: toIso(end),
        source: "active" as const,
      };
    });
}

function buildWonSpans(items: TenderPipelineItem[], now: Date): SimulatedJobSpan[] {
  return items.map((item) => {
    const offerEnd = parseIso(item.submittingOffersDate);
    const mobilize = offerEnd && offerEnd > now ? addDays(offerEnd, 14) : addDays(now, 14);
    const start = mobilize < now ? now : mobilize;
    const days = item.swzAnalysis?.implementationDays ?? 75;
    const end = addDays(start, days);
    return {
      id: `won-${item.id}`,
      label: item.title.slice(0, 48),
      startIso: toIso(start),
      endIso: toIso(end),
      source: "won_go" as const,
    };
  });
}

export function explainAllForecastHorizons(
  forecast: Forecast90DaysResult,
  context: ForecastExplainContext,
): ForecastHorizonExplanation[] {
  const primary = primaryForecastScenario(forecast);
  return primary.horizons.map((h) =>
    explainForecastHorizon(h, context.spansScenarioC, context.goCountScenarioC, context.now),
  );
}

export interface OwnerAlertsInput {
  jobs: Job[];
  items: TenderPipelineItem[];
  goBundles: TenderScoringBundle[];
  forecast: Forecast90DaysResult;
  forecastContext: ForecastExplainContext;
  profile: TenderCompanyProfile;
  ownerStore?: OwnerDecisionsStore;
  savedWeeks?: WeekSnapshot[];
  now?: Date;
}

export function buildOwnerStrategicAlerts(input: OwnerAlertsInput): OwnerStrategicAlert[] {
  const now = input.now ?? new Date();
  const todayIso = toIso(now);
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
      message: `Termin składania ${urgentGo.length} przetargów GO w ciągu 7 dni`,
      source: "pipeline + kw-tender-decisions · submittingOffersDate",
    });
  } else if (urgentGo.length === 1) {
    alerts.push({
      id: "go-deadline-7-one",
      tone: "warning",
      message: `Termin składania GO ≤7 dni: ${urgentGo[0].item.title.slice(0, 50)}…`,
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
      source: "tender-center-forecast-90d · scenariusz C",
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
        message: "Brak przetargów wysokiej jakości (Opportunity ≥65) — rozważ poszerzenie kryteriów",
        source: "tender-center-opportunity-score · pipeline",
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
      source: "tender-center-forecast-90d · scenariusz C",
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

  return alerts.slice(0, 8);
}

/**
 * W&G DOM COMMAND CENTER AI — Executive Morning Briefing (ETAP 7D).
 * Agregacja istniejących danych — bez LLM, bez zmian w silnikach.
 */

import type { CompanyHealthResult } from "@/lib/tender-center-health";
import type { ActionCenterResult } from "@/lib/tender-center-action-center";
import {
  primaryForecastScenario,
  type Forecast90DaysResult,
} from "@/lib/tender-center-forecast-90d";
import type { FinancialCapacityResult } from "@/lib/tender-center-financial-capacity";
import type { OwnerProfile } from "@/lib/tender-center-owner-profile";
import type { AiInsightsResult } from "@/lib/tender-center-ai-insights";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import { DECISION_LABEL_PL } from "@/lib/tender-center-decision";
import {
  METRIC_LABEL_PL,
  OPPORTUNITY_LABEL_PL,
  PIPELINE_LABEL_PL,
  STRATEGIC_LABEL_PL,
} from "@/lib/tender-center-ui-labels-pl";

export type SummaryTone = "ŚWIETNY DZIEŃ" | "DOBRY DZIEŃ" | "OSTROŻNIE" | "WYSOKIE RYZYKO";

export interface MorningBriefing {
  greeting: string;
  headline: string;
  priorityAction: string;
  biggestRisk: string;
  financialStatus: string;
  opportunityStatus: string;
  ownerInsight: string;
  summaryTone: SummaryTone;
}

export interface MorningBriefingInput {
  health: CompanyHealthResult;
  actionCenter: ActionCenterResult;
  forecast: Forecast90DaysResult;
  financialCapacity: FinancialCapacityResult | null;
  ownerProfile: OwnerProfile;
  aiInsights: AiInsightsResult;
  bestOpportunity: TenderScoringBundle | null;
  ownerName?: string | null;
  now?: Date;
}

const INSUFFICIENT = "Za mało danych do analizy.";

function daysUntilDeadline(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/** Neutralny nagłówek — raport dla wielu administratorów, bez imienia właściciela. */
function buildGreeting(): string {
  return "Dzienny raport operacyjny W&G";
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function buildPriorityAction(
  actionCenter: ActionCenterResult,
  bestOpportunity: TenderScoringBundle | null,
  now: Date,
): string {
  const primary = actionCenter.primaryAction;
  if (!primary) {
    return "Brak pilnych akcji — utrzymaj bieżący rytm operacyjny.";
  }

  const tenderTitle =
    bestOpportunity && primary.tenderId === bestOpportunity.item.id
      ? truncate(bestOpportunity.item.title, 52)
      : truncate(primary.description, 52);

  let deadlineLine = "";
  if (primary.tenderId && bestOpportunity?.item.id === primary.tenderId) {
    const days = daysUntilDeadline(bestOpportunity.item.submittingOffersDate, now);
    if (days != null && days >= 0) {
      deadlineLine = `\nTermin składania za ${days} ${days === 1 ? "dzień" : "dni"}.`;
    }
  } else if (primary.title.toLowerCase().includes("termin") || primary.title.includes("za ")) {
    deadlineLine = `\n${primary.title}.`;
  }

  const action = primary.recommendedAction.endsWith(".")
    ? primary.recommendedAction
    : `${primary.recommendedAction}.`;

  if (primary.category === "TENDERS" && tenderTitle) {
    return `${action}\n${tenderTitle}.${deadlineLine}`.trim();
  }

  return `${action}\n${truncate(primary.title, 60)}.`.trim();
}

function countJobsEndingWithinDays(
  forecast: Forecast90DaysResult,
  withinDays: number,
  now: Date,
): number {
  const limit = now.getTime() + withinDays * 86_400_000;
  return forecast.endingJobs.filter((j) => {
    const end = new Date(j.endIso.length <= 10 ? `${j.endIso}T12:00:00.000Z` : j.endIso);
    return !Number.isNaN(end.getTime()) && end.getTime() <= limit && end.getTime() >= now.getTime();
  }).length;
}

function buildBiggestRisk(
  health: CompanyHealthResult,
  actionCenter: ActionCenterResult,
  forecast: Forecast90DaysResult,
  aiInsights: AiInsightsResult,
  now: Date,
): string {
  const criticalNonTender = actionCenter.actions.find(
    (a) => a.priority === "CRITICAL" && a.category !== "TENDERS",
  );
  if (criticalNonTender) {
    return truncate(`${criticalNonTender.title}. ${criticalNonTender.description}`, 120);
  }

  const scenario = primaryForecastScenario(forecast);
  if (scenario.alert) {
    return truncate(scenario.alert, 120);
  }

  const endingSoon = countJobsEndingWithinDays(forecast, 45, now);
  if (endingSoon >= 2) {
    return `Za 45 dni kończą się ${endingSoon} roboty.`;
  }
  if (endingSoon === 1) {
    return "Za 45 dni kończy się 1 robota — zaplanuj kolejne zlecenia.";
  }

  const h90 = scenario.horizons.find((h) => h.days === 90);
  if (h90?.risk === "BRAK_LUDZI") {
    return "Brakuje zasobów dla dużego kontraktu.";
  }
  if (h90?.risk === "PRZECIAZENIE") {
    return "Prognoza wskazuje przeciążenie zespołu w horyzoncie 90 dni.";
  }

  const staffCritical = actionCenter.actions.find(
    (a) => a.priority === "CRITICAL" && a.category === "STAFF",
  );
  if (staffCritical) {
    return truncate(staffCritical.title, 120);
  }

  const aiWarning = aiInsights.warnings.find(
    (w) => w !== INSUFFICIENT && !w.startsWith("Brak istotnych"),
  );
  if (aiWarning && health.label !== "healthy") {
    return truncate(aiWarning, 120);
  }

  if (health.overloadIndex >= 1) {
    return `Pipeline ofert przeciążony (${Math.round(health.overloadIndex * 100)}%).`;
  }

  if (health.freeSlots <= 0) {
    return "Brak wolnych slotów zespołu na dziś.";
  }

  return "Brak krytycznych ryzyk w bieżącym horyzoncie.";
}

function buildFinancialStatus(capacity: FinancialCapacityResult | null): string {
  if (!capacity) {
    return "Brak danych finansowych dla bieżącej okazji.";
  }

  if (capacity.liquidityRisk === "KRYTYCZNE" || capacity.liquidityRisk === "WYSOKIE") {
    return "Wysokie ryzyko płynności.";
  }

  if (
    capacity.recommendation === "MOŻESZ STARTOWAĆ"
    && (capacity.capacityClass === "WYSOKA" || capacity.capacityClass === "BARDZO WYSOKA")
  ) {
    return "Możesz bezpiecznie przyjąć jeszcze 1 średni kontrakt.";
  }

  if (capacity.recommendation === "ZBYT DUŻE RYZYKO FINANSOWE") {
    return truncate(capacity.recommendationDetail[0] ?? "Zbyt duże ryzyko finansowe.", 100);
  }

  if (capacity.recommendationDetail[0]) {
    return truncate(capacity.recommendationDetail[0], 100);
  }

  return capacity.recommendation;
}

function buildOpportunityStatus(bundle: TenderScoringBundle | null): string {
  if (!bundle) {
    return `Brak aktywnej okazji w ${PIPELINE_LABEL_PL.pipeline}.`;
  }

  const title = truncate(bundle.item.title, 56);
  const decisionHint =
    bundle.decision === "GO"
      ? DECISION_LABEL_PL.GO
      : bundle.decision === "HOLD"
        ? `${DECISION_LABEL_PL.HOLD} — oceń ponownie`
        : `${DECISION_LABEL_PL["NO-GO"]} — system odradza`;

  return `${title}\n\n${OPPORTUNITY_LABEL_PL.short} ${bundle.opportunity.score}\n${STRATEGIC_LABEL_PL.short} ${bundle.strategic.score}\n\n${decisionHint}`;
}

function buildOwnerInsight(ownerProfile: OwnerProfile, aiInsights: AiInsightsResult): string {
  const profileInsight = ownerProfile.profileInsights.find(
    (i) => !i.includes("Brak zapisanych"),
  );
  if (profileInsight) {
    return truncate(profileInsight, 120);
  }

  const aiHighlight = aiInsights.highlights.find((h) => h !== INSUFFICIENT);
  if (aiHighlight) {
    return truncate(aiHighlight, 120);
  }

  const aiWarning = aiInsights.warnings.find(
    (w) => w !== INSUFFICIENT && !w.startsWith("Brak istotnych"),
  );
  if (aiWarning) {
    return truncate(aiWarning, 120);
  }

  if (ownerProfile.preferredContractSize !== "NIEOKREŚLONE") {
    const size =
      ownerProfile.preferredContractSize === "MAŁE"
        ? "małych"
        : ownerProfile.preferredContractSize === "DUŻE"
          ? "dużych"
          : ownerProfile.preferredContractSize === "ŚREDNIE"
            ? "średnich"
            : "mieszanych";
    return `Preferujesz kontrakty ${size} wielkości.`;
  }

  return `Zbieraj decyzje ${DECISION_LABEL_PL.GO}/${DECISION_LABEL_PL.HOLD}/${DECISION_LABEL_PL["NO-GO"]}, aby COMMAND CENTER AI uczył się Twojego stylu.`;
}

function computeSummaryTone(input: MorningBriefingInput): SummaryTone {
  const { health, actionCenter, financialCapacity, forecast } = input;
  let riskScore = 0;

  if (health.label === "at_risk") riskScore += 3;
  else if (health.label === "strained") riskScore += 2;
  else if (health.label === "stable") riskScore += 1;

  if (actionCenter.counts.CRITICAL > 0) riskScore += 3;
  else if (actionCenter.counts.HIGH >= 2) riskScore += 2;
  else if (actionCenter.counts.HIGH > 0) riskScore += 1;

  if (financialCapacity?.liquidityRisk === "KRYTYCZNE") riskScore += 3;
  else if (financialCapacity?.liquidityRisk === "WYSOKIE") riskScore += 2;
  else if (financialCapacity?.capacityClass === "KRYTYCZNA") riskScore += 2;

  const scenario = primaryForecastScenario(forecast);
  const h90 = scenario.horizons.find((h) => h.days === 90);
  if (h90?.risk === "BRAK_LUDZI" || h90?.risk === "PRZECIAZENIE") riskScore += 2;

  if (riskScore >= 5) return "WYSOKIE RYZYKO";
  if (riskScore >= 3) return "OSTROŻNIE";
  if (health.label === "healthy" && riskScore <= 1) return "ŚWIETNY DZIEŃ";
  return "DOBRY DZIEŃ";
}

function buildHeadline(tone: SummaryTone, actionCenter: ActionCenterResult): string {
  switch (tone) {
    case "ŚWIETNY DZIEŃ":
      return "Firma w dobrej kondycji — skup się na najlepszej okazji.";
    case "DOBRY DZIEŃ":
      return actionCenter.headline.replace(/^Dzisiaj system rekomenduje:\s*/i, "");
    case "OSTROŻNIE":
      return "Dzień wymaga uwagi — priorytetyzuj ryzyka przed nowymi ofertami.";
    case "WYSOKIE RYZYKO":
      return "Krytyczny dzień — działaj według priorytetu #1.";
  }
}

export function summaryToneClasses(tone: SummaryTone): string {
  switch (tone) {
    case "ŚWIETNY DZIEŃ":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "DOBRY DZIEŃ":
      return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "OSTROŻNIE":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "WYSOKIE RYZYKO":
      return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400";
  }
}

export function buildMorningBriefing(input: MorningBriefingInput): MorningBriefing {
  const now = input.now ?? new Date();
  const summaryTone = computeSummaryTone(input);

  return {
    greeting: buildGreeting(),
    headline: buildHeadline(summaryTone, input.actionCenter),
    priorityAction: buildPriorityAction(
      input.actionCenter,
      input.bestOpportunity,
      now,
    ),
    biggestRisk: buildBiggestRisk(
      input.health,
      input.actionCenter,
      input.forecast,
      input.aiInsights,
      now,
    ),
    financialStatus: buildFinancialStatus(input.financialCapacity),
    opportunityStatus: buildOpportunityStatus(input.bestOpportunity),
    ownerInsight: buildOwnerInsight(input.ownerProfile, input.aiInsights),
    summaryTone,
  };
}

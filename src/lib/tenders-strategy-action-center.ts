/**
 * Tender Center PRO — Action Center (ETAP 3D).
 * Codzienne rekomendacje dla właściciela — runtime only.
 */

import { daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import type { CompanyHealthResult } from "@/lib/tenders-strategy-health";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import type { Forecast90DaysResult } from "@/lib/tenders-strategy-forecast-90d";
import { collectGoCandidates, primaryForecastScenario } from "@/lib/tenders-strategy-forecast-90d";
import type { OwnerDecisionsStore } from "@/lib/tenders-strategy-owner-decisions";
import type { OwnerStrategicAlert } from "@/lib/tenders-strategy-alerts";
import { DECISION_LABEL_PL } from "@/lib/tenders-strategy-decision";
import { BASELINE_LABEL_PL, METRIC_LABEL_PL, OPPORTUNITY_LABEL_PL, PIPELINE_LABEL_PL, STRATEGIC_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  collectAllChangeEvents,
  changeEventPriority,
  formatRelativeChangeTime,
} from "@/lib/tender-change-monitor";
import {
  collectAllQaEvents,
  formatRelativeQaTime,
  isUrgentQaEvent,
  qaEventPriority,
} from "@/lib/tender-qa-monitor";

export type ActionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ActionCategory = "TENDERS" | "BUSINESS" | "STAFF" | "FINANCE" | "PLANNING";

export interface OwnerActionItem {
  id: string;
  priority: ActionPriority;
  category: ActionCategory;
  title: string;
  description: string;
  reason: string;
  source: string;
  recommendedAction: string;
  /** Id przetargu w pipeline — quick action „Otwórz przetarg”. */
  tenderId?: string;
}

export interface ActionCenterResult {
  actions: OwnerActionItem[];
  counts: Record<ActionPriority, number>;
  primaryAction: OwnerActionItem | null;
  headline: string;
}

export const ACTION_PRIORITY_LABEL_PL: Record<ActionPriority, string> = {
  CRITICAL: "Krytyczne",
  HIGH: "Wysokie",
  MEDIUM: "Średnie",
  LOW: "Niskie",
};

export const ACTION_CATEGORY_LABEL_PL: Record<ActionCategory, string> = {
  TENDERS: "Przetargi",
  BUSINESS: "Biznes",
  STAFF: "Zasoby",
  FINANCE: "Finanse",
  PLANNING: "Planowanie",
};

const PRIORITY_RANK: Record<ActionPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export interface ActionCenterInput {
  radarTop: TenderScoringBundle[];
  scoredBundles: TenderScoringBundle[];
  health: CompanyHealthResult;
  forecast: Forecast90DaysResult;
  ownerStore: OwnerDecisionsStore;
  strategicAlerts: OwnerStrategicAlert[];
  pipelineItems?: TenderPipelineItem[];
  now?: Date;
}

function action(
  partial: OwnerActionItem,
): OwnerActionItem {
  return partial;
}

function sortActions(items: OwnerActionItem[]): OwnerActionItem[] {
  return [...items].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

function countByPriority(actions: OwnerActionItem[]): Record<ActionPriority, number> {
  return {
    CRITICAL: actions.filter((a) => a.priority === "CRITICAL").length,
    HIGH: actions.filter((a) => a.priority === "HIGH").length,
    MEDIUM: actions.filter((a) => a.priority === "MEDIUM").length,
    LOW: actions.filter((a) => a.priority === "LOW").length,
  };
}

function actionsFromRadar(
  radarTop: TenderScoringBundle[],
  now: Date,
): OwnerActionItem[] {
  const out: OwnerActionItem[] = [];

  for (const b of radarTop) {
    const days = daysUntilTenderDeadline(b.item.submittingOffersDate, now);
    if (days == null || days < 0) continue;

    const titleShort = b.item.title.length > 56 ? `${b.item.title.slice(0, 56)}…` : b.item.title;

    if (days <= 3) {
      out.push(action({
        id: `radar-deadline-3d-${b.item.id}`,
        priority: "CRITICAL",
        category: "TENDERS",
        title: `Termin składania oferty za ${days} dni`,
        description: titleShort,
        reason: `Przetarg ${b.item.bzpNumber} — ${OPPORTUNITY_LABEL_PL.short} ${b.opportunity.score}, decyzja systemu ${DECISION_LABEL_PL[b.decision]}`,
        source: "pipeline.submittingOffersDate · Radar okazji",
        recommendedAction: "Przygotuj ofertę natychmiast.",
        tenderId: b.item.id,
      }));
    } else if (days <= 7 && (b.decision === "GO" || b.opportunity.score >= 65)) {
      out.push(action({
        id: `radar-deadline-7d-${b.item.id}`,
        priority: "HIGH",
        category: "TENDERS",
        title: `Oferta za ${days} dni — priorytetowy przetarg`,
        description: titleShort,
        reason: `System: ${DECISION_LABEL_PL[b.decision]} · ${STRATEGIC_LABEL_PL.short} ${b.strategic.score}`,
        source: "pipeline.submittingOffersDate · scoring GO",
        recommendedAction: "Dokończ analizę SWZ i wycenę, podejmij decyzję właściciela.",
        tenderId: b.item.id,
      }));
    }

    if (
      b.item.status === "preparing"
      && days <= 7
      && !out.some((a) => a.id === `radar-deadline-3d-${b.item.id}`)
    ) {
      out.push(action({
        id: `radar-preparing-${b.item.id}`,
        priority: days <= 3 ? "CRITICAL" : "HIGH",
        category: "TENDERS",
        title: days <= 3 ? "Oferta w przygotowaniu — termin krytyczny" : "Oferta w przygotowaniu — pilny termin",
        description: titleShort,
        reason: `Status: w przygotowaniu · ${days} dni do terminu`,
        source: "pipeline.status · submittingOffersDate",
        recommendedAction: `Domknij kosztorys i złóż ofertę lub zmień status ${PIPELINE_LABEL_PL.pipeline}.`,
        tenderId: b.item.id,
      }));
    }
  }

  return out;
}

function actionsFromHealth(health: CompanyHealthResult): OwnerActionItem[] {
  const out: OwnerActionItem[] = [];

  if (health.index < 40) {
    out.push(action({
      id: "health-critical",
      priority: "CRITICAL",
      category: "BUSINESS",
      title: `${METRIC_LABEL_PL.healthIndex} krytyczny (${health.index})`,
      description: health.recommendation,
      reason: `Obciążenie ${PIPELINE_LABEL_PL.pipeline} ${Math.round(health.overloadIndex * 100)}%, wolne sloty: ${health.freeSlots}`,
      source: "computeCompanyHealth()",
      recommendedAction: "Wstrzymaj nowe oferty — dokończ roboty i odciąż zespół.",
    }));
  } else if (health.index < 60) {
    out.push(action({
      id: "health-below-60",
      priority: "HIGH",
      category: "BUSINESS",
      title: `${METRIC_LABEL_PL.healthIndex} poniżej 60 (${health.index})`,
      description: health.recommendation,
      reason: `Kondycja: ${health.label} · overload ${Math.round(health.overloadIndex * 100)}%`,
      source: "computeCompanyHealth()",
      recommendedAction: "Ogranicz nowe zobowiązania.",
    }));
  }

  if (health.overloadIndex >= 1) {
    out.push(action({
      id: "health-overload-pipeline",
      priority: "HIGH",
      category: "PLANNING",
      title: "Lejek ofert przeciążony",
      description: `Równoległe oferty przekraczają komfortowy limit (${Math.round(health.overloadIndex * 100)}%).`,
      reason: "Zbyt wiele przetargów w statusie zainteresowany/w przygotowaniu",
      source: "tenders-strategy-kpi · overloadIndex",
      recommendedAction: "Zamknij lub odpuszcz część ofert w przygotowaniu.",
    }));
  }

  if (health.freeSlots <= 0 && health.index >= 50) {
    out.push(action({
      id: "health-no-free-slots",
      priority: "HIGH",
      category: "STAFF",
      title: "Brak wolnych slotów zespołu dziś",
      description: "Cała dostępna ekipa jest przypisana do robót.",
      reason: "todayFieldWorkStats · weekEmployees",
      source: "computeCompanyHealth() · wymiar Z",
      recommendedAction: "Nie planuj nowych startów bez rezerwy ludzi.",
    }));
  }

  return out;
}

function actionsFromForecast(forecast: Forecast90DaysResult): OwnerActionItem[] {
  const out: OwnerActionItem[] = [];
  const primary = primaryForecastScenario(forecast);
  const h30 = primary.horizons.find((h) => h.days === 30);
  const h60 = primary.horizons.find((h) => h.days === 60);
  const h90 = primary.horizons.find((h) => h.days === 90);

  if (h90 && h90.utilizationPct < 30) {
    out.push(action({
      id: "forecast-90-low",
      priority: "HIGH",
      category: "PLANNING",
      title: `90 dni = ${h90.utilizationPct}% obłożenia`,
      description: `Scenariusz C (${BASELINE_LABEL_PL.percentGo}) — ryzyko pustych slotów produkcyjnych.`,
      reason: `${h90.activeJobs} równoległych kontraktów vs limit ${forecast.maxConcurrentProjects}`,
      source: "forecast90d · scenariusz C",
      recommendedAction: "Znajdź minimum 2 nowe kontrakty.",
    }));
  } else if (h90 && h90.utilizationPct < 50) {
    out.push(action({
      id: "forecast-90-moderate-low",
      priority: "MEDIUM",
      category: "PLANNING",
      title: `Niskie obłożenie za 90 dni (${h90.utilizationPct}%)`,
      description: primary.alert ?? "Prognoza wskazuje spadek obłożenia.",
      reason: `Kończące się roboty bez pełnego zastępstwa z ${DECISION_LABEL_PL.GO}`,
      source: "forecast90d",
      recommendedAction: "Aktywuj pozyskiwanie przetargów i relacje z kluczowymi zamawiającymi.",
    }));
  }

  if (h60 && h60.utilizationPct > 100) {
    out.push(action({
      id: "forecast-60-overload",
      priority: "HIGH",
      category: "STAFF",
      title: `Możliwe przeciążenie za 60 dni (${h60.utilizationPct}%)`,
      description: primary.alert ?? "Zbyt wiele równoległych kontraktów w horyzoncie.",
      reason: `${h60.activeJobs} aktywnych slotów przy limicie ${forecast.maxConcurrentProjects}`,
      source: "forecast90d · horyzont 60 dni",
      recommendedAction: "Rozłóż starty lub rozważ podwykonawców / rekrutację.",
    }));
  }

  if (h30 && (h30.utilizationPct > 120 || h30.risk === "BRAK_LUDZI")) {
    out.push(action({
      id: "forecast-30-critical",
      priority: "CRITICAL",
      category: "STAFF",
      title: `Krytyczne obciążenie za 30 dni (${h30.utilizationPct}%)`,
      description: "Ryzyko braku ludzi lub przekroczenia limitu równoległych robót.",
      reason: h30.risk,
      source: "forecast90d · horyzont 30 dni",
      recommendedAction: `Odłóż nowe ${DECISION_LABEL_PL.GO} lub przyspiesz zakończenia bieżących robót.`,
    }));
  }

  return out;
}

function actionsFromOwnerDecisions(
  scoredBundles: TenderScoringBundle[],
  ownerStore: OwnerDecisionsStore,
  now: Date,
): OwnerActionItem[] {
  const out: OwnerActionItem[] = [];
  const goCandidates = collectGoCandidates(scoredBundles, ownerStore);

  const undecidedGo = goCandidates.filter((b) => !ownerStore.byId[b.item.id]);
  if (undecidedGo.length >= 3) {
    out.push(action({
      id: "owner-undecided-go-many",
      priority: "MEDIUM",
      category: "TENDERS",
      title: `${undecidedGo.length} przetargów ${DECISION_LABEL_PL.GO} bez decyzji właściciela`,
      description: `System wskazuje ${DECISION_LABEL_PL.GO} — brak Twojej decyzji w Centrum decyzji.`,
      reason: goCandidates.map((b) => b.item.bzpNumber).slice(0, 4).join(", "),
      source: "kw-tender-decisions · owner decisions",
      recommendedAction: `Podejmij decyzję ${DECISION_LABEL_PL.GO}/${DECISION_LABEL_PL.HOLD}/${DECISION_LABEL_PL["NO-GO"]} dla każdego przetargu.`,
    }));
  } else if (undecidedGo.length >= 1) {
    out.push(action({
      id: "owner-undecided-go",
      priority: "MEDIUM",
      category: "TENDERS",
      title: `${undecidedGo.length} przetarg ${DECISION_LABEL_PL.GO} bez decyzji właściciela`,
      description: undecidedGo[0].item.title.slice(0, 72),
      reason: `System: ${DECISION_LABEL_PL.GO} · ${OPPORTUNITY_LABEL_PL.short} ${undecidedGo[0].opportunity.score}`,
      source: "kw-tender-decisions",
      recommendedAction: `Podejmij decyzję ${DECISION_LABEL_PL.GO}/${DECISION_LABEL_PL.HOLD}/${DECISION_LABEL_PL["NO-GO"]}.`,
      tenderId: undecidedGo[0].item.id,
    }));
  }

  const holdVsGoUrgent = goCandidates.filter((b) => {
    const owner = ownerStore.byId[b.item.id];
    if (owner?.decision !== "HOLD") return false;
    const days = daysUntilTenderDeadline(b.item.submittingOffersDate, now);
    return days != null && days >= 0 && days <= 7 && b.decision === "GO";
  });
  if (holdVsGoUrgent.length > 0) {
    out.push(action({
      id: "owner-hold-vs-system-go",
      priority: "HIGH",
      category: "TENDERS",
      title: `Rozbieżność: Ty ${DECISION_LABEL_PL.HOLD}, system ${DECISION_LABEL_PL.GO} — bliski termin`,
      description: holdVsGoUrgent[0].item.title.slice(0, 72),
      reason: "Decyzja właściciela vs rekomendacja scoringu",
      source: "kw-tender-decisions · tenders-strategy-decision",
      recommendedAction: `Ponownie oceń przetarg lub potwierdź ${DECISION_LABEL_PL.HOLD} przed upływem terminu.`,
      tenderId: holdVsGoUrgent[0].item.id,
    }));
  }

  return out;
}

function actionsFromStrategicAlerts(alerts: OwnerStrategicAlert[]): OwnerActionItem[] {
  const out: OwnerActionItem[] = [];

  for (const alert of alerts) {
    if (alert.id === "go-deadline-7" || alert.id === "go-deadline-7-one") {
      continue;
    }
    if (alert.id.startsWith("radar-")) continue;

    let priority: ActionPriority = "MEDIUM";
    let category: ActionCategory = "PLANNING";
    let recommendedAction = "Zapoznaj się ze szczegółami w dashboardzie.";

    if (alert.tone === "danger") {
      priority = "CRITICAL";
      category = alert.id.includes("wm") ? "BUSINESS" : "STAFF";
      recommendedAction = alert.id.includes("wm")
        ? "Uporządkuj terminy odbiorów WM natychmiast."
        : "Działaj — ogranicz obciążenie lub zatrudnij wsparcie.";
    } else if (alert.tone === "warning") {
      priority = "HIGH";
      if (alert.id.includes("low-load") || alert.id.includes("ending")) category = "PLANNING";
      else if (alert.id.includes("overload")) category = "STAFF";
      else category = "TENDERS";
      recommendedAction = alert.id.includes("low-load")
        ? "Szukaj nowych kontraktów publicznych i prywatnych."
        : alert.id.includes("ending")
          ? "Zaplanuj zastępstwo kończących się robót."
          : "Priorytetyzuj terminy składania ofert.";
    } else if (alert.tone === "success") {
      priority = "MEDIUM";
      category = "PLANNING";
      recommendedAction = "Rozważ aktywne pozyskanie zleceń.";
    } else {
      priority = "LOW";
      category = "TENDERS";
      recommendedAction = `Rozszerz kryteria radaru lub odśwież ${PIPELINE_LABEL_PL.pipeline} BZP.`;
    }

    if (alert.id === "capacity-one-more") {
      priority = "MEDIUM";
      category = "PLANNING";
      recommendedAction = "Rozważ aktywne pozyskanie zleceń.";
    }

    out.push(action({
      id: `alert-${alert.id}`,
      priority,
      category,
      title: alert.message,
      description: "Alert strategiczny z warstwy explainability.",
      reason: alert.message,
      source: alert.source,
      recommendedAction,
    }));
  }

  return out;
}

/** Wygrane przetargi bez roboty — realizacja (ETAP 8.0). */
function actionsFromWonRealization(scoredBundles: TenderScoringBundle[]): OwnerActionItem[] {
  const out: OwnerActionItem[] = [];
  for (const b of scoredBundles) {
    if (b.item.status !== "won") continue;
    const titleShort =
      b.item.title.length > 56 ? `${b.item.title.slice(0, 56)}…` : b.item.title;
    if (b.item.linkedJobId) {
      out.push(
        action({
          id: `won-realization-open-${b.item.id}`,
          priority: "HIGH",
          category: "BUSINESS",
          title: "Wygrany przetarg — otwórz robotę",
          description: titleShort,
          reason: `BZP ${b.item.bzpNumber} · powiązana robota w systemie`,
          source: "pipeline.status · linkedJobId",
          recommendedAction: "Otwórz robotę i rozpocznij realizację kontraktu.",
          tenderId: b.item.id,
        }),
      );
    } else {
      out.push(
        action({
          id: `won-realization-create-${b.item.id}`,
          priority: "HIGH",
          category: "BUSINESS",
          title: "Wygrany przetarg — utwórz robotę",
          description: titleShort,
          reason: `Status: won · brak linkedJobId`,
          source: "pipeline.status · jobDraftFromTender",
          recommendedAction: "Utwórz robotę z danymi i plikami przetargu.",
          tenderId: b.item.id,
        }),
      );
    }
  }
  return out.slice(0, 5);
}

function actionsFromCapacity(forecast: Forecast90DaysResult): OwnerActionItem[] {
  if (
    forecast.freeSlotsToday >= 1
    && forecast.activeJobsNow < forecast.maxConcurrentProjects
  ) {
    const primary = primaryForecastScenario(forecast);
    const h30 = primary.horizons.find((h) => h.days === 30);
    if (h30 && h30.utilizationPct <= 85) {
      return [action({
        id: "capacity-one-contract",
        priority: "MEDIUM",
        category: "PLANNING",
        title: "Możesz przyjąć jeszcze 1 średni kontrakt",
        description: `${forecast.activeJobsNow}/${forecast.maxConcurrentProjects} slotów · ${forecast.freeSlotsToday} wolne sloty dziś`,
        reason: "Wolna pojemność operacyjna przy stabilnej prognozie 30 dni",
        source: "freeSlots · jobs · forecast90d",
        recommendedAction: "Rozważ aktywne pozyskanie zleceń.",
      })];
    }
  }
  return [];
}

function actionsFromTenderChanges(
  items: TenderPipelineItem[] | undefined,
  now: Date,
): OwnerActionItem[] {
  if (!items?.length) return [];
  const cutoff = now.getTime() - 7 * 24 * 3600_000;
  const recent = collectAllChangeEvents(items).filter(
    (e) => new Date(e.at).getTime() >= cutoff
      && !e.acknowledged
      && e.type !== "NEW_QA",
  );
  const out: OwnerActionItem[] = [];
  for (const e of recent.slice(0, 8)) {
    const priority = changeEventPriority(e.type);
    const titleShort = e.tenderTitle.length > 52 ? `${e.tenderTitle.slice(0, 52)}…` : e.tenderTitle;
    out.push(action({
      id: `tender-change-${e.id}`,
      priority,
      category: "TENDERS",
      title: e.type === "DEADLINE_CHANGED"
        ? `Zmiana terminu — ${titleShort}`
        : `Zmiana dokumentacji — ${titleShort}`,
      description: e.summary,
      reason: `${e.bzpNumber} · ${formatRelativeChangeTime(e.at, now)}`,
      source: "tender-change-monitor · snapshot diff",
      recommendedAction: e.type === "DEADLINE_CHANGED"
        ? "Sprawdź nowy termin i zaktualizuj wycenę."
        : "Pobierz nowe pliki i ponów analizę SWZ.",
      tenderId: e.tenderItemId,
    }));
  }
  return out;
}

function actionsFromTenderQa(
  items: TenderPipelineItem[] | undefined,
  now: Date,
): OwnerActionItem[] {
  if (!items?.length) return [];
  const cutoff = now.getTime() - 7 * 24 * 3600_000;
  const recent = collectAllQaEvents(items).filter(
    (e) => new Date(e.at).getTime() >= cutoff && !e.acknowledged,
  );
  const out: OwnerActionItem[] = [];
  for (const e of recent.slice(0, 6)) {
    const titleShort = e.tenderTitle.length > 52 ? `${e.tenderTitle.slice(0, 52)}…` : e.tenderTitle;
    const priority = isUrgentQaEvent(e, now) ? "HIGH" : qaEventPriority(e, now);
    out.push(action({
      id: `tender-qa-${e.id}`,
      priority,
      category: "TENDERS",
      title: `Nowe Q&A — ${titleShort}`,
      description: e.aiSummary ? `${e.summary}. ${e.aiSummary}` : e.summary,
      reason: `${e.bzpNumber} · ${formatRelativeQaTime(e.at, now)}`,
      source: "tender-qa-monitor · TenderQaAlert",
      recommendedAction: "Pobierz odpowiedzi i zaktualizuj wycenę przed złożeniem oferty.",
      tenderId: e.tenderItemId,
    }));
  }
  return out;
}

function dedupeActions(actions: OwnerActionItem[]): OwnerActionItem[] {
  const seen = new Set<string>();
  const out: OwnerActionItem[] = [];
  for (const a of sortActions(actions)) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

export function buildActionCenter(input: ActionCenterInput): ActionCenterResult {
  const now = input.now ?? new Date();

  const merged = dedupeActions([
    ...actionsFromTenderQa(input.pipelineItems, now),
    ...actionsFromTenderChanges(input.pipelineItems, now),
    ...actionsFromWonRealization(input.scoredBundles),
    ...actionsFromRadar(input.radarTop, now),
    ...actionsFromHealth(input.health),
    ...actionsFromForecast(input.forecast),
    ...actionsFromOwnerDecisions(input.scoredBundles, input.ownerStore, now),
    ...actionsFromStrategicAlerts(input.strategicAlerts),
    ...actionsFromCapacity(input.forecast),
  ]);

  const primaryAction = merged[0] ?? null;
  const headline = primaryAction
    ? `Dzisiaj system rekomenduje: ${primaryAction.recommendedAction}`
    : "Dzisiaj system rekomenduje: utrzymaj bieżący rytm — brak pilnych akcji.";

  return {
    actions: merged,
    counts: countByPriority(merged),
    primaryAction,
    headline,
  };
}

export function priorityTone(priority: ActionPriority): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "LOW":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25";
  }
}

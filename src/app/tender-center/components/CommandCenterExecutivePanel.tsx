import { useMemo } from "react";
import { Target, HeartPulse, Landmark, Trophy, CalendarRange, Zap, ChevronRight, ExternalLink } from "lucide-react";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";
import { useCommandCenterContext } from "@/app/tender-center/context/CommandCenterContext";
import { useTenderJobFromPipeline } from "@/app/tender-center/hooks/useTenderJobFromPipeline";
import {
  isWonRealizationAction,
  TenderJobLinkButtons,
} from "@/app/tender-center/components/TenderJobLinkButtons";
import type { Job } from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { HEALTH_LABEL_PL } from "@/lib/tender-center-health";
import {
  capacityScoreTone,
  financialRecommendationTone,
} from "@/lib/tender-center-financial-capacity";
import {
  FORECAST_RISK_LABEL_PL,
  primaryForecastScenario,
  riskTone,
} from "@/lib/tender-center-forecast-90d";
import type { ActionCenterResult, OwnerActionItem } from "@/lib/tender-center-action-center";
import { ACTION_PRIORITY_LABEL_PL, priorityTone } from "@/lib/tender-center-action-center";
import { DECISION_LABEL_PL } from "@/lib/tender-center-decision";

const EXECUTIVE_ACTION_MAX = 3;

function resolveTenderItem(
  tenderId: string | undefined,
  pipelineItems: TenderPipelineItem[],
): TenderPipelineItem | null {
  if (!tenderId || !pipelineItems.length) return null;
  return pipelineItems.find((i) => i.id === tenderId) ?? null;
}

function pickExecutiveActions(center: ActionCenterResult, maxItems: number): OwnerActionItem[] {
  const urgent = new Set(["CRITICAL", "HIGH"] as const);
  const seen = new Set<string>();
  const out: OwnerActionItem[] = [];

  const push = (item: OwnerActionItem | null | undefined) => {
    if (!item || !urgent.has(item.priority as "CRITICAL" | "HIGH") || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };

  push(center.primaryAction);
  for (const a of center.actions) {
    push(a);
    if (out.length >= maxItems) break;
  }
  return out.slice(0, maxItems);
}

function ForecastHorizonCompact({
  days,
  utilizationPct,
  risk,
}: {
  days: number;
  utilizationPct: number;
  risk: keyof typeof FORECAST_RISK_LABEL_PL;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/25 px-2.5 py-2 text-center min-w-0">
      <p className="text-[10px] font-semibold text-muted-foreground">{days}d</p>
      <p
        className="text-lg font-bold tabular-nums leading-tight"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {utilizationPct}%
      </p>
      <span className={`text-[8px] font-medium px-1 py-0.5 rounded border ${riskTone(risk)}`}>
        {FORECAST_RISK_LABEL_PL[risk]}
      </span>
    </div>
  );
}

export function CommandCenterExecutivePanel({
  onOpenCommandCenter,
  onOpenTender,
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  onOpenJob,
  onCreateJobFromTender,
}: {
  /** @deprecated ETAP 7H — dane z CommandCenterContext; props zachowane w DashboardView bez zmian sygnatury. */
  jobs?: unknown;
  directory?: unknown;
  weekEmployees?: unknown;
  weekFrom?: string;
  weekTo?: string;
  savedWeeks?: unknown;
  onOpenCommandCenter: () => void;
  onOpenTender?: (tenderId: string) => void;
  setJobs?: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  tenderJobUploadedBy?: string;
  onNavigateToJobFromTender?: (jobId: string) => void;
  onOpenJob?: (jobId: string) => void;
  onCreateJobFromTender?: (
    draft: ReturnType<typeof jobDraftFromTender>,
    item: TenderPipelineItem,
  ) => string | void;
}) {
  void onCreateJobFromTender;

  const { snapshot } = useCommandCenterContext();
  const {
    pipeline,
    morningBriefing,
    health,
    financialCapacity,
    bestOpportunity,
    forecast90,
    actionCenter,
  } = snapshot;

  const tenderJobEnabled = Boolean(
    setJobs && onNavigateToJobFromTender && onOpenJob && onCreateJobFromTender,
  );

  const ccJobActions = useTenderJobFromPipeline({
    setJobs: setJobs ?? (() => {}),
    uploadedBy: tenderJobUploadedBy,
    onNavigateToJob: onNavigateToJobFromTender ?? (() => {}),
    onOpenJob: onOpenJob ?? (() => {}),
    pipeline: tenderJobEnabled ? pipeline : undefined,
  });

  const handleCreateJobFromTenderItem = tenderJobEnabled
    ? (item: TenderPipelineItem) => {
        ccJobActions.createJobFromTender(jobDraftFromTender(item), item);
      }
    : undefined;

  const openLinkedJob = tenderJobEnabled ? ccJobActions.openLinkedJob : undefined;

  const wonWithoutJobCount = useMemo(
    () => pipeline.items.filter((i) => i.status === "won" && !i.linkedJobId).length,
    [pipeline.items],
  );

  const executiveActions = useMemo(
    () => pickExecutiveActions(actionCenter, EXECUTIVE_ACTION_MAX),
    [actionCenter],
  );
  const primary = primaryForecastScenario(forecast90);
  const h30 = primary.horizons.find((h) => h.days === 30);
  const h60 = primary.horizons.find((h) => h.days === 60);
  const h90 = primary.horizons.find((h) => h.days === 90);
  const hasForecastHorizons = Boolean(h30 || h60 || h90);

  if (pipeline.loading) {
    return (
      <section className="rounded-xl border border-violet-500/25 bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        Ładowanie COMMAND CENTER AI…
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-violet-500/30 bg-gradient-to-br from-card via-card to-violet-500/5 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-violet-500/20 bg-violet-500/5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide text-violet-700 dark:text-violet-300">
              {COMMAND_CENTER_BRAND.title}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">{COMMAND_CENTER_BRAND.tagline}</p>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border shrink-0 tabular-nums ${
              wonWithoutJobCount > 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                : "border-border bg-secondary/40 text-muted-foreground"
            }`}
            title="Wygrane przetargi bez powiązanej roboty"
          >
            Wygrane bez roboty: {wonWithoutJobCount}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {pipeline.error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {pipeline.error}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 sm:col-span-2 xl:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Target size={11} className="text-primary" />
              Priorytet dnia
            </p>
            <p className="text-xs font-semibold mt-1 leading-snug line-clamp-2">{morningBriefing.headline}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-3">
              {morningBriefing.priorityAction}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <HeartPulse size={11} className="text-emerald-500" />
              Indeks kondycji
            </p>
            <p
              className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {health.index}
            </p>
            <p className="text-[10px] font-medium">{HEALTH_LABEL_PL[health.label]}</p>
          </div>

          <div className="rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Landmark size={11} className="text-violet-500" />
              Zdolność finansowa
            </p>
            {financialCapacity ? (
              <>
                <p
                  className={`text-2xl font-bold tabular-nums mt-0.5 ${capacityScoreTone(financialCapacity.financialCapacityScore)}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {financialCapacity.financialCapacityScore}
                </p>
                <p
                  className={`text-[9px] font-medium mt-0.5 px-1.5 py-0.5 rounded border inline-block ${financialRecommendationTone(financialCapacity.recommendation)}`}
                >
                  {financialCapacity.recommendation}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">Brak danych okazji</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Trophy size={11} className="text-amber-500" />
              Najlepsza okazja
            </p>
            {bestOpportunity ? (
              <>
                <p className="text-[10px] font-medium mt-1 line-clamp-2 leading-snug">
                  {bestOpportunity.item.title.slice(0, 56)}
                  {bestOpportunity.item.title.length > 56 ? "…" : ""}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                  Okazja {bestOpportunity.opportunity.score} · Strategiczny {bestOpportunity.strategic.score} ·{" "}
                  <span className="font-semibold text-foreground">{DECISION_LABEL_PL[bestOpportunity.decision]}</span>
                </p>
                {bestOpportunity.item.status === "won" && (
                  <div className="mt-2">
                    <TenderJobLinkButtons
                      item={bestOpportunity.item}
                      onCreateJob={handleCreateJobFromTenderItem}
                      onOpenJob={openLinkedJob}
                      size="compact"
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">Brak kandydatów</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
              <CalendarRange size={11} className="text-primary" />
              Prognoza 90 dni
            </p>
            {hasForecastHorizons ? (
              <div className="grid grid-cols-3 gap-1">
                {h30 && (
                  <ForecastHorizonCompact
                    days={30}
                    utilizationPct={h30.utilizationPct}
                    risk={h30.risk}
                  />
                )}
                {h60 && (
                  <ForecastHorizonCompact
                    days={60}
                    utilizationPct={h60.utilizationPct}
                    risk={h60.risk}
                  />
                )}
                {h90 && (
                  <ForecastHorizonCompact
                    days={90}
                    utilizationPct={h90.utilizationPct}
                    risk={h90.risk}
                  />
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Brak danych prognozy</p>
            )}
          </div>
        </div>

        {executiveActions.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-card/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 bg-primary/5">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-primary" />
                <span className="text-xs font-semibold">Centrum działań</span>
                <span className="text-[9px] text-muted-foreground">{ACTION_PRIORITY_LABEL_PL.CRITICAL} · {ACTION_PRIORITY_LABEL_PL.HIGH}</span>
              </div>
              <button
                type="button"
                onClick={onOpenCommandCenter}
                className="text-[10px] font-medium text-primary hover:underline min-h-[32px] px-2"
              >
                Pokaż wszystkie →
              </button>
            </div>
            <ul className="divide-y divide-border">
              {executiveActions.map((item) => {
                const tenderItem = isWonRealizationAction(item.id)
                  ? resolveTenderItem(item.tenderId, pipeline.items)
                  : null;
                return (
                  <li key={item.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${priorityTone(item.priority)}`}>
                        {ACTION_PRIORITY_LABEL_PL[item.priority]}
                      </span>
                      <p className="text-xs font-semibold flex-1 min-w-0">{item.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{item.recommendedAction}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {tenderItem && (
                        <TenderJobLinkButtons
                          item={tenderItem}
                          onCreateJob={handleCreateJobFromTenderItem}
                          onOpenJob={openLinkedJob}
                          size="compact"
                        />
                      )}
                      {item.tenderId && onOpenTender && (
                        <button
                          type="button"
                          onClick={() => onOpenTender(item.tenderId!)}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline min-h-[32px]"
                        >
                          <ExternalLink size={10} />
                          Otwórz przetarg
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenCommandCenter}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-600/90 text-white text-sm font-semibold transition-colors min-h-[44px]"
        >
          Otwórz COMMAND CENTER AI
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

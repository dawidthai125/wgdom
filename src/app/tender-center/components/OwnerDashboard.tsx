import { useMemo, useState } from "react";
import { RefreshCw, Scale, GitBranch, AlertCircle } from "lucide-react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { useTendersPipeline } from "@/app/tender-center/hooks/useTendersPipeline";
import { computeCompanyHealth } from "@/lib/tender-center-health";
import { aggregateMarketKpi } from "@/lib/tender-center-kpi";
import {
  loadGrowthMode,
  setGrowthMode,
  type GrowthModeState,
} from "@/lib/tender-center-growth-mode";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { rankTopTenderOpportunities } from "@/lib/tender-center-decision";
import { CompanyHealthCard } from "@/app/tender-center/components/CompanyHealthCard";
import { GrowthModeSelector } from "@/app/tender-center/components/GrowthModeSelector";
import { OpportunityOverview } from "@/app/tender-center/components/OpportunityOverview";
import { OpportunityRadar } from "@/app/tender-center/components/OpportunityRadar";

export function OwnerDashboard({
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
  showTestBadge = false,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  showTestBadge?: boolean;
}) {
  const [growthModeState, setGrowthModeState] = useState<GrowthModeState>(loadGrowthMode);
  const pipeline = useTendersPipeline({ profileVersion: 0 });

  const profile = useMemo(() => loadCompanyProfileLocal(), []);

  const health = useMemo(
    () =>
      computeCompanyHealth({
        items: pipeline.items,
        jobs,
        directory,
        weekEmployees: productionWeekEmployees,
        weekFrom,
        weekTo,
        profile,
        growthMode: growthModeState.mode,
        savedWeeks,
      }),
    [
      pipeline.items,
      jobs,
      directory,
      productionWeekEmployees,
      weekFrom,
      weekTo,
      profile,
      growthModeState.mode,
      savedWeeks,
    ],
  );

  const marketKpi = useMemo(
    () => aggregateMarketKpi(pipeline.items, profile),
    [pipeline.items, profile],
  );

  const radarTop = useMemo(
    () =>
      rankTopTenderOpportunities(pipeline.items, profile, {
        health,
        growthMode: growthModeState.mode,
        jobs,
        items: pipeline.items,
        profile,
      }, 5),
    [pipeline.items, profile, health, growthModeState.mode, jobs],
  );

  const handleGrowthModeChange = (mode: GrowthModeState["mode"]) => {
    setGrowthModeState(setGrowthMode(mode));
  };

  if (pipeline.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Ładowanie Tender Center PRO…
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="sticky top-0 z-20 px-4 sm:px-6 py-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-primary" />
              <h1 className="text-lg font-semibold">Tender Center PRO</h1>
              {showTestBadge && (
                <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                  Super Admin · test
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Centrum rozwoju firmy — kondycja, tryb rozwoju i pipeline przetargów publicznych.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void pipeline.refreshFromBzp()}
            disabled={pipeline.syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
          >
            <RefreshCw size={16} className={pipeline.syncing || pipeline.autoSyncing ? "animate-spin" : ""} />
            {pipeline.syncing ? "Pobieranie…" : pipeline.autoSyncing ? "Auto-sync…" : "Odśwież z BZP"}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {pipeline.error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {pipeline.error}
          </div>
        )}

        {pipeline.autoAwardRunning && (
          <p className="text-[10px] text-muted-foreground">Sprawdzam wyniki zakończonych postępowań…</p>
        )}

        <CompanyHealthCard health={health} />

        <GrowthModeSelector
          mode={growthModeState.mode}
          suggestedMode={health.suggestedGrowthMode}
          onChange={handleGrowthModeChange}
        />

        <OpportunityOverview kpi={marketKpi} />

        <OpportunityRadar ranked={radarTop} />

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <GitBranch size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Podsumowanie pipeline</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                {pipeline.stats.actionable} do zgłoszenia
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-secondary">{pipeline.stats.active} aktywnych</span>
              {pipeline.stats.urgent > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {pipeline.stats.urgent} termin ≤7 dni
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                {pipeline.stats.priority} kluczowi
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                {pipeline.stats.interested} w analizie
              </span>
            </div>

            <div className="rounded-xl bg-secondary/40 px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lejek pipeline</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                <span>Nowe: <strong className="text-foreground">{pipeline.funnel.new}</strong></span>
                <span>Obejrzane: <strong className="text-foreground">{pipeline.funnel.seen}</strong></span>
                <span>Interesuje: <strong className="text-violet-600">{pipeline.funnel.interested}</strong></span>
                <span>Oferta: <strong className="text-foreground">{pipeline.funnel.preparing}</strong></span>
                <span>Złożone: <strong className="text-foreground">{pipeline.funnel.submitted}</strong></span>
                <span>Wygrane: <strong className="text-emerald-600">{pipeline.funnel.won}</strong></span>
                <span>Przegrane: <strong className="text-foreground">{pipeline.funnel.lost}</strong></span>
                {pipeline.funnel.winRate != null && (
                  <span>Skuteczność: <strong className="text-primary">{pipeline.funnel.winRate}%</strong></span>
                )}
              </div>
            </div>

            {pipeline.actionChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground self-center mr-1">Wymaga działania:</span>
                {pipeline.actionChips.map((chip) => {
                  const toneCls =
                    chip.tone === "red"
                      ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25"
                      : chip.tone === "amber"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                        : chip.tone === "violet"
                          ? "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25";
                  return (
                    <span
                      key={chip.id}
                      className={`text-[10px] font-medium px-2 py-1 rounded-lg border ${toneCls}`}
                    >
                      {chip.label} ({chip.count})
                    </span>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Pełna lista przetargów, filtry i szczegóły SWZ — w{" "}
              <strong className="text-foreground">Klasycznym widoku</strong> (przełącznik u góry ekranu).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

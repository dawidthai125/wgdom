import { useMemo } from "react";
import { AlertTriangle, Briefcase, ChevronRight, Scale } from "lucide-react";
import { TENDERS_MODULE_LABELS } from "@/lib/tenders-module-labels";
import { useTendersContext } from "@/app/tenders/context/TendersContext";

const SHORTCUT_TITLE = "Przetargi — skrót";

export function TendersShortcutPanel({
  onOpenTendersStrategy,
}: {
  onOpenTendersStrategy: () => void;
}) {
  const { snapshot, ownerDecisions, openTendersStrategy } = useTendersContext();
  const { pipeline, marketKpi, scoredForForecast } = snapshot;

  const wonWithoutJobCount = useMemo(
    () => pipeline.items.filter((i) => i.status === "won" && !i.linkedJobId).length,
    [pipeline.items],
  );

  const pendingDecisionsCount = useMemo(
    () =>
      scoredForForecast.filter((b) => {
        if (ownerDecisions.getOwnerDecision(b.item.id)) return false;
        return b.opportunity.score >= 55;
      }).length,
    [scoredForForecast, ownerDecisions],
  );

  const handleOpenStrategy = () => {
    openTendersStrategy();
    onOpenTendersStrategy();
  };

  if (pipeline.loading) {
    return (
      <section className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {TENDERS_MODULE_LABELS.loading}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide text-foreground">{SHORTCUT_TITLE}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pilne terminy, wygrane bez roboty i decyzje — szczegóły w {TENDERS_MODULE_LABELS.tabs.strategy}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {pipeline.error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {pipeline.error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              marketKpi.urgentCount > 0
                ? "border-amber-500/35 bg-amber-500/5"
                : "border-border bg-secondary/20"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertTriangle size={11} className={marketKpi.urgentCount > 0 ? "text-amber-500" : "text-muted-foreground"} />
              Pilne terminy
            </p>
            <p
              className="text-2xl font-bold tabular-nums mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {marketKpi.urgentCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Termin składania ≤7 dni</p>
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 ${
              wonWithoutJobCount > 0
                ? "border-amber-500/35 bg-amber-500/5"
                : "border-border bg-secondary/20"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Briefcase size={11} className={wonWithoutJobCount > 0 ? "text-amber-500" : "text-muted-foreground"} />
              Wygrane bez roboty
            </p>
            <p
              className="text-2xl font-bold tabular-nums mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {wonWithoutJobCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Wymagają utworzenia roboty</p>
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 ${
              pendingDecisionsCount > 0
                ? "border-violet-500/35 bg-violet-500/5"
                : "border-border bg-secondary/20"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Scale size={11} className={pendingDecisionsCount > 0 ? "text-violet-500" : "text-muted-foreground"} />
              Wymagają decyzji
            </p>
            <p
              className="text-2xl font-bold tabular-nums mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {pendingDecisionsCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Okazje bez Twojej decyzji</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenStrategy}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors min-h-[44px]"
        >
          Przetargi → {TENDERS_MODULE_LABELS.tabs.strategy}
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

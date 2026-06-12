import { Activity, Compass } from "lucide-react";
import {
  type CompanyHealthResult,
  HEALTH_LABEL_PL,
  type HealthLabel,
} from "@/lib/tenders-strategy-health";
import {
  type GrowthMode,
  GROWTH_MODE_LABELS,
} from "@/lib/tenders-strategy-growth-mode";
import { MetricHelpTooltip } from "@/app/tenders/strategy/components/MetricHelpTooltip";
import { METRIC_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";

function labelTone(label: HealthLabel): string {
  switch (label) {
    case "healthy":
      return "text-emerald-600 dark:text-emerald-400";
    case "stable":
      return "text-blue-600 dark:text-blue-400";
    case "strained":
      return "text-amber-600 dark:text-amber-400";
    case "at_risk":
      return "text-red-600 dark:text-red-400";
  }
}

function modeTone(mode: GrowthMode, active: boolean): string {
  if (!active) return "border-border/60 bg-background/50 text-muted-foreground hover:bg-secondary/60";
  switch (mode) {
    case "stabilize":
      return "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "balanced":
      return "border-primary/40 bg-primary/15 text-primary";
    case "growth":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
    case "expansion":
      return "border-violet-500/40 bg-violet-500/15 text-violet-800 dark:text-violet-300";
  }
}

export function TendersStrategyHero({
  health,
  growthMode,
  suggestedMode,
  onGrowthModeChange,
}: {
  health: CompanyHealthResult;
  growthMode: GrowthMode;
  suggestedMode: GrowthMode;
  onGrowthModeChange: (mode: GrowthMode) => void;
}) {
  const modes = Object.keys(GROWTH_MODE_LABELS) as GrowthMode[];

  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/80 bg-primary/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h2 className="text-sm font-semibold tracking-wide">Kondycja firmy</h2>
        </div>
        <span className={`text-xs font-medium ${labelTone(health.label)}`}>
          {HEALTH_LABEL_PL[health.label]}
        </span>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              {METRIC_LABEL_PL.healthIndex}
              <MetricHelpTooltip metricId="health-index" />
            </p>
            <p
              className="text-4xl font-bold text-primary leading-none mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {health.index}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Compass size={12} className="text-primary shrink-0" />
            <p className="text-[10px] uppercase tracking-wider font-medium">{METRIC_LABEL_PL.growthMode}</p>
            {suggestedMode !== growthMode && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400">
                · sugestia: {GROWTH_MODE_LABELS[suggestedMode]}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onGrowthModeChange(m)}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-colors min-h-[32px] ${modeTone(m, m === growthMode)}`}
              >
                {GROWTH_MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

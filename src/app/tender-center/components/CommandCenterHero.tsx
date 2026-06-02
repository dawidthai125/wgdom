import { Activity, Zap, Compass } from "lucide-react";
import {
  type CompanyHealthResult,
  HEALTH_LABEL_PL,
  type HealthLabel,
} from "@/lib/tender-center-health";
import {
  type GrowthMode,
  GROWTH_MODE_LABELS,
} from "@/lib/tender-center-growth-mode";
import type { ActionCenterResult } from "@/lib/tender-center-action-center";
import { priorityTone } from "@/lib/tender-center-action-center";

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

export function CommandCenterHero({
  health,
  growthMode,
  suggestedMode,
  onGrowthModeChange,
  actionCenter,
}: {
  health: CompanyHealthResult;
  growthMode: GrowthMode;
  suggestedMode: GrowthMode;
  onGrowthModeChange: (mode: GrowthMode) => void;
  actionCenter: ActionCenterResult;
}) {
  const modes = Object.keys(GROWTH_MODE_LABELS) as GrowthMode[];
  const primary = actionCenter.primaryAction;

  return (
    <section className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden shadow-md">
      <div className="px-4 sm:px-5 py-3 border-b border-border/80 bg-primary/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">Kondycja firmy</h2>
        </div>
        <span className={`text-xs font-medium ${labelTone(health.label)}`}>
          {HEALTH_LABEL_PL[health.label]}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 items-start">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Index</p>
            <p
              className="text-5xl sm:text-6xl font-bold text-primary leading-none mt-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {health.index}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Compass size={14} className="text-primary shrink-0" />
              <p className="text-[10px] uppercase tracking-wider font-medium">Growth Mode</p>
              {suggestedMode !== growthMode && (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-1">
                  · sugestia: {GROWTH_MODE_LABELS[suggestedMode]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onGrowthModeChange(m)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${modeTone(m, m === growthMode)}`}
                >
                  {GROWTH_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {primary && (
          <div className="rounded-xl border border-primary/35 bg-primary/10 px-4 py-3.5 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Zap size={16} className="text-primary shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                Główna akcja dnia
              </p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityTone(primary.priority)}`}>
                {primary.priority}
              </span>
            </div>
            <p className="text-base font-semibold leading-snug">{primary.title}</p>
            <p className="text-sm text-foreground/90">{primary.recommendedAction}</p>
          </div>
        )}

        {!primary && (
          <p className="text-xs text-muted-foreground text-center py-2">{actionCenter.headline}</p>
        )}
      </div>
    </section>
  );
}

/**
 * @legacy ETAP 5A — nie montowany w OwnerDashboard (Growth Mode w CommandCenterHero).
 * Raport: docs/tender-center-pro-legacy-components.md
 */
import { Compass, Sparkles } from "lucide-react";
import {
  type GrowthMode,
  GROWTH_MODE_LABELS,
  minOpportunityScoreForMode,
} from "@/lib/tender-center-growth-mode";

const MODE_HINTS: Record<GrowthMode, string> = {
  stabilize: "Priorytet: dokończenie robot i ograniczenie nowych ofert.",
  balanced: "Równowaga między bieżącymi zleceniami a selekcją przetargów.",
  growth: "Aktywne poszerzanie portfolio publicznego przy kontrolowanym ryzyku.",
  expansion: "Maksymalna ekspansja — wysokie wymagania kapitałowe i zasobowe.",
};

function modeTone(mode: GrowthMode, active: boolean): string {
  if (!active) return "border-border bg-card hover:bg-secondary/50 text-muted-foreground";
  switch (mode) {
    case "stabilize":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "balanced":
      return "border-primary/40 bg-primary/10 text-primary";
    case "growth":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "expansion":
      return "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-300";
  }
}

export function GrowthModeSelector({
  mode,
  suggestedMode,
  onChange,
}: {
  mode: GrowthMode;
  suggestedMode: GrowthMode;
  onChange: (mode: GrowthMode) => void;
}) {
  const modes = (Object.keys(GROWTH_MODE_LABELS) as GrowthMode[]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Tryb rozwoju</h2>
        </div>
        {suggestedMode !== mode && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            <Sparkles size={11} className="text-amber-500" />
            Sugestia: {GROWTH_MODE_LABELS[suggestedMode]}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {modes.map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px] ${modeTone(m, active)}`}
              >
                <p className="text-sm font-semibold">{GROWTH_MODE_LABELS[m]}</p>
                <p className="text-[10px] mt-1 leading-snug opacity-80">{MODE_HINTS[m]}</p>
                <p className="text-[10px] mt-1.5 tabular-nums opacity-70">
                  Min. trafność radaru: {minOpportunityScoreForMode(m)}
                </p>
              </button>
            );
          })}
        </div>
        {suggestedMode !== mode && (
          <button
            type="button"
            onClick={() => onChange(suggestedMode)}
            className="text-xs text-primary hover:underline"
          >
            Zastosuj sugerowany tryb ({GROWTH_MODE_LABELS[suggestedMode]})
          </button>
        )}
      </div>
    </section>
  );
}

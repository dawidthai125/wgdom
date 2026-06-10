import { CalendarRange, AlertTriangle } from "lucide-react";
import {
  type Forecast90DaysResult,
  FORECAST_RISK_LABEL_PL,
  primaryForecastScenario,
  riskTone,
  utilizationBarTone,
} from "@/lib/tender-center-forecast-90d";
import { formatForecastSlots } from "@/lib/tender-center-forecast-display";
import { MetricHelpTooltip } from "@/app/tender-center/components/MetricHelpTooltip";
import { BASELINE_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";

function HorizonTile({
  days,
  activeJobs,
  maxConcurrentProjects,
  risk,
}: {
  days: number;
  activeJobs: number;
  maxConcurrentProjects: number;
  risk: keyof typeof FORECAST_RISK_LABEL_PL;
}) {
  const slots = formatForecastSlots(activeJobs, maxConcurrentProjects);

  return (
    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tabular-nums">{days} dni</p>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${riskTone(risk)}`}>
          {FORECAST_RISK_LABEL_PL[risk]}
        </span>
      </div>
      <p
        className="text-2xl font-bold tabular-nums leading-tight"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {slots.primaryLabel}
      </p>
      {slots.overLabel && (
        <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 tabular-nums">
          {slots.overLabel}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Równoległe realizacje · limit {slots.capacity} slotów
      </p>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${utilizationBarTone(slots.utilizationPct)}`}
          style={{ width: `${slots.barWidthPct}%` }}
        />
      </div>
    </div>
  );
}

export function ForecastCommandStrip({ forecast }: { forecast: Forecast90DaysResult }) {
  const primary = primaryForecastScenario(forecast);
  const h30 = primary.horizons.find((h) => h.days === 30);
  const h60 = primary.horizons.find((h) => h.days === 60);
  const h90 = primary.horizons.find((h) => h.days === 90);
  const horizons = [h30, h60, h90].filter(Boolean);
  const maxConcurrent = forecast.maxConcurrentProjects;

  const h90LowSlots =
    h90 != null && formatForecastSlots(h90.activeJobs, maxConcurrent).utilizationPct < 30;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-primary" />
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            Prognoza firmy
            <MetricHelpTooltip metricId="forecast-90" />
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground">{BASELINE_LABEL_PL.scenarioC}</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {horizons.map((h) => (
            <HorizonTile
              key={h!.days}
              days={h!.days}
              activeJobs={h!.activeJobs}
              maxConcurrentProjects={maxConcurrent}
              risk={h!.risk}
            />
          ))}
        </div>

        {primary.alert && (
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            {primary.alert}
          </p>
        )}

        {h90LowSlots && (
          <p className="text-xs text-center text-red-600 dark:text-red-400 font-medium">
            Za 90 dni może być problem — poniżej 30% limitu równoległych slotów.
          </p>
        )}
      </div>
    </section>
  );
}

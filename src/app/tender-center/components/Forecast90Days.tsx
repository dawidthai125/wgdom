/**
 * @legacy ETAP 5A — nie montowany w OwnerDashboard (zastąpiony przez ForecastCommandStrip).
 * Raport: docs/tender-center-pro-legacy-components.md
 */
import { CalendarRange, AlertTriangle } from "lucide-react";
import {
  type Forecast90DaysResult,
  type ForecastHorizon,
  type ForecastScenarioResult,
  FORECAST_RISK_LABEL_PL,
  primaryForecastScenario,
  riskTone,
  utilizationBarTone,
} from "@/lib/tender-center-forecast-90d";
import type { ForecastHorizonExplanation } from "@/lib/tender-center-explain";
import { ExplainReasonList } from "@/app/tender-center/components/ExplainBullets";

function fmtDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function HorizonBar({ h }: { h: ForecastHorizon }) {
  const width = Math.min(100, Math.max(4, h.utilizationPct));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-medium tabular-nums">{h.days} dni</span>
        <span
          className="font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {h.utilizationPct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${utilizationBarTone(h.utilizationPct)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {h.activeJobs} równoległych · {FORECAST_RISK_LABEL_PL[h.risk]}
      </p>
    </div>
  );
}

function ScenarioBlock({ scenario, compact }: { scenario: ForecastScenarioResult; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-border ${compact ? "p-3 bg-secondary/20" : "p-3.5 bg-card/50"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {scenario.label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenario.horizons.map((h) => (
          <HorizonBar key={h.days} h={h} />
        ))}
      </div>
      {scenario.alert && (
        <p className="mt-2.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          ALERT: {scenario.alert}
        </p>
      )}
    </div>
  );
}

export function Forecast90Days({
  forecast,
  horizonExplanations = [],
}: {
  forecast: Forecast90DaysResult;
  horizonExplanations?: ForecastHorizonExplanation[];
}) {
  const primary = primaryForecastScenario(forecast);
  const h90primary = primary.horizons.find((h) => h.days === 90);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Prognoza 90 dni</h2>
        </div>
        {h90primary && (
          <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${riskTone(h90primary.risk)}`}>
            {FORECAST_RISK_LABEL_PL[h90primary.risk]} · scenariusz C
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
            <p className="text-muted-foreground uppercase tracking-wide">Aktywne roboty</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{forecast.activeJobsNow}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
            <p className="text-muted-foreground uppercase tracking-wide">Limit równoległych</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{forecast.maxConcurrentProjects}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
            <p className="text-muted-foreground uppercase tracking-wide">Wolne sloty dziś</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{forecast.freeSlotsToday}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
            <p className="text-muted-foreground uppercase tracking-wide">Kandydaci GO</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{forecast.simulatedWinsCount}</p>
          </div>
        </div>

        {forecast.endingJobs.length > 0 && (
          <div className="rounded-xl bg-secondary/30 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Najbliższe zakończenia robót
            </p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              {forecast.endingJobs.map((j) => (
                <li key={j.id} className="flex justify-between gap-2">
                  <span className="truncate">{j.label}</span>
                  <span className="shrink-0 tabular-nums">{fmtDate(j.endIso)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {forecast.avgWeeklyHoursArchive != null && (
          <p className="text-[10px] text-muted-foreground">
            Średnio z archiwum (ostatnie tygodnie):{" "}
            <strong className="text-foreground">{forecast.avgWeeklyHoursArchive} h/tyg.</strong>
          </p>
        )}

        <ScenarioBlock scenario={primary} />

        {horizonExplanations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Skąd wynik obłożenia (scenariusz C)
            </p>
            {horizonExplanations.map((ex) => (
              <div key={ex.horizon.days} className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
                <p className="text-xs font-semibold tabular-nums mb-1.5">
                  {ex.horizon.days} dni: {ex.horizon.utilizationPct}%
                </p>
                <ExplainReasonList reasons={ex.reasons} title="Powód" />
                {ex.recommendation && (
                  <p className="text-[10px] font-medium text-primary mt-2">
                    Rekomendacja: {ex.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <details className="group">
          <summary className="text-xs text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
            Scenariusze A i B
            <span className="text-muted-foreground group-open:hidden">▸</span>
            <span className="text-muted-foreground hidden group-open:inline">▾</span>
          </summary>
          <div className="mt-3 space-y-3">
            {forecast.scenarios
              .filter((s) => s.id !== "half_go")
              .map((s) => (
                <ScenarioBlock key={s.id} scenario={s} compact />
              ))}
          </div>
        </details>

        <p className="text-[10px] text-muted-foreground leading-snug">
          Obłożenie = równoległe roboty ÷ limit ({forecast.maxConcurrentProjects}).
          Wygrane GO startują po {14} dniach mobilizacji; czas trwania z SWZ lub domyślnie 75 dni.
          Tylko runtime — bez zapisu.
        </p>
      </div>
    </section>
  );
}

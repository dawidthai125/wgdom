import type { StrategyKpiCounts } from "@/lib/tender-strategy-ux";

function KpiCell({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "amber" | "orange" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/35 bg-amber-500/5"
      : tone === "orange"
        ? "border-orange-500/35 bg-orange-500/5"
        : tone === "emerald"
          ? "border-emerald-500/35 bg-emerald-500/5"
          : "border-border bg-secondary/20";

  return (
    <div className={`rounded-lg border px-3 py-2 min-w-0 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </p>
      <p
        className="text-xl font-bold tabular-nums leading-tight mt-0.5"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{hint}</p>
    </div>
  );
}

export function StrategyKpiStrip({ counts }: { counts: StrategyKpiCounts }) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-2"
      data-testid="strategy-kpi-strip"
    >
      <KpiCell
        label="Wymaga decyzji"
        value={counts.pendingDecisions}
        hint="Bez Twojej decyzji"
        tone={counts.pendingDecisions > 0 ? "amber" : "default"}
      />
      <KpiCell
        label="Termin ≤7 dni"
        value={counts.urgentDeadlines}
        hint="Aktywne postępowania"
        tone={counts.urgentDeadlines > 0 ? "amber" : "default"}
      />
      <KpiCell
        label="Monitoring"
        value={counts.monitoring}
        hint="Sygnały (7 dni)"
        tone={counts.monitoring > 0 ? "orange" : "default"}
      />
      <KpiCell
        label="Wygrane bez roboty"
        value={counts.wonWithoutJob}
        hint="Do utworzenia roboty"
        tone={counts.wonWithoutJob > 0 ? "emerald" : "default"}
      />
    </div>
  );
}

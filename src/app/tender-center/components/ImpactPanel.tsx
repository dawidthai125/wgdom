import type { ReactNode } from "react";
import {
  TrendingUp,
  HeartPulse,
  CalendarRange,
  Users,
  AlertTriangle,
  Sparkles,
  Gauge,
  Wallet,
  Layers,
  Target,
} from "lucide-react";
import type { TenderImpactResult } from "@/lib/tender-center-impact";
import {
  CONTRACT_SCALE_LABEL_PL,
  IMPACT_SCORE_CLASS_PL,
  cashFlowTone,
  contractScaleTone,
  deltaColorClass,
  impactScoreTone,
  riskLevelLabel,
  teamImpactTone,
} from "@/lib/tender-center-impact";

function fmtPln(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDelta(n: number, suffix = ""): string {
  if (n > 0) return `+${n}${suffix}`;
  if (n < 0) return `${n}${suffix}`;
  return `0${suffix}`;
}

function recommendationCardTone(rec: TenderImpactResult["recommendation"]): string {
  switch (rec) {
    case "GO":
      return "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-card to-card";
    case "HOLD":
      return "border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-card to-card";
    case "NO-GO":
      return "border-red-500/35 bg-gradient-to-br from-red-500/10 via-card to-card";
  }
}

function recommendationTextTone(rec: TenderImpactResult["recommendation"]): string {
  switch (rec) {
    case "GO":
      return "text-emerald-700 dark:text-emerald-300";
    case "HOLD":
      return "text-amber-700 dark:text-amber-300";
    case "NO-GO":
      return "text-red-700 dark:text-red-400";
  }
}

function MetricDelta({
  before,
  after,
  delta,
  suffix = "",
}: {
  before: number;
  after: number;
  delta: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className="text-2xl sm:text-3xl font-bold tabular-nums leading-none"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {before}
        {suffix}
      </span>
      <span className="text-muted-foreground text-lg">→</span>
      <span
        className="text-2xl sm:text-3xl font-bold tabular-nums leading-none text-primary"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {after}
        {suffix}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${deltaColorClass(delta)}`}>
        ({fmtDelta(delta, suffix)})
      </span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-primary shrink-0" />
        <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function ImpactPanel({ impact }: { impact: TenderImpactResult | null }) {
  if (!impact) {
    return (
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Wpływ na firmę</h2>
        </div>
        <p className="p-4 text-sm text-muted-foreground">
          Brak przetargu do analizy wpływu — dodaj aktywne ogłoszenia do pipeline.
        </p>
      </section>
    );
  }

  const { revenueImpact } = impact;

  return (
    <section className="rounded-xl border-2 border-primary/15 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-primary/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Wpływ na firmę</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Co stanie się z W&G DOM, jeśli wygramy ten przetarg?
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${contractScaleTone(impact.contractScale)}`}
          >
            {impact.contractScale}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              impact.riskLevel === "high"
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                : impact.riskLevel === "medium"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            Ryzyko: {riskLevelLabel(impact.riskLevel)}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 min-w-0">
            {impact.tenderTitle}
          </p>
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-right shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
              Impact Score
            </p>
            <p
              className={`text-2xl font-bold tabular-nums leading-none ${impactScoreTone(impact.impactScore.score)}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {impact.impactScore.score}
              <span className="text-sm text-muted-foreground font-normal">/100</span>
            </p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
              {IMPACT_SCORE_CLASS_PL[impact.impactScore.label]}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Skala kontraktu względem firmy:{" "}
          <strong className="text-foreground">{CONTRACT_SCALE_LABEL_PL[impact.contractScale]}</strong>
          {" · "}
          {(impact.companyScale.relativeToFirm * 100).toFixed(0)}% rocznego obrotu (
          {fmtPln(impact.companyScale.annualThroughputPln)}/rok)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SectionCard icon={TrendingUp} title="Finanse">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Przychód potencjalny
              </p>
              {revenueImpact.contractValuePln != null ? (
                <>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {fmtPln(revenueImpact.contractValuePln)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {revenueImpact.valueSource === "ourEstimate"
                      ? "Nasz szacunek oferty"
                      : "Wartość kontraktu (SWZ)"}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">Brak wyceny</p>
              )}
              {revenueImpact.marginPct != null && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Szac. marża vs SWZ: {revenueImpact.marginPct}%
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={HeartPulse} title="Health Impact">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Health Index</p>
            <MetricDelta
              before={impact.healthBefore}
              after={impact.healthAfter}
              delta={impact.healthDelta}
            />
          </SectionCard>

          <SectionCard icon={CalendarRange} title="Forecast Impact">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">90 dni</p>
            <MetricDelta
              before={impact.forecastBefore}
              after={impact.forecastAfter}
              delta={impact.forecastDelta}
              suffix="%"
            />
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <SectionCard icon={Wallet} title="Cash Flow Impact">
            <p className={`text-lg font-bold ${cashFlowTone(impact.cashFlowImpact.level)}`}>
              {impact.cashFlowImpact.level}
            </p>
            {impact.cashFlowImpact.wadiumPln != null && (
              <p className="text-xs text-muted-foreground">
                Wadium: {fmtPln(impact.cashFlowImpact.wadiumPln)}
                {impact.cashFlowImpact.wadiumToContractPct != null && (
                  <span> · {impact.cashFlowImpact.wadiumToContractPct}% kontraktu</span>
                )}
              </p>
            )}
            <p className="text-[11px] text-foreground/85 leading-snug">{impact.cashFlowImpact.note}</p>
          </SectionCard>

          <SectionCard icon={Users} title="Team Impact">
            <p className={`text-sm font-bold leading-snug ${teamImpactTone(impact.teamImpact.level)}`}>
              {impact.teamImpact.level}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-2">Wolne sloty</p>
            <MetricDelta
              before={impact.freeSlotsBefore}
              after={impact.freeSlotsAfter}
              delta={impact.freeSlotsAfter - impact.freeSlotsBefore}
            />
            <p className="text-[11px] text-foreground/85 leading-snug">{impact.workforceNote}</p>
          </SectionCard>

          <SectionCard icon={Layers} title="Contract Scale">
            <span
              className={`inline-block text-sm font-bold px-2 py-0.5 rounded-full border ${contractScaleTone(impact.contractScale)}`}
            >
              {impact.contractScale}
            </span>
            <p className="text-xs text-muted-foreground mt-2">{CONTRACT_SCALE_LABEL_PL[impact.contractScale]}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Typowy kontrakt firmy: {fmtPln(impact.companyScale.typicalContractPln)}
            </p>
          </SectionCard>

          <SectionCard icon={Gauge} title="Impact Score">
            <p
              className={`text-3xl font-bold tabular-nums ${impactScoreTone(impact.impactScore.score)}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {impact.impactScore.score}
            </p>
            <p className="text-xs font-medium">{IMPACT_SCORE_CLASS_PL[impact.impactScore.label]}</p>
            <div className="grid grid-cols-2 gap-1 text-[9px] text-muted-foreground pt-1">
              <span>Health {impact.impactScore.healthComponent}</span>
              <span>Forecast {impact.impactScore.forecastComponent}</span>
              <span>Cash {impact.impactScore.cashFlowComponent}</span>
              <span>Team {impact.impactScore.teamComponent}</span>
            </div>
          </SectionCard>
        </div>

        <SectionCard icon={AlertTriangle} title="Ryzyka">
          <ul className="space-y-1.5">
            {impact.risks.length === 0 && (
              <li className="text-xs text-muted-foreground">Brak istotnych sygnałów.</li>
            )}
            {impact.risks.map((r) => (
              <li
                key={r.text}
                className={`text-xs flex items-start gap-1.5 ${
                  r.tone === "warning"
                    ? "text-amber-800 dark:text-amber-300"
                    : "text-emerald-800 dark:text-emerald-300"
                }`}
              >
                <span aria-hidden>{r.tone === "warning" ? "⚠" : "✓"}</span>
                <span className="capitalize">{r.text}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div
          className={`rounded-xl border-2 px-4 py-4 space-y-2 ${recommendationCardTone(impact.recommendation)}`}
        >
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Rekomendacja AI V2
            </p>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-bold tracking-tight ${recommendationTextTone(impact.recommendation)}`}
          >
            {impact.recommendationLabel}
          </p>
          <ul className="space-y-1">
            {impact.recommendationDetail.map((line) => (
              <li key={line} className="text-sm text-foreground/90 leading-snug">
                {line}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
            {impact.summary}
          </p>
        </div>
      </div>
    </section>
  );
}

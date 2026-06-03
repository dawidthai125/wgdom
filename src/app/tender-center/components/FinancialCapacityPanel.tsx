import type { ReactNode } from "react";
import {
  Landmark,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Banknote,
} from "lucide-react";
import type { FinancialCapacityResult } from "@/lib/tender-center-financial-capacity";
import {
  capacityScoreTone,
  depositImpactTone,
  financialRecommendationTone,
  liquidityRiskTone,
} from "@/lib/tender-center-financial-capacity";
import { MetricHelpTooltip } from "@/app/tender-center/components/MetricHelpTooltip";

function fmtPln(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Wallet;
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

export function FinancialCapacityPanel({
  capacity,
}: {
  capacity: FinancialCapacityResult | null;
}) {
  if (!capacity) {
    return (
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Landmark size={16} className="text-primary" />
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            Zdolność finansowa
            <MetricHelpTooltip metricId="financial-capacity" />
          </h2>
        </div>
        <p className="p-4 text-sm text-muted-foreground">
          Brak danych — wybierz przetarg do analizy wpływu finansowego.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-violet-500/15 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-violet-500/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark size={16} className="text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              Zdolność finansowa
              <MetricHelpTooltip metricId="financial-capacity" />
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Czy mnie na ten przetarg stać?
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${liquidityRiskTone(capacity.liquidityRisk)}`}
        >
          Ryzyko płynności: {capacity.liquidityRisk}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Financial Capacity Score
            </p>
            <p
              className={`text-3xl font-bold tabular-nums leading-none mt-1 ${capacityScoreTone(capacity.financialCapacityScore)}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {capacity.financialCapacityScore}
              <span className="text-base text-muted-foreground font-normal">/100</span>
            </p>
            <p className="text-xs font-medium mt-1">{capacity.capacityClass}</p>
          </div>
          <div className="text-right space-y-1">
            {capacity.contractValue != null && (
              <p className="text-[11px] text-muted-foreground">
                Kontrakt: <strong className="text-foreground">{fmtPln(capacity.contractValue)}</strong>
              </p>
            )}
            {capacity.depositValue != null && (
              <p className="text-[11px] text-muted-foreground">
                Wadium: <strong className="text-foreground">{fmtPln(capacity.depositValue)}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SectionCard icon={Wallet} title="Wadium">
            {capacity.depositValue != null ? (
              <>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {fmtPln(capacity.depositValue)}
                </p>
                <p className={`text-sm font-semibold ${depositImpactTone(capacity.depositImpact)}`}>
                  {capacity.depositImpact}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych o wadium</p>
            )}
          </SectionCard>

          <SectionCard icon={Banknote} title="Szacowany bufor">
            <p
              className="text-2xl font-bold tabular-nums text-primary"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ≈ {fmtPln(capacity.estimatedBuffer)}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Wskaźnik biznesowy — rezerwa na wadium i koszty startu bez danych bankowych.
            </p>
          </SectionCard>

          <SectionCard icon={TrendingUp} title="Brakujące środki">
            {capacity.fundingGap != null && capacity.fundingGap > 0 ? (
              <>
                <p
                  className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {fmtPln(capacity.fundingGap)}
                </p>
                <p className="text-xs text-foreground/85">Wadium przekracza szacowany bufor.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Brak luki</p>
                <p className="text-xs text-muted-foreground">Bufor pokrywa wadium.</p>
              </>
            )}
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SectionCard icon={AlertTriangle} title="Ostrzeżenia">
            <ul className="space-y-1.5">
              {capacity.warnings.length === 0 && (
                <li className="text-xs text-muted-foreground">Brak istotnych ostrzeżeń finansowych.</li>
              )}
              {capacity.warnings.map((w) => (
                <li key={w} className="text-xs flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                  <span aria-hidden>⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard icon={ShieldCheck} title="Mocne strony">
            <ul className="space-y-1.5">
              {capacity.strengths.length === 0 && (
                <li className="text-xs text-muted-foreground">Brak wyróżnionych atutów finansowych.</li>
              )}
              {capacity.strengths.map((s) => (
                <li key={s} className="text-xs flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <span aria-hidden>✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className={`rounded-xl border-2 px-4 py-4 space-y-2 ${financialRecommendationTone(capacity.recommendation)}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Rekomendacja finansowa AI
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight">{capacity.recommendation}</p>
          <ul className="space-y-1">
            {capacity.recommendationDetail.map((line) => (
              <li key={line} className="text-sm text-foreground/90 leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

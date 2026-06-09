import { BarChart3, TrendingUp, Wallet, AlertTriangle, Shield } from "lucide-react";
import type { TenderCenterMarketKpi } from "@/lib/tender-center-kpi";
import { SECTION_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";

function fmtPln(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof BarChart3;
  accent?: "primary" | "amber" | "violet" | "red";
}) {
  const accentCls =
    accent === "amber"
      ? "border-amber-500/25 bg-amber-500/5"
      : accent === "violet"
        ? "border-violet-500/25 bg-violet-500/5"
        : accent === "red"
          ? "border-red-500/25 bg-red-500/5"
          : accent === "primary"
            ? "border-primary/25 bg-primary/5"
            : "border-border bg-secondary/30";

  return (
    <div className={`rounded-xl border px-3 py-2.5 space-y-1 ${accentCls}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon size={12} />
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p
        className="text-lg font-semibold leading-tight"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function OpportunityOverview({ kpi }: { kpi: TenderCenterMarketKpi }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <BarChart3 size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">KPI rynku</h2>
      </div>

      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiTile
          label="Aktywne postępowania"
          value={String(kpi.openTendersCount)}
          sub={`${kpi.actionableCount} do rozważenia`}
          icon={TrendingUp}
          accent="primary"
        />
        <KpiTile
          label="Wartość rynku"
          value={fmtPln(kpi.marketValuePln)}
          sub="Szacunek otwartych przetargów"
          icon={Wallet}
        />
        <KpiTile
          label={SECTION_LABEL_PL.pipelineOffers}
          value={fmtPln(kpi.pipelineBidValuePln)}
          sub={`${kpi.preparingCount} w przygotowaniu · ${kpi.submittedCount} złożonych`}
          icon={BarChart3}
          accent="violet"
        />
        <KpiTile
          label="Wadium"
          value={fmtPln(kpi.wadiumRequiredPln)}
          sub={`${SECTION_LABEL_PL.headroom}: ${fmtPln(kpi.wadiumHeadroomPln)} / ${fmtPln(kpi.maxWadiumPln)}`}
          icon={Shield}
          accent={kpi.wadiumBlockedCount > 0 ? "red" : undefined}
        />
        <KpiTile
          label="Pilne (≤7 dni)"
          value={String(kpi.urgentCount)}
          icon={AlertTriangle}
          accent={kpi.urgentCount > 0 ? "amber" : undefined}
        />
        <KpiTile
          label="Obciążenie ofert"
          value={`${Math.round(kpi.overloadIndex * 100)}%`}
          sub="Względem max równoległych projektów"
          icon={TrendingUp}
          accent={kpi.overloadIndex >= 1 ? "amber" : undefined}
        />
        <KpiTile
          label="Skuteczność"
          value={kpi.winRate != null ? `${kpi.winRate}%` : "—"}
          sub="Wygrane / (wygrane + przegrane)"
          icon={TrendingUp}
        />
        <KpiTile
          label="Blokady wadium"
          value={String(kpi.wadiumBlockedCount)}
          icon={AlertTriangle}
          accent={kpi.wadiumBlockedCount > 0 ? "red" : undefined}
        />
      </div>
    </section>
  );
}

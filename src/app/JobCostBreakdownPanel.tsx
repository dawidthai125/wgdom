import { useMemo } from "react";
import { Calculator, ChevronDown, TrendingUp } from "lucide-react";
import { computeJobIndirectCost, fmtPlnShort, weeklyOperatingCost } from "@/lib/company-labor-cost";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";

export function JobCostBreakdownPanel({
  workEntries,
  materialsCost,
  companyHoursSameWeek,
}: {
  workEntries: { date: string; hours: number; rate: number }[];
  materialsCost: number;
  /** Godziny całej ekipy w danym tygodniu — lepszy udział kosztów pobocznych. */
  companyHoursSameWeek?: number;
}) {
  const profile = useMemo(() => loadCompanyProfileLocal(), []);
  const model = profile.costModel;

  const breakdown = useMemo(
    () => computeJobIndirectCost(workEntries, model, { companyHoursSameWeek }),
    [workEntries, model, companyHoursSameWeek],
  );

  const teamWeek = useMemo(() => weeklyOperatingCost(model), [model]);

  if (workEntries.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-500/15 flex flex-wrap items-center gap-2">
        <Calculator size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Koszt robocizny + poboczne (bez materiałów)
          </p>
          <p className="text-[10px] text-muted-foreground">
            Stawki z wpisów · ZUS {model.employerBurdenPct}% · model {model.headcount} os. / {model.vehicleCount} aut
          </p>
        </div>
        <p className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300">
          min. {fmtPlnShort(breakdown.suggestedMinPrice)}
        </p>
      </div>

      <div className="px-4 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="rounded-lg bg-background/60 px-2 py-1.5">
          <p className="text-muted-foreground">Robocizna brutto</p>
          <p className="font-bold font-mono">{fmtPlnShort(breakdown.directLaborBrutto)}</p>
        </div>
        <div className="rounded-lg bg-background/60 px-2 py-1.5">
          <p className="text-muted-foreground">ZUS pracodawcy</p>
          <p className="font-bold font-mono">{fmtPlnShort(breakdown.employerZus)}</p>
        </div>
        <div className="rounded-lg bg-background/60 px-2 py-1.5">
          <p className="text-muted-foreground">Poboczne (udział)</p>
          <p className="font-bold font-mono">{fmtPlnShort(breakdown.ancillaryAllocated)}</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 px-2 py-1.5 border border-amber-500/20">
          <p className="text-muted-foreground flex items-center gap-0.5">
            <TrendingUp size={10} /> Z marżą {model.profitPct}%
          </p>
          <p className="font-bold font-mono text-amber-700 dark:text-amber-300">
            {fmtPlnShort(breakdown.suggestedMinPrice)}
          </p>
        </div>
      </div>

      <details className="px-4 pb-3 text-[10px] text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground flex items-center gap-1 py-1">
          <ChevronDown size={12} className="inline" />
          Szczegóły: Kp {model.kpPct}%, rezerwa {model.riskReservePct}%, {breakdown.jobHours} h / {breakdown.weekCount} tyg.
        </summary>
        <table className="w-full mt-2">
          <tbody>
            {breakdown.ancillaryLines.map((l) => (
              <tr key={l.id} className="border-t border-border/40">
                <td className="py-0.5 pr-2">{l.label}</td>
                <td className="py-0.5 text-right font-mono">{fmtPlnShort(l.pln)}</td>
              </tr>
            ))}
            <tr className="border-t border-border/40">
              <td className="py-0.5">Kp ({model.kpPct}%)</td>
              <td className="py-0.5 text-right font-mono">{fmtPlnShort(breakdown.kpPln)}</td>
            </tr>
            <tr className="border-t border-border/40">
              <td className="py-0.5">Rezerwa ryzyka</td>
              <td className="py-0.5 text-right font-mono">{fmtPlnShort(breakdown.riskPln)}</td>
            </tr>
            <tr className="border-t border-border/40 font-medium">
              <td className="py-0.5">Koszt własny (bez mat.)</td>
              <td className="py-0.5 text-right font-mono">{fmtPlnShort(breakdown.totalIndirectNoMaterials)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 italic">
          Ekipa łącznie ~{fmtPlnShort(teamWeek.totalEmployerPln)}/tyg. (13×45 h + poboczne).
          {materialsCost > 0 && ` Materiały wpisane osobno: ${fmtPlnShort(materialsCost)}.`}
        </p>
      </details>
    </div>
  );
}

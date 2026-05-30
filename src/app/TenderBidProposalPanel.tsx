import { AlertTriangle, Calculator, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { fmtPln } from "@/lib/tenders-bzp-swz";

export function TenderBidProposalPanel({
  proposal,
  referenceValuePln,
  ourEstimatePln,
  teamHeadcount,
  onApplyRecommended,
}: {
  proposal: TenderBidProposal | null | undefined;
  referenceValuePln?: number | null;
  ourEstimatePln?: number | null;
  teamHeadcount?: number | null;
  onApplyRecommended?: (pln: number) => void;
}) {
  if (!proposal?.ok) {
    if (proposal?.warnings?.length) {
      return (
        <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border px-3 py-2">
          {proposal.warnings[0]}
        </p>
      );
    }
    return null;
  }

  const rec = proposal.recommendedBidPln;
  if (rec == null) return null;

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden space-y-0">
      <div className="px-3 py-2.5 border-b border-violet-500/15 flex flex-wrap items-center gap-2">
        <Calculator size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-violet-900 dark:text-violet-200">
            Propozycja ceny ofertowej
          </p>
          <p className="text-[10px] text-muted-foreground">
            Robocizna + materiały + Kp + stałe ({teamHeadcount ?? 13} os.) + ZUS + marża
          </p>
        </div>
        <p className="text-lg font-bold font-mono text-violet-700 dark:text-violet-300">
          {fmtPln(rec)}
        </p>
      </div>

      <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
        {proposal.aggressiveBidPln != null && (
          <div className="rounded-lg bg-background/60 border border-border px-2 py-1.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <Zap size={10} /> Agresywna (max. szanse)
            </p>
            <p className="font-bold font-mono text-sm">{fmtPln(proposal.aggressiveBidPln)}</p>
          </div>
        )}
        <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2 py-1.5">
          <p className="text-muted-foreground flex items-center gap-1">
            <TrendingDown size={10} /> Rekomendowana
          </p>
          <p className="font-bold font-mono text-sm text-violet-700 dark:text-violet-300">{fmtPln(rec)}</p>
        </div>
        {proposal.safeBidPln != null && (
          <div className="rounded-lg bg-background/60 border border-border px-2 py-1.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <TrendingUp size={10} /> Bezpieczna (marża)
            </p>
            <p className="font-bold font-mono text-sm">{fmtPln(proposal.safeBidPln)}</p>
          </div>
        )}
      </div>

      {referenceValuePln != null && (
        <p className="text-[10px] text-muted-foreground px-3">
          Wartość ref. SWZ/kosztorys: {fmtPln(referenceValuePln)}
          {rec < referenceValuePln && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {" "}· {(((referenceValuePln - rec) / referenceValuePln) * 100).toFixed(1)}% poniżej ref.
            </span>
          )}
          {rec > referenceValuePln && (
            <span className="text-amber-600 dark:text-amber-400">
              {" "}· {(((rec - referenceValuePln) / referenceValuePln) * 100).toFixed(1)}% powyżej ref.
            </span>
          )}
        </p>
      )}

      {proposal.costStack.length > 0 && (
        <div className="px-3 pb-2">
          <table className="w-full text-[10px]">
            <tbody>
              {proposal.costStack.map((line) => (
                <tr key={line.label} className="border-t border-border/40">
                  <td className="py-1 pr-2 text-muted-foreground">{line.label}</td>
                  <td className="py-1 text-right font-mono font-medium whitespace-nowrap">
                    {fmtPln(line.pln)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {proposal.floorBidPln != null && (
        <p className="text-[10px] text-muted-foreground px-3 pb-1">
          Próg opłacalności (nie schodzić poniżej): <strong className="font-mono">{fmtPln(proposal.floorBidPln)}</strong>
        </p>
      )}

      {proposal.warnings.map((w) => (
        <div key={w} className="mx-3 mb-2 flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1.5">
          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
          {w}
        </div>
      ))}

      {proposal.assumptions.length > 0 && (
        <details className="px-3 pb-2 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Założenia kalkulacji</summary>
          <ul className="mt-1 space-y-0.5 list-disc pl-4">
            {proposal.assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </details>
      )}

      {onApplyRecommended && ourEstimatePln !== rec && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onApplyRecommended(rec); }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700"
          >
            Użyj {fmtPln(rec)} jako „Nasz szacunek”
          </button>
        </div>
      )}
    </div>
  );
}

import { AlertTriangle, Calculator, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { TENDER_BID_DISCLAIMER } from "@/lib/tender-bid-quality";
import {
  buildCatalogTuningHints,
  buildClassificationSummary,
  buildUnknownRows,
} from "@/lib/tender-classification-inspector";
import { buildBidFlowExplanation, TENDER_BID_PROPOSAL_PANEL_ID } from "@/lib/tender-bid-ux";
import {
  loadWgdomCostCatalogStore,
  WGDOM_COST_REGION_LABELS,
} from "@/lib/wgdom-cost-catalog-store";
import { fmtPln } from "@/lib/tenders-bzp-swz";

function qualityBadgeClass(level: TenderBidProposal["qualityLevel"]): string {
  if (level === "high") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/25";
  if (level === "good") return "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/25";
  if (level === "medium") return "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/25";
  return "bg-orange-500/15 text-orange-900 dark:text-orange-200 border-orange-500/25";
}

export function TenderBidProposalPanel({
  proposal,
  referenceValuePln,
  ourEstimatePln,
  teamHeadcount,
  onApplyRecommended,
  missingKosztorys,
  breakdownOpen = true,
  highlight = false,
  catalogQuantities,
}: {
  proposal: TenderBidProposal | null | undefined;
  referenceValuePln?: number | null;
  ourEstimatePln?: number | null;
  teamHeadcount?: number | null;
  onApplyRecommended?: (pln: number) => void;
  missingKosztorys?: boolean;
  /** P2-G.1D — breakdown domyślnie rozwinięty; sterowany z kafelka */
  breakdownOpen?: boolean;
  highlight?: boolean;
  /** P2-G.1E — pozycje ATH pod inspektor klasyfikacji */
  catalogQuantities?: TenderCatalogQuantityLine[] | null;
}) {
  const [catalogRegionLabel, setCatalogRegionLabel] = useState(WGDOM_COST_REGION_LABELS.wroclaw);

  useEffect(() => {
    let cancelled = false;
    void loadWgdomCostCatalogStore().then((store) => {
      if (!cancelled) {
        setCatalogRegionLabel(WGDOM_COST_REGION_LABELS[store.activeRegion]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const classification = useMemo(() => {
    if (proposal?.pricingMode !== "catalog" || !catalogQuantities?.length) return null;
    const summary = buildClassificationSummary(catalogQuantities);
    const unknownRows = buildUnknownRows(catalogQuantities);
    const tuningHints = buildCatalogTuningHints(unknownRows);
    return { summary, unknownRows, tuningHints };
  }, [proposal?.pricingMode, catalogQuantities]);
  if (!proposal?.ok) {
    const msg = proposal?.warnings?.[0]
      ?? (missingKosztorys
        ? "Aby wyliczyć ofertę: pobierz kosztorys (ATH/XLSX/PDF) z załączników lub wgraj ręcznie."
        : "Kalkulator oferty — wczytaj i sparsuj kosztorys.");
    return (
      <div
        id={TENDER_BID_PROPOSAL_PANEL_ID}
        className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 px-3 py-2.5 space-y-1"
      >
        <p className="text-xs font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
          <Calculator size={13} />
          💰 Szczegóły wyceny
        </p>
        <p className="text-[11px] text-muted-foreground">{msg}</p>
      </div>
    );
  }

  const rec = proposal.recommendedBidPln;
  if (rec == null) return null;

  const basis = proposal.calculationBasis;
  const flowSteps = buildBidFlowExplanation(proposal.pricingMode);

  return (
    <div
      id={TENDER_BID_PROPOSAL_PANEL_ID}
      className={`rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden space-y-0 transition-shadow ${
        highlight ? "ring-2 ring-violet-500/50 shadow-md" : ""
      }`}
    >
      <div className="px-3 py-2.5 border-b border-violet-500/15 flex flex-wrap items-center gap-2">
        <Calculator size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-violet-900 dark:text-violet-200">
            💰 Szczegóły wyceny
          </p>
          <p className="text-[10px] text-muted-foreground">
            Robocizna + materiały + Kp + stałe ({teamHeadcount ?? 13} os.) + ZUS + marża
          </p>
        </div>
        <p className="text-lg font-bold font-mono text-violet-700 dark:text-violet-300 w-full sm:w-auto sm:ml-auto">
          {fmtPln(rec)}
        </p>
      </div>

      <div className="px-3 py-2 border-b border-violet-500/10 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Skąd pochodzi wycena?
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {proposal.sourceLabelPl && (
            <span className="font-medium px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200">
              Źródło: {proposal.sourceLabelPl}
            </span>
          )}
          {proposal.qualityLabelPl && (
            <span className={`font-medium px-2 py-0.5 rounded-full border ${qualityBadgeClass(proposal.qualityLevel)}`}>
              Jakość: {proposal.qualityLabelPl}
            </span>
          )}
        </div>
        {proposal.qualityDetailPl && (
          <p className="text-[10px] text-muted-foreground">{proposal.qualityDetailPl}</p>
        )}
      </div>

      <div className="px-3 py-2 border-b border-violet-500/10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Jak powstała wycena?
        </p>
        <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal pl-4">
          {flowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {classification && (
        <div className="px-3 py-2 border-b border-violet-500/10 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            🔍 Klasyfikacja przedmiaru
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <p>
              <span className="text-muted-foreground">Sklasyfikowane:</span>{" "}
              <strong>{classification.summary.classifiedRows}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">UNKNOWN:</span>{" "}
              <strong className={classification.summary.unknownRows > 0 ? "text-amber-700 dark:text-amber-300" : ""}>
                {classification.summary.unknownRows}
              </strong>
            </p>
            <p>
              <span className="text-muted-foreground">Pokrycie:</span>{" "}
              <strong>{classification.summary.classifiedPercent.toFixed(1)}%</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Region:</span>{" "}
              <strong>{catalogRegionLabel}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {classification.summary.categories
              .filter((c) => c.id !== "UNKNOWN" && c.count > 0)
              .map((c) => (
                <span
                  key={c.id}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border border-border/60 bg-background/60 text-muted-foreground"
                  title={`${c.quantity.toLocaleString("pl-PL")} j.m. łącznie`}
                >
                  {c.id}: {c.count}
                </span>
              ))}
          </div>
          {classification.summary.unknownRows > 0 && (
            <details className="rounded-lg border border-amber-500/25 bg-amber-500/5 overflow-hidden">
              <summary className="cursor-pointer px-2.5 py-1.5 text-[10px] font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-500/10">
                Zobacz pozycje UNKNOWN ({classification.summary.unknownRows})
              </summary>
              <div className="max-h-48 overflow-y-auto border-t border-amber-500/15">
                <table className="w-full text-[10px]">
                  <thead className="bg-secondary/40 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 font-semibold w-10">LP</th>
                      <th className="text-left px-2 py-1 font-semibold">Opis</th>
                      <th className="text-left px-2 py-1 font-semibold w-12">Jm</th>
                      <th className="text-right px-2 py-1 font-semibold w-16">Ilość</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classification.unknownRows.map((row) => (
                      <tr key={`${row.lp}-${row.description}`} className="border-t border-border/30">
                        <td className="px-2 py-1 font-mono text-muted-foreground">{row.lp}</td>
                        <td className="px-2 py-1">{row.description}</td>
                        <td className="px-2 py-1 text-muted-foreground">{row.unit}</td>
                        <td className="px-2 py-1 text-right font-mono">{row.quantity.toLocaleString("pl-PL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {classification.tuningHints.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                Sugestie rozbudowy katalogu WGDOM
              </p>
              <ul className="text-[10px] space-y-0.5">
                {classification.tuningHints.map((h) => (
                  <li key={h.word} className="flex justify-between gap-2">
                    <span className="font-medium">&quot;{h.word}&quot;</span>
                    <span className="text-muted-foreground shrink-0">{h.count} wystąpień</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

      {basis && (
        <div className="px-3 py-2 border-t border-violet-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Podstawa kalkulacji
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[10px]">
            <p><span className="text-muted-foreground">Robocizna:</span> <strong className="font-mono">{fmtPln(basis.laborPln)}</strong></p>
            <p><span className="text-muted-foreground">Materiały:</span> <strong className="font-mono">{fmtPln(basis.materialPln)}</strong></p>
            <p><span className="text-muted-foreground">Koszty pośrednie:</span> <strong className="font-mono">{fmtPln(basis.indirectPln)}</strong></p>
            {basis.riskPln > 0 && (
              <p><span className="text-muted-foreground">Ryzyko:</span> <strong className="font-mono">{fmtPln(basis.riskPln)}</strong></p>
            )}
            <p className="col-span-full sm:col-span-2">
              <span className="text-muted-foreground">Koszt wykonania:</span>{" "}
              <strong className="font-mono text-violet-700 dark:text-violet-300">{fmtPln(basis.executionCostPln)}</strong>
            </p>
          </div>
        </div>
      )}

      {proposal.costStack.length > 0 && (
        <details open={breakdownOpen} className="px-3 py-2 border-t border-violet-500/10 group">
          <summary className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
            Pełny breakdown kosztów
          </summary>
          <table className="w-full text-[10px] mt-2">
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
        </details>
      )}

      <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t border-violet-500/10 italic">
        {TENDER_BID_DISCLAIMER}
      </p>

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

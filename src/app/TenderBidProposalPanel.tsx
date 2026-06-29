import { AlertTriangle, Calculator, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { TENDER_BID_DISCLAIMER } from "@/lib/tender-bid-quality";
import {
  buildCatalogTuningHints,
  buildClassificationSummary,
  buildUnknownRows,
} from "@/lib/tender-classification-inspector";
import {
  buildBidFlowExplanation,
  classificationCoverageTone,
  classificationCoverageToneClass,
  computeBidMarginPct,
  formatBidMarginPct,
  PROFILE_SECTION_IDS,
  TENDER_BID_PROPOSAL_PANEL_ID,
} from "@/lib/tender-bid-ux";
import { TENDER_OWNER_VALUATION_COPY } from "@/lib/tender-owner-language-pl";
import { WGDOM_COST_CATEGORY_IDS } from "@/lib/wgdom-cost-catalog";
import { WGDOM_COST_REGION_LABELS } from "@/lib/wgdom-cost-catalog-store";
import {
  assignUserCategoryFromAthLine,
  loadWgdomUserClassificationDictionaryStore,
  loadWgdomUserClassificationDictionaryStoreLocal,
  saveWgdomUserClassificationDictionaryStore,
  type UserClassificationCategory,
} from "@/lib/wgdom-user-classification-dictionary";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import {
  computeCalibrationDelta,
  formatCalibrationDeltaPct,
} from "@/lib/tender-cost-calibration";
import { buildCatalogLinePricingView } from "@/lib/tender-catalog-line-pricing";
import { TenderCatalogLinePricingSection } from "@/app/TenderCatalogLinePricingSection";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { resolveActiveCatalogForTender } from "@/lib/tender-active-catalog";
import type { TenderPriceOverrideEntry } from "@/lib/tender-price-overrides";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { buildLaborBenchmarkAlerts } from "@/lib/labor-benchmark";
import {
  buildLaborBenchmarkImpactSummary,
  formatLaborBenchmarkImpactPln,
  laborBenchmarkImpactClass,
} from "@/lib/labor-benchmark-impact";
import {
  buildMaterialHistoryImpactSummary,
  formatMaterialImpactPln,
  materialImpactClass,
} from "@/lib/material-impact";

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
  breakdownOpen = false,
  highlight = false,
  catalogQuantities,
  submittedBidPln,
  awardValuePln,
  showHistoricalCalibration = true,
  tenderId,
  priceOverrides,
  onPriceOverridesChanged,
}: {
  proposal: TenderBidProposal | null | undefined;
  referenceValuePln?: number | null;
  ourEstimatePln?: number | null;
  teamHeadcount?: number | null;
  onApplyRecommended?: (pln: number) => void;
  missingKosztorys?: boolean;
  /** P3.1 — breakdown domyślnie zwinięty w sekcji Szczegóły */
  breakdownOpen?: boolean;
  highlight?: boolean;
  catalogQuantities?: TenderCatalogQuantityLine[] | null;
  submittedBidPln?: number | null;
  awardValuePln?: number | null;
  showHistoricalCalibration?: boolean;
  /** P3.5B — nadpisania cen per przetarg */
  tenderId?: string;
  priceOverrides?: TenderPriceOverrideEntry[];
  onPriceOverridesChanged?: () => void;
}) {
  const [catalogRegionLabel, setCatalogRegionLabel] = useState(WGDOM_COST_REGION_LABELS.wroclaw);
  const [dictRevision, setDictRevision] = useState(0);
  const [assignCategoryByLp, setAssignCategoryByLp] = useState<Record<string, UserClassificationCategory>>({});
  const [assignSavingLp, setAssignSavingLp] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWgdomUserClassificationDictionaryStoreLocal();
    void loadWgdomUserClassificationDictionaryStore().then(() => {
      if (!cancelled) {
        const { activeRegion } = resolveActiveCatalogForTender();
        setCatalogRegionLabel(WGDOM_COST_REGION_LABELS[activeRegion]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const tendersCtx = useTendersContextOptional();

  const tenderCatalogResolution = useMemo(() => {
    const profile = loadCompanyProfileLocal();
    return resolveActiveCatalogForTender({
      referenceHourlyPln: profile.costModel.avgGrossHourlyPln,
    });
  }, [dictRevision]);

  const catalogLinePricing = useMemo(() => {
    if (proposal?.pricingMode !== "catalog" || !catalogQuantities?.length) return null;
    const profile = loadCompanyProfileLocal();
    return buildCatalogLinePricingView(
      catalogQuantities,
      tenderCatalogResolution.catalog,
      profile.costModel,
      priceOverrides,
    );
  }, [proposal?.pricingMode, catalogQuantities, priceOverrides, tenderCatalogResolution.catalog]);

  const materialHistoryImpact = useMemo(() => {
    if (!catalogLinePricing?.categorySummary.length) return null;
    return buildMaterialHistoryImpactSummary(
      catalogLinePricing.categorySummary.map((row) => ({
        categoryId: row.categoryId,
        categoryLabel: row.categoryLabel,
        avgMaterialPlnPerUnit: row.avgMaterialPlnPerUnit,
        dominantUnit: row.dominantUnit,
        historyView: row.materialHistory,
        quantity: row.materialQuantity,
      })),
    );
  }, [catalogLinePricing]);

  const laborBenchmarkImpact = useMemo(() => {
    if (!catalogLinePricing?.categorySummary.length) return null;
    return buildLaborBenchmarkImpactSummary(
      catalogLinePricing.categorySummary.map((row) => ({
        categoryId: row.categoryId,
        categoryLabel: row.categoryLabel,
        avgLaborPlnPerUnit: row.avgLaborPlnPerUnit,
        dominantUnit: row.dominantUnit,
        laborBenchmark: row.laborBenchmark,
        quantity: row.laborQuantity,
      })),
    );
  }, [catalogLinePricing]);

  const laborBenchmarkAlerts = useMemo(() => {
    if (!catalogLinePricing?.categorySummary.length) return null;
    return buildLaborBenchmarkAlerts(
      catalogLinePricing.categorySummary.map((row) => ({
        ...row.laborBenchmark,
        categoryLabel: row.categoryLabel,
      })),
    );
  }, [catalogLinePricing]);

  const openPriceBase = useCallback(() => {
    tendersCtx?.setActiveTab("pricebase");
  }, [tendersCtx]);

  const openClassificationDict = useCallback(() => {
    tendersCtx?.setActiveTab("profile");
    window.setTimeout(() => {
      document.getElementById(PROFILE_SECTION_IDS.classificationDictionary)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, [tendersCtx]);

  const classification = useMemo(() => {
    if (proposal?.pricingMode !== "catalog" || !catalogQuantities?.length) return null;
    const summary = buildClassificationSummary(catalogQuantities);
    const unknownRows = buildUnknownRows(catalogQuantities);
    const tuningHints = buildCatalogTuningHints(unknownRows);
    return { summary, unknownRows, tuningHints };
  }, [proposal?.pricingMode, catalogQuantities, dictRevision]);

  const handleAssignCategory = useCallback(async (row: { lp: string; description: string }) => {
    const category = assignCategoryByLp[row.lp];
    if (!category) {
      toast.error("Wybierz kategorię przed zapisem");
      return;
    }
    setAssignSavingLp(row.lp);
    try {
      const local = loadWgdomUserClassificationDictionaryStoreLocal();
      const next = assignUserCategoryFromAthLine(local, row.description, category);
      await saveWgdomUserClassificationDictionaryStore(next);
      setDictRevision((v) => v + 1);
      toast.success(`Przypisano ${category} — pokrycie klasyfikacji zaktualizowane`);
    } catch {
      toast.error("Nie udało się zapisać kategorii w słowniku");
    } finally {
      setAssignSavingLp(null);
    }
  }, [assignCategoryByLp]);

  const bidAlerts = (() => {
    if (!proposal?.ok || proposal.recommendedBidPln == null) return { top: [] as string[], more: [] as string[] };
    const list: string[] = [...proposal.warnings];
    if (proposal.floorBidPln != null) {
      list.push(`Próg opłacalności — nie schodzić poniżej ${fmtPln(proposal.floorBidPln)}`);
    }
    if (classification && classification.summary.unknownRows > 0) {
      list.push(
        `${classification.summary.unknownRows} pozycji UNKNOWN — przejrzyj klasyfikację przed ofertą`,
      );
    }
    if (proposal.qualityDetailPl && proposal.qualityLevel !== "high") {
      list.push(proposal.qualityDetailPl);
    }
    return { top: list.slice(0, 1), more: list.slice(1) };
  })();

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
          Wycena
        </p>
        <p className="text-[11px] text-muted-foreground">{msg}</p>
      </div>
    );
  }

  const rec = proposal.recommendedBidPln;
  if (rec == null) return null;

  const costPrice = proposal.costPricePln;
  const marginPct = computeBidMarginPct(rec, costPrice);
  const basis = proposal.calculationBasis;
  const flowSteps = buildBidFlowExplanation(proposal.pricingMode);

  const recVsSubmitted = submittedBidPln != null
    ? computeCalibrationDelta(rec, submittedBidPln)
    : null;
  const submittedVsAward = submittedBidPln != null && awardValuePln != null
    ? computeCalibrationDelta(submittedBidPln, awardValuePln)
    : null;
  const showCalibration = showHistoricalCalibration
    && submittedBidPln != null
    && Number.isFinite(submittedBidPln);

  const refDeltaPct = referenceValuePln != null && referenceValuePln > 0
    ? ((rec - referenceValuePln) / referenceValuePln) * 100
    : null;

  return (
    <div
      id={TENDER_BID_PROPOSAL_PANEL_ID}
      className={`rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden space-y-0 transition-shadow ${
        highlight ? "ring-2 ring-violet-500/50 shadow-md" : ""
      }`}
    >
      <div className="px-3 py-3 border-b border-violet-500/15">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <Calculator size={12} className="text-violet-600" />
          {TENDER_OWNER_VALUATION_COPY.panelTitle}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-background/70 border border-border/60 px-2 py-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{TENDER_OWNER_VALUATION_COPY.costPrice}</p>
            <p className="text-sm sm:text-base font-bold font-mono text-foreground mt-0.5 tabular-nums">
              {costPrice != null ? fmtPln(costPrice) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-background/70 border border-border/60 px-2 py-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{TENDER_OWNER_VALUATION_COPY.margin}</p>
            <p className="text-sm sm:text-base font-bold font-mono text-foreground mt-0.5 tabular-nums">
              {formatBidMarginPct(marginPct)}
            </p>
          </div>
          <div className="rounded-lg bg-violet-500/15 border border-violet-500/30 px-2 py-2">
            <p className="text-[9px] uppercase tracking-wide text-violet-800 dark:text-violet-300">{TENDER_OWNER_VALUATION_COPY.offerPrice}</p>
            <p className="text-sm sm:text-base font-bold font-mono text-violet-700 dark:text-violet-300 mt-0.5 tabular-nums">
              {fmtPln(rec)}
            </p>
          </div>
        </div>
      </div>

      {materialHistoryImpact && materialHistoryImpact.changedCount > 0 && (
        <details className="mx-3 mt-2 rounded-lg border border-sky-500/35 bg-sky-500/8 px-2.5 py-2 text-[10px]">
          <summary className="cursor-pointer font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1 flex-wrap">
            <TrendingUp size={11} className="shrink-0" />
            <span>Wpływ materiałów (historia firmy)</span>
            <span className="text-muted-foreground font-normal">
              — {materialHistoryImpact.changedCount}{" "}
              {materialHistoryImpact.changedCount === 1 ? "kategoria zmieniona" : "kategorie zmienione"}
              {" · "}Wpływ:{" "}
              <strong className={materialImpactClass(materialHistoryImpact.totalImpactPln)}>
                {formatMaterialImpactPln(materialHistoryImpact.totalImpactPln)}
              </strong>
            </span>
          </summary>
          <ul className="mt-1.5 space-y-1 list-none text-muted-foreground">
            {materialHistoryImpact.rows
              .filter((r) => !r.unavailable && r.impactPln !== 0)
              .map((row) => (
                <li key={row.categoryId}>
                  <strong className="text-foreground">{row.categoryLabel}</strong>
                  {" · "}{row.ourMaterialPlnPerUnit.toLocaleString("pl-PL")} zł
                  {row.historicalPlnPerUnit != null && (
                    <> vs {row.historicalPlnPerUnit.toLocaleString("pl-PL")} zł ({row.historyDaysAgo} dni temu)</>
                  )}
                  {" · "}
                  <span className={`font-mono font-medium ${materialImpactClass(row.impactPln)}`}>
                    {formatMaterialImpactPln(row.impactPln)}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}

      {laborBenchmarkImpact && laborBenchmarkImpact.outOfRangeCount > 0 && (
        <details className="mx-3 mt-2 rounded-lg border border-orange-500/35 bg-orange-500/8 px-2.5 py-2 text-[10px]">
          <summary className="cursor-pointer font-semibold text-orange-900 dark:text-orange-200 flex items-center gap-1 flex-wrap">
            <AlertTriangle size={11} className="shrink-0" />
            <span>Benchmark Impact</span>
            <span className="text-muted-foreground font-normal">
              — {laborBenchmarkImpact.outOfRangeCount}{" "}
              {laborBenchmarkImpact.outOfRangeCount === 1 ? "kategoria poza" : "kategorie poza"} zakresem
              {" · "}Wpływ:{" "}
              <strong className={laborBenchmarkImpactClass(laborBenchmarkImpact.totalImpactPln)}>
                {formatLaborBenchmarkImpactPln(laborBenchmarkImpact.totalImpactPln)}
              </strong>
            </span>
          </summary>
          <ul className="mt-1.5 space-y-1 list-none text-muted-foreground">
            {laborBenchmarkImpact.rows
              .filter((r) => !r.unavailable && r.status !== "ok" && r.impactPln !== 0)
              .map((row) => (
                <li key={row.categoryId}>
                  <strong className="text-foreground">{row.categoryLabel}</strong>
                  {" · "}{row.ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł vs {row.rangeLabelPl}
                  {" · "}
                  <span className={`font-mono font-medium ${laborBenchmarkImpactClass(row.impactPln)}`}>
                    {formatLaborBenchmarkImpactPln(row.impactPln)}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}

      {bidAlerts.top.length > 0 && (
        <div className="px-3 py-2 border-b border-violet-500/10 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{TENDER_OWNER_VALUATION_COPY.pricingAlerts}</p>
          {bidAlerts.top.map((w) => (
            <div key={w} className="flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1.5">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              {w}
            </div>
          ))}
          {bidAlerts.more.length > 0 && (
            <details className="text-[10px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Pokaż pozostałe alerty ({bidAlerts.more.length})
              </summary>
              <ul className="mt-1 space-y-1 list-none">
                {bidAlerts.more.map((w) => (
                  <li key={w} className="flex items-start gap-1.5 bg-amber-500/5 rounded px-2 py-1">
                    <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <details className="px-3 py-2 border-b border-violet-500/10 group">
        <summary className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Szczegóły
        </summary>
        <div className="mt-2 space-y-3 pb-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1 text-[10px]">
            <p>
              <span className="text-muted-foreground">Źródło:</span>{" "}
              <strong>{proposal.sourceLabelPl ?? "—"}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Jakość:</span>{" "}
              {proposal.qualityLabelPl ? (
                <span className={`inline-flex px-1.5 py-0.5 rounded border font-medium ${qualityBadgeClass(proposal.qualityLevel)}`}>
                  {proposal.qualityLabelPl}
                </span>
              ) : (
                <strong>—</strong>
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Ref. SWZ:</span>{" "}
              {referenceValuePln != null ? (
                <>
                  <strong className="font-mono">{fmtPln(referenceValuePln)}</strong>
                  {refDeltaPct != null && (
                    <span className={refDeltaPct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                      {" "}({refDeltaPct > 0 ? "+" : ""}{refDeltaPct.toFixed(1)}%)
                    </span>
                  )}
                </>
              ) : (
                <strong>—</strong>
              )}
            </p>
          </div>

          {laborBenchmarkAlerts && laborBenchmarkAlerts.outOfRangeCount > 0 && (
            <details className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-2 text-[10px]">
              <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                <AlertTriangle size={11} className="shrink-0" />
                {laborBenchmarkAlerts.outOfRangeCount}{" "}
                {laborBenchmarkAlerts.outOfRangeCount === 1 ? "kategoria poza" : "kategorie poza"} benchmarkiem robocizny
              </summary>
              <ul className="mt-1.5 space-y-1 list-none text-muted-foreground">
                {laborBenchmarkAlerts.items.map((item) => (
                  <li key={item.categoryLabel}>
                    <strong className="text-foreground">{item.categoryLabel}</strong>
                    {" — "}{item.statusLabelPl}
                    {" · "}{item.ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł vs {item.rangeLabelPl}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {catalogLinePricing && (
            <details className="rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden group/lines">
              <summary className="cursor-pointer px-2.5 py-2 text-[10px] font-semibold text-violet-900 dark:text-violet-200 hover:bg-violet-500/10 list-none flex items-center gap-1">
                <span className="group-open/lines:rotate-90 transition-transform inline-block">▸</span>
                Pozycje kosztorysowe ({catalogLinePricing.rows.length})
              </summary>
              <div className="px-2.5 pb-2.5 border-t border-violet-500/15">
                <TenderCatalogLinePricingSection
                  view={catalogLinePricing}
                  tenderId={tenderId}
                  catalog={tenderCatalogResolution.catalog}
                  costModel={loadCompanyProfileLocal().costModel}
                  onOverridesChanged={onPriceOverridesChanged}
                  onOpenPriceBase={tendersCtx ? openPriceBase : undefined}
                  onOpenClassificationDict={tendersCtx ? openClassificationDict : undefined}
                />
              </div>
            </details>
          )}

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{TENDER_OWNER_VALUATION_COPY.howPriceBuilt}</p>
            <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal pl-4">
              {flowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          {showCalibration && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground">Kalibracja historyczna</p>
              <div className="text-[10px] space-y-1">
                <p>
                  <span className="text-muted-foreground">WGDOM rekomendował:</span>{" "}
                  <strong className="font-mono">{fmtPln(rec)}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Złożono:</span>{" "}
                  <strong className="font-mono">{fmtPln(submittedBidPln!)}</strong>
                  {recVsSubmitted && (
                    <span className="text-muted-foreground">
                      {" "}· Różnica: <strong>{formatCalibrationDeltaPct(recVsSubmitted)}</strong>
                    </span>
                  )}
                </p>
                {awardValuePln != null && submittedVsAward && (
                  <p>
                    <span className="text-muted-foreground">Przyznano:</span>{" "}
                    <strong className="font-mono">{fmtPln(awardValuePln)}</strong>
                    {" "}· <strong>{formatCalibrationDeltaPct(submittedVsAward)}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {basis && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Podstawa kalkulacji</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[10px]">
                <p><span className="text-muted-foreground">Robocizna:</span> <strong className="font-mono">{fmtPln(basis.laborPln)}</strong></p>
                <p><span className="text-muted-foreground">Materiały:</span> <strong className="font-mono">{fmtPln(basis.materialPln)}</strong></p>
                <p><span className="text-muted-foreground">Koszty pośrednie:</span> <strong className="font-mono">{fmtPln(basis.indirectPln)}</strong></p>
                {basis.riskPln > 0 && (
                  <p><span className="text-muted-foreground">Ryzyko:</span> <strong className="font-mono">{fmtPln(basis.riskPln)}</strong></p>
                )}
              </div>
            </div>
          )}

          {(proposal.aggressiveBidPln != null || proposal.safeBidPln != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              {proposal.aggressiveBidPln != null && (
                <div className="rounded-lg bg-background/60 border border-border px-2 py-1.5">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Zap size={10} /> Agresywna (max. szanse)
                  </p>
                  <p className="font-bold font-mono text-sm">{fmtPln(proposal.aggressiveBidPln)}</p>
                </div>
              )}
              {proposal.safeBidPln != null && (
                <div className="rounded-lg bg-background/60 border border-border px-2 py-1.5">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp size={10} /> Bezpieczna (marża)
                  </p>
                  <p className="font-bold font-mono text-sm">{fmtPln(proposal.safeBidPln)}</p>
                </div>
              )}
            </div>
          )}

          {proposal.costStack.length > 0 && (
            <details open={breakdownOpen} className="group/nested">
              <summary className="text-[10px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center gap-1">
                <span className="group-open/nested:rotate-90 transition-transform inline-block">▸</span>
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

          {classification && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground">{TENDER_OWNER_VALUATION_COPY.unknownPositions}</p>
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
                  <strong
                    className={`inline-flex items-center px-1.5 py-0.5 rounded border ${classificationCoverageToneClass(
                      classificationCoverageTone(classification.summary.classifiedPercent),
                    )}`}
                  >
                    {classification.summary.classifiedPercent.toFixed(1)}%
                  </strong>
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
                    Pozycje UNKNOWN ({classification.summary.unknownRows})
                  </summary>
                  <div className="max-h-48 overflow-y-auto border-t border-amber-500/15">
                    <table className="w-full text-[10px]">
                      <thead className="bg-secondary/40 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1 font-semibold w-10">LP</th>
                          <th className="text-left px-2 py-1 font-semibold">Opis</th>
                          <th className="text-left px-2 py-1 font-semibold w-12">Jm</th>
                          <th className="text-right px-2 py-1 font-semibold w-16">Ilość</th>
                          <th className="text-left px-2 py-1 font-semibold min-w-[140px]">Przypisz kategorię</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classification.unknownRows.map((row) => (
                          <tr key={`${row.lp}-${row.description}`} className="border-t border-border/30">
                            <td className="px-2 py-1 font-mono text-muted-foreground">{row.lp}</td>
                            <td className="px-2 py-1">{row.description}</td>
                            <td className="px-2 py-1 text-muted-foreground">{row.unit}</td>
                            <td className="px-2 py-1 text-right font-mono">{row.quantity.toLocaleString("pl-PL")}</td>
                            <td className="px-2 py-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <select
                                  value={assignCategoryByLp[row.lp] ?? ""}
                                  onChange={(e) => setAssignCategoryByLp((prev) => ({
                                    ...prev,
                                    [row.lp]: e.target.value as UserClassificationCategory,
                                  }))}
                                  className="flex-1 min-w-[88px] bg-secondary rounded px-1 py-0.5 border border-border text-[9px]"
                                >
                                  <option value="">— wybierz —</option>
                                  {WGDOM_COST_CATEGORY_IDS.map((id) => (
                                    <option key={id} value={id}>{id}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={assignSavingLp === row.lp || !assignCategoryByLp[row.lp]}
                                  onClick={() => void handleAssignCategory(row)}
                                  className="shrink-0 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-medium hover:bg-violet-700 disabled:opacity-40"
                                >
                                  {assignSavingLp === row.lp ? "…" : "Zapisz"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              {classification.tuningHints.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Top nieznane frazy</p>
                  <ul className="text-[10px] space-y-0.5">
                    {classification.tuningHints.map((h) => (
                      <li key={h.phrase} className="flex justify-between gap-2">
                        <span className="font-medium">&quot;{h.phrase}&quot;</span>
                        <span className="text-muted-foreground shrink-0">{h.count} wystąpień</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {proposal.assumptions.length > 0 && (
            <details className="text-[10px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground font-semibold">Założenia kalkulacji</summary>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                {proposal.assumptions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </details>
          )}

          <p className="text-[10px] text-muted-foreground italic">{TENDER_BID_DISCLAIMER}</p>
          {teamHeadcount != null && (
            <p className="text-[10px] text-muted-foreground">
              Model: {teamHeadcount} os. załogi · koszty stałe i ZUS wliczone w kalkulację.
            </p>
          )}
        </div>
      </details>

      {onApplyRecommended && ourEstimatePln !== rec && (
        <div className="px-3 py-3 border-t border-violet-500/10">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onApplyRecommended(rec); }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700"
          >
            <TrendingDown size={12} />
            Użyj {fmtPln(rec)} jako „Nasz szacunek”
          </button>
        </div>
      )}
    </div>
  );
}

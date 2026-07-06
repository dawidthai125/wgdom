import { useState } from "react";
import { AlertTriangle, ExternalLink, Pencil } from "lucide-react";
import type { CatalogCategoryCostSummaryRow, CatalogLinePricingView } from "@/lib/tender-catalog-line-pricing";
import {
  CATALOG_LINE_PRICE_SOURCE_OVERRIDE,
} from "@/lib/tender-catalog-line-pricing";
import {
  CATALOG_UX_OVERRIDE_LABEL,
  CATALOG_UX_SOURCE_LABEL,
  CATALOG_UX_WORK_CATALOG_TAB_LABEL,
} from "@/lib/tender-catalog-ux-labels";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { WgdomCostCatalog } from "@/lib/wgdom-cost-catalog";
import { TenderCategoryPriceOverrideModal } from "@/app/TenderCategoryPriceOverrideModal";
import { LaborBenchmarkStatusBadge } from "@/app/LaborBenchmarkUi";
import { MaterialHistoryCell } from "@/app/MaterialHistoryUi";
import {
  TenderDesktopTable,
  TenderMobileRowCard,
  TenderMobileTableCards,
} from "@/app/tenders/mobile/tender-mobile-row-cards";
import {
  formatLaborBenchmarkDeviationShort,
  formatLaborBenchmarkImpactPln,
  laborBenchmarkImpactClass,
} from "@/lib/labor-benchmark-impact";
import {
  formatMaterialDeviationShort,
  formatMaterialImpactPln,
  materialImpactClass,
} from "@/lib/material-impact";

function formatPerUnit(pln: number | null, unit: string): string {
  if (pln == null || !Number.isFinite(pln)) return "—";
  return `${pln.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł`;
}

function unitSuffix(unit: string): string {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  return unit;
}

function rowSourceLabel(materialSource: string | null, laborSource: string | null): string {
  const hasOverride =
    materialSource === CATALOG_LINE_PRICE_SOURCE_OVERRIDE
    || laborSource === CATALOG_LINE_PRICE_SOURCE_OVERRIDE;
  if (hasOverride) return CATALOG_UX_OVERRIDE_LABEL;
  return CATALOG_UX_SOURCE_LABEL;
}

export function TenderCatalogLinePricingSection({
  view,
  tenderId,
  catalog,
  costModel,
  onOverridesChanged,
  onOpenWorkCatalog,
  onOpenClassificationDict,
}: {
  view: CatalogLinePricingView;
  tenderId?: string;
  catalog?: WgdomCostCatalog;
  costModel?: TenderCompanyCostModel;
  onOverridesChanged?: () => void;
  onOpenWorkCatalog?: () => void;
  onOpenClassificationDict?: () => void;
}) {
  const [editCategory, setEditCategory] = useState<CatalogCategoryCostSummaryRow | null>(null);
  const canEdit = Boolean(tenderId && catalog && costModel && onOverridesChanged);

  return (
    <div className="space-y-2.5">
      {view.unassignedCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-2 text-[10px] space-y-1.5">
          <p className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1">
            <AlertTriangle size={11} />
            Pozycje nieprzypisane: <strong>{view.unassignedCount}</strong>
          </p>
          <p className="text-muted-foreground">
            Dla pozycji UNKNOWN nie podstawiamy cen z bazy — nie wliczają się do podsumowania kategorii.
          </p>
          <div className="flex flex-wrap gap-2">
            {onOpenWorkCatalog && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenWorkCatalog(); }}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Przejdź do {CATALOG_UX_WORK_CATALOG_TAB_LABEL}
                <ExternalLink size={10} />
              </button>
            )}
            {onOpenClassificationDict && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenClassificationDict(); }}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Przejdź do słownika klasyfikacji
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      )}

      {view.categorySummary.length > 0 && (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2.5 py-1.5 bg-secondary/40 border-b border-border/40">
            Podsumowanie kategorii (bez UNKNOWN) — ranking wpływu benchmarku
          </p>
          <TenderMobileTableCards className="p-2">
            {view.categorySummary.map((row) => (
              <TenderMobileRowCard
                key={`mcat-${row.categoryId}`}
                title={row.categoryLabel}
                subtitle={(row.hasMaterialOverride || row.hasLaborOverride) ? "Override" : undefined}
                fields={[
                  { label: "Pozycje", value: row.positionCount },
                  { label: "Koszt", value: fmtPln(row.totalCostPln) },
                  {
                    label: "Nasza rbh",
                    value: row.laborBenchmark.status === "unavailable"
                      ? "—"
                      : `${row.avgLaborPlnPerUnit.toLocaleString("pl-PL")} zł/${unitSuffix(row.dominantUnit)}`,
                  },
                  {
                    label: "Wpływ",
                    value: row.laborImpact.unavailable || row.laborImpact.impactPln === 0
                      ? "—"
                      : formatLaborBenchmarkImpactPln(row.laborImpact.impactPln),
                  },
                ]}
                footer={canEdit ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditCategory(row); }}
                    className="text-[10px] text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                  >
                    <Pencil size={9} />
                    Edytuj cenę kategorii
                  </button>
                ) : undefined}
              />
            ))}
          </TenderMobileTableCards>
          <TenderDesktopTable>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] min-w-[520px]">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="text-left px-2 py-1 font-semibold">Kategoria</th>
                  <th className="text-right px-2 py-1 font-semibold">Pozycje</th>
                  <th className="text-right px-2 py-1 font-semibold">Koszt</th>
                  <th className="text-right px-2 py-1 font-semibold">Nasza rbh</th>
                  <th className="text-left px-2 py-1 font-semibold">Benchmark</th>
                  <th className="text-right px-2 py-1 font-semibold">Odchylenie</th>
                  <th className="text-right px-2 py-1 font-semibold">Wpływ</th>
                  {canEdit && <th className="text-right px-2 py-1 font-semibold w-16">Akcja</th>}
                </tr>
              </thead>
              <tbody>
                {view.categorySummary.map((row) => (
                  <tr key={row.categoryId} className="border-t border-border/30">
                    <td className="px-2 py-1 font-medium">
                      {row.categoryLabel}
                      {(row.hasMaterialOverride || row.hasLaborOverride) && (
                        <span className="ml-1 text-[9px] text-violet-600 dark:text-violet-400 font-normal">
                          Override
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{row.positionCount}</td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">{fmtPln(row.totalCostPln)}</td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {row.laborBenchmark.status === "unavailable"
                        ? "—"
                        : `${row.avgLaborPlnPerUnit.toLocaleString("pl-PL")} zł/${unitSuffix(row.dominantUnit)}`}
                    </td>
                    <td className="px-2 py-1 align-top">
                      {row.laborBenchmark.status === "unavailable" ? (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-mono tabular-nums">{row.laborBenchmark.rangeLabelPl}</span>
                          <p>
                            <LaborBenchmarkStatusBadge comparison={row.laborBenchmark} compact />
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {row.laborImpact.unavailable || row.laborImpact.deviationPerUnit === 0
                        ? "—"
                        : formatLaborBenchmarkDeviationShort(row.laborImpact.deviationPerUnit)}
                    </td>
                    <td className={`px-2 py-1 text-right font-mono font-medium tabular-nums ${laborBenchmarkImpactClass(row.laborImpact.impactPln)}`}>
                      {row.laborImpact.unavailable || row.laborImpact.impactPln === 0
                        ? "—"
                        : formatLaborBenchmarkImpactPln(row.laborImpact.impactPln)}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditCategory(row); }}
                          className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium"
                        >
                          <Pencil size={9} />
                          Edytuj
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </TenderDesktopTable>
          <p className="px-2.5 py-1 text-[9px] text-muted-foreground border-t border-border/30">
            Koszt direct (materiał + robocizna): {fmtPln(view.classifiedDirectTotalPln)}
            {" · "}{view.classifiedPositionCount} poz. sklasyfikowanych
            {" · "}Wpływ rbh = odchylenie vs benchmark × ilość (read-only)
          </p>
        </div>
      )}

      {view.categorySummary.length > 0 && (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2.5 py-1.5 bg-secondary/40 border-b border-border/40">
            Materiały — historia firmy i wpływ (bez benchmarku rynku)
          </p>
          <TenderMobileTableCards className="p-2">
            {[...view.categorySummary]
              .sort((a, b) => b.materialImpact.impactPln - a.materialImpact.impactPln)
              .map((row) => (
                <TenderMobileRowCard
                  key={`mmat-${row.categoryId}`}
                  title={row.categoryLabel}
                  fields={[
                    {
                      label: "Materiał",
                      value: row.avgMaterialPlnPerUnit > 0
                        ? `${row.avgMaterialPlnPerUnit.toLocaleString("pl-PL")} zł/${unitSuffix(row.dominantUnit)}`
                        : "—",
                    },
                    { label: "Źródło", value: row.materialSourceLabel },
                    {
                      label: "Wpływ mat.",
                      value: row.materialImpact.unavailable || row.materialImpact.impactPln === 0
                        ? "—"
                        : formatMaterialImpactPln(row.materialImpact.impactPln),
                    },
                  ]}
                  footer={row.materialHistory.trend ? (
                    <p className="text-[9px] text-muted-foreground">
                      {row.materialHistory.trend.icon} {row.materialHistory.trend.labelPl}
                    </p>
                  ) : undefined}
                />
              ))}
          </TenderMobileTableCards>
          <TenderDesktopTable>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] min-w-[560px]">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="text-left px-2 py-1 font-semibold">Kategoria</th>
                  <th className="text-right px-2 py-1 font-semibold">Materiał</th>
                  <th className="text-left px-2 py-1 font-semibold">Źródło</th>
                  <th className="text-left px-2 py-1 font-semibold min-w-[120px]">Historia / trend</th>
                  <th className="text-right px-2 py-1 font-semibold">Odchylenie</th>
                  <th className="text-right px-2 py-1 font-semibold">Wpływ mat.</th>
                </tr>
              </thead>
              <tbody>
                {[...view.categorySummary]
                  .sort((a, b) => b.materialImpact.impactPln - a.materialImpact.impactPln)
                  .map((row) => (
                    <tr key={`mat-${row.categoryId}`} className="border-t border-border/30">
                      <td className="px-2 py-1 font-medium">{row.categoryLabel}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">
                        {row.avgMaterialPlnPerUnit > 0
                          ? `${row.avgMaterialPlnPerUnit.toLocaleString("pl-PL")} zł/${unitSuffix(row.dominantUnit)}`
                          : "—"}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">{row.materialSourceLabel}</td>
                      <td className="px-2 py-1 align-top">
                        <MaterialHistoryCell
                          view={row.materialHistory}
                          impact={row.materialImpact}
                          compact
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">
                        {row.materialImpact.unavailable || row.materialImpact.deviationPerUnit === 0
                          ? "—"
                          : formatMaterialDeviationShort(row.materialImpact.deviationPerUnit)}
                      </td>
                      <td className={`px-2 py-1 text-right font-mono font-medium tabular-nums ${materialImpactClass(row.materialImpact.impactPln)}`}>
                        {row.materialImpact.unavailable || row.materialImpact.impactPln === 0
                          ? "—"
                          : formatMaterialImpactPln(row.materialImpact.impactPln)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          </TenderDesktopTable>
          <p className="px-2.5 py-1 text-[9px] text-muted-foreground border-t border-border/30">
            Wpływ materiałów = (nasza stawka − historia firmy 90 dni) × ilość — read-only
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <p className="sm:hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2.5 py-1.5 bg-secondary/40 border-b border-border/40">
          Katalog linii kosztorysu
        </p>
        <TenderMobileTableCards className="p-2 max-h-80 overflow-y-auto">
          {view.rows.map((row) => (
            <TenderMobileRowCard
              key={`mline-${row.lp}-${row.description}`}
              title={`${row.lp}. ${row.description}`}
              subtitle={row.isUnknown ? "UNKNOWN — brak ceny" : row.categoryLabel}
              fields={[
                { label: "Ilość", value: row.quantityDisplay },
                { label: "j.m.", value: row.unit },
                {
                  label: "Materiał",
                  value: row.isUnknown ? "—" : formatPerUnit(row.materialPlnPerUnit, row.unit),
                },
                {
                  label: "Robocizna",
                  value: row.isUnknown ? "—" : formatPerUnit(row.laborPlnPerUnit, row.unit),
                },
                {
                  label: "Razem",
                  value: row.isUnknown ? "—" : formatPerUnit(row.lineTotalPln, row.unit),
                  fullWidth: true,
                },
              ]}
            />
          ))}
        </TenderMobileTableCards>
        <TenderDesktopTable>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-[10px] min-w-[820px]">
            <thead className="bg-secondary/50 sticky top-0 z-[1]">
              <tr>
                <th className="text-left px-2 py-1 font-semibold w-8">Lp.</th>
                <th className="text-left px-2 py-1 font-semibold min-w-[120px]">Opis</th>
                <th className="text-left px-2 py-1 font-semibold w-24">Kategoria</th>
                <th className="text-left px-2 py-1 font-semibold w-10">J.m.</th>
                <th className="text-right px-2 py-1 font-semibold w-14">Ilość</th>
                <th className="text-right px-2 py-1 font-semibold w-16">Materiał</th>
                <th className="text-left px-2 py-1 font-semibold w-16">Źródło M</th>
                <th className="text-left px-2 py-1 font-semibold w-20">Mat. trend</th>
                <th className="text-right px-2 py-1 font-semibold w-16">Robocizna</th>
                <th className="text-left px-2 py-1 font-semibold w-20">Źródło ceny</th>
                <th className="text-right px-2 py-1 font-semibold w-14">Razem</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => {
                const catSummary = view.categorySummary.find((c) => c.categoryId === row.categoryId);
                return (
                <tr
                  key={`${row.lp}-${row.description}`}
                  className={`border-t border-border/30 ${row.isUnknown ? "bg-amber-500/5" : ""}`}
                >
                  <td className="px-2 py-1 font-mono text-muted-foreground">{row.lp}</td>
                  <td className="px-2 py-1 leading-snug">
                    {row.description}
                    {row.isUnknown && (
                      <p className="text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-0.5">
                        <AlertTriangle size={9} />
                        Nie przypisano kategorii. Brak ceny.
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1 font-medium">{row.categoryLabel}</td>
                  <td className="px-2 py-1 text-muted-foreground">{row.unit}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{row.quantityDisplay}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {row.isUnknown ? "—" : formatPerUnit(row.materialPlnPerUnit, row.unit)}
                  </td>
                  <td className="px-2 py-1 text-[9px] text-muted-foreground">
                    {row.isUnknown ? "—" : (row.materialSource ?? "—")}
                  </td>
                  <td className="px-2 py-1 text-[9px]">
                    {!row.isUnknown && catSummary?.materialHistory.trend ? (
                      <span className="text-muted-foreground">
                        {catSummary.materialHistory.trend.icon}{" "}
                        {catSummary.materialHistory.trend.labelPl}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {row.isUnknown ? "—" : formatPerUnit(row.laborPlnPerUnit, row.unit)}
                  </td>
                  <td className="px-2 py-1 text-[9px] text-muted-foreground">
                    {row.isUnknown ? (
                      "—"
                    ) : (
                      <span className="font-medium text-foreground">
                        {rowSourceLabel(row.materialSource, row.laborSource)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-medium tabular-nums">
                    {row.isUnknown ? "—" : formatPerUnit(row.lineTotalPln, row.unit)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </TenderDesktopTable>
      </div>

      {canEdit && catalog && costModel && tenderId && (
        <TenderCategoryPriceOverrideModal
          open={editCategory != null}
          onClose={() => setEditCategory(null)}
          tenderId={tenderId}
          category={editCategory}
          catalog={catalog}
          costModel={costModel}
          onSaved={() => onOverridesChanged?.()}
        />
      )}
    </div>
  );
}

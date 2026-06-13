import { useState } from "react";
import { AlertTriangle, ExternalLink, Pencil } from "lucide-react";
import type { CatalogCategoryCostSummaryRow, CatalogLinePricingView } from "@/lib/tender-catalog-line-pricing";
import { CATALOG_LINE_PRICE_SOURCE_OVERRIDE } from "@/lib/tender-catalog-line-pricing";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { WgdomCostCatalog } from "@/lib/wgdom-cost-catalog";
import { TenderCategoryPriceOverrideModal } from "@/app/TenderCategoryPriceOverrideModal";

function formatPerUnit(pln: number | null, unit: string): string {
  if (pln == null || !Number.isFinite(pln)) return "—";
  return `${pln.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł`;
}

function rowSourceLabel(materialSource: string | null, laborSource: string | null): string {
  const hasOverride =
    materialSource === CATALOG_LINE_PRICE_SOURCE_OVERRIDE
    || laborSource === CATALOG_LINE_PRICE_SOURCE_OVERRIDE;
  if (hasOverride) return "Override";
  if (materialSource === "Katalog WGDOM" || laborSource === "Katalog WGDOM") return "Katalog WGDOM";
  return "Baza cen";
}

export function TenderCatalogLinePricingSection({
  view,
  tenderId,
  catalog,
  costModel,
  onOverridesChanged,
  onOpenPriceBase,
  onOpenClassificationDict,
}: {
  view: CatalogLinePricingView;
  tenderId?: string;
  catalog?: WgdomCostCatalog;
  costModel?: TenderCompanyCostModel;
  onOverridesChanged?: () => void;
  onOpenPriceBase?: () => void;
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
            {onOpenPriceBase && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenPriceBase(); }}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Przejdź do Bazy cen
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
            Podsumowanie kategorii (bez UNKNOWN)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] min-w-[360px]">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="text-left px-2 py-1 font-semibold">Kategoria</th>
                  <th className="text-right px-2 py-1 font-semibold">Pozycje</th>
                  <th className="text-right px-2 py-1 font-semibold">Koszt</th>
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
          <p className="px-2.5 py-1 text-[9px] text-muted-foreground border-t border-border/30">
            Koszt direct (materiał + robocizna): {fmtPln(view.classifiedDirectTotalPln)}
            {" · "}{view.classifiedPositionCount} poz. sklasyfikowanych
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-[10px] min-w-[700px]">
            <thead className="bg-secondary/50 sticky top-0 z-[1]">
              <tr>
                <th className="text-left px-2 py-1 font-semibold w-8">Lp.</th>
                <th className="text-left px-2 py-1 font-semibold min-w-[120px]">Opis</th>
                <th className="text-left px-2 py-1 font-semibold w-24">Kategoria</th>
                <th className="text-left px-2 py-1 font-semibold w-10">J.m.</th>
                <th className="text-right px-2 py-1 font-semibold w-14">Ilość</th>
                <th className="text-right px-2 py-1 font-semibold w-16">Materiał</th>
                <th className="text-right px-2 py-1 font-semibold w-16">Robocizna</th>
                <th className="text-left px-2 py-1 font-semibold w-20">Źródło ceny</th>
                <th className="text-right px-2 py-1 font-semibold w-14">Razem</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
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
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {row.isUnknown ? "—" : formatPerUnit(row.laborPlnPerUnit, row.unit)}
                  </td>
                  <td className="px-2 py-1 text-[9px] text-muted-foreground">
                    {row.isUnknown ? (
                      "—"
                    ) : (
                      <span>
                        <span className="block">M: {row.materialSource ?? "—"}</span>
                        <span className="block">R: {row.laborSource ?? "—"}</span>
                        <span className="block font-medium text-foreground mt-0.5">
                          {rowSourceLabel(row.materialSource, row.laborSource)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-medium tabular-nums">
                    {row.isUnknown ? "—" : formatPerUnit(row.lineTotalPln, row.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

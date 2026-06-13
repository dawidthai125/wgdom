import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { CatalogCategoryCostSummaryRow } from "@/lib/tender-catalog-line-pricing";
import {
  findTenderPriceOverride,
  removeTenderPriceOverride,
  upsertTenderPriceOverride,
  loadTenderPriceOverridesStoreLocal,
  saveTenderPriceOverridesStore,
} from "@/lib/tender-price-overrides";
import {
  getCategoryRate,
  type WgdomCostCatalog,
} from "@/lib/wgdom-cost-catalog";

function formatRate(pln: number | null, unit: string): string {
  if (pln == null || !Number.isFinite(pln)) return "—";
  return `${pln.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł/${unit}`;
}

export function TenderCategoryPriceOverrideModal({
  open,
  onClose,
  tenderId,
  category,
  catalog,
  costModel,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tenderId: string;
  category: CatalogCategoryCostSummaryRow | null;
  catalog: WgdomCostCatalog;
  costModel: TenderCompanyCostModel;
  onSaved: () => void;
}) {
  const [materialInput, setMaterialInput] = useState("");
  const [laborInput, setLaborInput] = useState("");
  const [saving, setSaving] = useState(false);

  const globalRates = useMemo(() => {
    if (!category) return { material: null as number | null, labor: null as number | null };
    const rate = getCategoryRate(catalog, category.categoryId, category.dominantUnit);
    if (!rate) return { material: null, labor: null };
    const flHourly = fullyLoadedHourly(costModel);
    const laborNorm = costModel.laborNormIndexPct / 100;
    const materialIndex = costModel.materialPriceIndexPct / 100;
    return {
      material: Math.round(rate.materialPlnPerUnit * materialIndex * 100) / 100,
      labor: Math.round(rate.laborRbhPerUnit * flHourly * laborNorm * 100) / 100,
    };
  }, [category, catalog, costModel]);

  useEffect(() => {
    if (!open || !category) return;
    const store = loadTenderPriceOverridesStoreLocal();
    const tender = store.byTenderId[tenderId];
    const mat = findTenderPriceOverride(
      tender?.overrides ?? [],
      category.categoryId,
      "material",
      category.dominantUnit,
    );
    const lab = findTenderPriceOverride(
      tender?.overrides ?? [],
      category.categoryId,
      "labor",
      category.dominantUnit,
    );
    setMaterialInput(mat != null ? String(mat.overridePlnPerUnit) : "");
    setLaborInput(lab != null ? String(lab.overridePlnPerUnit) : "");
  }, [open, category, tenderId]);

  if (!open || !category) return null;

  const unitLabel = category.dominantUnit;

  const handleSave = async () => {
    setSaving(true);
    try {
      let store = loadTenderPriceOverridesStoreLocal();
      const matVal = materialInput.trim() ? parseFloat(materialInput.replace(",", ".")) : null;
      const labVal = laborInput.trim() ? parseFloat(laborInput.replace(",", ".")) : null;

      if (matVal != null && Number.isFinite(matVal) && matVal >= 0) {
        store = upsertTenderPriceOverride(store, tenderId, {
          categoryId: category.categoryId,
          priceType: "material",
          unit: category.dominantUnit,
          overridePlnPerUnit: matVal,
        });
      } else {
        store = removeTenderPriceOverride(
          store,
          tenderId,
          category.categoryId,
          "material",
          category.dominantUnit,
        );
      }

      if (labVal != null && Number.isFinite(labVal) && labVal >= 0) {
        store = upsertTenderPriceOverride(store, tenderId, {
          categoryId: category.categoryId,
          priceType: "labor",
          unit: category.dominantUnit,
          overridePlnPerUnit: labVal,
        });
      } else {
        store = removeTenderPriceOverride(
          store,
          tenderId,
          category.categoryId,
          "labor",
          category.dominantUnit,
        );
      }

      await saveTenderPriceOverridesStore(store);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = async () => {
    setSaving(true);
    try {
      let store = loadTenderPriceOverridesStoreLocal();
      store = removeTenderPriceOverride(store, tenderId, category.categoryId, "material", category.dominantUnit);
      store = removeTenderPriceOverride(store, tenderId, category.categoryId, "labor", category.dominantUnit);
      await saveTenderPriceOverridesStore(store);
      setMaterialInput("");
      setLaborInput("");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Nadpisanie cen — {category.categoryLabel}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tylko ten przetarg · j.m. {unitLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-[11px]">
          <div className="rounded-lg border border-border/60 p-2.5 space-y-1.5">
            <p className="font-semibold">Materiał</p>
            <p className="text-muted-foreground">
              Globalnie (Baza cen): <strong className="font-mono">{formatRate(globalRates.material, unitLabel)}</strong>
            </p>
            <label className="block">
              <span className="text-muted-foreground">Override ({unitLabel})</span>
              <input
                type="text"
                inputMode="decimal"
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                placeholder="np. 8"
                className="mt-1 w-full rounded border border-border bg-secondary px-2 py-1.5 font-mono text-sm"
              />
            </label>
          </div>

          <div className="rounded-lg border border-border/60 p-2.5 space-y-1.5">
            <p className="font-semibold">Robocizna</p>
            <p className="text-muted-foreground">
              Globalnie (Baza cen): <strong className="font-mono">{formatRate(globalRates.labor, unitLabel)}</strong>
            </p>
            <label className="block">
              <span className="text-muted-foreground">Override ({unitLabel})</span>
              <input
                type="text"
                inputMode="decimal"
                value={laborInput}
                onChange={(e) => setLaborInput(e.target.value)}
                placeholder="np. 21"
                className="mt-1 w-full rounded border border-border bg-secondary px-2 py-1.5 font-mono text-sm"
              />
            </label>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Puste pole = powrót do Bazy cen dla danego składnika. Globalna Baza cen pozostaje bez zmian.
        </p>

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => void handleResetAll()}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary disabled:opacity-50"
          >
            Usuń override
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Zapis…" : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { Library, Loader2, Lock, Save, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import {
  defaultCompanyProfile,
  loadCompanyProfile,
  saveCompanyProfile,
  type TenderCompanyProfile,
} from "@/lib/tenders-bzp-company";
import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import {
  WGDOM_COST_CATEGORY_IDS,
  WGDOM_COST_REGION_LABELS,
  type WgdomCostRegion,
} from "@/lib/wgdom-cost-catalog";
import { COST_FIELD_HINTS, PRICE_BASE_SECTION_ID } from "@/lib/tender-bid-ux";
import {
  CATALOG_UX_PRICING_SETTINGS_TAB_LABEL,
  CATALOG_UX_WORK_CATALOG_TAB_LABEL,
} from "@/lib/tender-catalog-ux-labels";
import { resolveActiveCatalogForTender } from "@/lib/tender-active-catalog";
import { buildPriceBasePreviewRows } from "@/lib/tender-price-base-preview";
import {
  compareLaborRateToBenchmark,
  computeLaborPlnPerUnitFromRbh,
  buildLaborBenchmarkAlerts,
  computeLaborBenchmarkCoverage,
} from "@/lib/labor-benchmark";
import { LaborBenchmarkCell, LaborBenchmarkSourcePanel } from "@/app/LaborBenchmarkUi";
import { LABOR_BENCHMARK_SOURCE_LABEL } from "@/lib/labor-benchmark-data";
import {
  loadWgdomCostCatalogHistory,
  loadWgdomCostCatalogHistoryLocal,
  type WgdomCostCatalogHistoryStore,
} from "@/lib/wgdom-cost-catalog-history";
import { buildMaterialRateHistoryView } from "@/lib/material-history";
import { MaterialHistoryCell } from "@/app/MaterialHistoryUi";
import { saveTendersActiveTab } from "@/lib/tenders-module-nav";

const READ_ONLY_INPUT_CLASS =
  "w-full max-w-[88px] rounded px-1.5 py-1 border border-border/50 font-mono bg-muted/40 text-muted-foreground cursor-not-allowed opacity-90";

function NumInput({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block text-[10px] text-muted-foreground">
      <span className="font-medium text-foreground/90">{label}</span>
      {hint && <span className="block font-normal opacity-80 mt-0.5 leading-snug">{hint}</span>}
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
      />
    </label>
  );
}

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

export function TenderPriceBasePanel({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const tendersCtx = useTendersContextOptional();
  const pricingCatalogRevision = tendersCtx?.pricingCatalogRevision ?? 0;
  const [profile, setProfile] = useState<TenderCompanyProfile>(defaultCompanyProfile());
  const [catalogHistory, setCatalogHistory] = useState<WgdomCostCatalogHistoryStore>(
    loadWgdomCostCatalogHistoryLocal(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadCompanyProfile(),
      loadWgdomCostCatalogHistory(),
    ]).then(([p, history]) => {
      if (!cancelled) {
        setProfile(p);
        setCatalogHistory(history);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const catalogResolution = useMemo(() => {
    void pricingCatalogRevision;
    return resolveActiveCatalogForTender({
      referenceHourlyPln: profile.costModel.avgGrossHourlyPln,
    });
  }, [profile.costModel.avgGrossHourlyPln, pricingCatalogRevision]);

  const catalogRows = useMemo(
    () => buildPriceBasePreviewRows(catalogResolution.catalog),
    [catalogResolution.catalog],
  );
  const activeRegion = catalogResolution.activeRegion;
  const catalogUpdatedAt = catalogResolution.catalog.updatedAt;

  const flHourly = useMemo(
    () => fullyLoadedHourly(profile.costModel),
    [profile.costModel],
  );

  const benchmarkCoverage = useMemo(() => {
    const rows = catalogRows.map((row) => ({
      id: row.id,
      unit: row.unit,
      laborPlnPerUnit: computeLaborPlnPerUnitFromRbh(row.laborRbhPerUnit, profile.costModel),
    }));
    return computeLaborBenchmarkCoverage(rows);
  }, [catalogRows, profile.costModel]);

  const benchmarkAlerts = useMemo(() => {
    const comparisons = catalogRows.map((row) => {
      const laborPln = computeLaborPlnPerUnitFromRbh(row.laborRbhPerUnit, profile.costModel);
      return {
        ...compareLaborRateToBenchmark(laborPln, row.id, row.unit, {
          history: catalogHistory,
          region: activeRegion,
        }),
        categoryLabel: row.labelPl,
      };
    });
    return buildLaborBenchmarkAlerts(comparisons);
  }, [catalogRows, profile.costModel, catalogHistory, activeRegion]);

  const saveCompanyParams = useCallback(async () => {
    setSaving(true);
    try {
      await saveCompanyProfile(profile);
      onSaved?.();
      toast.success("Parametry firmy zapisane w chmurze");
    } catch {
      toast.error("Nie udało się zapisać parametrów firmy");
    } finally {
      setSaving(false);
    }
  }, [profile, onSaved]);

  const goToWorkCatalog = useCallback(() => {
    saveTendersActiveTab("workcatalog");
    tendersCtx?.setActiveTab("workcatalog");
  }, [tendersCtx]);

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-2 py-4">
        <Loader2 size={14} className="animate-spin" /> Ładowanie {CATALOG_UX_PRICING_SETTINGS_TAB_LABEL.toLowerCase()}…
      </p>
    );
  }

  return (
    <div id={PRICE_BASE_SECTION_ID} className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Tags size={14} className="text-primary" />
          {CATALOG_UX_PRICING_SETTINGS_TAB_LABEL} — podgląd stawek i parametry firmy
        </p>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Stawki kategorii są tylko do odczytu — edycja w {CATALOG_UX_WORK_CATALOG_TAB_LABEL}.
          Parametry firmy (RBH, marża, narzuty) edytujesz tutaj. Kolumna Benchmark to orientacyjny zakres robocizny
          ({LABOR_BENCHMARK_SOURCE_LABEL}) — nie zmienia wyceny.
        </p>
        <button
          type="button"
          onClick={goToWorkCatalog}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-600/90 min-h-[40px]"
        >
          <Library size={14} />
          Przejdź do {CATALOG_UX_WORK_CATALOG_TAB_LABEL}
        </button>
      </div>

      <LaborBenchmarkSourcePanel
        region={activeRegion}
        coverageLabel={benchmarkCoverage.labelPl}
      />

      {benchmarkAlerts.outOfRangeCount > 0 && (
        <details className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-2 text-[10px]">
          <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-200">
            ⚠ {benchmarkAlerts.outOfRangeCount} {benchmarkAlerts.outOfRangeCount === 1 ? "kategoria" : "kategorie"} poza benchmarkiem robocizny
          </summary>
          <ul className="mt-1.5 space-y-1 list-none">
            {benchmarkAlerts.items.map((item) => (
              <li key={item.categoryLabel} className="text-muted-foreground">
                <strong className="text-foreground">{item.categoryLabel}</strong>
                {" — "}{item.statusLabelPl}
                {" · nasza "}{item.ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł
                {" · rynek "}{item.rangeLabelPl}
              </li>
            ))}
          </ul>
        </details>
      )}

      <label className="block text-[10px] text-muted-foreground max-w-xs">
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          <Lock size={11} aria-hidden />
          Region aktywny (tylko odczyt)
        </span>
        <select
          value={activeRegion}
          disabled
          aria-readonly="true"
          className="mt-0.5 w-full bg-muted/40 text-muted-foreground rounded-lg px-2 py-1.5 text-xs border border-border/50 cursor-not-allowed"
        >
          {(Object.keys(WGDOM_COST_REGION_LABELS) as WgdomCostRegion[]).map((r) => (
            <option key={r} value={r}>{WGDOM_COST_REGION_LABELS[r]}</option>
          ))}
        </select>
      </label>

      <section className="rounded-lg border border-border/70 bg-secondary/10 overflow-hidden opacity-[0.98]">
        <div className="px-2.5 py-2 border-b border-border/50 bg-secondary/25">
          <h3 className="text-[11px] font-semibold inline-flex items-center gap-1.5 text-muted-foreground">
            <Lock size={12} aria-hidden />
            Robocizna — tylko odczyt
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Norma rbh/j.m. × koszt rbh ({flHourly.toFixed(2)} zł/h z parametrami firmy) = stawka robocizny.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] min-w-[480px]">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold">Kategoria</th>
                <th className="text-left px-2 py-1.5 font-semibold">j.m.</th>
                <th className="text-left px-2 py-1.5 font-semibold">rbh/j.m.</th>
                <th className="text-right px-2 py-1.5 font-semibold">Robocizna zł/j.m.</th>
                <th className="text-left px-2 py-1.5 font-semibold min-w-[120px]">Benchmark</th>
                <th className="text-right px-2 py-1.5 font-semibold">Aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {catalogRows.map((row) => {
                const laborPln = computeLaborPlnPerUnitFromRbh(row.laborRbhPerUnit, profile.costModel);
                const benchmark = compareLaborRateToBenchmark(laborPln, row.id, row.unit, {
                  history: catalogHistory,
                  region: activeRegion,
                });
                return (
                  <tr key={`labor-${row.id}`} className="border-t border-border/40">
                    <td className="px-2 py-1.5 font-medium text-muted-foreground">{row.labelPl}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.unit}</td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.laborRbhPerUnit}
                        readOnly
                        tabIndex={-1}
                        aria-readonly="true"
                        className={READ_ONLY_INPUT_CLASS}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums text-muted-foreground">
                      {laborPln.toLocaleString("pl-PL")} zł
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <LaborBenchmarkCell comparison={benchmark} showTripleView />
                    </td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatUpdatedAt(catalogUpdatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border/70 bg-secondary/10 overflow-hidden opacity-[0.98]">
        <div className="px-2.5 py-2 border-b border-border/50 bg-secondary/25">
          <h3 className="text-[11px] font-semibold inline-flex items-center gap-1.5 text-muted-foreground">
            <Lock size={12} aria-hidden />
            Materiały — tylko odczyt
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Stawka materiału na jednostkę miary (zł/j.m.) — historia i trend z historii stawek firmy (90 dni).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] min-w-[520px]">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold">Kategoria</th>
                <th className="text-left px-2 py-1.5 font-semibold">j.m.</th>
                <th className="text-left px-2 py-1.5 font-semibold">Materiał zł/j.m.</th>
                <th className="text-left px-2 py-1.5 font-semibold min-w-[140px]">Historia / trend</th>
                <th className="text-right px-2 py-1.5 font-semibold">Aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {catalogRows.map((row) => {
                const materialHistory = buildMaterialRateHistoryView(
                  row.materialPlnPerUnit,
                  row.id,
                  row.unit,
                  catalogHistory,
                  activeRegion,
                );
                return (
                <tr key={`mat-${row.id}`} className="border-t border-border/40">
                  <td className="px-2 py-1.5 font-medium text-muted-foreground">{row.labelPl}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{row.unit}</td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.materialPlnPerUnit}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className={READ_ONLY_INPUT_CLASS}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <MaterialHistoryCell view={materialHistory} />
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                    {formatUpdatedAt(catalogUpdatedAt)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-2 py-1.5 text-[10px] text-muted-foreground border-t border-border/40">
          {WGDOM_COST_CATEGORY_IDS.length} kategorii · region {WGDOM_COST_REGION_LABELS[activeRegion]}
        </p>
      </section>

      <section className="rounded-lg border border-border/70 bg-secondary/15 overflow-hidden">
        <div className="px-2.5 py-2 border-b border-border/50 bg-secondary/30">
          <h3 className="text-[11px] font-semibold">Parametry firmy</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Wpływają na koszt rbh, marżę i indeksy stawek w kalkulatorze oferty.
          </p>
        </div>
        <div className="px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <NumInput
            label="Koszt roboczogodziny (brutto zł/rbh)"
            hint={COST_FIELD_HINTS.avgGrossHourlyPln}
            value={profile.costModel.avgGrossHourlyPln}
            onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, avgGrossHourlyPln: v } })}
          />
          <NumInput
            label="Marża / zysk (%)"
            hint={COST_FIELD_HINTS.profitPct}
            value={profile.costModel.profitPct}
            onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, profitPct: v } })}
          />
          <NumInput
            label="Koszty pośrednie Kp (%)"
            hint={COST_FIELD_HINTS.kpPct}
            value={profile.costModel.kpPct}
            onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, kpPct: v } })}
          />
          <NumInput
            label="Indeks materiałów (%)"
            hint={COST_FIELD_HINTS.materialPriceIndexPct}
            value={profile.costModel.materialPriceIndexPct}
            onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, materialPriceIndexPct: v } })}
          />
          <NumInput
            label="Indeks robocizny (%)"
            hint={COST_FIELD_HINTS.laborNormIndexPct}
            value={profile.costModel.laborNormIndexPct}
            onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, laborNormIndexPct: v } })}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveCompanyParams()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[40px]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Zapisz parametry firmy
        </button>
      </div>
    </div>
  );
}

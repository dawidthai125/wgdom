import { Loader2, RefreshCw, Save, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  defaultCompanyProfile,
  loadCompanyProfile,
  saveCompanyProfile,
  type TenderCompanyProfile,
} from "@/lib/tenders-bzp-company";
import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import {
  type WgdomCostCatalogStore,
  type WgdomCostRegion,
  listEditableCategories,
  loadWgdomCostCatalogStore,
  restoreDefaultWgdomCostCatalogStore,
  saveWgdomCostCatalogStore,
  setActiveCatalogRegion,
  updateCategoryPrimaryRates,
  getActiveCatalog,
  WGDOM_COST_REGION_LABELS,
} from "@/lib/wgdom-cost-catalog-store";
import { WGDOM_COST_CATEGORY_IDS } from "@/lib/wgdom-cost-catalog";
import { COST_FIELD_HINTS, PRICE_BASE_SECTION_ID } from "@/lib/tender-bid-ux";

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
  const [profile, setProfile] = useState<TenderCompanyProfile>(defaultCompanyProfile());
  const [catalogStore, setCatalogStore] = useState<WgdomCostCatalogStore>(restoreDefaultWgdomCostCatalogStore());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadCompanyProfile(), loadWgdomCostCatalogStore()]).then(([p, catalog]) => {
      if (!cancelled) {
        setProfile(p);
        setCatalogStore(catalog);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const catalogRows = listEditableCategories(catalogStore);
  const activeCatalog = getActiveCatalog(catalogStore);
  const catalogUpdatedAt = activeCatalog.updatedAt ?? catalogStore.updatedAt;
  const flHourly = useMemo(
    () => fullyLoadedHourly(profile.costModel),
    [profile.costModel],
  );
  const laborNormFactor = profile.costModel.laborNormIndexPct / 100;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveCompanyProfile(profile),
        saveWgdomCostCatalogStore(catalogStore),
      ]);
      onSaved?.();
      toast.success("Baza cen zapisana w chmurze");
    } catch {
      toast.error("Nie udało się zapisać bazy cen");
    } finally {
      setSaving(false);
    }
  }, [profile, catalogStore, onSaved]);

  const reloadCatalogDefaults = useCallback(() => {
    setCatalogStore(restoreDefaultWgdomCostCatalogStore());
    toast.message("Przywrócono domyślny katalog WGDOM — kliknij Zapisz");
  }, []);

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-2 py-4">
        <Loader2 size={14} className="animate-spin" /> Ładowanie bazy cen…
      </p>
    );
  }

  return (
    <div id={PRICE_BASE_SECTION_ID} className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Tags size={14} className="text-primary" />
          Baza cen — stawki Twojej firmy
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
          Własne stawki robocizny i materiałów używane przy wycenie przetargów (katalog WGDOM + parametry firmy).
          To nie są ceny rynkowe ani benchmarki zewnętrzne.
        </p>
      </div>

      <label className="block text-[10px] text-muted-foreground max-w-xs">
        Region aktywny
        <select
          value={catalogStore.activeRegion}
          onChange={(e) => setCatalogStore(setActiveCatalogRegion(catalogStore, e.target.value as WgdomCostRegion))}
          className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
        >
          {(Object.keys(WGDOM_COST_REGION_LABELS) as WgdomCostRegion[]).map((r) => (
            <option key={r} value={r}>{WGDOM_COST_REGION_LABELS[r]}</option>
          ))}
        </select>
      </label>

      <section className="rounded-lg border border-border/70 bg-secondary/15 overflow-hidden">
        <div className="px-2.5 py-2 border-b border-border/50 bg-secondary/30">
          <h3 className="text-[11px] font-semibold">Robocizna</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Norma rbh/j.m. × koszt rbh ({flHourly.toFixed(2)} zł/h z parametrami firmy) = stawka robocizny.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] min-w-[480px]">
            <thead className="bg-secondary/60">
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold">Kategoria</th>
                <th className="text-left px-2 py-1.5 font-semibold">j.m.</th>
                <th className="text-left px-2 py-1.5 font-semibold">rbh/j.m.</th>
                <th className="text-right px-2 py-1.5 font-semibold">Robocizna zł/j.m.</th>
                <th className="text-right px-2 py-1.5 font-semibold">Aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {catalogRows.map((row) => {
                const laborPln = Math.round(row.laborRbhPerUnit * flHourly * laborNormFactor * 100) / 100;
                return (
                  <tr key={`labor-${row.id}`} className="border-t border-border/40">
                    <td className="px-2 py-1.5 font-medium">{row.labelPl}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.unit}</td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.laborRbhPerUnit}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setCatalogStore(updateCategoryPrimaryRates(
                            catalogStore,
                            row.id,
                            row.materialPlnPerUnit,
                            v,
                          ));
                        }}
                        className="w-full max-w-[88px] bg-secondary rounded px-1.5 py-1 border border-border font-mono"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums">
                      {laborPln.toLocaleString("pl-PL")} zł
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

      <section className="rounded-lg border border-border/70 bg-secondary/15 overflow-hidden">
        <div className="px-2.5 py-2 border-b border-border/50 bg-secondary/30">
          <h3 className="text-[11px] font-semibold">Materiały</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Stawka materiału na jednostkę miary (zł/j.m.) per kategoria robót.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] min-w-[420px]">
            <thead className="bg-secondary/60">
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold">Kategoria</th>
                <th className="text-left px-2 py-1.5 font-semibold">j.m.</th>
                <th className="text-left px-2 py-1.5 font-semibold">Materiał zł/j.m.</th>
                <th className="text-right px-2 py-1.5 font-semibold">Aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {catalogRows.map((row) => (
                <tr key={`mat-${row.id}`} className="border-t border-border/40">
                  <td className="px-2 py-1.5 font-medium">{row.labelPl}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{row.unit}</td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.materialPlnPerUnit}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setCatalogStore(updateCategoryPrimaryRates(
                          catalogStore,
                          row.id,
                          v,
                          row.laborRbhPerUnit,
                        ));
                      }}
                      className="w-full max-w-[88px] bg-secondary rounded px-1.5 py-1 border border-border font-mono"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                    {formatUpdatedAt(catalogUpdatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-2 py-1.5 text-[10px] text-muted-foreground border-t border-border/40">
          {WGDOM_COST_CATEGORY_IDS.length} kategorii · region {WGDOM_COST_REGION_LABELS[catalogStore.activeRegion]}
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[40px]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Zapisz bazę cen
        </button>
        <button
          type="button"
          onClick={reloadCatalogDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 min-h-[40px]"
        >
          <RefreshCw size={14} />
          Przywróć domyślny katalog
        </button>
      </div>
    </div>
  );
}

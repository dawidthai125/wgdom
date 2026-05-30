import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronDown, Loader2, Plus, RefreshCw, Save, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  type TenderCompanyProfile,
  type TenderCompanyReference,
  defaultCompanyProfile,
  loadCompanyProfile,
  saveCompanyProfile,
} from "@/lib/tenders-bzp-company";

function NumInput({
  label,
  value,
  onChange,
  step = 1000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block text-[10px] text-muted-foreground">
      {label}
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

function LinesInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const text = value.join("\n");
  return (
    <label className="block text-[10px] text-muted-foreground col-span-full">
      {label}
      {hint && <span className="block font-normal opacity-80">{hint}</span>}
      <textarea
        rows={3}
        value={text}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border font-mono"
      />
    </label>
  );
}

function RefEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: TenderCompanyReference[];
  onChange: (items: TenderCompanyReference[]) => void;
}) {
  const update = (idx: number, patch: Partial<TenderCompanyReference>) => {
    onChange(items.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { client: "", scope: "", year: "", valuePln: null, source: "" }]);

  return (
    <div className="col-span-full rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <button type="button" onClick={add} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Dodaj
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-[10px] text-muted-foreground">Brak wpisów — kliknij Dodaj.</p>
      )}
      {items.map((r, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-lg bg-background/50 border border-border/40">
          <input
            placeholder="Klient / zamawiający"
            value={r.client}
            onChange={(e) => update(i, { client: e.target.value })}
            className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
          />
          <input
            placeholder="Rok"
            value={r.year ?? ""}
            onChange={(e) => update(i, { year: e.target.value })}
            className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
          />
          <input
            placeholder="Wartość PLN"
            type="number"
            min={0}
            value={r.valuePln ?? ""}
            onChange={(e) => update(i, { valuePln: e.target.value ? Number(e.target.value) : null })}
            className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
          />
          <input
            placeholder="Źródło (BZP, wgdom.pl…)"
            value={r.source ?? ""}
            onChange={(e) => update(i, { source: e.target.value })}
            className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
          />
          <textarea
            placeholder="Zakres robót"
            rows={2}
            value={r.scope}
            onChange={(e) => update(i, { scope: e.target.value })}
            className="sm:col-span-2 bg-secondary rounded px-2 py-1 text-[10px] border border-border"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="sm:col-span-2 text-[10px] text-red-600 flex items-center gap-1 justify-end hover:underline"
          >
            <Trash2 size={10} /> Usuń wpis
          </button>
        </div>
      ))}
    </div>
  );
}

export function TenderCompanyProfilePanel({
  onSaved,
}: {
  onSaved?: (profile: TenderCompanyProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<TenderCompanyProfile>(defaultCompanyProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadCompanyProfile().then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await saveCompanyProfile(profile);
      onSaved?.(profile);
      toast.success("Profil firmy zapisany w chmurze");
    } catch {
      toast.error("Nie udało się zapisać profilu");
    } finally {
      setSaving(false);
    }
  }, [profile, onSaved]);

  const reloadDefaults = useCallback(() => {
    const d = defaultCompanyProfile();
    setProfile(d);
    toast.message("Załadowano domyślny profil W&G DOM (CEIDG/wgdom.pl) — kliknij Zapisz");
  }, []);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
      >
        <span className="flex items-center gap-1.5">
          <Building2 size={13} className="text-primary" />
          Profil firmy — W&G DOM · dopasowanie przetargów
          {profile.nip && (
            <span className="text-[10px] font-normal text-muted-foreground">NIP {profile.nip}</span>
          )}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3 border-t border-border bg-card/50">
          {loading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Ładowanie…
            </p>
          ) : (
            <>
              <div className="rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-2 text-[10px] text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">{profile.companyName}</strong>
                  {" · "}{profile.ownerName}
                  {" · marka od "}{profile.brandSinceYear}
                  {" · VAT od "}{profile.vatRegisteredSince}
                </p>
                <p>{profile.address} · {profile.phone} · {profile.email}</p>
                <p className="italic">{profile.formerOwnerNote}</p>
              </div>

              <RefEditor
                title="Referencje (wgdom.pl)"
                items={profile.references}
                onChange={(references) => setProfile({ ...profile, references })}
              />
              <RefEditor
                title="Wygrane przetargi BZP"
                items={profile.tenderWins}
                onChange={(tenderWins) => setProfile({ ...profile, tenderWins })}
              />
              <RefEditor
                title="Udział w przetargach"
                items={profile.tenderParticipations}
                onChange={(tenderParticipations) => setProfile({ ...profile, tenderParticipations })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <label className="block text-[10px] text-muted-foreground">
                  NIP
                  <input
                    value={profile.nip}
                    onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border font-mono"
                  />
                </label>
                <label className="block text-[10px] text-muted-foreground">
                  REGON
                  <input
                    value={profile.regon}
                    onChange={(e) => setProfile({ ...profile, regon: e.target.value })}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border font-mono"
                  />
                </label>
                <label className="block text-[10px] text-muted-foreground sm:col-span-2">
                  Właścicielka / firma CEIDG
                  <input
                    value={profile.ownerName}
                    onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                  />
                </label>
                <LinesInput
                  label="Regiony / miasta działania"
                  value={profile.regions}
                  onChange={(regions) => setProfile({ ...profile, regions })}
                />
                <NumInput label="Min. wartość zamówienia (PLN)" value={profile.minOrderValuePln} onChange={(v) => setProfile({ ...profile, minOrderValuePln: v })} />
                <NumInput label="Max. wartość zamówienia (PLN)" value={profile.maxOrderValuePln} onChange={(v) => setProfile({ ...profile, maxOrderValuePln: v })} step={10000} />
                <NumInput label="Max. wadium (PLN)" value={profile.maxWadiumPln} onChange={(v) => setProfile({ ...profile, maxWadiumPln: v })} />
                <NumInput label="Największa referencja (PLN)" value={profile.referenceExperiencePln} onChange={(v) => setProfile({ ...profile, referenceExperiencePln: v })} step={10000} />
                <NumInput label="Łączna wartość referencji (PLN)" value={profile.totalReferencesPln} onChange={(v) => setProfile({ ...profile, totalReferencesPln: v })} step={10000} />
                <NumInput label="Liczba referencji" value={profile.referenceCount} onChange={(v) => setProfile({ ...profile, referenceCount: v })} step={1} />
                <NumInput label="Min. dni na realizację" value={profile.minProjectDays} onChange={(v) => setProfile({ ...profile, minProjectDays: v })} step={1} />
                <NumInput label="Max. równoległych robót" value={profile.maxConcurrentProjects} onChange={(v) => setProfile({ ...profile, maxConcurrentProjects: v })} step={1} />
                <p className="col-span-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1 border-t border-border">
                  Model kosztów ofertowych
                </p>
                <NumInput label="Etaty / załoga" value={profile.costModel.headcount} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, headcount: v } })} step={1} />
                <NumInput label="Osób na budowach" value={profile.costModel.activeWorkersOnSite} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, activeWorkersOnSite: v } })} step={1} />
                <NumInput label="Stawka brutto rbh (zł)" value={profile.costModel.avgGrossHourlyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, avgGrossHourlyPln: v } })} step={1} />
                <NumInput label="Obciążenie pracodawcy (%)" value={profile.costModel.employerBurdenPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, employerBurdenPct: v } })} step={1} />
                <NumInput label="Stałe miesięczne (zł)" value={profile.costModel.fixedOverheadMonthlyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, fixedOverheadMonthlyPln: v } })} step={1000} />
                <NumInput label="Indeks materiałów (%)" value={profile.costModel.materialPriceIndexPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, materialPriceIndexPct: v } })} step={1} />
                <NumInput label="Indeks robocizny (%)" value={profile.costModel.laborNormIndexPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, laborNormIndexPct: v } })} step={1} />
                <NumInput label="Kp (%)" value={profile.costModel.kpPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, kpPct: v } })} step={1} />
                <NumInput label="Zysk (%)" value={profile.costModel.profitPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, profitPct: v } })} step={1} />
                <NumInput label="Rezerwa ryzyka (%)" value={profile.costModel.riskReservePct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, riskReservePct: v } })} step={1} />
                <NumInput label="Min. marża (%)" value={profile.costModel.minMarginPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, minMarginPct: v } })} step={1} />
                <NumInput label="Rabat vs ref. przy 100% ceny (%)" value={profile.costModel.targetPriceDiscountPct} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, targetPriceDiscountPct: v } })} step={0.5} />
                <p className="col-span-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1 border-t border-border">
                  Koszty poboczne tygodniowe (bez materiałów)
                </p>
                <NumInput label="Auta służbowe" value={profile.costModel.vehicleCount} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, vehicleCount: v } })} step={1} />
                <NumInput label="Paliwo / auto / tydz. (zł)" value={profile.costModel.fuelPerVehicleWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, fuelPerVehicleWeeklyPln: v } })} step={10} />
                <NumInput label="Serwis aut / tydz. (zł)" value={profile.costModel.vehicleMaintenanceWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, vehicleMaintenanceWeeklyPln: v } })} step={10} />
                <NumInput label="Narzędzia / tydz. (zł)" value={profile.costModel.toolWearWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, toolWearWeeklyPln: v } })} step={10} />
                <NumInput label="BHP / os. / tydz. (zł)" value={profile.costModel.bhpPerWorkerWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, bhpPerWorkerWeeklyPln: v } })} step={5} />
                <NumInput label="Parkingi / drogi / tydz." value={profile.costModel.parkingTollsWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, parkingTollsWeeklyPln: v } })} step={10} />
                <NumInput label="Telefony / tydz." value={profile.costModel.commsWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, commsWeeklyPln: v } })} step={10} />
                <NumInput label="Gruz / kontenery / tydz." value={profile.costModel.wasteDisposalWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, wasteDisposalWeeklyPln: v } })} step={10} />
                <NumInput label="Chemia pomocnicza / tydz." value={profile.costModel.smallConsumablesWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, smallConsumablesWeeklyPln: v } })} step={10} />
                <NumInput label="Ubezpieczenia / tydz." value={profile.costModel.insuranceWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, insuranceWeeklyPln: v } })} step={10} />
                <NumInput label="Koordynacja / dojazdy / tydz." value={profile.costModel.supervisionWeeklyPln} onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, supervisionWeeklyPln: v } })} step={10} />
                <NumInput label="Polisa OC (PLN)" value={profile.ocInsuranceMinPln} onChange={(v) => setProfile({ ...profile, ocInsuranceMinPln: v })} step={100000} />
                <LinesInput
                  label="Prefiksy CPV"
                  value={profile.preferredCpvPrefixes}
                  onChange={(preferredCpvPrefixes) => setProfile({ ...profile, preferredCpvPrefixes })}
                />
                <LinesInput
                  label="Licencje / uprawnienia"
                  value={profile.licenses}
                  onChange={(licenses) => setProfile({ ...profile, licenses })}
                />
                <LinesInput
                  label="Mocne strony / specjalizacja"
                  value={profile.strengths}
                  onChange={(strengths) => setProfile({ ...profile, strengths })}
                />
                <label className="block text-[10px] text-muted-foreground col-span-full">
                  Historia / notatki (np. ciągłość marki, wykluczenia)
                  <textarea
                    rows={3}
                    value={`${profile.formerOwnerNote}\n\n${profile.notes}`.trim()}
                    onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={reloadDefaults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80"
                >
                  <RefreshCw size={12} />
                  Przywróć dane W&G DOM
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Zapisz profil
                </button>
              </div>
              {profile.tenderWins.length > 0 && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Trophy size={11} className="text-amber-500" />
                  Ostatnia wygrana BZP: {profile.tenderWins[0].client} ({profile.tenderWins[0].valuePln?.toLocaleString("pl-PL")} zł)
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

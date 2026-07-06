import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Building2, ChevronDown, Loader2, Plus, RefreshCw, Save, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  type TenderCompanyProfile,
  type TenderCompanyReference,
  defaultCompanyProfile,
  loadCompanyProfile,
  saveCompanyProfile,
} from "@/lib/tenders-bzp-company";
import {
  type WgdomUserClassificationDictionaryStore,
  type UserClassificationCategory,
  loadWgdomUserClassificationDictionaryStore,
  saveWgdomUserClassificationDictionaryStore,
  restoreDefaultUserClassificationDictionaryStore,
  updateUserClassificationEntry,
  removeUserClassificationEntry,
} from "@/lib/wgdom-user-classification-dictionary";
import {
  COST_FIELD_HINTS,
  PROFILE_SECTION_IDS,
  PROFILE_SECTION_TITLES,
} from "@/lib/tender-bid-ux";
import {
  CATALOG_UX_PRICING_SETTINGS_TAB_LABEL,
  CATALOG_UX_WORK_CATALOG_TAB_LABEL,
} from "@/lib/tender-catalog-ux-labels";
import {
  buildCalibrationSummary,
  buildCatalogCalibrationHints,
  formatCalibrationDeltaPct,
  loadTenderCalibrationStore,
  type TenderCalibrationStore,
} from "@/lib/tender-cost-calibration";

function NumInput({
  label,
  value,
  onChange,
  step = 1000,
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

function ProfileSection({
  id,
  title,
  emoji,
  description,
  children,
}: {
  id: string;
  title: string;
  emoji: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-lg border border-border/70 bg-secondary/15 overflow-hidden">
      <div className="px-2.5 py-2 border-b border-border/50 bg-secondary/30">
        <h3 className="text-[11px] font-semibold text-foreground">
          {emoji} {title}
        </h3>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="px-2.5 py-2.5 space-y-2">{children}</div>
    </section>
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
  const [classificationDict, setClassificationDict] = useState<WgdomUserClassificationDictionaryStore>(
    restoreDefaultUserClassificationDictionaryStore(),
  );
  const [calibrationStore, setCalibrationStore] = useState<TenderCalibrationStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadCompanyProfile(),
      loadWgdomUserClassificationDictionaryStore(),
      loadTenderCalibrationStore(),
    ]).then(([p, dict, calibration]) => {
      if (!cancelled) {
        setProfile(p);
        setClassificationDict(dict);
        setCalibrationStore(calibration);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveCompanyProfile(profile),
        saveWgdomUserClassificationDictionaryStore(classificationDict),
      ]);
      onSaved?.(profile);
      toast.success("Profil firmy i słownik klasyfikacji zapisane w chmurze");
    } catch {
      toast.error("Nie udało się zapisać profilu / słownika");
    } finally {
      setSaving(false);
    }
  }, [profile, classificationDict, onSaved]);

  const reloadDefaults = useCallback(() => {
    const d = defaultCompanyProfile();
    setProfile(d);
    toast.message("Załadowano domyślny profil W&G DOM (CEIDG/wgdom.pl) — kliknij Zapisz");
  }, []);

  const reloadClassificationDictDefaults = useCallback(() => {
    setClassificationDict(restoreDefaultUserClassificationDictionaryStore());
    toast.message("Przywrócono pusty słownik klasyfikacji — kliknij Zapisz profil");
  }, []);

  const calibrationSummary = calibrationStore ? buildCalibrationSummary(calibrationStore) : null;
  const calibrationHints = calibrationStore ? buildCatalogCalibrationHints(calibrationStore) : [];

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

              <div className="rounded-lg bg-violet-500/8 border border-violet-500/20 px-2.5 py-2 text-[10px] text-muted-foreground">
                <p>
                  <strong className="text-foreground">Stawki robocizny i materiałów</strong>
                  {" "}— edytuj w zakładce{" "}
                  <strong className="text-violet-800 dark:text-violet-300">
                    Przetargi → {CATALOG_UX_WORK_CATALOG_TAB_LABEL}
                  </strong>
                  . Parametry wyceny (RBH, marża, narzuty) — w{" "}
                  <strong className="text-violet-800 dark:text-violet-300">
                    Przetargi → {CATALOG_UX_PRICING_SETTINGS_TAB_LABEL}
                  </strong>
                  .
                </p>
              </div>

              <ProfileSection
                id={PROFILE_SECTION_IDS.costIntelligence}
                emoji="⚙️"
                title="Parametry operacyjne wyceny"
                description={`Załoga, ZUS, koszty poboczne i rezerwy — uzupełnienie ${CATALOG_UX_PRICING_SETTINGS_TAB_LABEL.toLowerCase()} (bez stawek kategorii).`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <NumInput
                    label="Etaty / załoga"
                    value={profile.costModel.headcount}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, headcount: v } })}
                    step={1}
                  />
                  <NumInput
                    label="Osób na budowach"
                    value={profile.costModel.activeWorkersOnSite}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, activeWorkersOnSite: v } })}
                    step={1}
                  />
                  <NumInput
                    label="ZUS / obciążenie pracodawcy (%)"
                    hint={COST_FIELD_HINTS.employerBurdenPct}
                    value={profile.costModel.employerBurdenPct}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, employerBurdenPct: v } })}
                    step={1}
                  />
                  <NumInput
                    label="Ryzyko / rezerwa (%)"
                    hint={COST_FIELD_HINTS.riskReservePct}
                    value={profile.costModel.riskReservePct}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, riskReservePct: v } })}
                    step={1}
                  />
                  <NumInput
                    label="Min. marża (%)"
                    hint={COST_FIELD_HINTS.minMarginPct}
                    value={profile.costModel.minMarginPct}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, minMarginPct: v } })}
                    step={1}
                  />
                  <NumInput
                    label="Stałe miesięczne firmy (zł)"
                    hint={COST_FIELD_HINTS.fixedOverheadMonthlyPln}
                    value={profile.costModel.fixedOverheadMonthlyPln}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, fixedOverheadMonthlyPln: v } })}
                    step={1000}
                  />
                  <NumInput
                    label="Rabat vs ref. przy 100% ceny (%)"
                    hint={COST_FIELD_HINTS.targetPriceDiscountPct}
                    value={profile.costModel.targetPriceDiscountPct}
                    onChange={(v) => setProfile({ ...profile, costModel: { ...profile.costModel, targetPriceDiscountPct: v } })}
                    step={0.5}
                  />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1 border-t border-border/50">
                  Koszty poboczne tygodniowe (bez materiałów)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                </div>
              </ProfileSection>

              <ProfileSection
                id={PROFILE_SECTION_IDS.qualification}
                emoji="📋"
                title={PROFILE_SECTION_TITLES.qualification}
                description="Doświadczenie, referencje i uprawnienia — wpływają na kwalifikację ofertową (P2-F), nie na algorytm wyceny."
              >
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
                  <NumInput label="Największa referencja (PLN)" value={profile.referenceExperiencePln} onChange={(v) => setProfile({ ...profile, referenceExperiencePln: v })} step={10000} />
                  <NumInput label="Łączna wartość referencji (PLN)" value={profile.totalReferencesPln} onChange={(v) => setProfile({ ...profile, totalReferencesPln: v })} step={10000} />
                  <NumInput label="Liczba referencji" value={profile.referenceCount} onChange={(v) => setProfile({ ...profile, referenceCount: v })} step={1} />
                  <NumInput label="Polisa OC (PLN)" value={profile.ocInsuranceMinPln} onChange={(v) => setProfile({ ...profile, ocInsuranceMinPln: v })} step={100000} />
                  <LinesInput
                    label="Licencje / uprawnienia (PIIB, ISO…)"
                    hint="Używane przy dopasowaniu wymagań formalnych SWZ."
                    value={profile.licenses}
                    onChange={(licenses) => setProfile({ ...profile, licenses })}
                  />
                  <LinesInput
                    label="Mocne strony / specjalizacja"
                    value={profile.strengths}
                    onChange={(strengths) => setProfile({ ...profile, strengths })}
                  />
                </div>
              </ProfileSection>

              <ProfileSection
                id={PROFILE_SECTION_IDS.regions}
                emoji="📍"
                title={PROFILE_SECTION_TITLES.regions}
                description="Regiony działania — wpływają na dopasowanie przetargów i mnożnik katalogu (Wrocław / Dolny Śląsk)."
              >
                <LinesInput
                  label="Regiony / miasta działania"
                  hint="Np. Wrocław, Dolny Śląsk, okolice."
                  value={profile.regions}
                  onChange={(regions) => setProfile({ ...profile, regions })}
                />
              </ProfileSection>

              <ProfileSection
                id={PROFILE_SECTION_IDS.classificationDictionary}
                emoji="🧠"
                title={PROFILE_SECTION_TITLES.classificationDictionary}
                description="Frazy przypisane ręcznie z pozycji UNKNOWN — system uczy się z przetargów WGDOM (sync chmura)."
              >
                {classificationDict.entries.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Brak wpisów — przypisz kategorię przy pozycji UNKNOWN w inspektorze wyceny.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-semibold">Fraza</th>
                          <th className="text-left px-2 py-1.5 font-semibold w-28">Kategoria</th>
                          <th className="text-left px-2 py-1.5 font-semibold w-20">Źródło</th>
                          <th className="text-right px-2 py-1.5 font-semibold w-16">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classificationDict.entries.map((entry) => (
                          <tr key={entry.id} className="border-t border-border/40">
                            <td className="px-2 py-1">
                              <input
                                value={entry.phrase}
                                onChange={(e) => setClassificationDict(
                                  updateUserClassificationEntry(classificationDict, entry.id, { phrase: e.target.value }),
                                )}
                                className="w-full bg-secondary rounded px-1.5 py-1 border border-border font-mono"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={entry.category}
                                onChange={(e) => setClassificationDict(
                                  updateUserClassificationEntry(classificationDict, entry.id, {
                                    category: e.target.value as UserClassificationCategory,
                                  }),
                                )}
                                className="w-full bg-secondary rounded px-1.5 py-1 border border-border"
                              >
                                {WGDOM_COST_CATEGORY_IDS.map((id) => (
                                  <option key={id} value={id}>{id}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1 text-muted-foreground">{entry.source}</td>
                            <td className="px-2 py-1 text-right">
                              <button
                                type="button"
                                onClick={() => setClassificationDict(
                                  removeUserClassificationEntry(classificationDict, entry.id),
                                )}
                                className="text-red-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                <Trash2 size={10} /> Usuń
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  type="button"
                  onClick={reloadClassificationDictDefaults}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-[10px] font-medium hover:bg-secondary/80"
                >
                  <RefreshCw size={11} />
                  Przywróć domyślne (pusty słownik)
                </button>
              </ProfileSection>

              <ProfileSection
                id={PROFILE_SECTION_IDS.calibration}
                emoji="🎯"
                title={PROFILE_SECTION_TITLES.calibration}
                description="Uczenie z realnych ofert W&G — porównanie rekomendacji WGDOM, oferty złożonej i wyniku postępowania (tylko odczyt)."
              >
                {!calibrationSummary || calibrationSummary.withSubmitted === 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Brak danych — zapisz „Ofertę złożoną” przy przetargu ze statusem Złożona / Wygrany / Przegrany.
                  </p>
                ) : (
                  <div className="space-y-2 text-[10px]">
                    <p>
                      <strong>{calibrationSummary.withSubmitted}</strong> przetargów z zapisaną ofertą
                      {calibrationSummary.withAward > 0 && (
                        <span className="text-muted-foreground">
                          {" "}· {calibrationSummary.withAward} z wynikiem BZP
                        </span>
                      )}
                    </p>
                    {calibrationSummary.recommendedVsSubmitted && (
                      <p>
                        <span className="text-muted-foreground">WGDOM → Oferta:</span>{" "}
                        <strong>{formatCalibrationDeltaPct(calibrationSummary.recommendedVsSubmitted)}</strong>
                      </p>
                    )}
                    {calibrationSummary.submittedVsAward && (
                      <p>
                        <span className="text-muted-foreground">Oferta → Wygrana:</span>{" "}
                        <strong>{formatCalibrationDeltaPct(calibrationSummary.submittedVsAward)}</strong>
                      </p>
                    )}
                    {calibrationHints.length > 0 && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2 space-y-1">
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                          Sugestie katalogu (N≥10, tylko podgląd)
                        </p>
                        <ul className="space-y-0.5">
                          {calibrationHints.map((h) => (
                            <li key={h.categoryId}>
                              <strong>{h.categoryId}</strong>
                              {" "}— średnio {formatCalibrationDeltaPct({ pct: h.avgDeltaPct, pln: null, basePln: null, comparePln: null })}
                              {" · "}{h.suggestionPl}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </ProfileSection>

              <ProfileSection
                id={PROFILE_SECTION_IDS.advanced}
                emoji="⚙️"
                title={PROFILE_SECTION_TITLES.advanced}
                description="Rzadziej używane — limity zamówień, CPV, dane rejestrowe. Nie zmieniają algorytmu wyceny."
              >
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
                  <NumInput label="Min. wartość zamówienia (PLN)" value={profile.minOrderValuePln} onChange={(v) => setProfile({ ...profile, minOrderValuePln: v })} />
                  <NumInput label="Max. wartość zamówienia (PLN)" value={profile.maxOrderValuePln} onChange={(v) => setProfile({ ...profile, maxOrderValuePln: v })} step={10000} />
                  <NumInput label="Max. wadium (PLN)" value={profile.maxWadiumPln} onChange={(v) => setProfile({ ...profile, maxWadiumPln: v })} />
                  <NumInput label="Min. dni na realizację" value={profile.minProjectDays} onChange={(v) => setProfile({ ...profile, minProjectDays: v })} step={1} />
                  <NumInput label="Max. równoległych robót" value={profile.maxConcurrentProjects} onChange={(v) => setProfile({ ...profile, maxConcurrentProjects: v })} step={1} />
                  <LinesInput
                    label="Prefiksy CPV"
                    value={profile.preferredCpvPrefixes}
                    onChange={(preferredCpvPrefixes) => setProfile({ ...profile, preferredCpvPrefixes })}
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
              </ProfileSection>
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

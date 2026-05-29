import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronDown, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  type TenderCompanyProfile,
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

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
      >
        <span className="flex items-center gap-1.5">
          <Building2 size={13} className="text-primary" />
          Profil firmy — dopasowanie i szacunek szans
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
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Uzupełnij dane W&G DOM — system porówna je z wymaganiami każdego przetargu (referencje, wadium, CPV, region)
                i oszacuje szanse. Współdzielone w chmurze dla całego zespołu.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <label className="block text-[10px] text-muted-foreground col-span-full sm:col-span-2">
                  Nazwa firmy
                  <input
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                  />
                </label>
                <LinesInput
                  label="Regiony / miasta działania (jedna linia = jeden wpis)"
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
                <NumInput label="Polisa OC (PLN)" value={profile.ocInsuranceMinPln} onChange={(v) => setProfile({ ...profile, ocInsuranceMinPln: v })} step={100000} />
                <LinesInput
                  label="Prefiksy CPV (np. 454, 452)"
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
                  hint="Dopasowanie do tytułu przetargu"
                  value={profile.strengths}
                  onChange={(strengths) => setProfile({ ...profile, strengths })}
                />
                <label className="block text-[10px] text-muted-foreground col-span-full">
                  Notatki wewnętrne
                  <textarea
                    rows={2}
                    value={profile.notes}
                    onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                    placeholder="Np. nie bierzemy hal sportowych…"
                  />
                </label>
              </div>
              <div className="flex justify-end">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

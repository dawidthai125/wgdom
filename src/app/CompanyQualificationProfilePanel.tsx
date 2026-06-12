import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, ChevronDown, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  type CompanyQualificationProfile,
  defaultCompanyQualificationProfile,
  loadCompanyQualificationProfile,
  saveCompanyQualificationProfile,
} from "@/lib/company-qualification-profile";

function NumInput({
  label,
  value,
  onChange,
  step = 1000,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
}) {
  return (
    <label className="block text-[10px] text-muted-foreground">
      {label}
      <input
        type="number"
        min={0}
        step={step}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw) || 0);
        }}
        className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
      />
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function CompanyQualificationProfilePanel({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<CompanyQualificationProfile>(
    defaultCompanyQualificationProfile(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadCompanyQualificationProfile().then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveCompanyQualificationProfile(profile);
      toast.success("Profil wykonawcy zapisany (chmura)");
      onSaved?.();
    } catch {
      toast.error("Błąd zapisu profilu wykonawcy");
    } finally {
      setSaving(false);
    }
  }, [profile, onSaved]);

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold">
          <ClipboardCheck size={14} className="text-emerald-600 shrink-0" />
          Profil wykonawcy — warunki udziału
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 space-y-3 border-t border-emerald-500/15">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Twarde dane do porównania z SWZ: personel, uprawnienia, doświadczenie, OC, finanse, referencje.
            Synchronizacja: <code className="text-[9px]">kw-company-profile</code>.
          </p>

          {loading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Ładowanie…
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Personel</p>
                <CheckRow label="Kierownik budowy" checked={profile.personnel.kierownikBudowy} onChange={(v) => setProfile({ ...profile, personnel: { ...profile.personnel, kierownikBudowy: v } })} />
                <CheckRow label="Kierownik robót sanitarnych" checked={profile.personnel.kierownikSanitarny} onChange={(v) => setProfile({ ...profile, personnel: { ...profile.personnel, kierownikSanitarny: v } })} />
                <CheckRow label="Kierownik robót elektrycznych" checked={profile.personnel.kierownikElektryczny} onChange={(v) => setProfile({ ...profile, personnel: { ...profile.personnel, kierownikElektryczny: v } })} />
                <CheckRow label="Kierownik robót drogowych" checked={profile.personnel.kierownikDrogowy} onChange={(v) => setProfile({ ...profile, personnel: { ...profile.personnel, kierownikDrogowy: v } })} />
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Uprawnienia</p>
                <CheckRow label="PIIB / izba inżynierów" checked={profile.licenses.piib} onChange={(v) => setProfile({ ...profile, licenses: { ...profile.licenses, piib: v } })} />
                <CheckRow label="Uprawnienia budowlane" checked={profile.licenses.uprawnieniaBudowlane} onChange={(v) => setProfile({ ...profile, licenses: { ...profile.licenses, uprawnieniaBudowlane: v } })} />
                <CheckRow label="SEP grupa E" checked={profile.licenses.sepE} onChange={(v) => setProfile({ ...profile, licenses: { ...profile.licenses, sepE: v } })} />
                <CheckRow label="SEP grupa D" checked={profile.licenses.sepD} onChange={(v) => setProfile({ ...profile, licenses: { ...profile.licenses, sepD: v } })} />
                <CheckRow label="UDT" checked={profile.licenses.udt} onChange={(v) => setProfile({ ...profile, licenses: { ...profile.licenses, udt: v } })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <NumInput label="Największa realizacja (PLN)" value={profile.experience.largestProjectPln} onChange={(v) => setProfile({ ...profile, experience: { ...profile.experience, largestProjectPln: v } })} />
                <NumInput label="Liczba podobnych realizacji" value={profile.experience.similarProjectsCount} onChange={(v) => setProfile({ ...profile, experience: { ...profile.experience, similarProjectsCount: v } })} step={1} />
                <NumInput label="Lata działalności" value={profile.experience.yearsInBusiness} onChange={(v) => setProfile({ ...profile, experience: { ...profile.experience, yearsInBusiness: v } })} step={1} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <NumInput label="Polisa OC (PLN)" value={profile.insurance.ocPln} onChange={(v) => setProfile({ ...profile, insurance: { ...profile.insurance, ocPln: v } })} />
                <NumInput label="Dostępne środki (PLN)" value={profile.finances.availableFundsPln} onChange={(v) => setProfile({ ...profile, finances: { ...profile.finances, availableFundsPln: v } })} />
                <NumInput label="Liczba referencji" value={profile.references.count} onChange={(v) => setProfile({ ...profile, references: { ...profile.references, count: v } })} step={1} />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Zapisz profil wykonawcy
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

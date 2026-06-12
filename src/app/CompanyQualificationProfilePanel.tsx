import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, ChevronDown, FileText, Loader2, Plus, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  approveDiscoveredProject,
  discoverCompanyExperience,
  fmtDiscoveredValuePln,
  loadJobsForExperienceDiscovery,
  type DiscoveredProject,
} from "@/lib/company-experience-discovery";
import {
  type CompanyExperienceProject,
  type CompanyQualificationProfile,
  EXPERIENCE_REFERENCE_UI,
  defaultCompanyQualificationProfile,
  loadCompanyQualificationProfile,
  resolveExperienceReferenceUiStatus,
  saveCompanyQualificationProfile,
} from "@/lib/company-qualification-profile";
import { uploadExperienceDocument } from "@/lib/experience-reference-upload";

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
  const [discovered, setDiscovered] = useState<DiscoveredProject[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const refInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const protocolInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  useEffect(() => {
    if (loading) return;
    const jobs = loadJobsForExperienceDiscovery();
    setDiscovered(discoverCompanyExperience(jobs, profile));
  }, [loading, profile]);

  const pendingDiscovered = useMemo(
    () => discovered.filter((d) => !profile.experienceProjects.some(
      (e) => e.sourceJobId && e.sourceJobId === d.jobId,
    )),
    [discovered, profile.experienceProjects],
  );

  const handleApproveDiscovered = useCallback(async (d: DiscoveredProject) => {
    const next = approveDiscoveredProject(profile, d);
    if (next.experienceProjects.length === profile.experienceProjects.length) {
      toast.info("Ta realizacja jest już w profilu");
      return;
    }
    setProfile(next);
    setSaving(true);
    try {
      await saveCompanyQualificationProfile(next);
      toast.success(`Dodano: ${d.title}`);
      onSaved?.();
    } catch {
      toast.error("Błąd zapisu profilu");
    } finally {
      setSaving(false);
    }
  }, [profile, onSaved]);

  const handleUploadDocument = useCallback(async (
    idx: number,
    kind: "reference" | "protocol",
    file: File,
  ) => {
    const key = `${kind}-${idx}`;
    setUploadingKey(key);
    try {
      const { doc, error } = await uploadExperienceDocument(file);
      if (!doc || error) {
        toast.error(error ?? "Błąd uploadu");
        return;
      }
      const proj = profile.experienceProjects[idx];
      if (!proj) return;
      const next = [...profile.experienceProjects];
      const updated: CompanyExperienceProject = {
        ...proj,
        referenceFiles: kind === "reference"
          ? [...(proj.referenceFiles ?? []), doc]
          : (proj.referenceFiles ?? []),
        protocolFiles: kind === "protocol"
          ? [...(proj.protocolFiles ?? []), doc]
          : (proj.protocolFiles ?? []),
        referenceStatus: kind === "reference" ? "available" : proj.referenceStatus,
        referenceAvailable: kind === "reference" ? true : proj.referenceAvailable,
      };
      next[idx] = updated;
      const nextProfile = { ...profile, experienceProjects: next };
      setProfile(nextProfile);
      await saveCompanyQualificationProfile(nextProfile);
      toast.success(kind === "reference" ? "Dodano referencję PDF" : "Dodano protokół odbioru");
      onSaved?.();
    } finally {
      setUploadingKey(null);
    }
  }, [profile, onSaved]);

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

              <div className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Doświadczenie i referencje
                  </p>
                  <button
                    type="button"
                    onClick={() => setProfile({
                      ...profile,
                      experienceProjects: [
                        ...profile.experienceProjects,
                        {
                          title: "",
                          category: "roboty ogólnobudowlane",
                          valuePln: null,
                          year: new Date().getFullYear(),
                          referenceStatus: "unknown",
                          referenceAvailable: false,
                          referenceFiles: [],
                          protocolFiles: [],
                        },
                      ],
                    })}
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                  >
                    <Plus size={10} /> Dodaj realizację
                  </button>
                </div>
                {profile.experienceProjects.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">Brak wpisów — dodaj realizacje do twardego dopasowania SWZ.</p>
                )}
                {profile.experienceProjects.map((proj, idx) => {
                  const refUi = resolveExperienceReferenceUiStatus(proj);
                  const refDisplay = EXPERIENCE_REFERENCE_UI[refUi];
                  return (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-lg bg-background/50 border border-border/40">
                    <p className={`sm:col-span-2 text-[10px] font-medium ${refDisplay.className}`}>
                      {refDisplay.emoji} {refDisplay.label}
                      {(proj.referenceFiles?.length ?? 0) > 0 && (
                        <span className="text-muted-foreground font-normal ml-1">
                          · {proj.referenceFiles!.length} ref.
                        </span>
                      )}
                      {(proj.protocolFiles?.length ?? 0) > 0 && (
                        <span className="text-muted-foreground font-normal ml-1">
                          · {proj.protocolFiles!.length} prot.
                        </span>
                      )}
                    </p>
                    <input
                      placeholder="Nazwa realizacji"
                      value={proj.title}
                      onChange={(e) => {
                        const next = [...profile.experienceProjects];
                        next[idx] = { ...proj, title: e.target.value };
                        setProfile({ ...profile, experienceProjects: next });
                      }}
                      className="sm:col-span-2 bg-secondary rounded px-2 py-1 text-[10px] border border-border"
                    />
                    <input
                      placeholder="Typ robót"
                      value={proj.category}
                      onChange={(e) => {
                        const next = [...profile.experienceProjects];
                        next[idx] = { ...proj, category: e.target.value };
                        setProfile({ ...profile, experienceProjects: next });
                      }}
                      className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
                    />
                    <input
                      placeholder="Rok"
                      type="number"
                      min={1990}
                      max={2100}
                      value={proj.year ?? ""}
                      onChange={(e) => {
                        const next = [...profile.experienceProjects];
                        next[idx] = { ...proj, year: e.target.value ? Number(e.target.value) : null };
                        setProfile({ ...profile, experienceProjects: next });
                      }}
                      className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
                    />
                    <input
                      placeholder="Wartość PLN"
                      type="number"
                      min={0}
                      step={1000}
                      value={proj.valuePln ?? ""}
                      onChange={(e) => {
                        const next = [...profile.experienceProjects];
                        next[idx] = { ...proj, valuePln: e.target.value ? Number(e.target.value) : null };
                        setProfile({ ...profile, experienceProjects: next });
                      }}
                      className="bg-secondary rounded px-2 py-1 text-[10px] border border-border"
                    />
                    <label className="flex items-center gap-2 text-[10px] sm:col-span-2">
                      <span className="text-muted-foreground shrink-0">Referencja:</span>
                      <select
                        value={proj.referenceStatus ?? "unknown"}
                        onChange={(e) => {
                          const referenceStatus = e.target.value as "unknown" | "available" | "missing";
                          const next = [...profile.experienceProjects];
                          next[idx] = {
                            ...proj,
                            referenceStatus,
                            referenceAvailable: referenceStatus === "available",
                          };
                          setProfile({ ...profile, experienceProjects: next });
                        }}
                        className="bg-secondary rounded px-2 py-1 text-[10px] border border-border flex-1"
                      >
                        <option value="unknown">Nieznane</option>
                        <option value="available">Dostępna</option>
                        <option value="missing">Brak</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        ref={(el) => { refInputRefs.current[String(idx)] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUploadDocument(idx, "reference", file);
                          e.target.value = "";
                        }}
                      />
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        ref={(el) => { protocolInputRefs.current[String(idx)] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUploadDocument(idx, "protocol", file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingKey === `reference-${idx}` || saving}
                        onClick={() => refInputRefs.current[String(idx)]?.click()}
                        className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {uploadingKey === `reference-${idx}` ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                        Dodaj referencję PDF
                      </button>
                      <button
                        type="button"
                        disabled={uploadingKey === `protocol-${idx}` || saving}
                        onClick={() => protocolInputRefs.current[String(idx)]?.click()}
                        className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {uploadingKey === `protocol-${idx}` ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                        Dodaj protokół odbioru
                      </button>
                    </div>
                    {(proj.referenceFiles?.length ?? 0) > 0 && (
                      <ul className="sm:col-span-2 text-[10px] text-muted-foreground space-y-0.5">
                        {proj.referenceFiles!.map((f) => (
                          <li key={f.id}>
                            <a href={f.publicUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {f.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(proj.protocolFiles?.length ?? 0) > 0 && (
                      <ul className="sm:col-span-2 text-[10px] text-muted-foreground space-y-0.5">
                        {proj.protocolFiles!.map((f) => (
                          <li key={f.id}>
                            <a href={f.publicUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              Protokół: {f.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => setProfile({
                        ...profile,
                        experienceProjects: profile.experienceProjects.filter((_, i) => i !== idx),
                      })}
                      className="sm:col-span-2 text-[10px] text-red-600 flex items-center gap-1 justify-end hover:underline"
                    >
                      <Trash2 size={10} /> Usuń
                    </button>
                  </div>
                  );
                })}
              </div>

              {pendingDiscovered.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200 flex items-center gap-1">
                    <Sparkles size={11} />
                    Odkryte realizacje
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    System znalazł realizacje w Robotach, fakturach i dokumentach. Zatwierdź jednym kliknięciem — bez automatycznego zapisu do profilu.
                  </p>
                  {pendingDiscovered.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{d.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtDiscoveredValuePln(d.valuePln)} · {d.category}
                          {d.confidence >= 0.85 && (
                            <span className="ml-1 text-emerald-600">· wysoka pewność</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleApproveDiscovered(d)}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-medium hover:bg-amber-700 disabled:opacity-50"
                      >
                        Dodaj do doświadczenia
                      </button>
                    </div>
                  ))}
                </div>
              )}

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

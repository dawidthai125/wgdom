import { useEffect, useState } from "react";
import {
  Search, MessageSquare, Plus, Users, HardHat, Building2, Check, ShieldCheck, KeyRound,
  Phone, Lock, BarChart3, Edit2, Circle, CheckCircle2, Trash2,
} from "lucide-react";
import { useAdminAccess } from "@/app/admin-access";
import { StatCard, LabelWithHint } from "@/app/app-ui";
import { EmployeeArchiveModal } from "@/app/EmployeeArchiveModal";
import type { DirectoryEmployee, WeekSnapshot } from "@/app/app-domain";
import {
  defaultDirEmployee,
  isTestDirectoryEmployee,
  isProductionDirectoryEmployee,
  fmtDate,
  workerHasPersonalPin,
  workerPinTooWeak,
} from "@/app/app-domain";
import { addDeletedDirectoryId, pushDirectoryToCloud, pushEmployeeLeavesToCloud } from "@/lib/cloud-sync";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import { mergeEmployeeLeaves } from "@/lib/employee-leaves";
import { EmployeeLeavesSection } from "@/app/EmployeeLeavesSection";
import { digestSha256Hex } from "@/lib/admin-auth";
import { recordSecurityAudit } from "@/lib/security-audit-log";

async function hashWorkerPin(pin: string): Promise<string> {
  return digestSha256Hex(`wgdom-worker-pin-v1:${pin}`);
}

export function DirectoryView({directory, savedWeeks, employeeLeaves, onChange, onCommit, onLeavesChange, onLeavesCommit, onOpenSms}:{directory:DirectoryEmployee[]; savedWeeks: WeekSnapshot[]; employeeLeaves: EmployeeLeave[]; onChange:(d:DirectoryEmployee[])=>void; onCommit?:()=>void; onLeavesChange:(l:EmployeeLeave[])=>void; onLeavesCommit?:(next:EmployeeLeave[], deletedId?:string)=>void; onOpenSms?:()=>void}) {
  const { canViewRates, session: adminSession } = useAdminAccess();
  const [editId, setEditId] = useState<string|null>(null);
  const [archiveEmpId, setArchiveEmpId] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminPinBusy, setAdminPinBusy] = useState(false);
  const [adminPinMsg, setAdminPinMsg] = useState("");

  const filtered = directory.filter((d)=>{
    if(!showInactive&&!d.active) return false;
    return d.name.toLowerCase().includes(search.toLowerCase()) || d.position.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search);
  });

  const addEmployee = () => {
    const e = defaultDirEmployee();
    onChange([...directory, e]);
    setEditId(e.id);
  };

  const update = (updated:DirectoryEmployee) => onChange(directory.map((d)=>d.id===updated.id?updated:d));
  const remove = (id:string) => {
    addDeletedDirectoryId(id);
    const next = directory.filter((d)=>d.id!==id);
    onChange(next);
    pushDirectoryToCloud(next).catch(() => {});
    void recordSecurityAudit({
      actor: adminSession?.displayName ?? "Administrator",
      actorUserId: adminSession?.id,
      category: "DATA",
      action: "directory_delete",
      severity: "high",
      summary: "Usunięto pracownika z katalogu",
      detail: JSON.stringify({ entryId: id }),
    }).catch(() => {});
  };
  const toggleActive = (id:string) => update({...directory.find((d)=>d.id===id)!, active:!directory.find((d)=>d.id===id)!.active});

  const editEmp = directory.find((d)=>d.id===editId)||null;
  const archiveEmp = directory.find((d)=>d.id===archiveEmpId)||null;

  const applyAdminWorkerPin = async (pin: string) => {
    if (!editEmp) return;
    const digits = pin.replace(/\D/g, "").slice(0, 4);
    if (digits.length !== 4) { setAdminPinMsg("Kod musi mieć 4 cyfry"); return; }
    if (workerPinTooWeak(editEmp, digits)) { setAdminPinMsg("Kod nie może być ostatnimi 4 cyframi telefonu"); return; }
    setAdminPinBusy(true);
    setAdminPinMsg("");
    try {
      const hash = await hashWorkerPin(digits);
      update({ ...editEmp, workerPinHash: hash });
      setAdminPinInput("");
      setAdminPinMsg("Kod zapisany — pracownik może logować się telefonem + tym kodem.");
    } finally {
      setAdminPinBusy(false);
    }
  };

  const resetAdminWorkerPin = () => {
    if (!editEmp) return;
    const next = { ...editEmp };
    delete next.workerPinHash;
    update(next);
    setAdminPinInput("");
    setAdminPinMsg("Kod usunięty — pracownik ustawi nowy przy następnym logowaniu.");
  };

  useEffect(() => {
    setAdminPinInput("");
    setAdminPinMsg("");
  }, [editId]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {archiveEmp && (
        <EmployeeArchiveModal employee={archiveEmp} savedWeeks={savedWeeks} onClose={() => setArchiveEmpId(null)}/>
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj po nazwisku, stanowisku, telefonie..." value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"/>
            </div>
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {onOpenSms && (
                <button type="button" onClick={onOpenSms} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 transition-colors">
                  <MessageSquare size={14}/>SMS pilne
                </button>
              )}
              <button onClick={()=>setShowInactive(v=>!v)} className={`text-xs px-3 py-2 rounded-lg border transition-colors ${showInactive?"bg-secondary border-border text-foreground":"border-border text-muted-foreground hover:text-foreground"}`}>
                {showInactive?"Ukryj nieaktywnych":"Pokaż nieaktywnych"}
              </button>
              <button onClick={addEmployee} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus size={14}/>Nowy pracownik
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Aktywni" value={String(directory.filter((d) => d.active && isProductionDirectoryEmployee(d)).length)} icon={Users} accent/>
            <StatCard label="Konta test" value={String(directory.filter((d) => isTestDirectoryEmployee(d)).length)} icon={HardHat}/>
            <StatCard label="Łącznie" value={String(directory.length)} icon={Building2}/>
          </div>

          {/* Employee cards */}
          <div className="space-y-2">
            {filtered.length===0&&(
              <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
                {directory.length===0?"Brak pracowników — dodaj pierwszego.":"Brak wyników wyszukiwania."}
              </div>
            )}
            {filtered.map((emp)=>(
              <div key={emp.id} className={`bg-card rounded-xl border transition-all ${editId===emp.id?"border-primary/40":"border-border"} ${!emp.active?"opacity-60":""} overflow-hidden`}>
                {editId===emp.id&&editEmp ? (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <LabelWithHint label="Imię i nazwisko *" hint="Pełne imię i nazwisko — widoczne na liście płac, grafiku i w trybie pracownika." htmlFor={`dir-name-${editEmp.id}`}/>
                        <input id={`dir-name-${editEmp.id}`} type="text" value={editEmp.name} onChange={(e)=>update({...editEmp,name:e.target.value})} placeholder="Jan Kowalski" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                      <div>
                        <LabelWithHint label="Stanowisko" hint="Np. Murarz, Elektryk — informacyjnie w kartotece (nie na liście logowania pracownika)." htmlFor={`dir-pos-${editEmp.id}`}/>
                        <input id={`dir-pos-${editEmp.id}`} type="text" value={editEmp.position} onChange={(e)=>update({...editEmp,position:e.target.value})} placeholder="np. Murarz, Kierowca..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                      <div>
                        <LabelWithHint label="Telefon" hint="Numer do logowania pracownika — wpisuje 9 ostatnich cyfr (bez +48). Wymagany do trybu pracownika." htmlFor={`dir-phone-${editEmp.id}`}/>
                        <input id={`dir-phone-${editEmp.id}`} type="tel" value={editEmp.phone} onChange={(e)=>update({...editEmp,phone:e.target.value})} placeholder="+48 000 000 000" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                      {canViewRates && (
                      <div>
                        <LabelWithHint label="Domyślna stawka (PLN/h)" hint="Podpowiada się w liście płac i na robotach. Można zmienić na konkretny tydzień bez edycji kartoteki." htmlFor={`dir-rate-${editEmp.id}`}/>
                        <input id={`dir-rate-${editEmp.id}`} type="number" min="0" step="0.5" value={editEmp.defaultRate} onChange={(e)=>update({...editEmp,defaultRate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      )}
                      <div>
                        <LabelWithHint label="Data zatrudnienia" hint="Opcjonalnie — do informacji w kartotece i archiwum rocznym." htmlFor={`dir-start-${editEmp.id}`}/>
                        <input id={`dir-start-${editEmp.id}`} type="date" value={editEmp.startDate} onChange={(e)=>update({...editEmp,startDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div>
                        <LabelWithHint label="Uwagi" hint="Notatki wewnętrne — widzi tylko administrator." htmlFor={`dir-notes-${editEmp.id}`}/>
                        <input id={`dir-notes-${editEmp.id}`} type="text" value={editEmp.notes} onChange={(e)=>update({...editEmp,notes:e.target.value})} placeholder="Dodatkowe informacje..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-4 border border-border space-y-3">
                      <LabelWithHint
                        label="Kod pracownika (4 cyfry)"
                        hint="Osobisty PIN oprócz telefonu — chroni wypłatę przed podglądem przez innych. Pracownik ustawia sam przy pierwszym logowaniu albo Ty wpisujesz kod tutaj. Reset usuwa kod — przy logowaniu ustawi nowy."
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {workerHasPersonalPin(editEmp) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                            <ShieldCheck size={12}/> Kod ustawiony
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            <KeyRound size={12}/> Brak kodu — ustawi przy logowaniu
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={4}
                          placeholder="Nowy kod 4 cyfry"
                          value={adminPinInput}
                          onChange={(e)=>{ setAdminPinInput(e.target.value.replace(/\D/g,"").slice(0,4)); setAdminPinMsg(""); }}
                          onKeyDown={(e)=>e.key==="Enter"&&applyAdminWorkerPin(adminPinInput)}
                          className="w-36 bg-secondary rounded-lg px-3 py-2 text-sm tracking-widest border border-transparent focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={adminPinBusy || adminPinInput.length !== 4}
                          onClick={()=>applyAdminWorkerPin(adminPinInput)}
                          className="px-3 py-2 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 disabled:opacity-40 transition-colors"
                        >
                          {adminPinBusy ? "…" : "Ustaw kod"}
                        </button>
                        {workerHasPersonalPin(editEmp) && (
                          <button
                            type="button"
                            onClick={resetAdminWorkerPin}
                            className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            Resetuj kod
                          </button>
                        )}
                      </div>
                      {adminPinMsg && <p className="text-[11px] text-muted-foreground">{adminPinMsg}</p>}
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer bg-secondary/50 rounded-xl p-3 border border-border">
                      <input
                        type="checkbox"
                        checked={editEmp.multiSiteDaily === true}
                        onChange={(e) => update({ ...editEmp, multiSiteDaily: e.target.checked })}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-sm font-medium block">Wiele robót dziennie (logistyka / dostawy)</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">Np. kierowca rozwożący towar — nie sprawdzamy spójności godzin z robotami (wystarczy lista płac).</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer bg-sky-500/5 rounded-xl p-3 border border-sky-500/20">
                      <input
                        type="checkbox"
                        checked={editEmp.biweeklyPayroll === true}
                        onChange={(e) => update({
                          ...editEmp,
                          biweeklyPayroll: e.target.checked,
                          biweeklyAnchorDate: e.target.checked ? (editEmp.biweeklyAnchorDate || "2026-05-30") : editEmp.biweeklyAnchorDate,
                        })}
                        className="mt-0.5"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Wypłata co 2 tygodnie (sobota)</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">Umowa 2-tygodniowa — wypłata co drugą sobotę za 2 tygodnie Pn–So (bez Sob. poprz.). Można przypisać każdemu pracownikowi z taką umową.</span>
                        {editEmp.biweeklyPayroll && (
                          <span className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">Pierwsza sobota wypłaty:</span>
                            <input
                              type="date"
                              value={editEmp.biweeklyAnchorDate ?? ""}
                              onChange={(e) => update({ ...editEmp, biweeklyAnchorDate: e.target.value })}
                              className="bg-secondary rounded-lg px-3 py-1.5 text-sm border border-transparent focus:border-primary focus:outline-none"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            />
                          </span>
                        )}
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer bg-violet-500/5 rounded-xl p-3 border border-violet-500/20">
                      <input
                        type="checkbox"
                        checked={isTestDirectoryEmployee(editEmp)}
                        onChange={(e) => update({ ...editEmp, testAccount: e.target.checked ? true : false })}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-sm font-medium block flex items-center gap-2">
                          Konto testowe
                          <span className="text-[10px] font-normal text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">TEST</span>
                        </span>
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          Tylko logowanie w trybie pracownika (zdjęcia, raporty). Nie trafia na listę płac, grafik, pulpit ani roboty. Auto-wykrywane dla imienia „test” i numeru +48 000 000 000.
                        </span>
                      </span>
                    </label>
                    <EmployeeLeavesSection
                      employeeId={editEmp.id}
                      employeeName={editEmp.name}
                      leaves={employeeLeaves}
                      savedWeeks={savedWeeks}
                      onChange={onLeavesChange}
                      onCommit={(next, deletedId) => onLeavesCommit?.(next, deletedId)}
                    />
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={()=>{ setEditId(null); onCommit?.(); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Check size={13}/>Zapisz</button>
                      <button onClick={()=>setEditId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${emp.active?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>
                      {emp.name?emp.name[0].toUpperCase():"?"}
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-0.5">
                      <div>
                        <p className="text-sm font-semibold leading-tight">{emp.name||<span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                        <p className="text-xs text-muted-foreground">{emp.position||<span className="italic">brak stanowiska</span>}
                          {emp.multiSiteDaily && <span className="ml-2 text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">wiele robót/dzień</span>}
                          {emp.biweeklyPayroll && <span className="ml-2 text-[10px] bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded-full">co 2 tyg.</span>}
                          {isTestDirectoryEmployee(emp) && <span className="ml-2 text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">TEST</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={11} className="shrink-0"/>{emp.phone||"—"}
                        {workerHasPersonalPin(emp) && (
                          <span title="Kod pracownika ustawiony" className="inline-flex items-center gap-0.5 text-[10px] text-green-400/90 ml-1">
                            <Lock size={10}/> kod
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {canViewRates && <span style={{fontFamily:"'JetBrains Mono', monospace"}}>{emp.defaultRate} PLN/h</span>}
                        {emp.startDate&&<span>od {fmtDate(emp.startDate)}</span>}
                        {!emp.active&&<span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Nieaktywny</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={()=>setArchiveEmpId(emp.id)} title="Karta z archiwum" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"><BarChart3 size={13}/></button>
                      <button onClick={()=>setEditId(emp.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={13}/></button>
                      <button onClick={()=>toggleActive(emp.id)} title={emp.active?"Oznacz jako nieaktywny":"Przywróć"} className={`p-1.5 rounded-lg transition-colors ${emp.active?"hover:bg-secondary text-muted-foreground hover:text-yellow-400":"text-green-400 hover:bg-green-400/10"}`}>
                        {emp.active?<Circle size={13}/>:<CheckCircle2 size={13}/>}
                      </button>
                      <button onClick={()=>remove(emp.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


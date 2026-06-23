import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ShieldCheck, ClipboardCheck, HardHat, Lock, Eye, Search,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import {
  type AdminSession,
  listAdminUsersForLogin,
  listInspectorUsersForLogin,
  verifyAdminLogin,
  adminRememberEnabled,
  saveRememberedAdminPassword,
  loadRememberedAdminPassword,
  clearRememberedAdminPassword,
  digestSha256Hex,
} from "@/lib/admin-auth";
import { recordSecurityAudit } from "@/lib/security-audit-log";
import {
  fetchKeysFromCloud,
  mergeDirectory,
  getDeletedDirectoryIds,
  saveDeletedDirectoryIds,
  mergeDeletedDirectoryIds,
  normalizeDeletedDirectoryIds,
  DIRECTORY_DELETED_IDS_KEY,
  pushDirectoryToCloud,
} from "@/lib/cloud-sync";
import type { DirectoryEmployee } from "@/app/app-domain";
import {
  workerHasPhonePin,
  workerPhonePinValid,
  workerHasPersonalPin,
  workerPinTooWeak,
} from "@/app/app-domain";

async function hashWorkerPin(pin: string): Promise<string> {
  return digestSha256Hex(`wgdom-worker-pin-v1:${pin}`);
}

async function verifyWorkerPin(emp: DirectoryEmployee, pin: string): Promise<boolean> {
  if (!workerHasPersonalPin(emp)) return false;
  const hash = await hashWorkerPin(pin.replace(/\D/g, "").slice(0, 4));
  return hash === emp.workerPinHash;
}

export function LoginScreen({onAdmin, onInspector, onWorker}: {onAdmin:(session: AdminSession)=>void; onInspector:(session: AdminSession)=>void; onWorker:(emp:DirectoryEmployee)=>void}) {
  const adminUsers = useMemo(() => listAdminUsersForLogin(), []);
  const inspectorUsers = useMemo(() => listInspectorUsersForLogin(), []);
  const [mode, setMode] = useState<"pick"|"admin"|"worker"|"inspector">("pick");

  const [selectedAdminId, setSelectedAdminId] = useState(adminUsers[0]?.id ?? "");
  const [selectedInspectorId, setSelectedInspectorId] = useState(inspectorUsers[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [passShow, setPassShow] = useState(false);
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [phonePin, setPhonePin] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [workerStep, setWorkerStep] = useState<"login" | "setup-pin">("login");
  const [setupPin1, setSetupPin1] = useState("");
  const [setupPin2, setSetupPin2] = useState("");
  const [setupPinLoading, setSetupPinLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");

  const selectedAdmin = adminUsers.find((u) => u.id === selectedAdminId) ?? adminUsers[0] ?? null;
  const selectedInspector = inspectorUsers.find((u) => u.id === selectedInspectorId) ?? inspectorUsers[0] ?? null;
  const activeLoginUserId = mode === "inspector" ? selectedInspectorId : selectedAdminId;

  useEffect(() => {
    if (mode !== "admin" && mode !== "inspector") return;
    if (!activeLoginUserId) return;
    let cancelled = false;
    (async () => {
      const enabled = adminRememberEnabled();
      if (!cancelled) setRememberPassword(enabled);
      if (enabled) {
        const saved = await loadRememberedAdminPassword(activeLoginUserId);
        if (!cancelled && saved) setPassword(saved);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, activeLoginUserId]);

  const handleAdminLogin = async () => {
    if (!selectedAdmin) { setPassError("Brak kont administratora"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const session = await verifyAdminLogin(selectedAdmin.login, password);
    if (session) {
      if (session.role === "inspector") { setPassLoading(false); setPassError("Użyj logowania Inspektor"); setPassword(""); return; }
      if (rememberPassword) await saveRememberedAdminPassword(selectedAdmin.id, password);
      else clearRememberedAdminPassword();
      setPassLoading(false);
      onAdmin(session);
      return;
    }
    setPassLoading(false);
    setPassError("Błędne hasło");
    void recordSecurityAudit({
      actor: selectedAdmin.login,
      category: "AUTH",
      action: "admin_login_failed",
      severity: "warn",
      summary: `Nieudane logowanie: ${selectedAdmin.login}`,
      detail: JSON.stringify({ login: selectedAdmin.login }),
    }).catch(() => {});
    setPassword("");
  };

  const handleInspectorLogin = async () => {
    if (!selectedInspector) { setPassError("Brak kont inspektorów"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const session = await verifyAdminLogin(selectedInspector.login, password);
    if (session && session.role === "inspector") {
      if (rememberPassword) await saveRememberedAdminPassword(selectedInspector.id, password);
      else clearRememberedAdminPassword();
      setPassLoading(false);
      onInspector(session);
      return;
    }
    setPassLoading(false);
    setPassError("Błędne hasło");
    setPassword("");
  };

  useEffect(() => {
    if (mode !== "worker") return;
    setDirLoading(true);
    setWorkerError("");
    fetchKeysFromCloud(["kw-directory", DIRECTORY_DELETED_IDS_KEY])
      .then((values) => {
        const [cloudRaw, cloudDeletedRaw] = values;
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), normalizeDeletedDirectoryIds(cloudDeletedRaw));
        saveDeletedDirectoryIds(mergedDirDeleted);
        if (Array.isArray(cloudRaw)) {
          let local: DirectoryEmployee[] = [];
          try {
            local = JSON.parse(localStorage.getItem("kw-directory") || "[]");
          } catch { /* ignore */ }
          const merged = mergeDirectory(local, cloudRaw, mergedDirDeleted) as DirectoryEmployee[];
          setDirectory(merged);
          try { localStorage.setItem("kw-directory", JSON.stringify(merged)); } catch { /* ignore */ }
        } else {
          try {
            const local = localStorage.getItem("kw-directory");
            if (local) setDirectory(JSON.parse(local));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        try {
          const local = localStorage.getItem("kw-directory");
          if (local) setDirectory(JSON.parse(local));
        } catch { /* ignore */ }
      })
      .finally(() => setDirLoading(false));
  }, [mode]);

  const activeWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return directory
      .filter((d) => d.active)
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.position.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [directory, workerSearch]);

  const selectedWorker = directory.find((d) => d.id === selectedWorkerId) || null;

  const handleWorkerSubmit = async () => {
    setWorkerError("");
    if (!selectedWorker) { setWorkerError("Wybierz siebie z listy"); return; }
    if (!workerHasPhonePin(selectedWorker)) {
      setWorkerError("Brak numeru w kartotece — poproś administratora o wpisanie telefonu (+48…).");
      return;
    }
    const pin = phonePin.replace(/\D/g, "");
    if (pin.length !== 9) { setWorkerError("Wpisz 9 cyfr telefonu (bez +48)"); return; }
    if (!workerPhonePinValid(selectedWorker, pin)) {
      setWorkerError("Błędny numer — wpisz 9 ostatnich cyfr swojego telefonu");
      setPhonePin("");
      return;
    }

    const emp = directory.find((d) => d.id === selectedWorkerId) || selectedWorker;

    if (!workerHasPersonalPin(emp)) {
      setWorkerStep("setup-pin");
      setSetupPin1("");
      setSetupPin2("");
      return;
    }

    const code = workerCode.replace(/\D/g, "");
    if (code.length !== 4) { setWorkerError("Wpisz swój 4-cyfrowy kod"); return; }
    try {
      const ok = await verifyWorkerPin(emp, code);
      if (!ok) {
        setWorkerError("Błędny kod pracownika");
        setWorkerCode("");
        return;
      }
      onWorker(emp);
    } catch {
      setWorkerError("Błąd logowania — odśwież stronę i spróbuj ponownie");
    }
  };

  const handleWorkerSetupPin = async () => {
    setWorkerError("");
    const emp = directory.find((d) => d.id === selectedWorkerId);
    if (!emp) { setWorkerError("Wybierz siebie z listy"); return; }
    const c1 = setupPin1.replace(/\D/g, "").slice(0, 4);
    const c2 = setupPin2.replace(/\D/g, "").slice(0, 4);
    if (c1.length !== 4) { setWorkerError("Kod musi mieć 4 cyfry"); return; }
    if (c1 !== c2) { setWorkerError("Kody nie pasują — wpisz ponownie"); setSetupPin2(""); return; }
    if (workerPinTooWeak(emp, c1)) {
      setWorkerError("Kod nie może być ostatnimi 4 cyframi telefonu — wybierz inny");
      return;
    }
    setSetupPinLoading(true);
    try {
      const hash = await hashWorkerPin(c1);
      const updated = directory.map((d) => (d.id === emp.id ? { ...d, workerPinHash: hash } : d));
      setDirectory(updated);
      try {
        localStorage.setItem("kw-directory", JSON.stringify(updated));
        await pushDirectoryToCloud(updated);
      } catch { /* offline — zapis lokalny */ }
      onWorker(updated.find((d) => d.id === emp.id)!);
    } catch {
      setWorkerError("Nie udało się zapisać kodu — spróbuj ponownie");
    } finally {
      setSetupPinLoading(false);
    }
  };

  const resetWorkerLogin = () => {
    setMode("pick");
    setSelectedWorkerId("");
    setPhonePin("");
    setWorkerCode("");
    setWorkerStep("login");
    setSetupPin1("");
    setSetupPin2("");
    setWorkerSearch("");
    setWorkerError("");
  };

  const PasswordField = ({value, show, onToggle, onChange, onEnter, placeholder, autoFocus}: {
    value:string; show:boolean; onToggle:()=>void; onChange:(v:string)=>void;
    onEnter?:()=>void; placeholder?:string; autoFocus?:boolean;
  }) => (
    <div className="relative">
      <input type={show?"text":"password"} placeholder={placeholder||"Wpisz hasło..."} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter?.()}
        className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 text-base border border-transparent focus:border-primary focus:outline-none transition-colors"/>
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        <Eye size={15}/>
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 py-8 overflow-y-auto" style={{fontFamily:"'Inter',sans-serif", paddingTop:"max(2rem, env(safe-area-inset-top))", paddingBottom:"max(2rem, env(safe-area-inset-bottom))"}}>
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain mx-auto"/>
          <p className="text-xs text-muted-foreground">System zarządzania robotami</p>
        </div>

        {/* Mode: pick */}
        {mode === "pick" && (
          <div className="space-y-3">
            <button onClick={()=>setMode("admin")}
              className="w-full bg-primary text-primary-foreground rounded-2xl px-6 py-5 flex items-center gap-4 hover:bg-primary/90 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><ShieldCheck size={22}/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Panel administracyjny</p>
                <p className="text-xs opacity-70 mt-0.5">Wybierz użytkownika i wpisz hasło</p>
              </div>
            </button>
            <button onClick={()=>setMode("inspector")}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-emerald-500/40 hover:bg-emerald-500/5 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><ClipboardCheck size={22} className="text-emerald-600 dark:text-emerald-400"/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Inspektor</p>
                <p className="text-xs text-muted-foreground mt-0.5">Roboty, dokumenty, zlecenia — Wrocławskie Mieszkania</p>
              </div>
            </button>
            <button onClick={()=>setMode("worker")}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0"><HardHat size={22} className="text-muted-foreground"/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Pracownik</p>
                <p className="text-xs text-muted-foreground mt-0.5">Zdjęcia, raport · telefon + kod 4 cyfry</p>
              </div>
            </button>
          </div>
        )}

        {/* Mode: admin login */}
        {mode === "admin" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><Lock size={14} className="text-primary"/><span className="text-sm font-semibold">Logowanie administratora</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Użytkownik</label>
              <select
                value={selectedAdminId}
                onChange={(e) => {
                  setSelectedAdminId(e.target.value);
                  setPassword("");
                  setPassError("");
                }}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hasło</label>
              <PasswordField value={password} show={passShow} onToggle={()=>setPassShow(v=>!v)}
                onChange={v=>{setPassword(v);setPassError("");}} onEnter={handleAdminLogin} autoFocus/>
              {passError && <p className="text-xs text-destructive">{passError}</p>}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Zapamiętaj hasło na tym urządzeniu
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Tylko lokalnie w przeglądarce — nie trafia do chmury</span>
                </span>
              </label>
            </div>
            <button onClick={handleAdminLogin} disabled={passLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {passLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Zaloguj
            </button>
          </div>
        )}

        {/* Mode: inspector login */}
        {mode === "inspector" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><ClipboardCheck size={14} className="text-emerald-600 dark:text-emerald-400"/><span className="text-sm font-semibold">Logowanie inspektora</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Użytkownik</label>
              <select
                value={selectedInspectorId}
                onChange={(e) => {
                  setSelectedInspectorId(e.target.value);
                  setPassword("");
                  setPassError("");
                }}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                {inspectorUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hasło</label>
              <PasswordField value={password} show={passShow} onToggle={()=>setPassShow(v=>!v)}
                onChange={v=>{setPassword(v);setPassError("");}} onEnter={handleInspectorLogin} autoFocus/>
              {passError && <p className="text-xs text-destructive">{passError}</p>}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Zapamiętaj hasło na tym urządzeniu
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Tylko lokalnie w przeglądarce — nie trafia do chmury</span>
                </span>
              </label>
            </div>
            <button onClick={handleInspectorLogin} disabled={passLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-600/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {passLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Wejdź do panelu
            </button>
          </div>
        )}

        {/* Mode: worker */}
        {mode === "worker" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={resetWorkerLogin} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><HardHat size={14} className="text-muted-foreground"/><span className="text-sm font-semibold">{workerStep === "setup-pin" ? "Ustaw kod pracownika" : "Logowanie pracownika"}</span></div>
            </div>

            {dirLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : workerStep === "setup-pin" && selectedWorker ? (
              <>
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold">{selectedWorker.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    To pierwsze logowanie — ustaw <strong>osobisty kod 4 cyfry</strong> (jak PIN do karty). Zapamiętaj go — chroni Twoją wypłatę przed podglądem przez innych. Nie podawaj kodu kolegom.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Nowy kod (4 cyfry)</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin1}
                      onChange={e=>{setSetupPin1(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors" autoFocus/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Powtórz kod</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin2}
                      onChange={e=>{setSetupPin2(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleWorkerSetupPin()}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                  </div>
                </div>
                {workerError && <p className="text-xs text-destructive">{workerError}</p>}
                <button onClick={handleWorkerSetupPin} disabled={setupPinLoading || setupPin1.length !== 4 || setupPin2.length !== 4}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {setupPinLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
                  Zapisz kod i wejdź
                </button>
                <button type="button" onClick={()=>{setWorkerStep("login");setSetupPin1("");setSetupPin2("");setWorkerError("");}}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Wróć
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Wybierz siebie z listy</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <input type="search" placeholder="Szukaj imienia..." value={workerSearch}
                      onChange={e=>{setWorkerSearch(e.target.value);setWorkerError("");}}
                      className="w-full bg-secondary rounded-xl pl-9 pr-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {activeWorkers.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">Brak aktywnych pracowników w kartotece.</p>
                    ) : activeWorkers.map((emp) => {
                      const hasPin = workerHasPhonePin(emp);
                      const sel = selectedWorkerId === emp.id;
                      return (
                        <button key={emp.id} type="button" disabled={!hasPin}
                          onClick={()=>{setSelectedWorkerId(emp.id);setWorkerError("");setWorkerCode("");}}
                          className={`w-full px-4 py-3 text-left transition-colors ${sel?"bg-primary/10":"hover:bg-secondary/50"} ${!hasPin?"opacity-50 cursor-not-allowed":""}`}>
                          <p className="text-sm font-medium">{emp.name||"Bez nazwy"}</p>
                          {!hasPin && <p className="text-[10px] text-amber-400 mt-0.5">Brak numeru — poproś admina</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedWorker && workerHasPhonePin(selectedWorker) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Telefon — 9 cyfr (bez +48)</label>
                      <input type="tel" inputMode="numeric" autoComplete="off" maxLength={11}
                        placeholder="np. 501234567" value={phonePin}
                        onChange={e=>{setPhonePin(e.target.value.replace(/\D/g,"").slice(0,9));setWorkerError("");}}
                        className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-widest border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    {workerHasPersonalPin(selectedWorker) && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Twój kod pracownika (4 cyfry)</label>
                        <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4}
                          placeholder="••••" value={workerCode}
                          onChange={e=>{setWorkerCode(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                          onKeyDown={e=>e.key==="Enter"&&handleWorkerSubmit()}
                          className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                        <p className="text-[10px] text-muted-foreground">Osobisty kod — nie taki sam jak u kolegów. Zapomniałeś? Poproś administratora o reset w kartotece.</p>
                      </div>
                    )}
                    {!workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g,"").length === 9 && workerPhonePinValid(selectedWorker, phonePin) && (
                      <p className="text-[11px] text-primary/90 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                        Pierwsze logowanie — po potwierdzeniu telefonu ustawisz osobisty kod 4 cyfry.
                      </p>
                    )}
                  </>
                )}

                {workerError && <p className="text-xs text-destructive">{workerError}</p>}

                {selectedWorker && workerHasPhonePin(selectedWorker) && phonePin.replace(/\D/g, "").length !== 9 && (
                  <p className="text-[11px] text-muted-foreground">Wpisz 9 cyfr telefonu, żeby kontynuować.</p>
                )}
                {selectedWorker && workerHasPhonePin(selectedWorker) && workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g, "").length === 9 && workerCode.length !== 4 && (
                  <p className="text-[11px] text-muted-foreground">Wpisz swój 4-cyfrowy kod pracownika.</p>
                )}

                <button
                  type="button"
                  onClick={handleWorkerSubmit}
                  disabled={!selectedWorker || !workerHasPhonePin(selectedWorker)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {selectedWorker && workerHasPersonalPin(selectedWorker) ? "Zaloguj" : "Dalej — ustaw kod"}
                </button>
              </>
            )}
          </div>
        )}

        <PwaInstallBanner/>
      </div>
    </div>
  );
}


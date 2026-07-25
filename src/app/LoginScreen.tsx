import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ShieldCheck, ClipboardCheck, HardHat, Lock, Eye, EyeOff, Search, User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { LoginAtmosphere } from "@/app/login/LoginAtmosphere";
import { LoginToolbar } from "@/app/login/LoginToolbar";
import { LoginStatusFooter } from "@/app/login/LoginStatusFooter";
import {
  loginCopy,
  readLoginLocale,
  writeLoginLocale,
  type LoginLocale,
} from "@/app/login/login-i18n";
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
  mapAdminLoginError,
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

const cardClass =
  "bg-card/75 dark:bg-card/60 border border-border/60 rounded-[24px] p-8 sm:p-10 " +
  "backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.25)] space-y-6";

const inputClass =
  "w-full h-14 bg-secondary/50 rounded-2xl px-4 text-base border border-border/40 " +
  "placeholder:text-muted-foreground/45 focus:border-primary/50 focus:bg-secondary/70 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all duration-200";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80";

const primaryBtnClass =
  "w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-semibold " +
  "hover:bg-primary/92 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 " +
  "disabled:opacity-55 disabled:hover:scale-100 disabled:cursor-not-allowed " +
  "flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.08)]";

const modeMotion = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.2 },
};

export function LoginScreen({onAdmin, onInspector, onWorker}: {onAdmin:(session: AdminSession)=>void; onInspector:(session: AdminSession)=>void; onWorker:(emp:DirectoryEmployee)=>void}) {
  const adminUsers = useMemo(() => listAdminUsersForLogin(), []);
  const inspectorUsers = useMemo(() => listInspectorUsersForLogin(), []);
  const [mode, setMode] = useState<"pick"|"admin"|"worker"|"inspector">("pick");
  const [locale, setLocale] = useState<LoginLocale>(readLoginLocale);
  const copy = loginCopy(locale);

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
    setPassError("");
    setPassLoading(true);
    try {
      const session = await verifyAdminLogin(selectedAdmin.login, password);
      if (!session) {
        setPassError("Błędne hasło");
        setPassword("");
        void recordSecurityAudit({
          actor: selectedAdmin.login,
          category: "AUTH",
          action: "admin_login_failed",
          severity: "warn",
          summary: `Nieudane logowanie: ${selectedAdmin.login}`,
          detail: JSON.stringify({ login: selectedAdmin.login }),
        }).catch(() => {});
        return;
      }
      if (session.role === "inspector") {
        setPassError("Użyj logowania Inspektor");
        setPassword("");
        return;
      }
      if (rememberPassword) {
        try {
          await saveRememberedAdminPassword(selectedAdmin.id, password);
        } catch (rememberErr) {
          console.warn("[admin-login] remember save failed", rememberErr);
          // #P0A-005 — login kontynuuje bez zapamiętanego hasła
        }
      } else {
        clearRememberedAdminPassword();
      }
      onAdmin(session);
    } catch (e) {
      console.warn("[admin-login] failed", e);
      setPassError(mapAdminLoginError(e));
      setPassword("");
    } finally {
      setPassLoading(false);
    }
  };

  const handleInspectorLogin = async () => {
    if (!selectedInspector) { setPassError("Brak kont inspektorów"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassError("");
    setPassLoading(true);
    try {
      const session = await verifyAdminLogin(selectedInspector.login, password);
      if (!session || session.role !== "inspector") {
        setPassError("Błędne hasło");
        setPassword("");
        return;
      }
      if (rememberPassword) {
        try {
          await saveRememberedAdminPassword(selectedInspector.id, password);
        } catch (rememberErr) {
          console.warn("[inspector-login] remember save failed", rememberErr);
        }
      } else {
        clearRememberedAdminPassword();
      }
      onInspector(session);
    } catch (e) {
      console.warn("[inspector-login] failed", e);
      setPassError(mapAdminLoginError(e));
      setPassword("");
    } finally {
      setPassLoading(false);
    }
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

  const onLocaleChange = (next: LoginLocale) => {
    setLocale(next);
    writeLoginLocale(next);
  };

  const PasswordField = ({value, show, onToggle, onChange, onEnter, placeholder, autoFocus}: {
    value:string; show:boolean; onToggle:()=>void; onChange:(v:string)=>void;
    onEnter?:()=>void; placeholder?:string; autoFocus?:boolean;
  }) => (
    <div className="relative">
      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" strokeWidth={1.75} />
      <input type={show?"text":"password"} placeholder={placeholder||copy.passwordPh} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter?.()}
        className={`${inputClass} pl-11 pr-12`}/>
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors duration-200" aria-label={show ? "Hide" : "Show"}>
        {show ? <EyeOff size={16} strokeWidth={1.75}/> : <Eye size={16} strokeWidth={1.75}/>}
      </button>
    </div>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors duration-200"
      aria-label={copy.back}
    >
      <ArrowLeft size={16} strokeWidth={1.75}/>
    </button>
  );

  return (
    <div
      className="relative min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 py-10 sm:py-14 overflow-y-auto"
      style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <LoginAtmosphere />

      <div className="relative z-10 w-full max-w-[420px] space-y-10">
        {/* Hero */}
        <div className="text-center space-y-5 pt-6 sm:pt-2">
          <ImageWithFallback src={logoSrc} alt="WGDOM" className="h-9 sm:h-10 w-auto object-contain mx-auto opacity-95"/>
          <div className="space-y-2.5">
            <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-foreground leading-tight">
              {copy.heroTitle}
            </h1>
            <p className="text-sm text-muted-foreground max-w-[28ch] mx-auto leading-relaxed">
              {copy.heroDesc}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "pick" && (
            <motion.div key="pick" {...modeMotion} className="space-y-3">
              <button
                type="button"
                onClick={()=>setMode("admin")}
                className="w-full rounded-[24px] border border-border/50 bg-card/70 backdrop-blur-md px-5 py-5 flex items-center gap-4 hover:border-primary/30 hover:bg-card/90 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} className="text-primary" strokeWidth={1.75}/>
                </div>
                <div>
                  <p className="font-semibold text-[15px] tracking-tight">{copy.adminTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{copy.adminDesc}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={()=>setMode("inspector")}
                className="w-full rounded-[24px] border border-border/50 bg-card/70 backdrop-blur-md px-5 py-5 flex items-center gap-4 hover:border-emerald-500/30 hover:bg-card/90 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck size={22} className="text-emerald-600 dark:text-emerald-400" strokeWidth={1.75}/>
                </div>
                <div>
                  <p className="font-semibold text-[15px] tracking-tight">{copy.inspectorTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{copy.inspectorDesc}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={()=>setMode("worker")}
                className="w-full rounded-[24px] border border-border/50 bg-card/70 backdrop-blur-md px-5 py-5 flex items-center gap-4 hover:border-border hover:bg-card/90 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
              >
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                  <HardHat size={22} className="text-muted-foreground" strokeWidth={1.75}/>
                </div>
                <div>
                  <p className="font-semibold text-[15px] tracking-tight">{copy.workerTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{copy.workerDesc}</p>
                </div>
              </button>
            </motion.div>
          )}

          {mode === "admin" && (
            <motion.div key="admin" {...modeMotion} className={cardClass}>
              <div className="flex items-center gap-3">
                <BackButton onClick={()=>{setMode("pick");setPassword("");setPassError("");}} />
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-primary" strokeWidth={1.75}/>
                  <span className="text-sm font-semibold tracking-tight">{copy.adminLogin}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className={labelClass}>{copy.user}</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" strokeWidth={1.75} />
                  <select
                    value={selectedAdminId}
                    onChange={(e) => {
                      setSelectedAdminId(e.target.value);
                      setPassword("");
                      setPassError("");
                    }}
                    className={`${inputClass} pl-11 appearance-none`}
                  >
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className={labelClass}>{copy.password}</label>
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
                    {copy.remember}
                    <span className="block text-[10px] text-muted-foreground/55 mt-0.5">{copy.rememberHint}</span>
                  </span>
                </label>
              </div>
              <button type="button" onClick={handleAdminLogin} disabled={passLoading} className={primaryBtnClass}>
                {passLoading && <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"/>}
                {copy.signIn}
              </button>
            </motion.div>
          )}

          {mode === "inspector" && (
            <motion.div key="inspector" {...modeMotion} className={cardClass}>
              <div className="flex items-center gap-3">
                <BackButton onClick={()=>{setMode("pick");setPassword("");setPassError("");}} />
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={14} className="text-emerald-600 dark:text-emerald-400" strokeWidth={1.75}/>
                  <span className="text-sm font-semibold tracking-tight">{copy.inspectorLogin}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className={labelClass}>{copy.user}</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" strokeWidth={1.75} />
                  <select
                    value={selectedInspectorId}
                    onChange={(e) => {
                      setSelectedInspectorId(e.target.value);
                      setPassword("");
                      setPassError("");
                    }}
                    className={`${inputClass} pl-11 appearance-none`}
                  >
                    {inspectorUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className={labelClass}>{copy.password}</label>
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
                    {copy.remember}
                    <span className="block text-[10px] text-muted-foreground/55 mt-0.5">{copy.rememberHint}</span>
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleInspectorLogin}
                disabled={passLoading}
                className="w-full h-14 rounded-2xl bg-emerald-600 text-white text-base font-semibold hover:bg-emerald-600/92 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 disabled:opacity-55 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
              >
                {passLoading && <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"/>}
                {copy.enterPanel}
              </button>
            </motion.div>
          )}

          {mode === "worker" && (
            <motion.div key="worker" {...modeMotion} className={cardClass}>
              <div className="flex items-center gap-3">
                <BackButton onClick={resetWorkerLogin} />
                <div className="flex items-center gap-2">
                  <HardHat size={14} className="text-muted-foreground" strokeWidth={1.75}/>
                  <span className="text-sm font-semibold tracking-tight">
                    {workerStep === "setup-pin" ? copy.setupPin : copy.workerLogin}
                  </span>
                </div>
              </div>

              {dirLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : workerStep === "setup-pin" && selectedWorker ? (
                <>
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3.5 space-y-1">
                    <p className="text-sm font-semibold tracking-tight">{selectedWorker.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{copy.setupIntro}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <label className={labelClass}>{copy.newPin}</label>
                      <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin1}
                        onChange={e=>{setSetupPin1(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                        className={`${inputClass} tracking-[0.4em] text-center`} autoFocus/>
                    </div>
                    <div className="space-y-2.5">
                      <label className={labelClass}>{copy.repeatPin}</label>
                      <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin2}
                        onChange={e=>{setSetupPin2(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                        onKeyDown={e=>e.key==="Enter"&&handleWorkerSetupPin()}
                        className={`${inputClass} tracking-[0.4em] text-center`}/>
                    </div>
                  </div>
                  {workerError && <p className="text-xs text-destructive">{workerError}</p>}
                  <button type="button" onClick={handleWorkerSetupPin} disabled={setupPinLoading || setupPin1.length !== 4 || setupPin2.length !== 4}
                    className={primaryBtnClass}>
                    {setupPinLoading && <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"/>}
                    {copy.savePin}
                  </button>
                  <button type="button" onClick={()=>{setWorkerStep("login");setSetupPin1("");setSetupPin2("");setWorkerError("");}}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
                    {copy.back}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2.5">
                    <label className={labelClass}>{copy.pickSelf}</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" strokeWidth={1.75}/>
                      <input type="search" placeholder={copy.searchName} value={workerSearch}
                        onChange={e=>{setWorkerSearch(e.target.value);setWorkerError("");}}
                        className={`${inputClass} h-12 pl-11`}/>
                    </div>
                    <div className="max-h-44 overflow-y-auto rounded-2xl border border-border/50 divide-y divide-border/50">
                      {activeWorkers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">{copy.noWorkers}</p>
                      ) : activeWorkers.map((emp) => {
                        const hasPin = workerHasPhonePin(emp);
                        const sel = selectedWorkerId === emp.id;
                        return (
                          <button key={emp.id} type="button" disabled={!hasPin}
                            onClick={()=>{setSelectedWorkerId(emp.id);setWorkerError("");setWorkerCode("");}}
                            className={`w-full px-4 py-3.5 text-left transition-colors duration-200 ${sel?"bg-primary/10":"hover:bg-secondary/50"} ${!hasPin?"opacity-50 cursor-not-allowed":""}`}>
                            <p className="text-sm font-medium">{emp.name||"Bez nazwy"}</p>
                            {!hasPin && <p className="text-[10px] text-amber-500 mt-0.5">{copy.noPhone}</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedWorker && workerHasPhonePin(selectedWorker) && (
                    <>
                      <div className="space-y-2.5">
                        <label className={labelClass}>{copy.phoneLabel}</label>
                        <input type="tel" inputMode="numeric" autoComplete="off" maxLength={11}
                          placeholder={copy.phonePh} value={phonePin}
                          onChange={e=>{setPhonePin(e.target.value.replace(/\D/g,"").slice(0,9));setWorkerError("");}}
                          className={`${inputClass} tracking-widest`}/>
                      </div>
                      {workerHasPersonalPin(selectedWorker) && (
                        <div className="space-y-2.5">
                          <label className={labelClass}>{copy.pinLabel}</label>
                          <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4}
                            placeholder="••••" value={workerCode}
                            onChange={e=>{setWorkerCode(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                            onKeyDown={e=>e.key==="Enter"&&handleWorkerSubmit()}
                            className={`${inputClass} tracking-[0.4em] text-center`}/>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{copy.pinHint}</p>
                        </div>
                      )}
                      {!workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g,"").length === 9 && workerPhonePinValid(selectedWorker, phonePin) && (
                        <p className="text-[11px] text-primary/90 bg-primary/8 border border-primary/15 rounded-xl px-3.5 py-2.5">
                          {copy.firstLoginHint}
                        </p>
                      )}
                    </>
                  )}

                  {workerError && <p className="text-xs text-destructive">{workerError}</p>}

                  {selectedWorker && workerHasPhonePin(selectedWorker) && phonePin.replace(/\D/g, "").length !== 9 && (
                    <p className="text-[11px] text-muted-foreground">{copy.phoneContinue}</p>
                  )}
                  {selectedWorker && workerHasPhonePin(selectedWorker) && workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g, "").length === 9 && workerCode.length !== 4 && (
                    <p className="text-[11px] text-muted-foreground">{copy.pinContinue}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleWorkerSubmit}
                    disabled={!selectedWorker || !workerHasPhonePin(selectedWorker)}
                    className={primaryBtnClass}>
                    {selectedWorker && workerHasPersonalPin(selectedWorker) ? copy.signIn : copy.nextSetup}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <PwaInstallBanner/>
        <LoginStatusFooter copy={copy} />
      </div>

      {/* Toolbar after main content in DOM so mobile-flows back-arrow (button:has(svg).first) hits card back, not chrome */}
      <LoginToolbar copy={copy} locale={locale} onLocaleChange={onLocaleChange} />
    </div>
  );
}

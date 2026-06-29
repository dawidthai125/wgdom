import { useEffect, useMemo, useState } from "react";
import {
  Settings, X, Download, Upload, RotateCcw, UserPlus, ChevronDown, Eye, Lock, Plus, Trash2,
} from "lucide-react";
import {
  listAdminUsersForManagement,
  setAdminUserPhone,
  setAdminUserRole,
  setAdminUserPassword,
  resetAdminUserPassword,
  createAdminUser,
  deleteAdminUser,
  adminRoleLabel,
  type AdminAssignableRole,
  type AdminSession,
  type SecurityAuditActor,
} from "@/lib/admin-auth";
import { saveAppSettings, type AppSettings } from "@/lib/app-settings";
import {
  resetTendersPipeline,
  resetTendersKeywords,
  resetTendersCompanyProfile,
  resetAllTendersSection,
} from "@/lib/tenders-admin";
import { listLocalJobsSnapshots } from "@/lib/jobs-safety";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";

export interface AdminBackupTools {
  exportBackup: () => void;
  importBackup: (file: File) => void;
  restoreAllDataFromCloud: (source: "prev" | "prev2" | "today") => void;
  restoreAllDataFromLocal: () => void;
  restorePayrollFromCloud: (source?: "prev" | "prev2") => void;
  restoreJobsFromCloud: (source: "prev" | "prev2" | "today") => void;
  restoreJobsFromLocal: () => void;
  restoreBusy: boolean;
  jobsBackupStatus: { current: number; prev: number; prev2: number; today: number } | null;
  payrollBackupStatus: { employeesPrev: number; employeesPrev2: number; archivePrev: number } | null;
  fullDataBackupStatus: { dailyBackupDate: string | null; hasPrev: boolean } | null;
  localDataSnapshotLabel: string | null;
}

export function AdminSettingsModal({
  onClose,
  appSettings,
  onAppSettingsChange,
  backupTools,
  adminSession,
}: {
  onClose: () => void;
  appSettings: AppSettings;
  onAppSettingsChange: (next: AppSettings) => void;
  backupTools: AdminBackupTools;
  adminSession: AdminSession | null | undefined;
}) {
  useModalScrollLock(true);
  const auditActor: SecurityAuditActor | undefined = adminSession
    ? { userId: adminSession.id, displayName: adminSession.displayName }
    : undefined;
  const [refreshKey, setRefreshKey] = useState(0);
  const users = useMemo(() => listAdminUsersForManagement(), [refreshKey]);
  const [drafts, setDrafts] = useState<Record<string, { pw: string; pw2: string; show: boolean }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ userId: string; text: string; ok: boolean } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLogin, setNewLogin] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [newRole, setNewRole] = useState<AdminAssignableRole>("moderator");
  const [newShow, setNewShow] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (!next[u.id]) next[u.id] = { pw: "", pw2: "", show: false };
      }
      return next;
    });
    setPhoneDrafts((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (!(u.id in next)) next[u.id] = u.phone;
      }
      return next;
    });
  }, [users]);

  const reload = () => setRefreshKey((k) => k + 1);

  const updateDraft = (userId: string, patch: Partial<{ pw: string; pw2: string; show: boolean }>) => {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
    setMsg(null);
  };

  const handlePhoneSave = async (userId: string) => {
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserPhone(userId, phoneDrafts[userId] ?? "");
      reload();
      setMsg({ userId, text: "Numer zapisany", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zapisać numeru", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: AdminAssignableRole) => {
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserRole(userId, role, auditActor);
      reload();
      setMsg({ userId, text: `Rola zmieniona na ${adminRoleLabel(role)}`, ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zmienić roli", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (userId: string) => {
    const d = drafts[userId];
    if (!d) return;
    if (d.pw.length < 6) {
      setMsg({ userId, text: "Hasło musi mieć co najmniej 6 znaków", ok: false });
      return;
    }
    if (d.pw !== d.pw2) {
      setMsg({ userId, text: "Hasła nie pasują", ok: false });
      return;
    }
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserPassword(userId, d.pw, auditActor);
      setDrafts((prev) => ({ ...prev, [userId]: { pw: "", pw2: "", show: false } }));
      reload();
      setMsg({ userId, text: "Hasło zmienione — działa na wszystkich urządzeniach po sync", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zapisać", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async (userId: string) => {
    if (!window.confirm("Przywrócić hasło fabryczne (startowe) dla tego użytkownika?")) return;
    setBusyId(userId);
    setMsg(null);
    try {
      await resetAdminUserPassword(userId, auditActor);
      setDrafts((prev) => ({ ...prev, [userId]: { pw: "", pw2: "", show: false } }));
      reload();
      setMsg({ userId, text: "Przywrócono hasło startowe", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się przywrócić", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (userId: string, displayName: string) => {
    if (!window.confirm(`Usunąć użytkownika ${displayName}?`)) return;
    setBusyId(userId);
    setMsg(null);
    try {
      await deleteAdminUser(userId, auditActor);
      reload();
      setMsg(null);
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się usunąć", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleAddUser = async () => {
    setAddMsg(null);
    if (newLogin.trim().length < 2) {
      setAddMsg({ text: "Login musi mieć co najmniej 2 znaki", ok: false });
      return;
    }
    if (newPw.length < 6) {
      setAddMsg({ text: "Hasło musi mieć co najmniej 6 znaków", ok: false });
      return;
    }
    if (newPw !== newPw2) {
      setAddMsg({ text: "Hasła nie pasują", ok: false });
      return;
    }
    setAddBusy(true);
    try {
      await createAdminUser({ login: newLogin.trim(), password: newPw, role: newRole, auditActor });
      setNewLogin("");
      setNewPw("");
      setNewPw2("");
      setNewRole("moderator");
      setShowAddForm(false);
      reload();
      setAddMsg({ text: "Użytkownik dodany", ok: true });
    } catch (err) {
      setAddMsg({ text: err instanceof Error ? err.message : "Nie udało się dodać użytkownika", ok: false });
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] modal-overlay flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col modal-sheet">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-primary"/>
            <span className="text-sm font-semibold">Ustawienia administratorów</span>
          </div>
          <button type="button" onClick={onClose} className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4" data-keyboard-aware>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tylko Super Administrator. Hasła i role synchronizowane w chmurze — obowiązują na telefonie i komputerze.
          </p>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Funkcje aplikacji
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.athPreviewEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, athPreviewEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Podgląd kosztorysów ATH/NOR w przeglądarce</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Włączone domyślnie (best-effort dla plików .ath z NORMA). Super Admin może wyłączyć.
                  PDF zawsze można podglądać; pobieranie i email działają niezależnie od tego przełącznika.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.tendersTabForStaffEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, tendersTabForStaffEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Zakładka Przetargi dla administratorów i moderatorów</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Wyłączone domyślnie. Super Administrator zawsze widzi Przetargi w menu.
                  Po włączeniu — Administrator i Moderator też mają dostęp do pipeline BZP (wspólna chmura).
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.instructionsForAdminEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, instructionsForAdminEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Instrukcja dla administratorów</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Wyłączone domyślnie. Super Administrator zawsze widzi Instrukcję w menu.
                  Po włączeniu — Administrator ma dostęp do pomocy krok po kroku.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.changesForAdminEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, changesForAdminEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Zmiany dla administratorów</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Wyłączone domyślnie. Super Administrator zawsze widzi Zmiany w menu.
                  Po włączeniu — Administrator ma dostęp do historii wersji aplikacji.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Przetargi BZP — skan i reset
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                ["bzpScanDays", "Dni wstecz", 7, 365],
                ["bzpScanPages", "Strony PL02", 1, 20],
                ["bzpScanOrgPages", "Strony / org", 1, 20],
                ["bzpAutoRefreshHours", "Auto-sync (h)", 1, 168],
              ] as const).map(([key, label, min, max]) => (
                <label key={key} className="text-[10px] text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={appSettings[key]}
                    onChange={async (e) => {
                      const v = Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min));
                      const next = { ...appSettings, [key]: v };
                      onAppSettingsChange(next);
                      await saveAppSettings(next);
                    }}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                  />
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Pipeline, profil firmy i słownik synchronizują się w chmurze (<code>kw-tenders-*</code>) — backup JSON je obejmuje.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {([
                ["Wyczyść pipeline", resetTendersPipeline],
                ["Reset słownika", resetTendersKeywords],
                ["Reset profilu firmy", resetTendersCompanyProfile],
                ["Reset całej sekcji", resetAllTendersSection],
              ] as const).map(([label, fn]) => (
                <button
                  key={label}
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`${label}? Tej operacji nie można cofnąć.`)) return;
                    try {
                      await fn();
                      alert(`${label} — gotowe. Odśwież zakładkę Przetargi.`);
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Błąd resetu");
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[10px] font-medium"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Kopie zapasowe
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Przywracanie scala dane z chmurą — bogatsze wpisy wygrywają (jak przy starcie aplikacji). Eksport / import dostępny też w górnym pasku dla wszystkich adminów.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={backupTools.exportBackup} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium transition-colors">
                <Download size={13}/>Eksportuj backup
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium transition-colors cursor-pointer">
                <Upload size={13}/>Importuj backup
                <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) backupTools.importBackup(f); e.target.value = ""; }}/>
              </label>
            </div>
            {(backupTools.jobsBackupStatus || backupTools.fullDataBackupStatus || backupTools.localDataSnapshotLabel) && (
              <p className="text-[10px] text-muted-foreground leading-snug">
                {backupTools.jobsBackupStatus && (backupTools.jobsBackupStatus.prev > 0 || backupTools.jobsBackupStatus.prev2 > 0) && (
                  <>Kopie chmury (roboty): {backupTools.jobsBackupStatus.prev} / {backupTools.jobsBackupStatus.prev2}</>
                )}
                {backupTools.fullDataBackupStatus?.dailyBackupDate && (
                  <>{backupTools.jobsBackupStatus ? " · " : ""}Kopia dzienna: {backupTools.fullDataBackupStatus.dailyBackupDate}</>
                )}
                {backupTools.localDataSnapshotLabel && (
                  <>{backupTools.jobsBackupStatus || backupTools.fullDataBackupStatus?.dailyBackupDate ? " · " : ""}Lokalnie: {backupTools.localDataSnapshotLabel}</>
                )}
              </p>
            )}
            <div className="space-y-1.5 pt-1 border-t border-amber-500/15">
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.fullDataBackupStatus?.hasPrev} onClick={() => backupTools.restoreAllDataFromCloud("prev")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć wszystkie dane (chmura)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.localDataSnapshotLabel} onClick={() => backupTools.restoreAllDataFromLocal()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć wszystkie dane (lokalnie)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.payrollBackupStatus?.employeesPrev} onClick={() => backupTools.restorePayrollFromCloud("prev")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć listę płac (chmura)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.jobsBackupStatus?.prev} onClick={() => backupTools.restoreJobsFromCloud("prev")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć roboty (chmura)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || listLocalJobsSnapshots().length === 0} onClick={() => backupTools.restoreJobsFromLocal()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć roboty (lokalnie)
              </button>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Numery kontaktowe użytkowników
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Przy każdym koncie poniżej wpisz numer — inspektor zobaczy go po najechaniu na imię autora treści.
            </p>
          </div>

          {/* Kreator — nowy użytkownik */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => { setShowAddForm((v) => !v); setAddMsg(null); }}
              className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-primary"
            >
              <span className="flex items-center gap-2"><UserPlus size={15}/> Dodaj użytkownika</span>
              <ChevronDown size={14} className={`transition-transform ${showAddForm ? "rotate-180" : ""}`}/>
            </button>
            {showAddForm && (
              <div className="space-y-3 pt-1 border-t border-primary/10">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Login (wyświetlany przy logowaniu)</label>
                  <input
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value)}
                    placeholder="np. Jan"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Poziom dostępu</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminAssignableRole)}
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="moderator">Moderator</option>
                    <option value="inspector">Inspektor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Hasło</label>
                  <div className="relative">
                    <input
                      type={newShow ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 6 znaków"
                      className="w-full bg-background rounded-lg px-3 py-2.5 pr-10 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => setNewShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Eye size={14}/>
                    </button>
                  </div>
                  <input
                    type={newShow ? "text" : "password"}
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                    placeholder="Powtórz hasło"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                {addMsg && <p className={`text-xs ${addMsg.ok ? "text-green-500" : "text-destructive"}`}>{addMsg.text}</p>}
                <button
                  type="button"
                  disabled={addBusy || !newLogin.trim() || !newPw || !newPw2}
                  onClick={handleAddUser}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {addBusy ? "…" : <><Plus size={12}/> Utwórz konto</>}
                </button>
              </div>
            )}
          </div>

          {users.map((u) => {
            const d = drafts[u.id] ?? { pw: "", pw2: "", show: false };
            const isBusy = busyId === u.id;
            const userMsg = msg?.userId === u.id ? msg : null;
            return (
              <div key={u.id} className="bg-secondary/40 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">login: {u.login}{u.isCustom && " · dodany"}</p>
                  </div>
                  {u.role === "super_admin" ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-primary/15 text-primary">
                      Super Admin
                    </span>
                  ) : u.role === "inspector" ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Inspektor
                    </span>
                  ) : (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${u.passwordCustomized ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.passwordCustomized ? "Hasło zmienione" : "Hasło startowe"}
                    </span>
                  )}
                </div>

                {u.canChangeRole && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Poziom dostępu</label>
                    <select
                      value={u.role === "super_admin" ? "admin" : u.role}
                      disabled={isBusy}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as AdminAssignableRole)}
                      className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none disabled:opacity-50"
                    >
                      <option value="admin">Administrator</option>
                      <option value="moderator">Moderator</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Moderator — bez stawek PLN/h. Administrator — pełny dostęp (na razie).
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Numer telefonu (dla inspektora)</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneDrafts[u.id] ?? u.phone}
                      disabled={isBusy}
                      onChange={(e) => setPhoneDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      onBlur={() => {
                        if ((phoneDrafts[u.id] ?? u.phone) !== u.phone) handlePhoneSave(u.id);
                      }}
                      placeholder="+48 …"
                      className="flex-1 bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Inspektor zobaczy ten numer po najechaniu na imię {u.displayName} przy treściach w aplikacji.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nowe hasło</label>
                  <div className="relative">
                    <input
                      type={d.show ? "text" : "password"}
                      value={d.pw}
                      onChange={(e) => updateDraft(u.id, { pw: e.target.value })}
                      placeholder="Min. 6 znaków"
                      className="w-full bg-background rounded-lg px-3 py-2.5 pr-10 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => updateDraft(u.id, { show: !d.show })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Eye size={14}/>
                    </button>
                  </div>
                  <label className="text-xs text-muted-foreground">Potwierdź hasło</label>
                  <input
                    type={d.show ? "text" : "password"}
                    value={d.pw2}
                    onChange={(e) => updateDraft(u.id, { pw2: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSave(u.id)}
                    placeholder="Powtórz hasło"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                {userMsg && (
                  <p className={`text-xs ${userMsg.ok ? "text-green-500" : "text-destructive"}`}>{userMsg.text}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy || !d.pw || !d.pw2}
                    onClick={() => handleSave(u.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? "…" : <><Lock size={12}/> Zmień hasło</>}
                  </button>
                  {u.isBuiltin && u.passwordCustomized && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReset(u.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw size={12}/> Przywróć startowe
                    </button>
                  )}
                  {u.canDelete && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(u.id, u.displayName)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-xs font-medium text-destructive disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={12}/> Usuń
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────


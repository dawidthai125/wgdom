import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { AdminSidebar } from "@/app/admin/AdminSidebar";
import { AdminTopbar } from "@/app/admin/AdminTopbar";
import { GlobalSearchPanel } from "@/app/admin/GlobalSearchPanel";
import { AdminViewRouter } from "@/app/admin/AdminViewRouter";
import { AdminMobileNav } from "@/app/admin/AdminMobileNav";
import { buildAdminNavItems, splitMobileNav, type View } from "@/app/admin/admin-nav";
import { ContactsView } from "@/app/ContactsView";
import { DirectoryView } from "@/app/DirectoryView";
import { ArchiveView } from "@/app/ArchiveView";
import { DashboardView } from "@/app/DashboardView";
import { AdminSettingsModal } from "@/app/AdminSettingsModal";
import { ScheduleView } from "@/app/ScheduleView";
import { EmployeeSmsModal } from "@/app/EmployeeSmsModal";
import { SmsModalErrorBoundary } from "@/app/SmsModalErrorBoundary";
import { AlertTriangle } from "lucide-react";
import { triggerWeeklyBackupEmail } from "@/lib/weekly-backup-email";
import {
  DATA_KEYS,
  pushKeysToCloud,
  pushAllDataToCloud,
  fetchKeysFromCloud,
  normalizeJobsValue,
  mergeJobsById,
  fetchJobsBackupStatus,
  restoreCloudJobsBackup,
  mergeWeekEmployees,
  weekEmployeesSamePerson,
  mergeArchive,
  mergeDirectory,
  mergeContacts,
  mergeDataKey,
  pushKeysToCloudSafe,
  pullAndMergeDataBundle,
  pushMergedDataBundleToCloud,
  fetchPayrollBackupStatus,
  restoreCloudPayrollBackup,
  fetchFullDataBackupStatus,
  restoreAllCloudDataBackup,
  addDeletedJobId,
  pushJobsAfterDelete,
  getDeletedJobIds,
  getDeletedDirectoryIds,
  getDeletedContactsIds,
  getDeletedArchiveIds,
  getDeletedEmployeeLeaveIds,
  addDeletedEmployeeLeaveId,
  addDeletedArchiveId,
  pushDirectoryToCloud,
  pushWeekEmployeesToCloud,
  pushEmployeeLeavesToCloud,
  ADMIN_PASSWORDS_KEY,
  ADMIN_USERS_CONFIG_KEY,
  isSupabaseConfigured,
} from "@/lib/cloud-sync";
import { saveLocalDataSnapshot, restoreLocalDataSnapshot, listLocalDataSnapshots, readLocalDataBundle } from "@/lib/local-data-backup";
import { saveLocalJobsSnapshot, restoreLocalJobsSnapshot, listLocalJobsSnapshots } from "@/lib/jobs-safety";
import { adminCanViewTendersTab } from "@/lib/admin-auth";
import type { DirectoryEmployee, WeekEmployee, WeekSnapshot, Job } from "@/app/app-domain";
import {
  isProductionDirectoryEmployee,
  filterProductionDirectory,
  filterProductionActiveDirectory,
  filterProductionWeekEmployees,
  normalizeDirectoryTestFlags,
  weekEmployeeFromDir,
  fmtDate,
  getWeekRange,
  normalizeJobsList,
  localIsoDate,
  todayIsoDate,
  todayFieldWorkStats,
  buildWeekSnapshot,
} from "@/app/app-domain";
import { useAdminAccess } from "@/app/admin-access";
import { syncAlertsSeenFromCloud } from "@/lib/inspector-stats";
import { syncAppSettingsFromCloud, loadAppSettingsLocal, type AppSettings } from "@/lib/app-settings";
import {
  mergeTenderDataKey,
  TENDERS_PIPELINE_KEY,
  TENDERS_COMPANY_PROFILE_KEY,
  TENDERS_CUSTOM_KEYWORDS_KEY,
} from "@/lib/tenders-sync";
import { saveAs } from "file-saver";
import { consumePendingDeepLink, type DeepLinkRoute } from "@/lib/deep-link";
import { initialAutoSyncSuppressUntil } from "@/lib/cloud-bootstrap";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";
import { Toaster, toast } from "sonner";
import { AppInnerWithAuth } from "@/app/AppInnerWithAuth";
import { CloudLoader } from "@/app/CloudLoader";
import { useLocalStorage, setSkipApplyWriteTimestamps } from "@/app/hooks/useLocalStorage";
import type { EmailContact } from "@/lib/email-contacts";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import { mergeEmployeeLeaves } from "@/lib/employee-leaves";
import { computePayrollCashSplitWithCarry } from "@/lib/payroll-carry-forward";
import { getPayrollWeekRange, getPayrollClosingWeekRange, isPayrollWeekClosed } from "@/lib/payroll-cycle";

function AppInner({onLogout}: {onLogout?: ()=>void}) {
  const { session: adminSession, canViewRates } = useAdminAccess();
  const week = getWeekRange();
  const [directory, setDirectory] = useLocalStorage<DirectoryEmployee[]>("kw-directory", []);
  const [weekEmployees, setWeekEmployees] = useLocalStorage<WeekEmployee[]>("kw-week-employees", []);
  const [savedWeeks, setSavedWeeks] = useLocalStorage<WeekSnapshot[]>("kw-archive", []);
  const [weekFrom, setWeekFrom] = useLocalStorage("kw-weekFrom", week.from);
  const [weekTo, setWeekTo] = useLocalStorage("kw-weekTo", week.to);
  const [jobs, setJobs] = useLocalStorage<Job[]>("kw-jobs", []);
  const [contacts, setContacts] = useLocalStorage<EmailContact[]>("kw-contacts", []);
  const [employeeLeaves, setEmployeeLeaves] = useLocalStorage<EmployeeLeave[]>("kw-employee-leaves", []);
  const [view, setView] = useState<View>("dashboard");
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingTenderId, setPendingTenderId] = useState<string | null>(null);
  const [pendingInspectorJobId, setPendingInspectorJobId] = useState<string | null>(null);
  const [inspectorInitialTab, setInspectorInitialTab] = useState<"activity" | "portfolio">("activity");
  const [alertsSeenTick, setAlertsSeenTick] = useState(0);
  const [pendingPayrollEmpId, setPendingPayrollEmpId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettingsLocal());
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [payrollDetailOpen, setPayrollDetailOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState<{ view: View; label: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error"|"offline">("idle");
  const [syncError, setSyncError] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const settledSyncTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const tabVisibleRef = useRef(typeof document !== "undefined" ? !document.hidden : true);
  const initialSyncDone = useRef(false);
  const suppressAutoSyncUntilRef = useRef(initialAutoSyncSuppressUntil());
  const pullInFlightRef = useRef(false);
  const pendingAutoSyncRef = useRef(false);
  const suppressWakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteMergeInFlightRef = useRef(false);
  const payrollRosterPushRef = useRef(false);
  const autoSyncMountSettledRef = useRef(false);
  const deleteJobsInFlightRef = useRef(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [jobsBackupStatus, setJobsBackupStatus] = useState<{ current: number; prev: number; prev2: number; today: number } | null>(null);
  const [payrollBackupStatus, setPayrollBackupStatus] = useState<{ employeesPrev: number; employeesPrev2: number; archivePrev: number } | null>(null);
  const [fullDataBackupStatus, setFullDataBackupStatus] = useState<{ dailyBackupDate: string | null; hasPrev: boolean } | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const productionWeekEmployees = useMemo(
    () => filterProductionWeekEmployees(weekEmployees, directory),
    [weekEmployees, directory],
  );

  useEffect(() => {
    syncAlertsSeenFromCloud().catch(() => {});
  }, []);

  useEffect(() => {
    syncAppSettingsFromCloud().then(setAppSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const normalized = normalizeDirectoryTestFlags(directory);
    if (normalized !== directory) {
      remoteMergeInFlightRef.current = true;
      setDirectory(normalized);
    }
  }, [directory, setDirectory]);

  useEffect(() => {
    setWeekEmployees((prev) => {
      const next = filterProductionWeekEmployees(prev, directory);
      if (next.length === prev.length) return prev;
      remoteMergeInFlightRef.current = true;
      return next;
    });
  }, [directory, setWeekEmployees]);

  useEffect(() => {
    fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    fetchPayrollBackupStatus().then((s) => {
      if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
    }).catch(() => {});
    fetchFullDataBackupStatus().then((s) => {
      if (!s?.keys) return;
      const hasPrev = Object.values(s.keys).some((k) => k.prev > 0 || k.prev2 > 0);
      setFullDataBackupStatus({ dailyBackupDate: s.dailyBackupDate, hasPrev });
    }).catch(() => {});
  }, [jobs.length, weekEmployees.length, savedWeeks.length, directory.length, contacts.length]);

  const commitDirectory = useCallback(() => {
    pushDirectoryToCloud(directory).catch(() => {});
  }, [directory]);

  const commitEmployeeLeaves = useCallback((next?: EmployeeLeave[], deletedId?: string) => {
    const payload = next ?? employeeLeaves;
    let deletedIds = getDeletedEmployeeLeaveIds();
    if (deletedId) deletedIds = addDeletedEmployeeLeaveId(deletedId);
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushEmployeeLeavesToCloud(payload, deletedIds).catch(() => {});
  }, [employeeLeaves]);

  const clearAutoSyncTimers = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (suppressWakeTimerRef.current) {
      clearTimeout(suppressWakeTimerRef.current);
      suppressWakeTimerRef.current = null;
    }
  }, []);

  const clearPendingAutoSync = useCallback(() => {
    pendingAutoSyncRef.current = false;
    clearAutoSyncTimers();
  }, [clearAutoSyncTimers]);

  const adminDataBundle = useCallback(
    () => [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves] as unknown[],
    [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves],
  );

  const applyAdminDataBundle = useCallback((merged: unknown[]) => {
    const [dir, emps, arch, wf, wt, jbs, cont, leaves] = merged;
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    remoteMergeInFlightRef.current = true;
    setSkipApplyWriteTimestamps(true);
    try {
      if (Array.isArray(dir)) setDirectory(dir as DirectoryEmployee[]);
      if (Array.isArray(emps)) setWeekEmployees(emps as WeekEmployee[]);
      if (Array.isArray(arch)) setSavedWeeks(arch as WeekSnapshot[]);
      if (typeof wf === "string" && wf) setWeekFrom(wf);
      if (typeof wt === "string" && wt) setWeekTo(wt);
      if (Array.isArray(jbs)) {
        const tombstones = new Set(getDeletedJobIds());
        const withoutDeleted = tombstones.size
          ? (jbs as Job[]).filter((j) => !tombstones.has(j.id))
          : (jbs as Job[]);
        setJobs(normalizeJobsList(withoutDeleted as unknown[]));
      }
      if (Array.isArray(cont)) setContacts(cont as EmailContact[]);
      if (Array.isArray(leaves)) {
        const tombstones = new Set(getDeletedEmployeeLeaveIds());
        const filtered = tombstones.size
          ? (leaves as EmployeeLeave[]).filter((l) => !tombstones.has(l.id))
          : (leaves as EmployeeLeave[]);
        setEmployeeLeaves(filtered);
      }
    } finally {
      setSkipApplyWriteTimestamps(false);
    }
  }, [setDirectory, setWeekEmployees, setSavedWeeks, setWeekFrom, setWeekTo, setJobs, setContacts, setEmployeeLeaves]);

  const deleteJobsByIds = useCallback(async (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    deleteJobsInFlightRef.current = true;
    clearPendingAutoSync();
    suppressAutoSyncUntilRef.current = Date.now() + 12_000;
    let deletedIds = getDeletedJobIds();
    for (const id of unique) {
      deletedIds = addDeletedJobId(id);
    }
    let updated: Job[] = [];
    setJobs((prev) => {
      updated = prev.filter((j) => !unique.includes(j.id));
      return updated;
    });
    try {
      await pushJobsAfterDelete(updated, deletedIds);
      toast.success(unique.length === 1 ? "Robota usunięta" : `Usunięto ${unique.length} robot`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Błąd zapisu do chmury";
      toast.error("Usunięto lokalnie, ale sync chmury nie powiódł się", { description: msg });
    } finally {
      deleteJobsInFlightRef.current = false;
    }
  }, [clearPendingAutoSync, setJobs]);

  const pullFromCloudAndMerge = useCallback(async () => {
    if (!tabVisibleRef.current || !isSupabaseConfigured() || pullInFlightRef.current) return;
    if (deleteJobsInFlightRef.current) return;
    pullInFlightRef.current = true;
    clearAutoSyncTimers();
    try {
      const merged = await pullAndMergeDataBundle(adminDataBundle());
      applyAdminDataBundle(merged);
    } catch {
      /* offline — zostaw lokalne dane */
    } finally {
      pullInFlightRef.current = false;
    }
  }, [adminDataBundle, applyAdminDataBundle, clearAutoSyncTimers]);

  const pushToCloud = pushAllDataToCloud;

  const runCloudSync = useCallback(async (opts?: { toastSuccess?: boolean }) => {
    if (!tabVisibleRef.current) return;
    if (pullInFlightRef.current) return;
    if (deleteJobsInFlightRef.current) return;
    if (!isSupabaseConfigured()) {
      setSyncStatus("offline");
      setSyncError("Brak VITE_SUPABASE_* w Vercel — ustaw zmienne i zrób redeploy");
      return;
    }
    pendingAutoSyncRef.current = false;
    if (suppressWakeTimerRef.current) {
      clearTimeout(suppressWakeTimerRef.current);
      suppressWakeTimerRef.current = null;
    }
    if (jobs.length > 0) saveLocalJobsSnapshot(jobs);
    saveLocalDataSnapshot();
    setSyncStatus("saving");
    setSyncError("");
    try {
      const merged = await pullAndMergeDataBundle(adminDataBundle());
      applyAdminDataBundle(merged);
      await pushMergedDataBundleToCloud(merged);
      setSyncStatus("saved");
      if (opts?.toastSuccess) toast.success("Zsynchronizowano z chmurą");
      setTimeout(() => setSyncStatus("idle"), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd połączenia z chmurą";
      setSyncStatus("error");
      setSyncError(msg);
      toast.error("Nie udało się wysłać do chmury", { description: msg, id: "admin-cloud-sync" });
    }
  }, [adminDataBundle, applyAdminDataBundle, jobs]);

  const fireDeferredAutoSync = useCallback(() => {
    suppressWakeTimerRef.current = null;
    if (remoteMergeInFlightRef.current) {
      return;
    }
    if (Date.now() < suppressAutoSyncUntilRef.current) {
      const delay = suppressAutoSyncUntilRef.current - Date.now();
      suppressWakeTimerRef.current = setTimeout(() => {
        suppressWakeTimerRef.current = null;
        fireDeferredAutoSync();
      }, delay);
      return;
    }
    if (!pendingAutoSyncRef.current) {
      return;
    }
    if (!tabVisibleRef.current) {
      return;
    }
    if (pullInFlightRef.current) {
      return;
    }
    pendingAutoSyncRef.current = false;
    void runCloudSync();
  }, [runCloudSync]);

  const scheduleWakeAtSuppressExpiry = useCallback(() => {
    const delay = suppressAutoSyncUntilRef.current - Date.now();
    if (suppressWakeTimerRef.current) {
      clearTimeout(suppressWakeTimerRef.current);
      suppressWakeTimerRef.current = null;
    }
    if (delay <= 0) {
      fireDeferredAutoSync();
      return;
    }
    suppressWakeTimerRef.current = setTimeout(() => {
      suppressWakeTimerRef.current = null;
      fireDeferredAutoSync();
    }, delay);
  }, [fireDeferredAutoSync]);

  const scheduleAutoCloudSync = useCallback(() => {
    if (!initialSyncDone.current) {
      return;
    }
    if (remoteMergeInFlightRef.current) {
      return;
    }
    if (payrollRosterPushRef.current) {
      return;
    }

    const suppressed = Date.now() < suppressAutoSyncUntilRef.current;

    if (suppressed) {
      if (!autoSyncMountSettledRef.current) {
        return;
      }
      pendingAutoSyncRef.current = true;
      scheduleWakeAtSuppressExpiry();
      return;
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (!tabVisibleRef.current) return;
      if (pullInFlightRef.current) return;
      if (Date.now() < suppressAutoSyncUntilRef.current) {
        pendingAutoSyncRef.current = true;
        scheduleWakeAtSuppressExpiry();
        return;
      }
      pendingAutoSyncRef.current = false;
      void runCloudSync();
    }, 2000);
  }, [scheduleWakeAtSuppressExpiry, runCloudSync]);

  useEffect(() => {
    return registerNativeBackHandler(() => {
      if (showAdminSettings) { setShowAdminSettings(false); return true; }
      if (showSmsModal) { setShowSmsModal(false); return true; }
      if (showSaveConfirm) { setShowSaveConfirm(false); return true; }
      if (mobileMoreOpen) { setMobileMoreOpen(false); return true; }
      if (showSearch) { setShowSearch(false); setGlobalSearch(""); return true; }
      return false;
    });
  }, [showAdminSettings, showSmsModal, showSaveConfirm, mobileMoreOpen, showSearch]);

  useEffect(() => {
    return onNativeAppResume(() => {
      if (tabVisibleRef.current) void pullFromCloudAndMerge();
    });
  }, [pullFromCloudAndMerge]);

  // Po CloudLoader (merge chmura↔local) — zapis tylko przy zmianach użytkownika
  useEffect(() => {
    initialSyncDone.current = true;
    queueMicrotask(() => { autoSyncMountSettledRef.current = true; });
  }, []);

  // Auto-save to cloud on any data change (debounced 2s, only after initial sync; nie w ukrytej karcie)
  useEffect(() => {
    scheduleAutoCloudSync();
    remoteMergeInFlightRef.current = false;
  }, [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves, scheduleAutoCloudSync]);

  useEffect(() => () => clearAutoSyncTimers(), [clearAutoSyncTimers]);

  useEffect(() => {
    const onVis = () => {
      tabVisibleRef.current = !document.hidden;
      if (!document.hidden) void pullFromCloudAndMerge();
    };
    const onFocus = () => {
      tabVisibleRef.current = true;
      void pullFromCloudAndMerge();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    tabVisibleRef.current = !document.hidden;
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [pullFromCloudAndMerge]);

  // Backup
  const exportBackup = () => {
    const data: Record<string,unknown> = {};
    [...DATA_KEYS, ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY].forEach(k=>{
      const v=localStorage.getItem(k); if(v) data[k]=JSON.parse(v);
    });
    saveAs(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),`backup-${new Date().toISOString().slice(0,10)}.json`);
  };
  const importBackup = (file: File) => {
    const reader=new FileReader();
    reader.onload=async (e)=>{
      try {
        const data=JSON.parse(e.target?.result as string);
        if (data["kw-jobs"] != null) {
          const local = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]"));
          data["kw-jobs"] = mergeJobsById(local, normalizeJobsValue(data["kw-jobs"]));
        }
        if (data["kw-week-employees"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-week-employees") || "[]");
          data["kw-week-employees"] = mergeWeekEmployees(local, data["kw-week-employees"]);
        }
        if (data["kw-archive"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-archive") || "[]");
          data["kw-archive"] = mergeArchive(local, data["kw-archive"], getDeletedArchiveIds());
        }
        if (data["kw-directory"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-directory") || "[]");
          data["kw-directory"] = mergeDirectory(local, data["kw-directory"], getDeletedDirectoryIds());
        }
        if (data["kw-contacts"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-contacts") || "[]");
          data["kw-contacts"] = mergeContacts(local, data["kw-contacts"], getDeletedContactsIds());
        }
        if (data["kw-employee-leaves"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-employee-leaves") || "[]");
          data["kw-employee-leaves"] = mergeEmployeeLeaves(local, data["kw-employee-leaves"], getDeletedEmployeeLeaveIds());
        }
        if (data[TENDERS_PIPELINE_KEY] != null) {
          const local = JSON.parse(localStorage.getItem(TENDERS_PIPELINE_KEY) || "[]");
          data[TENDERS_PIPELINE_KEY] = mergeTenderDataKey(TENDERS_PIPELINE_KEY, local, data[TENDERS_PIPELINE_KEY]);
        }
        if (data[TENDERS_COMPANY_PROFILE_KEY] != null) {
          const local = JSON.parse(localStorage.getItem(TENDERS_COMPANY_PROFILE_KEY) || "null");
          data[TENDERS_COMPANY_PROFILE_KEY] = mergeTenderDataKey(TENDERS_COMPANY_PROFILE_KEY, local, data[TENDERS_COMPANY_PROFILE_KEY]);
        }
        if (data[TENDERS_CUSTOM_KEYWORDS_KEY] != null) {
          const local = JSON.parse(localStorage.getItem(TENDERS_CUSTOM_KEYWORDS_KEY) || "null");
          data[TENDERS_CUSTOM_KEYWORDS_KEY] = mergeTenderDataKey(TENDERS_CUSTOM_KEYWORDS_KEY, local, data[TENDERS_CUSTOM_KEYWORDS_KEY]);
        }
        Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));
        try {
          const bundle = DATA_KEYS.map((k) => {
            try {
              const raw = localStorage.getItem(k);
              return raw ? JSON.parse(raw) : null;
            } catch {
              return null;
            }
          });
          await pushAllDataToCloud(bundle);
        } catch { /* reload i tak wczyta */ }
        window.location.reload();
      } catch { alert("Błąd importu pliku."); }
    };
    reader.readAsText(file);
  };

  const restoreJobsFromCloud = async (source: "prev" | "prev2" | "today") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić roboty z chmury (${labels[source]})? Obecna lista zostanie zachowana w kopii.`)) return;
    setRestoreBusy(true);
    try {
      const { count } = await restoreCloudJobsBackup(source);
      const [cloudJobs] = await fetchKeysFromCloud(["kw-jobs"]);
      const merged = mergeJobsById(jobs, normalizeJobsValue(cloudJobs), getDeletedJobIds()) as Job[];
      const synced = normalizeJobsList(merged as unknown[]);
      localStorage.setItem("kw-jobs", JSON.stringify(synced));
      setJobs(synced);
      await pushKeysToCloud(["kw-jobs"], [synced], { replaceJobsKeys: ["kw-jobs"] });
      alert(`Przywrócono ${count} robót z kopii chmurowej. Łącznie w aplikacji: ${synced.length}.`);
      fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić kopii z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreJobsFromLocal = () => {
    const snaps = listLocalJobsSnapshots();
    if (snaps.length === 0) {
      alert("Brak lokalnych kopii robót na tym urządzeniu.");
      return;
    }
    const latest = snaps[0];
    const when = new Date(latest.at).toLocaleString("pl-PL");
    if (!window.confirm(`Przywrócić ${latest.jobs.length} robót z lokalnej kopii (${when})?`)) return;
    const restored = restoreLocalJobsSnapshot(0);
    if (!restored) { alert("Błąd odczytu lokalnej kopii."); return; }
    const merged = mergeJobsById(jobs, restored, getDeletedJobIds()) as Job[];
    const synced = normalizeJobsList(merged as unknown[]);
    setJobs(synced);
    pushKeysToCloudSafe(["kw-jobs"], [synced]).catch(() => {});
    alert(`Przywrócono lokalną kopię. Łącznie robot: ${synced.length}.`);
  };

  const restorePayrollFromCloud = async (source: "prev" | "prev2" = "prev") => {
    const label = source === "prev2" ? "starszą kopię" : "poprzedni zapis";
    if (!window.confirm(`Przywrócić listę płac i archiwum z chmury (${label})? Połączy z obecnymi danymi — bogatsze wpisy wygrywają.`)) return;
    setRestoreBusy(true);
    try {
      await restoreCloudPayrollBackup(source);
      const [cloudEmps, cloudArch] = await fetchKeysFromCloud(["kw-week-employees", "kw-archive"]);
      const mergedEmps = mergeWeekEmployees(weekEmployees, cloudEmps ?? []) as WeekEmployee[];
      const mergedArch = mergeArchive(savedWeeks, cloudArch ?? []) as WeekSnapshot[];
      localStorage.setItem("kw-week-employees", JSON.stringify(mergedEmps));
      localStorage.setItem("kw-archive", JSON.stringify(mergedArch));
      setWeekEmployees(mergedEmps);
      setSavedWeeks(mergedArch);
      await pushKeysToCloudSafe(["kw-week-employees", "kw-archive"], [mergedEmps, mergedArch]);
      alert(`Przywrócono listę płac (${mergedEmps.length} prac.) i archiwum (${mergedArch.length} tyg.).`);
      fetchPayrollBackupStatus().then((s) => {
        if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
      }).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić listy płac z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreWeekFromArchive = useCallback(() => {
    const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (!snap?.weekEmployees?.length) {
      alert("Brak pełnego archiwum dla tego tygodnia. Sprawdź zakładkę Archiwum lub import backup JSON (górny pasek / ⚙ Ustawienia).");
      return;
    }
    if (!window.confirm(`Przywrócić godziny, Sob.pr. i dodatkowe wpisy z archiwum (${fmtDate(weekFrom)} – ${fmtDate(weekTo)})?`)) return;
    setWeekEmployees(JSON.parse(JSON.stringify(snap.weekEmployees)) as WeekEmployee[]);
  }, [savedWeeks, weekFrom, weekTo, setWeekEmployees]);

  const restoreAllDataFromCloud = async (source: "prev" | "prev2" | "today" = "prev") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić WSZYSTKIE dane firmy z chmury (${labels[source]})? Scalą się z obecnymi — bogatsze wpisy wygrywają.`)) return;
    setRestoreBusy(true);
    try {
      saveLocalDataSnapshot();
      const { restoredKeys } = await restoreAllCloudDataBackup(source);
      const cloudValues = await fetchKeysFromCloud([...DATA_KEYS]);
      const localBundle = readLocalDataBundle();
      const merged = DATA_KEYS.map((key, i) => mergeDataKey(key, localBundle[key], cloudValues[i]));
      for (let i = 0; i < DATA_KEYS.length; i++) {
        localStorage.setItem(DATA_KEYS[i], JSON.stringify(merged[i]));
      }
      await pushAllDataToCloud(merged);
      alert(`Przywrócono z chmury: ${restoredKeys.join(", ")}. Strona się odświeży.`);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić danych z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreAllDataFromLocal = (usePrev = false) => {
    const snaps = listLocalDataSnapshots();
    const pick = snaps.find((s) => s.usePrev === usePrev) ?? snaps[0];
    if (!pick) {
      alert("Brak lokalnej kopii danych na tym urządzeniu.");
      return;
    }
    if (!window.confirm(`Przywrócić dane z kopii lokalnej (${new Date(pick.at).toLocaleString("pl-PL")})?`)) return;
    restoreLocalDataSnapshot(pick.usePrev);
    window.location.reload();
  };

  // Auto-backup email — w niedzielę, po zapisie tygodnia do archiwum (patrz triggerWeeklyBackupEmail)

  // Global search results
  const searchResults = useMemo(()=>{
    if(!globalSearch.trim()) return {employees:[],jobs:[]};
    const q=globalSearch.toLowerCase();
    return {
      employees: filterProductionDirectory(directory).filter((d)=>d.name.toLowerCase().includes(q)||(d.phone ?? "").includes(q)||d.position.toLowerCase().includes(q)),
      jobs: jobs.filter(j=>j.address.toLowerCase().includes(q)||j.client.toLowerCase().includes(q)||j.flatNumber.toLowerCase().includes(q)),
    };
  },[globalSearch,directory,jobs]);

  const persistPayrollRoster = useCallback((next: WeekEmployee[]) => {
    suppressAutoSyncUntilRef.current = Date.now() + 6000;
    payrollRosterPushRef.current = true;
    void pushWeekEmployeesToCloud(next)
      .finally(() => { payrollRosterPushRef.current = false; })
      .catch(() => {});
  }, []);

  const refreshSavedActiveWeekSnapshot = useCallback((nextEmployees: WeekEmployee[]) => {
    if (isPayrollWeekClosed(weekFrom, weekTo)) return;
    setSavedWeeks((prev) => {
      const existing = prev.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      if (!existing) return prev;
      const snapshot = buildWeekSnapshot(weekFrom, weekTo, nextEmployees, jobs, existing, employeeLeaves, prev);
      return prev.map((w) => (w.id === existing.id ? snapshot : w));
    });
  }, [weekFrom, weekTo, jobs, employeeLeaves, setSavedWeeks]);

  const addFromDirectory = (ids: string[]) => {
    setWeekEmployees((prev) => {
      const toAdd = directory.filter((d) => ids.includes(d.id) && isProductionDirectoryEmployee(d));
      const newEmps = toAdd.map(weekEmployeeFromDir);
      const next = [...prev, ...newEmps];
      if (newEmps.length > 0) {
        persistPayrollRoster(next);
        refreshSavedActiveWeekSnapshot(next);
      }
      return next;
    });
  };

  const removeWeekEmployee = (id: string) => {
    setWeekEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (next.length !== prev.length) {
        persistPayrollRoster(next);
        refreshSavedActiveWeekSnapshot(next);
      }
      return next;
    });
  };

  const clearAllWeekEmployees = () => {
    setWeekEmployees([]);
    persistPayrollRoster([]);
    refreshSavedActiveWeekSnapshot([]);
  };

  const replaceWeekWithAllActive = () => {
    const newEmps = filterProductionActiveDirectory(directory)
      .filter(isProductionDirectoryEmployee)
      .map(weekEmployeeFromDir);
    setWeekEmployees(newEmps);
    persistPayrollRoster(newEmps);
    refreshSavedActiveWeekSnapshot(newEmps);
  };

  const updateWeekEmployee = useCallback((updated:WeekEmployee)=>{
    setWeekEmployees((prev)=>{
      const next = prev.map((e)=>{
        if (e.id !== updated.id) return e;
        const now = new Date().toISOString();
        const rateChanged = updated.rate !== e.rate;
        const dataChanged =
          JSON.stringify({ days: updated.days, prevSaturday: updated.prevSaturday, extraCosts: updated.extraCosts, payrollCarryForward: updated.payrollCarryForward })
          !== JSON.stringify({ days: e.days, prevSaturday: e.prevSaturday, extraCosts: e.extraCosts, payrollCarryForward: e.payrollCarryForward });
        return {
          ...updated,
          settled: updated.settled ?? e.settled,
          settledUpdatedAt: updated.settledUpdatedAt ?? e.settledUpdatedAt,
          rateUpdatedAt: rateChanged ? now : updated.rateUpdatedAt ?? e.rateUpdatedAt,
          dataUpdatedAt: dataChanged ? now : updated.dataUpdatedAt ?? e.dataUpdatedAt,
        };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  },[setWeekEmployees, refreshSavedActiveWeekSnapshot]);

  const syncWeekRatesFromDirectory = useCallback(() => {
    const now = new Date().toISOString();
    const byId = new Map(directory.map((d) => [d.id, d]));
    setWeekEmployees((prev) => {
      const next = prev.map((emp) => {
        if (!emp.directoryId) return emp;
        const dir = byId.get(emp.directoryId);
        if (!dir?.defaultRate) return emp;
        return { ...emp, rate: dir.defaultRate, rateUpdatedAt: now };
      });
      void (async () => {
        payrollRosterPushRef.current = true;
        try {
          let archive = savedWeeks;
          const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
          if (existing && !isPayrollWeekClosed(weekFrom, weekTo)) {
            const snapshot = buildWeekSnapshot(weekFrom, weekTo, next, jobs, existing, employeeLeaves, savedWeeks);
            archive = savedWeeks.map((w) => (w.id === existing.id ? snapshot : w));
            try { localStorage.setItem("kw-archive", JSON.stringify(archive)); } catch { /* ignore */ }
            setSavedWeeks(archive);
          }
          await pushAllDataToCloud([directory, next, archive, weekFrom, weekTo, jobs, contacts, employeeLeaves]);
        } catch { /* auto-sync ponowi */ }
        finally { payrollRosterPushRef.current = false; }
      })();
      return next;
    });
  }, [directory, savedWeeks, weekFrom, weekTo, jobs, contacts, setWeekEmployees, setSavedWeeks]);

  const patchArchiveWeek = useCallback((weekId: string, patchEmployees: (emps: WeekEmployee[]) => WeekEmployee[]) => {
    setSavedWeeks((prev) => {
      const week = prev.find((w) => w.id === weekId);
      if (!week?.weekEmployees?.length) return prev;
      const nextEmployees = patchEmployees(week.weekEmployees);
      const snapshot = buildWeekSnapshot(week.weekFrom, week.weekTo, nextEmployees, jobs, week, employeeLeaves, savedWeeks);
      return prev.map((w) => (w.id === weekId ? snapshot : w));
    });
  }, [jobs, setSavedWeeks]);

  const updateArchiveWeekEmployee = useCallback((weekId: string, updatedEmp: WeekEmployee) => {
    patchArchiveWeek(weekId, (emps) => emps.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
  }, [patchArchiveWeek]);

  const toggleArchiveSettled = useCallback((weekId: string, empId: string) => {
    const now = new Date().toISOString();
    patchArchiveWeek(weekId, (emps) => emps.map((e) => (e.id === empId ? { ...e, settled: !e.settled, settledUpdatedAt: now } : e)));
  }, [patchArchiveWeek]);

  const toggleSettled = useCallback((id: string) => {
    const now = new Date().toISOString();
    const emp = weekEmployees.find((e) => e.id === id);
    if (!emp) return;
    const newSettled = !emp.settled;
    setWeekEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, settled: newSettled, settledUpdatedAt: now } : e));
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
    if (settledSyncTimerRef.current) clearTimeout(settledSyncTimerRef.current);
    settledSyncTimerRef.current = setTimeout(() => {
      clearPendingAutoSync();
      suppressAutoSyncUntilRef.current = 0;
      void runCloudSync();
    }, 400);
  }, [weekEmployees, weekFrom, weekTo, refreshSavedActiveWeekSnapshot, setWeekEmployees, runCloudSync, clearPendingAutoSync]);

  const saveBiweeklyBacklogWeek = useCallback((backlogFrom: string, backlogTo: string, employees: WeekEmployee[]) => {
    if (employees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === backlogFrom && w.weekTo === backlogTo);
    const snapshot = buildWeekSnapshot(backlogFrom, backlogTo, employees, jobs, existing, employeeLeaves, savedWeeks);
    snapshot.backlog = true;
    snapshot.backlogNote = "Zaległa lista płac — wypłata co 2 tygodnie";
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
  }, [savedWeeks, jobs, setSavedWeeks, employeeLeaves]);

  const doSaveWeek = useCallback(() => {
    if (weekEmployees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing, employeeLeaves, savedWeeks);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    setShowSaveConfirm(false);
    toast.success(`Tydzień zapisany · ${fmtDate(weekFrom)}–${fmtDate(weekTo)}`);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, jobs, savedWeeks, setSavedWeeks, employeeLeaves]);

  const saveWeek = () => {
    if (weekEmployees.length === 0) return;
    const alreadyExists = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (alreadyExists) { setShowSaveConfirm(true); return; }
    doSaveWeek();
  };

  const autoArchiveAndAdvance = useCallback((targetFrom: string, targetTo: string) => {
    if (weekEmployees.length > 0) {
      const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing, employeeLeaves, savedWeeks);
      if (existing) setSavedWeeks((prev) => prev.map((w) => (w.id === existing.id ? snapshot : w)));
      else setSavedWeeks((prev) => [...prev, snapshot]);
    }
    setWeekFrom(targetFrom);
    setWeekTo(targetTo);
    setWeekEmployees([]);
  }, [weekEmployees, weekFrom, weekTo, savedWeeks, jobs, setSavedWeeks, setWeekFrom, setWeekTo, setWeekEmployees, employeeLeaves]);

  const goToCurrent = useCallback(() => {
    const c = getWeekRange();
    if (weekFrom === c.from) return;
    if (weekEmployees.some((e) => !e.settled)) {
      if (!window.confirm(
        "Są nierozliczeni pracownicy (wypłata w sobotę?). Przejść do bieżącego tygodnia mimo to? Obecna lista trafi do archiwum.",
      )) return;
    }
    autoArchiveAndAdvance(c.from, c.to);
  }, [weekFrom, weekEmployees, autoArchiveAndAdvance]);

  // Auto-przejście tygodnia płac: Nd ≥20:00 lub Pn+ (gdy wszyscy rozliczeni) + auto-archiwum w Nd
  const payrollWeekCycleRef = useRef<() => void>(() => {});
  const payrollWeekAdvancedToastRef = useRef<string | null>(null);

  const trySundayArchiveOnly = useCallback(() => {
    const now = new Date();
    if (now.getDay() !== 0) return;
    const closing = getPayrollClosingWeekRange(now);
    if (weekFrom !== closing.from || weekTo !== closing.to) return;
    if (weekEmployees.some((e) => !e.settled)) return;
    const today = localIsoDate(now);
    if (localStorage.getItem("kw-last-week-auto-archive") === today) return;
    localStorage.setItem("kw-last-week-auto-archive", today);
    if (weekEmployees.length === 0) {
      const archived = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      if (archived) triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, savedWeeks);
      return;
    }
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing, employeeLeaves, savedWeeks);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, savedWeeks, jobs, setSavedWeeks, employeeLeaves]);

  const tryPayrollWeekCycle = useCallback(() => {
    const current = getPayrollWeekRange();
    const onCurrentRange = weekFrom === current.from && weekTo === current.to;

    if (!onCurrentRange) {
      if (weekEmployees.length > 0 && weekEmployees.some((e) => !e.settled)) return;
      autoArchiveAndAdvance(current.from, current.to);
      if (payrollWeekAdvancedToastRef.current !== current.from) {
        payrollWeekAdvancedToastRef.current = current.from;
        toast.success(`Nowy tydzień listy płac · ${fmtDate(current.from)}–${fmtDate(current.to)}`, {
          id: "payroll-week-advance",
          description: "Poprzedni tydzień zapisany w archiwum. Dodaj pracowników i godziny od poniedziałku.",
        });
      }
      return;
    }

    trySundayArchiveOnly();
  }, [weekFrom, weekTo, weekEmployees, autoArchiveAndAdvance, trySundayArchiveOnly]);

  payrollWeekCycleRef.current = tryPayrollWeekCycle;

  useEffect(() => {
    payrollWeekCycleRef.current();
    const tick = () => payrollWeekCycleRef.current();
    const id = setInterval(tick, 60_000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Odzyskaj listę płac z archiwum gdy bieżący tydzień pusty (np. po auto-przejściu)
  const payrollRestoredRef = useRef(false);
  useEffect(() => {
    if (payrollRestoredRef.current || weekEmployees.length > 0) return;
    const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const emps = snap?.weekEmployees;
    if (!emps?.length) return;
    payrollRestoredRef.current = true;
    setWeekEmployees(JSON.parse(JSON.stringify(emps)) as WeekEmployee[]);
    toast.info("Przywrócono listę płac z archiwum", {
      description: `${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · ${emps.length} os.`,
      id: "payroll-auto-restore",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canViewTendersNav = adminSession
    ? adminCanViewTendersTab(adminSession.role, appSettings)
    : false;

  const navItems = useMemo(
    () =>
      buildAdminNavItems({
        canViewTendersNav,
        productionWeekEmployees,
        directory,
        contacts,
        savedWeeks,
        jobs,
        adminUserId: adminSession?.id,
      }),
    [canViewTendersNav, productionWeekEmployees, directory, contacts, savedWeeks, jobs, adminSession?.id],
  );

  const { mobileNavPrimary, mobileNavMore } = useMemo(() => splitMobileNav(navItems), [navItems]);
  const mobileMoreActive = mobileNavMore.some((n) => n.key === view);

  const payrollCashSplitSidebar = useMemo(
    () => computePayrollCashSplitWithCarry(productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks),
    [productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks],
  );

  const totalNet = payrollCashSplitSidebar.totalSaturdayCash;

  const todayFieldStats = useMemo(() => {
    const iso = todayIsoDate();
    return {
      iso,
      label: new Date(iso + "T12:00:00").toLocaleDateString("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      }),
      ...todayFieldWorkStats(jobs, iso, directory, productionWeekEmployees, weekFrom),
    };
  }, [jobs, directory, productionWeekEmployees, weekFrom]);

  const handleNavigate = useCallback((v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule", jobId?: string, payrollEmpId?: string, inspectorTab?: "activity" | "portfolio") => {
    const dest = v as View;
    const returnLabels: Partial<Record<View, string>> = {
      dashboard: "Pulpit",
      payroll: "Lista płac",
      schedule: "Grafik",
      directory: "Kartoteka",
      inspector: "Inspektor",
      archive: "Archiwum",
      jobs: "Roboty",
    };
    if ((dest === "jobs" || dest === "inspector") && view !== dest) {
      setViewReturn({ view, label: returnLabels[view] ?? "Wstecz" });
    } else if (dest !== "jobs" && dest !== "inspector") {
      setViewReturn(null);
    }
    if (jobId) {
      if (v === "inspector") setPendingInspectorJobId(jobId);
      else setPendingJobId(jobId);
    }
    if (payrollEmpId) setPendingPayrollEmpId(payrollEmpId);
    if (inspectorTab) setInspectorInitialTab(inspectorTab);
    else if (v !== "inspector") setInspectorInitialTab("activity");
    setView(dest);
    setMobileMoreOpen(false);
  }, [view]);

  const goToView = useCallback((v: View) => {
    setViewReturn(null);
    setView(v);
    setMobileMoreOpen(false);
  }, []);

  const applyDeepLink = useCallback((route: DeepLinkRoute) => {
    if (route.type === "job") {
      setPendingJobId(route.jobId);
      setView("jobs");
      setMobileMoreOpen(false);
    } else if (route.type === "payroll") {
      if (route.empId) setPendingPayrollEmpId(route.empId);
      setView("payroll");
      setMobileMoreOpen(false);
    }
  }, []);

  useEffect(() => {
    if (view === "tenders" && !canViewTendersNav) setView("dashboard");
  }, [view, canViewTendersNav]);

  useEffect(() => {
    const pending = consumePendingDeepLink();
    if (pending) applyDeepLink(pending);
    const onLink = (e: Event) => {
      const route = (e as CustomEvent<DeepLinkRoute>).detail;
      if (route) applyDeepLink(route);
    };
    window.addEventListener("wgdom-deeplink", onLink);
    return () => window.removeEventListener("wgdom-deeplink", onLink);
  }, [applyDeepLink]);

  return (
    <div className="admin-app-shell flex bg-background text-foreground overflow-hidden min-h-0" style={{fontFamily:"'Inter', sans-serif"}}>

      <AdminSidebar
        sidebarOpen={sidebarOpen}
        view={view}
        navItems={navItems}
        onGoToView={goToView}
        productionWeekEmployees={productionWeekEmployees}
        weekFrom={weekFrom}
        weekTo={weekTo}
        todayFieldStats={todayFieldStats}
        totalNet={totalNet}
        payrollCashSplitSidebar={payrollCashSplitSidebar}
      />

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <AdminTopbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          view={view}
          navItems={navItems}
          onGoToView={goToView}
          adminSession={adminSession}
          canViewRates={canViewRates}
          totalNet={totalNet}
          productionWeekEmployees={productionWeekEmployees}
          weekFrom={weekFrom}
          weekTo={weekTo}
          jobs={jobs}
          exportBackup={exportBackup}
          importBackup={importBackup}
          syncStatus={syncStatus}
          syncError={syncError}
          onRetrySync={() => runCloudSync({ toastSuccess: true })}
          onToggleSearch={() => setShowSearch((v) => !v)}
          onOpenAdminSettings={() => setShowAdminSettings(true)}
          onLogout={onLogout}
        />

        {showSearch && (
          <GlobalSearchPanel
            globalSearch={globalSearch}
            onGlobalSearchChange={setGlobalSearch}
            searchResults={searchResults}
            onNavigate={setView}
            onClose={() => setShowSearch(false)}
          />
        )}

        <AdminViewRouter
          view={view}
          payrollDetailOpen={payrollDetailOpen}
          canViewTendersNav={canViewTendersNav}
          embedded={{
            DashboardView,
            ScheduleView,
            DirectoryView,
            ContactsView,
            ArchiveView,
          }}
          jobs={jobs}
          directory={directory}
          productionWeekEmployees={productionWeekEmployees}
          weekFrom={weekFrom}
          weekTo={weekTo}
          savedWeeks={savedWeeks}
          contacts={contacts}
          employeeLeaves={employeeLeaves}
          setEmployeeLeaves={setEmployeeLeaves}
          commitEmployeeLeaves={commitEmployeeLeaves}
          adminSession={adminSession}
          alertsSeenTick={alertsSeenTick}
          onAlertsSeen={() => setAlertsSeenTick((t) => t + 1)}
          onOpenSms={() => setShowSmsModal(true)}
          onOpenTenders={() => setView("tenders")}
          onOpenTender={(tid) => { setPendingTenderId(tid); setView("tenders"); }}
          handleNavigate={handleNavigate}
          onFixJobs={setJobs}
          setWeekFrom={setWeekFrom}
          setWeekTo={setWeekTo}
          toggleSettled={toggleSettled}
          saveWeek={saveWeek}
          addFromDirectory={addFromDirectory}
          removeWeekEmployee={removeWeekEmployee}
          clearAllWeekEmployees={clearAllWeekEmployees}
          replaceWeekWithAllActive={replaceWeekWithAllActive}
          updateWeekEmployee={updateWeekEmployee}
          syncWeekRatesFromDirectory={syncWeekRatesFromDirectory}
          goToCurrent={goToCurrent}
          restoreWeekFromArchive={restoreWeekFromArchive}
          saveBiweeklyBacklogWeek={saveBiweeklyBacklogWeek}
          pendingPayrollEmpId={pendingPayrollEmpId}
          onInitialPayrollEmpConsumed={() => setPendingPayrollEmpId(null)}
          onPayrollDetailOpenChange={setPayrollDetailOpen}
          setDirectory={setDirectory}
          commitDirectory={commitDirectory}
          setContacts={setContacts}
          onArchiveDelete={(id) => { addDeletedArchiveId(id); setSavedWeeks((prev) => prev.filter((w) => w.id !== id)); }}
          updateArchiveWeekEmployee={updateArchiveWeekEmployee}
          toggleArchiveSettled={toggleArchiveSettled}
          setJobs={setJobs}
          deleteJobsByIds={deleteJobsByIds}
          pendingJobId={pendingJobId}
          onInitialJobConsumed={() => setPendingJobId(null)}
          onGoToInspector={(jobId) => { if (jobId) setPendingInspectorJobId(jobId); setViewReturn({ view: "jobs", label: "Roboty" }); setView("inspector"); }}
          appSettings={appSettings}
          onOpenTenderFromJobs={(tid) => { setPendingTenderId(tid); setViewReturn({ view: "jobs", label: "Roboty" }); setView("tenders"); }}
          jobsReturnNav={viewReturn && viewReturn.view !== "jobs" ? { label: viewReturn.label, onBack: () => { setView(viewReturn.view); setViewReturn(null); setPendingJobId(null); } } : undefined}
          inspectorInitialTab={inspectorInitialTab}
          pendingInspectorJobId={pendingInspectorJobId}
          onInitialInspectorJobConsumed={() => setPendingInspectorJobId(null)}
          inspectorReturnNav={viewReturn && viewReturn.view !== "inspector" ? { label: viewReturn.label, onBack: () => { setView(viewReturn.view); setViewReturn(null); setPendingInspectorJobId(null); } } : undefined}
          onOpenJobFromGallery={(id) => { setPendingJobId(id); setView("jobs"); }}
          onOpenJobFromFiles={(id) => { setPendingJobId(id); setView("jobs"); }}
          pendingTenderId={pendingTenderId}
          onOpenJobFromTender={(id) => { setPendingJobId(id); setView("jobs"); }}
          onSetPendingJobId={setPendingJobId}
          onSetView={setView}
        />

        <AdminMobileNav
          view={view}
          payrollDetailOpen={payrollDetailOpen}
          mobileNavPrimary={mobileNavPrimary}
          mobileNavMore={mobileNavMore}
          mobileMoreActive={mobileMoreActive}
          mobileMoreOpen={mobileMoreOpen}
          navItems={navItems}
          todayFieldStats={todayFieldStats}
          onGoToView={goToView}
          onOpenMore={() => setMobileMoreOpen(true)}
          onCloseMore={() => setMobileMoreOpen(false)}
        />
      </div>

      {/* Overwrite archive confirm */}
      {showAdminSettings && (
        <AdminSettingsModal
          onClose={() => setShowAdminSettings(false)}
          appSettings={appSettings}
          onAppSettingsChange={setAppSettings}
          backupTools={{
            exportBackup,
            importBackup,
            restoreAllDataFromCloud,
            restoreAllDataFromLocal: () => restoreAllDataFromLocal(false),
            restorePayrollFromCloud,
            restoreJobsFromCloud,
            restoreJobsFromLocal,
            restoreBusy,
            jobsBackupStatus,
            payrollBackupStatus,
            fullDataBackupStatus,
            localDataSnapshotLabel: listLocalDataSnapshots().length > 0
              ? new Date(listLocalDataSnapshots()[0].at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })
              : null,
          }}
        />
      )}
      {showSmsModal && (
        <SmsModalErrorBoundary onClose={() => setShowSmsModal(false)}>
          <EmployeeSmsModal
            open={showSmsModal}
            onClose={() => setShowSmsModal(false)}
            directory={directory}
            sender={adminSession}
          />
        </SmsModalErrorBoundary>
      )}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={()=>setShowSaveConfirm(false)}>
          <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-sm shadow-2xl p-6 space-y-4 modal-sheet" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-yellow-400"/>
              </div>
              <div>
                <p className="text-sm font-semibold">Nadpisać zapisany tydzień?</p>
                <p className="text-xs text-muted-foreground mt-1">Ten tydzień ({fmtDate(weekFrom)}–{fmtDate(weekTo)}) jest już zapisany w archiwum. Dane zostaną nadpisane aktualnymi wartościami.</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button onClick={()=>setShowSaveConfirm(false)} className="flex-1 min-h-[48px] py-3 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
                Anuluj
              </button>
              <button onClick={doSaveWeek} className="flex-1 min-h-[48px] py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Tak, nadpisz
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      />
    </div>
  );
}

export { LoginScreen } from "@/app/LoginScreen";
export { WorkerPhotoView } from "@/app/WorkerPhotoView";
export { AppInner };

export default function App() {
  return <CloudLoader><AppInnerWithAuth/></CloudLoader>;
}

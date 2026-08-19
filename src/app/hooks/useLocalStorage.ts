import { useState, useCallback, useEffect } from "react";
import { isDataKey } from "@/lib/cloud-sync";
import { applyWriteTimestamps } from "@/app/app-domain";
import {
  payrollTraceBumpRosterRevision,
  payrollTraceEmit,
  rosterTraceSnapshot,
} from "@/lib/payroll-runtime-trace";
import { logJobsPhotosLiveTrace } from "@/lib/jobs-photos-live-trace";
import { logPayrollBootstrapTraceFromWeekKeys } from "@/lib/payroll-bootstrap-runtime-trace";
import {
  logPayrollWeekEmployeesInit,
  logPayrollWeekEmployeesStorageEvent,
  logPayrollWeekEmployeesWrite,
  takePayrollWeekEmployeesWriteSource,
} from "@/lib/payroll-week-employees-write-trace";
import { logPayrollStorageNote } from "@/lib/payroll-kw-week-employees-storage-trace";
import { logPayrollBootPath } from "@/lib/payroll-boot-path-trace";
import { peekBootstrapPayrollHandoff } from "@/lib/cloud-bootstrap";
import { bumpAdminBundleGeneration } from "@/lib/admin-bundle-sync-guard";
import { PAYROLL_WEEK_META_KEY } from "@/lib/payroll-week-meta";
import type { Job } from "@/app/app-domain";

function weekRangeFromLs(): { weekFrom: string; weekTo: string } {
  try {
    const wf = JSON.parse(localStorage.getItem("kw-weekFrom") ?? '""');
    const wt = JSON.parse(localStorage.getItem("kw-weekTo") ?? '""');
    return { weekFrom: typeof wf === "string" ? wf : "", weekTo: typeof wt === "string" ? wt : "" };
  } catch {
    return { weekFrom: "", weekTo: "" };
  }
}

/** PAYROLL-P0-FIX-01 — gdy LS puste po QuotaExceeded, użyj merge handoff z CloudLoader. */
function resolvePayrollBootstrapInitValue<T>(key: string, fromLs: T, initial: T): T {
  const handoff = peekBootstrapPayrollHandoff();
  if (!handoff) return fromLs;

  if (key === "kw-week-employees") {
    const n = Array.isArray(fromLs) ? fromLs.length : 0;
    if (n > 0) return fromLs;
    return handoff.weekEmployees as T;
  }
  if (key === "kw-weekFrom") {
    const s = typeof fromLs === "string" ? fromLs : "";
    if (s) return fromLs;
    return (handoff.weekFrom || initial) as T;
  }
  if (key === "kw-weekTo") {
    const s = typeof fromLs === "string" ? fromLs : "";
    if (s) return fromLs;
    return (handoff.weekTo || initial) as T;
  }
  return fromLs;
}

/** Sync z chmury — nie nadpisuj settledUpdatedAt przy apply merge (unikaj fałszywego „cofnięcia” rozliczenia). */
let skipApplyWriteTimestamps = false;

export function setSkipApplyWriteTimestamps(value: boolean): void {
  skipApplyWriteTimestamps = value;
}

export { applyWriteTimestamps };

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      const fromLs = (s ? JSON.parse(s) : initial) as T;
      const parsed = resolvePayrollBootstrapInitValue(key, fromLs, initial);
      if (key === "kw-week-employees") {
        const handoff = peekBootstrapPayrollHandoff();
        const lsWeek = weekRangeFromLs();
        const weekFrom = lsWeek.weekFrom || handoff?.weekFrom || "";
        const weekTo = lsWeek.weekTo || handoff?.weekTo || "";
        const n = Array.isArray(parsed) ? parsed.length : 0;
        const fromHandoff = Array.isArray(fromLs) && fromLs.length === 0 && n > 0;
        logPayrollBootstrapTraceFromWeekKeys({
          caller: "useLocalStorage.init",
          reason: fromHandoff ? "react_state_init_from_bootstrap_handoff" : "react_state_init_from_ls",
          weekFrom,
          weekTo,
          employeeCount: n,
        });
        logPayrollWeekEmployeesInit({ employeeCount: n, weekFrom, weekTo });
        logPayrollBootPath("APP_MOUNT", {
          reason: fromHandoff
            ? "app_children_mount≈bootstrap_payroll_handoff"
            : "app_children_mount≈useLocalStorage.kw-week-employees_init",
          weekFrom,
          weekTo,
          employeeCount: n,
        });
        logPayrollBootPath("USELOCALSTORAGE_INIT", {
          reason: fromHandoff ? "react_state_init_from_bootstrap_handoff" : "react_state_init_from_ls",
          weekFrom,
          weekTo,
          employeeCount: n,
        });
        logPayrollStorageNote(
          `react_useLocalStorage.init employeeCount=${n} handoff=${fromHandoff} (see preceding GET for raw LS)`,
          "useLocalStorage.init",
        );
      }
      return parsed;
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T | ((p: T) => T)) => {
    // DIAG-02 — capture source at call time (before deferred setState updater).
    const sourceFunction =
      key === "kw-week-employees" ? takePayrollWeekEmployeesWriteSource() : "—";
    setState((prev) => {
      const incoming = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      if (Object.is(prev, incoming)) {
        return prev;
      }
      if (!isDataKey(key)) {
        try { localStorage.setItem(key, JSON.stringify(incoming)); } catch { /* ignore */ }
        return incoming;
      }
      const next = (skipApplyWriteTimestamps ? incoming : applyWriteTimestamps(key, prev, incoming)) as T;
      if (!skipApplyWriteTimestamps) {
        bumpAdminBundleGeneration();
      }
      if (key === "kw-jobs") {
        logJobsPhotosLiveTrace({
          event: "setJobs",
          caller: "useLocalStorage.set(kw-jobs)",
          origin: "render",
          jobs: next as Job[],
          prevJobs: prev as Job[],
        });
      }
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      if (key === "kw-week-employees" && Array.isArray(next)) {
        const prevCount = Array.isArray(prev) ? prev.length : 0;
        const { weekFrom, weekTo } = weekRangeFromLs();
        const reason = prevCount > 0 && next.length === 0 ? "roster_cleared" : "roster_updated";
        logPayrollBootstrapTraceFromWeekKeys({
          caller: "setWeekEmployees",
          reason,
          weekFrom,
          weekTo,
          employeeCount: next.length,
          employeeCountBefore: prevCount,
          employeeCountAfter: next.length,
          tryPayrollWeekCycleCleared: prevCount > 0 && next.length === 0 ? true : undefined,
        });
        logPayrollWeekEmployeesWrite({
          caller: "setWeekEmployees",
          reason,
          sourceFunction,
          employeeCountBefore: prevCount,
          employeeCountAfter: next.length,
          weekFrom,
          weekTo,
        });
        payrollTraceBumpRosterRevision();
        payrollTraceEmit("payroll.roster.state.commit", "STATE", "info", {
          trigger: "ui_add" as const,
          roster: rosterTraceSnapshot(next, weekFrom, weekTo, "LOCAL", "PRESENT"),
        });
        payrollTraceEmit("payroll.roster.ls.write", "LS", "info", {
          trigger: "ui_add" as const,
          roster: rosterTraceSnapshot(next, weekFrom, weekTo, "LS", "PRESENT"),
        });
      }
      return next;
    });
  }, [key]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as T;
        if (key === "kw-jobs") {
          logJobsPhotosLiveTrace({
            event: "storage",
            caller: "useLocalStorage.storage(kw-jobs)",
            origin: "storage",
            jobs: parsed as Job[],
            extra: { storageKey: e.key, url: e.url },
          });
        }
        if (key === "kw-week-employees" && Array.isArray(parsed)) {
          setState((prev) => {
            const before = Array.isArray(prev) ? prev.length : 0;
            logPayrollWeekEmployeesStorageEvent({
              employeeCountBefore: before,
              employeeCountAfter: parsed.length,
            });
            return parsed;
          });
          return;
        }
        setState(parsed);
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  return [state, set];
}

/** Cross-tab revision cache — getExpectedPayrollRevision() reads LS on next push. */
let payrollMetaStorageListenerInstalled = false;
function installPayrollMetaCrossTabSync(): void {
  if (payrollMetaStorageListenerInstalled || typeof window === "undefined") return;
  payrollMetaStorageListenerInstalled = true;
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== PAYROLL_WEEK_META_KEY || e.newValue == null) return;
    payrollTraceEmit("payroll.meta.storage_event", "LS", "info", {
      revision: (() => {
        try {
          const m = JSON.parse(e.newValue) as { rosterRevision?: number };
          return m.rosterRevision;
        } catch {
          return undefined;
        }
      })(),
    });
  });
}
installPayrollMetaCrossTabSync();

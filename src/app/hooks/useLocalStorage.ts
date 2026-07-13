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
import { bumpAdminBundleGeneration } from "@/lib/admin-bundle-sync-guard";
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
      const parsed = s ? JSON.parse(s) : initial;
      if (key === "kw-week-employees") {
        const { weekFrom, weekTo } = weekRangeFromLs();
        const n = Array.isArray(parsed) ? parsed.length : 0;
        logPayrollBootstrapTraceFromWeekKeys({
          caller: "useLocalStorage.init",
          reason: "react_state_init_from_ls",
          weekFrom,
          weekTo,
          employeeCount: n,
        });
        logPayrollWeekEmployeesInit({ employeeCount: n, weekFrom, weekTo });
        logPayrollStorageNote(
          `react_useLocalStorage.init employeeCount=${n} (see preceding GET for raw LS)`,
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

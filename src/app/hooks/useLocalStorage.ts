import { useState, useCallback, useEffect } from "react";
import { isDataKey } from "@/lib/cloud-sync";
import { applyWriteTimestamps } from "@/app/app-domain";
import {
  payrollTraceBumpRosterRevision,
  payrollTraceEmit,
  rosterTraceSnapshot,
} from "@/lib/payroll-runtime-trace";

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
      return s ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T | ((p: T) => T)) => {
    setState((prev) => {
      const incoming = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      if (Object.is(prev, incoming)) return prev;
      if (!isDataKey(key)) {
        try { localStorage.setItem(key, JSON.stringify(incoming)); } catch { /* ignore */ }
        return incoming;
      }
      const next = (skipApplyWriteTimestamps ? incoming : applyWriteTimestamps(key, prev, incoming)) as T;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      if (key === "kw-week-employees" && Array.isArray(next)) {
        payrollTraceBumpRosterRevision();
        const { weekFrom, weekTo } = weekRangeFromLs();
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
      try { setState(JSON.parse(e.newValue) as T); } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  return [state, set];
}

/** Po udanym batch-get + merge w CloudLoader — wycisz auto runCloudSync (debounce 2 s). */
export const BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS = 60_000;

let lastSuccessfulBootstrapAt = 0;

/**
 * PAYROLL-P0-FIX-01 — in-memory handoff po udanym merge payroll,
 * gdy localStorage.setItem padnie (QuotaExceeded). App czyta to w useLocalStorage.init.
 */
export type BootstrapPayrollHandoff = {
  weekEmployees: unknown[];
  weekFrom: string;
  weekTo: string;
};

let bootstrapPayrollHandoff: BootstrapPayrollHandoff | null = null;

/** Late merge after TIMEOUT — App rehydrates React without relying on same-window storage events. */
type BootstrapPayrollLateRehydrateListener = (handoff: BootstrapPayrollHandoff) => void;
const lateRehydrateListeners = new Set<BootstrapPayrollLateRehydrateListener>();
let pendingLateRehydrate: BootstrapPayrollHandoff | null = null;

/** Wywołaj po pomyślnym bootstrapie CloudLoader (batch-get + merge do LS). */
export function markCloudBootstrapSuccess(): void {
  lastSuccessfulBootstrapAt = Date.now();
}

/** Zwraca timestamp do którego auto runCloudSync ma być wstrzymany (0 = brak bootstrapu). */
export function initialAutoSyncSuppressUntil(): number {
  if (lastSuccessfulBootstrapAt <= 0) return 0;
  return lastSuccessfulBootstrapAt + BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS;
}

/** Publikuj zmergowany roster przed open SUCCESS — niezależnie od wyniku setItem. */
export function publishBootstrapPayrollHandoff(input: BootstrapPayrollHandoff): void {
  if (!Array.isArray(input.weekEmployees) || input.weekEmployees.length === 0) return;
  bootstrapPayrollHandoff = {
    weekEmployees: input.weekEmployees,
    weekFrom: input.weekFrom || "",
    weekTo: input.weekTo || "",
  };
}

/**
 * TIMEOUT path only: children already mounted with stale LS; late fetch merged roster
 * into handoff/LS — notify App to apply roster to React (skip write-timestamp bumps).
 */
export function signalBootstrapPayrollLateRehydrate(handoff: BootstrapPayrollHandoff): void {
  if (!Array.isArray(handoff.weekEmployees) || handoff.weekEmployees.length === 0) return;
  const payload: BootstrapPayrollHandoff = {
    weekEmployees: handoff.weekEmployees,
    weekFrom: handoff.weekFrom || "",
    weekTo: handoff.weekTo || "",
  };
  pendingLateRehydrate = payload;
  for (const fn of lateRehydrateListeners) {
    try {
      fn(payload);
    } catch {
      /* listener must not break CloudLoader */
    }
  }
}

/**
 * App subscribes once mounted. Delivers pending signal if subscribe races after signal.
 */
export function subscribeBootstrapPayrollLateRehydrate(
  fn: BootstrapPayrollLateRehydrateListener,
): () => void {
  lateRehydrateListeners.add(fn);
  if (pendingLateRehydrate) {
    const payload = pendingLateRehydrate;
    queueMicrotask(() => {
      if (pendingLateRehydrate === payload) {
        try {
          fn(payload);
        } catch {
          /* ignore */
        }
      }
    });
  }
  return () => {
    lateRehydrateListeners.delete(fn);
  };
}

/** Odczyt bez kasowania — trzy klucze (employees/from/to) mogą czytać w dowolnej kolejności. */
export function peekBootstrapPayrollHandoff(): BootstrapPayrollHandoff | null {
  return bootstrapPayrollHandoff;
}

/** Tylko testy. */
export function clearBootstrapPayrollHandoffForTests(): void {
  bootstrapPayrollHandoff = null;
  pendingLateRehydrate = null;
  lateRehydrateListeners.clear();
}

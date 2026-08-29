/**
 * Koordynacja auto-sync (pull / merge / push) podczas lokalnych mutacji KV.
 * PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD P0 — bez stanu biznesowego (#011).
 *
 * PAYROLL DELETE P0 — FIFO Promise chain dla zapisów kw-week-employees
 * (`enqueueKwWeekEmployeesWrite`). `isBlocked()` nadal tylko tłumi auto-pull —
 * nie jest kolejką mutacji.
 *
 * GO9.2 — SINGLE-FLIGHT payroll CAS: sibling writers ALWAYS append to the
 * promise chain. Never run a new independent write inline just because
 * `depth > 0` (that allowed parallel batch-set with the same expectedRevision).
 * Nested `withKw… → pwrPush` deadlock is avoided by callers using a single
 * enqueue owner (pwrPush SSOT — no outer withKw wrap around pwrPush).
 */

import { payrollTraceEmit } from "@/lib/payroll-runtime-trace";

export type CloudSyncScope = "kw-jobs" | "kw-week-employees" | "kw-directory" | "full-bundle" | string;

export type MutationToken = string & { readonly __brand: "CloudSyncMutationToken" };

export interface BeginOptions {
  suppressMs?: number;
}

const KW_JOBS_DEFAULT_SUPPRESS_MS = 4500;
/** PAYROLL-CLOUD-RECOVERY B3 — parity z suppressAutoSyncUntilRef na ścieżce roster push. */
export const KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS = 6000;
const DEFAULT_SUPPRESS_MS = 4500;

let nextTokenSeq = 1;
let suppressUntil = 0;
/** token → scope */
const activeTokens = new Map<MutationToken, CloudSyncScope>();
const endedTokens = new Set<MutationToken>();

/**
 * FIFO write chain for kw-week-employees mutations (pwrPush / pwrRemove / …).
 * Independent of `isBlocked()` auto-pull suppress.
 */
let kwWeekEmployeesWriteChain: Promise<unknown> = Promise.resolve();
/** >0 while executing an enqueued write slot. */
let kwWeekEmployeesWriteDepth = 0;
/** Queued + running slots (includes not-yet-started waiters). */
let kwWeekEmployeesWritePending = 0;

function defaultSuppressMs(scope: CloudSyncScope): number {
  if (scope === "kw-jobs") return KW_JOBS_DEFAULT_SUPPRESS_MS;
  if (scope === "kw-week-employees") return KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS;
  return DEFAULT_SUPPRESS_MS;
}

function begin(scope: CloudSyncScope, opts?: BeginOptions): MutationToken {
  const ms = opts?.suppressMs ?? defaultSuppressMs(scope);
  const now = Date.now();
  suppressUntil = Math.max(suppressUntil, now + ms);
  const token = `csmg-${nextTokenSeq++}` as MutationToken;
  activeTokens.set(token, scope);
  if (scope === "kw-week-employees") {
    payrollTraceEmit("payroll.guard.mutation.begin", "GUARD", "debug", { scope, suppressMs: ms });
  }
  return token;
}

function end(token: MutationToken): void {
  if (endedTokens.has(token)) return;
  if (!activeTokens.has(token)) return;
  const scope = activeTokens.get(token);
  endedTokens.add(token);
  activeTokens.delete(token);
  if (scope === "kw-week-employees") {
    payrollTraceEmit("payroll.guard.mutation.end", "GUARD", "debug", { scope });
  }
}

function scopeHasActiveToken(scope: CloudSyncScope): boolean {
  for (const s of activeTokens.values()) {
    if (s === scope) return true;
  }
  return false;
}

function isBlocked(scope?: CloudSyncScope): boolean {
  if (Date.now() < suppressUntil) return true;
  if (scope != null) return scopeHasActiveToken(scope);
  return activeTokens.size > 0;
}

function extendSuppress(ms: number): void {
  suppressUntil = Math.max(suppressUntil, Date.now() + ms);
}

/** PAYROLL-RACE-01 — extend suppress dla scope z SSOT defaultSuppressMs (bez duplikacji MS). */
export function extendScopeSuppress(scope: CloudSyncScope): void {
  extendSuppress(defaultSuppressMs(scope));
}

/**
 * Clear mutation suppress / tokens.
 * GO9.2: never destroy an in-flight or pending payroll write-chain
 * (that re-opened sibling parallel writers after CloudLoader bootstrap).
 */
function reset(): void {
  activeTokens.clear();
  endedTokens.clear();
  suppressUntil = 0;
  if (kwWeekEmployeesWriteDepth === 0 && kwWeekEmployeesWritePending === 0) {
    kwWeekEmployeesWriteChain = Promise.resolve();
  }
}

/** @internal test isolation — force-clear write chain only when idle (or after await). */
function resetWriteChainForTests(): void {
  kwWeekEmployeesWriteChain = Promise.resolve();
  kwWeekEmployeesWriteDepth = 0;
  kwWeekEmployeesWritePending = 0;
}

/** Ms do odblokowania guarda (0 = już wolno). */
function msUntilUnblocked(): number {
  if (!isBlocked()) return 0;
  const suppressRemain = Math.max(0, suppressUntil - Date.now());
  if (activeTokens.size > 0) {
    return Math.max(suppressRemain, 50);
  }
  return suppressRemain;
}

/**
 * FIFO serialize async writes to kw-week-employees (GO9.2 single-flight).
 *
 * Every independent writer gets its own chain slot and waits for prior slots.
 * Do NOT run `fn()` inline when depth>0 — that allowed sibling batch-sets to
 * share the same expectedRevision (HAR GO9.1 #4/#5).
 *
 * Deadlock avoidance: callers must not wrap `pwrPush` (which already enqueues)
 * inside another `enqueue`/`withKwWeekEmployeesAsyncMutation`. Use one owner.
 * Rejection of one job does not stick the chain (finally advances).
 */
export async function enqueueKwWeekEmployeesWrite<T>(fn: () => Promise<T>): Promise<T> {
  kwWeekEmployeesWritePending += 1;
  payrollTraceEmit("payroll.guard.write_queue.queued", "GUARD", "debug", {
    pending: kwWeekEmployeesWritePending,
    depth: kwWeekEmployeesWriteDepth,
  });

  const run = kwWeekEmployeesWriteChain.then(async () => {
    kwWeekEmployeesWriteDepth += 1;
    const token = begin("kw-week-employees");
    try {
      payrollTraceEmit("payroll.guard.write_queue.run", "GUARD", "debug", {
        pending: kwWeekEmployeesWritePending,
        depth: kwWeekEmployeesWriteDepth,
      });
      return await fn();
    } finally {
      end(token);
      kwWeekEmployeesWriteDepth = Math.max(0, kwWeekEmployeesWriteDepth - 1);
      kwWeekEmployeesWritePending = Math.max(0, kwWeekEmployeesWritePending - 1);
      payrollTraceEmit("payroll.guard.write_queue.finished", "GUARD", "debug", {
        pending: kwWeekEmployeesWritePending,
        depth: kwWeekEmployeesWriteDepth,
      });
    }
  });

  // Keep chain alive after settle (success or failure) so the next job always runs.
  kwWeekEmployeesWriteChain = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

/** @internal test/diag — queue counters (not a substitute for isBlocked). */
export function getKwWeekEmployeesWriteQueueState(): {
  depth: number;
  pending: number;
} {
  return {
    depth: kwWeekEmployeesWriteDepth,
    pending: kwWeekEmployeesWritePending,
  };
}

/** Opakowuje mutację workEntries w scope kw-jobs (#004). */
export function withKwJobsWorkEntryMutation<T>(fn: () => T): T {
  const token = begin("kw-jobs");
  try {
    return fn();
  } finally {
    end(token);
  }
}

/** Opakowuje mutację składu LP w scope kw-week-employees (B3 — cienki wrapper begin/end). */
export function withKwWeekEmployeesMutation<T>(fn: () => T): T {
  const token = begin("kw-week-employees");
  try {
    return fn();
  } finally {
    end(token);
  }
}

/**
 * Async mutation of week roster — FIFO write queue + begin/end suppress for auto-pull.
 * Critical section spans the full awaited fn (push / rebase / retry).
 *
 * GO9.2: do NOT wrap `pwrPush` / `pwrAdd` / `pwrRemove` — they already enqueue.
 * Use this for paths that call `pushKeysToCloud` / rollover directly.
 */
export async function withKwWeekEmployeesAsyncMutation(fn: () => Promise<void>): Promise<void> {
  await enqueueKwWeekEmployeesWrite(fn);
}

export const cloudSyncMutationGuard = {
  begin,
  end,
  isBlocked,
  extendSuppress,
  reset,
  clearAll: reset,
  resetWriteChainForTests,
  msUntilUnblocked,
  enqueueKwWeekEmployeesWrite,
  getKwWeekEmployeesWriteQueueState,
};

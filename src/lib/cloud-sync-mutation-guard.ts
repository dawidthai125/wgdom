/**
 * Koordynacja auto-sync (pull / merge / push) podczas lokalnych mutacji KV.
 * PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD P0 — bez stanu biznesowego (#011).
 */

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
  return token;
}

function end(token: MutationToken): void {
  if (endedTokens.has(token)) return;
  if (!activeTokens.has(token)) return;
  endedTokens.add(token);
  activeTokens.delete(token);
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

function reset(): void {
  activeTokens.clear();
  endedTokens.clear();
  suppressUntil = 0;
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

/** Async push składu — begin/end w finally po zakończeniu Promise (R1/R2). */
export async function withKwWeekEmployeesAsyncMutation(fn: () => Promise<void>): Promise<void> {
  const token = begin("kw-week-employees");
  try {
    await fn();
  } finally {
    end(token);
  }
}

export const cloudSyncMutationGuard = {
  begin,
  end,
  isBlocked,
  extendSuppress,
  reset,
  clearAll: reset,
  msUntilUnblocked,
};

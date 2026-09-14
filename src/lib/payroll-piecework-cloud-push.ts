/**
 * PAYROLL AKORD Phase 4A — safe Cloud write for kw-payroll-piecework (CAS + invariant).
 * Pattern aligned with work-catalog CAS — NOT week-employees PWRB.
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  fetchKeysFromCloud,
  isSupabaseConfigured,
  type PushKeysToCloudOptions,
} from "@/lib/cloud-sync";
import { PieceworkInvariantViolatedError } from "@/lib/payroll-piecework-invariant";
import {
  buildPayrollPieceworkMetaPlaceholder,
  getExpectedPayrollPieceworkRevision,
  normalizePayrollPieceworkMeta,
  PAYROLL_PIECEWORK_META_KEY,
  writePayrollPieceworkMetaToLs,
  type PayrollPieceworkMeta,
} from "@/lib/payroll-piecework-meta";
import { preparePieceworkServerWrite } from "@/lib/payroll-piecework-server-write";
import {
  emptyPayrollPieceworkState,
  normalizePayrollPieceworkState,
  PAYROLL_PIECEWORK_KEY,
  type PayrollPieceworkState,
} from "@/lib/payroll-piecework-types";

export const PIECEWORK_STALE_REVISION_CODE = "piecework_stale_revision";
export const PIECEWORK_LEGACY_CLIENT_CODE = "piecework_legacy_client_rejected";
export const PIECEWORK_INVARIANT_VIOLATED_CODE = "piecework_invariant_violated";

export const PIECEWORK_CAS_MAX_ATTEMPTS = 3;

export class PieceworkStaleRevisionError extends Error {
  readonly code: string;
  readonly serverRevision: number;
  readonly serverState: PayrollPieceworkState | null;

  constructor(
    code: string,
    serverRevision: number,
    serverState: PayrollPieceworkState | null,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "PieceworkStaleRevisionError";
    this.code = code;
    this.serverRevision = serverRevision;
    this.serverState = serverState;
  }
}

export class PieceworkCloudUnreadableError extends Error {
  readonly code = "piecework_cloud_unreadable";
  constructor(message?: string) {
    super(message ?? "piecework Cloud unreadable — fail closed");
    this.name = "PieceworkCloudUnreadableError";
  }
}

async function pushPieceworkCasToEdge(
  state: PayrollPieceworkState,
  expectedRevision: number,
  options?: PushKeysToCloudOptions,
): Promise<
  | { ok: true; meta: PayrollPieceworkMeta }
  | { ok: false; conflict: PieceworkStaleRevisionError | PieceworkInvariantViolatedError }
> {
  const { pushKeysToCloud } = await import("@/lib/cloud-sync");
  const metaPlaceholder = buildPayrollPieceworkMetaPlaceholder();
  try {
    const resJson = await pushKeysToCloud(
      [PAYROLL_PIECEWORK_KEY, PAYROLL_PIECEWORK_META_KEY],
      [state, metaPlaceholder],
      {
        ...options,
        pieceworkCas: true,
        expectedPieceworkRevision: expectedRevision,
        clientAppVersion: options?.clientAppVersion ?? APP_VERSION,
        skipPieceworkIntercept: true,
        skipCloudFreshnessGate: options?.skipCloudFreshnessGate,
      },
    );
    const metaRaw = resJson?.pieceworkMeta;
    const meta = metaRaw != null
      ? normalizePayrollPieceworkMeta(metaRaw)
      : normalizePayrollPieceworkMeta({
          pieceworkRevision: expectedRevision + 1,
          updatedAt: Date.now(),
        });
    writePayrollPieceworkMetaToLs(meta);
    return { ok: true, meta };
  } catch (e) {
    if (e instanceof PieceworkStaleRevisionError || e instanceof PieceworkInvariantViolatedError) {
      return { ok: false, conflict: e };
    }
    throw e;
  }
}

export type PushPayrollPieceworkToCloudSafeOptions = {
  pushOptions?: PushKeysToCloudOptions;
  /** Max CAS attempts including the first (default 3). */
  maxAttempts?: number;
};

/**
 * SSOT Cloud write for piecework — fetch → local merge prep → CAS → rebase on 409.
 * Fail closed if Cloud unreadable. Does not write production outside pushKeysToCloud.
 */
export async function pushPayrollPieceworkToCloudSafe(
  candidate: PayrollPieceworkState,
  options: PushPayrollPieceworkToCloudSafeOptions = {},
): Promise<PayrollPieceworkState> {
  if (!isSupabaseConfigured()) {
    const local = normalizePayrollPieceworkState(candidate);
    try {
      localStorage.setItem(PAYROLL_PIECEWORK_KEY, JSON.stringify(local));
    } catch { /* quota */ }
    return local;
  }

  const maxAttempts = Math.max(1, Math.min(3, options.maxAttempts ?? PIECEWORK_CAS_MAX_ATTEMPTS));
  let proposed = normalizePayrollPieceworkState(candidate);
  let expectedRevision = getExpectedPayrollPieceworkRevision();

  let cloudRaw: unknown = null;
  let metaRaw: unknown = null;
  try {
    [cloudRaw, metaRaw] = await fetchKeysFromCloud([
      PAYROLL_PIECEWORK_KEY,
      PAYROLL_PIECEWORK_META_KEY,
    ]);
  } catch {
    throw new PieceworkCloudUnreadableError();
  }

  if (metaRaw != null) {
    expectedRevision = normalizePayrollPieceworkMeta(metaRaw).pieceworkRevision;
    writePayrollPieceworkMetaToLs(normalizePayrollPieceworkMeta(metaRaw));
  }

  // First prepare against fresh Cloud (union) so we never push a stale whole-state wipe.
  {
    const prep = preparePieceworkServerWrite(cloudRaw ?? emptyPayrollPieceworkState(), proposed);
    if (!prep.ok) {
      const v = prep.violations[0];
      throw new PieceworkInvariantViolatedError(
        v.allocationId,
        v.agreedAmount,
        v.activeAdvancesSum,
      );
    }
    proposed = prep.state;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await pushPieceworkCasToEdge(proposed, expectedRevision, options.pushOptions);
    if (result.ok) {
      try {
        localStorage.setItem(PAYROLL_PIECEWORK_KEY, JSON.stringify(proposed));
      } catch { /* quota */ }
      return proposed;
    }

    const conflict = result.conflict;
    if (conflict instanceof PieceworkInvariantViolatedError) {
      throw conflict;
    }

    // Stale revision — re-fetch, re-merge candidate intent (candidate as incoming), retry.
    let freshCloud: unknown = null;
    let freshMeta: unknown = null;
    try {
      [freshCloud, freshMeta] = await fetchKeysFromCloud([
        PAYROLL_PIECEWORK_KEY,
        PAYROLL_PIECEWORK_META_KEY,
      ]);
    } catch {
      throw new PieceworkCloudUnreadableError("piecework Cloud unreadable after stale revision");
    }

    const serverState =
      conflict.serverState
      ?? normalizePayrollPieceworkState(freshCloud ?? emptyPayrollPieceworkState());
    expectedRevision =
      conflict.serverRevision >= 0
        ? conflict.serverRevision
        : normalizePayrollPieceworkMeta(freshMeta).pieceworkRevision;
    writePayrollPieceworkMetaToLs(
      normalizePayrollPieceworkMeta(
        freshMeta ?? { pieceworkRevision: expectedRevision, updatedAt: Date.now() },
      ),
    );

    // Re-apply original candidate onto fresh Cloud (union) — preserves parallel advances.
    const rebase = preparePieceworkServerWrite(serverState, normalizePayrollPieceworkState(candidate));
    if (!rebase.ok) {
      const v = rebase.violations[0];
      throw new PieceworkInvariantViolatedError(
        v.allocationId,
        v.agreedAmount,
        v.activeAdvancesSum,
      );
    }
    proposed = rebase.state;
  }

  throw new PieceworkStaleRevisionError(
    PIECEWORK_STALE_REVISION_CODE,
    expectedRevision,
    proposed,
    `piecework CAS exhausted after ${maxAttempts} attempts`,
  );
}

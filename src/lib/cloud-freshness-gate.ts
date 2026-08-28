/**
 * CLOUD FRESHNESS GATE — global write safety (multi-device / multi-tab / resume).
 *
 * Contract:
 *   UNKNOWN|STALE|UNCONFIRMED → BLOCK outbound cloud writes
 *   → pull + reconcile + apply UI
 *   → FRESH → allow write
 *
 * Does NOT replace field-intent / CAS / LWW. Verification clock only
 * (`freshnessConfirmedAt`), not data authority.
 */

export type CloudFreshnessState =
  | "unknown"
  | "checking"
  | "fresh"
  | "stale"
  | "unconfirmed";

export type CloudFreshnessReason =
  | "bootstrap_success"
  | "bootstrap_failed"
  | "bootstrap_timeout"
  | "resume_visibility"
  | "resume_focus"
  | "resume_pageshow"
  | "resume_native"
  | "storage_event"
  | "manual"
  | "write_barrier"
  | "reconcile_ok"
  | "reconcile_fail"
  | "test"
  | string;

export class CloudFreshnessBlockedError extends Error {
  readonly code = "cloud_freshness_blocked" as const;
  constructor(
    message = "Zapis zablokowany — brak potwierdzenia aktualnego stanu chmury. Odśwież połączenie i spróbuj ponownie.",
    readonly freshnessState: CloudFreshnessState = "unconfirmed",
  ) {
    super(message);
    this.name = "CloudFreshnessBlockedError";
  }
}

export function isCloudFreshnessBlockedError(err: unknown): boolean {
  return err instanceof CloudFreshnessBlockedError
    || (err instanceof Error && (err as { code?: string }).code === "cloud_freshness_blocked");
}

/** Registered by App / Worker — MUST pull+merge+apply UI, MUST NOT push. */
export type CloudFreshnessReconcileFn = (meta: {
  reason: CloudFreshnessReason;
  bypassThrottle: boolean;
}) => Promise<void>;

type GateSnapshot = {
  state: CloudFreshnessState;
  freshnessConfirmedAt: number;
  lastUnknownAt: number;
  lastReason: CloudFreshnessReason | "";
  reconcileCount: number;
  blockedWriteCount: number;
};

let state: CloudFreshnessState = "unknown";
let freshnessConfirmedAt = 0;
let lastUnknownAt = 0;
let lastReason: CloudFreshnessReason | "" = "";
let reconcileFn: CloudFreshnessReconcileFn | null = null;
let inFlight: Promise<void> | null = null;
/** >0 while inside reconcile or an allowed nested write after gate passed this turn. */
let gatePassDepth = 0;
let reconcileCount = 0;
let blockedWriteCount = 0;
/** Test / bootstrap emergency — prefer skipCloudFreshnessGate on push options. */
let allowWritesWithoutFreshness = false;

function setState(next: CloudFreshnessState, reason: CloudFreshnessReason): void {
  state = next;
  lastReason = reason;
  if (next === "unknown" || next === "stale") {
    lastUnknownAt = Date.now();
    freshnessConfirmedAt = 0;
  }
  if (next === "fresh") {
    freshnessConfirmedAt = Date.now();
  }
  if (next === "unconfirmed") {
    freshnessConfirmedAt = 0;
  }
}

export function getCloudFreshnessState(): CloudFreshnessState {
  return state;
}

export function getCloudFreshnessSnapshot(): GateSnapshot {
  return {
    state,
    freshnessConfirmedAt,
    lastUnknownAt,
    lastReason,
    reconcileCount,
    blockedWriteCount,
  };
}

export function isCloudFreshnessConfirmed(): boolean {
  return state === "fresh" && freshnessConfirmedAt > 0 && lastUnknownAt <= freshnessConfirmedAt;
}

/** True when outbound cloud write may proceed without awaiting ensure. */
export function isCloudOutboundWriteAllowed(): boolean {
  if (allowWritesWithoutFreshness) return true;
  if (gatePassDepth > 0) return true;
  return isCloudFreshnessConfirmed();
}

export function registerCloudFreshnessReconcile(fn: CloudFreshnessReconcileFn): () => void {
  reconcileFn = fn;
  return () => {
    if (reconcileFn === fn) reconcileFn = null;
  };
}

export function markCloudFreshnessUnknown(reason: CloudFreshnessReason = "manual"): void {
  // Always record uncertainty. If a check is in flight, keep CHECKING but force
  // waiters that need a post-check re-validate via lastUnknownAt > confirmedAt.
  lastReason = reason;
  lastUnknownAt = Date.now();
  if (state === "checking" && inFlight) {
    return;
  }
  setState(state === "fresh" ? "stale" : state === "stale" ? "stale" : "unknown", reason);
}

export function markCloudFreshnessFresh(reason: CloudFreshnessReason = "reconcile_ok"): void {
  setState("fresh", reason);
}

export function markCloudFreshnessUnconfirmed(reason: CloudFreshnessReason = "reconcile_fail"): void {
  setState("unconfirmed", reason);
}

/** CloudLoader SUCCESS after merge. */
export function markCloudFreshnessAfterBootstrapSuccess(): void {
  setState("fresh", "bootstrap_success");
}

/** CloudLoader FAILED / TIMEOUT / offline open. */
export function markCloudFreshnessAfterBootstrapFailure(reason: CloudFreshnessReason = "bootstrap_failed"): void {
  setState("unconfirmed", reason);
}

/**
 * Mandatory Cloud check before any outbound write.
 * Coalesces concurrent callers onto one in-flight reconcile.
 * Throttle MUST NOT skip this path (bypassThrottle: true to reconciler).
 */
export async function ensureCloudFreshBeforeWrite(opts?: {
  reason?: CloudFreshnessReason;
  /** When true, re-pull even if currently FRESH (explicit resume refresh). */
  force?: boolean;
}): Promise<void> {
  const reason = opts?.reason ?? "write_barrier";
  if (allowWritesWithoutFreshness) return;
  if (gatePassDepth > 0 && !opts?.force) return;

  if (!opts?.force && isCloudFreshnessConfirmed()) return;

  if (inFlight) {
    await inFlight;
    if (!opts?.force && isCloudFreshnessConfirmed()) return;
    // Peer finished but we are still not fresh (stale marked during check / failed peer).
    // Fall through to a new reconcile instead of hard-failing writers.
    if (opts?.force && isCloudFreshnessConfirmed() && Date.now() - freshnessConfirmedAt < 750) {
      return;
    }
  }

  if (!opts?.force && isCloudFreshnessConfirmed()) return;

  const fn = reconcileFn;
  if (!fn) {
    if (isCloudFreshnessConfirmed()) return;
    // vite-node / node harness (no DOM) — unit scripts mock cloud; App always has document.
    if (typeof document === "undefined") {
      setState("fresh", "test");
      return;
    }
    blockedWriteCount += 1;
    throw new CloudFreshnessBlockedError(
      "Zapis zablokowany — brak rejestracji odświeżenia chmury (aplikacja niegotowa).",
      state,
    );
  }

  setState("checking", reason);
  const run = (async () => {
    try {
      await fn({ reason, bypassThrottle: true });
      reconcileCount += 1;
      setState("fresh", "reconcile_ok");
    } catch (err) {
      setState("unconfirmed", "reconcile_fail");
      blockedWriteCount += 1;
      if (err instanceof CloudFreshnessBlockedError) throw err;
      throw new CloudFreshnessBlockedError(
        err instanceof Error ? err.message : undefined,
        "unconfirmed",
      );
    }
  })();

  inFlight = run.finally(() => {
    if (inFlight === run || inFlight === null) inFlight = null;
  });

  await inFlight;
}

/**
 * Enter after ensure succeeded for the duration of a push that must not re-enter ensure.
 * Prefer calling ensureCloudFreshBeforeWrite then withCloudFreshnessWritePass.
 */
export async function withCloudFreshnessWritePass<T>(fn: () => Promise<T>): Promise<T> {
  gatePassDepth += 1;
  try {
    return await fn();
  } finally {
    gatePassDepth -= 1;
  }
}

/** Test-only. */
export function resetCloudFreshnessGateForTests(opts?: { allowWrites?: boolean }): void {
  state = "unknown";
  freshnessConfirmedAt = 0;
  lastUnknownAt = 0;
  lastReason = "";
  inFlight = null;
  gatePassDepth = 0;
  reconcileCount = 0;
  blockedWriteCount = 0;
  reconcileFn = null;
  allowWritesWithoutFreshness = opts?.allowWrites === true;
}

export function setCloudFreshnessAllowWritesForTests(allow: boolean): void {
  allowWritesWithoutFreshness = allow;
}

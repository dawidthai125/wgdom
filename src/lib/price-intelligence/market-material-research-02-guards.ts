/**
 * MARKET-MATERIAL-RESEARCH-02 — provider load guards (C4).
 *
 * rate ≤ 6/min · timeout 12s · retry max 1 · circuit 3 failures / 5 min.
 * No live HTTP in production while D1 UNKNOWN / Legal OPEN — guards wrap
 * any future adapter and test probes only.
 */

import type {
  MaterialResearchProvider,
  MaterialResearchProviderInput,
  MaterialResearchProviderResult,
} from "./market-material-research-types";
import {
  MMR_02_CIRCUIT_FAILURES,
  MMR_02_CIRCUIT_WINDOW_MS,
  MMR_02_MAX_RETRY,
  MMR_02_RATE_LIMIT_PER_MIN,
  MMR_02_TIMEOUT_MS,
} from "./market-material-research-02-config";

export type ProviderLoadGuardState = {
  /** Timestamps of accepted attempt starts (rolling 60s). */
  attemptStartsMs: number[];
  /** Failure timestamps for circuit window. */
  failureStartsMs: number[];
  /** Open until this epoch ms (inclusive). */
  circuitOpenUntilMs: number;
  callCount: number;
  httpFetchCount: number;
};

export function createProviderLoadGuardState(): ProviderLoadGuardState {
  return {
    attemptStartsMs: [],
    failureStartsMs: [],
    circuitOpenUntilMs: 0,
    callCount: 0,
    httpFetchCount: 0,
  };
}

function pruneOlderThan(arr: number[], nowMs: number, windowMs: number): number[] {
  const floor = nowMs - windowMs;
  return arr.filter((t) => t >= floor);
}

export function isCircuitOpen(state: ProviderLoadGuardState, nowMs: number): boolean {
  return state.circuitOpenUntilMs > nowMs;
}

export function wouldExceedRateLimit(
  state: ProviderLoadGuardState,
  nowMs: number,
  limitPerMin: number = MMR_02_RATE_LIMIT_PER_MIN,
): boolean {
  const recent = pruneOlderThan(state.attemptStartsMs, nowMs, 60_000);
  return recent.length >= limitPerMin;
}

/**
 * Record a failure; opens circuit after MMR_02_CIRCUIT_FAILURES in window.
 */
export function recordProviderFailure(
  state: ProviderLoadGuardState,
  nowMs: number,
): void {
  state.failureStartsMs = pruneOlderThan(
    state.failureStartsMs,
    nowMs,
    MMR_02_CIRCUIT_WINDOW_MS,
  );
  state.failureStartsMs.push(nowMs);
  if (state.failureStartsMs.length >= MMR_02_CIRCUIT_FAILURES) {
    state.circuitOpenUntilMs = nowMs + MMR_02_CIRCUIT_WINDOW_MS;
  }
}

export function recordProviderSuccess(state: ProviderLoadGuardState): void {
  state.failureStartsMs = [];
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type WrapProviderLoadGuardsOpts = {
  state: ProviderLoadGuardState;
  nowMs?: () => number;
  timeoutMs?: number;
  maxRetry?: number;
  rateLimitPerMin?: number;
  /** Optional real fetch counter — production must never pass a live fetch. */
  onHttpFetch?: () => void;
};

/**
 * Wrap a provider with C4 limits. Fail-soft: returns ok:false errors, never throws.
 */
export function wrapProviderWithLoadGuards(
  inner: MaterialResearchProvider,
  opts: WrapProviderLoadGuardsOpts,
): MaterialResearchProvider {
  const timeoutMs = opts.timeoutMs ?? MMR_02_TIMEOUT_MS;
  const maxRetry = opts.maxRetry ?? MMR_02_MAX_RETRY;
  const rateLimit = opts.rateLimitPerMin ?? MMR_02_RATE_LIMIT_PER_MIN;
  const nowFn = opts.nowMs ?? (() => Date.now());

  return {
    id: inner.id,
    connected: inner.connected,
    async research(input: MaterialResearchProviderInput): Promise<MaterialResearchProviderResult> {
      const nowMs = nowFn();
      opts.state.callCount += 1;

      if (isCircuitOpen(opts.state, nowMs)) {
        return { ok: false, error: "CIRCUIT_OPEN" };
      }

      opts.state.attemptStartsMs = pruneOlderThan(opts.state.attemptStartsMs, nowMs, 60_000);
      if (opts.state.attemptStartsMs.length >= rateLimit) {
        return { ok: false, error: "RATE_LIMIT" };
      }
      opts.state.attemptStartsMs.push(nowMs);

      const attempts = 1 + Math.max(0, maxRetry);
      let lastError = "PROVIDER_FAILED";

      for (let i = 0; i < attempts; i++) {
        try {
          if (opts.onHttpFetch) {
            opts.onHttpFetch();
            opts.state.httpFetchCount += 1;
          }
          const result = await withTimeout(
            Promise.resolve(inner.research(input)),
            timeoutMs,
            "PROVIDER_TIMEOUT",
          );
          if (!result.ok) {
            lastError = result.error;
            recordProviderFailure(opts.state, nowFn());
            if (i + 1 < attempts) continue;
            return result;
          }
          recordProviderSuccess(opts.state);
          return result;
        } catch (e) {
          lastError = e instanceof Error ? e.message : "PROVIDER_FAILED";
          recordProviderFailure(opts.state, nowFn());
          if (i + 1 < attempts) continue;
          return { ok: false, error: lastError };
        }
      }

      return { ok: false, error: lastError };
    },
  };
}

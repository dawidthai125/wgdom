/**
 * NG11-A3 — speculative external discovery fork (∥ BZP) for auto bootstrap.
 * Scheduling only — no Edge / parser / merge policy changes.
 */

import { isPipelinePerfDiscoveryForkEnabled } from "@/lib/app-settings";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

/** Frozen NG11-A3 / RF-07 — external branch timeout. */
export const DISCOVERY_FORK_EXTERNAL_TIMEOUT_MS = 45_000;

/** Frozen NG11-A3 / RF-07 — T1 concurrent discovery network ops. */
export const DISCOVERY_T1_NETWORK_POOL = 2;

let testForceFlag: boolean | null = null;
let activeNetworkOps = 0;
let maxActiveNetworkOps = 0;
let poolPermits = DISCOVERY_T1_NETWORK_POOL;
const poolWaiters: Array<() => void> = [];

/** Test-only — override feature flag read. */
export function forcePipelineDiscoveryForkForTests(value: boolean | null): void {
  testForceFlag = value;
}

/** Test-only — reset pool + telemetry. */
export function resetDiscoveryForkTelemetryForTests(): void {
  activeNetworkOps = 0;
  maxActiveNetworkOps = 0;
  poolPermits = DISCOVERY_T1_NETWORK_POOL;
  poolWaiters.length = 0;
}

/** Test-only — peak concurrent network ops in last run. */
export function getMaxDiscoveryNetworkConcurrencyForTests(): number {
  return maxActiveNetworkOps;
}

/** NG11-A3 — discovery fork (default OFF). */
export function isPipelineDiscoveryForkEnabled(): boolean {
  if (testForceFlag !== null) return testForceFlag;
  return isPipelinePerfDiscoveryForkEnabled();
}

export type DiscoveryForkOpts = {
  mode: "auto" | "manual" | "rescan";
  includeExternal?: boolean;
  skipBzp?: boolean;
  noticeHtml?: string | null;
};

function isExternalDiscoverySettledLocal(
  item: Pick<TenderPipelineItem, "externalDocDiscovery">,
): boolean {
  return Boolean(item.externalDocDiscovery?.builtAt);
}

/** Speculative fork — auto only, before BZP result known. */
export function shouldStartDiscoveryFork(
  item: TenderPipelineItem,
  opts: DiscoveryForkOpts,
): boolean {
  if (!isPipelineDiscoveryForkEnabled()) return false;
  if (opts.mode !== "auto") return false;
  if (!opts.includeExternal) return false;
  if (opts.skipBzp) return false;
  if (!item.tenderId?.trim()) return false;
  const html = (opts.noticeHtml ?? item.noticeHtml ?? "").trim();
  if (!html) return false;
  if (isExternalDiscoverySettledLocal(item)) return false;
  return true;
}

async function acquireDiscoveryNetworkSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (poolPermits > 0) {
        poolPermits -= 1;
        activeNetworkOps += 1;
        maxActiveNetworkOps = Math.max(maxActiveNetworkOps, activeNetworkOps);
        resolve(() => {
          activeNetworkOps -= 1;
          poolPermits += 1;
          const next = poolWaiters.shift();
          if (next) next();
        });
      } else {
        poolWaiters.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

async function withExternalForkTimeout<T>(fn: () => Promise<T>): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      fn(),
      new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), DISCOVERY_FORK_EXTERNAL_TIMEOUT_MS);
      }),
    ]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type DiscoveryForkJoinMeta = {
  forkStarted: boolean;
  forkCancelled: boolean;
  forkWon: boolean;
  forkTimedOut: boolean;
};

export type DiscoveryForkJoinResult<TBzp, TExt> = {
  bzp: TBzp;
  external: TExt | null;
  meta: DiscoveryForkJoinMeta;
};

/**
 * Run BZP and speculative external in parallel (T1 pool bounded).
 * Discard external when BZP doc count > 0 after join.
 */
export async function runDiscoveryForkJoin<TBzp, TExt>(opts: {
  isCancelled: () => boolean;
  runBzp: () => Promise<TBzp>;
  runExternal: () => Promise<TExt>;
  getBzpDocCount: (bzp: TBzp) => number;
}): Promise<DiscoveryForkJoinResult<TBzp, TExt>> {
  const meta: DiscoveryForkJoinMeta = {
    forkStarted: true,
    forkCancelled: false,
    forkWon: false,
    forkTimedOut: false,
  };

  let discardExternal = false;

  const externalTask = (async (): Promise<TExt | null> => {
    const release = await acquireDiscoveryNetworkSlot();
    try {
      if (opts.isCancelled() || discardExternal) return null;
      const raced = await withExternalForkTimeout(async () => {
        if (opts.isCancelled() || discardExternal) return null;
        return opts.runExternal();
      });
      if (raced === "timeout") {
        meta.forkTimedOut = true;
        return null;
      }
      return raced;
    } catch {
      return null;
    } finally {
      release();
    }
  })();

  const releaseBzp = await acquireDiscoveryNetworkSlot();
  let bzp: TBzp;
  try {
    bzp = await opts.runBzp();
  } finally {
    releaseBzp();
  }

  const bzpDocCount = opts.getBzpDocCount(bzp);
  if (bzpDocCount > 0 || opts.isCancelled()) {
    discardExternal = true;
    meta.forkCancelled = bzpDocCount > 0;
    void externalTask;
    return { bzp, external: null, meta };
  }

  const external = await externalTask;
  if (external != null) {
    meta.forkWon = true;
  }
  return { bzp, external, meta };
}

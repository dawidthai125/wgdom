/**
 * NG11-Q3 — debounced cloud persist for kw-tenders-pipeline.
 * LS + session cache: sync · chmura: debounce 500 ms + flush triggers.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { saveTendersPipeline, saveTendersPipelineLocal } from "@/lib/tenders-bzp";
import { patchPipelineSessionCache } from "@/lib/tenders-pipeline-session-cache";
import { persistKey } from "@/lib/cloud-sync";
import { TENDERS_PIPELINE_KEY } from "@/lib/tenders-sync";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";
import { isPipelinePerfDebouncePersistEnabled } from "@/lib/app-settings";

export type TenderPipelinePersistFlushReason =
  | "debounce_timer"
  | "flush_explicit"
  | "ready"
  | "failed"
  | "visibility_hidden"
  | "beforeunload"
  | "unmount"
  | "bulk_persist";

const DEBOUNCE_MS = 500;

let pendingItems: TenderPipelineItem[] | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let cloudInFlight: Promise<void> | null = null;
let listenersInstalled = false;
let listenerRefCount = 0;

let cloudWriteCount = 0;
let forceDebounceForTests: boolean | null = null;
let cloudPushOverrideForTests: ((items: TenderPipelineItem[]) => Promise<void>) | null = null;

export function forcePipelinePersistDebounceForTests(on: boolean | null): void {
  forceDebounceForTests = on;
}

/** Test-only — stub cloud push (avoid live Edge/network in unit gates). */
export function setTenderPipelineCloudPushForTests(
  fn: ((items: TenderPipelineItem[]) => Promise<void>) | null,
): void {
  cloudPushOverrideForTests = fn;
}

export function resetTenderPipelinePersistCoalesceForTests(): void {
  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = null;
  pendingItems = null;
  cloudInFlight = null;
  cloudWriteCount = 0;
  forceDebounceForTests = null;
  cloudPushOverrideForTests = null;
}

export function getTenderPipelineCloudWriteCountForTests(): number {
  return cloudWriteCount;
}

export function isDebouncePersistActive(): boolean {
  if (forceDebounceForTests != null) return forceDebounceForTests;
  return isPipelinePerfDebouncePersistEnabled();
}

export function syncTenderPipelineLocalOnly(items: TenderPipelineItem[]): void {
  saveTendersPipelineLocal(items);
  patchPipelineSessionCache(items);
}

async function pushTenderPipelineCloudOnly(items: TenderPipelineItem[]): Promise<void> {
  cloudWriteCount += 1;
  if (cloudPushOverrideForTests) {
    await cloudPushOverrideForTests(items);
    return;
  }
  await persistKey(TENDERS_PIPELINE_KEY, items);
}

export function getTenderPipelinePersistPending(): boolean {
  return pendingItems != null || debounceTimer != null;
}

export function scheduleTenderPipelinePersist(
  items: TenderPipelineItem[],
  opts?: { immediate?: boolean; force?: boolean },
): void {
  if (!opts?.force && !isDebouncePersistActive()) return;

  pendingItems = items;
  syncTenderPipelineLocalOnly(items);

  if (opts?.immediate) {
    void flushTenderPipelinePersist("flush_explicit", { force: opts.force });
    return;
  }

  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushTenderPipelinePersist("debounce_timer", { force: opts?.force });
  }, DEBOUNCE_MS);
}

export async function flushTenderPipelinePersist(
  reason: TenderPipelinePersistFlushReason,
  opts?: { force?: boolean },
): Promise<void> {
  void reason;
  if (!opts?.force && !isDebouncePersistActive()) return;

  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const items = pendingItems;
  if (!items) return;
  pendingItems = null;

  if (cloudInFlight) {
    await cloudInFlight.catch(() => {});
  }

  cloudInFlight = pushTenderPipelineCloudOnly(items).finally(() => {
    cloudInFlight = null;
  });
  await cloudInFlight;
}

export function cancelTenderPipelinePersist(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingItems = null;
}

/** Ready / Failed — wywoływane z recordPipelineStateTiming (runtime → timing bridge). */
export function notifyPipelinePersistTerminalState(
  state: PipelineState,
  prevState: PipelineState | null,
): void {
  if (!isDebouncePersistActive()) return;
  if (prevState === state) return;
  if (state === PipelineState.Ready) {
    void flushTenderPipelinePersist("ready");
  } else if (state === PipelineState.Failed) {
    void flushTenderPipelinePersist("failed");
  }
}

function onVisibilityChange(): void {
  if (typeof document === "undefined") return;
  if (document.visibilityState === "hidden") {
    void flushTenderPipelinePersist("visibility_hidden");
  }
}

function onBeforeUnload(): void {
  void flushTenderPipelinePersist("beforeunload");
}

export function installTenderPipelinePersistFlushListeners(): () => void {
  listenerRefCount += 1;
  if (listenersInstalled || typeof window === "undefined") {
    return releaseTenderPipelinePersistFlushListeners;
  }
  listenersInstalled = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", onBeforeUnload);
  return releaseTenderPipelinePersistFlushListeners;
}

function releaseTenderPipelinePersistFlushListeners(): void {
  listenerRefCount = Math.max(0, listenerRefCount - 1);
  if (listenerRefCount > 0 || !listenersInstalled || typeof window === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("beforeunload", onBeforeUnload);
  listenersInstalled = false;
}

/** Bulk / BZP — flush pending, potem natychmiastowy cloud write. */
export async function persistTenderPipelineImmediate(items: TenderPipelineItem[]): Promise<void> {
  if (!isDebouncePersistActive()) {
    await saveTendersPipeline(items);
    return;
  }
  await flushTenderPipelinePersist("bulk_persist");
  syncTenderPipelineLocalOnly(items);
  pendingItems = null;
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (cloudInFlight) {
    await cloudInFlight.catch(() => {});
  }
  cloudInFlight = pushTenderPipelineCloudOnly(items).finally(() => {
    cloudInFlight = null;
  });
  await cloudInFlight;
}

/**
 * PAYROLL Runtime Trace — diagnostyka incydentu roster loss (SSOT v1.1).
 * Ring buffer + __wgdomPayrollTraceDump() — bez zmian merge/sync.
 */

import { APP_VERSION } from "@/app/changelog-data";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";

export type SubjectSource = "UI" | "LOCAL" | "LS" | "CLOUD" | "MERGED" | "EDGE_WRITTEN";
export type SubjectState =
  | "CREATED"
  | "PRESENT"
  | "FILTERED"
  | "MERGED"
  | "OVERWRITTEN"
  | "REMOVED";

export type TracePhase =
  | "UI"
  | "GUARD"
  | "LS"
  | "PUSH"
  | "HTTP_OUT"
  | "EDGE_KV"
  | "HTTP_IN"
  | "MERGE"
  | "APPLY"
  | "STATE"
  | "FILTER"
  | "DISPLAY"
  | "RS";

export type TraceTrigger =
  | "ui_add"
  | "run_cloud_sync"
  | "focus_pull"
  | "bootstrap"
  | "bootstrap_push"
  | "domain_verify"
  | "filter_production"
  | "display_resolve";

export type SkipReason =
  | "no_supabase"
  | "no_api_base"
  | "guard_blocked"
  | "keys_empty"
  | "tab_hidden"
  | "pull_in_flight"
  | "suppress_until"
  | "sync_in_flight"
  | "delete_in_flight"
  | "dedup_empty";

export interface RosterTraceSnapshot {
  weekFrom: string;
  weekTo: string;
  weekRangeKey: string;
  count: number;
  mergeKeys: string[];
  mergeKeysHash: string;
  richness: number;
  activeDays: number;
  subjectMergeKey?: string;
  subjectEmpId?: string;
  subjectPresent: boolean;
  subjectSource: SubjectSource;
  subjectState: SubjectState;
  rosterRevision: number;
}

export interface PayrollTraceEnvelope {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  event: string;
  appVersion: string;
  phase: TracePhase;
  sessionId: string;
  deviceLabel?: string;
  operationId?: string;
  parentOperationId?: string;
  pushTraceId?: string;
  bootstrapPushId?: string;
  syncTraceId?: string;
  mergeTraceId?: string;
  httpRequestId?: string;
  httpSeq?: number;
  edgeRequestId?: string;
  trigger?: TraceTrigger;
  skipReason?: SkipReason;
  forceReplaceWeekEmployees?: boolean;
  pickedSide?: "local" | "cloud" | "union" | "merged";
  richnessOverride?: boolean;
  tombstoneHitsOnSubject?: boolean;
  subjectMergeKey?: string;
  subjectEmpId?: string;
  subjectPresent?: boolean;
  subjectSource?: SubjectSource;
  subjectState?: SubjectState;
  rosterRevision?: number;
  durationMs?: number;
  error?: { message: string; code?: string };
  [key: string]: unknown;
}

const RING_MAX = 300;
const ring: PayrollTraceEnvelope[] = [];
let ringWrite = 0;
let ringCount = 0;

const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let deviceLabel: string | undefined;
let activeOperationId: string | undefined;
let activeSubjectMergeKey: string | undefined;
let activeSubjectEmpId: string | undefined;
let rosterRevision = 0;

let activePushTraceId: string | undefined;
let activeSyncTraceId: string | undefined;
let activeMergeTraceId: string | undefined;
let activeBootstrapPushId: string | undefined;
let activeParentOperationId: string | undefined;

const httpSeqByTrace = new Map<string, number>();

function uuid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function mergeKeysHash(keys: string[]): string {
  let h = 5381;
  const s = keys.join("|");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return `h${(h >>> 0).toString(16)}`;
}

function weekRangeKeyStr(from: string, to: string): string {
  return from && to ? `${from}|${to}` : "";
}

function listRichness(list: unknown[]): number {
  let s = 0;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    s += 3;
    const days = (item as { days?: Record<string, { active?: boolean }> }).days;
    if (days) {
      for (const d of Object.values(days)) {
        if (d?.active) s += 2;
      }
    }
  }
  return s;
}

function listActiveDays(list: unknown[]): number {
  let n = 0;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const days = (item as { days?: Record<string, { active?: boolean }> }).days;
    if (!days) continue;
    for (const d of Object.values(days)) {
      if (d?.active) n += 1;
    }
  }
  return n;
}

function subjectPresentInList(
  list: unknown[],
  subjectKey?: string,
): boolean {
  if (!subjectKey) return false;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    if (weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }) === subjectKey) {
      return true;
    }
  }
  return false;
}

export function isPayrollTraceEnabled(): boolean {
  if (typeof globalThis !== "undefined" && (globalThis as { __wgdomPayrollTraceForce?: boolean }).__wgdomPayrollTraceForce) {
    return true;
  }
  if (import.meta.env?.VITE_DEBUG_PAYROLL_TRACE === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    const flag = localStorage.getItem("wg-payroll-trace");
    if (flag === "0") return false;
    // INCIDENT-23-07 cleanup — default OFF on prod; enable via __wgdomPayrollTraceEnable() / localStorage=1
    if (flag === "1") return true;
  } catch { /* ignore */ }
  return false;
}

export function payrollTraceSetDeviceLabel(label: string): void {
  deviceLabel = label;
}

export function payrollTraceSetOperationId(id: string): void {
  activeOperationId = id;
}

export function payrollTraceGetOperationId(): string | undefined {
  return activeOperationId;
}

export function payrollTraceGetSubjectMergeKey(): string | undefined {
  return activeSubjectMergeKey;
}

export function payrollTraceSetSubject(mergeKey: string, empId?: string): void {
  activeSubjectMergeKey = mergeKey;
  if (empId) activeSubjectEmpId = empId;
}

export function payrollTraceBumpRosterRevision(): number {
  rosterRevision += 1;
  return rosterRevision;
}

export function payrollTraceCreatePushTraceId(): string {
  activePushTraceId = uuid("push");
  return activePushTraceId;
}

export function payrollTraceCreateSyncTraceId(parentOp?: string): string {
  activeSyncTraceId = uuid("sync");
  if (parentOp) activeParentOperationId = parentOp;
  return activeSyncTraceId;
}

export function payrollTraceCreateMergeTraceId(): string {
  activeMergeTraceId = uuid("merge");
  return activeMergeTraceId;
}

export function payrollTraceCreateBootstrapPushId(): string {
  activeBootstrapPushId = uuid("bpush");
  return activeBootstrapPushId;
}

export function payrollTraceNextHttpSeq(traceId?: string): number {
  const key = traceId ?? activePushTraceId ?? activeSyncTraceId ?? "default";
  const next = (httpSeqByTrace.get(key) ?? 0) + 1;
  httpSeqByTrace.set(key, next);
  return next;
}

export function payrollTraceNextHttpRequestId(): string {
  return uuid("http");
}

export function rosterTraceSnapshot(
  list: unknown[],
  weekFrom: string,
  weekTo: string,
  source: SubjectSource,
  state: SubjectState,
): RosterTraceSnapshot {
  const arr = Array.isArray(list) ? list : [];
  const mergeKeys: string[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    mergeKeys.push(weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }));
  }
  const present = subjectPresentInList(arr, activeSubjectMergeKey);
  return {
    weekFrom,
    weekTo,
    weekRangeKey: weekRangeKeyStr(weekFrom, weekTo),
    count: arr.length,
    mergeKeys,
    mergeKeysHash: mergeKeysHash(mergeKeys),
    richness: listRichness(arr),
    activeDays: listActiveDays(arr),
    subjectMergeKey: activeSubjectMergeKey,
    subjectEmpId: activeSubjectEmpId,
    subjectPresent: present,
    subjectSource: source,
    subjectState: state,
    rosterRevision,
  };
}

export function payrollTraceEmit(
  event: string,
  phase: TracePhase,
  level: PayrollTraceEnvelope["level"],
  extra: Record<string, unknown> = {},
): void {
  if (!isPayrollTraceEnabled()) return;
  const envelope: PayrollTraceEnvelope = {
    ts: new Date().toISOString(),
    level,
    event,
    appVersion: APP_VERSION,
    phase,
    sessionId,
    deviceLabel,
    operationId: activeOperationId,
    parentOperationId: activeParentOperationId,
    pushTraceId: activePushTraceId,
    bootstrapPushId: activeBootstrapPushId,
    syncTraceId: activeSyncTraceId,
    mergeTraceId: activeMergeTraceId,
    subjectMergeKey: activeSubjectMergeKey,
    subjectEmpId: activeSubjectEmpId,
    rosterRevision,
    ...extra,
  };
  if (ring.length < RING_MAX) {
    ring.push(envelope);
  } else {
    ring[ringWrite % RING_MAX] = envelope;
  }
  ringWrite += 1;
  ringCount = Math.min(ringCount + 1, RING_MAX);
}

function orderedEvents(): PayrollTraceEnvelope[] {
  if (ring.length < RING_MAX) return [...ring];
  const start = ringWrite % RING_MAX;
  return [...ring.slice(start), ...ring.slice(0, start)];
}

export interface SubjectLossPoint {
  event: string;
  ts: string;
  phase: TracePhase;
  subjectPresent?: boolean;
  subjectState?: SubjectState;
  rosterRevision?: number;
  index: number;
}

export function payrollTraceFindFirstSubjectLoss(events: PayrollTraceEnvelope[]): SubjectLossPoint | null {
  let wasPresent = false;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (
      e.subjectPresent === true
      || e.subjectState === "CREATED"
      || e.subjectState === "PRESENT"
      || e.subjectState === "MERGED"
    ) {
      wasPresent = true;
    }
    const roster = e.roster as RosterTraceSnapshot | undefined;
    if (roster?.subjectPresent === true) wasPresent = true;
    const out = e.out as RosterTraceSnapshot | undefined;
    if (out?.subjectPresent === true) wasPresent = true;
    if (!wasPresent) continue;
    const lost =
      e.subjectPresent === false
      || e.subjectState === "FILTERED"
      || e.subjectState === "OVERWRITTEN"
      || e.subjectState === "REMOVED"
      || roster?.subjectPresent === false
      || out?.subjectPresent === false
      || e.subjectDropped === true;
    if (lost) {
      return {
        event: e.event,
        ts: e.ts,
        phase: e.phase,
        subjectPresent: e.subjectPresent ?? roster?.subjectPresent ?? out?.subjectPresent,
        subjectState: e.subjectState ?? roster?.subjectState ?? out?.subjectState,
        rosterRevision: e.rosterRevision ?? roster?.rosterRevision ?? out?.rosterRevision,
        index: i,
      };
    }
  }
  return null;
}

export interface PayrollTraceDump {
  specVersion: "v1.1";
  sessionId: string;
  deviceLabel?: string;
  operationId?: string;
  subjectMergeKey?: string;
  subjectEmpId?: string;
  rosterRevision: number;
  eventCount: number;
  firstSubjectLoss: SubjectLossPoint | null;
  events: PayrollTraceEnvelope[];
}

export function payrollTraceDump(operationId?: string): PayrollTraceDump {
  let events = orderedEvents();
  if (operationId) {
    events = events.filter(
      (e) => e.operationId === operationId || e.parentOperationId === operationId,
    );
  }
  return {
    specVersion: "v1.1",
    sessionId,
    deviceLabel,
    operationId: operationId ?? activeOperationId,
    subjectMergeKey: activeSubjectMergeKey,
    subjectEmpId: activeSubjectEmpId,
    rosterRevision,
    eventCount: events.length,
    firstSubjectLoss: payrollTraceFindFirstSubjectLoss(events),
    events,
  };
}

export function installPayrollRuntimeTraceGlobals(): void {
  const g = globalThis as {
    __wgdomPayrollTraceDump?: (operationId?: string) => PayrollTraceDump;
    __wgdomPayrollTraceSetDevice?: (label: string) => void;
    __wgdomPayrollTraceSetOperation?: (id: string) => void;
    __wgdomPayrollTraceEnable?: () => void;
  };
  g.__wgdomPayrollTraceDump = payrollTraceDump;
  g.__wgdomPayrollTraceSetDevice = payrollTraceSetDeviceLabel;
  g.__wgdomPayrollTraceSetOperation = payrollTraceSetOperationId;
  g.__wgdomPayrollTraceEnable = () => {
    try { localStorage.setItem("wg-payroll-trace", "1"); } catch { /* ignore */ }
  };
}

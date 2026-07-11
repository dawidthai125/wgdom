/**
 * NG11-F0 — pipeline stage timing (ring buffer, DEV + opt-in sample).
 * Zero wpływu na logikę biznesową gdy wyłączone.
 */

import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";

export const PIPELINE_TIMING_STAGE_KEYS = [
  "discovery.notice",
  "discovery.bzp",
  "discovery.external",
  "discovery.light_swz",
  "discovery.persist_shell",
  "heavy.gate_wait",
  "heavy.archive_unpack",
  "heavy.prefetch",
  "heavy.parse_cost",
  "heavy.parse_metadata",
  "heavy.upload_fallback",
  "heavy.persist_dossier",
  "pricing.compute",
  "pricing.compute_partial",
  "pricing.compute_final",
  "pipeline.ready",
  "pipeline.state",
] as const;

export type PipelineTimingStageKey = (typeof PIPELINE_TIMING_STAGE_KEYS)[number];

export type PipelineTimingEventKind = "start" | "end" | "mark";

export interface PipelineTimingEvent {
  at: string;
  stage: PipelineTimingStageKey;
  kind: PipelineTimingEventKind;
  durationMs?: number;
  pipelineState?: PipelineState;
  detail?: string;
}

export interface PipelineTimingStageMetric {
  stage: PipelineTimingStageKey;
  count: number;
  firstAt: string | null;
  lastAt: string | null;
  totalDurationMs: number;
  lastDurationMs: number | null;
}

export interface PipelineTimingSnapshot {
  itemId: string;
  capturedAt: string;
  events: PipelineTimingEvent[];
  stages: PipelineTimingStageMetric[];
  pipelineState?: PipelineState;
}

export interface PipelineTimingBaselineExport {
  version: "ng11-f0-1";
  exportedAt: string;
  itemId: string;
  profile?: "light" | "medium" | "heavy";
  snapshot: PipelineTimingSnapshot;
  percentiles: Record<string, { p50: number | null; p95: number | null; samples: number }>;
}

const MAX_EVENTS = 40;
const eventsByItemId = new Map<string, PipelineTimingEvent[]>();
const activeStageStartMs = new Map<string, number>();

let forceEnabledForTests = false;
let forceDisabledForTests = false;

export function forcePipelineTimingEnabledForTests(on: boolean): void {
  forceEnabledForTests = on;
  if (on) forceDisabledForTests = false;
}

export function forcePipelineTimingDisabledForTests(on: boolean): void {
  forceDisabledForTests = on;
  if (on) forceEnabledForTests = false;
}

export function isPipelineTimingEnabled(): boolean {
  if (forceDisabledForTests) return false;
  if (forceEnabledForTests) return true;
  if (typeof import.meta === "undefined") return false;
  if (import.meta.env?.DEV) return true;
  return import.meta.env?.VITE_PIPELINE_TIMING === "1";
}

function stageActiveKey(itemId: string, stage: PipelineTimingStageKey): string {
  return `${itemId}::${stage}`;
}

function pushEvent(itemId: string, event: PipelineTimingEvent): void {
  const prev = eventsByItemId.get(itemId) ?? [];
  const next = [...prev, event];
  if (next.length > MAX_EVENTS) {
    next.splice(0, next.length - MAX_EVENTS);
  }
  eventsByItemId.set(itemId, next);
}

export function markPipelineTimingStage(
  itemId: string,
  stage: PipelineTimingStageKey,
  kind: PipelineTimingEventKind,
  meta?: { pipelineState?: PipelineState; detail?: string },
): void {
  if (!itemId?.trim() || !isPipelineTimingEnabled()) return;

  const at = new Date().toISOString();
  const activeKey = stageActiveKey(itemId, stage);
  let durationMs: number | undefined;

  if (kind === "start") {
    activeStageStartMs.set(activeKey, Date.now());
  } else if (kind === "end") {
    const started = activeStageStartMs.get(activeKey);
    if (started != null) {
      durationMs = Math.max(0, Date.now() - started);
      activeStageStartMs.delete(activeKey);
    }
  }

  pushEvent(itemId, {
    at,
    stage,
    kind,
    durationMs,
    pipelineState: meta?.pipelineState,
    detail: meta?.detail,
  });
}

export async function withPipelineTimingStage<T>(
  itemId: string,
  stage: PipelineTimingStageKey,
  fn: () => Promise<T>,
  meta?: { pipelineState?: PipelineState; detail?: string },
): Promise<T> {
  if (!isPipelineTimingEnabled()) return fn();
  markPipelineTimingStage(itemId, stage, "start", meta);
  try {
    return await fn();
  } finally {
    markPipelineTimingStage(itemId, stage, "end", meta);
  }
}

/** Read-only telemetry — przejścia derivePipelineState. */
export function recordPipelineStateTiming(
  itemId: string,
  state: PipelineState,
  prevState: PipelineState | null,
): void {
  if (!itemId?.trim() || !isPipelineTimingEnabled()) return;
  if (prevState === state) return;
  markPipelineTimingStage(itemId, "pipeline.state", "mark", {
    pipelineState: state,
    detail: prevState != null ? `${prevState}→${state}` : state,
  });
  if (state === PipelineState.Ready) {
    markPipelineTimingStage(itemId, "pipeline.ready", "mark", { pipelineState: state });
  }
}

export function readPipelineTimingEvents(itemId: string): PipelineTimingEvent[] {
  return eventsByItemId.get(itemId) ?? [];
}

function buildStageMetrics(events: PipelineTimingEvent[]): PipelineTimingStageMetric[] {
  const byStage = new Map<PipelineTimingStageKey, PipelineTimingStageMetric>();
  for (const key of PIPELINE_TIMING_STAGE_KEYS) {
    byStage.set(key, {
      stage: key,
      count: 0,
      firstAt: null,
      lastAt: null,
      totalDurationMs: 0,
      lastDurationMs: null,
    });
  }
  for (const ev of events) {
    const row = byStage.get(ev.stage);
    if (!row) continue;
    row.count += 1;
    row.firstAt = row.firstAt ?? ev.at;
    row.lastAt = ev.at;
    if (ev.durationMs != null) {
      row.totalDurationMs += ev.durationMs;
      row.lastDurationMs = ev.durationMs;
    }
  }
  return PIPELINE_TIMING_STAGE_KEYS.map((k) => byStage.get(k)!);
}

export function buildPipelineTimingSnapshot(
  itemId: string,
  pipelineState?: PipelineState,
): PipelineTimingSnapshot | null {
  if (!itemId?.trim() || !isPipelineTimingEnabled()) return null;
  const events = readPipelineTimingEvents(itemId);
  return {
    itemId,
    capturedAt: new Date().toISOString(),
    events,
    stages: buildStageMetrics(events),
    pipelineState,
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export function computeStageDurationPercentiles(
  events: PipelineTimingEvent[],
): Record<string, { p50: number | null; p95: number | null; samples: number }> {
  const durations = new Map<string, number[]>();
  for (const ev of events) {
    if (ev.durationMs == null) continue;
    const list = durations.get(ev.stage) ?? [];
    list.push(ev.durationMs);
    durations.set(ev.stage, list);
  }
  const out: Record<string, { p50: number | null; p95: number | null; samples: number }> = {};
  for (const [stage, list] of durations) {
    const sorted = [...list].sort((a, b) => a - b);
    out[stage] = {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      samples: sorted.length,
    };
  }
  return out;
}

export function exportPipelineTimingBaseline(
  itemId: string,
  opts?: { profile?: "light" | "medium" | "heavy"; pipelineState?: PipelineState },
): PipelineTimingBaselineExport | null {
  const snapshot = buildPipelineTimingSnapshot(itemId, opts?.pipelineState);
  if (!snapshot) return null;
  return {
    version: "ng11-f0-1",
    exportedAt: new Date().toISOString(),
    itemId,
    profile: opts?.profile,
    snapshot,
    percentiles: computeStageDurationPercentiles(snapshot.events),
  };
}

export function resetPipelineTimingForTests(): void {
  eventsByItemId.clear();
  activeStageStartMs.clear();
  forceEnabledForTests = false;
  forceDisabledForTests = false;
}

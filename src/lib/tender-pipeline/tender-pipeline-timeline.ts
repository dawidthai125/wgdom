/**
 * NG-02 — dev-only timeline pipeline (ring buffer, bez PII).
 */

import { PipelineState, type PipelineTimelineEntry } from "@/lib/tender-pipeline/tender-pipeline-types";

const MAX_ENTRIES = 40;
const timelinesByItemId = new Map<string, PipelineTimelineEntry[]>();

export function isPipelineTimelineEnabled(): boolean {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

import type { UnifiedGateReason, UnifiedGateStatus } from "@/lib/tender-pipeline/unified-attachment-gate";

export function recordPipelineTimelineEvent(
  itemId: string,
  state: PipelineState,
  meta?: {
    detail?: string;
    gateStatus?: UnifiedGateStatus;
    gateReason?: UnifiedGateReason;
  },
): PipelineTimelineEntry[] {
  if (!isPipelineTimelineEnabled()) return [];
  const row: PipelineTimelineEntry = {
    at: new Date().toISOString(),
    state,
    detail: meta?.detail,
    gateStatus: meta?.gateStatus,
    gateReason: meta?.gateReason,
  };
  const prev = timelinesByItemId.get(itemId) ?? [];
  const next = [...prev, row];
  if (next.length > MAX_ENTRIES) {
    next.splice(0, next.length - MAX_ENTRIES);
  }
  timelinesByItemId.set(itemId, next);
  return next;
}

export function readPipelineTimeline(itemId: string): PipelineTimelineEntry[] {
  return timelinesByItemId.get(itemId) ?? [];
}

export function resetPipelineTimelineForTests(): void {
  timelinesByItemId.clear();
}

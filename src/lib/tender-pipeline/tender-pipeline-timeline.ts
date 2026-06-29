/**
 * NG-02 — dev-only timeline pipeline (ring buffer, bez PII).
 */

import { PipelineState, type PipelineTimelineEntry } from "@/lib/tender-pipeline/tender-pipeline-types";

const MAX_ENTRIES = 40;
const timelinesByItemId = new Map<string, PipelineTimelineEntry[]>();

export function isPipelineTimelineEnabled(): boolean {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

export function recordPipelineTimelineEvent(
  itemId: string,
  state: PipelineState,
  detail?: string,
): PipelineTimelineEntry[] {
  if (!isPipelineTimelineEnabled()) return [];
  const row: PipelineTimelineEntry = {
    at: new Date().toISOString(),
    state,
    detail,
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

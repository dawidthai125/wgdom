/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — anti-storm (dedupe · single-flight · cooldown).
 * ONE workId|unit at a time · no mass harvest.
 */

import { buildWorkRateIdentityKey } from "@/lib/work-catalog/work-rate-types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const WORK_RATE_RESEARCH_COOLDOWN_MS = 60_000;

const cooldownUntilByKey = new Map<string, number>();
const inFlightByKey = new Map<string, Promise<unknown>>();

export function workRateResearchIdentityKey(workId: string, unit: WgdomCostUnit): string {
  return buildWorkRateIdentityKey(workId, unit);
}

export function clearWorkRateResearchAntiStormState(): void {
  cooldownUntilByKey.clear();
  inFlightByKey.clear();
}

export function isWorkRateResearchInCooldown(
  workId: string,
  unit: WgdomCostUnit,
  nowMs = Date.now(),
): boolean {
  const until = cooldownUntilByKey.get(workRateResearchIdentityKey(workId, unit)) ?? 0;
  return until > nowMs;
}

export function markWorkRateResearchCooldown(
  workId: string,
  unit: WgdomCostUnit,
  nowMs = Date.now(),
  cooldownMs = WORK_RATE_RESEARCH_COOLDOWN_MS,
): void {
  cooldownUntilByKey.set(workRateResearchIdentityKey(workId, unit), nowMs + cooldownMs);
}

export function isWorkRateResearchInFlight(workId: string, unit: WgdomCostUnit): boolean {
  return inFlightByKey.has(workRateResearchIdentityKey(workId, unit));
}

/**
 * Single-flight: równoległe wywołania tej samej roboty dzielą ten sam Promise.
 */
export async function runWorkRateResearchSingleFlight<T>(
  workId: string,
  unit: WgdomCostUnit,
  run: () => Promise<T>,
): Promise<T> {
  const key = workRateResearchIdentityKey(workId, unit);
  const existing = inFlightByKey.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => {
    inFlightByKey.delete(key);
  });
  inFlightByKey.set(key, p);
  return p;
}

/** Dedupe listy identity — max jedna pozycja na workId|unit. */
export function dedupeWorkRateResearchTargets<T extends { workId: string; unit: WgdomCostUnit }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = workRateResearchIdentityKey(item.workId, item.unit);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

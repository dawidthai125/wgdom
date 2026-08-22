/**
 * KL-7-P2C — Client single-flight / cooldown (anti-storm ONLY).
 * Identity: evidenceKeyV1 + sourceId — NEVER workId|unit.
 * Edge lease remains concurrency authority.
 */

import { buildKnrDiscoveryJobId } from "./knr-discovery-job-lease";

export const KNR_DISCOVERY_CLIENT_SF_COOLDOWN_MS = 60_000 as const;

const cooldownUntilByKey = new Map<string, number>();
const inFlightByKey = new Map<string, Promise<unknown>>();

export function knrDiscoveryClientSfKey(evidenceKeyV1: string, sourceId: string): string {
  return buildKnrDiscoveryJobId(evidenceKeyV1, sourceId);
}

export function clearKnrDiscoveryClientSfStateForTests(): void {
  cooldownUntilByKey.clear();
  inFlightByKey.clear();
}

export function isKnrDiscoveryClientSfInFlight(
  evidenceKeyV1: string,
  sourceId: string,
): boolean {
  return inFlightByKey.has(knrDiscoveryClientSfKey(evidenceKeyV1, sourceId));
}

export function markKnrDiscoveryClientSfCooldown(
  evidenceKeyV1: string,
  sourceId: string,
  nowMs = Date.now(),
  cooldownMs = KNR_DISCOVERY_CLIENT_SF_COOLDOWN_MS,
): void {
  cooldownUntilByKey.set(knrDiscoveryClientSfKey(evidenceKeyV1, sourceId), nowMs + cooldownMs);
}

export function isKnrDiscoveryClientSfInCooldown(
  evidenceKeyV1: string,
  sourceId: string,
  nowMs = Date.now(),
): boolean {
  const until = cooldownUntilByKey.get(knrDiscoveryClientSfKey(evidenceKeyV1, sourceId)) ?? 0;
  return until > nowMs;
}

/** Parallel calls with same evidenceKey+sourceId share one Promise. */
export async function runKnrDiscoveryClientSingleFlight<T>(
  evidenceKeyV1: string,
  sourceId: string,
  run: () => Promise<T>,
): Promise<T> {
  const key = knrDiscoveryClientSfKey(evidenceKeyV1, sourceId);
  const existing = inFlightByKey.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => {
    inFlightByKey.delete(key);
  });
  inFlightByKey.set(key, p);
  return p;
}

export const KNR_DISCOVERY_CLIENT_SF_P2C_IMPLEMENTED = true as const;

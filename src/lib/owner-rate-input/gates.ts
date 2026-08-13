/**
 * OWNER-INPUT-01 — noise / utylizacja gates (HARD).
 */

import type {
  OwnerRateLogisticsSignalKind,
  OwnerRateNoiseGate,
} from "./types";

export type OwnerRateGateRejectReason = "NOISE_TRANSPORT" | "UTYLIZACJA_ONLY";

export type OwnerRateGateResult =
  | { ok: true }
  | { ok: false; reason: OwnerRateGateRejectReason };

/**
 * isNoise === true AND noiseKind === "transport" → REJECT.
 * Noise stays NOISE_SKIP — never Owner Question for Bid transport rate.
 */
export function evaluateNoiseTransportGate(
  noise: OwnerRateNoiseGate | undefined,
): OwnerRateGateResult {
  if (!noise) return { ok: true };
  if (noise.isNoise === true && noise.noiseKind === "transport") {
    return { ok: false, reason: "NOISE_TRANSPORT" };
  }
  return { ok: true };
}

/**
 * Disposal / TRANSPORT_UTYLIZACJA signals must NOT open logistics Transport Owner Question.
 */
export function evaluateUtylizacjaGate(
  signalKind: OwnerRateLogisticsSignalKind | undefined,
): OwnerRateGateResult {
  if (!signalKind) return { ok: true };
  if (
    signalKind === "utylizacja" ||
    signalKind === "disposal_only" ||
    signalKind === "TRANSPORT_UTYLIZACJA"
  ) {
    return { ok: false, reason: "UTYLIZACJA_ONLY" };
  }
  return { ok: true };
}

export function evaluateOwnerRateQuestionGates(input: {
  noise?: OwnerRateNoiseGate;
  signalKind?: OwnerRateLogisticsSignalKind;
}): OwnerRateGateResult {
  const noise = evaluateNoiseTransportGate(input.noise);
  if (!noise.ok) return noise;
  return evaluateUtylizacjaGate(input.signalKind);
}

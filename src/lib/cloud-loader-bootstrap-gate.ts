/**
 * PAYROLL-BOOTSTRAP-RACE-FIX-01 — pure bootstrap gate SSOT (CloudLoader + tests).
 */

export type BootstrapPhase = "PENDING" | "SUCCESS" | "FAILED" | "TIMEOUT";

/** Offline escape — mount ze stale LS gdy fetch wisi; nie parallel 3s race. */
export const BOOTSTRAP_OFFLINE_TIMEOUT_MS = 15_000;

export function isCloudBootstrapReady(phase: BootstrapPhase): boolean {
  return phase !== "PENDING";
}

/** Pierwsze przejście z PENDING wygrywa — późny SUCCESS nie nadpisuje TIMEOUT. */
export function resolveBootstrapPhaseOpen(
  current: BootstrapPhase,
  next: Exclude<BootstrapPhase, "PENDING">,
): BootstrapPhase {
  return current === "PENDING" ? next : current;
}

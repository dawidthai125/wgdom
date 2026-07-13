/**
 * JOBS-SYNC-FIX-01 — MF-3 admin bundle generation guard.
 */

let adminBundleGeneration = 0;

export function bumpAdminBundleGeneration(): number {
  adminBundleGeneration += 1;
  return adminBundleGeneration;
}

export function getAdminBundleGeneration(): number {
  return adminBundleGeneration;
}

/** Test-only reset. */
export function resetAdminBundleGenerationForTests(): void {
  adminBundleGeneration = 0;
}

export function shouldApplyAdminBundleAtGeneration(capturedGeneration: number): boolean {
  return getAdminBundleGeneration() <= capturedGeneration;
}

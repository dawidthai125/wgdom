/**
 * TEST-INFRA-001 L0 — Payroll harness constants + browser patch (Playwright-safe).
 */
import type { HarnessRunManifest } from "../helpers/test-harness/core/manifest";

export const HARNESS_MARKER = "• TEST-INFRA-001";
export const E2E_PAYROLL_DIR_ID = "e2e-payroll-dir-001";
export const E2E_PAYROLL_WE_ID = "e2e-payroll-we-001";
export const E2E_PAYROLL_JOB_A_ID = "e2e-payroll-job-a";
export const E2E_PAYROLL_JOB_B_ID = "e2e-payroll-job-b";
export const E2E_PAYROLL_ADMIN_PASS = "e2e-payroll-admin-pass";

/**
 * Prod sandbox job IDs (#018) — dedykowane, bezpieczne joby prod (whitelist).
 * SSOT dla preconditionu NO_SANDBOX_JOBS (seed-ssot.ts). Fail-loud gdy pusta.
 *
 * NIE commitować realnych ID prod do repo. Uzupełnienie operacyjne przez zmienną
 * środowiskową HARNESS_SANDBOX_JOB_IDS (lista rozdzielona przecinkami) w czasie
 * uruchomienia. Pusty default utrzymuje blokadę prod harness do konfiguracji ops.
 */
const rawSandboxJobIds =
  typeof process !== "undefined" ? (process.env.HARNESS_SANDBOX_JOB_IDS ?? "") : "";
export const HARNESS_SANDBOX_JOB_IDS: string[] = rawSandboxJobIds
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

export type PayrollHarnessTarget = "localhost" | "preview" | "prod";
export type PayrollAssignmentSeedMode = "empty" | "withEntryOnJobA";

export interface SeedPayrollAssignmentOptions {
  target: PayrollHarnessTarget;
  mode?: PayrollAssignmentSeedMode;
  jobStrategy?: "sandbox" | "synthetic";
  runId?: string;
  mergeOnly?: boolean;
  weekFrom?: string;
  weekTo?: string;
}

export interface PayrollAssignmentSeedResult {
  manifest: HarnessRunManifest;
  empName: string;
  weekEmployeeId: string;
  directoryId: string;
  weekFrom: string;
  weekTo: string;
  jobAId: string;
  jobBId: string;
  assignmentDateIso: string;
  adminHash: string;
  localStoragePatch: Record<string, string>;
}

export function applyPayrollHarnessPatchInBrowser(patch: Record<string, string>): void {
  for (const [key, value] of Object.entries(patch)) {
    localStorage.setItem(key, value);
  }
}

export { buildPayrollHarnessSeed } from "../helpers/test-harness/core/ssot-bridge.mjs";

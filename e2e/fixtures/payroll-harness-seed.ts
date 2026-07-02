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
 * Prod sandbox job IDs (#018) — mechanizm HISTORYCZNY / compat.
 *
 * TI-B2.1 (DESIGN FREEZE): docelowa strategia harness to Synthetic + Merge, Preview First.
 * Ścieżka "sandbox" (write do realnych jobów prod) została ODRZUCONA i nie jest rozwijana.
 * Stała pozostaje wyłącznie jako punkt zgodności do czasu pełnej oceny; seed jej nie używa.
 *
 * NIE commitować realnych ID prod do repo (zasilane przez env HARNESS_SANDBOX_JOB_IDS).
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
  runId?: string;
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

/**
 * TI-B2.1 — Aplikacja seeda w przeglądarce z WŁASNYM inwariantem bezpieczeństwa.
 *
 * Funkcja jest serializowana do kontekstu strony (page.evaluate / addInitScript),
 * więc musi być samowystarczalna (bez closure/importów).
 *
 * Gwarancje (niezależne od blockCloudSync):
 *  1. Inwariant środowiska (allowlist): fail-loud (throw) dla KAŻDEGO hosta poza
 *     loopback (127.0.0.1 / localhost / ::1). Blokuje prod (wgdom.fun/online) oraz
 *     wszelkie hosty chmurowe (np. *.vercel.app) — Preview First.
 *  2. Merge-not-replace: NIGDY full replace istniejących kluczy —
 *     - klucze-tablice (kw-jobs/…): union po `id` (dane spoza harnessu zachowane),
 *     - klucze-obiekty (kw-admin-passwords): shallow merge (harness dokłada swój wpis),
 *     - klucze skalarne (kw-weekFrom/kw-weekTo): ustaw wyłącznie gdy brak (nie nadpisuj).
 */
export function applyPayrollHarnessPatchInBrowser(patch: Record<string, string>): void {
  const host = typeof location !== "undefined" ? location.hostname : "";
  const isLoopback =
    host === "" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]";
  if (!isLoopback) {
    throw new Error(
      `HARNESS_UNSAFE_ENV: seed dozwolony wyłącznie na loopback (Preview First) — otrzymano host: "${host}"`,
    );
  }

  const arrayKeys = new Set(["kw-jobs", "kw-week-employees", "kw-directory", "kw-archive"]);
  const objectKeys = new Set(["kw-admin-passwords"]);

  for (const [key, value] of Object.entries(patch)) {
    if (arrayKeys.has(key)) {
      const parsedExisting: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      const parsedIncoming: unknown = JSON.parse(value || "[]");
      const existing = Array.isArray(parsedExisting) ? parsedExisting : [];
      const incoming = Array.isArray(parsedIncoming) ? parsedIncoming : [];
      const byId = new Map<string, unknown>();
      let autoIndex = 0;
      for (const item of [...existing, ...incoming]) {
        const id =
          item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
            ? (item as { id: string }).id
            : `__noid-${autoIndex++}`;
        byId.set(id, item);
      }
      localStorage.setItem(key, JSON.stringify([...byId.values()]));
    } else if (objectKeys.has(key)) {
      const parsedExisting: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
      const parsedIncoming: unknown = JSON.parse(value || "{}");
      const existing =
        parsedExisting && typeof parsedExisting === "object" ? parsedExisting : {};
      const incoming =
        parsedIncoming && typeof parsedIncoming === "object" ? parsedIncoming : {};
      localStorage.setItem(key, JSON.stringify({ ...existing, ...incoming }));
    } else if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, value);
    }
  }
}

export { buildPayrollHarnessSeed } from "../helpers/test-harness/core/ssot-bridge.mjs";

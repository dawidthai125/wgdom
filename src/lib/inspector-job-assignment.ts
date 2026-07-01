/**
 * INSPECTOR-JOB-ASSIGN-001 — przypisanie inspektora WM do roboty (#001–#012).
 */

import type { Job } from "@/app/app-domain";
import { getAllAdminAccounts } from "@/lib/admin-auth";

export function sanitizeAssignedInspectorId(raw: string | undefined | null): string | undefined {
  const id = raw?.trim();
  return id || undefined;
}

/** Merge LWW — wzorzec mergeExecutionLeadDirectoryId (#001). */
export function mergeAssignedInspectorId(
  a?: string,
  b?: string,
  preferB?: boolean,
): string | undefined {
  const idA = sanitizeAssignedInspectorId(a);
  const idB = sanitizeAssignedInspectorId(b);
  if (!idA) return idB;
  if (!idB) return idA;
  return preferB ? idB : idA;
}

export function getKnownInspectorUserIds(): Set<string> {
  return new Set(
    getAllAdminAccounts()
      .filter((a) => a.role === "inspector")
      .map((a) => a.id),
  );
}

export function isKnownInspectorUserId(id: string | undefined | null): boolean {
  const trimmed = sanitizeAssignedInspectorId(id);
  if (!trimmed) return false;
  return getKnownInspectorUserIds().has(trimmed);
}

/** #003 — jeden helper widoczności inspektora. */
export function filterJobsForInspector<T extends Pick<Job, "assignedInspectorId">>(
  jobs: T[],
  inspectorUserId: string,
): T[] {
  const id = inspectorUserId.trim();
  if (!id) return [];
  return jobs.filter((j) => j.assignedInspectorId === id);
}

export function isJobVisibleToInspector(
  job: Pick<Job, "assignedInspectorId">,
  inspectorUserId: string,
): boolean {
  return job.assignedInspectorId === inspectorUserId.trim();
}

export type AssignedInspectorValidationResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "orphan"; message: string };

/** #009 / #010 — walidacja przed zapisem roboty (admin). */
export function validateJobAssignedInspectorForSave(
  job: Pick<Job, "assignedInspectorId">,
): AssignedInspectorValidationResult {
  const id = sanitizeAssignedInspectorId(job.assignedInspectorId);
  if (!id) {
    return {
      ok: false,
      reason: "missing",
      message: "Wybierz inspektora WM — pole jest obowiązkowe.",
    };
  }
  if (!isKnownInspectorUserId(id)) {
    return {
      ok: false,
      reason: "orphan",
      message: "Przypisany inspektor nie istnieje w systemie — wybierz aktywnego inspektora.",
    };
  }
  return { ok: true };
}

/** #008 — migracja legacy (tylko skrypt migracji, nie reguła produktowa). */
export const MIGRATION_LEGACY_INSPECTOR_ID = "szymon";

export function applyLegacyInspectorMigration<T extends Job>(jobs: T[]): { jobs: T[]; migrated: number } {
  let migrated = 0;
  const next = jobs.map((job) => {
    if (sanitizeAssignedInspectorId(job.assignedInspectorId)) return job;
    migrated += 1;
    return { ...job, assignedInspectorId: MIGRATION_LEGACY_INSPECTOR_ID };
  });
  return { jobs: next, migrated };
}

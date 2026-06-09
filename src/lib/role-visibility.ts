/** Polityka widoczności etykiet ról w UI (Sprint 20.5A.7). */

import type { AdminRole } from "@/lib/admin-auth";
import { adminRoleLabel } from "@/lib/admin-auth";

export type SubjectRole = AdminRole | "worker" | null;

const SHORT_LABELS: Record<AdminRole | "worker", string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  moderator: "Moderator",
  inspector: "Inspektor",
  worker: "Pracownik",
};

/**
 * Etykieta roli autora widoczna dla danego viewer'a.
 * null = brak chipu / subtitle roli administracyjnej.
 */
export function visibleRoleLabelForViewer(
  viewerRole: AdminRole,
  subjectRole: SubjectRole,
  opts?: { variant?: "short" | "full" },
): string | null {
  if (subjectRole === null) return null;

  if (subjectRole === "worker") {
    return SHORT_LABELS.worker;
  }

  if (viewerRole === "super_admin") {
    return opts?.variant === "full" ? adminRoleLabel(subjectRole) : SHORT_LABELS[subjectRole];
  }

  if (subjectRole === "inspector") {
    return opts?.variant === "full" ? adminRoleLabel("inspector") : SHORT_LABELS.inspector;
  }

  return null;
}

/** Czy topbar może pokazać rolę w tooltipie (tylko super admin). */
export function topbarRoleTooltipVisible(viewerRole: AdminRole): boolean {
  return viewerRole === "super_admin";
}

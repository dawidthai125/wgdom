/** Audit Hub — ACL (Super Admin only). */

import type { AdminSession } from "@/lib/admin-auth";
import { adminIsSuperAdmin } from "@/lib/admin-auth";

export function canAccessAuditHub(session: AdminSession | null | undefined): boolean {
  return session != null && adminIsSuperAdmin(session.role);
}

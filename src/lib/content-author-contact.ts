/** Dopasowanie autora treści → telefon (pracownik z kartoteki lub rola admina). */

import type { AdminRole } from "@/lib/admin-auth";
import { getAllAdminAccounts } from "@/lib/admin-auth";
import type { RoleContactPhones } from "@/lib/app-settings";
import type { JobNoteAuthorRole } from "@/lib/job-wm";

export function personNamesMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase().replace(/\s+/g, " ");
  const nb = b.trim().toLowerCase().replace(/\s+/g, " ");
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const fa = na.split(" ")[0];
  const fb = nb.split(" ")[0];
  return fa.length > 2 && fa === fb;
}

export type AuthorKind = "worker" | "admin" | "inspector" | "system" | "unknown";

export interface ResolvedAuthor {
  name: string;
  phone: string | null;
  kind: AuthorKind;
  /** Etykieta roli do wyświetlenia, np. „Administrator” */
  roleLabel: string | null;
}

function rolePhone(role: AdminRole, phones: RoleContactPhones): string | null {
  if (role === "super_admin") return phones.super_admin.trim() || null;
  if (role === "admin") return phones.admin.trim() || null;
  if (role === "moderator") return phones.moderator.trim() || null;
  return null;
}

function adminRoleLabelShort(role: AdminRole): string {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "admin": return "Administrator";
    case "moderator": return "Moderator";
    case "inspector": return "Inspektor";
    default: return role;
  }
}

function findAdminByName(name: string): { role: AdminRole; displayName: string } | null {
  const n = name.trim();
  if (!n) return null;
  for (const a of getAllAdminAccounts()) {
    if (personNamesMatch(n, a.displayName) || personNamesMatch(n, a.login)) {
      return { role: a.role, displayName: a.displayName };
    }
  }
  return null;
}

function findWorkerPhone(name: string, directory: { name: string; phone: string }[]): string | null {
  const n = name.trim();
  if (!n) return null;
  for (const d of directory) {
    if (personNamesMatch(n, d.name)) {
      const ph = (d.phone || "").trim();
      if (ph && ph !== "—") return ph;
    }
  }
  return null;
}

export function resolveAuthorContact(
  name: string,
  opts: {
    directory: { name: string; phone: string }[];
    roleContactPhones: RoleContactPhones;
    noteRole?: JobNoteAuthorRole;
    reportAdminRole?: AdminRole | "worker";
  },
): ResolvedAuthor {
  const raw = (name || "").trim() || "—";
  const lower = raw.toLowerCase();

  if (lower === "system" || lower === "administrator (system)") {
    return { name: raw, phone: null, kind: "system", roleLabel: null };
  }

  if (opts.noteRole === "inspector" || opts.reportAdminRole === "inspector") {
    const admin = findAdminByName(raw);
    return {
      name: admin?.displayName || raw,
      phone: admin?.role === "inspector" ? findWorkerPhone(raw, opts.directory) : null,
      kind: "inspector",
      roleLabel: "Inspektor",
    };
  }

  if (opts.reportAdminRole === "worker") {
    return {
      name: raw,
      phone: findWorkerPhone(raw, opts.directory),
      kind: "worker",
      roleLabel: "Pracownik",
    };
  }

  if (opts.reportAdminRole && opts.reportAdminRole !== "worker") {
    const admin = findAdminByName(raw);
    const role = admin?.role || opts.reportAdminRole;
    if (role !== "inspector") {
      return {
        name: admin?.displayName || raw,
        phone: rolePhone(role, opts.roleContactPhones),
        kind: "admin",
        roleLabel: adminRoleLabelShort(role),
      };
    }
  }

  if (lower === "administrator") {
    return {
      name: raw,
      phone: rolePhone("admin", opts.roleContactPhones),
      kind: "admin",
      roleLabel: "Administrator",
    };
  }

  const admin = findAdminByName(raw);
  if (admin && admin.role !== "inspector") {
    return {
      name: admin.displayName,
      phone: rolePhone(admin.role, opts.roleContactPhones),
      kind: "admin",
      roleLabel: adminRoleLabelShort(admin.role),
    };
  }

  if (admin?.role === "inspector") {
    return {
      name: admin.displayName,
      phone: findWorkerPhone(raw, opts.directory),
      kind: "inspector",
      roleLabel: "Inspektor",
    };
  }

  const workerPhone = findWorkerPhone(raw, opts.directory);
  if (workerPhone) {
    return { name: raw, phone: workerPhone, kind: "worker", roleLabel: "Pracownik" };
  }

  if (opts.noteRole === "admin") {
    return {
      name: raw,
      phone: rolePhone("admin", opts.roleContactPhones),
      kind: "admin",
      roleLabel: "Administrator",
    };
  }

  return { name: raw, phone: null, kind: "unknown", roleLabel: null };
}

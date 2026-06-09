/** Dopasowanie autora treści → telefon (pracownik z kartoteki lub konto admina). */

import type { AdminRole } from "@/lib/admin-auth";
import { getAllAdminAccounts, loadAdminUsersConfig } from "@/lib/admin-auth";
import type { JobNoteAuthorRole } from "@/lib/job-wm";
import { visibleRoleLabelForViewer, type SubjectRole } from "@/lib/role-visibility";

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
  /** Etykieta roli do wyświetlenia po filtrze viewerRole */
  roleLabel: string | null;
  /** Rola autora przed filtrem widoczności (smoke / debug) */
  subjectRole: SubjectRole;
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

function adminPhoneById(id: string): string | null {
  const ph = (loadAdminUsersConfig().contactPhones?.[id] ?? "").trim();
  return ph || null;
}

function findAdminByName(name: string): { id: string; role: AdminRole; displayName: string } | null {
  const n = name.trim();
  if (!n) return null;
  for (const a of getAllAdminAccounts()) {
    if (personNamesMatch(n, a.displayName) || personNamesMatch(n, a.login)) {
      return { id: a.id, role: a.role, displayName: a.displayName };
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

interface ResolveOpts {
  directory: { name: string; phone: string }[];
  noteRole?: JobNoteAuthorRole;
  reportAdminRole?: AdminRole | "worker";
  viewerRole: AdminRole;
}

function withVisibility(
  viewerRole: AdminRole,
  partial: Omit<ResolvedAuthor, "roleLabel"> & { unfilteredRoleLabel: string | null },
): ResolvedAuthor {
  const { unfilteredRoleLabel: _u, ...rest } = partial;
  return {
    ...rest,
    roleLabel: visibleRoleLabelForViewer(viewerRole, partial.subjectRole),
  };
}

export function resolveAuthorContact(
  name: string,
  opts: ResolveOpts,
): ResolvedAuthor {
  const raw = (name || "").trim() || "—";
  const lower = raw.toLowerCase();
  const { viewerRole } = opts;

  if (lower === "system" || lower === "administrator (system)") {
    return withVisibility(viewerRole, {
      name: raw,
      phone: null,
      kind: "system",
      subjectRole: null,
      unfilteredRoleLabel: null,
    });
  }

  if (opts.noteRole === "inspector" || opts.reportAdminRole === "inspector") {
    const admin = findAdminByName(raw);
    return withVisibility(viewerRole, {
      name: admin?.displayName || raw,
      phone: admin ? adminPhoneById(admin.id) : findWorkerPhone(raw, opts.directory),
      kind: "inspector",
      subjectRole: "inspector",
      unfilteredRoleLabel: "Inspektor",
    });
  }

  if (opts.reportAdminRole === "worker") {
    return withVisibility(viewerRole, {
      name: raw,
      phone: findWorkerPhone(raw, opts.directory),
      kind: "worker",
      subjectRole: "worker",
      unfilteredRoleLabel: "Pracownik",
    });
  }

  if (opts.reportAdminRole && opts.reportAdminRole !== "worker") {
    const admin = findAdminByName(raw);
    const role = admin?.role || opts.reportAdminRole;
    if (role !== "inspector") {
      return withVisibility(viewerRole, {
        name: admin?.displayName || raw,
        phone: admin ? adminPhoneById(admin.id) : null,
        kind: "admin",
        subjectRole: role,
        unfilteredRoleLabel: adminRoleLabelShort(role),
      });
    }
  }

  if (lower === "administrator") {
    return withVisibility(viewerRole, {
      name: raw,
      phone: null,
      kind: "admin",
      subjectRole: "admin",
      unfilteredRoleLabel: "Administrator",
    });
  }

  const admin = findAdminByName(raw);
  if (admin && admin.role !== "inspector") {
    return withVisibility(viewerRole, {
      name: admin.displayName,
      phone: adminPhoneById(admin.id),
      kind: "admin",
      subjectRole: admin.role,
      unfilteredRoleLabel: adminRoleLabelShort(admin.role),
    });
  }

  if (admin?.role === "inspector") {
    return withVisibility(viewerRole, {
      name: admin.displayName,
      phone: adminPhoneById(admin.id) || findWorkerPhone(raw, opts.directory),
      kind: "inspector",
      subjectRole: "inspector",
      unfilteredRoleLabel: "Inspektor",
    });
  }

  const workerPhone = findWorkerPhone(raw, opts.directory);
  if (workerPhone) {
    return withVisibility(viewerRole, {
      name: raw,
      phone: workerPhone,
      kind: "worker",
      subjectRole: "worker",
      unfilteredRoleLabel: "Pracownik",
    });
  }

  if (opts.noteRole === "admin") {
    const noteAdmin = findAdminByName(raw);
    const subjectRole: SubjectRole = noteAdmin?.role ?? "admin";
    return withVisibility(viewerRole, {
      name: noteAdmin?.displayName || raw,
      phone: noteAdmin ? adminPhoneById(noteAdmin.id) : null,
      kind: "admin",
      subjectRole,
      unfilteredRoleLabel: noteAdmin ? adminRoleLabelShort(noteAdmin.role) : "Administrator",
    });
  }

  return withVisibility(viewerRole, {
    name: raw,
    phone: null,
    kind: "unknown",
    subjectRole: null,
    unfilteredRoleLabel: null,
  });
}

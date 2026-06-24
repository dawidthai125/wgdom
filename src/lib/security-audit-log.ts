/** Globalny security audit log admina — append-only KV `kw-security-audit-log`. */

import { fetchKeysFromCloud, pushKeysToCloud } from "@/lib/cloud-sync";

export const SECURITY_AUDIT_LOG_KEY = "kw-security-audit-log";
export const SECURITY_AUDIT_CAP = 5000;

export type SecurityAuditCategory = "AUTH" | "PERMISSIONS" | "DATA" | "RECOVERY" | "SYNC" | "SYSTEM";

export type SecurityAuditSeverity = "info" | "warn" | "high" | "critical";

export type SecurityAuditAction =
  | "admin_login_success"
  | "admin_login_failed"
  | "admin_logout"
  | "user_create"
  | "user_delete"
  | "user_role_change"
  | "user_password_change"
  | "user_password_reset"
  | "job_delete"
  | "restore_backup_started"
  | "restore_backup_completed"
  | "restore_backup_failed"
  | "data_import_started"
  | "data_import_completed"
  | "data_import_failed"
  | "directory_delete";

export interface SecurityAuditEntry {
  id: string;
  at: string;
  actor: string;
  actorUserId?: string;
  category: SecurityAuditCategory;
  action: SecurityAuditAction;
  severity: SecurityAuditSeverity;
  summary: string;
  detail?: string;
}

export const SECURITY_AUDIT_ACTION_LABEL_PL: Record<SecurityAuditAction, string> = {
  admin_login_success: "Logowanie admina",
  admin_login_failed: "Nieudane logowanie",
  admin_logout: "Wylogowanie admina",
  user_create: "Nowe konto",
  user_delete: "Usunięcie konta",
  user_role_change: "Zmiana roli",
  user_password_change: "Zmiana hasła",
  user_password_reset: "Reset hasła",
  job_delete: "Usunięcie roboty",
  restore_backup_started: "Rozpoczęto przywracanie kopii",
  restore_backup_completed: "Przywrócono kopię zapasową",
  restore_backup_failed: "Błąd przywracania kopii",
  data_import_started: "Rozpoczęto import backupu",
  data_import_completed: "Import backupu zakończony",
  data_import_failed: "Błąd importu backupu",
  directory_delete: "Usunięcie pracownika z katalogu",
};

/** @deprecated alias — używaj SECURITY_AUDIT_ACTION_LABEL_PL */
export const SECURITY_ACTION_LABELS = SECURITY_AUDIT_ACTION_LABEL_PL;

const VALID_CATEGORIES = new Set<string>(["AUTH", "PERMISSIONS", "DATA", "RECOVERY", "SYNC", "SYSTEM"]);
const VALID_SEVERITIES = new Set<string>(["info", "warn", "high", "critical"]);
const VALID_ACTIONS = new Set<string>(Object.keys(SECURITY_AUDIT_ACTION_LABEL_PL));

export type SecurityAuditActor = {
  userId: string;
  displayName: string;
};

export type RecordSecurityAuditInput = {
  actor: string;
  actorUserId?: string;
  category: SecurityAuditCategory;
  action: SecurityAuditAction;
  severity: SecurityAuditSeverity;
  summary: string;
  detail?: string;
  at?: string;
};

function feedActorString(raw: string | undefined | null, fallback = "Administrator"): string {
  const trimmed = (raw ?? "").trim();
  return trimmed || fallback;
}

function feedAtString(raw: string | undefined | null): string {
  return raw != null ? String(raw) : "";
}

function parseSecurityAuditEntry(raw: unknown): SecurityAuditEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SecurityAuditEntry>;
  if (!r.id || !r.action || !VALID_ACTIONS.has(String(r.action))) return null;
  if (!r.category || !VALID_CATEGORIES.has(String(r.category))) return null;
  if (!r.severity || !VALID_SEVERITIES.has(String(r.severity))) return null;
  if (!r.summary) return null;
  return {
    id: String(r.id),
    at: feedAtString(r.at) || new Date().toISOString(),
    actor: feedActorString(r.actor),
    actorUserId: r.actorUserId ? String(r.actorUserId) : undefined,
    category: r.category as SecurityAuditCategory,
    action: r.action as SecurityAuditAction,
    severity: r.severity as SecurityAuditSeverity,
    summary: String(r.summary),
    detail: r.detail ? String(r.detail) : undefined,
  };
}

export function normalizeSecurityAuditLog(raw: unknown): SecurityAuditEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SecurityAuditEntry[] = [];
  for (const item of raw) {
    const parsed = parseSecurityAuditEntry(item);
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function mergeSecurityAuditLog(local: unknown, cloud: unknown): SecurityAuditEntry[] {
  const byId = new Map<string, SecurityAuditEntry>();
  for (const item of normalizeSecurityAuditLog(local)) byId.set(item.id, item);
  for (const item of normalizeSecurityAuditLog(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.at >= prev.at) byId.set(item.id, item);
  }
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, SECURITY_AUDIT_CAP);
}

export function appendSecurityAuditEntry(
  log: SecurityAuditEntry[],
  entries: SecurityAuditEntry | SecurityAuditEntry[],
): SecurityAuditEntry[] {
  const batch = Array.isArray(entries) ? entries : [entries];
  if (batch.length === 0) return log;
  const byId = new Map<string, SecurityAuditEntry>();
  for (const item of log) byId.set(item.id, item);
  for (const item of batch) byId.set(item.id, item);
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, SECURITY_AUDIT_CAP);
}

export function buildSecurityAuditEntry(input: RecordSecurityAuditInput): SecurityAuditEntry {
  return {
    id: crypto.randomUUID(),
    at: input.at ?? new Date().toISOString(),
    actor: feedActorString(input.actor),
    actorUserId: input.actorUserId,
    category: input.category,
    action: input.action,
    severity: input.severity,
    summary: input.summary.trim(),
    detail: input.detail,
  };
}

function readSecurityAuditLogLocal(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
    if (!raw) return [];
    return normalizeSecurityAuditLog(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Append + merge z chmurą + push pojedynczego klucza (bez pełnego runCloudSync). */
export async function recordSecurityAudit(input: RecordSecurityAuditInput): Promise<SecurityAuditEntry> {
  const entry = buildSecurityAuditEntry(input);
  const withEntry = appendSecurityAuditEntry(readSecurityAuditLogLocal(), entry);
  let merged = withEntry;
  try {
    const [cloud] = await fetchKeysFromCloud([SECURITY_AUDIT_LOG_KEY]);
    merged = mergeSecurityAuditLog(withEntry, cloud);
  } catch {
    /* offline — zostaw lokalny append */
  }
  try {
    localStorage.setItem(SECURITY_AUDIT_LOG_KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota */
  }
  void pushKeysToCloud([SECURITY_AUDIT_LOG_KEY], [merged]).catch(() => {});
  return entry;
}

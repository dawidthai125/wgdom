/**
 * Wspólna logika backupu KV (lokalny + email + CI).
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(__dirname, "..");

/** Główne dane — tygodniowy mail (piątek). */
export const EMAIL_KV_KEYS = [
  "kw-directory",
  "kw-week-employees",
  "kw-archive",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-contacts",
  "kw-tenders-pipeline",
  "kw-tenders-company-profile",
  "kw-tenders-custom-keywords",
  "kw-admin-passwords",
  "kw-admin-users-config",
  "kw-jobs-prev",
  "kw-week-employees-prev",
  "kw-archive-prev",
];

/** Pełny backup niedzielny — aktualne + kopie + metadane. */
export function fullBackupKvKeys(isoDate = new Date().toISOString().slice(0, 10)) {
  return [
    ...EMAIL_KV_KEYS,
    "kw-admin-hash",
    "kw-app-settings",
    "kw-inspector-stats",
    "kw-jobs-deleted-ids",
    "kw-directory-deleted-ids",
    "kw-contacts-deleted-ids",
    "kw-archive-deleted-ids",
    "kw-employee-leaves",
    "kw-recoverable-charges",
    "kw-operational-notes",
    "kw-operational-notes-read-state",
    "kw-operational-notes-deleted-ids",
    "kw-operational-notes-audit-log",
    "kw-employee-leaves-deleted-ids",
    "kw-recoverable-charges-deleted-ids",
    "kw-jobs-prev2",
    "kw-week-employees-prev2",
    "kw-archive-prev2",
    "kw-directory-prev",
    "kw-directory-prev2",
    "kw-contacts-prev",
    "kw-contacts-prev2",
    `kw-jobs-day-${isoDate}`,
    `kw-full-day-${isoDate}`,
  ];
}

export function loadEnv(root = projectRoot) {
  const path = join(root, ".env");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

export function getSupabaseConfig(env = loadEnv()) {
  return {
    projectId: env.VITE_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys",
    anonKey: env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    slug: env.VITE_SUPABASE_FUNCTION_SLUG || process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820",
    serviceRole: env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    backupEmail: env.BACKUP_EMAIL || process.env.BACKUP_EMAIL || "dawid.thai@int.pl",
  };
}

export function apiHeaders(anonKey) {
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    "Content-Type": "application/json",
  };
}

export async function fetchKvBackup(keys, config = getSupabaseConfig()) {
  if (!config.anonKey) throw new Error("Brak VITE_SUPABASE_ANON_KEY");
  const base = `https://${config.projectId}.supabase.co/functions/v1/${config.slug}`;
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers: apiHeaders(config.anonKey),
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}: ${await res.text()}`);
  const { values } = await res.json();
  return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? null]));
}

export function kvSummary(kv) {
  const counts = {};
  for (const [k, v] of Object.entries(kv)) {
    if (Array.isArray(v)) counts[k] = v.length;
    else if (v && typeof v === "object" && "keys" in v) counts[k] = "daily-bundle";
    else if (typeof v === "string") counts[k] = v ? "set" : "empty";
    else counts[k] = v == null ? "null" : typeof v;
  }
  return {
    jobs: kv["kw-jobs"]?.length ?? 0,
    directory: kv["kw-directory"]?.length ?? 0,
    archiveWeeks: kv["kw-archive"]?.length ?? 0,
    weekFrom: kv["kw-weekFrom"] || "",
    weekTo: kv["kw-weekTo"] || "",
    counts,
  };
}

export async function sendBackupEmail(kv, config = getSupabaseConfig()) {
  const base = `https://${config.projectId}.supabase.co/functions/v1/${config.slug}`;
  const date = new Date().toISOString().slice(0, 10);
  const weekFrom = kv["kw-weekFrom"] || "";
  const weekTo = kv["kw-weekTo"] || "";
  const res = await fetch(`${base}/send-backup-email`, {
    method: "POST",
    headers: apiHeaders(config.anonKey),
    body: JSON.stringify({ data: kv, date, weekFrom, weekTo }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) throw new Error(`send-backup-email ${res.status}: ${JSON.stringify(body)}`);
  return { date, weekFrom, weekTo, body };
}

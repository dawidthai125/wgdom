/**
 * Wgranie backupu JSON bezpośrednio do kv_store (service_role).
 * node scripts/seed-kv-direct.mjs backup.json
 */
import { readFileSync } from "fs";

const projectId = process.env.SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const backupPath = process.argv[2];

if (!serviceRole) {
  console.error("Ustaw SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!backupPath) {
  console.error("Użycie: node scripts/seed-kv-direct.mjs <backup.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(backupPath, "utf8"));
const keys = [
  "kw-directory", "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo",
  "kw-jobs", "kw-contacts", "kw-tenders-pipeline", "kw-tenders-company-profile",
  "kw-tenders-custom-keywords", "kw-admin-passwords", "kw-admin-users-config",
];

const uri = `https://${projectId}.supabase.co/rest/v1/kv_store_0afb8820`;
const headers = {
  Authorization: `Bearer ${serviceRole}`,
  apikey: serviceRole,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

for (const key of keys) {
  if (data[key] === undefined) continue;
  console.log(`Upsert ${key}...`);
  const res = await fetch(uri, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value: data[key] }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  BŁĄD ${res.status}: ${text}`);
    process.exit(1);
  }
  console.log("  OK");
}

console.log("Gotowe.");

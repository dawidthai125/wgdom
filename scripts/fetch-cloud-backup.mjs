/**
 * Pobierz backup z chmury do pliku JSON (+ opcjonalnie mail).
 * node scripts/fetch-cloud-backup.mjs [output-path]
 */
import { writeFileSync } from "fs";

const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
const outPath = process.argv[2] || `backup-${new Date().toISOString().slice(0, 10)}.json`;

if (!anonKey) {
  console.error("Ustaw VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
const headers = {
  Authorization: `Bearer ${anonKey}`,
  apikey: anonKey,
  "Content-Type": "application/json",
};

const dataKeys = [
  "kw-directory", "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo",
  "kw-jobs", "kw-contacts", "kw-tenders-pipeline", "kw-tenders-company-profile",
  "kw-tenders-custom-keywords", "kw-admin-passwords", "kw-admin-users-config",
];

const getRes = await fetch(`${base}/batch-get`, { method: "POST", headers, body: JSON.stringify({ keys: dataKeys }) });
if (!getRes.ok) {
  console.error("batch-get failed:", getRes.status, await getRes.text());
  process.exit(1);
}
const { values } = await getRes.json();
const data = Object.fromEntries(dataKeys.map((k, i) => [k, values[i] ?? null]));
writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Zapisano: ${outPath}`);
console.log(`Jobs: ${data["kw-jobs"]?.length ?? 0}, Directory: ${data["kw-directory"]?.length ?? 0}, Archive: ${data["kw-archive"]?.length ?? 0}`);

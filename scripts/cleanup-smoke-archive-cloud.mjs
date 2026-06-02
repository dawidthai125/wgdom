/**
 * Usuwa z chmury wpisy testowe: smoke-del-* oraz rok 2099.
 * node scripts/cleanup-smoke-archive-cloud.mjs [--dry-run]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
if (!anonKey) {
  console.error("Brak VITE_SUPABASE_ANON_KEY w .env");
  process.exit(1);
}

const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
const headers = {
  Authorization: `Bearer ${anonKey}`,
  apikey: anonKey,
  "Content-Type": "application/json",
};

function shouldRemove(week) {
  const id = String(week.id ?? "");
  const from = String(week.weekFrom ?? "");
  const to = String(week.weekTo ?? "");
  if (/^smoke-del-/i.test(id)) return "smoke-del-id";
  if (from.startsWith("2099") || to.startsWith("2099")) return "year-2099";
  return null;
}

const keys = ["kw-archive", "kw-archive-deleted-ids"];
const getRes = await fetch(`${base}/batch-get`, {
  method: "POST",
  headers,
  body: JSON.stringify({ keys }),
});
if (!getRes.ok) {
  console.error("batch-get failed:", getRes.status, await getRes.text());
  process.exit(1);
}
const { values } = await getRes.json();
const archive = values[0] ?? [];
const deletedIds = values[1] ?? [];

const removed = [];
const kept = [];
for (const w of archive) {
  const reason = shouldRemove(w);
  if (reason) removed.push({ id: w.id, weekFrom: w.weekFrom, weekTo: w.weekTo, reason });
  else kept.push(w);
}

const newDeletedIds = [...new Set([...deletedIds, ...removed.map((r) => r.id)])].slice(-500);

console.log(JSON.stringify({
  dryRun,
  before: archive.length,
  removed: removed.length,
  after: kept.length,
  removedList: removed,
  deletedIdsAdded: removed.filter((r) => !deletedIds.includes(r.id)).map((r) => r.id),
}, null, 2));

if (removed.length === 0) {
  console.log("\nNic do usunięcia.");
  process.exit(0);
}

if (dryRun) {
  console.log("\n--dry-run: bez zapisu");
  process.exit(0);
}

const setRes = await fetch(`${base}/batch-set`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    keys: ["kw-archive", "kw-archive-deleted-ids"],
    values: [kept, newDeletedIds],
  }),
});
const setText = await setRes.text();
if (!setRes.ok) {
  console.error("batch-set failed:", setRes.status, setText);
  process.exit(1);
}

const verify = await fetch(`${base}/batch-get`, {
  method: "POST",
  headers,
  body: JSON.stringify({ keys: ["kw-archive"] }),
}).then((r) => r.json());

const after = verify.values[0] ?? [];
const leftBad = after.filter((w) => shouldRemove(w));
console.log("\nZapisano. Weryfikacja:", {
  archiveCount: after.length,
  leftSmokeOr2099: leftBad.length,
  weeks: after.map((w) => ({ id: w.id, from: w.weekFrom, to: w.weekTo })),
});

if (leftBad.length > 0) process.exit(1);

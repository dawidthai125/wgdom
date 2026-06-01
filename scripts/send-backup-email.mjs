/**
 * Wyślij backup JSON mailem (Resend przez Edge Function).
 * node scripts/send-backup-email.mjs [email]
 */
const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
const toEmail = process.argv[2] || "dawid.thai@int.pl";

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
];

const getRes = await fetch(`${base}/batch-get`, {
  method: "POST",
  headers,
  body: JSON.stringify({ keys: dataKeys }),
});
if (!getRes.ok) {
  console.error("batch-get failed:", getRes.status, await getRes.text());
  process.exit(1);
}
const { values } = await getRes.json();
const data = Object.fromEntries(dataKeys.map((k, i) => [k, values[i] ?? null]));
const weekFrom = data["kw-weekFrom"] || "";
const weekTo = data["kw-weekTo"] || "";
const date = new Date().toISOString().slice(0, 10);

console.log(`Backup: jobs=${data["kw-jobs"]?.length ?? 0}, directory=${data["kw-directory"]?.length ?? 0}, week=${weekFrom}–${weekTo}`);
console.log(`Wysyłam na ${toEmail}...`);

const sendRes = await fetch(`${base}/send-backup-email`, {
  method: "POST",
  headers,
  body: JSON.stringify({ data, date, weekFrom, weekTo }),
});
const sendText = await sendRes.text();
let body;
try { body = JSON.parse(sendText); } catch { body = { raw: sendText }; }
if (!sendRes.ok) {
  console.error("send-backup-email failed:", sendRes.status, body);
  process.exit(1);
}
console.log("OK — mail wysłany:", body);

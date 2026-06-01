/**
 * Pełny audyt po migracji Supabase — uruchom: node scripts/full-audit-post-migration.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const NEW_REF = "bdpygdvfgbggermvqtys";
const OLD_REF = "kchwyjlnkdlymwvsnfiu";
const PROD_SITE = "https://www.wgdom.fun";
const FN = "make-server-0afb8820";

function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|html|json)$/.test(name)) acc.push(p);
  }
  return acc;
}

function scanStaleRefs() {
  const issues = [];
  const files = walk(join(ROOT, "src")).concat(
    walk(join(ROOT, "scripts")),
    [join(ROOT, "index.html"), join(ROOT, "public", "sw.js")],
  );
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    if (t.includes(OLD_REF) && !f.includes("cleanup-dead") && !f.includes("check-blank-page"))
      issues.push({ file: f.replace(ROOT, ""), type: "OLD_SUPABASE_REF" });
    if (t.includes("wgdom.vercel.app") && !f.includes("main.tsx"))
      issues.push({ file: f.replace(ROOT, ""), type: "HARDCODED_VERCEL_URL" });
  }
  return issues;
}

function scanLucideInApp() {
  const appDir = join(ROOT, "src", "app");
  const skip = new Set([
    "Fragment", "File", "Record", "Checkbox", "HTMLInputElement", "HTMLTextAreaElement",
    "HTMLDivElement", "HTMLElement", "Comp", "DayPicker", "Sonner", "Controller", "Label", "Slot",
  ]);
  const problems = [];
  for (const name of readdirSync(appDir)) {
    if (!/\.tsx$/.test(name) || name.includes("components/ui")) continue;
    const path = join(appDir, name);
    const src = readFileSync(path, "utf8");
    const m = src.match(/import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react"/);
    if (!m) continue;
    const imported = new Set(m[1].split(/[\s,]+/).map((s) => s.trim()).filter(Boolean));
    const used = [...src.matchAll(/<([A-Z][a-zA-Z0-9]+)\s/g)].map((x) => x[1]);
    for (const u of used) {
      if (skip.has(u) || imported.has(u) || u.endsWith("View") || u.endsWith("Modal") || u.endsWith("Panel"))
        continue;
      if (/^[A-Z]/.test(u) && !src.includes(`function ${u}`) && !src.includes(`export function ${u}`))
        problems.push({ file: name, icon: u });
    }
  }
  return problems;
}

async function apiCheck(env) {
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const base = `https://${NEW_REF}.supabase.co/functions/v1/${FN}`;
  const h = { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" };
  const out = { base, endpoints: {} };

  const health = await fetch(`${base}/health`, { headers: h });
  out.endpoints.health = { status: health.status, ok: health.ok };

  const keys = [
    "kw-jobs", "kw-directory", "kw-week-employees", "kw-archive",
    "kw-contacts", "kw-weekFrom", "kw-weekTo",
    "kw-tenders-pipeline", "kw-tenders-company-profile",
  ];
  const bg = await fetch(`${base}/batch-get`, {
    method: "POST", headers: h, body: JSON.stringify({ keys }),
  });
  out.endpoints.batchGet = { status: bg.status, ok: bg.ok };
  if (bg.ok) {
    const { values } = await bg.json();
    out.cloudCounts = {};
    keys.forEach((k, i) => {
      const v = values[i];
      if (Array.isArray(v)) out.cloudCounts[k] = v.length;
      else if (typeof v === "string") out.cloudCounts[k] = v ? "set" : "empty";
      else if (v && typeof v === "object") out.cloudCounts[k] = "object";
      else out.cloudCounts[k] = v == null ? "null" : typeof v;
    });
    const jobs = values[0] || [];
    let nullWorkEntries = 0;
    let deadPhotoUrls = 0;
    for (const j of jobs) {
      if (j && j.workEntries == null) nullWorkEntries++;
      for (const p of j?.photos || []) {
        if (p?.publicUrl?.includes(OLD_REF)) deadPhotoUrls++;
      }
      for (const r of j?.workerReports || []) {
        if (r?.sketch?.publicUrl?.includes(OLD_REF)) deadPhotoUrls++;
      }
    }
    out.dataQuality = { jobs: jobs.length, nullWorkEntries, deadPhotoUrls };
  } else {
    out.batchGetError = await bg.text().catch(() => "");
  }

  const backup = await fetch(`${base}/jobs-backup-status`, { headers: h });
  out.endpoints.jobsBackup = { status: backup.status, ok: backup.ok };
  if (backup.ok) out.jobsBackup = await backup.json();

  const payrollBk = await fetch(`${base}/payroll-backup-status`, { headers: h });
  out.endpoints.payrollBackup = { status: payrollBk.status, ok: payrollBk.ok };

  const dataBk = await fetch(`${base}/data-backup-status`, { headers: h });
  out.endpoints.dataBackup = { status: dataBk.status, ok: dataBk.ok };

  return out;
}

async function prodSiteCheck() {
  const out = {};
  const index = await fetch(PROD_SITE, { redirect: "follow" });
  out.indexStatus = index.status;
  out.finalUrl = index.url;
  const html = await index.text();
  out.hasSupabasePreconnect = html.includes(NEW_REF);
  out.hasOldSupabase = html.includes(OLD_REF);
  const sw = await fetch(`${PROD_SITE}/sw.js`);
  out.swOk = sw.ok;
  out.swCache = sw.ok ? (await sw.text()).match(/wgdom-shell-v\d+/)?.[0] : null;
  const jobsChunk = html.match(/panel-jobs-[\w]+\.js/)?.[0];
  if (jobsChunk) {
    const jr = await fetch(`${PROD_SITE}/assets/${jobsChunk}`);
    out.jobsChunkOk = jr.ok;
    out.jobsChunkHasReports = jr.ok && (await jr.text()).includes("JobWorkerReportsPanel");
  }
  return out;
}

const env = loadEnv();
console.log("=== W&G DOM — audyt po migracji Supabase ===\n");
console.log("Projekt docelowy:", NEW_REF);
console.log("Lokalny .env VITE_SUPABASE_PROJECT_ID:", env.VITE_SUPABASE_PROJECT_ID || "(brak)");
console.log("");

const stale = scanStaleRefs();
console.log("--- Stare referencje w kodzie runtime ---");
if (stale.length === 0) console.log("OK — brak starego ref w src/index/public");
else stale.forEach((s) => console.log(`  [${s.type}] ${s.file}`));

const lucide = scanLucideInApp();
console.log("\n--- Potencjalnie brakujące ikony lucide (src/app/*.tsx) ---");
const lucideByFile = new Map();
for (const p of lucide) {
  if (!lucideByFile.has(p.file)) lucideByFile.set(p.file, []);
  lucideByFile.get(p.file).push(p.icon);
}
if (lucideByFile.size === 0) console.log("OK — nic oczywistego");
else for (const [f, icons] of lucideByFile) console.log(`  ${f}: ${[...new Set(icons)].join(", ")}`);

if (env.VITE_SUPABASE_ANON_KEY) {
  console.log("\n--- API Supabase (nowy projekt) ---");
  try {
    const api = await apiCheck(env);
    console.log(JSON.stringify(api, null, 2));
  } catch (e) {
    console.log("BŁĄD API:", e.message);
  }
} else {
  console.log("\n--- API Supabase — POMINIĘTO (brak .env) ---");
}

console.log("\n--- Produkcja www.wgdom.fun ---");
try {
  console.log(JSON.stringify(await prodSiteCheck(), null, 2));
} catch (e) {
  console.log("BŁĄD:", e.message);
}

console.log("\n=== Koniec audytu ===");

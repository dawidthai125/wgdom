/**
 * Pełny backup lokalny: KV Supabase + pliki storage + manifest.
 * node scripts/full-local-backup.mjs [katalog-docelowy]
 *
 * Wymaga VITE_SUPABASE_ANON_KEY w .env (opcjonalnie SUPABASE_SERVICE_ROLE_KEY do listy storage).
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  createWriteStream,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
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

const env = loadEnv();
const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const slug = env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
const bucket = "make-0afb8820-photos";

if (!anonKey) {
  console.error("Brak VITE_SUPABASE_ANON_KEY w .env");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outRoot =
  process.argv[2] ||
  join(root, "backups", `wgdom-full-${stamp}`);
const storageDir = join(outRoot, "storage");
mkdirSync(storageDir, { recursive: true });

const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
const headers = {
  Authorization: `Bearer ${anonKey}`,
  apikey: anonKey,
  "Content-Type": "application/json",
};

const today = new Date().toISOString().slice(0, 10);
const kvKeys = [
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
  "kw-admin-hash",
  "kw-app-settings",
  "kw-inspector-stats",
  "kw-jobs-deleted-ids",
  "kw-directory-deleted-ids",
  "kw-contacts-deleted-ids",
  "kw-archive-deleted-ids",
  "kw-jobs-prev",
  "kw-jobs-prev2",
  "kw-week-employees-prev",
  "kw-week-employees-prev2",
  "kw-archive-prev",
  "kw-archive-prev2",
  "kw-directory-prev",
  "kw-directory-prev2",
  "kw-contacts-prev",
  "kw-contacts-prev2",
  `kw-jobs-day-${today}`,
  `kw-full-day-${today}`,
];

async function batchGet(keys) {
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}: ${await res.text()}`);
  const { values } = await res.json();
  return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? null]));
}

function collectStorageRefs(kv) {
  const refs = new Map(); // path -> { publicUrl?, source }

  const add = (path, publicUrl, source) => {
    if (!path && !publicUrl) return;
    const p = path || publicUrlToPath(publicUrl);
    if (!p) return;
    if (!refs.has(p)) refs.set(p, { publicUrl, source });
  };

  const jobs = kv["kw-jobs"];
  if (Array.isArray(jobs)) {
    for (const j of jobs) {
      if (!j || typeof j !== "object") continue;
      for (const ph of j.photos || []) {
        add(ph.storagePath, ph.publicUrl, "job-photo");
      }
      for (const f of j.jobFiles || []) {
        add(f.storagePath, f.publicUrl || f.url, "job-file");
      }
      for (const r of j.workerReports || []) {
        const sk = r?.sketch;
        if (sk) add(sk.storagePath, sk.publicUrl, "worker-sketch");
      }
      for (const ec of j.extraCosts || []) {
        for (const a of ec.attachments || []) {
          add(a.storagePath, a.publicUrl, "extra-cost");
        }
      }
    }
  }

  const tenders = kv["kw-tenders-pipeline"];
  if (Array.isArray(tenders)) {
    for (const t of tenders) {
      const uf = t?.uploadedFile;
      if (uf) add(uf.storagePath, uf.publicUrl, "tender-file");
      for (const ext of t?.externalFiles || []) {
        add(ext.storagePath, ext.publicUrl, "tender-external");
      }
    }
  }

  return refs;
}

function publicUrlToPath(url) {
  if (!url || typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i >= 0) return decodeURIComponent(url.slice(i + marker.length));
  return null;
}

async function listStorageRecursive(prefix = "") {
  if (!serviceRole) return [];
  const authHeaders = {
    Authorization: `Bearer ${serviceRole}`,
    apikey: serviceRole,
    "Content-Type": "application/json",
  };
  const listed = [];
  const queue = [prefix];
  while (queue.length) {
    const p = queue.shift();
    const res = await fetch(
      `https://${projectId}.supabase.co/storage/v1/object/list/${bucket}`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ prefix: p, limit: 1000, offset: 0 }),
      },
    );
    if (!res.ok) break;
    const items = await res.json();
    if (!Array.isArray(items)) break;
    for (const item of items) {
      if (item.id) {
        listed.push(item.name);
      } else if (item.name) {
        queue.push(item.name.endsWith("/") ? item.name : `${p}${p && !p.endsWith("/") ? "/" : ""}${item.name}`);
      }
    }
    if (items.length < 1000) break;
  }
  return listed.filter((x) => x && !x.endsWith("/"));
}

async function downloadFile(path, publicUrl) {
  const dest = join(storageDir, path.replace(/\//g, "\\"));
  mkdirSync(dirname(dest), { recursive: true });
  const urls = [
    publicUrl,
    `https://${projectId}.supabase.co/storage/v1/object/public/${bucket}/${path}`,
  ].filter(Boolean);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      return { ok: true, bytes: buf.length };
    } catch {
      /* next */
    }
  }
  return { ok: false, bytes: 0 };
}

console.log("=== W&G DOM — pełny backup lokalny ===");
console.log("Projekt:", projectId);
console.log("Katalog:", outRoot);
console.log("");

console.log("1/3 Pobieranie danych KV z chmury…");
const kv = await batchGet(kvKeys);
writeFileSync(join(outRoot, "kv-data.json"), JSON.stringify(kv, null, 2), "utf8");

const summary = {
  exportedAt: new Date().toISOString(),
  projectId,
  bucket,
  kvCounts: {},
};
for (const [k, v] of Object.entries(kv)) {
  if (Array.isArray(v)) summary.kvCounts[k] = v.length;
  else if (v && typeof v === "object" && "keys" in v) summary.kvCounts[k] = "daily-bundle";
  else if (typeof v === "string") summary.kvCounts[k] = v ? "set" : "empty";
  else summary.kvCounts[k] = v == null ? "null" : typeof v;
}

console.log("2/3 Zbieranie plików storage…");
const fromKv = collectStorageRefs(kv);
let fromList = [];
if (serviceRole) {
  console.log("   (service_role — pełna lista bucketu)");
  try {
    fromList = await listStorageRecursive("");
  } catch (e) {
    console.warn("   Lista storage nieudana:", e.message);
  }
} else {
  console.log("   (bez SUPABASE_SERVICE_ROLE_KEY — tylko ścieżki z KV)");
}

const allPaths = new Set([...fromKv.keys(), ...fromList]);
console.log(`   Plików do pobrania: ${allPaths.size}`);

console.log("3/3 Pobieranie plików…");
const storageManifest = { ok: [], failed: [] };
let totalBytes = 0;
let i = 0;
for (const path of allPaths) {
  i++;
  const ref = fromKv.get(path);
  const result = await downloadFile(path, ref?.publicUrl);
  if (result.ok) {
    totalBytes += result.bytes;
    storageManifest.ok.push({ path, bytes: result.bytes, source: ref?.source || "list" });
  } else {
    storageManifest.failed.push({ path, source: ref?.source || "list" });
  }
  if (i % 10 === 0 || i === allPaths.size) {
    process.stdout.write(`\r   ${i}/${allPaths.size} pobrano OK: ${storageManifest.ok.length}, błędy: ${storageManifest.failed.length}`);
  }
}
console.log("");

summary.storage = {
  attempted: allPaths.size,
  downloaded: storageManifest.ok.length,
  failed: storageManifest.failed.length,
  totalBytes,
};

writeFileSync(join(outRoot, "storage-manifest.json"), JSON.stringify(storageManifest, null, 2), "utf8");
writeFileSync(join(outRoot, "manifest.json"), JSON.stringify(summary, null, 2), "utf8");

writeFileSync(
  join(outRoot, "README.txt"),
  [
    "W&G DOM — pełny backup lokalny",
    `Data: ${summary.exportedAt}`,
    `Projekt Supabase: ${projectId}`,
    "",
    "Pliki:",
    "  kv-data.json       — wszystkie klucze KV (roboty, płace, archiwum, admin…)",
    "  storage/           — pliki ze storage (zdjęcia, kosztorysy, przetargi)",
    "  storage-manifest.json — lista pobranych / nieudanych plików",
    "  manifest.json      — podsumowanie",
    "",
    "Przywracanie KV (PowerShell):",
    `  .\\scripts\\restore-backup-to-supabase.ps1 -BackupPath "${join(outRoot, "kv-data.json")}" -AnonKey "<anon>"`,
    "",
    "UWAGA: kv-data.json zawiera hasła adminów — nie wrzucaj na GitHub.",
  ].join("\n"),
  "utf8",
);

console.log("\n=== Gotowe ===");
console.log("KV jobs:", kv["kw-jobs"]?.length ?? 0);
console.log("KV directory:", kv["kw-directory"]?.length ?? 0);
console.log("KV archive weeks:", kv["kw-archive"]?.length ?? 0);
console.log("Storage pobrano:", storageManifest.ok.length, "/", allPaths.size, `(${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
if (storageManifest.failed.length) {
  console.log("Storage błędy:", storageManifest.failed.length, "(szczegóły w storage-manifest.json)");
}
console.log("Folder:", outRoot);

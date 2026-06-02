/**
 * Raport martwych URL-i storage w produkcyjnym KV (tylko odczyt).
 * node scripts/audit-dead-media-kv.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const OLD = "kchwyjlnkdlymwvsnfiu";

function isDead(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  if (url.includes(OLD)) return true;
  if (url.includes("make-0afb8820-photos") && !url.includes(projectId)) return true;
  return false;
}

function deadPair(publicUrl, path) {
  return isDead(publicUrl) || isDead(path);
}

const base = `https://${projectId}.supabase.co/functions/v1/${process.env.VITE_SUPABASE_FUNCTION_SLUG}`;
const headers = {
  Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
  apikey: process.env.VITE_SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};

const keys = ["kw-jobs", "kw-tenders-pipeline"];
const res = await fetch(`${base}/batch-get`, { method: "POST", headers, body: JSON.stringify({ keys }) });
const { values } = await res.json();
const [jobs, tenders] = values;

const before = {
  crewPhotos: 0,
  inspectorPhotos: 0,
  jobFiles: 0,
  reportSketches: 0,
  jobSketch: 0,
  tenderUploads: 0,
};
const after = { ...before };
const jobsAffected = new Set();

function countJob(j, isAfter) {
  const bucket = isAfter ? after : before;
  for (const p of j.photos || []) {
    const url = p?.publicUrl || p?.url || "";
    if (deadPair(url, p?.path)) {
      bucket.crewPhotos++;
      jobsAffected.add(j.id);
    }
  }
  for (const p of j.inspectorPhotos || []) {
    if (deadPair(p?.publicUrl, p?.path)) {
      bucket.inspectorPhotos++;
      jobsAffected.add(j.id);
    }
  }
  for (const f of j.jobFiles || []) {
    if (deadPair(f?.publicUrl, f?.path)) {
      bucket.jobFiles++;
      jobsAffected.add(j.id);
    }
  }
  for (const r of j.workerReports || []) {
    if (r?.sketch && deadPair(r.sketch.publicUrl, r.sketch.path)) {
      bucket.reportSketches++;
      jobsAffected.add(j.id);
    }
  }
  if (j.sketch && deadPair(j.sketch.publicUrl, j.sketch.path)) {
    bucket.jobSketch++;
    jobsAffected.add(j.id);
  }
}

for (const j of jobs || []) countJob(j, false);

// Symulacja cleanJob (jak w cleanup script)
function cleanJob(job) {
  const photos = (job.photos || []).filter((p) => {
    const url = p?.publicUrl || p?.url || "";
    return !deadPair(url, p?.path);
  });
  const jobFiles = (job.jobFiles || []).filter((f) => !deadPair(f?.publicUrl, f?.path));
  const inspectorPhotos = (job.inspectorPhotos || []).filter((p) => !deadPair(p?.publicUrl, p?.path));
  const workerReports = (job.workerReports || []).map((r) => {
    if (!r?.sketch || deadPair(r.sketch.publicUrl, r.sketch.path)) {
      return { ...r, sketch: r?.sketch && deadPair(r.sketch.publicUrl, r.sketch.path) ? null : r?.sketch ?? null };
    }
    return r;
  });
  let sketch = job.sketch;
  if (sketch && deadPair(sketch.publicUrl, sketch.path)) sketch = null;
  return { ...job, photos, jobFiles, inspectorPhotos, workerReports, sketch };
}

const cleanedJobs = (jobs || []).map(cleanJob);
for (const j of cleanedJobs) countJob(j, true);

for (const t of tenders || []) {
  const u = t?.uploadedFile;
  if (u && (deadPair(u.publicUrl, u.path) || isDead(u.url))) before.tenderUploads++;
}
const cleanedTenders = (tenders || []).map((t) => {
  if (!t?.uploadedFile) return t;
  const u = t.uploadedFile;
  if (deadPair(u.publicUrl, u.path) || isDead(u.url)) return { ...t, uploadedFile: null };
  return t;
});
for (const t of cleanedTenders) {
  const u = t?.uploadedFile;
  if (u && (deadPair(u.publicUrl, u.path) || isDead(u.url))) after.tenderUploads++;
}

const totalBefore = Object.values(before).reduce((a, b) => a + b, 0);
const totalAfter = Object.values(after).reduce((a, b) => a + b, 0);

console.log("=== AUDIT martwych mediów (produkcja, read-only) ===");
console.log("Projekt Supabase:", projectId);
console.log("Kryterium martwego URL: stary projekt kchwyjlnkdlymwvsnfiu LUB bucket z innego projectId");
console.log("");
console.log("Klucze KV objęte cleanup --photos-only:");
console.log("  - kw-jobs");
console.log("  - kw-tenders-pipeline");
console.log("");
console.log(`Roboty w KV: ${jobs?.length ?? 0}`);
console.log(`Przetargi w KV: ${tenders?.length ?? 0}`);
console.log(`Roboty z martwymi wpisami: ${jobsAffected.size}`);
console.log("");
console.log("BEFORE (martwe wpisy w danych):");
console.log(JSON.stringify(before, null, 2));
console.log(`  RAZEM: ${totalBefore}`);
console.log("");
console.log("AFTER (po cleanup --photos-only, symulacja):");
console.log(JSON.stringify(after, null, 2));
console.log(`  RAZEM: ${totalAfter}`);
console.log("");
console.log("DO USUNIĘCIA (before - after):");
const removed = {};
for (const k of Object.keys(before)) removed[k] = before[k] - after[k];
console.log(JSON.stringify(removed, null, 2));
console.log(`  RAZEM: ${totalBefore - totalAfter}`);

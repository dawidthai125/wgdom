/** Jednorazowy snapshot przed cleanup --photos-only */
import { readFileSync, writeFileSync } from "fs";
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

const deadCounts = {
  crewPhotos: 0,
  inspectorPhotos: 0,
  jobFiles: 0,
  reportSketches: 0,
  jobSketch: 0,
  tenderUploads: 0,
};
const jobsAffected = [];

for (const j of jobs || []) {
  let hit = false;
  for (const p of j.photos || []) {
    const url = p?.publicUrl || p?.url || "";
    if (deadPair(url, p?.path)) { deadCounts.crewPhotos++; hit = true; }
  }
  for (const p of j.inspectorPhotos || []) {
    if (deadPair(p?.publicUrl, p?.path)) { deadCounts.inspectorPhotos++; hit = true; }
  }
  for (const f of j.jobFiles || []) {
    if (deadPair(f?.publicUrl, f?.path)) { deadCounts.jobFiles++; hit = true; }
  }
  for (const r of j.workerReports || []) {
    if (r?.sketch && deadPair(r.sketch.publicUrl, r.sketch.path)) { deadCounts.reportSketches++; hit = true; }
  }
  if (j.sketch && deadPair(j.sketch.publicUrl, j.sketch.path)) { deadCounts.jobSketch++; hit = true; }
  if (hit) jobsAffected.push(j.id);
}

for (const t of tenders || []) {
  const u = t?.uploadedFile;
  if (u && (deadPair(u.publicUrl, u.path) || isDead(u.url))) deadCounts.tenderUploads++;
}

const snapshot = {
  capturedAt: new Date().toISOString(),
  supabaseProjectId: projectId,
  purpose: "snapshot przed cleanup-dead-storage --photos-only",
  kvKeys: keys,
  jobsCount: jobs?.length ?? 0,
  tendersCount: tenders?.length ?? 0,
  jobsAffectedCount: jobsAffected.length,
  jobsAffectedIds: jobsAffected,
  deadMediaCounts: deadCounts,
  deadMediaTotal: Object.values(deadCounts).reduce((a, b) => a + b, 0),
  "kw-jobs": jobs,
  "kw-tenders-pipeline": tenders,
};

const outPath = resolve(root, "before-cleanup-dead-media.json");
writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");
console.log("Snapshot zapisany:", outPath);
console.log("Martwe wpisy razem:", snapshot.deadMediaTotal);

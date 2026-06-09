/**
 * Sprint 20.5B.3 — repair orphan upload activities (feed)
 * Domyślnie READ ONLY. --apply modyfikuje wyłącznie hiddenInspectorFeedIds.
 *
 * npx vite-node scripts/repair-job-file-orphans-20.5b3.mjs
 * npx vite-node scripts/repair-job-file-orphans-20.5b3.mjs --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  isJobFileUploadActivityVisible,
  parseJobFileUploadActivity,
} from "../src/lib/job-activity.ts";

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch { /* */ }
}
loadEnv();

const apply = process.argv.includes("--apply");
const localOnly = process.argv.includes("--local");

async function fetchJobs() {
  if (localOnly) {
    const raw = readFileSync(join(process.cwd(), "integration-out.json"), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data["kw-jobs"] || [];
  }
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
  const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-jobs"] }),
  });
  if (!res.ok) throw new Error(await res.text());
  let jobs = (await res.json()).values[0];
  if (typeof jobs === "string") jobs = JSON.parse(jobs);
  return jobs;
}

async function pushJobs(jobs) {
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
  const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
  const res = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ entries: [{ key: "kw-jobs", value: jobs }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

const jobs = await fetchJobs();
const orphans = [];

for (const job of jobs) {
  for (const ev of job.activityLog || []) {
    if (ev.type !== "inspector_file") continue;
    if (!parseJobFileUploadActivity(ev.text)) continue;
    if (isJobFileUploadActivityVisible(job, ev)) continue;
    orphans.push({
      jobId: job.id,
      jobTitle: `${job.address} m.${job.flatNumber}`,
      activityId: ev.id,
      at: ev.at,
      text: ev.text,
    });
  }
}

console.log(JSON.stringify({
  mode: apply ? "APPLY" : "READ_ONLY",
  jobsScanned: jobs.length,
  orphanCount: orphans.length,
  orphans,
}, null, 2));

if (!apply) {
  console.log("\nDry-run. Użyj --apply aby dodać hiddenInspectorFeedIds (tylko te wpisy).");
  process.exit(0);
}

if (orphans.length === 0) {
  console.log("\nBrak orphanów do naprawy.");
  process.exit(0);
}

const byJob = new Map();
for (const o of orphans) {
  if (!byJob.has(o.jobId)) byJob.set(o.jobId, []);
  byJob.get(o.jobId).push(o.activityId);
}

let patched = 0;
const nextJobs = jobs.map((job) => {
  const ids = byJob.get(job.id);
  if (!ids?.length) return job;
  const prev = job.hiddenInspectorFeedIds ?? [];
  const merged = [...new Set([...prev, ...ids])];
  patched += ids.length;
  return { ...job, hiddenInspectorFeedIds: merged };
});

if (localOnly) {
  writeFileSync(join(process.cwd(), "integration-out-repaired.json"), JSON.stringify(nextJobs, null, 2));
  console.log(`\nAPPLY local — zapisano integration-out-repaired.json (${patched} hidden ids)`);
} else {
  await pushJobs(nextJobs);
  console.log(`\nAPPLY prod KV — ukryto ${patched} orphan activity ids w hiddenInspectorFeedIds`);
}

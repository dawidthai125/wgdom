/**
 * Sprint 20.5B.6A.4 — Worker Mobile UX
 * Uruchom: npx vite-node scripts/smoke-test-worker-mobile-ux-20.5b6a4.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

log("=== Sprint 20.5B.6A.4 — Worker Mobile UX ===\n");

// T1 — progress helper
{
  const progress = readSrc("src/lib/worker-job-progress.ts");
  assert("T1 computeWorkerJobProgress", progress.includes("export function computeWorkerJobProgress"));
  assert("T1 reportHasWorkScope import", progress.includes("reportHasWorkScope"));
  assert("T1 roomHasContent import", progress.includes("roomHasContent"));
  assert("T1 allComplete", progress.includes("allComplete"));
  assert("T1 nextStep", progress.includes("nextStep"));
  assert("T1 sketch check", progress.includes("sketch?.publicUrl") && progress.includes("sketch?.path"));
}

// T2 — progress UI
{
  const flow = readSrc("src/app/WorkerJobProgressFlow.tsx");
  assert("T2 progress component", flow.includes("export function WorkerJobProgressFlow"));
  assert("T2 scrollIntoView", flow.includes("scrollIntoView"));
  assert("T2 no sticky", !flow.includes("sticky") && !flow.includes("fixed"));
}

// T3 — WorkerPhotoView integration
{
  const worker = readSrc("src/app/WorkerPhotoView.tsx");
  assert("T3 progress import", worker.includes("computeWorkerJobProgress"));
  assert("T3 progress flow", worker.includes("WorkerJobProgressFlow"));
  assert("T3 education banner", worker.includes("WorkerEducationBanner"));
  assert("T3 section photos", worker.includes('id="worker-section-photos"'));
  assert("T3 section documentation", worker.includes('id="worker-section-documentation"'));
  assert("T3 layout worker", worker.includes('layout="worker"'));
  assert("T3 myPhotos filter", worker.includes("uploadedBy === workerName"));
}

// T4 — JobReportForm worker layout
{
  const form = readSrc("src/app/JobReportForm.tsx");
  assert("T4 layout prop", form.includes('layout?: "default" | "worker"'));
  assert("T4 worker section scope", form.includes('id={isWorker ? "worker-section-scope"'));
  assert("T4 worker section dimensions", form.includes('id={isWorker ? "worker-section-dimensions"'));
  assert("T4 worker section sketch", form.includes("worker-section-sketch"));
  assert("T4 worker min-h chip", form.includes("min-h-[44px]") && form.includes("isWorker"));
  assert("T4 handleSubmit unchanged", form.includes("scopeTextHasContent(scope) && rooms.length === 0"));
}

// T5 — admin unchanged
{
  const panel = readSrc("src/app/JobWorkerReportsPanel.tsx");
  assert("T5 admin no layout worker", !panel.includes('layout="worker"'));
  assert("T5 admin still uses form", panel.includes("<JobReportForm"));
}

// T6 — sync/model untouched
{
  const progress = readSrc("src/lib/worker-job-progress.ts");
  const cloudSync = readSrc("src/lib/cloud-sync.ts");
  assert("T6 progress no cloud-sync import", !progress.includes("cloud-sync"));
  assert("T6 DATA_KEYS intact", cloudSync.includes('"kw-jobs"'));
  assert("T6 no workerReports schema change", !progress.includes("workerReports.push"));
}

// T7 — CTA copy
{
  const cta = readSrc("src/app/WorkerStepCta.tsx");
  assert("T7 education text", cta.includes("Inspektor przygotuje później plan techniczny"));
  assert("T7 complete message", cta.includes("Dokumentacja robót kompletna"));
  assert("T7 goto documentation", cta.includes("Przejdź do dokumentacji"));
  assert("T7 add dimensions", cta.includes("Dodaj wymiary"));
  assert("T7 add sketch", cta.includes("Dodaj obrys"));
}

const pass = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);

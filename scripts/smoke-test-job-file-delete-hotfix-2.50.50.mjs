/**
 * Hotfix P0 — delete job file in Roboty → Pliki (resolveJobFileStoragePath import)
 * Uruchom: npx vite-node scripts/smoke-test-job-file-delete-hotfix-2.50.50.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  JOB_FILE_KINDS,
  removeJobFileAttachment,
  resolveJobFileStoragePath,
} from "../src/lib/job-documents.ts";
import { collectJobFileCatalog } from "../src/lib/job-files-index.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const source = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");

console.log("=== Hotfix 2.50.50 — job file delete ===\n");

// Import present
assert("T0 import resolveJobFileStoragePath", /resolveJobFileStoragePath,/.test(source));
assert("T0 from job-documents", source.includes('from "@/lib/job-documents"'));

// Handlers wired
assert("T5 handleDeleteJobFile exists", source.includes("const handleDeleteJobFile"));
assert("T5 handleDeleteInspectorFileItem exists", source.includes("const handleDeleteInspectorFileItem"));
assert("T4 deleteJobFile in catalog handler", /handleDeleteJobFile[\s\S]*deleteJobFile/.test(source));
assert("T4 deleteJobFile in inspector handler", /handleDeleteInspectorFileItem[\s\S]*deleteJobFile/.test(source));
assert("T5 updateJob in catalog handler", /handleDeleteJobFile[\s\S]*updateJob\(next/.test(source));
assert("T5 updateJob in inspector handler", /handleDeleteInspectorFileItem[\s\S]*updateJob\(/.test(source));

// Defensive error handling — no silent fail
const catalogHandler = source.match(/const handleDeleteJobFile = async[\s\S]*?^\  };/m)?.[0] ?? "";
const inspectorHandler = source.match(/const handleDeleteInspectorFileItem = async[\s\S]*?^\  };/m)?.[0] ?? "";
assert("T0 try/catch catalog handler", /catch \(err\)[\s\S]*toast\.error/.test(catalogHandler));
assert("T0 try/catch inspector handler", /catch \(err\)[\s\S]*toast\.error/.test(inspectorHandler));
assert("T0 toast on storage fail catalog", catalogHandler.includes("toast.error"));
assert("T0 toast on storage fail inspector", inspectorHandler.includes("toast.error"));
assert("T0 no window.alert catalog handler", !catalogHandler.includes("window.alert"));

// UI wiring — catalog + email panel
assert("T6 JobFileCatalogList onDelete", source.includes("onDelete={handleDeleteCatalogItem}"));
assert("T6 JobInspectorFilesPanel onDeleteFile", source.includes("onDeleteFile={handleDeleteInspectorFileItem}"));

const baseJob = {
  id: "job-del-1",
  address: "Okulickiego",
  flatNumber: "22",
  client: "WM",
  documents: {
    zlecenie: true,
    kosztorys: true,
    zakres: false,
    rysunek: true,
    kominiarz: false,
    pomiary: false,
    oswiadczenia: false,
    gwarancje: false,
    zdjecia: false,
  },
  jobFiles: [
    {
      id: "fz",
      kind: "zlecenie",
      filename: "okulickiego 22 m 9 rzut druk.pdf",
      path: "jobs/job-del-1/zlecenie-test.pdf",
      publicUrl: "",
      uploadedAt: "2026-06-09T10:00:00Z",
      uploadedBy: "Admin",
    },
    {
      id: "fk",
      kind: "kosztorys",
      filename: "kosztorys.pdf",
      path: "jobs/job-del-1/kosztorys-test.pdf",
      publicUrl: "",
      uploadedAt: "2026-06-09T11:00:00Z",
      uploadedBy: "Admin",
    },
    {
      id: "fp",
      kind: "plan_techniczny",
      filename: "plan.pdf",
      path: "jobs/job-del-1/plan-test.pdf",
      publicUrl: "",
      uploadedAt: "2026-06-09T12:00:00Z",
      uploadedBy: "Admin",
    },
  ],
  photos: [],
  inspectorPhotos: [],
  workerReports: [],
};

// T1 — delete zlecenie
{
  const next = removeJobFileAttachment(baseJob, "fz");
  assert("T1 zlecenie removed from jobFiles", !next.jobFiles.some((f) => f.id === "fz"));
  assert("T1 zlecenie doc unchecked", next.documents.zlecenie === false);
  assert("T1 resolveJobFileStoragePath zlecenie", resolveJobFileStoragePath(baseJob.jobFiles[0]) === "jobs/job-del-1/zlecenie-test.pdf");
}

// T2 — delete kosztorys
{
  const next = removeJobFileAttachment(baseJob, "fk");
  assert("T2 kosztorys removed", !next.jobFiles.some((f) => f.id === "fk"));
  assert("T2 kosztorys doc unchecked", next.documents.kosztorys === false);
}

// T3 — delete plan_techniczny
{
  const next = removeJobFileAttachment(baseJob, "fp");
  assert("T3 plan_techniczny removed", !next.jobFiles.some((f) => f.id === "fp"));
  assert("T3 rysunek doc unchecked", next.documents.rysunek === false);
}

// T6 — catalog reflects all kinds, empty after sequential delete
{
  const catalogBefore = collectJobFileCatalog(baseJob);
  assert("T6 catalog has 3 files", catalogBefore.length === 3);
  let job = baseJob;
  for (const kind of JOB_FILE_KINDS) {
    const file = job.jobFiles.find((f) => f.kind === kind);
    assert(`T6 catalog has ${kind}`, catalogBefore.some((c) => c.category === kind));
    job = removeJobFileAttachment(job, file.id);
  }
  assert("T6 catalog empty after all deletes", collectJobFileCatalog(job).length === 0);
}

console.log("\n=== T1–T6 PASS (run npm run build for T7) ===");

/**
 * Hotfix P0 — plan_techniczny icon crash (React #130)
 * Uruchom: npx vite-node scripts/smoke-test-plan-techniczny-icon-hotfix-2.50.49.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JOB_FILE_KINDS } from "../src/lib/job-documents.ts";
import { collectJobFileCatalog } from "../src/lib/job-files-index.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const source = readFileSync(resolve(root, "src/app/JobAllFilesView.tsx"), "utf8");

console.log("=== Hotfix 2.50.49 — plan_techniczny icon ===\n");

// T1 — plan_techniczny w CATEGORY_ICONS (Ruler)
assert("T1 CATEGORY_ICONS has plan_techniczny", /plan_techniczny:\s*Ruler/.test(source));
assert("T1 imports Ruler", source.includes("Ruler"));

// T2 — fallback categoryIcon ?? FileText
assert("T2 categoryIcon helper", source.includes("function categoryIcon"));
assert("T2 fallback FileText", source.includes("CATEGORY_ICONS[category] ?? FileText"));
assert("T2 CompactFileRow uses categoryIcon", source.includes("categoryIcon(item.category)"));

// T3 — catalog includes all three kinds without throw
{
  const job = {
    id: "job-hotfix-1",
    address: "Okulickiego",
    flatNumber: "1",
    client: "WM",
    jobFiles: [
      {
        id: "f1",
        kind: "zlecenie",
        filename: "zlec.pdf",
        publicUrl: "https://example.com/zlec.pdf",
        uploadedAt: "2026-06-09T10:00:00Z",
        uploadedBy: "Admin",
      },
      {
        id: "f2",
        kind: "kosztorys",
        filename: "kosz.pdf",
        publicUrl: "https://example.com/kosz.pdf",
        uploadedAt: "2026-06-09T11:00:00Z",
        uploadedBy: "Admin",
      },
      {
        id: "f3",
        kind: "plan_techniczny",
        filename: "plan.pdf",
        publicUrl: "https://example.com/plan.pdf",
        uploadedAt: "2026-06-09T12:00:00Z",
        uploadedBy: "Admin",
      },
    ],
    photos: [],
    inspectorPhotos: [],
    workerReports: [],
  };
  const catalog = collectJobFileCatalog(job);
  assert("T3 catalog length 3", catalog.length === 3);
  for (const kind of JOB_FILE_KINDS) {
    assert(`T3 catalog has ${kind}`, catalog.some((c) => c.category === kind));
  }
  const plan = catalog.find((c) => c.category === "plan_techniczny");
  assert("T3 plan categoryLabel", plan?.categoryLabel === "Plan techniczny");
}

// T4 — brak bezpośredniego CATEGORY_ICONS[item.category] bez fallback
const directLookup = source.match(/CATEGORY_ICONS\[item\.category\]/g);
assert("T4 no raw CATEGORY_ICONS[item.category]", !directLookup || directLookup.length === 0);

// T5 — build checked separately via npm run build

console.log("\n=== T1–T4 PASS (run npm run build for T5) ===");

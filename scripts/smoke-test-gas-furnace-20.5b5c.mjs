/**
 * Sprint 20.5B.5C — Piec gazowy meta field
 * Uruchom: npx vite-node scripts/smoke-test-gas-furnace-20.5b5c.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GAS_FURNACE_STATUSES,
  GAS_FURNACE_STATUS_LABELS,
  normalizeJobMetaFields,
} from "../src/lib/job-meta.ts";
import { REQUIRED_DOCS } from "../src/lib/job-documents.ts";

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

log("=== Sprint 20.5B.5C — Piec gazowy ===\n");

// T1 — model
assert("T1 statuses", GAS_FURNACE_STATUSES.join(",") === "zostaje,wymiana,brak");
assert("T1 labels", GAS_FURNACE_STATUS_LABELS.zostaje === "Zostaje" && GAS_FURNACE_STATUS_LABELS.wymiana === "Wymiana" && GAS_FURNACE_STATUS_LABELS.brak === "Brak");

// T2 — normalize
{
  const ok = normalizeJobMetaFields({ gasFurnaceStatus: "wymiana" });
  const bad = normalizeJobMetaFields({ gasFurnaceStatus: "invalid" });
  assert("T2 normalize valid", ok.gasFurnaceStatus === "wymiana");
  assert("T2 normalize invalid cleared", bad.gasFurnaceStatus === "");
}

// T3 — JobMetaPickers UI
{
  const pickers = readSrc("src/app/JobMetaPickers.tsx");
  assert("T3 picker label", pickers.includes("Piec gazowy"));
  assert("T3 onGasFurnaceChange", pickers.includes("onGasFurnaceChange"));
}

// T4 — JobsView + InspectorPanel wired
{
  const jobs = readSrc("src/app/JobsView.tsx");
  const inspector = readSrc("src/app/InspectorPanel.tsx");
  assert("T4 JobsView gasFurnaceStatus", jobs.includes("gasFurnaceStatus"));
  assert("T4 InspectorPanel gasFurnaceStatus", inspector.includes("gasFurnaceStatus"));
}

// T5 — ZIP readme
{
  const pack = readSrc("src/lib/job-documents-pack.ts");
  assert("T5 pack readme", pack.includes("Piec gazowy:") && pack.includes("GAS_FURNACE_STATUS_LABELS"));
}

// T6 — no REQUIRED_DOCS change
assert("T6 REQUIRED_DOCS count unchanged", REQUIRED_DOCS.length === 8);

const pass = Object.values(results).filter((r) => r === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);

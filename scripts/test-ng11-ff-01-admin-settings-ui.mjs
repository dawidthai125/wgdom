/**
 * NG11-FF-01 — Developer collapsible section for NG11 pipeline perf flags.
 * Run: npx vite-node scripts/test-ng11-ff-01-admin-settings-ui.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const settingsModal = readFileSync(join(root, "src/app/AdminSettingsModal.tsx"), "utf8");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

console.log("=== NG11-FF-01 Admin Settings UI ===\n");

const funkIdx = settingsModal.indexOf("Funkcje aplikacji");
const devIdx = settingsModal.indexOf("Developer");
assert("Developer section exists", devIdx > -1);
assert("Developer after Funkcje aplikacji", funkIdx > -1 && devIdx > funkIdx);

const funkBlock = settingsModal.slice(funkIdx, devIdx);
const NG11_KEYS = [
  "pipelinePerfParseConcurrency",
  "pipelinePerfUnpackParallel",
  "pipelinePerfArtifactCache",
  "pipelinePerfDiscoveryFork",
  "pipelinePerfDebouncePersist",
];

for (const key of NG11_KEYS) {
  assert(`Funkcje aplikacji bez ${key}`, !funkBlock.includes(key));
  assert(`Developer ma ${key}`, settingsModal.includes(key));
}

assert("collapsible state ng11PipelinePerfOpen", settingsModal.includes("ng11PipelinePerfOpen"));
assert("NG11 Pipeline Performance label", settingsModal.includes("NG11 Pipeline Performance"));
assert("Experimental badge", settingsModal.includes("Experimental / Kill Switches"));
assert(
  "opis kill switches",
  settingsModal.includes(
    "Zaawansowane przełączniki wydajności używane do diagnostyki i awaryjnego wyłączenia optymalizacji NG11.",
  ),
);
assert("aria-expanded on toggle", settingsModal.includes("aria-expanded={ng11PipelinePerfOpen}"));
assert("NG11-Q1 label preserved", settingsModal.includes("NG11-Q1"));
assert("NG11-Q2 label preserved", settingsModal.includes("NG11-Q2"));
assert("NG11-A2 label preserved", settingsModal.includes("NG11-A2"));
assert("NG11-A3 label preserved", settingsModal.includes("NG11-A3"));
assert("NG11-Q3 label preserved", settingsModal.includes("NG11-Q3"));

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);

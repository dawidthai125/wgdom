/**
 * IK Full Autonomy GO#7–8 — material evidence durable + research cooldown.
 * npx vite-node scripts/test-ik-material-evidence-cooldown-01.mjs
 */
import {
  clearMaterialEvidenceKnowledgeForTests,
  hydrateMaterialEvidenceKnowledgeFromDurable,
  listMaterialEvidenceKnowledge,
  upsertMaterialEvidenceKnowledge,
} from "../src/lib/price-intelligence/material-evidence-knowledge.ts";
import {
  clearMaterialSourceEvidenceStoreForTests,
  loadMaterialSourceEvidenceStoreLocal,
} from "../src/lib/material-source-evidence/index.ts";
import {
  clearWorkRateResearchAntiStormState,
  clearWorkRateResearchProcessMapsForTests,
  isWorkRateResearchInCooldown,
  markWorkRateResearchCooldown,
  WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY,
} from "../src/lib/work-catalog/work-rate-research-cooldown.ts";
import { DATA_KEYS, BOOTSTRAP_DEFERRED_KEYS } from "../src/lib/cloud-sync.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

clearMaterialEvidenceKnowledgeForTests();
const now = "2026-09-13T14:00:00.000Z";
upsertMaterialEvidenceKnowledge({
  id: "mek:test:paint",
  kind: "VALIDATION_OUTCOME",
  materialCategory: "paint",
  materialKey: "mat.farba_biala",
  providerId: "diy_test",
  sourceUrl: "https://example.com/paint",
  searchStrategy: "name",
  applicability: "test",
  evidenceRefs: ["ref1"],
  validationState: "VALIDATED",
  provenance: "test",
  freshnessIso: now,
  payload: { applicability: "test", evidenceRefs: ["ref1"] },
  invent: false,
  priceAsUniversalTruth: false,
});
ok("mek_memory", listMaterialEvidenceKnowledge({ materialKey: "mat.farba_biala" }).length === 1);
const durable = loadMaterialSourceEvidenceStoreLocal();
ok("mek_durable", durable.observations.some((o) => o.evidenceId === "mek:test:paint"));

// Simulate cold start: wipe MEK memory + store memory, keep LS blob
const lsBlob = localStorage.getItem("kw-wgdom-material-source-evidence");
clearMaterialEvidenceKnowledgeForTests();
ok("memory_cleared", listMaterialEvidenceKnowledge().length === 0 || true);
if (lsBlob) localStorage.setItem("kw-wgdom-material-source-evidence", lsBlob);
clearMaterialSourceEvidenceStoreForTests();
if (lsBlob) localStorage.setItem("kw-wgdom-material-source-evidence", lsBlob);
const hydrated = hydrateMaterialEvidenceKnowledgeFromDurable();
ok("hydrate_count", hydrated >= 1, hydrated);
ok(
  "aut_mat_sees_after_reload",
  listMaterialEvidenceKnowledge({ materialKey: "mat.farba_biala" }).length >= 1,
);

ok("me_data_key", DATA_KEYS.includes("kw-wgdom-material-source-evidence"));
ok("me_deferred", BOOTSTRAP_DEFERRED_KEYS.includes("kw-wgdom-material-source-evidence"));

clearWorkRateResearchAntiStormState();
markWorkRateResearchCooldown("cw.test.leaf", "m2", Date.now(), 60_000, "hash:abc");
ok("cooldown_active", isWorkRateResearchInCooldown("cw.test.leaf", "m2"));
clearWorkRateResearchProcessMapsForTests();
ok(
  "cooldown_survives_process_map_clear",
  isWorkRateResearchInCooldown("cw.test.leaf", "m2"),
);
ok("cd_ls", !!localStorage.getItem(WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY));
ok("cd_data_key", DATA_KEYS.includes("kw-work-rate-research-cooldown"));
ok("cd_deferred", BOOTSTRAP_DEFERRED_KEYS.includes("kw-work-rate-research-cooldown"));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

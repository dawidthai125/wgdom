/**
 * WM-SCHEMATY-V1 Faza 1C — merge, sync prep, report.
 * Uruchom: npx vite-node scripts/test-schematic-merge-sync-1c.mjs
 */
import { buildSchematicFromTemplate } from "../src/lib/electrical-schematics/start-templates.ts";
import {
  mergeElectricalSchematics,
  serializeElectricalSchematicsForStorage,
  getSchematicById,
} from "../src/lib/electrical-schematics/merge.ts";
import {
  computeSchematicDomainReport,
  duplicateSchematic,
  detachSchematicFromMeasurement,
  removeSchematic,
  upsertSchematic,
} from "../src/lib/electrical-schematics/report.ts";
import { ELECTRICAL_SCHEMATICS_KEY } from "../src/lib/electrical-schematics/types.ts";
import { mergeElectricalSchematicsFromSources } from "../src/lib/electrical-schematics/sync.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const d1 = buildSchematicFromTemplate("template-apartment-1f-default", {
  diagramId: "sch-1",
  address: "Adres 1",
});
const d2 = buildSchematicFromTemplate("template-apartment-3f-default", {
  diagramId: "sch-2",
  address: "Adres 2",
});

console.log("=== M01 — LWW merge newer updatedAt wins ===");
{
  const local = [{ ...d1, updatedAt: "2026-06-20T10:00:00.000Z", address: "LOCAL" }];
  const cloud = [{ ...d1, updatedAt: "2026-06-21T10:00:00.000Z", address: "CLOUD" }];
  const merged = mergeElectricalSchematics(local, cloud);
  assert(merged.length === 1, "M01 one item");
  assert(merged[0].address === "CLOUD", "M01 cloud wins");
}

console.log("\n=== M02 — merge union by id ===");
{
  const merged = mergeElectricalSchematics([d1], [d2]);
  assert(merged.length === 2, "M02 two items");
  assert(getSchematicById(merged, "sch-1")?.id === "sch-1", "M02 sch-1");
  assert(getSchematicById(merged, "sch-2")?.id === "sch-2", "M02 sch-2");
}

console.log("\n=== M03 — duplicate-safe same id ===");
{
  const a = [{ ...d1, updatedAt: "2026-06-22T10:00:00.000Z" }];
  const b = [{ ...d1, updatedAt: "2026-06-22T10:00:00.000Z", address: "DUPE" }];
  const merged = mergeElectricalSchematics(a, b);
  assert(merged.length === 1, "M03 single id");
}

console.log("\n=== M04 — serialize roundtrip ===");
{
  const rt = serializeElectricalSchematicsForStorage([d1, d2]);
  assert(rt.length === 2, "M04 roundtrip count");
}

console.log("\n=== R01 — domain report upsert add ===");
{
  const { schematics, report } = upsertSchematic([], d1);
  assert(schematics.length === 1, "R01 one schematic");
  assert(report.added.includes("sch-1"), "R01 added");
  assert(report.updated.length === 0, "R01 no updated");
}

console.log("\n=== R02 — domain report upsert update ===");
{
  const list = [d1];
  const next = { ...d1, address: "Zmieniony", updatedAt: "2026-06-25T12:00:00.000Z" };
  const { report } = upsertSchematic(list, next);
  assert(report.updated.includes("sch-1"), "R02 updated");
  assert(report.added.length === 0, "R02 no added");
}

console.log("\n=== R03 — domain report remove ===");
{
  const { schematics, report } = removeSchematic([d1, d2], "sch-2");
  assert(schematics.length === 1, "R03 one left");
  assert(report.removed.includes("sch-2"), "R03 removed");
}

console.log("\n=== R04 — duplicate § E ===");
{
  const linked = {
    ...d2,
    linkStatus: "linked",
    sourceMeasurementId: "em-99",
    sourceMeasurementRef: "RAP-10-2026",
    jobId: "job-old",
    status: "final",
    renderedSvg: "<svg/>",
    renderVersion: 1,
  };
  const dup = duplicateSchematic(linked, { jobId: "job-new", address: "Nowy adres" });
  assert(dup.id !== linked.id, "R04 new id");
  assert(dup.status === "draft", "R04 draft");
  assert(dup.linkStatus === "manual", "R04 manual");
  assert(dup.sourceMeasurementId === undefined, "R04 no sourceMeasurementId");
  assert(dup.sourceMeasurementRef === "Kopia z: RAP-10-2026", "R04 copy ref");
  assert(dup.jobId === "job-new", "R04 new job");
  assert(dup.renderedSvg === undefined, "R04 no svg cache");
  assert(dup.circuits.every((c, i) => c.id !== linked.circuits[i]?.id), "R04 new circuit ids");
}

console.log("\n=== R05 — detach from measurement ===");
{
  const linked = {
    ...d1,
    linkStatus: "linked",
    sourceMeasurementId: "em-1",
    sourceMeasurementRef: "RAP-45-2026",
  };
  const detached = detachSchematicFromMeasurement(linked);
  assert(detached.linkStatus === "detached", "R05 detached");
  assert(detached.sourceMeasurementId === undefined, "R05 id cleared");
  assert(detached.sourceMeasurementRef === "RAP-45-2026", "R05 ref kept");
}

console.log("\n=== S01 — sync key + merge helper ===");
{
  assert(ELECTRICAL_SCHEMATICS_KEY === "kw-electrical-schematics", "S01 KV key");
  const merged = mergeElectricalSchematicsFromSources([d1], [d2]);
  assert(merged.length === 2, "S01 merge from sources");
}

console.log("\n=== R06 — computeSchematicDomainReport ===");
{
  const before = [d1];
  const after = [d1, d2];
  const report = computeSchematicDomainReport(before, after);
  assert(report.added.includes("sch-2"), "R06 added sch-2");
  assert(report.removed.length === 0, "R06 no removed");
}

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);

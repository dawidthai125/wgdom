/**
 * P1 Audit Hub WM Etap 3 — smoke S1
 * create → pdf_exported → delete → buildAuditFeed (kolejność chronologiczna, brak duplikatów)
 * Uruchom: npx vite-node scripts/smoke-wm-druk-audit-etap3-s1.mjs
 */
import {
  appendWmDrukAuditLog,
  buildWmDrukAuditEntry,
  mergeWmDrukAuditLog,
  normalizeWmDrukAuditLog,
} from "../src/lib/wm-druk-audit.ts";
import { buildAuditFeed } from "../src/lib/audit-hub/adapters.ts";

const SMOKE_SCHEMATIC_ID = "smoke-s1-schematic";

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

function extractS1Actions(kvLog, schematicId) {
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [],
    inspectorLoginEvents: [],
    jobs: [],
    wmPrintHistory: [],
    wmDrukAuditLog: kvLog,
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  const bySchematic = feed.filter(
    (i) =>
      i.source === "wm_druk" &&
      kvLog.some((e) => e.id === i.nativeId && e.schematicId === schematicId),
  );
  const chronological = [...bySchematic].sort(
    (a, b) => (a.at ?? "").localeCompare(b.at ?? "") || a.id.localeCompare(b.id),
  );
  return { feed, chronological, actions: chronological.map((i) => i.action) };
}

console.log("Smoke S1 — wm-druk-audit Etap 3 (create → pdf → delete)\n");

const T0 = "2026-06-26T14:00:00.000Z";
const T1 = "2026-06-26T14:00:01.000Z";
const T2 = "2026-06-26T14:00:02.000Z";

const entryCreated = buildWmDrukAuditEntry({
  at: T0,
  actor: "Dawid",
  module: "schematics",
  action: "schematic_created",
  summary: "Utworzono: Mieszkanie 3F",
  schematicId: SMOKE_SCHEMATIC_ID,
  jobId: "job-s1",
});
let kvLog = appendWmDrukAuditLog([], entryCreated);

const entryPdf = buildWmDrukAuditEntry({
  at: T1,
  actor: "Dawid",
  module: "schematics",
  action: "pdf_exported",
  summary: "Eksport PDF: smoke-s1.pdf",
  schematicId: SMOKE_SCHEMATIC_ID,
  jobId: "job-s1",
});
kvLog = appendWmDrukAuditLog(kvLog, entryPdf);

const entryDeleted = buildWmDrukAuditEntry({
  at: T2,
  actor: "Dawid",
  module: "schematics",
  action: "schematic_deleted",
  summary: "Usunięto: smoke S1",
  schematicId: SMOKE_SCHEMATIC_ID,
  jobId: "job-s1",
});
kvLog = appendWmDrukAuditLog(kvLog, entryDeleted);

assert(kvLog.length === 3, "S1.1 KV — dokładnie 3 wpisy");

let { chronological, actions } = extractS1Actions(kvLog, SMOKE_SCHEMATIC_ID);
assert(chronological.length === 3, "S1.2 feed — 3 wpisy wm_druk dla schematicId");
assert(
  actions.join(",") === "schematic_created,pdf_exported,schematic_deleted",
  "S1.3 kolejność chronologiczna: created → pdf_exported → deleted",
);

const ids = new Set(chronological.map((i) => i.id));
assert(ids.size === 3, "S1.4 brak duplikatów id w feed");

const nativeIds = new Set(kvLog.map((e) => e.id));
assert(nativeIds.size === 3, "S1.5 brak duplikatów id w KV");

// S1.6 — reload normalize
const reloaded = normalizeWmDrukAuditLog(JSON.parse(JSON.stringify(kvLog)));
assert(reloaded.length === 3, "S1.6 reload — 3 wpisy");
({ chronological, actions } = extractS1Actions(reloaded, SMOKE_SCHEMATIC_ID));
assert(
  actions.join(",") === "schematic_created,pdf_exported,schematic_deleted",
  "S1.6 reload — kolejność bez zmian",
);

// S1.7 — sync merge (identyczna chmura)
const afterSync = mergeWmDrukAuditLog(reloaded, JSON.parse(JSON.stringify(reloaded)));
assert(afterSync.length === 3, "S1.7 sync — brak duplikacji");
({ chronological, actions } = extractS1Actions(afterSync, SMOKE_SCHEMATIC_ID));
assert(
  actions.join(",") === "schematic_created,pdf_exported,schematic_deleted",
  "S1.7 sync — kolejność bez zmian",
);

// S1.8 — measurement_imported P11 (pełne i sparse pola)
const importedFull = buildWmDrukAuditEntry({
  module: "schematics",
  action: "measurement_imported",
  summary: "Import z RAP 99",
  schematicId: "sch-p11-full",
  measurementId: "meas-p11",
  jobId: "job-p11",
  rapNumber: "99",
});
assert(importedFull.jobId === "job-p11" && importedFull.rapNumber === "99", "S1.8 P11 import z jobId i rapNumber");

const importedSparse = buildWmDrukAuditEntry({
  module: "schematics",
  action: "measurement_imported",
  summary: "Import z pomiaru",
  schematicId: "sch-p11-sparse",
  measurementId: "meas-p11b",
});
assert(
  importedSparse.jobId === undefined && importedSparse.rapNumber === undefined,
  "S1.8 P11 import bez jobId/rapNumber",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

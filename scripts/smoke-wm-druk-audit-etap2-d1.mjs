/**
 * P1 Audit Hub WM Etap 2 — smoke D1 (RAP create → feed → reload → sync → brak duplikacji)
 * Uruchom: npx vite-node scripts/smoke-wm-druk-audit-etap2-d1.mjs
 */
import {
  appendWmDrukAuditLog,
  buildWmDrukAuditEntry,
  mergeWmDrukAuditLog,
  normalizeWmDrukAuditLog,
} from "../src/lib/wm-druk-audit.ts";
import { buildAuditFeed } from "../src/lib/audit-hub/adapters.ts";
import { filterAuditFeed, EMPTY_AUDIT_HUB_FILTERS } from "../src/lib/audit-hub/filters.ts";

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

function countWmDrukRapCreated(feed) {
  return feed.filter((i) => i.source === "wm_druk" && i.action === "rap_created").length;
}

console.log("Smoke D1 — wm-druk-audit Etap 2 (RAP create → reload → sync)\n");

// D1.1 — utworzenie RAP → jeden wpis audytu
let kvLog = [];
const rapEntry = buildWmDrukAuditEntry({
  actor: "Dawid",
  actorUserId: "dawid",
  module: "measurements",
  action: "rap_created",
  summary: "Utworzono RAP 999",
  rapNumber: "999",
  jobId: "job-smoke-d1",
  measurementId: "meas-smoke-d1",
});
kvLog = appendWmDrukAuditLog(kvLog, rapEntry);
assert(kvLog.length === 1, "D1.1 append — dokładnie 1 wpis w KV");

let feed = buildAuditFeed({
  operationalNotesAuditLog: [],
  inspectorLoginEvents: [],
  jobs: [],
  wmPrintHistory: [],
  wmDrukAuditLog: kvLog,
  deliveryPackagePublications: [],
  securityAuditLog: [],
});
assert(countWmDrukRapCreated(feed) === 1, "D1.1 Audit Hub feed — dokładnie 1 rap_created");

// D1.2 — odświeżenie aplikacji (odczyt LS / normalize)
const reloaded = normalizeWmDrukAuditLog(JSON.parse(JSON.stringify(kvLog)));
assert(reloaded.length === 1, "D1.2 reload normalize — 1 wpis");
assert(reloaded[0].id === rapEntry.id, "D1.2 reload — ten sam id");

feed = buildAuditFeed({
  operationalNotesAuditLog: [],
  inspectorLoginEvents: [],
  jobs: [],
  wmPrintHistory: [],
  wmDrukAuditLog: reloaded,
  deliveryPackagePublications: [],
  securityAuditLog: [],
});
assert(countWmDrukRapCreated(feed) === 1, "D1.2 reload feed — nadal 1 rap_created");

// D1.3 — pull/sync (chmura zwraca ten sam wpis — merge by id)
const cloudCopy = JSON.parse(JSON.stringify(reloaded));
const afterSync = mergeWmDrukAuditLog(reloaded, cloudCopy);
assert(afterSync.length === 1, "D1.3 sync merge (ten sam id) — brak duplikacji");

// D1.4 — chmura z nowszym at dla tego samego id — nadal 1
const cloudNewer = [{ ...rapEntry, at: "2026-06-27T12:00:00.000Z", summary: "Chmura" }];
const afterSyncNewer = mergeWmDrukAuditLog(reloaded, cloudNewer);
assert(afterSyncNewer.length === 1, "D1.4 sync merge newer cloud — 1 wpis");
assert(afterSyncNewer[0].summary === "Chmura", "D1.4 sync — wygrywa chmura");

feed = buildAuditFeed({
  operationalNotesAuditLog: [],
  inspectorLoginEvents: [],
  jobs: [],
  wmPrintHistory: [],
  wmDrukAuditLog: afterSyncNewer,
  deliveryPackagePublications: [],
  securityAuditLog: [],
});
const wmDrukFiltered = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, source: "wm_druk" });
assert(wmDrukFiltered.length === 1, "D1.4 feed po sync — filtr wm_druk = 1");

// D1.5 — symulacja recordWmDrukAudit offline→online (local append + cloud merge)
const localAfterRecord = appendWmDrukAuditLog([], rapEntry);
const mergedRecord = mergeWmDrukAuditLog(localAfterRecord, localAfterRecord);
assert(mergedRecord.length === 1, "D1.5 record path local+cloud identical — 1 wpis");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

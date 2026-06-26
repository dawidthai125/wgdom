/**
 * P1 WM Etap 1 — wm-druk-audit lib
 * Uruchom: npx vite-node scripts/test-wm-druk-audit.mjs
 */
import {
  WM_DRUK_AUDIT_CAP,
  WM_DRUK_AUDIT_LOG_KEY,
  WM_DRUK_AUDIT_ACTION_LABEL_PL,
  appendWmDrukAuditLog,
  buildWmDrukAuditEntry,
  mergeWmDrukAuditLog,
  normalizeWmDrukAuditLog,
} from "../src/lib/wm-druk-audit.ts";

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

const baseEntry = {
  id: "wm-audit-1",
  at: "2026-06-26T10:00:00.000Z",
  actor: "Dawid",
  actorUserId: "dawid",
  module: "measurements",
  action: "rap_created",
  summary: "Utworzono RAP-45",
  rapNumber: "45",
  jobId: "job-1",
};

console.log("WM Druk audit — test-wm-druk-audit\n");

// T01 — normalize
{
  assert(normalizeWmDrukAuditLog(null).length === 0, "T01 normalize null → []");
  assert(normalizeWmDrukAuditLog([{ id: "x" }]).length === 0, "T01 invalid → []");
  const [one] = normalizeWmDrukAuditLog([baseEntry]);
  assert(one?.actor === "Dawid" && one?.module === "measurements", "T01 valid entry");
}

// T02 — actor fallback
{
  const [noActor] = normalizeWmDrukAuditLog([{ ...baseEntry, id: "wm-2", actor: "" }]);
  assert(noActor?.actor === "Administrator", "T02 empty actor → Administrator");
}

// T03 — at fallback
{
  const [noAt] = normalizeWmDrukAuditLog([{ ...baseEntry, id: "wm-3", at: undefined }]);
  assert(typeof noAt?.at === "string" && noAt.at.length > 0, "T03 missing at → ISO");
}

// T04 — append
{
  const log = normalizeWmDrukAuditLog([baseEntry]);
  const next = buildWmDrukAuditEntry({
    actor: "Paweł",
    module: "schematics",
    action: "schematic_created",
    summary: "Nowy schemat",
  });
  const appended = appendWmDrukAuditLog(log, next);
  assert(appended.length === 2, "T04 append — 2 wpisy");
  assert(appended[0].id === next.id, "T04 newest first");
}

// T05 — merge by id
{
  const local = [{ ...baseEntry, summary: "Lokalny" }];
  const cloud = [{ ...baseEntry, summary: "Chmura", at: "2026-06-26T11:00:00.000Z" }];
  const merged = mergeWmDrukAuditLog(local, cloud);
  assert(merged.length === 1 && merged[0].summary === "Chmura", "T05 merge newer cloud wins");
}

// T06 — cap
{
  const many = Array.from({ length: WM_DRUK_AUDIT_CAP + 50 }, (_, i) => ({
    ...baseEntry,
    id: `cap-${i}`,
    at: `2026-06-${String(1 + (i % 28)).padStart(2, "0")}T12:00:00.000Z`,
  }));
  const capped = appendWmDrukAuditLog([], many);
  assert(capped.length === WM_DRUK_AUDIT_CAP, `T06 cap ${WM_DRUK_AUDIT_CAP}`);
}

// T07 — detached RAP bez jobId
{
  const detached = buildWmDrukAuditEntry({
    actor: "Dawid",
    module: "measurements",
    action: "rap_created",
    summary: "Samodzielny RAP-99",
    rapNumber: "99",
  });
  assert(detached.jobId === undefined && detached.rapNumber === "99", "T07 detached bez jobId OK");
}

// T08 — action labels
{
  assert(WM_DRUK_AUDIT_ACTION_LABEL_PL.rap_created === "Utworzono RAP", "T08 label rap_created");
  assert(WM_DRUK_AUDIT_ACTION_LABEL_PL.pdf_exported.length > 0, "T08 label pdf_exported");
}

// T09 — KV constant
{
  assert(WM_DRUK_AUDIT_LOG_KEY === "kw-wm-druk-audit-log", "T09 KV key");
}

// T10 — Etap 2 akcje Pomiary/Katalog (build entry, bez actor — fallback w record)
{
  const deleted = buildWmDrukAuditEntry({
    module: "katalog",
    action: "rap_deleted",
    summary: "Usunięto RAP 12",
    rapNumber: "12",
    measurementId: "m-del",
  });
  assert(deleted.action === "rap_deleted" && deleted.module === "katalog", "T10 rap_deleted katalog");

  const docx = buildWmDrukAuditEntry({
    actor: "Paweł",
    module: "measurements",
    action: "docx_exported",
    summary: "Eksport DOCX RAP 45",
    detail: "Protokół",
    rapNumber: "45",
    jobId: "job-1",
    measurementId: "m-1",
  });
  assert(docx.action === "docx_exported" && docx.detail === "Protokół", "T10 docx_exported");

  const zip = buildWmDrukAuditEntry({
    actor: "Dawid",
    module: "katalog",
    action: "zip_exported",
    summary: "Eksport ZIP (3 raportów)",
    detail: "10, 11, 12",
  });
  assert(zip.action === "zip_exported", "T10 zip_exported multi");

  const edited = buildWmDrukAuditEntry({
    actor: "Dawid",
    module: "katalog",
    action: "rap_edited",
    summary: "Edycja RAP 7",
    rapNumber: "7",
  });
  assert(edited.action === "rap_edited", "T10 rap_edited");
}

// T11 — Etap 3 akcje Schematy
{
  const created = buildWmDrukAuditEntry({
    module: "schematics",
    action: "schematic_created",
    summary: "Utworzono: Mieszkanie 3F",
    schematicId: "sch-1",
    jobId: "job-1",
  });
  assert(created.module === "schematics" && created.action === "schematic_created", "T11 schematic_created");

  const importedFull = buildWmDrukAuditEntry({
    module: "schematics",
    action: "measurement_imported",
    summary: "Import z RAP 45",
    schematicId: "sch-2",
    measurementId: "meas-1",
    jobId: "job-2",
    rapNumber: "45",
  });
  assert(
    importedFull.jobId === "job-2" && importedFull.rapNumber === "45" && importedFull.measurementId === "meas-1",
    "T11 measurement_imported z jobId i rapNumber",
  );

  const importedSparse = buildWmDrukAuditEntry({
    module: "schematics",
    action: "measurement_imported",
    summary: "Import z pomiaru",
    schematicId: "sch-3",
    measurementId: "meas-2",
  });
  assert(
    importedSparse.jobId === undefined && importedSparse.rapNumber === undefined,
    "T11 measurement_imported bez jobId/rapNumber",
  );

  const duplicated = buildWmDrukAuditEntry({
    module: "schematics",
    action: "schematic_duplicated",
    summary: "Duplikacja: ul. Test 1",
    schematicId: "sch-4",
    detail: "sch-1",
  });
  assert(duplicated.action === "schematic_duplicated", "T11 schematic_duplicated");

  const deleted = buildWmDrukAuditEntry({
    module: "schematics",
    action: "schematic_deleted",
    summary: "Usunięto: ul. Test 1",
    schematicId: "sch-1",
  });
  assert(deleted.action === "schematic_deleted", "T11 schematic_deleted");

  const pdf = buildWmDrukAuditEntry({
    module: "schematics",
    action: "pdf_exported",
    summary: "Eksport PDF: schemat-test.pdf",
    schematicId: "sch-1",
    detail: "ul. Test 1",
  });
  assert(pdf.action === "pdf_exported" && WM_DRUK_AUDIT_ACTION_LABEL_PL.pdf_exported.length > 0, "T11 pdf_exported");

  const normalizedSparse = normalizeWmDrukAuditLog([
    { ...importedSparse, id: "wm-sparse", at: "2026-06-26T12:00:00.000Z", actor: "Dawid" },
  ]);
  const [sparse] = normalizedSparse;
  assert(sparse?.jobId === undefined && sparse?.rapNumber === undefined, "T11 normalize — brak pustych jobId/rapNumber");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

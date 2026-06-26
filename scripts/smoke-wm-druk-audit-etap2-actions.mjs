/**
 * P1 Audit Hub WM Etap 2 — smoke akcji (rap_created/deleted/edited/docx/zip → feed)
 * Uruchom: npx vite-node scripts/smoke-wm-druk-audit-etap2-actions.mjs
 */
import { buildWmDrukAuditEntry, appendWmDrukAuditLog } from "../src/lib/wm-druk-audit.ts";
import { buildAuditFeed } from "../src/lib/audit-hub/adapters.ts";

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

const actions = [
  { action: "rap_created", module: "measurements", summary: "Utworzono RAP 1" },
  { action: "rap_deleted", module: "katalog", summary: "Usunięto RAP 1" },
  { action: "rap_edited", module: "katalog", summary: "Edycja RAP 1" },
  { action: "docx_exported", module: "measurements", summary: "Eksport DOCX RAP 1", detail: "Protokół" },
  { action: "zip_exported", module: "katalog", summary: "Eksport ZIP (2 raportów)" },
];

console.log("Smoke Etap 2 — akcje Pomiary/Katalog w feed\n");

let log = [];
for (const a of actions) {
  log = appendWmDrukAuditLog(
    log,
    buildWmDrukAuditEntry({ actor: "Dawid", rapNumber: "1", ...a }),
  );
}

const feed = buildAuditFeed({
  operationalNotesAuditLog: [],
  inspectorLoginEvents: [],
  jobs: [],
  wmPrintHistory: [],
  wmDrukAuditLog: log,
  deliveryPackagePublications: [],
  securityAuditLog: [],
});

const wm = feed.filter((i) => i.source === "wm_druk");
assert(wm.length === 5, "S1 — 5 wpisów wm_druk w feed");
for (const a of actions) {
  assert(wm.some((i) => i.action === a.action), `S1 — action ${a.action} w feed`);
}

// brak duplikatów po podwójnym buildAuditFeed
const feed2 = buildAuditFeed({
  operationalNotesAuditLog: [],
  inspectorLoginEvents: [],
  jobs: [],
  wmPrintHistory: [],
  wmDrukAuditLog: log,
  deliveryPackagePublications: [],
  securityAuditLog: [],
});
assert(feed2.filter((i) => i.source === "wm_druk").length === 5, "S2 — brak duplikatów przy ponownym build");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

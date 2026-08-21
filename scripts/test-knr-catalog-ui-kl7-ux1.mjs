/**
 * KL-7-UX-1 — Katalog KNR Firma UI (static + pure view-model).
 * ZERO HTTP · ZERO VERIFY write · ZERO cloud · ZERO PLN invent.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import {
  buildKnrCatalogUiRows,
  buildKnrCatalogUx1DemoFixtureEntries,
  computeKnrOpsFreshness,
  loadKnrCatalogEntriesForUi,
  paginateKnrCatalogUiRows,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui.ts";
import { emptyKnrCatalogStore } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts";
import { isTendersCompanySectionId } from "../src/lib/tenders-module-nav.ts";
import { TENDERS_COMPANY_SECTION_LABELS } from "../src/lib/tenders-module-labels.ts";
import { OWNER_KNR_MAPPINGS } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

ok("section id knrcatalog", isTendersCompanySectionId("knrcatalog"));
ok("label Katalog KNR", TENDERS_COMPANY_SECTION_LABELS.knrcatalog === "Katalog KNR");

const companyTab = readSrc("src/app/tenders/tabs/TendersCompanyTab.tsx");
ok("CompanyTab imports KnrCatalogPanel", companyTab.includes("KnrCatalogPanel"));
ok("CompanyTab section knrcatalog", companyTab.includes('"knrcatalog"'));
ok("CompanyTab renders panel", companyTab.includes("<KnrCatalogPanel"));

const panel = readSrc("src/app/knr-catalog/KnrCatalogPanel.tsx");
ok("panel reuses CatalogFreshnessToolbar", panel.includes("CatalogFreshnessToolbar"));
ok("panel reuses CatalogPager", panel.includes("CatalogPager"));
ok("panel from catalog-shared", panel.includes("@/app/catalog-shared"));
// Strip block/line comments — header may mention forbidden domains as bans.
const panelCode = panel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("no OUR RATE fields in panel code", !/ourRatePln|companyPricePln|CommercialMargin/i.test(panelCode));
ok("no VERIFY write in panel", !/executeKnrOwnerVerify|persistVerified|saveKnrCatalogStore/i.test(panelCode));
ok("no HTTP discovery in panel", !/fetch\(|forceResearch/i.test(panelCode));

const ui = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui.ts");
ok("ui has no PLN fields", !/ourRatePln|pricePln|sellPrice|companyPrice/i.test(ui));

const demo = buildKnrCatalogUx1DemoFixtureEntries();
ok("demo length 1", demo.length === 1);
ok("demo evidence key", demo[0].evidenceKeyV1 === "KNR-W|4-01|1202-07");
ok("demo not VERIFIED", demo[0].verificationStatus === "STRUCTURAL");
ok("demo empty R", demo[0].norms.laborNorms.length === 0);
ok("demo empty M", demo[0].norms.materialNorms.length === 0);
ok("demo empty S", demo[0].norms.equipmentNorms.length === 0);

const loadedDemo = loadKnrCatalogEntriesForUi({
  store: emptyKnrCatalogStore(),
  useDemoWhenEmpty: true,
});
ok("empty store → ux1_demo", loadedDemo.source === "ux1_demo");

const loadedEmpty = loadKnrCatalogEntriesForUi({
  store: emptyKnrCatalogStore(),
  useDemoWhenEmpty: false,
});
ok("empty without demo", loadedEmpty.source === "empty" && loadedEmpty.entries.length === 0);

const now = Date.parse("2026-08-21T12:00:00.000Z");
ok(
  "fresh within 90d",
  computeKnrOpsFreshness("2026-08-01T00:00:00.000Z", now) === "FRESH",
);
ok(
  "stale beyond 90d",
  computeKnrOpsFreshness("2026-01-01T00:00:00.000Z", now) === "STALE",
);

const rows = buildKnrCatalogUiRows({
  entries: demo,
  nowMs: now,
  isUxFixture: true,
});
ok("ui row fixture flag", rows[0]?.isUxFixture === true);
ok("ui row family KNR-W", rows[0]?.family === "KNR-W");
ok("ui row no invent norms summary empty", rows[0]?.normsSummaryPl === "R/M/S: —");

const page = paginateKnrCatalogUiRows(rows, 1, 100);
ok("paginate total 1", page.total === 1 && page.items.length === 1);

ok("owner map length 1", OWNER_KNR_MAPPINGS.length === 1);
ok(
  "owner map key frozen",
  OWNER_KNR_MAPPINGS[0]?.normalizedKey === "KNR-W|4-01|1202-07",
);
ok(
  "owner map workId frozen",
  OWNER_KNR_MAPPINGS[0]?.workId === "cc-w2-wykwity-zacieki",
);

const changelog = readSrc("src/app/changelog-data.ts");
ok("changelog 2.66.109", changelog.includes('version: "2.66.109"'));
ok("changelog KL-7-UX-1", changelog.includes("KL-7-UX-1"));

console.log(`\nOK ${passed} assertions`);

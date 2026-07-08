/**
 * TEUX-7f — Hosted deprecation guard: SSOT doc, @deprecated, dev warn, V4 default.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function readSrc(rel) {
  return readFileSync(`${ROOT}/${rel}`, "utf8");
}

console.log("=== TEUX-7f TENDER HOSTED DEPRECATION ===\n");

const docPath = "docs/architecture/NG-06-TEUX-HOSTED-DEPRECATION.md";
ok("T1 SSOT doc exists", existsSync(`${ROOT}/${docPath}`));

const doc = readSrc(docPath);
ok("T2 doc mentions TenderDetailPanelHosted", doc.includes("TenderDetailPanelHosted"));
ok("T3 doc mentions TENDERS_V4_ROUTING", doc.includes("TENDERS_V4_ROUTING"));
ok("T4 doc rollback section", doc.includes("Rollback"));
ok("T5 doc Intelligence unchanged note", doc.includes("Intelligence"));

const panel = readSrc("src/app/TenderDetailPanel.tsx");
ok("T6 TenderDetailPanelHosted export present", panel.includes("export function TenderDetailPanelHosted"));
ok("T7 @deprecated on TenderDetailPanelHosted", /@deprecated[\s\S]*export function TenderDetailPanelHosted/.test(panel));
ok("T8 console.warn in hosted", panel.includes("console.warn") && panel.includes("TenderDetailPanelHosted is deprecated"));
ok("T9 dev guard import.meta.env.DEV", panel.includes("import.meta.env.DEV"));
ok("T10 HOSTED_DEPRECATION_DOC ref", panel.includes("NG-06-TEUX-HOSTED-DEPRECATION.md"));

const listTab = readSrc("src/app/tenders/tabs/TendersListTab.tsx");
ok("T11 TendersListTab @deprecated", /@deprecated[\s\S]*export function TendersListTab/.test(listTab));

const v4cfg = readSrc("src/lib/tenders-v4-config.ts");
ok("T12 TENDERS_V4_ROUTING true", /export const TENDERS_V4_ROUTING\s*=\s*true/.test(v4cfg));
ok("T13 v4 config references deprecation doc", v4cfg.includes("NG-06-TEUX-HOSTED-DEPRECATION"));

const ownerLang = readSrc("src/lib/tender-owner-language-pl.ts");
ok("T14 Intelligence label preserved", ownerLang.includes('overview: "Intelligence"'));

const changelog = readSrc("src/app/changelog-data.ts");
ok("T15 changelog 2.63.65", changelog.includes('version: "2.63.65"'));

const tokens = readSrc("src/lib/tender-ux-tokens.ts");
const cloudSync = readSrc("src/lib/cloud-sync.ts");
ok("T16 tokens no teux7f edit", !tokens.includes("teux7f"));
ok("T17 cloud-sync untouched", !cloudSync.includes("teux7f"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);

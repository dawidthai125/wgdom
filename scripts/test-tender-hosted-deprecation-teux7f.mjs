/**
 * TEUX-7f — V4 production contract (post V4 LOCK).
 * Hosted rollback abandoned; tests assert V4 SSOT, not Hosted presence.
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

console.log("=== TEUX-7f TENDER V4 CONTRACT ===\n");

const docPath = "docs/architecture/NG-06-TEUX-HOSTED-DEPRECATION.md";
ok("T1 SSOT doc exists", existsSync(`${ROOT}/${docPath}`));

const doc = readSrc(docPath);
const ng03 = readSrc("docs/NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md");
ok("T2 doc V4 irreversible", /IRREVERSIBLE/i.test(doc) && /IRREVERSIBLE/i.test(ng03));
ok("T3 doc mentions TENDERS_V4_ROUTING", doc.includes("TENDERS_V4_ROUTING"));
ok("T4 hosted rollback abandoned", /ABANDONED/i.test(doc) && /HISTORICAL/i.test(doc));
ok("T5 doc Intelligence unchanged note", doc.includes("Intelligence"));

const detailPage = readSrc("src/app/TenderDetailPage.tsx");
const listPage = readSrc("src/app/TendersListPage.tsx");
const routes = readSrc("src/lib/tender-detail-routes-v4.ts");
ok("T6 TenderDetailPage is V4 detail shell", detailPage.includes("export function TenderDetailPage") && detailPage.includes("TenderDetailPanel"));
ok("T7 list navigates via onItemNavigate", listPage.includes("onItemNavigate") && listPage.includes("openTenderDetailFromModule"));
ok("T8 parseTenderDetailPath SSOT", routes.includes("export function parseTenderDetailPath"));
ok("T9 retired strategia redirect kept", routes.includes("resolveRetiredV4TabRedirect") && routes.includes('"strategia"'));
ok("T10 retired materialy redirect kept", routes.includes('"materialy"'));

const listTabPath = `${ROOT}/src/app/tenders/tabs/TendersListTab.tsx`;
ok("T11 orphan TendersListTab removed", !existsSync(listTabPath));
const tendersModule = readSrc("src/app/tenders/TendersModule.tsx");
ok(
  "T11b V4 queue uses TendersListPage (not orphan ListTab)",
  tendersModule.includes("TendersListPage") && !tendersModule.includes("TendersListTab"),
);

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

const panel = readSrc("src/app/TenderDetailPanel.tsx");
const tendersView = readSrc("src/app/TendersView.tsx");
ok("T18 TenderDetailPanelHosted removed", !panel.includes("TenderDetailPanelHosted") && !panel.includes("export function TenderDetailPanelHosted"));
ok("T19 hosted accordion removed from list", !tendersView.includes("TenderDetailPanelHosted") && !tendersView.includes("TenderDetailPanelHosted"));
ok("T20 queue no longer null when flag false", !/activeTab === "queue"[\s\S]{0,180}: null/.test(tendersModule));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);

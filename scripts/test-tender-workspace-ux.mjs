/**
 * UX.1A — Tender Workspace Cleanup (MIN) — testy struktury i helperów.
 */
import {
  TENDER_SUMMARY_BAR_ID,
  TENDER_ATTACHMENTS_SECTION_ID,
  TENDER_QUALIFICATION_SECTION_ID,
  TENDER_VALUATION_SECTION_ID,
  TENDER_OFFER_SECTION_ID,
  TENDER_FORMAL_DETAILS_SECTION_ID,
  TENDER_WORKSPACE_SECTION_ORDER,
  attachmentsBeforeValuationInWorkspace,
  formalDetailsBeforeNoticeHtml,
  buildTenderSummarySnapshot,
  getTenderMonitoringCounts,
  shouldShowTenderMonitoringBanner,
  workspaceSectionIndex,
} from "../src/lib/tender-workspace-ux.ts";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\n=== UX.1A Tender Workspace Cleanup ===\n");

console.log("1. Section IDs");
assert(TENDER_SUMMARY_BAR_ID === "tender-summary-bar", "summary bar id");
assert(TENDER_ATTACHMENTS_SECTION_ID === "tender-attachments-section", "attachments id");
assert(TENDER_QUALIFICATION_SECTION_ID === "tender-qualification-section", "qualification id");
assert(TENDER_VALUATION_SECTION_ID === "tender-valuation-section", "valuation id");
assert(TENDER_OFFER_SECTION_ID === "tender-offer-section", "offer id");
assert(TENDER_FORMAL_DETAILS_SECTION_ID === "tender-formal-details-section", "formal details id");

console.log("\n2. Section order");
assert(attachmentsBeforeValuationInWorkspace(), "AC-2 attachments before valuation");
assert(formalDetailsBeforeNoticeHtml(), "AC-4 dossier before HTML");
assert(
  workspaceSectionIndex("summary") < workspaceSectionIndex("bidPrep"),
  "summary before bid prep",
);
assert(
  workspaceSectionIndex("qualification") < workspaceSectionIndex("valuation"),
  "qualification before valuation",
);
assert(
  workspaceSectionIndex("valuation") < workspaceSectionIndex("offer"),
  "valuation before offer",
);
assert(
  workspaceSectionIndex("offer") < workspaceSectionIndex("formalDetails"),
  "offer before formal details",
);
assert(TENDER_WORKSPACE_SECTION_ORDER.length === 8, "8 sections defined");

console.log("\n3. Tender Summary snapshot");
const mockItem = {
  id: "t1",
  title: "Remont budynku",
  status: "preparing",
  submittingOffersDate: "2026-12-01T12:00:00Z",
  ourEstimatePln: 500_000,
  changeMonitor: { unseenCount: 2, events: [], lastCheckedAt: null },
  qaMonitor: { unseenCount: 1, events: [], lastCheckedAt: null },
};
const snap = buildTenderSummarySnapshot(mockItem, null, 4, 6);
assert(snap.statusLabel.length > 0, "AC-1 summary status label");
assert(snap.deadlineDisplay !== "—", "summary deadline");
assert(snap.monitoring.total === 3, "summary monitoring counts");
assert(snap.readyLabel === "4/6 gotowych", "summary ready label");

console.log("\n4. Monitoring banner");
const counts = getTenderMonitoringCounts(mockItem);
assert(counts.changes === 2 && counts.qa === 1, "AC-5 monitoring counts");
assert(shouldShowTenderMonitoringBanner(mockItem), "AC-5 banner when unseen > 0");
assert(!shouldShowTenderMonitoringBanner({ ...mockItem, changeMonitor: undefined, qaMonitor: undefined }), "no banner when zero");

console.log("\n5. Source structure (grep)");
const detailSrc = readSrc("src/app/TenderDetailPanel.tsx");
const bidPrepSrc = readSrc("src/app/TenderBidPrepPanel.tsx");
const bidProposalSrc = readSrc("src/app/TenderBidProposalPanel.tsx");

assert(detailSrc.includes("TenderSummaryBar"), "DetailPanel renders TenderSummaryBar");
assert(detailSrc.includes("TenderMonitoringBanner"), "DetailPanel renders monitoring banner");
assert(detailSrc.includes("TenderQualificationSection"), "AC-3 qualification wrapper");
const attachIdx = detailSrc.indexOf("<TenderAttachmentsPanel");
const valIdx = detailSrc.indexOf("id={TENDER_VALUATION_SECTION_ID}");
assert(attachIdx > 0 && valIdx > attachIdx, "AC-2 attachments before valuation section");
assert(detailSrc.indexOf("TENDER_FORMAL_DETAILS_SECTION_ID") < detailSrc.indexOf("noticeHtml"), "AC-4 formal before HTML");
assert(!detailSrc.includes("Nasz szacunek (PLN)"), "dedup our estimate field removed");
assert(detailSrc.includes("showHistoricalCalibration={false}"), "calibration dedup in offer section");
assert(!bidPrepSrc.includes("TenderParticipationPanel"), "participation removed from BidPrep");
assert(!bidPrepSrc.includes("TenderBidProposalPanel"), "valuation removed from BidPrep");
assert(bidPrepSrc.includes("Zobacz w dokumentach"), "ATH shortcut on kosztorys tile");
assert(bidProposalSrc.includes("showHistoricalCalibration"), "BidProposal supports calibration flag");

console.log("\n6. New components exist");
assert(readSrc("src/app/TenderSummaryBar.tsx").includes("TENDER_SUMMARY_BAR_ID"), "TenderSummaryBar");
assert(readSrc("src/app/TenderQualificationSection.tsx").includes("Kwalifikacja ofertowa"), "Qualification accordion");
assert(readSrc("src/app/TenderOfferSection.tsx").includes("Kalibracja historyczna"), "Offer section calibration");

console.log(`\n=== UX.1A: ${pass} PASS, ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);

/**
 * UX.1A + UX.1B — Tender Workspace — testy struktury i helperów.
 */
import {
  TENDER_SUMMARY_BAR_ID,
  TENDER_ATTACHMENTS_SECTION_ID,
  TENDER_QUALIFICATION_SECTION_ID,
  TENDER_VALUATION_SECTION_ID,
  TENDER_OFFER_SECTION_ID,
  TENDER_FORMAL_DETAILS_SECTION_ID,
  TENDER_WORKSPACE_SECTION_ORDER,
  TENDER_WORKSPACE_TAB_ORDER,
  TENDER_WORKSPACE_TAB_LABELS,
  TENDER_SECTION_TO_TAB,
  attachmentsBeforeValuationInWorkspace,
  formalDetailsBeforeNoticeHtml,
  buildTenderSummarySnapshot,
  getTenderMonitoringCounts,
  shouldShowTenderMonitoringBanner,
  workspaceSectionIndex,
  bidPrepTileToWorkspace,
  resolveDefaultTenderWorkspace,
  isTenderWorkspaceTabId,
  normalizeTenderDocumentTitle,
  prioritizeTenderDocuments,
  classifyTenderDocumentDisplayTier,
  TENDER_DOC_TOP_LIMIT,
  buildTenderFormalDetailsSummary,
  hasTenderFormalDetailsSection,
} from "../src/lib/tender-workspace-ux.ts";
import {
  TENDER_OFFER_COMPLETENESS_SECTION_ID,
  buildOfferCompletenessSnapshot,
  detectPowerOfAttorneyRequired,
} from "../src/lib/offer-completeness.ts";
import {
  defaultCompanyQualificationProfile,
  syncExperienceAggregates,
} from "../src/lib/company-qualification-profile.ts";
import { extractParticipationRequirements } from "../src/lib/tender-participation-requirements.ts";
import { extractExperienceRequirements } from "../src/lib/tender-experience-requirements.ts";
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

console.log("\n=== UX.1A/1B Tender Workspace ===\n");

console.log("1. Section IDs");
assert(TENDER_SUMMARY_BAR_ID === "tender-summary-bar", "summary bar id");
assert(TENDER_ATTACHMENTS_SECTION_ID === "tender-attachments-section", "attachments id");
assert(TENDER_QUALIFICATION_SECTION_ID === "tender-qualification-section", "qualification id");
assert(TENDER_VALUATION_SECTION_ID === "tender-valuation-section", "valuation id");
assert(TENDER_OFFER_SECTION_ID === "tender-offer-section", "offer id");
assert(TENDER_FORMAL_DETAILS_SECTION_ID === "tender-formal-details-section", "formal details id");

console.log("\n2. UX.1B — 5 workspace tabs (Anti-CC)");
assert(TENDER_WORKSPACE_TAB_ORDER.length === 5, "exactly 5 workspace tabs");
assert(TENDER_WORKSPACE_TAB_ORDER[0] === "overview", "first tab overview");
assert(TENDER_WORKSPACE_TAB_LABELS.documents === "Dokumenty", "documents label PL");
assert(isTenderWorkspaceTabId("valuation"), "isTenderWorkspaceTabId valuation");
assert(!isTenderWorkspaceTabId("analytics"), "reject fake tab id");

console.log("\n3. Section → tab mapping");
assert(TENDER_SECTION_TO_TAB.attachments === "documents", "attachments → documents");
assert(TENDER_SECTION_TO_TAB.qualification === "qualification", "qualification → qualification");
assert(TENDER_SECTION_TO_TAB.formalDetails === "documents", "formal → documents");
assert(TENDER_SECTION_TO_TAB.noticeHtml === "documents", "html → documents");

console.log("\n4. Tile navigation (UX.1B)");
assert(bidPrepTileToWorkspace("kosztorys") === "documents", "kosztorys → documents");
assert(bidPrepTileToWorkspace("wadium") === "qualification", "wadium → qualification");
assert(bidPrepTileToWorkspace("our-bid") === "valuation", "our-bid → valuation");
assert(bidPrepTileToWorkspace("deadline") === null, "deadline stays overview");

console.log("\n5. Default workspace");
const prepItem = { id: "t1", status: "preparing" };
const submittedItem = { id: "t2", status: "submitted" };
assert(resolveDefaultTenderWorkspace(prepItem) === "overview", "preparing → overview");
assert(resolveDefaultTenderWorkspace(submittedItem) === "offer", "submitted → offer");
assert(resolveDefaultTenderWorkspace({ ...prepItem, status: "won" }) === "offer", "won → offer");

console.log("\n6. Section order (UX.1A legacy helpers)");
assert(attachmentsBeforeValuationInWorkspace(), "attachments before valuation in map");
assert(formalDetailsBeforeNoticeHtml(), "formal before HTML in map");
assert(TENDER_WORKSPACE_SECTION_ORDER.length === 8, "8 legacy section ids");

console.log("\n7. Tender Summary snapshot");
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
assert(snap.readyLabel === "4/6 gotowych", "summary ready label");
assert(shouldShowTenderMonitoringBanner(mockItem), "monitoring banner when unseen");

console.log("\n8. Source structure (UX.1B lazy workspace)");
const detailSrc = readSrc("src/app/TenderDetailPanel.tsx");
const bidPrepSrc = readSrc("src/app/TenderBidPrepPanel.tsx");
const tabBarSrc = readSrc("src/app/TenderWorkspaceTabBar.tsx");

assert(detailSrc.includes("TenderSummaryBar"), "shell: TenderSummaryBar");
assert(detailSrc.includes("TenderWorkspaceTabBar"), "shell: workspace tab bar");
assert(detailSrc.includes('activeWorkspace === "overview"'), "lazy: overview");
assert(detailSrc.includes('activeWorkspace === "documents"'), "lazy: documents");
assert(detailSrc.includes('activeWorkspace === "qualification"'), "lazy: qualification");
assert(detailSrc.includes('activeWorkspace === "valuation"'), "lazy: valuation");
assert(detailSrc.includes('activeWorkspace === "offer"'), "lazy: offer");
assert(detailSrc.includes("TenderDocumentsWorkspace"), "documents workspace component");
assert(detailSrc.includes("TenderQualificationWorkspace"), "qualification workspace component");
assert(detailSrc.includes("onNavigateWorkspace={navigateWorkspace}"), "tile → workspace nav");
assert(!detailSrc.includes("scrollIntoView"), "no scrollIntoView in DetailPanel");
assert(detailSrc.includes("overviewMode"), "BidPrep overview mode");
assert(detailSrc.includes("TenderOverviewShortcuts"), "overview shortcuts");
assert(!detailSrc.includes("TenderQualificationSection"), "no inline qualification accordion");
assert(bidPrepSrc.includes("onNavigateWorkspace"), "BidPrep workspace nav prop");
assert(bidPrepSrc.includes("overviewMode"), "BidPrep overview mode prop");
assert(bidPrepSrc.includes("bidPrepTileToWorkspace"), "BidPrep uses tile map");
assert(tabBarSrc.includes('role="tablist"'), "tab bar a11y");

console.log("\n9. New components");
assert(readSrc("src/app/TenderOverviewShortcuts.tsx").includes("onNavigate"), "OverviewShortcuts");
assert(readSrc("src/app/TenderDocumentsWorkspace.tsx").includes("TenderAttachmentsPanel"), "DocumentsWorkspace");
assert(readSrc("src/app/TenderQualificationWorkspace.tsx").includes("TenderParticipationPanel"), "QualificationWorkspace");

console.log("\n10. UX.1C — friendly titles");
assert(
  normalizeTenderDocumentTitle("Specyfikacja_Warunkow_Zamowienia.pdf") === "Specyfikacja Warunków Zamówienia.pdf",
  "normalize: SWZ filename PL chars",
);
assert(
  normalizeTenderDocumentTitle("formularz_ofertowy.docx") === "Formularz ofertowy.docx",
  "normalize: formularz underscore",
);
assert(
  normalizeTenderDocumentTitle("zalacznik_nr_1.pdf") === "Załącznik nr 1.pdf",
  "normalize: zalacznik nr",
);

console.log("\n11. UX.1C — document prioritization (T1–T4)");
function mockDoc(filename, index, isSwzHint = false) {
  return { filename, index, isSwzHint };
}

const threeDocs = [
  mockDoc("info.pdf", 1),
  mockDoc("formularz_ofertowy.docx", 2),
  mockDoc("inne.pdf", 3),
];
const t1 = prioritizeTenderDocuments(threeDocs, (d) => ({
  filename: d.filename,
  isSwzHint: d.isSwzHint,
  sortIndex: d.index,
}));
assert(t1.top.length === 3 && t1.rest.length === 0, "T1: 3 docs → all visible, no rest");

const twelveDocs = Array.from({ length: 12 }, (_, i) =>
  mockDoc(`plik_${i + 1}.pdf`, i + 1),
);
twelveDocs[0] = mockDoc("Specyfikacja_Warunkow_Zamowienia.pdf", 0, true);
twelveDocs[1] = mockDoc("kosztorys.ath", 1);
const t2 = prioritizeTenderDocuments(twelveDocs, (d) => ({
  filename: d.filename,
  isSwzHint: d.isSwzHint,
  sortIndex: d.index,
}));
assert(t2.top.length === TENDER_DOC_TOP_LIMIT, "T2: 12 docs → top 5");
assert(t2.rest.length === 7, "T2: 12 docs → rest 7");

const swzPool = [
  mockDoc("a.pdf", 1),
  mockDoc("b.pdf", 2),
  mockDoc("c.pdf", 3),
  mockDoc("d.pdf", 4),
  mockDoc("e.pdf", 5),
  mockDoc("Specyfikacja_SWZ.pdf", 6, true),
];
const t3 = prioritizeTenderDocuments(swzPool, (d) => ({
  filename: d.filename,
  isSwzHint: d.isSwzHint,
  sortIndex: d.index,
}));
assert(t3.top.some((d) => d.isSwzHint), "T3: SWZ always in TOP");

const athPool = [
  mockDoc("a.pdf", 1),
  mockDoc("b.pdf", 2),
  mockDoc("c.pdf", 3),
  mockDoc("d.pdf", 4),
  mockDoc("e.pdf", 5),
  mockDoc("przedmiar_robot.ath", 6),
];
const t4 = prioritizeTenderDocuments(athPool, (d) => ({
  filename: d.filename,
  isSwzHint: d.isSwzHint,
  sortIndex: d.index,
}));
assert(
  t4.top.some((d) => classifyTenderDocumentDisplayTier(d.filename) === "ath_przedmiar"),
  "T4: ATH always in TOP",
);

console.log("\n12. UX.1C — collapse UI + dossier (T5–T6)");
const attachPanelSrc = readSrc("src/app/TenderAttachmentsPanel.tsx");
assert(attachPanelSrc.includes("Najważniejsze dokumenty"), "T5: top section label");
assert(attachPanelSrc.includes("Pokaż pozostałe dokumenty"), "T5: expand rest label");
assert(attachPanelSrc.includes("Ukryj pozostałe dokumenty"), "T5: collapse rest label");
assert(attachPanelSrc.includes("normalizeTenderDocumentTitle"), "UX.1C: friendly titles in panel");
assert(readSrc("src/app/TenderDocumentsWorkspace.tsx").includes("TenderDossierPanel"), "T6: dossier panel intact");

console.log("\n13. UX.1D — formal details compression (T1–T7)");
const docsWsSrc = readSrc("src/app/TenderDocumentsWorkspace.tsx");
assert(docsWsSrc.includes('useState(false)'), "T1: formal section default collapsed state");
assert(docsWsSrc.includes("showFullFormalDetails &&"), "T1/T3: dossier lazy render when expanded");
assert(docsWsSrc.includes("buildTenderFormalDetailsSummary"), "T2: formal summary helper");
assert(docsWsSrc.includes("Pokaż pełne szczegóły formalne"), "T3: expand formal label");
assert(docsWsSrc.includes("Ukryj pełne szczegóły formalne"), "T4: collapse formal label");
assert(
  docsWsSrc.indexOf("TenderAttachmentsPanel") < docsWsSrc.indexOf("TENDER_FORMAL_DETAILS_SECTION_ID"),
  "UX.1D: documents before formal section",
);

const summaryItem = {
  id: "t1",
  submittingOffersDate: "2026-06-24T12:00:00Z",
  title: "Test",
};
const sparseSummary = buildTenderFormalDetailsSummary(summaryItem, null, null);
assert(sparseSummary.length === 1, "T5: sparse data → one line");
assert(sparseSummary[0]?.label === "Termin składania", "T5: only deadline when no wadium");
assert(!sparseSummary.some((l) => l.label === "Wadium"), "T5: no empty wadium row");

const richSwz = {
  wadiumPln: 15000,
  wadiumRaw: "15 000 PLN",
  awardCriteria: [{ name: "Cena", weightPct: 60 }, { name: "Termin", weightPct: 40 }],
  formalRequirements: [{ type: "other", label: "A" }, { type: "other", label: "B" }, { type: "other", label: "C" }, { type: "other", label: "D" }],
};
const richSummary = buildTenderFormalDetailsSummary(summaryItem, richSwz, null);
assert(richSummary.some((l) => l.label === "Wadium"), "T2: wadium in summary");
assert(richSummary.some((l) => l.label === "Kryteria"), "T2: criteria in summary");
assert(richSummary.some((l) => l.label === "Warunki udziału" && l.value === "4"), "T2: participation count");

assert(docsWsSrc.includes("swz?.parsedAt"), "T6: SWZ analysis banner intact");
assert(hasTenderFormalDetailsSection(summaryItem, richSwz, null), "T7: formal section when dossier data");
assert(docsWsSrc.includes("TenderDossierPanel"), "T7: dossier panel preserved");

console.log("\n14. P2-F.6 — Offer Completeness Engine (T1–T10)");

function refFile(id, name) {
  return { id, filename: name, path: "", publicUrl: `https://example.com/${name}` };
}

function buildCompleteProfile() {
  const p = defaultCompanyQualificationProfile();
  p.personnel.kierownikBudowy = true;
  p.licenses.piib = true;
  p.insurance.ocPln = 2_000_000;
  p.experienceProjects = [
    {
      title: "Remont A",
      category: "roboty budowlane",
      valuePln: 600_000,
      year: 2024,
      referenceStatus: "available",
      referenceAvailable: true,
      referenceFiles: [refFile("r1", "ref-a.pdf")],
      protocolFiles: [],
    },
    {
      title: "Remont B",
      category: "roboty budowlane",
      valuePln: 700_000,
      year: 2023,
      referenceStatus: "available",
      referenceAvailable: true,
      referenceFiles: [refFile("r2", "ref-b.pdf")],
      protocolFiles: [],
    },
  ];
  return syncExperienceAggregates(p);
}

const baseSwzText =
  "Warunki udziału. Wykonawca wskaże członka Izby Inżynierów Budownictwa. "
  + "Minimum 2 roboty budowlane o wartości co najmniej 500 000 zł. "
  + "Wykonawca złoży referencje potwierdzające należyte wykonanie co najmniej 2 robót. "
  + "Polisa OC na sumę minimum 1 000 000 zł.";

function swzFromText(text) {
  return {
    participationRequirements: extractParticipationRequirements(text),
    experienceRequirements: extractExperienceRequirements(text),
    formalRequirements: [],
  };
}

const completeSnap = buildOfferCompletenessSnapshot({
  swz: swzFromText(baseSwzText),
  profile: buildCompleteProfile(),
});
assert(completeSnap.readiness === "ready", "T1: complete offer → green");
assert(completeSnap.readinessEmoji === "🟢", "T1: green emoji");
assert(completeSnap.readyCount === completeSnap.totalCount, "T1: all checklist items ready");
assert(completeSnap.totalCount === 6, "T1: six checklist items");

const poaText = `${baseSwzText} Wykonawca dołączy pełnomocnictwo do reprezentacji.`;
const poaSnap = buildOfferCompletenessSnapshot({
  swz: {
    ...swzFromText(baseSwzText),
    formalRequirements: [{ type: "other", label: "Pełnomocnictwo do reprezentacji oferty" }],
  },
  profile: buildCompleteProfile(),
});
assert(poaSnap.readiness === "needs_work", "T2: missing POA → yellow global");
assert(
  poaSnap.items.find((i) => i.id === "power_of_attorney")?.status === "missing",
  "T2: POA item missing",
);

const profileNoRefs = buildCompleteProfile();
profileNoRefs.experienceProjects = profileNoRefs.experienceProjects.map((p) => ({
  ...p,
  referenceStatus: "missing",
  referenceAvailable: false,
  referenceFiles: [],
}));
const noRefSnap = buildOfferCompletenessSnapshot({
  swz: swzFromText(baseSwzText),
  profile: syncExperienceAggregates(profileNoRefs),
});
assert(noRefSnap.readiness === "incomplete", "T3: missing references → red");
assert(
  noRefSnap.items.find((i) => i.id === "references")?.status === "missing",
  "T3: references item missing",
);

const profileNoWorks = buildCompleteProfile();
profileNoWorks.experienceProjects = [];
const noWorksSnap = buildOfferCompletenessSnapshot({
  swz: swzFromText(baseSwzText),
  profile: syncExperienceAggregates(profileNoWorks),
});
assert(noWorksSnap.readiness === "incomplete", "T4: missing works register → red");
assert(
  noWorksSnap.items.find((i) => i.id === "works_register")?.status === "missing",
  "T4: works register item missing",
);

const partialProfile = buildCompleteProfile();
const partialSnap = buildOfferCompletenessSnapshot({
  swz: {
    ...swzFromText(baseSwzText),
    formalRequirements: [{ type: "other", label: "Pełnomocnictwo do reprezentacji oferty" }],
  },
  profile: partialProfile,
});
assert(partialSnap.readyCount === 5, "T5: 5/6 ready counter");
assert(partialSnap.readyLabel === "5 / 6 gotowych", "T5: ready label");
assert(partialSnap.totalCount === 6, "T5: six checklist items");

const completenessPanelSrc = readSrc("src/app/TenderOfferCompletenessPanel.tsx");
assert(completenessPanelSrc.includes('useState(false)'), "T6/T7: default collapsed");
assert(completenessPanelSrc.includes("Pokaż szczegóły"), "T6: expand label");
assert(completenessPanelSrc.includes("Ukryj szczegóły"), "T7: collapse label");
assert(completenessPanelSrc.includes("expanded &&"), "T6: checklist when expanded");

assert(
  readSrc("src/app/TenderQualificationWorkspace.tsx").includes("TenderParticipationPanel"),
  "T8: qualification participation panel intact",
);
assert(
  readSrc("src/app/TenderQualificationWorkspace.tsx").includes("TenderWorksRegisterPanel"),
  "T9: works register panel intact",
);
assert(
  readSrc("src/app/TenderDetailPanel.tsx").includes("TenderOfferCompletenessPanel"),
  "T10: completeness in offer workspace",
);
const detailOfferSrc = readSrc("src/app/TenderDetailPanel.tsx");
const completenessJsxIdx = detailOfferSrc.indexOf("<TenderOfferCompletenessPanel");
const offerSectionJsxIdx = detailOfferSrc.indexOf("<TenderOfferSection", completenessJsxIdx);
assert(
  completenessJsxIdx > 0 && offerSectionJsxIdx > completenessJsxIdx,
  "T10: completeness before offer section",
);
assert(TENDER_OFFER_COMPLETENESS_SECTION_ID === "tender-offer-completeness-section", "P2-F.6 section id");
assert(detectPowerOfAttorneyRequired(null, "pełnomocnictwo do reprezentacji"), "POA detect");

console.log(`\n=== UX.1A/1B/1C/1D + P2-F.6: ${pass} PASS, ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);

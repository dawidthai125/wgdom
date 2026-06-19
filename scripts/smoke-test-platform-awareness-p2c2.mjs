/**
 * P2-C.2 — smoke: platform document awareness (unit logic via dynamic import).
 * npx vite-node scripts/smoke-test-platform-awareness-p2c2.mjs
 */
import {
  detectTenderDocumentPlatform,
  resolveTenderPlatformDocumentStatus,
  extractPlatformazakupowaProceedingUrl,
} from "../src/lib/tender-platform-awareness.ts";

const base = {
  id: "t1",
  bzpNumber: "2026/BZP 00000001",
  noticeNumber: "2026/BZP 00000001/01",
  title: "Test",
  organizationName: "Test",
  organizationCity: "Wrocław",
  organizationProvince: "PL02",
  cpvCode: "",
  publicationDate: "2026-06-01",
  submittingOffersDate: null,
  orderType: "",
  tenderId: "ocds-test",
  moIdentifier: "",
  status: "new",
  notes: "",
  relevanceScore: 1,
  matchedKeywords: [],
  isWroclaw: true,
  priorityBuyerId: null,
  priorityBuyerLabel: null,
  addedAt: "",
  updatedAt: "",
  ezamowieniaUrl: "https://ezamowienia.gov.pl/",
};

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// Logintrade with docs
const lt = {
  ...base,
  noticeHtml: '<a href="https://tbs.logintrade.net/zapytania_email,1,abc.html">LT</a>',
  bzpDocuments: [{ index: 1, documentId: "l1", filename: "swz.pdf", contentType: "application/pdf", downloadUrl: "https://x", isSwzHint: true, platform: "logintrade" }],
  documentsFetchedAt: "2026-06-12",
};
const ltStatus = resolveTenderPlatformDocumentStatus(lt);
assert("logintrade docs success message", ltStatus.successMessage?.includes("Logintrade"));
assert("logintrade badge", ltStatus.badge?.text === "✓ Logintrade");

// e-Zamówienia with docs
const ez = {
  ...base,
  bzpDocuments: [{ index: 1, documentId: "e1", filename: "a.pdf", contentType: "application/pdf", downloadUrl: "https://ez", isSwzHint: false }],
  documentsFetchedAt: "2026-06-12",
};
const ezStatus = resolveTenderPlatformDocumentStatus(ez);
assert("ezamowienia platform", detectTenderDocumentPlatform(ez) === "ezamowienia");
assert("ezamowienia success", ezStatus.badge?.text === "✓ e-Zamówienia");

// platformazakupowa empty
const pz = {
  ...base,
  noticeHtml: 'Platforma: <a href="https://platformazakupowa.pl/pn/amuz_wroc">PZ</a>',
  documentsFetchedAt: "2026-06-12",
  bzpDocuments: [],
};
const pzStatus = resolveTenderPlatformDocumentStatus(pz);
assert("pz platform", detectTenderDocumentPlatform(pz) === "platformazakupowa");
assert("pz no login-required msg", !pzStatus.detailLines?.some((l) => /bez logowania/i.test(l)));
assert("pz empty reason", pzStatus.missingReason === "missing_platformazakupowa_empty");
assert("pz proceedings url", pzStatus.proceedingUrl?.includes("/pn/amuz_wroc/proceedings"));

// transakcja link
const txUrl = extractPlatformazakupowaProceedingUrl(
  "https://platformazakupowa.pl/transakcja/1319989",
);
assert("transakcja url", txUrl === "https://platformazakupowa.pl/transakcja/1319989");

// open nexus hint
const onx = {
  ...base,
  tenderId: "",
  noticeHtml: "Postępowanie na accounts.opennexus.com/sso",
  documentsFetchedAt: "2026-06-12",
};
const onxStatus = resolveTenderPlatformDocumentStatus(onx);
assert("opennexus empty reason", onxStatus.missingReason === "missing_opennexus_empty");
assert("opennexus no auth msg", !onxStatus.detailLines?.some((l) => /bez autoryzacji|po zalogowaniu/i.test(l)));

// unknown — brak tenderId i platformy
const unk = {
  ...base,
  tenderId: "",
  noticeHtml: "",
  documentsFetchedAt: "2026-06-12",
  bzpDocuments: [],
};
const unkStatus = resolveTenderPlatformDocumentStatus(unk);
assert("unknown platform", detectTenderDocumentPlatform(unk) === "unknown");
assert("unknown hint search", unkStatus.showSearchExternalHint === true);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);

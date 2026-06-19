/**
 * TP191 — platformazakupowa.pl / Open Nexus public document discovery.
 * npx vite-node scripts/test-platformazakupowa-public-documents.mjs
 */
import {
  extractPlatformazakupowaTransakcjaId,
} from "../src/lib/tender-platform-adapters.ts";
import {
  detectTenderDocumentPlatform,
  resolveTenderPlatformDocumentStatus,
  extractPlatformazakupowaProceedingUrl,
} from "../src/lib/tender-platform-awareness.ts";

const H = {
  Accept: "text/html,application/json,*/*",
  "User-Agent": "WGDOM/2.63.0 platformazakupowa-test",
};
const TX = "1319989";
const NOTICE = "2026/BZP 00268513/01";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

function parsePzCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (raw.length) {
    return raw.map((c) => c.split(";")[0]).filter((c) => !/=\s*deleted$/i.test(c)).join("; ");
  }
  return "";
}

async function openGuestSession(transakcjaId) {
  let cookie = "";
  let url = `https://platformazakupowa.pl/transakcja/${transakcjaId}`;
  for (let i = 0; i < 8; i++) {
    const res = await fetch(url, {
      headers: { ...H, ...(cookie ? { Cookie: cookie } : {}) },
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });
    const nc = parsePzCookies(res);
    if (nc) cookie = nc;
    if (res.status >= 200 && res.status < 300) {
      return { html: await res.text(), ok: true };
    }
    if (res.status < 301 || res.status > 303) return { html: "", ok: false };
    const loc = res.headers.get("location") || "";
    url = loc.startsWith("http") ? loc : `https://platformazakupowa.pl${loc}`;
  }
  return { html: "", ok: false };
}

function parseFileLinks(html) {
  return [...html.matchAll(/href=["']([^"']*\/file\/get_new\/[a-f0-9]+\.[a-z0-9]+)["']/gi)].map((m) => m[1]);
}

// --- Unit: helpers ---
assert("transakcja id", extractPlatformazakupowaTransakcjaId(
  "https://platformazakupowa.pl/transakcja/1319989",
) === "1319989");
assert("proceeding url", extractPlatformazakupowaProceedingUrl(
  "https://platformazakupowa.pl/transakcja/1319989",
) === "https://platformazakupowa.pl/transakcja/1319989");

// --- UX: no false login message ---
const emptyPz = {
  id: "t-pz",
  bzpNumber: "2026/BZP 00268513",
  noticeNumber: NOTICE,
  title: "USK remonty",
  organizationName: "USK",
  organizationCity: "Wrocław",
  organizationProvince: "PL02",
  cpvCode: "",
  publicationDate: "2026-05-29",
  submittingOffersDate: null,
  orderType: "Works",
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
  noticeHtml: `Postępowanie: https://platformazakupowa.pl/transakcja/${TX}`,
  documentsFetchedAt: "2026-06-19",
  bzpDocuments: [],
};
const pzStatus = resolveTenderPlatformDocumentStatus(emptyPz);
assert("pz platform detect", detectTenderDocumentPlatform(emptyPz) === "platformazakupowa");
assert("pz no auth message", !pzStatus.detailLines?.some((l) => /bez logowania/i.test(l)));
assert("pz empty reason", pzStatus.missingReason === "missing_platformazakupowa_empty");
assert("pz CTA", pzStatus.proceedingButtonLabel === "Otwórz postępowanie");
assert("pz proceeding url", pzStatus.proceedingUrl?.includes(`/transakcja/${TX}`));

const withDocs = {
  ...emptyPz,
  bzpDocuments: [{
    index: 1,
    documentId: "platformazakupowa_1",
    filename: "swz.pdf",
    contentType: "application/pdf",
    downloadUrl: `https://platformazakupowa.pl/file/get_new/test.pdf`,
    isSwzHint: true,
    platform: "platformazakupowa",
    sourcePageUrl: `https://platformazakupowa.pl/transakcja/${TX}`,
  }],
};
const okStatus = resolveTenderPlatformDocumentStatus(withDocs);
assert("pz success badge", okStatus.badge?.text === "✓ platformazakupowa.pl");
assert("pz success reason", okStatus.missingReason === "found_platformazakupowa");

// --- Integration: guest session + file links (TP191B) ---
console.log("\n=== LIVE DISCOVERY (transakcja 1319989) ===");
const session = await openGuestSession(TX);
assert("guest session 200", session.ok);
const links = parseFileLinks(session.html);
assert("file/get_new links >= 5", links.length >= 5);
console.log("  links found:", links.length);

if (links[0]) {
  const fileUrl = links[0].startsWith("//") ? `https:${links[0]}` : `https://platformazakupowa.pl${links[0]}`;
  const dl = await fetch(fileUrl, { headers: H, redirect: "follow" });
  const bytes = dl.ok ? (await dl.arrayBuffer()).byteLength : 0;
  assert("first file download", dl.ok && bytes > 1000);
  console.log("  first file bytes:", bytes, dl.headers.get("content-type"));
}

// BZP notice contains transakcja link
const enc = encodeURIComponent(NOTICE);
const htmlRes = await fetch(
  `https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeHtmlBody?noticeNumber=${enc}`,
  { headers: { Accept: "application/json", "User-Agent": "WGDOM" } },
);
const raw = await htmlRes.text();
const noticeHtml = raw.startsWith('"') ? JSON.parse(raw) : raw;
assert("BZP notice has transakcja", extractPlatformazakupowaTransakcjaId(noticeHtml) === TX);
assert("BZP §3.2 unrestricted", /zastrzega dost[eę]p do dokument[^<]*<[^>]*>Nie/i.test(noticeHtml));

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);

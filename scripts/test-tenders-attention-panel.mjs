/**
 * P2-D.3 — testy tenders-attention.
 * npx vite-node scripts/test-tenders-attention-panel.mjs
 */
import {
  buildTenderAttentionItems,
  TENDER_ATTENTION_MAX,
} from "../src/lib/tenders-attention.ts";

const now = new Date("2026-06-12T12:00:00.000Z");

function item(overrides) {
  return {
    id: overrides.id ?? "t1",
    bzpNumber: overrides.bzpNumber ?? "2026/BZP 00000001",
    noticeNumber: "2026/BZP 00000001/01",
    title: overrides.title ?? "Remont budynku szkoły",
    organizationName: "Test",
    organizationCity: "Wrocław",
    organizationProvince: "PL02",
    cpvCode: "",
    publicationDate: "2026-06-01",
    submittingOffersDate: overrides.submittingOffersDate ?? "2026-06-20T10:00:00.000Z",
    orderType: "",
    tenderId: "ocds-1",
    moIdentifier: "",
    status: overrides.status ?? "preparing",
    notes: "",
    relevanceScore: 50,
    matchedKeywords: [],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: "",
    updatedAt: "",
    ezamowieniaUrl: "https://ezamowienia.gov.pl/",
    changeMonitor: overrides.changeMonitor,
    qaMonitor: overrides.qaMonitor,
  };
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// deadline today (same calendar day, still open)
const todayDeadline = new Date(now);
todayDeadline.setUTCHours(18, 0, 0, 0);
const todayItems = buildTenderAttentionItems([
  item({ submittingOffersDate: todayDeadline.toISOString() }),
], { now });
assert("deadline today", todayItems.some((r) => r.reasons.includes("DEADLINE_SOON") && r.deadlineDays === 0));

// deadline tomorrow
const tomorrow = new Date(now);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
tomorrow.setUTCHours(18, 0, 0, 0);
const tomorrowItems = buildTenderAttentionItems([
  item({ id: "t2", submittingOffersDate: tomorrow.toISOString() }),
], { now });
assert("deadline tomorrow", tomorrowItems.some((r) => r.deadlineDays === 1));

// deadline in 3 days
const in3 = new Date(now);
in3.setUTCDate(in3.getUTCDate() + 3);
in3.setUTCHours(18, 0, 0, 0);
const in3Items = buildTenderAttentionItems([
  item({ id: "t3", submittingOffersDate: in3.toISOString() }),
], { now });
assert("deadline in 3 days", in3Items.some((r) => r.deadlineDays === 3));

// new document
const docItems = buildTenderAttentionItems([
  item({
    submittingOffersDate: "2026-12-01T10:00:00.000Z",
    changeMonitor: {
      snapshot: null,
      lastCheckedAt: null,
      unseenCount: 1,
      events: [{
        id: "e1",
        type: "NEW_DOCUMENT",
        at: "2026-06-12T08:00:00.000Z",
        tenderItemId: "t1",
        tenderTitle: "x",
        bzpNumber: "b",
        summary: "+1",
      }],
    },
  }),
], { now });
assert("new document", docItems.some((r) => r.reasons.includes("NEW_DOCUMENT")));

// new qa
const qaItems = buildTenderAttentionItems([
  item({
    submittingOffersDate: "2026-12-01T10:00:00.000Z",
    qaMonitor: {
      snapshot: null,
      lastCheckedAt: null,
      unseenCount: 1,
      events: [{
        id: "q1",
        type: "QA_BATCH",
        at: "2026-06-12T09:00:00.000Z",
        tenderItemId: "t1",
        tenderTitle: "x",
        bzpNumber: "b",
        summary: "3",
        count: 3,
      }],
    },
  }),
], { now });
assert("new qa", qaItems.some((r) => r.newQaCount === 3));

// deadline changed
const dlChange = buildTenderAttentionItems([
  item({
    submittingOffersDate: "2026-07-18T10:00:00.000Z",
    changeMonitor: {
      snapshot: null,
      lastCheckedAt: null,
      unseenCount: 1,
      events: [{
        id: "d1",
        type: "DEADLINE_CHANGED",
        at: "2026-06-11T10:00:00.000Z",
        tenderItemId: "t1",
        tenderTitle: "Modernizacja DPS",
        bzpNumber: "b",
        summary: "Termin przesunięty",
        details: "2026-07-18T10:00:00.000Z",
      }],
    },
  }),
], { now });
assert("deadline changed", dlChange.some((r) => r.reasons.includes("DEADLINE_CHANGED")));

// sort order: today before tomorrow before doc-only
const sorted = buildTenderAttentionItems([
  item({
    id: "doc-only",
    title: "Z doc",
    submittingOffersDate: "2026-12-01T10:00:00.000Z",
    changeMonitor: {
      snapshot: null,
      lastCheckedAt: null,
      unseenCount: 0,
      events: [{
        id: "e2",
        type: "NEW_DOCUMENT",
        at: "2026-06-12T08:00:00.000Z",
        tenderItemId: "doc-only",
        tenderTitle: "Z doc",
        bzpNumber: "b",
        summary: "+1",
      }],
    },
  }),
  item({
    id: "tomorrow-id",
    title: "Jutro",
    submittingOffersDate: tomorrow.toISOString(),
  }),
  item({
    id: "today-id",
    title: "Dziś",
    submittingOffersDate: todayDeadline.toISOString(),
  }),
], { now });
assert("sort order today first", sorted[0]?.tenderItemId === "today-id");
assert("sort order tomorrow second", sorted[1]?.tenderItemId === "tomorrow-id");

// max 10
const many = buildTenderAttentionItems(
  Array.from({ length: 15 }, (_, i) => item({
    id: `m${i}`,
    title: `Przetarg ${i}`,
    submittingOffersDate: todayDeadline.toISOString(),
  })),
  { now },
);
assert("max 10 results", many.length === TENDER_ATTENTION_MAX);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);

/**
 * Audit Hub MVP-0A — adaptery, sort, filtry, paginacja
 * Uruchom: npx vite-node scripts/test-audit-hub-adapters.mjs
 */
import {
  adaptDeliveryPackagePublications,
  adaptInspectorLoginEvents,
  adaptJobActivityLog,
  adaptOperationalNotesAudit,
  adaptSecurityAuditLog,
  adaptWmPrintHistory,
  buildAuditFeed,
  countAuditFeedBySource,
  dedupeAuditFeed,
  sortAuditFeed,
} from "../src/lib/audit-hub/adapters.ts";
import {
  AUDIT_HUB_PAGE_SIZE,
  EMPTY_AUDIT_HUB_FILTERS,
  collectAuditHubFilterOptions,
  filterAuditFeed,
  paginateAuditFeed,
} from "../src/lib/audit-hub/filters.ts";
import { auditFeedItemId } from "../src/lib/audit-hub/types.ts";
import { buildOperationalNoteAuditEntry } from "../src/lib/operational-notes-audit.ts";
import { buildSecurityAuditEntry, normalizeSecurityAuditLog } from "../src/lib/security-audit-log.ts";

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

const jobA = {
  id: "job-a",
  address: "Szarzyńskiego",
  flatNumber: "7",
  client: "WM",
  activityLog: [
    {
      id: "act-1",
      at: "2026-06-20T12:00:00.000Z",
      actor: "Jan K.",
      type: "photo_upload",
      text: "Wgrano zdjęcie: lazienka.jpg",
    },
  ],
};

const noteAudit = buildOperationalNoteAuditEntry({
  action: "create",
  userId: "dawid",
  displayName: "Dawid",
  role: "super_admin",
  noteId: "note-1",
  noteTitleSnapshot: "Procedura WM",
  at: "2026-06-22T10:00:00.000Z",
});

const inspectorLogin = {
  id: "insp-ev-1",
  userId: "szymon",
  displayName: "Szymon",
  type: "login",
  at: "2026-06-22T09:00:00.000Z",
};

const inspectorVisit = {
  id: "insp-ev-2",
  userId: "szymon",
  displayName: "Szymon",
  type: "visit",
  at: "2026-06-22T08:00:00.000Z",
};

const wmEntry = {
  id: "wm-1",
  timestamp: "2026-06-21T15:00:00.000Z",
  userId: "dawid",
  userName: "Dawid",
  templateId: "tpl-zi",
  templateName: "ZI Tauron 2026",
  outputType: "pdf",
  jobId: "job-a",
  jobName: "Szarzyńskiego 83 m.7",
};

const deliveryPub = {
  id: "pub-1",
  jobId: "job-a",
  zipVersion: 3,
  publishedAt: "2026-06-21T14:00:00.000Z",
  publishedByUserId: "dawid",
  publishedByUserName: "Dawid",
  generationFingerprint: "abc",
  fingerprintPayload: {
    schemaVersion: 1,
    jobId: "job-a",
    selectedTemplateIds: [],
    includeMeasurements: false,
    measurementId: null,
    measurementUpdatedAt: null,
    measurementReportNumber: null,
    dateMode: "today",
    customDateIso: null,
    jobVariableDigest: "x",
    checklistDigest: "y",
    wmJobDocDigests: [],
    templateFileDigests: [],
    settingsDigest: "z",
  },
  storagePath: "path",
  zipPublicUrl: "https://example.com/z.zip",
  fileName: "pakiet.zip",
  fileSizeBytes: 1024,
  fileCount: 12,
  odbiorFileCount: 10,
  pomiaryFileCount: 2,
  includesMeasurements: true,
  manifest: [],
  status: "ACTIVE",
  createdAt: "2026-06-21T14:00:00.000Z",
  updatedAt: "2026-06-21T14:00:00.000Z",
};

console.log("Audit Hub MVP-0A — test-audit-hub-adapters\n");

// T1 — pusty feed
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [],
    inspectorLoginEvents: [],
    jobs: [],
    wmPrintHistory: [],
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  assert(feed.length === 0, "T1 buildAuditFeed — pusty input → []");
}

// T2 — sort DESC po at
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit],
    inspectorLoginEvents: [inspectorLogin],
    jobs: [jobA],
    wmPrintHistory: [wmEntry],
    deliveryPackagePublications: [deliveryPub],
    securityAuditLog: [],
  });
  assert(feed.length === 5, "T2 buildAuditFeed — 5 wpisów (po 1 na źródło)");
  for (let i = 1; i < feed.length; i++) {
    assert(feed[i - 1].at >= feed[i].at, `T2 sort DESC — ${feed[i - 1].id} >= ${feed[i].id}`);
  }
  assert(feed[0].source === "operational_notes", "T2 najnowszy — notatki operacyjne");
}

// T3 — adapter notatek
{
  const [item] = adaptOperationalNotesAudit([noteAudit]);
  assert(item.id === auditFeedItemId("operational_notes", noteAudit.id), "T3 operational_notes id");
  assert(item.action === "create", "T3 action create");
  assert(item.actorUserId === "dawid", "T3 actorUserId");
  assert(item.noteId === "note-1", "T3 noteId");
  assert(item.deepLink.kind === "operational_note", "T3 deepLink operational_note");
}

// T4 — adapter inspektor login vs visit
{
  const items = adaptInspectorLoginEvents([inspectorLogin, inspectorVisit]);
  assert(items.length === 2, "T4 inspector — 2 wpisy");
  assert(items.some((i) => i.action === "login" && i.actionLabel === "Logowanie"), "T4 login label");
  assert(items.some((i) => i.action === "visit" && i.actionLabel === "Wejście"), "T4 visit label");
  assert(items.every((i) => i.deepLink.kind === "inspector_view"), "T4 deepLink inspector_view");
}

// T5 — adapter job activity
{
  const [item] = adaptJobActivityLog([jobA]);
  assert(item.source === "job_activity", "T5 source job_activity");
  assert(item.jobId === "job-a", "T5 jobId");
  assert(item.jobLabel === "Szarzyńskiego m.7", "T5 jobLabel");
  assert(item.deepLink.kind === "job" && item.deepLink.section === "photos", "T5 deepLink photos");
}

// T6 — adapter WM print
{
  const [item] = adaptWmPrintHistory([wmEntry]);
  assert(item.source === "wm_print", "T6 source wm_print");
  assert(item.action === "pdf", "T6 action pdf");
  assert(item.deepLink.kind === "wm_print" && item.deepLink.tab === "historia", "T6 deepLink historia");
}

// T7 — adapter delivery package
{
  const [item] = adaptDeliveryPackagePublications([deliveryPub], [jobA]);
  assert(item.source === "delivery_package", "T7 source delivery_package");
  assert(item.action === "ACTIVE", "T7 action ACTIVE");
  assert(item.actionLabel === "Publikacja", "T7 actionLabel Publikacja");
  assert(item.deepLink.kind === "wm_print" && item.deepLink.tab === "odbiory", "T7 deepLink odbiory");
}

// T8 — filtr source operational_notes
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit],
    inspectorLoginEvents: [inspectorLogin],
    jobs: [jobA],
    wmPrintHistory: [],
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  const filtered = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, source: "operational_notes" });
  assert(filtered.length === 1 && filtered[0].source === "operational_notes", "T8 filter source operational_notes");
}

// T9 — filtr source inspector_login
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [],
    inspectorLoginEvents: [inspectorLogin, inspectorVisit],
    jobs: [],
    wmPrintHistory: [],
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  const filtered = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, source: "inspector_login" });
  assert(filtered.length === 2, "T9 filter source inspector_login — 2 wpisy");
}

// T10 — filtr actor po userId
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit],
    inspectorLoginEvents: [inspectorLogin],
    jobs: [],
    wmPrintHistory: [],
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  const filtered = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, actor: "dawid" });
  assert(filtered.length === 1 && filtered[0].actorUserId === "dawid", "T10 filter actor userId dawid");
}

// T11 — filtr actor po displayName (job activity bez userId)
{
  const feed = adaptJobActivityLog([jobA]);
  const filtered = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, actor: "Jan K." });
  assert(filtered.length === 1 && filtered[0].actor === "Jan K.", "T11 filter actor displayName Jan K.");
}

// T12 — search
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit],
    inspectorLoginEvents: [],
    jobs: [jobA],
    wmPrintHistory: [],
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  const hit = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, search: "lazienka" });
  const miss = filterAuditFeed(feed, { ...EMPTY_AUDIT_HUB_FILTERS, search: "nieistniejący" });
  assert(hit.length === 1 && hit[0].source === "job_activity", "T12 search — trafia job activity");
  assert(miss.length === 0, "T12 search — brak wyniku");
}

// T13 — paginacja strona 1
{
  const items = Array.from({ length: 75 }, (_, i) => ({
    id: `job_activity:job:x-${i}`,
    at: `2026-06-${String(20 - Math.floor(i / 10)).padStart(2, "0")}T12:00:00.000Z`,
    source: "job_activity",
    action: "note",
    actionLabel: "Notatka",
    actor: "A",
    summary: `Wpis ${i}`,
    nativeId: `job:x-${i}`,
    deepLink: { kind: "none" },
  }));
  const page1 = paginateAuditFeed(items, 1, AUDIT_HUB_PAGE_SIZE);
  assert(page1.items.length === 50, "T13 paginate page1 — 50 wpisów");
  assert(page1.total === 75 && page1.totalPages === 2, "T13 paginate total 75 / 2 strony");
}

// T14 — paginacja strona 2
{
  const items = Array.from({ length: 75 }, (_, i) => ({
    id: `wm_print:wm-${i}`,
    at: `2026-06-01T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
    source: "wm_print",
    action: "pdf",
    actionLabel: "PDF",
    actor: "Dawid",
    summary: `Doc ${i}`,
    nativeId: `wm-${i}`,
    deepLink: { kind: "none" },
  }));
  const page2 = paginateAuditFeed(items, 2, AUDIT_HUB_PAGE_SIZE);
  assert(page2.items.length === 25, "T14 paginate page2 — 25 wpisów");
  assert(page2.page === 2, "T14 paginate page number 2");
}

// T15 — duplicate ids w dedupeAuditFeed
{
  const dup = adaptOperationalNotesAudit([noteAudit]);
  const merged = dedupeAuditFeed([...dup, ...dup, ...dup]);
  assert(merged.length === 1, "T15 dedupe — 3× ten sam id → 1 wpis");
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit, noteAudit],
    inspectorLoginEvents: [],
    jobs: [],
    wmPrintHistory: [],
    deliveryPackagePublications: [],
    securityAuditLog: [],
  });
  assert(feed.length === 1, "T15 buildAuditFeed — duplikat note audit id → 1 wpis");
}

// Sanity — countBySource + filter options
{
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit],
    inspectorLoginEvents: [inspectorLogin, inspectorVisit],
    jobs: [jobA],
    wmPrintHistory: [wmEntry],
    deliveryPackagePublications: [deliveryPub],
    securityAuditLog: [],
  });
  const counts = countAuditFeedBySource(feed);
  assert(counts.operational_notes === 1, "counts operational_notes");
  assert(counts.inspector_login === 2, "counts inspector_login");
  assert(counts.job_activity === 1, "counts job_activity");
  assert(counts.wm_print === 1, "counts wm_print");
  assert(counts.delivery_package === 1, "counts delivery_package");
  assert(counts.security_log === 0, "counts security_log");
  const opts = collectAuditHubFilterOptions(feed);
  assert(opts.actors.length >= 3, "collectAuditHubFilterOptions — actors");
  assert(opts.sources.length === 6, "collectAuditHubFilterOptions — 6 sources");
}

// T16 — adapter security_log
{
  const sec = buildSecurityAuditEntry({
    actor: "Dawid",
    actorUserId: "dawid",
    category: "AUTH",
    action: "admin_login_success",
    severity: "info",
    summary: "Logowanie: Dawid",
    at: "2026-06-23T08:00:00.000Z",
  });
  const [item] = adaptSecurityAuditLog([sec]);
  assert(item.id === auditFeedItemId("security_log", sec.id), "T16 security_log id");
  assert(item.source === "security_log", "T16 source security_log");
  assert(item.actor === "Dawid", "T16 actor");
  assert(item.severity === "info", "T16 severity");
  assert(item.deepLink.kind === "none", "T16 deepLink none");
}

// T17 — security_log legacy empty actor/at
{
  const legacy = {
    id: "legacy-sec",
    action: "admin_login_failed",
    category: "AUTH",
    severity: "warn",
    summary: "Nieudane logowanie",
  };
  const [item] = adaptSecurityAuditLog(normalizeSecurityAuditLog([legacy]));
  assert(item.actor === "Administrator", "T17 legacy empty actor → Administrator");
  assert(item.at === "" || typeof item.at === "string", "T17 legacy at string");
}

// T18 — buildAuditFeed 6 sources
{
  const sec = buildSecurityAuditEntry({
    actor: "Dawid",
    category: "DATA",
    action: "job_delete",
    severity: "high",
    summary: "Usunięto robotę",
    at: "2026-06-23T12:00:00.000Z",
  });
  const feed = buildAuditFeed({
    operationalNotesAuditLog: [noteAudit],
    inspectorLoginEvents: [inspectorLogin],
    jobs: [jobA],
    wmPrintHistory: [wmEntry],
    deliveryPackagePublications: [deliveryPub],
    securityAuditLog: [sec],
  });
  assert(feed.length === 6, "T18 buildAuditFeed — 6 wpisów (6 źródeł)");
  const counts = countAuditFeedBySource(feed);
  assert(counts.security_log === 1, "T18 counts security_log");
}

// sortAuditFeed tie-breaker id
{
  const a = {
    id: "job_activity:a",
    at: "2026-06-22T10:00:00.000Z",
    source: "job_activity",
    action: "note",
    actionLabel: "Notatka",
    actor: "X",
    summary: "A",
    nativeId: "a",
    deepLink: { kind: "none" },
  };
  const b = { ...a, id: "job_activity:b", nativeId: "b", summary: "B" };
  const sorted = sortAuditFeed([b, a]);
  assert(sorted[0].id === "job_activity:a", "sortAuditFeed tie-breaker id ASC przy tym samym at");
}

console.log(`\n--- ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);

// Raport rozmiaru feedu (fixture pełny)
const sampleFeed = buildAuditFeed({
  operationalNotesAuditLog: [noteAudit],
  inspectorLoginEvents: [inspectorLogin, inspectorVisit],
  jobs: [jobA],
  wmPrintHistory: [wmEntry],
  deliveryPackagePublications: [deliveryPub],
  securityAuditLog: [],
});
const sampleCounts = countAuditFeedBySource(sampleFeed);
console.log("\nSample feed counts:", JSON.stringify(sampleCounts));
console.log("Sample feed total:", sampleFeed.length);
console.log("Estimated JSON size (bytes):", JSON.stringify(sampleFeed).length);

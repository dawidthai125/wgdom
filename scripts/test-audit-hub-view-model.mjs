/**
 * Audit Hub MVP-0B — view model, filtry, KPI, deep linki
 * Uruchom: npx vite-node scripts/test-audit-hub-view-model.mjs
 */
import { buildOperationalNoteAuditEntry } from "../src/lib/operational-notes-audit.ts";
import { buildAuditHubViewModel } from "../src/lib/audit-hub/view-model.ts";
import { EMPTY_AUDIT_HUB_FILTERS } from "../src/lib/audit-hub/filters.ts";
import {
  auditHubDeepLinkLabel,
  resolveAuditHubNavigation,
} from "../src/lib/audit-hub/deeplink.ts";

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
    {
      id: "act-2",
      at: "2026-06-19T11:00:00.000Z",
      actor: "Dawid",
      type: "note",
      text: "Notatka robocza",
    },
  ],
};

const noteAudit = buildOperationalNoteAuditEntry({
  action: "ack",
  userId: "dawid",
  displayName: "Dawid",
  role: "super_admin",
  noteId: "note-1",
  noteTitleSnapshot: "Procedura WM",
  detail: "Potwierdził wersję 2",
  at: "2026-06-22T10:00:00.000Z",
});

const hubInput = {
  operationalNotesAuditLog: [noteAudit],
  inspectorLoginEvents: [
    {
      id: "insp-1",
      userId: "szymon",
      displayName: "Szymon",
      type: "login",
      at: "2026-06-22T09:00:00.000Z",
    },
  ],
  jobs: [jobA],
  wmPrintHistory: [
    {
      id: "wm-1",
      timestamp: "2026-06-21T15:00:00.000Z",
      userId: "dawid",
      userName: "Dawid",
      templateId: "tpl",
      templateName: "ZI",
      outputType: "pdf",
      jobId: "job-a",
      jobName: "Szarzyńskiego m.7",
    },
  ],
  deliveryPackagePublications: [
    {
      id: "pub-1",
      jobId: "job-a",
      zipVersion: 2,
      publishedAt: "2026-06-21T14:00:00.000Z",
      publishedByUserId: "dawid",
      publishedByUserName: "Dawid",
      generationFingerprint: "fp",
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
      storagePath: "p",
      zipPublicUrl: "https://x",
      fileName: "pakiet.zip",
      fileSizeBytes: 100,
      fileCount: 5,
      odbiorFileCount: 4,
      pomiaryFileCount: 1,
      includesMeasurements: true,
      manifest: [],
      status: "ACTIVE",
      createdAt: "2026-06-21T14:00:00.000Z",
      updatedAt: "2026-06-21T14:00:00.000Z",
    },
  ],
};

console.log("Audit Hub MVP-0B — test-audit-hub-view-model\n");

// source filter
{
  const all = buildAuditHubViewModel(hubInput, EMPTY_AUDIT_HUB_FILTERS, 1);
  const notesOnly = buildAuditHubViewModel(hubInput, { ...EMPTY_AUDIT_HUB_FILTERS, source: "operational_notes" }, 1);
  assert(all.kpi.total === 6, "view-model total 6 wpisów");
  assert(notesOnly.filtered.length === 1 && notesOnly.filtered[0].source === "operational_notes", "source filter operational_notes");
  assert(all.kpi.bySource.job_activity === 2, "KPI job_activity = 2");
  assert(all.kpi.bySource.inspector_login === 1, "KPI inspector_login = 1");
}

// actor filter
{
  const byUserId = buildAuditHubViewModel(hubInput, { ...EMPTY_AUDIT_HUB_FILTERS, actor: "dawid" }, 1);
  const byName = buildAuditHubViewModel(hubInput, { ...EMPTY_AUDIT_HUB_FILTERS, actor: "Jan K." }, 1);
  assert(byUserId.filtered.length === 3, "actor filter userId dawid — 3 wpisy");
  assert(byName.filtered.length === 1 && byName.filtered[0].actor === "Jan K.", "actor filter displayName Jan K.");
}

// search
{
  const hit = buildAuditHubViewModel(hubInput, { ...EMPTY_AUDIT_HUB_FILTERS, search: "lazienka" }, 1);
  const miss = buildAuditHubViewModel(hubInput, { ...EMPTY_AUDIT_HUB_FILTERS, search: "brak-tresci" }, 1);
  assert(hit.filtered.length === 1 && hit.filtered[0].source === "job_activity", "search lazienka");
  assert(miss.filtered.length === 0, "search brak wyniku");
}

// pagination
{
  const manyJobs = {
    ...jobA,
    activityLog: Array.from({ length: 55 }, (_, i) => ({
      id: `act-${i}`,
      at: `2026-06-${String(10 + (i % 10)).padStart(2, "0")}T12:00:00.000Z`,
      actor: "A",
      type: "note",
      text: `Wpis ${i}`,
    })),
  };
  const bigInput = { ...hubInput, jobs: [manyJobs] };
  const page1 = buildAuditHubViewModel(bigInput, EMPTY_AUDIT_HUB_FILTERS, 1);
  const page2 = buildAuditHubViewModel(bigInput, EMPTY_AUDIT_HUB_FILTERS, 2);
  assert(page1.paged.items.length === 50, "pagination page1 — 50");
  assert(page2.paged.items.length > 0 && page2.paged.page === 2, "pagination page2");
  assert(page1.kpi.filteredTotal === page1.paged.total, "KPI filteredTotal = paged.total");
}

// KPI counts per source
{
  const model = buildAuditHubViewModel(hubInput, EMPTY_AUDIT_HUB_FILTERS, 1);
  assert(model.kpi.bySource.operational_notes === 1, "KPI operational_notes");
  assert(model.kpi.bySource.wm_print === 1, "KPI wm_print");
  assert(model.kpi.bySource.delivery_package === 1, "KPI delivery_package");
  assert(
    model.kpi.total
      === model.kpi.bySource.operational_notes
      + model.kpi.bySource.inspector_login
      + model.kpi.bySource.job_activity
      + model.kpi.bySource.wm_print
      + model.kpi.bySource.delivery_package,
    "KPI total = suma per source",
  );
}

// deep links — wszystkie 5 źródeł
{
  const model = buildAuditHubViewModel(hubInput, EMPTY_AUDIT_HUB_FILTERS, 1);
  const bySource = Object.fromEntries(
    model.feed.map((item) => [item.source, item.deepLink]),
  );

  const noteNav = resolveAuditHubNavigation(bySource.operational_notes);
  assert(noteNav?.view === "operationalnotes" && noteNav.noteId === "note-1", "deep link operational_notes");

  const inspNav = resolveAuditHubNavigation(bySource.inspector_login);
  assert(inspNav?.view === "inspector", "deep link inspector_login");

  const jobItem = model.feed.find((i) => i.source === "job_activity" && i.action === "photo_upload");
  const jobNav = jobItem ? resolveAuditHubNavigation(jobItem.deepLink) : null;
  assert(jobNav?.view === "jobs" && jobNav.section === "photos", "deep link job_activity → photos");

  const wmNav = resolveAuditHubNavigation(bySource.wm_print);
  assert(wmNav?.view === "wmprint" && wmNav.tab === "historia", "deep link wm_print");

  const delNav = resolveAuditHubNavigation(bySource.delivery_package);
  assert(delNav?.view === "wmprint" && delNav.tab === "odbiory", "deep link delivery_package");

  const labels = [
    bySource.operational_notes,
    bySource.inspector_login,
    jobItem?.deepLink,
    bySource.wm_print,
    bySource.delivery_package,
  ];
  assert(labels.every((dl) => dl && auditHubDeepLinkLabel(dl)), "deep link labels — wszystkie 5");
}

// sort DESC w view model feed
{
  const model = buildAuditHubViewModel(hubInput, EMPTY_AUDIT_HUB_FILTERS, 1);
  let sorted = true;
  for (let i = 1; i < model.feed.length; i++) {
    if (model.feed[i - 1].at < model.feed[i].at) sorted = false;
  }
  assert(sorted, "feed sort DESC");
}

console.log(`\n--- ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);

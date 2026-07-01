/**
 * INSPECTOR-JOB-ASSIGN-001 — smoke (#001–#012)
 * Run: npx vite-node scripts/smoke-test-inspector-job-assignment.mjs
 */
import { normalizeJob } from "../src/app/app-domain.ts";
import {
  filterJobsForInspector,
  mergeAssignedInspectorId,
  validateJobAssignedInspectorForSave,
  applyLegacyInspectorMigration,
  isJobVisibleToInspector,
  MIGRATION_LEGACY_INSPECTOR_ID,
} from "../src/lib/inspector-job-assignment.ts";
import {
  filterOperationalNotesForInspectorActive,
  operationalNoteVisibleToInspector,
} from "../src/lib/operational-notes.ts";
import { countUnreadOperationalNotes } from "../src/lib/operational-notes-read-state.ts";
import { mergeJobsById } from "../src/lib/cloud-sync.ts";

const szymonSession = { id: "szymon", login: "Szymon", displayName: "Szymon Szóstak", role: "inspector" };
const otherSession = { id: "other-insp", login: "Other", displayName: "Other", role: "inspector" };

function baseJob(overrides = {}) {
  return normalizeJob({
    id: "j1",
    address: "ul. Test 1",
    flatNumber: "1",
    client: "Wrocławskie Mieszkania",
    startDate: "2026-01-01",
    endDate: "",
    status: "in_progress",
    keysHandedOver: false,
    notes: "",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    assignedInspectorId: "szymon",
    ...overrides,
  });
}

const results = [];
function check(name, pass) {
  results.push({ name, pass });
  if (!pass) console.error(`FAIL: ${name}`);
}

// #003 filter
const jobs = [
  baseJob({ id: "a", assignedInspectorId: "szymon" }),
  baseJob({ id: "b", assignedInspectorId: "other-insp" }),
  baseJob({ id: "c", assignedInspectorId: undefined }),
];
const visible = filterJobsForInspector(jobs, "szymon");
check("filterJobsForInspector — tylko szymon", visible.length === 1 && visible[0].id === "a");
check("isJobVisibleToInspector fail-closed", !isJobVisibleToInspector(baseJob({ assignedInspectorId: undefined }), "szymon"));

// #008 migration
const legacy = applyLegacyInspectorMigration([
  baseJob({ id: "l1", assignedInspectorId: undefined }),
  baseJob({ id: "l2", assignedInspectorId: "szymon" }),
]);
check("migration — 1 legacy", legacy.migrated === 1);
check("migration — id szymon", legacy.jobs[0].assignedInspectorId === MIGRATION_LEGACY_INSPECTOR_ID);

// #009 validation
check("validate missing", validateJobAssignedInspectorForSave(baseJob({ assignedInspectorId: undefined })).ok === false);
check("validate orphan", validateJobAssignedInspectorForSave(baseJob({ assignedInspectorId: "deleted-user" })).ok === false);
check("validate ok", validateJobAssignedInspectorForSave(baseJob()).ok === true);

// merge
check("mergeAssignedInspectorId preferB", mergeAssignedInspectorId("a", "b", true) === "b");
check("merge cloud-sync jobs", (() => {
  const merged = mergeJobsById(
    [baseJob({ assignedInspectorId: "szymon", updatedAt: "2026-01-01T00:00:00.000Z" })],
    [baseJob({ assignedInspectorId: "other-insp", updatedAt: "2026-06-01T00:00:00.000Z" })],
  );
  return merged[0]?.assignedInspectorId === "other-insp";
})());

// #011 operational notes
const visibleIds = new Set(["a"]);
const notes = [
  {
    id: "n1",
    title: "Shared no link",
    content: "x",
    status: "active",
    authorUserId: "dawid",
    authorDisplayName: "Dawid",
    authorRole: "super_admin",
    shareWithInspector: true,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    lastActivityAt: "2026-06-01",
    comments: [],
  },
  {
    id: "n2",
    title: "Linked other job",
    content: "x",
    status: "active",
    authorUserId: "dawid",
    authorDisplayName: "Dawid",
    authorRole: "super_admin",
    shareWithInspector: true,
    linkedJobId: "b",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    lastActivityAt: "2026-06-01",
    comments: [],
  },
  {
    id: "n3",
    title: "Linked my job",
    content: "x",
    status: "active",
    authorUserId: "dawid",
    authorDisplayName: "Dawid",
    authorRole: "super_admin",
    shareWithInspector: true,
    linkedJobId: "a",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    lastActivityAt: "2026-06-01",
    comments: [],
  },
];
const filteredNotes = filterOperationalNotesForInspectorActive(notes, szymonSession, { visibleJobIds: visibleIds });
check("#011 — ukryj linkedJobId cudzej roboty", filteredNotes.length === 2 && !filteredNotes.some((n) => n.id === "n2"));
check("#011 — deep link guard helper", !operationalNoteVisibleToInspector(notes[1], szymonSession, visibleIds));
check("#011 — badge count", countUnreadOperationalNotes(notes, [], szymonSession, { visibleJobIds: visibleIds }) === 2);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  process.exit(1);
}
console.log("ALL PASS");

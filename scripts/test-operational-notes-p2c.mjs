/**
 * P2C — Notatki operacyjne — Audit UI (lib smoke)
 * Uruchom: npx vite-node scripts/test-operational-notes-p2c.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  OPERATIONAL_NOTE_AUDIT_ACTIONS,
  OPERATIONAL_NOTES_AUDIT_PAGE_SIZE,
  canAccessOperationalNotesAudit,
  filterOperationalNotesAuditLog,
  paginateOperationalNotesAuditLog,
  EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS,
} from "../src/lib/operational-notes-audit-filters.ts";
import {
  buildOperationalNoteAuditEntry,
  normalizeOperationalNotesAuditLog,
  appendOperationalNotesAuditLog,
} from "../src/lib/operational-notes-audit.ts";
import {
  createOperationalNote,
  updateOperationalNoteContent,
  addOperationalNoteComment,
  archiveOperationalNote,
  restoreOperationalNote,
  setOperationalNoteShare,
  setOperationalNoteJobLink,
  deleteOperationalNoteLogical,
  mergeOperationalNotes,
} from "../src/lib/operational-notes.ts";
import {
  ackOperationalNoteWithAudit,
  countUnreadOperationalNotes,
  mergeOperationalNotesReadState,
} from "../src/lib/operational-notes-read-state.ts";
import { computeOperationalNotesDashboardSummary } from "../src/lib/operational-notes-dashboard.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const superAdmin = { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" };
const admin = { id: "stan", login: "Stanislaw", displayName: "Stanisław", role: "admin" };
const mod = { id: "pawel", login: "Pawel", displayName: "Paweł", role: "moderator" };
const inspector = { id: "szymon", login: "Szymon", displayName: "Szymon", role: "inspector" };

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

function baseNote(overrides = {}) {
  return {
    id: "n1",
    title: "Procedura WM",
    content: "Treść",
    authorUserId: "dawid",
    authorDisplayName: "Dawid",
    authorRole: "super_admin",
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    lastActivityAt: "2026-06-10T10:00:00.000Z",
    lastActivityByUserId: "dawid",
    status: "active",
    shareWithInspector: false,
    contentRev: 1,
    comments: [],
    revisions: [],
    ...overrides,
  };
}

function seedAuditLog() {
  let notes = [];
  let log = [];
  const push = (result) => {
    notes = result.notes;
    log = appendOperationalNotesAuditLog(log, result.auditEntries);
  };
  push(createOperationalNote({ notes, session: superAdmin, title: "Procedura WM", content: "A" }));
  const note = notes[0];
  push(updateOperationalNoteContent({ notes, session: superAdmin, noteId: note.id, title: "Procedura WM", content: "B" }));
  push(addOperationalNoteComment({ notes, session: mod, noteId: note.id, text: "Przyjąłem do wiadomości" }));
  push(archiveOperationalNote({ notes, session: superAdmin, noteId: note.id }));
  push(restoreOperationalNote({ notes, session: superAdmin, noteId: note.id }));
  push(setOperationalNoteShare({ notes, session: superAdmin, noteId: note.id, shareWithInspector: true }));
  push(setOperationalNoteJobLink({
    notes,
    session: superAdmin,
    noteId: note.id,
    linkedJobId: "job-1",
    linkedJobNameSnapshot: "Zmiana grzejników",
  }));
  const acked = ackOperationalNoteWithAudit([], log, notes[0], mod);
  log = acked.auditLog;
  const del = deleteOperationalNoteLogical({ notes, session: superAdmin, noteId: note.id });
  log = appendOperationalNotesAuditLog(log, del.auditEntries);
  return log;
}

console.log("=== P2C-T01 Audit action ACK istnieje ===");
assert(OPERATIONAL_NOTE_AUDIT_ACTIONS.includes("ack"), "P2C-T01 ack w enum actions");
const ackParsed = normalizeOperationalNotesAuditLog([
  buildOperationalNoteAuditEntry({
    action: "ack",
    userId: "pawel",
    displayName: "Paweł",
    role: "moderator",
    noteId: "n1",
    noteTitleSnapshot: "Test",
    detail: "Potwierdził wersję 4",
  }),
]);
assert(ackParsed.length === 1 && ackParsed[0]?.action === "ack", "P2C-T01 ack parse OK");

console.log("\n=== P2C-T02 ACK zapisuje audit ===");
const note = baseNote({ contentRev: 4, title: "Zmiana grzejników" });
const ackResult = ackOperationalNoteWithAudit([], [], note, mod);
assert(ackResult.auditLog.length === 1, "P2C-T02 jeden wpis audit");
assert(ackResult.auditLog[0]?.action === "ack", "P2C-T02 action ack");
assert(ackResult.auditLog[0]?.detail?.includes("4"), "P2C-T02 detail wersja");
assert(ackResult.readState.length === 1, "P2C-T02 read-state zapisany");

console.log("\n=== P2C-T03…T09 akcje widoczne w filtrze ===");
const fullLog = seedAuditLog();
const actionsPresent = new Set(fullLog.map((e) => e.action));
for (const action of [
  "create", "update", "comment", "archive", "restore", "delete", "share_toggle", "job_link_change", "ack",
]) {
  assert(actionsPresent.has(action), `P2C akcja ${action} w logu testowym`);
}

console.log("\n=== P2C-T10 Filtr akcji ===");
const commentOnly = filterOperationalNotesAuditLog(fullLog, {
  ...EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS,
  action: "comment",
});
assert(commentOnly.every((e) => e.action === "comment"), "P2C-T10 tylko comment");
assert(commentOnly.length >= 1, "P2C-T10 ma wpisy");

console.log("\n=== P2C-T11 Filtr użytkownika ===");
const modOnly = filterOperationalNotesAuditLog(fullLog, {
  ...EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS,
  userId: mod.id,
});
assert(modOnly.every((e) => e.userId === mod.id), "P2C-T11 tylko Paweł");
assert(modOnly.some((e) => e.action === "ack" || e.action === "comment"), "P2C-T11 ack/comment Pawła");

console.log("\n=== P2C-T12 Filtr notatki ===");
const noteId = fullLog.find((e) => e.noteId)?.noteId;
const byNote = filterOperationalNotesAuditLog(fullLog, {
  ...EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS,
  noteId: noteId ?? "missing",
});
assert(byNote.every((e) => e.noteId === noteId), "P2C-T12 filtr noteId");

console.log("\n=== P2C-T13 Paginacja ===");
const many = [];
for (let i = 0; i < 120; i++) {
  many.push(
    buildOperationalNoteAuditEntry({
      action: "comment",
      userId: "dawid",
      displayName: "Dawid",
      role: "super_admin",
      at: new Date(2026, 5, 1, 0, 0, i).toISOString(),
      noteId: "n1",
      noteTitleSnapshot: `N${i}`,
      detail: `d${i}`,
    }),
  );
}
const page1 = paginateOperationalNotesAuditLog(many, 1, OPERATIONAL_NOTES_AUDIT_PAGE_SIZE);
const page2 = paginateOperationalNotesAuditLog(many, 2, OPERATIONAL_NOTES_AUDIT_PAGE_SIZE);
assert(page1.items.length === 50, "P2C-T13 strona 1 = 50");
assert(page2.items.length === 50, "P2C-T13 strona 2 = 50");
assert(page1.totalPages === 3, "P2C-T13 totalPages = 3");

console.log("\n=== P2C-T14 Super Admin access ===");
assert(canAccessOperationalNotesAudit(superAdmin), "P2C-T14 super_admin OK");

console.log("\n=== P2C-T15 Admin denied ===");
assert(!canAccessOperationalNotesAudit(admin), "P2C-T15 admin denied");

console.log("\n=== P2C-T16 Moderator denied ===");
assert(!canAccessOperationalNotesAudit(mod), "P2C-T16 moderator denied");
assert(!canAccessOperationalNotesAudit(inspector), "P2C-T16 inspector denied");

console.log("\n=== P2C-T17 Brak regresji P2B ===");
const dash = computeOperationalNotesDashboardSummary(
  [baseNote({ id: "a1", lastActivityAt: "2026-06-12T08:00:00.000Z" })],
  [],
  superAdmin,
);
assert(dash.total === 1 && dash.lastActivity?.title === "Procedura WM", "P2C-T17 dashboard summary");

console.log("\n=== P2C-T18 Brak regresji P1 ===");
let p1Notes = createOperationalNote({ notes: [], session: superAdmin, title: "X", content: "y" }).notes;
assert(countUnreadOperationalNotes(p1Notes, [], mod) === 1, "P2C-T18 unread mod");
const rs = mergeOperationalNotesReadState(
  [{ noteId: "n1", userId: "dawid", ackAt: "2026-06-01", contentRevAtAck: 1 }],
  [{ noteId: "n1", userId: "dawid", ackAt: "2026-06-02", contentRevAtAck: 2 }],
);
assert(rs[0]?.contentRevAtAck === 2, "P2C-T18 merge read-state");

console.log("\n=== P2C-T19 Brak regresji P0 ===");
const merged = mergeOperationalNotes(
  [baseNote({ title: "L", updatedAt: "2026-06-11T10:00:00.000Z" })],
  [baseNote({ title: "C", updatedAt: "2026-06-09T10:00:00.000Z" })],
);
assert(merged[0]?.title === "L", "P2C-T19 merge notes");

console.log("\n=== P2C UI wiring ===");
const viewSrc = readFileSync(join(root, "src/app/OperationalNotesView.tsx"), "utf8");
const panelSrc = readFileSync(join(root, "src/app/OperationalNotesAuditPanel.tsx"), "utf8");
assert(viewSrc.includes("OperationalNotesAuditPanel"), "P2C UI panel import");
assert(viewSrc.includes("canAccessOperationalNotesAudit"), "P2C UI ACL gate");
assert(viewSrc.includes("ackOperationalNoteWithAudit"), "P2C UI ack audit flow");
assert(panelSrc.includes("SheetContent"), "P2C UI sheet panel");
assert(!viewSrc.includes('setTab("audit")'), "P2C brak trzeciego taba");

console.log(`\n=== WYNIK P2C: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);

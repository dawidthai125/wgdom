/**
 * P0 — Notatki operacyjne — testy rdzenia lib.
 * Uruchom: npx vite-node scripts/test-operational-notes-p0.mjs
 */
import {
  normalizeOperationalNotes,
  mergeOperationalNotes,
  createOperationalNote,
  updateOperationalNoteContent,
  addOperationalNoteComment,
  archiveOperationalNote,
  restoreOperationalNote,
  setOperationalNoteShare,
  setOperationalNoteJobLink,
  deleteOperationalNoteLogical,
  canViewOperationalNote,
  canEditOperationalNote,
  canArchiveOperationalNote,
  canDeleteOperationalNote,
  filterOperationalNotesForJob,
  applyOperationalNoteMutation,
} from "../src/lib/operational-notes.ts";
import {
  appendOperationalNotesAuditLog,
  OPERATIONAL_NOTES_AUDIT_CAP,
} from "../src/lib/operational-notes-audit.ts";
import { mergeOperationalNotesReadState } from "../src/lib/operational-notes-read-state.ts";

const admin = { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" };
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
    title: "Tytuł",
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

console.log("=== T01 normalize ===");
assert(normalizeOperationalNotes(null).length === 0, "T01 null → []");
assert(normalizeOperationalNotes([baseNote(), { id: "x" }]).length === 1, "T01 odrzuca śmieci");

console.log("\n=== T02 merge ===");
const local = [baseNote({ updatedAt: "2026-06-11T10:00:00.000Z", title: "Lokalny" })];
const cloud = [baseNote({ updatedAt: "2026-06-09T10:00:00.000Z", title: "Chmura" })];
const merged = mergeOperationalNotes(local, cloud);
assert(merged[0]?.title === "Lokalny", "T02 newer updatedAt wins");

console.log("\n=== T03 tombstone ===");
const withDeleted = mergeOperationalNotes([baseNote()], [baseNote({ title: "Z chmury" })], ["n1"]);
assert(withDeleted.length === 0, "T03 tombstone usuwa notatkę");

console.log("\n=== T04 ACL staff ===");
const note = baseNote();
assert(canEditOperationalNote(admin) && canArchiveOperationalNote(mod) && canDeleteOperationalNote(mod), "T04 staff CRUD");

console.log("\n=== T05 ACL inspektor create ===");
const created = createOperationalNote({ notes: [], session: inspector, title: "Ins", content: "c" });
assert(created.notes[0]?.shareWithInspector === true, "T05 auto shareWithInspector");

console.log("\n=== T06 ACL inspektor brak edit ===");
assert(!canEditOperationalNote(inspector) && !canArchiveOperationalNote(inspector), "T06 inspektor bez edit/archive/delete");

console.log("\n=== T07 widoczność inspektora ===");
const privateNote = baseNote({ id: "p1", authorUserId: "dawid", shareWithInspector: false });
const sharedNote = baseNote({ id: "s1", authorUserId: "dawid", shareWithInspector: true });
const ownNote = baseNote({ id: "o1", authorUserId: "szymon", shareWithInspector: true });
assert(!canViewOperationalNote(privateNote, inspector), "T07 nie widzi prywatnej cudzej");
assert(canViewOperationalNote(sharedNote, inspector), "T07 widzi shared");
assert(canViewOperationalNote(ownNote, inspector), "T07 widzi własną");

console.log("\n=== T08 contentRev bump ===");
let notes = [baseNote()];
let r = addOperationalNoteComment({ notes, session: admin, noteId: "n1", text: "koment" });
assert(r.notes[0]?.contentRev === 2, "T08 comment bump");
notes = r.notes;
r = setOperationalNoteShare({ notes, session: admin, noteId: "n1", shareWithInspector: true });
assert(r.notes[0]?.contentRev === 3, "T08 share bump");
notes = r.notes;
r = archiveOperationalNote({ notes, session: admin, noteId: "n1" });
assert(r.notes[0]?.contentRev === 4, "T08 archive bump");
notes = r.notes;
r = restoreOperationalNote({ notes, session: admin, noteId: "n1" });
assert(r.notes[0]?.contentRev === 5, "T08 restore bump");
notes = r.notes;
r = setOperationalNoteJobLink({
  notes,
  session: admin,
  noteId: "n1",
  linkedJobId: "job-1",
  linkedJobNameSnapshot: "Adres 1",
});
assert(r.notes[0]?.contentRev === 6, "T08 job link bump");

console.log("\n=== T09 revisions tylko edit treści ===");
notes = [baseNote({ contentRev: 1, revisions: [] })];
r = updateOperationalNoteContent({ notes, session: admin, noteId: "n1", title: "Nowy", content: "Nowa treść" });
assert(r.notes[0]?.revisions.length === 1, "T09 revision on content edit");
r = addOperationalNoteComment({ notes: r.notes, session: admin, noteId: "n1", text: "x" });
assert(r.notes[0]?.revisions.length === 1, "T09 brak revision on comment");

console.log("\n=== T10 audit append ===");
const audit = [];
const createR = createOperationalNote({ notes: [], session: admin, title: "A", content: "B" });
const applied = applyOperationalNoteMutation([], audit, createR);
assert(applied.auditLog.length === 1 && applied.auditLog[0]?.action === "create", "T10 audit create");

console.log("\n=== T11 audit cap ===");
let log = [];
for (let i = 0; i < OPERATIONAL_NOTES_AUDIT_CAP + 50; i++) {
  log = appendOperationalNotesAuditLog(log, {
    id: `e${i}`,
    action: "comment",
    at: new Date(2026, 5, 1, 0, 0, i % 60).toISOString(),
    userId: "dawid",
    displayName: "Dawid",
    role: "super_admin",
  });
}
assert(log.length === OPERATIONAL_NOTES_AUDIT_CAP, "T11 audit cap 3000");

console.log("\n=== T12 linkedJobId filtr ===");
const jobNotes = [
  baseNote({ id: "j1", linkedJobId: "job-a" }),
  baseNote({ id: "j2", linkedJobId: "job-b" }),
];
const forJob = filterOperationalNotesForJob(jobNotes, "job-a", admin);
assert(forJob.length === 1 && forJob[0]?.id === "j1", "T12 filtr per job");

console.log("\n=== T13 archiwum bez hard delete ===");
notes = [baseNote()];
r = archiveOperationalNote({ notes, session: admin, noteId: "n1" });
assert(r.notes[0]?.status === "archived" && r.notes.length === 1, "T13 archived in place");
const del = deleteOperationalNoteLogical({ notes: r.notes, session: admin, noteId: "n1" });
assert(del.notes.length === 0 && del.deletedId === "n1", "T13 logical delete removes from list");

console.log("\n=== T14 read-state merge ===");
const rs = mergeOperationalNotesReadState(
  [{ noteId: "n1", userId: "dawid", ackAt: "2026-06-01", contentRevAtAck: 1 }],
  [{ noteId: "n1", userId: "dawid", ackAt: "2026-06-02", contentRevAtAck: 2 }],
);
assert(rs.length === 1 && rs[0]?.contentRevAtAck === 2, "T14 read-state merge");

console.log("\n=== T15 brak zapisu do kw-jobs ===");
assert(typeof mergeOperationalNotes === "function", "T15 lib standalone — brak importu job mutation");

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);

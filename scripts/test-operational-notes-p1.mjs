/**
 * P1 — Notatki operacyjne — ACK + badge + banner (lib smoke)
 * Uruchom: npx vite-node scripts/test-operational-notes-p1.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createOperationalNote,
  updateOperationalNoteContent,
  addOperationalNoteComment,
  archiveOperationalNote,
  restoreOperationalNote,
  setOperationalNoteShare,
  setOperationalNoteJobLink,
  mergeOperationalNotes,
} from "../src/lib/operational-notes.ts";
import {
  ackOperationalNote,
  isOperationalNoteAcked,
  countUnreadOperationalNotes,
  resolveOperationalNoteReadStatus,
  mergeOperationalNotesReadState,
} from "../src/lib/operational-notes-read-state.ts";
import { getAllAdminAccounts } from "../src/lib/admin-auth.ts";

const admin = { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" };
const mod = { id: "pawel", login: "Pawel", displayName: "Paweł", role: "moderator" };
const inspector = { id: "szymon", login: "Szymon", displayName: "Szymon Szóstak", role: "inspector" };

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

console.log("=== P1-T01 ACK zapisuje contentRev ===");
{
  const note = baseNote();
  const rs = ackOperationalNote([], note, "pawel");
  assert(rs[0]?.contentRevAtAck === 1, "P1-T01 contentRevAtAck = 1");
  assert(isOperationalNoteAcked(note, "pawel", rs), "P1-T01 isAcked true");
}

console.log("\n=== P1-T02 Otwarcie nie zapisuje ACK ===");
{
  const note = baseNote();
  assert(!isOperationalNoteAcked(note, "pawel", []), "P1-T02 brak receipt → unread");
}

console.log("\n=== P1-T03 Autor auto-ACK przy create ===");
{
  const created = createOperationalNote({ notes: [], session: admin, title: "A", content: "B" });
  const note = created.notes[0];
  const rs = ackOperationalNote([], note, admin.id);
  assert(isOperationalNoteAcked(note, admin.id, rs), "P1-T03 autor acked");
}

console.log("\n=== P1-T04 Edycja tytułu resetuje ACK ===");
{
  let notes = [baseNote()];
  let rs = ackOperationalNote([], notes[0], "pawel");
  assert(isOperationalNoteAcked(notes[0], "pawel", rs), "P1-T04 ack przed edycją");
  const r = updateOperationalNoteContent({
    notes,
    session: admin,
    noteId: "n1",
    title: "Nowy tytuł",
    content: "Treść",
  });
  notes = r.notes;
  assert(notes[0]?.contentRev === 2, "P1-T04 contentRev++ on title");
  assert(!isOperationalNoteAcked(notes[0], "pawel", rs), "P1-T04 stary receipt → unread");
}

console.log("\n=== P1-T05 Komentarz resetuje ACK ===");
{
  let notes = [baseNote({ contentRev: 2 })];
  let rs = ackOperationalNote([], notes[0], "pawel");
  const r = addOperationalNoteComment({ notes, session: admin, noteId: "n1", text: "k" });
  assert(!isOperationalNoteAcked(r.notes[0], "pawel", rs), "P1-T05 comment invalidates ack");
}

console.log("\n=== P1-T06 Archiwum resetuje ACK ===");
{
  let notes = [baseNote()];
  let rs = ackOperationalNote([], notes[0], "pawel");
  const r = archiveOperationalNote({ notes, session: admin, noteId: "n1" });
  assert(!isOperationalNoteAcked(r.notes[0], "pawel", rs), "P1-T06 archive invalidates ack");
}

console.log("\n=== P1-T07 Restore resetuje ACK ===");
{
  let notes = [baseNote({ status: "archived", contentRev: 2 })];
  let rs = ackOperationalNote([], notes[0], "pawel");
  const r = restoreOperationalNote({ notes, session: admin, noteId: "n1" });
  assert(!isOperationalNoteAcked(r.notes[0], "pawel", rs), "P1-T07 restore invalidates ack");
}

console.log("\n=== P1-T08 Share toggle resetuje ACK ===");
{
  let notes = [baseNote()];
  let rs = ackOperationalNote([], notes[0], "pawel");
  const r = setOperationalNoteShare({ notes, session: admin, noteId: "n1", shareWithInspector: true });
  assert(!isOperationalNoteAcked(r.notes[0], "pawel", rs), "P1-T08 share invalidates ack");
}

console.log("\n=== P1-T09 Zmiana roboty resetuje ACK ===");
{
  let notes = [baseNote()];
  let rs = ackOperationalNote([], notes[0], "pawel");
  const r = setOperationalNoteJobLink({
    notes,
    session: admin,
    noteId: "n1",
    linkedJobId: "job-1",
    linkedJobNameSnapshot: "Adres",
  });
  assert(!isOperationalNoteAcked(r.notes[0], "pawel", rs), "P1-T09 job link invalidates ack");
}

console.log("\n=== P1-T10 Badge liczy tylko aktywne ===");
{
  const notes = [
    baseNote({ id: "a1" }),
    baseNote({ id: "a2", status: "archived" }),
    baseNote({ id: "a3" }),
  ];
  const rs = ackOperationalNote([], notes[0], mod.id);
  const count = countUnreadOperationalNotes(notes, rs, mod);
  assert(count === 1, `P1-T10 active unread only = ${count} (expected 1)`);
}

console.log("\n=== P1-T11 Banner liczy tylko aktywne ===");
{
  const notes = [baseNote({ id: "b1", status: "archived" }), baseNote({ id: "b2" })];
  const count = countUnreadOperationalNotes(notes, [], admin);
  assert(count === 1, `P1-T11 banner count = ${count}`);
}

console.log("\n=== P1-T12 ACL read/unread lists ===");
{
  const note = baseNote({ shareWithInspector: true });
  const rs = ackOperationalNote([], note, admin.id);
  const status = resolveOperationalNoteReadStatus(note, rs, getAllAdminAccounts());
  assert(status.read.some((e) => e.userId === "dawid"), "P1-T12 dawid read");
  assert(status.unread.some((e) => e.userId === "pawel"), "P1-T12 pawel unread");
  assert(status.unread.some((e) => e.userId === "szymon"), "P1-T12 inspector in audience when shared");
  const privateNote = baseNote({ shareWithInspector: false });
  const privStatus = resolveOperationalNoteReadStatus(privateNote, [], getAllAdminAccounts());
  assert(!privStatus.unread.some((e) => e.userId === "szymon"), "P1-T12 inspector excluded when private");
}

console.log("\n=== P1-T13 Sync merge read-state ===");
{
  const merged = mergeOperationalNotesReadState(
    [{ noteId: "n1", userId: "dawid", ackAt: "2026-06-01", contentRevAtAck: 1 }],
    [{ noteId: "n1", userId: "dawid", ackAt: "2026-06-02", contentRevAtAck: 3 }],
  );
  assert(merged[0]?.contentRevAtAck === 3, "P1-T13 newer ack wins");
}

console.log("\n=== P1-T14 Backup zawiera read-state ===");
{
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const backupLib = readFileSync(join(root, "scripts/backup-lib.mjs"), "utf8");
  assert(backupLib.includes("kw-operational-notes-read-state"), "P1-T14 backup-lib key present");
}

console.log("\n=== P1-T15 Brak regresji P0 (merge tombstone) ===");
{
  const withDeleted = mergeOperationalNotes([baseNote()], [baseNote({ title: "X" })], ["n1"]);
  assert(withDeleted.length === 0, "P1-T15 tombstone still works");
}

console.log(`\n=== WYNIK P1: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);

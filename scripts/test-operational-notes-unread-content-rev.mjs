/**
 * P0 — Notatki operacyjne — unread counter vs contentRev po merge/sync
 * npx vite-node scripts/test-operational-notes-unread-content-rev.mjs
 */
import {
  mergeOperationalNotes,
  addOperationalNoteComment,
  updateOperationalNoteContent,
} from "../src/lib/operational-notes.ts";
import {
  ackOperationalNote,
  countUnreadOperationalNotes,
  isOperationalNoteAcked,
  mergeOperationalNotesReadState,
} from "../src/lib/operational-notes-read-state.ts";

const admin = { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" };

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function baseNote(overrides = {}) {
  return {
    id: "n1",
    title: "Notatka test",
    content: "Treść bazowa",
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

function ackAll(notes, readState = []) {
  return notes.reduce((rs, n) => ackOperationalNote(rs, n, admin.id, "2026-06-16T12:00:00.000Z"), readState);
}

/** Symuluje refresh → deferred bootstrap merge notes + pull aux read-state. */
function simulateRefreshSync(localNotes, localRead, cloudNotes, cloudRead) {
  const mergedNotes = mergeOperationalNotes(localNotes, cloudNotes);
  const mergedRead = mergeOperationalNotesReadState(localRead, cloudRead);
  return { notes: mergedNotes, readState: mergedRead };
}

console.log("=== OP NOTES UNREAD CONTENT REV ===\n");

console.log("T1 ACK → merge bez zmiany treści (spurious cloud rev) → unread = 0");
{
  const local = baseNote({ contentRev: 2, updatedAt: "2026-06-16T11:00:00.000Z" });
  const cloud = baseNote({
    contentRev: 3,
    updatedAt: "2026-06-16T12:00:00.000Z",
    lastActivityAt: "2026-06-16T12:00:00.000Z",
  });
  const readAfterAck = ackAll([local]);
  const { notes, readState } = simulateRefreshSync([local], readAfterAck, [cloud], []);
  assert("T1 merged contentRev nie rośnie bez zmiany treści", notes[0]?.contentRev === 2);
  assert("T1 unread po sync", countUnreadOperationalNotes(notes, readState, admin) === 0);
  assert("T1 isOperationalNoteAcked", isOperationalNoteAcked(notes[0], admin.id, readState));
}

console.log("\nT2 ACK → realna zmiana treści w chmurze → unread wraca");
{
  const local = baseNote({ contentRev: 2 });
  const cloud = baseNote({
    title: "Notatka zmieniona",
    content: "Nowa treść",
    contentRev: 3,
    updatedAt: "2026-06-16T13:00:00.000Z",
    lastActivityAt: "2026-06-16T13:00:00.000Z",
  });
  const readAfterAck = ackAll([local]);
  const { notes, readState } = simulateRefreshSync([local], readAfterAck, [cloud], []);
  assert("T2 merged wyższy contentRev przy zmianie treści", (notes[0]?.contentRev ?? 0) >= 3);
  assert("T2 unread po realnej zmianie", countUnreadOperationalNotes(notes, readState, admin) === 1);
}

console.log("\nT3 ACK 3 notatek → refresh/sync → unread = 0");
{
  const notes = ["a", "b", "c"].map((id, i) =>
    baseNote({
      id,
      title: `N${i}`,
      contentRev: 2,
      updatedAt: `2026-06-16T1${i}:00:00.000Z`,
    }),
  );
  const cloudSpurious = notes.map((n) => ({
    ...n,
    contentRev: n.contentRev + 1,
    updatedAt: "2026-06-16T20:00:00.000Z",
    lastActivityAt: "2026-06-16T20:00:00.000Z",
  }));
  const readAfterAck = ackAll(notes);
  const { notes: merged, readState } = simulateRefreshSync(notes, readAfterAck, cloudSpurious, []);
  assert("T3 trzy notatki unread 0", countUnreadOperationalNotes(merged, readState, admin) === 0);
}

console.log("\nT4 ACK → nowy komentarz w chmurze → unread wraca");
{
  const local = baseNote({ contentRev: 2 });
  let cloudNote = baseNote({
    contentRev: 2,
    updatedAt: "2026-06-16T14:00:00.000Z",
    lastActivityAt: "2026-06-16T14:00:00.000Z",
  });
  const withComment = addOperationalNoteComment({
    notes: [cloudNote],
    session: admin,
    noteId: "n1",
    text: "Nowy komentarz",
  });
  cloudNote = withComment.notes[0];
  const readAfterAck = ackAll([local]);
  const { notes, readState } = simulateRefreshSync([local], readAfterAck, [cloudNote], []);
  assert("T4 contentRev po komentarzu", (notes[0]?.contentRev ?? 0) >= 3);
  assert("T4 unread po komentarzu", countUnreadOperationalNotes(notes, readState, admin) === 1);
}

console.log("\nT5 ACK → update treści lokalnie symulowany merge → unread wraca");
{
  const localBefore = baseNote({ contentRev: 2 });
  const readAfterAck = ackAll([localBefore]);
  const edited = updateOperationalNoteContent({
    notes: [localBefore],
    session: admin,
    noteId: "n1",
    title: "Po edycji",
    content: "Zmienione",
  }).notes[0];
  const { notes, readState } = simulateRefreshSync([localBefore], readAfterAck, [edited], []);
  assert("T5 unread po edycji treści", countUnreadOperationalNotes(notes, readState, admin) === 1);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);

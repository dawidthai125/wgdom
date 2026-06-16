/**
 * P0-HOTFIX-002 — Notatki operacyjne — race read-state w runCloudSync
 * Uruchom: npx vite-node scripts/test-operational-notes-sync-race-p0.mjs
 *
 * Scenariusz: pull aux → ACK w stanie → push (stale vs fresh) → auto-sync nie może stracić ACK.
 */
import {
  ackOperationalNote,
  countUnreadOperationalNotes,
  isOperationalNoteAcked,
  mergeOperationalNotesReadState,
} from "../src/lib/operational-notes-read-state.ts";
import { mergeOperationalNotesAuditLog } from "../src/lib/operational-notes-audit.ts";

const admin = { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" };

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

function baseNote(id, contentRev = 1) {
  return {
    id,
    title: `Notatka ${id}`,
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
    contentRev,
    comments: [],
    revisions: [],
  };
}

/** Symuluje merge w pushOperationalNotesToCloud(readState, cloudReadState). */
function pushMergeReadState(readStatePayload, cloudReadState) {
  return mergeOperationalNotesReadState(readStatePayload, cloudReadState);
}

/** Symuluje pullOperationalNotesAuxFromCloud: merge localStorage + cloud KV. */
function pullAuxMerge(localRead, cloudRead) {
  return mergeOperationalNotesReadState(localRead, cloudRead);
}

console.log("=== P0R-T01 pull → ACK w LS → push ze stale closure traci ACK (regresja) ===");
{
  const notes = [baseNote("n1"), baseNote("n2"), baseNote("n3")];
  const cloudReadBeforeAck = [];
  const localReadAfterAck = notes.reduce(
    (rs, n) => ackOperationalNote(rs, n, admin.id, "2026-06-16T12:00:00.000Z"),
    [],
  );
  assert(countUnreadOperationalNotes(notes, localReadAfterAck, admin) === 0, "P0R-T01 po ACK unread = 0");

  const staleClosure = [];
  const auxAfterPull = pullAuxMerge(localReadAfterAck, cloudReadBeforeAck);
  assert(auxAfterPull.length === 3, "P0R-T01 pull aux ma 3 receipty");

  const pushedStale = pushMergeReadState(staleClosure, cloudReadBeforeAck);
  assert(
    countUnreadOperationalNotes(notes, pushedStale, admin) === 3,
    "P0R-T01 push stale → unread wraca do 3 (bug)",
  );
}

console.log("\n=== P0R-T02 pull → ACK → push z aux.readState zachowuje ACK (fix) ===");
{
  const notes = [baseNote("n1"), baseNote("n2"), baseNote("n3")];
  const cloudRead = [];
  const localReadAfterAck = notes.reduce(
    (rs, n) => ackOperationalNote(rs, n, admin.id, "2026-06-16T12:00:00.000Z"),
    [],
  );
  const auxAfterPull = pullAuxMerge(localReadAfterAck, cloudRead);
  const pushedFresh = pushMergeReadState(auxAfterPull, cloudRead);
  assert(
    countUnreadOperationalNotes(notes, pushedFresh, admin) === 0,
    "P0R-T02 push fresh aux → unread = 0",
  );
  for (const n of notes) {
    assert(isOperationalNoteAcked(n, admin.id, pushedFresh), `P0R-T02 ACK zachowany dla ${n.id}`);
  }
}

console.log("\n=== P0R-T03 auto-sync: pull aux + push fresh vs cloud z częściowym ACK ===");
{
  const notes = [baseNote("n1"), baseNote("n2"), baseNote("n3")];
  const localRead = notes.map((n) =>
    ackOperationalNote([], n, admin.id, "2026-06-16T12:01:00.000Z")[0],
  );
  const cloudRead = [ackOperationalNote([], notes[0], admin.id, "2026-06-16T11:00:00.000Z")[0]];
  const aux = pullAuxMerge(localRead, cloudRead);
  const staleClosure = cloudRead;
  const badPush = pushMergeReadState(staleClosure, cloudRead);
  const goodPush = pushMergeReadState(aux, cloudRead);

  assert(countUnreadOperationalNotes(notes, badPush, admin) === 2, "P0R-T03 stale push → 2 unread (bug)");
  assert(countUnreadOperationalNotes(notes, goodPush, admin) === 0, "P0R-T03 fresh push → 0 unread");
}

console.log("\n=== P0R-T04 audit log — ten sam wzorzec (stale vs aux) ===");
{
  const localAudit = [
    {
      id: "a1",
      action: "ack",
      at: "2026-06-16T12:00:00.000Z",
      userId: "dawid",
      displayName: "Dawid",
      role: "super_admin",
      noteId: "n1",
    },
  ];
  const cloudAudit = [];
  const auxAudit = mergeOperationalNotesAuditLog(localAudit, cloudAudit);
  const staleAudit = [];
  const bad = mergeOperationalNotesAuditLog(staleAudit, cloudAudit);
  const good = mergeOperationalNotesAuditLog(auxAudit, cloudAudit);
  assert(bad.length === 0, "P0R-T04 stale audit push pusty (bug)");
  assert(good.length === 1, "P0R-T04 fresh audit push zachowuje wpis");
}

console.log(`\n=== P0 read-state race: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

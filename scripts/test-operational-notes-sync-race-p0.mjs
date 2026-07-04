/**
 * P0-HOTFIX-002 — Notatki operacyjne — race read-state w runCloudSync
 * PLATFORM-SYNC-01A — reconcile archiwizacji po await pullAndMergeDataBundle
 * Uruchom: npx vite-node scripts/test-operational-notes-sync-race-p0.mjs
 *
 * Scenariusz: pull aux → ACK w stanie → push (stale vs fresh) → auto-sync nie może stracić ACK.
 * P0R-T05–T09: reconcile świeżego LS po await — archiwizacja nie cofa się na active.
 */
import {
  ackOperationalNote,
  countUnreadOperationalNotes,
  isOperationalNoteAcked,
  mergeOperationalNotesReadState,
} from "../src/lib/operational-notes-read-state.ts";
import { mergeOperationalNotesAuditLog } from "../src/lib/operational-notes-audit.ts";
import {
  archiveOperationalNote,
  mergeOperationalNotes,
  normalizeOperationalNotes,
} from "../src/lib/operational-notes.ts";
import {
  DATA_KEYS,
  reconcileOperationalNotesInMergedBundle,
} from "../src/lib/cloud-sync.ts";

const admin = { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" };
const session = { userId: "dawid", displayName: "Dawid", role: "super_admin" };

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

function bundleWithOpNotes(opNotes) {
  const bundle = DATA_KEYS.map(() => null);
  bundle[DATA_KEYS.indexOf("kw-operational-notes")] = opNotes;
  return bundle;
}

function noteStatus(bundle, id) {
  const idx = DATA_KEYS.indexOf("kw-operational-notes");
  const notes = normalizeOperationalNotes(bundle[idx]);
  return notes.find((n) => n.id === id)?.status ?? null;
}

/** Symuluje merge w pushOperationalNotesToCloud(readState, cloudReadState). */
function pushMergeReadState(readStatePayload, cloudReadState) {
  return mergeOperationalNotesReadState(readStatePayload, cloudReadState);
}

/** Symuluje pullOperationalNotesAuxFromCloud: merge localStorage + cloud KV. */
function pullAuxMerge(localRead, cloudRead) {
  return mergeOperationalNotesReadState(localRead, cloudRead);
}

/** Symuluje pullAndMergeDataBundle ze stale closure (active) vs cloud (active). */
function stalePullMerge(activeNotes, cloudNotes) {
  return mergeOperationalNotes(activeNotes, cloudNotes, []);
}

/** Symuluje runCloudSync: await pull → reconcile → apply. */
function syncWithReconcile(staleClosure, freshLocal, cloudNotes) {
  const staleMerged = stalePullMerge(staleClosure, cloudNotes);
  const bundle = bundleWithOpNotes(staleMerged);
  return reconcileOperationalNotesInMergedBundle(bundle, freshLocal);
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

console.log("\n=== P0R-T05 archive race — stale pull bez reconcile cofa active (regresja) ===");
{
  const active = [baseNote("n-arch")];
  const cloud = [baseNote("n-arch")];
  const { notes: archived } = archiveOperationalNote({
    notes: active,
    session,
    noteId: "n-arch",
  });
  assert(archived[0].status === "archived", "P0R-T05 fresh local archived");
  const staleMerged = stalePullMerge(active, cloud);
  assert(staleMerged[0].status === "active", "P0R-T05 stale pull → active (bug path)");
}

console.log("\n=== P0R-T06 reconcile po await — archiwizacja zachowana ===");
{
  const active = [baseNote("n-arch2")];
  const cloud = [baseNote("n-arch2")];
  const { notes: archived } = archiveOperationalNote({
    notes: active,
    session,
    noteId: "n-arch2",
  });
  const reconciled = syncWithReconcile(active, archived, cloud);
  assert(noteStatus(reconciled, "n-arch2") === "archived", "P0R-T06 reconcile → archived");
}

console.log("\n=== P0R-T07 cloud active + fresh archived → reconcile archived ===");
{
  const active = [baseNote("n-arch3")];
  const cloud = [baseNote("n-arch3")];
  const { notes: archived } = archiveOperationalNote({
    notes: active,
    session,
    noteId: "n-arch3",
  });
  const reconciled = syncWithReconcile(active, archived, cloud);
  assert(noteStatus(reconciled, "n-arch3") === "archived", "P0R-T07 LWW fresh archived wygrywa");
}

console.log("\n=== P0R-T08 kolejny merge z cloud (nadal active) — reconcile nadal archived ===");
{
  const active = [baseNote("n-arch4")];
  const cloudActive = [baseNote("n-arch4")];
  const { notes: archived } = archiveOperationalNote({
    notes: active,
    session,
    noteId: "n-arch4",
  });
  const round1 = syncWithReconcile(active, archived, cloudActive);
  assert(noteStatus(round1, "n-arch4") === "archived", "P0R-T08 runda 1 archived");
  const round2 = syncWithReconcile(active, archived, cloudActive);
  assert(noteStatus(round2, "n-arch4") === "archived", "P0R-T08 runda 2 nadal archived");
}

console.log("\n=== P0R-T09 multi archive × multi sync — zawsze archived ===");
{
  const ids = ["n-m1", "n-m2", "n-m3"];
  let active = ids.map((id) => baseNote(id));
  const cloudActive = ids.map((id) => baseNote(id));
  let freshLocal = active;
  for (const id of ids) {
    const result = archiveOperationalNote({ notes: freshLocal, session, noteId: id });
    freshLocal = result.notes;
    assert(freshLocal.find((n) => n.id === id)?.status === "archived", `P0R-T09 archive ${id}`);
  }
  for (let round = 1; round <= 3; round++) {
    const reconciled = syncWithReconcile(active, freshLocal, cloudActive);
    for (const id of ids) {
      assert(
        noteStatus(reconciled, id) === "archived",
        `P0R-T09 sync runda ${round} — ${id} archived`,
      );
    }
    const cloudStillActive = mergeOperationalNotes(cloudActive, cloudActive, []);
    const again = reconcileOperationalNotesInMergedBundle(
      bundleWithOpNotes(cloudStillActive),
      freshLocal,
    );
    for (const id of ids) {
      assert(
        noteStatus(again, id) === "archived",
        `P0R-T09 cloud merge runda ${round} — ${id} archived`,
      );
    }
  }
}

console.log(`\n=== P0 read-state + archive race: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

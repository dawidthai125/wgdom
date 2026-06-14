/**
 * P2A — Notatki operacyjne — Inspektor UI (lib + wiring smoke)
 * Uruchom: npx vite-node scripts/test-operational-notes-p2a.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createOperationalNote,
  addOperationalNoteComment,
  updateOperationalNoteContent,
  archiveOperationalNote,
  restoreOperationalNote,
  setOperationalNoteShare,
  deleteOperationalNoteLogical,
  canViewOperationalNote,
  filterOperationalNotesForInspectorActive,
  mergeOperationalNotes,
} from "../src/lib/operational-notes.ts";
import {
  ackOperationalNoteWithAudit,
  countUnreadOperationalNotes,
  mergeOperationalNotesReadState,
  resolveOperationalNoteReadStatus,
} from "../src/lib/operational-notes-read-state.ts";
import { canAccessOperationalNotesAudit } from "../src/lib/operational-notes-audit-filters.ts";
import { computeOperationalNotesDashboardSummary } from "../src/lib/operational-notes-dashboard.ts";
import { getAllAdminAccounts } from "../src/lib/admin-auth.ts";
import {
  mergeDeletedOperationalNoteIds,
  normalizeDeletedOperationalNoteIds,
} from "../src/lib/cloud-sync.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

console.log("=== P2A-T01 własne + shared ===");
const mixNotes = [
  baseNote({ id: "priv", shareWithInspector: false, title: "Prywatna admina" }),
  baseNote({ id: "shared", shareWithInspector: true, title: "Shared admina" }),
  baseNote({ id: "own", authorUserId: "szymon", authorRole: "inspector", shareWithInspector: true, title: "Własna inspektora" }),
];
const inspVisible = filterOperationalNotesForInspectorActive(mixNotes, inspector);
assert(inspVisible.length === 2, "P2A-T01 inspektor widzi shared + własną");
assert(inspVisible.some((n) => n.id === "shared") && inspVisible.some((n) => n.id === "own"), "P2A-T01 zawiera shared i own");
assert(!inspVisible.some((n) => n.id === "priv"), "P2A-T01 bez prywatnej admina");

console.log("\n=== P2A-T02 brak archived ===");
const withArch = [
  ...mixNotes,
  baseNote({ id: "arch", status: "archived", shareWithInspector: true, title: "Archiwum shared" }),
  baseNote({ id: "arch-own", status: "archived", authorUserId: "szymon", authorRole: "inspector", shareWithInspector: true, title: "Archiwum własna" }),
];
const inspActive = filterOperationalNotesForInspectorActive(withArch, inspector);
assert(!inspActive.some((n) => n.status === "archived"), "P2A-T02 brak archived w filtrze inspektora");
assert(inspActive.length === 2, "P2A-T02 tylko aktywne widoczne");

console.log("\n=== P2A-T03 create → shareWithInspector=true ===");
const inspCreate = createOperationalNote({ notes: [], session: inspector, title: "Nowa", content: "od inspektora" });
assert(inspCreate.notes[0]?.shareWithInspector === true, "P2A-T03 auto share przy create inspektora");
assert(canViewOperationalNote(inspCreate.notes[0], admin), "P2A-T03 admin widzi notatkę inspektora");

console.log("\n=== P2A-T04 brak edit/archive/delete/share (lib guard) ===");
let guardNotes = [baseNote({ id: "g1", authorUserId: "szymon", authorRole: "inspector", shareWithInspector: true })];
const editBlock = updateOperationalNoteContent({
  notes: guardNotes,
  session: inspector,
  noteId: "g1",
  title: "X",
  content: "Y",
});
assert(editBlock.auditEntries.length === 0 && editBlock.notes[0]?.title === "Tytuł", "P2A-T04 inspektor nie edytuje treści");
const archBlock = archiveOperationalNote({ notes: guardNotes, session: inspector, noteId: "g1" });
assert(archBlock.auditEntries.length === 0, "P2A-T04 inspektor nie archiwizuje");
const restoreBlock = restoreOperationalNote({
  notes: [baseNote({ id: "g1", status: "archived" })],
  session: inspector,
  noteId: "g1",
});
assert(restoreBlock.auditEntries.length === 0, "P2A-T04 inspektor nie przywraca");
const shareBlock = setOperationalNoteShare({
  notes: guardNotes,
  session: inspector,
  noteId: "g1",
  shareWithInspector: false,
});
assert(shareBlock.auditEntries.length === 0, "P2A-T04 inspektor nie zmienia share");
const delBlock = deleteOperationalNoteLogical({ notes: guardNotes, session: inspector, noteId: "g1" });
assert(delBlock.auditEntries.length === 0, "P2A-T04 inspektor nie usuwa");

console.log("\n=== P2A-T05 comment + ACK ===");
let cNotes = [baseNote({ id: "c1", shareWithInspector: true })];
let cAudit = [];
const commentR = addOperationalNoteComment({ notes: cNotes, session: inspector, noteId: "c1", text: "Przyjąłem" });
assert(commentR.notes[0]?.comments.length === 1, "P2A-T05 inspektor dodaje komentarz");
assert(commentR.auditEntries[0]?.action === "comment", "P2A-T05 audit comment");
cNotes = commentR.notes;
cAudit = [...cAudit, ...commentR.auditEntries];
let cRead = [];
const acked = ackOperationalNoteWithAudit(cRead, cAudit, cNotes[0], inspector);
assert(acked.readState.length === 1, "P2A-T05 ACK inspektora");
assert(acked.auditLog.some((e) => e.action === "ack"), "P2A-T05 audit ack");

console.log("\n=== P2A-T06 brak Audit UI ===");
const opViewSrc = readFileSync(join(root, "src/app/OperationalNotesView.tsx"), "utf8");
assert(opViewSrc.includes('showAuditUi = !isInspectorVariant'), "P2A-T06 showAuditUi wyłączone dla inspektora");
assert(!canAccessOperationalNotesAudit(inspector), "P2A-T06 inspektor bez ACL audytu");
assert(opViewSrc.includes('variant?: "admin" | "inspector"'), "P2A-T06 variant prop");

console.log("\n=== P2A-T07 dashboard widget admin bez regresji ===");
const dashSummary = computeOperationalNotesDashboardSummary(mixNotes, [], admin);
assert(dashSummary.total === 3, "P2A-T07 admin dashboard liczy aktywne");
const dashViewSrc = readFileSync(join(root, "src/app/DashboardView.tsx"), "utf8");
assert(dashViewSrc.includes("computeOperationalNotesDashboardSummary"), "P2A-T07 dashboard widget bez regresji");

console.log("\n=== P2A-T08 merge sync admin + inspektor ===");
const localNotes = [baseNote({ id: "m1", title: "Lokalny", updatedAt: "2026-06-14T10:00:00.000Z" })];
const cloudNotes = [baseNote({ id: "m1", title: "Chmura", updatedAt: "2026-06-13T10:00:00.000Z" })];
const mergedNotes = mergeOperationalNotes(localNotes, cloudNotes);
assert(mergedNotes[0]?.title === "Lokalny", "P2A-T08 merge notes newer wins");
const mergedDeleted = mergeDeletedOperationalNoteIds(["d1"], normalizeDeletedOperationalNoteIds(["d2", "d1"]));
assert(mergedDeleted.includes("d1") && mergedDeleted.includes("d2"), "P2A-T08 merge tombstones");
const mergedRead = mergeOperationalNotesReadState(
  [{ noteId: "m1", userId: "szymon", ackAt: "2026-06-01", contentRevAtAck: 1 }],
  [{ noteId: "m1", userId: "dawid", ackAt: "2026-06-02", contentRevAtAck: 1 }],
);
assert(mergedRead.length === 2, "P2A-T08 merge read-state multi-user");
const inspPanelSrc = readFileSync(join(root, "src/app/InspectorPanel.tsx"), "utf8");
assert(inspPanelSrc.includes("pushOperationalNotesToCloud"), "P2A-T08 inspector push reuse");
assert(inspPanelSrc.includes("OPERATIONAL_NOTES_KEY"), "P2A-T08 inspector fetch KV notatek");

console.log("\n=== P2A-T09 pełny read status ===");
const statusNote = baseNote({ id: "rs1", shareWithInspector: true });
const accounts = getAllAdminAccounts();
const status = resolveOperationalNoteReadStatus(statusNote, [], accounts);
assert(status.read.length >= 0 && status.unread.length >= 1, "P2A-T09 split read/unread");
assert(opViewSrc.includes("resolveOperationalNoteReadStatus"), "P2A-T09 UI read status reuse");
const inspStatus = resolveOperationalNoteReadStatus(statusNote, [], accounts);
assert(Array.isArray(inspStatus.read) && Array.isArray(inspStatus.unread), "P2A-T09 pełny format Przeczytali/Nie przeczytali");

console.log("\n=== P2A-T10 header badge ===");
assert(inspPanelSrc.includes("operationalNotesUnread"), "P2A-T10 unread useMemo");
assert(inspPanelSrc.includes("setOperationalNotesOpen(true)"), "P2A-T10 header otwiera notatki");
assert(inspPanelSrc.includes("ScrollText") && inspPanelSrc.includes("operationalNotesUnread > 0"), "P2A-T10 badge warunek");
assert(inspPanelSrc.includes('variant="inspector"'), "P2A-T10 OperationalNotesView inspector");
const appAuthSrc = readFileSync(join(root, "src/app/AppInnerWithAuth.tsx"), "utf8");
assert(appAuthSrc.includes("session={inspectorSession}"), "P2A-T10 session prop InspectorPanel");

console.log("\n=== P2A-T11 regresja P0 ===");
const p0merge = mergeOperationalNotes(
  [baseNote({ title: "L", updatedAt: "2026-06-11T10:00:00.000Z" })],
  [baseNote({ title: "C", updatedAt: "2026-06-09T10:00:00.000Z" })],
);
assert(p0merge[0]?.title === "L", "P2A-T11 P0 merge");

console.log("\n=== P2A-T12 regresja P1 unread ===");
const p1Create = createOperationalNote({ notes: [], session: admin, title: "P1", content: "x" });
assert(countUnreadOperationalNotes(p1Create.notes, [], mod) === 1, "P2A-T12 moderator unread");

console.log("\n=== P2A-T13 regresja P2B ===");
assert(computeOperationalNotesDashboardSummary(mixNotes, [], admin).total === 3, "P2A-T13 P2B summary");

console.log("\n=== P2A-T14 regresja P2C audit ACL ===");
assert(canAccessOperationalNotesAudit(admin) && !canAccessOperationalNotesAudit(inspector), "P2A-T14 P2C audit ACL");

console.log(`\n=== WYNIK P2A: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);

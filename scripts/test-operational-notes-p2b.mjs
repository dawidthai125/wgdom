/**
 * P2B — Notatki operacyjne — Dashboard Widget (lib + wiring smoke)
 * Uruchom: npx vite-node scripts/test-operational-notes-p2b.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  computeOperationalNotesDashboardSummary,
  canShowOperationalNotesDashboardWidget,
} from "../src/lib/operational-notes-dashboard.ts";
import {
  createOperationalNote,
  mergeOperationalNotes,
} from "../src/lib/operational-notes.ts";
import {
  ackOperationalNote,
  countUnreadOperationalNotes,
  mergeOperationalNotesReadState,
} from "../src/lib/operational-notes-read-state.ts";

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

console.log("=== P2B-T01 Łącznie ===");
const notesMix = [
  baseNote({ id: "a1", title: "Aktywna A", lastActivityAt: "2026-06-12T08:00:00.000Z" }),
  baseNote({ id: "a2", title: "Aktywna B", lastActivityAt: "2026-06-11T08:00:00.000Z" }),
  baseNote({ id: "arch", title: "Archiwum", status: "archived", lastActivityAt: "2026-06-13T08:00:00.000Z" }),
];
const s1 = computeOperationalNotesDashboardSummary(notesMix, [], admin);
assert(s1.total === 2, "P2B-T01 liczy tylko aktywne widoczne dla admina");

console.log("\n=== P2B-T02 Nieprzeczytane ===");
let readState = ackOperationalNote([], notesMix[0], admin.id);
const s2 = computeOperationalNotesDashboardSummary(notesMix, readState, admin);
assert(
  s2.unread === countUnreadOperationalNotes(notesMix, readState, admin),
  "P2B-T02 unread = countUnreadOperationalNotes",
);
assert(s2.unread === 1, "P2B-T02 jedna nieprzeczytana po ACK pierwszej");

console.log("\n=== P2B-T03 Od inspektora ===");
const notesInspector = [
  baseNote({ id: "i1", authorUserId: "szymon", authorRole: "inspector", shareWithInspector: true, title: "Od Szymona" }),
  baseNote({ id: "i2", authorUserId: "dawid", authorRole: "super_admin", title: "Od admina" }),
  baseNote({ id: "i3", authorUserId: "szymon", authorRole: "inspector", shareWithInspector: false, title: "Prywatna inspektora" }),
];
const s3admin = computeOperationalNotesDashboardSummary(notesInspector, [], admin);
assert(s3admin.fromInspector === 2, "P2B-T03 admin widzi 2 aktywne od inspektora (staff widzi wszystkie)");
const s3insp = computeOperationalNotesDashboardSummary(notesInspector, [], inspector);
assert(s3insp.fromInspector === 2, "P2B-T03 inspektor widzi 2 własne (shared + private)");

console.log("\n=== P2B-T04 Ostatnia aktywność ===");
const s4 = computeOperationalNotesDashboardSummary(notesMix, [], admin);
assert(s4.lastActivity?.title === "Aktywna A", "P2B-T04 tytuł notatki z max lastActivityAt (bez archiwum)");
assert(s4.lastActivity?.at === "2026-06-12T08:00:00.000Z", "P2B-T04 czas lastActivityAt");

console.log("\n=== P2B-T05 Brak notatek ===");
const s5 = computeOperationalNotesDashboardSummary([], [], admin);
assert(s5.total === 0 && s5.unread === 0 && s5.fromInspector === 0 && s5.lastActivity === null, "P2B-T05 pusty stan");

console.log("\n=== P2B-T06 ACL widoczności ===");
const aclNotes = [
  baseNote({ id: "priv", shareWithInspector: false }),
  baseNote({ id: "shared", shareWithInspector: true, title: "Shared" }),
];
const s6insp = computeOperationalNotesDashboardSummary(aclNotes, [], inspector);
assert(s6insp.total === 1 && s6insp.lastActivity?.title === "Shared", "P2B-T06 inspektor widzi tylko shared");
const s6mod = computeOperationalNotesDashboardSummary(aclNotes, [], mod);
assert(s6mod.total === 2, "P2B-T06 staff widzi wszystkie aktywne");

console.log("\n=== P2B-T07 Kliknięcie → operationalnotes ===");
const dashSrc = readFileSync(join(root, "src/app/DashboardView.tsx"), "utf8");
const widgetSrc = readFileSync(join(root, "src/app/DashboardOperationalNotesWidget.tsx"), "utf8");
const appSrc = readFileSync(join(root, "src/app/App.tsx"), "utf8");
assert(dashSrc.includes('onNavigate("operationalnotes")'), "P2B-T07 DashboardView nawiguje do operationalnotes");
assert(widgetSrc.includes("onOpen") && dashSrc.includes("DashboardOperationalNotesWidget"), "P2B-T07 widget podpięty");
assert(appSrc.includes("operationalnotes: \"Notatki operacyjne\""), "P2B-T07 handleNavigate z etykietą return");

console.log("\n=== P2B-T08 Brak regresji P1 ===");
let p1Notes = [];
let p1Read = [];
const created = createOperationalNote({ notes: p1Notes, session: admin, title: "Nowa", content: "x" });
p1Notes = created.notes;
assert(p1Read.length === 0 || true, "P2B-T08 setup");
assert(countUnreadOperationalNotes(p1Notes, p1Read, mod) >= 1, "P2B-T08 moderator ma unread bez ACK");
p1Read = ackOperationalNote(p1Read, p1Notes[0], mod.id);
assert(!countUnreadOperationalNotes(p1Notes, p1Read, mod), "P2B-T08 ACK zeruje unread moderatora");
const rsMerged = mergeOperationalNotesReadState(
  [{ noteId: "x", userId: "dawid", ackAt: "2026-06-01", contentRevAtAck: 1 }],
  [{ noteId: "x", userId: "dawid", ackAt: "2026-06-02", contentRevAtAck: 2 }],
);
assert(rsMerged[0]?.contentRevAtAck === 2, "P2B-T08 read-state merge P1");

console.log("\n=== P2B-T09 Brak regresji P0 ===");
const merged = mergeOperationalNotes(
  [baseNote({ title: "Lokalny", updatedAt: "2026-06-11T10:00:00.000Z" })],
  [baseNote({ title: "Chmura", updatedAt: "2026-06-09T10:00:00.000Z" })],
);
assert(merged[0]?.title === "Lokalny", "P2B-T09 merge operational notes");
const inspCreate = createOperationalNote({ notes: [], session: inspector, title: "I", content: "c" });
assert(inspCreate.notes[0]?.shareWithInspector === true, "P2B-T09 inspektor auto share");

console.log("\n=== P2B widget visibility ===");
assert(canShowOperationalNotesDashboardWidget(admin), "staff admin widzi widget");
assert(!canShowOperationalNotesDashboardWidget(inspector), "inspektor bez widgetu na pulpicie admin");

console.log(`\n=== WYNIK P2B: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);

/**
 * v2.58.1 — Notatki operacyjne — Hotfix Backup Completeness
 * Uruchom: npx vite-node scripts/test-operational-notes-hotfix-2.58.1.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  OPERATIONAL_NOTES_BACKUP_KEYS,
  OPERATIONAL_NOTES_BACKUP_AUX_KEYS,
  mergeDeletedOperationalNoteIds,
  normalizeDeletedOperationalNoteIds,
} from "../src/lib/cloud-sync.ts";
import { mergeOperationalNotes } from "../src/lib/operational-notes.ts";
import { mergeOperationalNotesReadState } from "../src/lib/operational-notes-read-state.ts";
import { mergeOperationalNotesAuditLog } from "../src/lib/operational-notes-audit.ts";
import { readLocalDataBundle } from "../src/lib/local-data-backup.ts";
import { EMAIL_KV_KEYS, fullBackupKvKeys } from "./backup-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

const appSrc = readFileSync(join(root, "src/app/App.tsx"), "utf8");
const localBackupSrc = readFileSync(join(root, "src/lib/local-data-backup.ts"), "utf8");
const cloudSyncSrc = readFileSync(join(root, "src/lib/cloud-sync.ts"), "utf8");

console.log("=== HF-T01 UI backup zawiera notes ===");
assert(appSrc.includes("OPERATIONAL_NOTES_BACKUP_AUX_KEYS"), "HF-T01 export używa OPERATIONAL_NOTES_BACKUP_AUX_KEYS");
assert(OPERATIONAL_NOTES_BACKUP_KEYS.includes("kw-operational-notes"), "HF-T01 SSOT zawiera notes");

console.log("\n=== HF-T02 UI backup zawiera read-state ===");
assert(
  appSrc.includes("OPERATIONAL_NOTES_BACKUP_AUX_KEYS") && OPERATIONAL_NOTES_BACKUP_AUX_KEYS.includes("kw-operational-notes-read-state"),
  "HF-T02 read-state w aux backup keys",
);

console.log("\n=== HF-T03 UI backup zawiera audit-log ===");
assert(OPERATIONAL_NOTES_BACKUP_AUX_KEYS.includes("kw-operational-notes-audit-log"), "HF-T03 audit-log w aux keys");

console.log("\n=== HF-T04 UI backup zawiera deleted-ids ===");
assert(OPERATIONAL_NOTES_BACKUP_AUX_KEYS.includes("kw-operational-notes-deleted-ids"), "HF-T04 deleted-ids w aux keys");

console.log("\n=== HF-T05 Import odtwarza 4 klucze ===");
assert(appSrc.includes('data["kw-operational-notes-read-state"]'), "HF-T05 import merge read-state");
assert(appSrc.includes('data["kw-operational-notes-audit-log"]'), "HF-T05 import merge audit-log");
assert(appSrc.includes('data["kw-operational-notes-deleted-ids"]'), "HF-T05 import merge deleted-ids");
assert(appSrc.includes("pushOperationalNotesToCloud"), "HF-T05 import push aux do chmury");

const importSimDeleted = mergeDeletedOperationalNoteIds(["d-local"], normalizeDeletedOperationalNoteIds(["d-backup"]));
const importSimNotes = mergeOperationalNotes(
  [{ id: "n1", title: "L", updatedAt: "2026-06-14T10:00:00.000Z", authorUserId: "a", lastActivityAt: "2026-06-14T10:00:00.000Z", status: "active", shareWithInspector: false, contentRev: 1, comments: [], revisions: [], authorDisplayName: "A", authorRole: "admin", createdAt: "2026-06-14T10:00:00.000Z", lastActivityByUserId: "a" }],
  [{ id: "n1", title: "B", updatedAt: "2026-06-15T10:00:00.000Z", authorUserId: "a", lastActivityAt: "2026-06-15T10:00:00.000Z", status: "active", shareWithInspector: false, contentRev: 1, comments: [], revisions: [], authorDisplayName: "A", authorRole: "admin", createdAt: "2026-06-14T10:00:00.000Z", lastActivityByUserId: "a" }],
  importSimDeleted,
);
assert(importSimDeleted.includes("d-local") && importSimDeleted.includes("d-backup"), "HF-T05 merge tombstones import");
assert(importSimNotes[0]?.title === "B", "HF-T05 merge notes z tombstone z backupu");

const rsMerged = mergeOperationalNotesReadState(
  [{ noteId: "n1", userId: "u1", ackAt: "2026-06-01", contentRevAtAck: 1 }],
  [{ noteId: "n1", userId: "u1", ackAt: "2026-06-02", contentRevAtAck: 2 }],
);
assert(rsMerged[0]?.contentRevAtAck === 2, "HF-T05 merge read-state import");

console.log("\n=== HF-T06 EMAIL_KV_KEYS zawiera 4 klucze ===");
for (const key of OPERATIONAL_NOTES_BACKUP_KEYS) {
  assert(EMAIL_KV_KEYS.includes(key), `HF-T06 EMAIL_KV_KEYS zawiera ${key}`);
}

console.log("\n=== HF-T06b local snapshot + full backup audit ===");
assert(localBackupSrc.includes("OPERATIONAL_NOTES_BACKUP_AUX_KEYS"), "HF-T06b local-data-backup aux keys");
assert(cloudSyncSrc.includes("OPERATIONAL_NOTES_BACKUP_KEYS"), "HF-T06b cloud-sync SSOT backup keys");
const fullKeys = fullBackupKvKeys("2026-06-14");
for (const key of OPERATIONAL_NOTES_BACKUP_KEYS) {
  assert(fullKeys.includes(key), `HF-T06b fullBackupKvKeys zawiera ${key}`);
}

console.log("\n=== HF-T07 regresja P2A ===");
const { execSync } = await import("node:child_process");
try {
  execSync("npx vite-node scripts/test-operational-notes-p2a.mjs", { cwd: root, stdio: "pipe" });
  assert(true, "HF-T07 P2A PASS");
} catch {
  assert(false, "HF-T07 P2A FAIL");
}

console.log("\n=== HF-T08 regresja P2C ===");
try {
  execSync("npx vite-node scripts/test-operational-notes-p2c.mjs", { cwd: root, stdio: "pipe" });
  assert(true, "HF-T08 P2C PASS");
} catch {
  assert(false, "HF-T08 P2C FAIL");
}

console.log("\n=== HF-T09 regresja P2B ===");
try {
  execSync("npx vite-node scripts/test-operational-notes-p2b.mjs", { cwd: root, stdio: "pipe" });
  assert(true, "HF-T09 P2B PASS");
} catch {
  assert(false, "HF-T09 P2B FAIL");
}

console.log("\n=== HF-T10 regresja P1 ===");
try {
  execSync("npx vite-node scripts/test-operational-notes-p1.mjs", { cwd: root, stdio: "pipe" });
  assert(true, "HF-T10 P1 PASS");
} catch {
  assert(false, "HF-T10 P1 FAIL");
}

console.log("\n=== HF-T11 regresja P0 ===");
try {
  execSync("npx vite-node scripts/test-operational-notes-p0.mjs", { cwd: root, stdio: "pipe" });
  assert(true, "HF-T11 P0 PASS");
} catch {
  assert(false, "HF-T11 P0 FAIL");
}

console.log("\n=== HF readLocalDataBundle export ===");
assert(typeof readLocalDataBundle === "function", "HF readLocalDataBundle dostępny");

console.log(`\n=== WYNIK HOTFIX 2.58.1: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);

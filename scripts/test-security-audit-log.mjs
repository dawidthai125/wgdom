/**
 * MVP-1 — Security audit log — testy rdzenia lib.
 * Uruchom: npx vite-node scripts/test-security-audit-log.mjs
 */
import {
  SECURITY_AUDIT_CAP,
  SECURITY_AUDIT_LOG_KEY,
  SECURITY_AUDIT_ACTION_LABEL_PL,
  appendSecurityAuditEntry,
  buildSecurityAuditEntry,
  mergeSecurityAuditLog,
  normalizeSecurityAuditLog,
} from "../src/lib/security-audit-log.ts";

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

const baseEntry = {
  id: "sec-1",
  at: "2026-06-22T10:00:00.000Z",
  actor: "Dawid",
  actorUserId: "dawid",
  category: "AUTH",
  action: "admin_login_success",
  severity: "info",
  summary: "Logowanie: Dawid",
};

console.log("Security audit log MVP-1 — test-security-audit-log\n");

// T01 — normalize rejects garbage
{
  assert(normalizeSecurityAuditLog(null).length === 0, "T01 normalize null → []");
  assert(normalizeSecurityAuditLog([{ id: "x" }]).length === 0, "T01 normalize invalid → []");
  const [one] = normalizeSecurityAuditLog([baseEntry]);
  assert(one?.actor === "Dawid" && one?.severity === "info", "T01 normalize valid entry");
}

// T02 — actor fallback
{
  const [noActor] = normalizeSecurityAuditLog([{ ...baseEntry, id: "sec-2", actor: "" }]);
  assert(noActor?.actor === "Administrator", "T02 empty actor → Administrator");
  const [spaces] = normalizeSecurityAuditLog([{ ...baseEntry, id: "sec-3", actor: "   " }]);
  assert(spaces?.actor === "Administrator", "T02 whitespace actor → Administrator");
}

// T03 — at fallback ISO
{
  const [noAt] = normalizeSecurityAuditLog([{ ...baseEntry, id: "sec-4", at: undefined }]);
  assert(typeof noAt?.at === "string" && noAt.at.length > 0, "T03 missing at → ISO string");
}

// T04 — append
{
  const log = normalizeSecurityAuditLog([baseEntry]);
  const next = buildSecurityAuditEntry({
    actor: "Paweł",
    category: "AUTH",
    action: "admin_logout",
    severity: "info",
    summary: "Wylogowanie",
  });
  const appended = appendSecurityAuditEntry(log, next);
  assert(appended.length === 2, "T04 append — 2 wpisy");
  assert(appended[0].id === next.id, "T04 append — newest first");
}

// T05 — merge by id, newer at wins
{
  const local = [{ ...baseEntry, summary: "Lokalny" }];
  const cloud = [{ ...baseEntry, at: "2026-06-23T10:00:00.000Z", summary: "Chmura" }];
  const merged = mergeSecurityAuditLog(local, cloud);
  assert(merged.length === 1 && merged[0].summary === "Chmura", "T05 merge — newer cloud wins");
}

// T06 — dedupe merge
{
  const a = { ...baseEntry, id: "dup" };
  const merged = mergeSecurityAuditLog([a], [a]);
  assert(merged.length === 1, "T06 merge dedupe by id");
}

// T07 — cap
{
  const many = Array.from({ length: SECURITY_AUDIT_CAP + 50 }, (_, i) => ({
    ...baseEntry,
    id: `cap-${i}`,
    at: `2026-06-${String(1 + (i % 28)).padStart(2, "0")}T12:00:00.000Z`,
  }));
  const capped = appendSecurityAuditEntry([], many);
  assert(capped.length === SECURITY_AUDIT_CAP, `T07 cap — max ${SECURITY_AUDIT_CAP}`);
}

// T08 — severity preserved
{
  const built = buildSecurityAuditEntry({
    actor: "Admin",
    category: "PERMISSIONS",
    action: "user_delete",
    severity: "high",
    summary: "Usunięto konto",
  });
  assert(built.severity === "high", "T08 buildSecurityAuditEntry severity high");
  const [parsed] = normalizeSecurityAuditLog([built]);
  assert(parsed?.severity === "high", "T08 normalize preserves severity");
}

// T09 — key constant
{
  assert(SECURITY_AUDIT_LOG_KEY === "kw-security-audit-log", "T09 SECURITY_AUDIT_LOG_KEY");
}

// T10 — RECOVERY actions
{
  const started = buildSecurityAuditEntry({
    actor: "Dawid",
    category: "RECOVERY",
    action: "restore_backup_started",
    severity: "info",
    summary: "Rozpoczęto przywracanie: roboty (chmura)",
    detail: JSON.stringify({ scope: "jobs", source: "cloud", backupSlot: "prev" }),
  });
  assert(started.category === "RECOVERY" && started.action === "restore_backup_started", "T10 restore_backup_started");
  const completed = buildSecurityAuditEntry({
    actor: "Dawid",
    category: "RECOVERY",
    action: "restore_backup_completed",
    severity: "high",
    summary: "Przywrócono: roboty (chmura)",
    detail: JSON.stringify({ scope: "jobs", source: "cloud", count: 42 }),
  });
  assert(completed.severity === "high", "T10 restore_backup_completed severity high");
  const failed = buildSecurityAuditEntry({
    actor: "Dawid",
    category: "RECOVERY",
    action: "restore_backup_failed",
    severity: "high",
    summary: "Błąd przywracania",
    detail: JSON.stringify({ scope: "all", source: "cloud", message: "offline" }),
  });
  const [parsedFailed] = normalizeSecurityAuditLog([failed]);
  assert(parsedFailed?.action === "restore_backup_failed", "T10 normalize restore_backup_failed");
}

// T11 — DATA import + directory_delete
{
  const importDone = buildSecurityAuditEntry({
    actor: "Admin",
    category: "DATA",
    action: "data_import_completed",
    severity: "warn",
    summary: "Import backupu zakończony",
    detail: JSON.stringify({ source: "file", count: 12 }),
  });
  assert(importDone.severity === "warn", "T11 data_import_completed warn");
  const dirDel = buildSecurityAuditEntry({
    actor: "Admin",
    category: "DATA",
    action: "directory_delete",
    severity: "high",
    summary: "Usunięto pracownika z katalogu",
    detail: JSON.stringify({ entryId: "emp-1" }),
  });
  assert(SECURITY_AUDIT_ACTION_LABEL_PL.directory_delete === "Usunięcie pracownika z katalogu", "T11 directory_delete label PL");
  const [parsedDir] = normalizeSecurityAuditLog([dirDel]);
  assert(parsedDir?.category === "DATA", "T11 directory_delete category DATA");
}

console.log(`\n--- ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);

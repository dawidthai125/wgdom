/**
 * Sprint 20.5A.7 — Role Visibility Hardening
 * Uruchom: npx vite-node scripts/smoke-test-role-visibility-20.5a7.mjs
 */
import { visibleRoleLabelForViewer, topbarRoleTooltipVisible } from "../src/lib/role-visibility.ts";
import { resolveAuthorContact } from "../src/lib/content-author-contact.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function assertNull(name, got) {
  assert(name, got === null, got === null ? "" : `got "${got}"`);
}

function assertEq(name, got, expected) {
  assert(name, got === expected, got === expected ? "" : `got "${got}", expected "${expected}"`);
}

log("=== Sprint 20.5A.7 — Role Visibility smoke ===\n");

// --- Warstwa V: visibleRoleLabelForViewer ---
log("--- V1–V14: visibleRoleLabelForViewer ---\n");

assertEq("V1 super×super", visibleRoleLabelForViewer("super_admin", "super_admin"), "Super Admin");
assertEq("V2 super×moderator", visibleRoleLabelForViewer("super_admin", "moderator"), "Moderator");
assertNull("V3 admin×super", visibleRoleLabelForViewer("admin", "super_admin"));
assertNull("V4 admin×admin", visibleRoleLabelForViewer("admin", "admin"));
assertNull("V5 admin×moderator", visibleRoleLabelForViewer("admin", "moderator"));
assertEq("V6 admin×inspector", visibleRoleLabelForViewer("admin", "inspector"), "Inspektor");
assertEq("V7 moderator×inspector", visibleRoleLabelForViewer("moderator", "inspector"), "Inspektor");
assertNull("V8 inspector×admin", visibleRoleLabelForViewer("inspector", "admin"));
assertEq("V9 inspector×inspector", visibleRoleLabelForViewer("inspector", "inspector"), "Inspektor");
assertEq("V10 admin×worker", visibleRoleLabelForViewer("admin", "worker"), "Pracownik");
assertNull("V11 self admin×admin", visibleRoleLabelForViewer("admin", "admin"));
assertNull("V12 self mod×mod", visibleRoleLabelForViewer("moderator", "moderator"));
assertEq("V13 self insp×insp", visibleRoleLabelForViewer("inspector", "inspector"), "Inspektor");
assertEq("V14 self super×super", visibleRoleLabelForViewer("super_admin", "super_admin"), "Super Admin");

log("\n--- R1–R6: resolveAuthorContact + viewerRole ---\n");

const emptyDir = [];

// R1 — lookup super_admin, viewer admin → null
{
  const r = resolveAuthorContact("Dawid", { directory: emptyDir, viewerRole: "admin" });
  assertNull("R1 admin viewer no super label", r.roleLabel);
  assertEq("R1 subjectRole", r.subjectRole, "super_admin");
}

// R2 — lookup super_admin, viewer super_admin → Super Admin
{
  const r = resolveAuthorContact("Dawid", { directory: emptyDir, viewerRole: "super_admin" });
  assertEq("R2 super viewer super label", r.roleLabel, "Super Admin");
}

// R3 — noteRole inspector, viewer admin → Inspektor
{
  const r = resolveAuthorContact("Szymon Szóstak", {
    directory: emptyDir,
    noteRole: "inspector",
    viewerRole: "admin",
  });
  assertEq("R3 admin sees inspector", r.roleLabel, "Inspektor");
}

// R4 — noteRole admin, actor moderator (Paweł), viewer admin → null
{
  const r = resolveAuthorContact("Paweł", { directory: emptyDir, noteRole: "admin", viewerRole: "admin" });
  assertNull("R4 admin hides moderator reply", r.roleLabel);
}

// R5 — reportAdminRole moderator, viewer inspector → null
{
  const r = resolveAuthorContact("Paweł", {
    directory: emptyDir,
    reportAdminRole: "moderator",
    viewerRole: "inspector",
  });
  assertNull("R5 inspector hides moderator report", r.roleLabel);
}

// R6 — reportAdminRole worker, viewer admin → Pracownik
{
  const r = resolveAuthorContact("Jan Kowalski", {
    directory: [{ name: "Jan Kowalski", phone: "+48 111 222 333" }],
    reportAdminRole: "worker",
    viewerRole: "admin",
  });
  assertEq("R6 worker label", r.roleLabel, "Pracownik");
  assertEq("R6 kind worker", r.kind, "worker");
}

log("\n--- T: surface predicates ---\n");

assertEq("T-WM-1 admin×inspector note", visibleRoleLabelForViewer("admin", "inspector"), "Inspektor");
assertNull("T-WM-2 admin×moderator", visibleRoleLabelForViewer("admin", "moderator"));
assertEq("T-BIL-1 mod×inspector", visibleRoleLabelForViewer("moderator", "inspector"), "Inspektor");
assertNull("T-BIL-2 admin×admin", visibleRoleLabelForViewer("admin", "admin"));
assertEq("T-PROP-1 admin×inspector proposal", visibleRoleLabelForViewer("admin", "inspector"), "Inspektor");
assertNull("T-FED-1 admin×super actor", visibleRoleLabelForViewer("admin", "super_admin"));
assertNull("T-REP-1 insp×moderator report", visibleRoleLabelForViewer("inspector", "moderator"));
assertNull("T-SMS-1 admin×super sender", visibleRoleLabelForViewer("admin", "super_admin", { variant: "full" }));
assertEq(
  "T-SMS-2 super×moderator sender",
  visibleRoleLabelForViewer("super_admin", "moderator", { variant: "full" }),
  "Moderator",
);
assert("T-TOP-1 admin no tooltip role", !topbarRoleTooltipVisible("admin"));
assert("T-TOP-2 super tooltip role", topbarRoleTooltipVisible("super_admin"));
assertNull("T-RCV-1 admin×admin note", visibleRoleLabelForViewer("admin", "admin"));

const pass = Object.values(results).filter((v) => v === "PASS").length;
const fail = Object.values(results).filter((v) => v === "FAIL").length;
log(`\n=== ${pass}/${pass + fail} PASS ===`);
if (fail > 0) process.exit(1);

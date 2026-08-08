/**
 * TENDER-MODULE-ENABLEMENT-01 — master gate modułu Przetargi (AppSettings).
 * Run: npx vite-node scripts/test-tender-module-enablement-01.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { adminCanViewTendersTab } from "../src/lib/admin-auth.ts";
import {
  defaultAppSettings,
  mergeAppSettings,
  mergeTendersTabForStaffEnabled,
} from "../src/lib/app-settings.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

console.log("=== TENDER-MODULE-ENABLEMENT-01 ===\n");

const off = defaultAppSettings();
const on = { ...off, tendersTabForStaffEnabled: true };

// 1–6: AppSettings ACL matrix
assert("1 OFF admin hidden", adminCanViewTendersTab("admin", off) === false);
assert("2 OFF moderator hidden", adminCanViewTendersTab("moderator", off) === false);
assert("3 OFF super_admin visible", adminCanViewTendersTab("super_admin", off) === true);
assert("4 ON admin visible", adminCanViewTendersTab("admin", on) === true);
assert("5 ON moderator visible", adminCanViewTendersTab("moderator", on) === true);
assert("6 ON super_admin visible", adminCanViewTendersTab("super_admin", on) === true);

// Safe default = current prod (staff OFF)
assert("default tendersTabForStaffEnabled false", off.tendersTabForStaffEnabled === false);

// Merge cloud wins
assert(
  "merge remote ON",
  mergeTendersTabForStaffEnabled({ tendersTabForStaffEnabled: true }, off) === true,
);
assert(
  "merge remote OFF beats local ON",
  mergeTendersTabForStaffEnabled({ tendersTabForStaffEnabled: false }, on) === false,
);
assert(
  "mergeAppSettings preserves field",
  mergeAppSettings({ tendersTabForStaffEnabled: true }, off).tendersTabForStaffEnabled === true,
);

// Inspector never (RBAC unchanged)
assert("inspector OFF hidden", adminCanViewTendersTab("inspector", off) === false);
assert("inspector ON ignored", adminCanViewTendersTab("inspector", on) === false);

// Source wiring (route / nav / settings UX)
const appTsx = readSrc("src/app/App.tsx");
const modal = readSrc("src/app/AdminSettingsModal.tsx");
const auth = readSrc("src/lib/admin-auth.ts");
const settings = readSrc("src/lib/app-settings.ts");
const nav = readSrc("src/app/admin/admin-nav.ts");

assert("App uses adminCanViewTendersTab", appTsx.includes("adminCanViewTendersTab"));
assert("App guards view===tenders when !canViewTendersNav", /view !== "tenders" \|\| canViewTendersNav/.test(appTsx) || /view === "tenders" && !canViewTendersNav/.test(appTsx));
assert("App V4 path checks canViewTendersNav", /isTenderV4Path[\s\S]*canViewTendersNav/.test(appTsx));
assert("App goToView blocks tenders without gate", /v === "tenders" && !canViewTendersNav/.test(appTsx));
assert("App openTenderById checks canViewTendersNav", /openTenderById[\s\S]*canViewTendersNav/.test(appTsx));
assert("nav buildAdminNavItems gates tenders", nav.includes("canViewTendersNav"));

assert("Moduły section exists", modal.includes("Moduły"));
assert("Przetargi toggle label in Moduły", /Moduły[\s\S]*?>Przetargi</.test(modal));
assert("toggle writes tendersTabForStaffEnabled", modal.includes("tendersTabForStaffEnabled"));
assert("no duplicate Funkcje label for Przetargi staff", !modal.includes("Zakładka Przetargi dla administratorów"));

// 9–11: no Expert/Chief/Session/Validation/DW/Persist flag as module master
assert("settings no kw-chief-orchestrator-session", !settings.includes("kw-chief-orchestrator-session"));
assert("settings no kw-decision-workspace as field", !/decisionWorkspaceEnabled|kw-decision-workspace/.test(settings));
assert("auth gate uses tendersTabForStaffEnabled", auth.includes("tendersTabForStaffEnabled"));
assert("auth super_admin always true first", /adminCanViewTendersTab[\s\S]*role === "super_admin"\) return true/.test(auth));

// Other modules flags untouched presence
assert("wmRysunkiEnabled still present", settings.includes("wmRysunkiEnabled"));
assert("wmWorkerSketchEnabled still present", settings.includes("wmWorkerSketchEnabled"));
assert("instructionsForAdminEnabled still present", settings.includes("instructionsForAdminEnabled"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);

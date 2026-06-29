/**
 * SUPER ADMIN ACL — Instrukcja + Zmiany (guide/changelog).
 * Run: npx vite-node scripts/test-admin-guide-acl.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  adminCanViewInstructions,
  adminCanViewChanges,
} from "../src/lib/admin-auth.ts";
import {
  defaultAppSettings,
  mergeAppSettings,
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

console.log("=== ADMIN GUIDE ACL (Instrukcja + Zmiany) ===\n");

const base = defaultAppSettings();

// --- ACL: Instrukcja ---
assert("instructions super_admin always", adminCanViewInstructions("super_admin", base) === true);
assert("instructions admin default off", adminCanViewInstructions("admin", base) === false);
assert(
  "instructions admin flag on",
  adminCanViewInstructions("admin", { ...base, instructionsForAdminEnabled: true }) === true,
);
assert("instructions moderator hidden", adminCanViewInstructions("moderator", base) === false);
assert(
  "instructions moderator flag ignored",
  adminCanViewInstructions("moderator", { ...base, instructionsForAdminEnabled: true }) === false,
);
assert("instructions inspector hidden", adminCanViewInstructions("inspector", base) === false);

// --- ACL: Zmiany ---
assert("changes super_admin always", adminCanViewChanges("super_admin", base) === true);
assert("changes admin default off", adminCanViewChanges("admin", base) === false);
assert(
  "changes admin flag on",
  adminCanViewChanges("admin", { ...base, changesForAdminEnabled: true }) === true,
);
assert("changes moderator hidden", adminCanViewChanges("moderator", base) === false);
assert(
  "changes moderator flag ignored",
  adminCanViewChanges("moderator", { ...base, changesForAdminEnabled: true }) === false,
);
assert("changes inspector hidden", adminCanViewChanges("inspector", base) === false);

// --- AppSettings merge ---
const mergedInstrOn = mergeAppSettings({ instructionsForAdminEnabled: true }, base);
assert("merge instructions remote true", mergedInstrOn.instructionsForAdminEnabled === true);
const mergedInstrOff = mergeAppSettings(
  { instructionsForAdminEnabled: false },
  { ...base, instructionsForAdminEnabled: true },
);
assert("merge instructions remote false wins", mergedInstrOff.instructionsForAdminEnabled === false);

const mergedChgOn = mergeAppSettings({ changesForAdminEnabled: true }, base);
assert("merge changes remote true", mergedChgOn.changesForAdminEnabled === true);
const mergedChgOff = mergeAppSettings(
  { changesForAdminEnabled: false },
  { ...base, changesForAdminEnabled: true },
);
assert("merge changes remote false wins", mergedChgOff.changesForAdminEnabled === false);

// --- Static navigation wiring ---
const adminNav = readSrc("src/app/admin/admin-nav.ts");
assert("nav View includes changelog", adminNav.includes('"changelog"'));
assert("nav conditional guide item", adminNav.includes('canViewInstructionsNav'));
assert("nav conditional changelog item", adminNav.includes('canViewChangesNav'));
assert("nav no combined Zmiany/Instrukcja label", !adminNav.includes("Zmiany/Instrukcja"));

const appTsx = readSrc("src/app/App.tsx");
assert("App redirect guide denied", appTsx.includes('view === "guide" && !canViewInstructions'));
assert("App redirect changelog denied", appTsx.includes('view === "changelog" && !canViewChanges'));
assert("App imports ACL helpers", appTsx.includes("adminCanViewInstructions"));
assert("App imports adminCanViewChanges", appTsx.includes("adminCanViewChanges"));

const router = readSrc("src/app/admin/AdminViewRouter.tsx");
assert("router guide gated", router.includes('view === "guide" && canViewInstructions'));
assert("router changelog gated", router.includes('view === "changelog" && canViewChanges'));
assert("router GuideView mode instructions", router.includes('mode="instructions"'));
assert("router GuideView mode changes", router.includes('mode="changes"'));

const settingsModal = readSrc("src/app/AdminSettingsModal.tsx");
assert("settings instructions checkbox", settingsModal.includes("instructionsForAdminEnabled"));
assert("settings changes checkbox", settingsModal.includes("changesForAdminEnabled"));
assert("settings super admin only", settingsModal.includes("super_admin"));

const appSettings = readSrc("src/lib/app-settings.ts");
assert("app-settings default instructions false", appSettings.includes("instructionsForAdminEnabled: false"));
assert("app-settings default changes false", appSettings.includes("changesForAdminEnabled: false"));
assert("app-settings merge instructions", appSettings.includes("mergeInstructionsForAdminEnabled"));
assert("app-settings merge changes", appSettings.includes("mergeChangesForAdminEnabled"));

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);

/**
 * IK ROLE ACTIVATION — role-based IK access.
 * Run: npx vite-node scripts/test-ik-role-activation.mjs
 *
 * ZERO production KV write · ZERO Research HTTP · ZERO settings write.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminCanUseIntelligentEstimator } from "../src/lib/admin-auth.ts";
import {
  defaultAppSettings,
  mergeAppSettings,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

console.log("=== IK ROLE ACTIVATION ===\n");

const base = defaultAppSettings();
const leftoverOff = { ...base, ikEntryEnabled: false };
const adminOn = { ...base, ikEntryForAdminEnabled: true };
const modOn = { ...base, ikEntryForModeratorEnabled: true };
const bothOn = { ...base, ikEntryForAdminEnabled: true, ikEntryForModeratorEnabled: true };
const missingFlags = {
  ...base,
  ikEntryForAdminEnabled: undefined,
  ikEntryForModeratorEnabled: undefined,
};

assert("T01 super_admin defaults → TRUE", adminCanUseIntelligentEstimator("super_admin", base) === true);
assert(
  "T02 super_admin + ikEntryEnabled=false + flags false → TRUE",
  adminCanUseIntelligentEstimator("super_admin", leftoverOff) === true,
);
assert("T03 admin missing/default → FALSE", adminCanUseIntelligentEstimator("admin", base) === false);
assert(
  "T04 admin explicit false → FALSE",
  adminCanUseIntelligentEstimator("admin", { ...base, ikEntryForAdminEnabled: false }) === false,
);
assert("T05 admin true → TRUE", adminCanUseIntelligentEstimator("admin", adminOn) === true);
assert("T06 moderator missing/default → FALSE", adminCanUseIntelligentEstimator("moderator", base) === false);
assert(
  "T07 moderator explicit false → FALSE",
  adminCanUseIntelligentEstimator("moderator", { ...base, ikEntryForModeratorEnabled: false }) === false,
);
assert("T08 moderator true → TRUE", adminCanUseIntelligentEstimator("moderator", modOn) === true);
assert("T09 inspector both flags true → FALSE", adminCanUseIntelligentEstimator("inspector", bothOn) === false);
assert(
  "T10 worker-like unknown role → FALSE",
  adminCanUseIntelligentEstimator(/** @type {any} */ ("worker"), bothOn) === false,
);

forceIkEntryEnabledForTests(null);
assert("T11 no session (force null) → FALSE", isIkEntryEnabled() === false);

assert(
  "T12 admin flag does not enable moderator",
  adminCanUseIntelligentEstimator("moderator", adminOn) === false,
);
assert(
  "T13 moderator flag does not enable admin",
  adminCanUseIntelligentEstimator("admin", modOn) === false,
);

const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const topbarSrc = readSrc("src/app/admin/AdminTopbar.tsx");
const appSrc = readSrc("src/app/App.tsx");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const authSrc = readSrc("src/lib/admin-auth.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const laborSrc = readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts");
const matSrc = readSrc("src/lib/intelligent-estimator/ik-material-expert.ts");
const classifySrc = readSrc("src/lib/intelligent-estimator/classification-gate.ts");

assert("T14 no Super Admin IK self-toggle", !/Włącz IK dla Super Admina/.test(adminSrc));
assert("T14 no global IK checkbox write", !/ikEntryEnabled:\s*e\.target\.checked/.test(adminSrc));
assert("T14 no data-ik-entry-toggle", !/data-ik-entry-toggle/.test(adminSrc));
assert("T14 admin toggle present", /data-ik-entry-for-admin-toggle/.test(adminSrc));
assert("T14 moderator toggle present", /data-ik-entry-for-moderator-toggle/.test(adminSrc));
assert("T14 heading Inteligentny Kosztorysant", /Inteligentny Kosztorysant/.test(adminSrc));
assert("T14 no Research checkbox", !/data-ik-labor-research-toggle/.test(adminSrc) && !/data-ik-material-research-toggle/.test(adminSrc));
assert("T14 P5 AUTO kept", /option value="AUTO"/.test(adminSrc));
assert(
  "T14 settings gear Super Admin only",
  /adminIsSuperAdmin\(adminSession\.role\)/.test(topbarSrc) && /onOpenAdminSettings/.test(topbarSrc),
);
assert(
  "T14 App open settings Super Admin guard",
  /adminIsSuperAdmin\(adminSession\.role\)/.test(appSrc),
);

forceIkEntryEnabledForTests(true);
assert("T15 force true → TRUE", isIkEntryEnabled() === true);
forceIkEntryEnabledForTests(false);
assert("T15 force false → FALSE", isIkEntryEnabled() === false);
forceIkEntryEnabledForTests(null);
assert("T15 force null restores no-session FALSE", isIkEntryEnabled() === false);

assert("T16 leftover key remains in AppSettings", /ikEntryEnabled: boolean/.test(settingsSrc));
assert("T16 adapter imports admin-auth", /from \"@\/lib\/admin-auth\"/.test(flagSrc));
assert("T16 admin-auth does not import ik-entry-flag", !/ik-entry-flag/.test(authSrc));
assert("T16 admin-auth does not import app-settings", !/app-settings/.test(authSrc));
assert("T16 helper does not read settings.ikEntryEnabled", !/settings\.ikEntryEnabled/.test(authSrc));
assert(
  "T16 adapter does not AND leftover KV",
  !/loadAppSettingsLocal\(\)\.ikEntryEnabled/.test(flagSrc),
);
assert("T16 defaults admin/moderator OFF", base.ikEntryForAdminEnabled === false && base.ikEntryForModeratorEnabled === false);
assert("T16 tendersTabForStaffEnabled unchanged default", base.tendersTabForStaffEnabled === false);

const mergedMissing = mergeAppSettings({}, base);
assert("T16 merge missing flags stay false", mergedMissing.ikEntryForAdminEnabled === false && mergedMissing.ikEntryForModeratorEnabled === false);
const mergedRemoteFalse = mergeAppSettings(
  { ikEntryForAdminEnabled: false, ikEntryForModeratorEnabled: false },
  { ...base, ikEntryForAdminEnabled: true, ikEntryForModeratorEnabled: true },
);
assert("T16 remote false wins", mergedRemoteFalse.ikEntryForAdminEnabled === false && mergedRemoteFalse.ikEntryForModeratorEnabled === false);
assert("T16 leftover false does not affect helper", adminCanUseIntelligentEstimator("super_admin", leftoverOff) === true);
assert(
  "T16 missing flags object → admin/moderator FALSE",
  adminCanUseIntelligentEstimator("admin", missingFlags) === false
    && adminCanUseIntelligentEstimator("moderator", missingFlags) === false,
);

assert("T17 HIT CURRENT skips pending", /rateStatus = "CURRENT_HIT"/.test(laborSrc));
assert("T18 COMPOUND hold zero labor research", /case \"COMPOUND\"[\s\S]*allowLaborResearch: false/.test(classifySrc));
assert("T18 UNKNOWN hold zero research", /case \"UNKNOWN\"[\s\S]*allowLaborResearch: false/.test(classifySrc));
assert("T18 F1 plane MATERIAL && bucket MATERIAL", /return plane === \"MATERIAL\" && bucket === \"MATERIAL\"/.test(matSrc));
assert("T19 mat.inv.* hard-forbid", /isInvoicePurchaseMaterialKey/.test(matSrc));
assert("T16 no ikAutoResearch", !/ikAutoResearch|ikResearchOnMiss/.test(settingsSrc) && !/ikAutoResearch|ikResearchOnMiss/.test(flagSrc));

forceIkEntryEnabledForTests(null);

console.log(`\nIK ROLE ACTIVATION: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);

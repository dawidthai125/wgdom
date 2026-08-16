/**
 * IK-MIGRATION-01 P0 — Design Freeze implementation contract (A–H).
 * Run: npx vite-node scripts/test-ik-migration-01-p0-implementation.mjs
 *
 * REUSE: flag / DetailPage seam / EC / NG-10 already landed under ikEntryEnabled OFF.
 * This suite locks P0 AD + Truth / Chief≠D / mobile smoke.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultAppSettings,
  mergeAppSettings,
  mergeIkEntryEnabled,
  mergeExpertAiDecydentEnabled,
  APP_SETTINGS_KEY,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";
import {
  canPresentAsVerifiedFact,
  enforceIkConversationTruth,
  hasValidIkSourceRef,
  toIkConversationEvent,
  IK_CONVERSATION_SOURCE_REF_KINDS,
} from "../src/lib/intelligent-estimator/ik-conversation-event.ts";

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

const mem = new Map();
globalThis.localStorage = {
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(String(k), String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};

function reset() {
  mem.clear();
  forceIkEntryEnabledForTests(null);
}

function setSettings(patch) {
  const base = defaultAppSettings();
  mem.set(APP_SETTINGS_KEY, JSON.stringify({ ...base, ...patch }));
}

function baseItem(overrides = {}) {
  return {
    id: "08def45d-ead6-5db8-962b-120001d33d37",
    tenderId: "08def45d-ead6-5db8-962b-120001d33d37",
    noticeNumber: "2026/BZP 00376804",
    title: "ZZK pustostany",
    status: "seen",
    updatedAt: new Date().toISOString(),
    bzpDocuments: [],
    ...overrides,
  };
}

console.log("=== IK-MIGRATION-01 P0 IMPLEMENTATION ===\n");

// --- A: ikEntryEnabled OFF → no regression ---
reset();
assert("A default ikEntryEnabled false", defaultAppSettings().ikEntryEnabled === false);
assert("A default D false", defaultAppSettings().expertAiDecydentEnabled === false);
assert("A isIkEntryEnabled OFF", isIkEntryEnabled() === false);
assert("A first screen ng10_gate", resolveIkDetailFirstScreen(false) === "ng10_gate");

const detailSrc = readSrc("src/app/TenderDetailPage.tsx");
assert("A DetailPage still imports TenderAutonomousGate", /TenderAutonomousGate/.test(detailSrc));
assert(
  "A OFF path wraps Gate when not ik_entry",
  /if \(ikFirstScreen === "ik_entry"\)[\s\S]*return detailWorkspace;[\s\S]*TenderAutonomousGate/.test(detailSrc),
);

// --- B: IK ON → entry available ---
reset();
setSettings({ ikEntryEnabled: true });
assert("B AppSettings ON → isIkEntryEnabled", isIkEntryEnabled() === true);
assert("B first screen ik_entry", resolveIkDetailFirstScreen(true) === "ik_entry");
assert("B DetailPage mounts IkEntryHost", /IkEntryHost/.test(detailSrc));
assert("B DetailPage uses resolveIkDetailFirstScreen", /resolveIkDetailFirstScreen/.test(detailSrc));
assert("B IkEntryHost reuses ExpertConversationSurface", /ExpertConversationSurface/.test(readSrc("src/app/intelligent-estimator/IkEntryHost.tsx")));

// --- C: IK ON does not auto-enable D ---
reset();
setSettings({ ikEntryEnabled: true, expertAiDecydentEnabled: false });
assert("C IK ON leaves D false", isIkEntryEnabled() === true);
assert(
  "C local D still false",
  JSON.parse(mem.get(APP_SETTINGS_KEY)).expertAiDecydentEnabled !== true,
);
const mergedIkOnly = mergeAppSettings(
  { ikEntryEnabled: true },
  defaultAppSettings(),
);
assert("C merge IK ON does not flip D", mergedIkOnly.expertAiDecydentEnabled === false);
assert("C merge IK ON sets IK", mergedIkOnly.ikEntryEnabled === true);

const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
assert("C flag module does not read D", !/expertAiDecydentEnabled/.test(flagSrc));

// --- D / E: IkConversationEvent + sourceRef truth ---
assert("D sourceRef kinds frozen", IK_CONVERSATION_SOURCE_REF_KINDS.includes("document"));
assert("D labor_research allowed", IK_CONVERSATION_SOURCE_REF_KINDS.includes("labor_research"));
assert("D candidate allowed", IK_CONVERSATION_SOURCE_REF_KINDS.includes("candidate"));

const doneNoRef = {
  status: "done",
  sourceRef: null,
};
assert("E done without sourceRef ≠ verified", canPresentAsVerifiedFact(doneNoRef) === false);

const doneBadArtifact = {
  status: "done",
  sourceRef: { kind: "document", tenderId: "t1", artifact: null },
};
assert("E done with null artifact ≠ verified", canPresentAsVerifiedFact(doneBadArtifact) === false);

const doneOk = {
  status: "done",
  sourceRef: {
    kind: "document",
    tenderId: "08def45d-ead6-5db8-962b-120001d33d37",
    artifact: { attachmentCount: 2 },
  },
};
assert("D valid sourceRef → verified OK", canPresentAsVerifiedFact(doneOk) === true);
assert("D hasValidIkSourceRef", hasValidIkSourceRef(doneOk.sourceRef) === true);

const enforced = enforceIkConversationTruth([
  {
    id: "documents",
    actorLabelPl: "Dokumenty",
    status: "done",
    statusLabelPl: "gotowe",
    messagePl: "Fake verified",
    detailPl: null,
    offerPricePln: null,
    offerPriceDisplayPl: null,
    iconKey: "flag",
    messageWeight: 10,
    sourceRef: null,
  },
]);
assert("E enforce: done→hold without sourceRef", enforced[0].status === "hold");
assert("E enforce: not presentable as verified", canPresentAsVerifiedFact(enforced[0]) === false);

reset();
const vm = buildIkEntryConversationViewModel(baseItem());
assert("D EC VM visible", vm.visible === true);
assert("D EC has steps", Array.isArray(vm.steps) && vm.steps.length > 0);
const events = vm.steps.map((s) => toIkConversationEvent(s, "2026-08-16T00:00:00.000Z"));
assert("D IkConversationEvent has id", events.every((e) => typeof e.id === "string" && e.id.length > 0));
assert("D IkConversationEvent has at", events.every((e) => e.at === "2026-08-16T00:00:00.000Z"));
assert("D IkConversationEvent has actor", events.every((e) => typeof e.actor === "string"));
assert("D IkConversationEvent has status", events.every((e) => typeof e.status === "string"));
assert("D IkConversationEvent has messagePl", events.every((e) => typeof e.messagePl === "string"));
const doneSteps = vm.steps.filter((s) => s.status === "done");
assert(
  "D all done steps have sourceRef",
  doneSteps.every((s) => hasValidIkSourceRef(s.sourceRef)),
);
assert(
  "E no done step without verified contract",
  doneSteps.every((s) => canPresentAsVerifiedFact(s)),
);

// --- F: NG-10 retained when IK OFF ---
assert("F AppSettings has ikEntryEnabled", /ikEntryEnabled: boolean/.test(readSrc("src/lib/app-settings.ts")));
assert("F Admin toggle present", /data-ik-entry-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx")));
const ng10Files = [
  "src/app/tenders/autonomous/TenderAutonomousGate.tsx",
  "src/lib/tender-autonomous-run-timeline.ts",
  "src/lib/tender-autonomous-run-ux.ts",
  "src/lib/tender-autonomous-run-status.ts",
];
assert(
  "F NG-10 core files retained",
  ng10Files.every((rel) => existsSync(join(root, rel))),
);
reset();
assert("F OFF → ng10_gate first screen", resolveIkDetailFirstScreen(isIkEntryEnabled()) === "ng10_gate");

// --- G: Chief ≠ D ---
const dOnIkOff = mergeAppSettings(
  { expertAiDecydentEnabled: true },
  defaultAppSettings(),
);
assert("G D ON does not enable IK", dOnIkOff.ikEntryEnabled === false);
assert("G D ON sets D", dOnIkOff.expertAiDecydentEnabled === true);
assert(
  "G mergeExpertAiDecydentEnabled independent",
  mergeExpertAiDecydentEnabled({ expertAiDecydentEnabled: true }, defaultAppSettings()) === true,
);
assert(
  "G mergeIkEntryEnabled independent",
  mergeIkEntryEnabled({ ikEntryEnabled: true }, defaultAppSettings()) === true,
);
assert(
  "G DetailPage keeps expertEffective for Dual Outcome",
  /expertEffective/.test(detailSrc) && !/ikEntryOn\s*&&\s*.*expertAiDecydentEnabled/.test(detailSrc),
);

// --- H: mobile basic smoke ---
const surfaceSrc = readSrc("src/app/expert-conversation/ExpertConversationSurface.tsx");
assert("H touch-manipulation present", /touch-manipulation/.test(surfaceSrc));
assert("H min touch target 44px", /min-h-\[44px\]/.test(surfaceSrc));
assert("H scrollable list", /overflow-y-auto/.test(surfaceSrc));
assert("H data-ik-mobile-ready", /data-ik-mobile-ready/.test(surfaceSrc));
assert("H overscroll-contain", /overscroll-contain/.test(surfaceSrc));

// --- No rebuild markers ---
assert("P0 no second TendersModule invent", !existsSync(join(root, "src/app/tenders/TendersModuleIk.tsx")));
assert(
  "P0 conversation has no ATH writer",
  !/serializeAth|writeAth|exportAthFile/.test(readSrc("src/lib/intelligent-estimator/ik-entry-conversation.ts")),
);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

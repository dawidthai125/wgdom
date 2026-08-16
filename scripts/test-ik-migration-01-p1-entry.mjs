/**
 * IK-MIGRATION-01 P1 — IK Entry Shell.
 * Run: npx vite-node scripts/test-ik-migration-01-p1-entry.mjs
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
import { collectIkEntryPipelineFacts } from "../src/lib/intelligent-estimator/ik-entry-pipeline-facts.ts";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";

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

const FORBIDDEN = [
  "wyliczono materiały",
  "wyliczono robociznę",
  "wyliczam materiały",
  "wyliczenie materiałów",
  "oceniam opłacalność",
  "kosztorys gotowy",
  "materiały wyliczone",
];

function blobOf(vm) {
  return vm.steps.map((s) => `${s.messagePl} ${s.detailPl ?? ""}`).join("\n").toLowerCase();
}

console.log("=== IK-MIGRATION-01 P1 ENTRY ===\n");

reset();
const d = defaultAppSettings();
assert("A default ikEntryEnabled true (P10)", d.ikEntryEnabled === true);
assert("A default D false (unchanged)", d.expertAiDecydentEnabled === false);
assert("A isIkEntryEnabled default true (P10)", isIkEntryEnabled() === true);
assert(
  "A first screen default ik_entry",
  resolveIkDetailFirstScreen(isIkEntryEnabled()) === "ik_entry",
);
assert(
  "A resolve OFF → ik_entry",
  resolveIkDetailFirstScreen(false) === "ik_entry",
);

reset();
setSettings({ ikEntryEnabled: true });
assert("B AppSettings ON → isIkEntryEnabled", isIkEntryEnabled() === true);
assert(
  "B first screen ik_entry",
  resolveIkDetailFirstScreen(isIkEntryEnabled()) === "ik_entry",
);

forceIkEntryEnabledForTests(true);
assert("B force ON", isIkEntryEnabled() === true);
forceIkEntryEnabledForTests(false);
assert("B force OFF beats LS ON", isIkEntryEnabled() === false);
forceIkEntryEnabledForTests(null);

assert(
  "B merge remote ON",
  mergeIkEntryEnabled({ ikEntryEnabled: true }, d) === true,
);
assert(
  "B merge remote OFF beats local ON",
  mergeIkEntryEnabled({ ikEntryEnabled: false }, { ...d, ikEntryEnabled: true }) === false,
);
assert(
  "B mergeAppSettings preserves IK field",
  mergeAppSettings({ ikEntryEnabled: true }, d).ikEntryEnabled === true,
);
assert(
  "B mergeAppSettings D independent when only IK set",
  mergeAppSettings({ ikEntryEnabled: true }, d).expertAiDecydentEnabled === false,
);

reset();
setSettings({ expertAiDecydentEnabled: true, ikEntryEnabled: false });
assert("C D ON does not enable IK", isIkEntryEnabled() === false);
assert(
  "C D merge ON leaves IK from local (no flip)",
  mergeExpertAiDecydentEnabled({ expertAiDecydentEnabled: true }, d) === true
    && mergeIkEntryEnabled({ expertAiDecydentEnabled: true }, { ...d, ikEntryEnabled: false }) === false,
);
assert(
  "C merge D ON does not flip IK",
  mergeAppSettings({ expertAiDecydentEnabled: true, ikEntryEnabled: false }, d).ikEntryEnabled === false,
);

const emptyItem = baseItem({
  documentsFetchedAt: "2026-08-01T00:00:00.000Z",
  tenderDossier: null,
  swzAnalysis: null,
});
const emptyFacts = collectIkEntryPipelineFacts(emptyItem);
assert("D BOQ=0 rowCount", emptyFacts.boqRowCount === 0);
assert("D BOQ not_ready", emptyFacts.boqReadiness === "not_ready");
const emptyVm = buildIkEntryConversationViewModel(emptyItem);
assert("D EC visible", emptyVm.visible === true);
assert("D uses ExpertConversation VM steps", emptyVm.steps.length >= 3);
const boqStep = emptyVm.steps.find((s) => s.id === "boq_status");
assert("D BOQ step exists", Boolean(boqStep));
assert(
  "D BOQ status not ready",
  (boqStep?.status === "partial" || boqStep?.status === "gap")
    && /boq not ready|partial|gap/i.test(`${boqStep?.messagePl} ${boqStep?.statusLabelPl}`),
);
const emptyBlob = blobOf(emptyVm);
assert(
  "D no fake costing copy",
  FORBIDDEN.every((s) => !emptyBlob.includes(s)),
);

const docsItem = baseItem({
  bzpDocuments: [
    {
      index: 0,
      documentId: "doc-swz-1",
      filename: "SWZ.pdf",
      contentType: "application/pdf",
      downloadUrl: "https://example.test/swz.pdf",
      isSwzHint: true,
    },
    {
      index: 1,
      documentId: "doc-ath-2",
      filename: "przedmiar.ath",
      contentType: "application/octet-stream",
      downloadUrl: "https://example.test/p.ath",
      isSwzHint: false,
    },
  ],
  swzAnalysis: { implementationDays: 30 },
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar.ath",
      rowCount: 0,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-08-01T00:00:00.000Z",
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-01T00:00:00.000Z" },
    builtAt: "2026-08-01T00:00:00.000Z",
  },
});
const docsVm = buildIkEntryConversationViewModel(docsItem);
const docStep = docsVm.steps.find((s) => s.id === "documents");
const swzStep = docsVm.steps.find((s) => s.id === "swz");
const boqZero = docsVm.steps.find((s) => s.id === "boq_status");
assert("E documents fact sourceRef", Boolean(docStep?.sourceRef?.tenderId) && docStep?.sourceRef?.kind === "document");
assert("E documents event", docStep?.event === "DOCUMENTS_DISCOVERED");
assert("E SWZ sourceRef", Boolean(swzStep?.sourceRef?.tenderId));
assert("E BOQ=0 still PARTIAL", boqZero?.status === "partial");
assert("E all IK steps have sourceRef", docsVm.steps.every((s) => Boolean(s.sourceRef?.tenderId)));
assert(
  "E no fake labor/material",
  FORBIDDEN.every((s) => !blobOf(docsVm).includes(s)),
);

const readyItem = baseItem({
  bzpDocuments: [
    {
      index: 0,
      documentId: "doc-ready",
      filename: "boq.xlsx",
      contentType: "application/vnd.ms-excel",
      downloadUrl: "https://example.test/boq.xlsx",
      isSwzHint: false,
    },
  ],
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "boq.xlsx",
      rowCount: 12,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-08-01T00:00:00.000Z",
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-01T00:00:00.000Z" },
    builtAt: "2026-08-01T00:00:00.000Z",
  },
});
const readyVm = buildIkEntryConversationViewModel(readyItem);
const readyBoq = readyVm.steps.find((s) => s.id === "boq_status");
assert(
  "E BOQ declared rowCount 12 without extracted lines is PARTIAL",
  readyBoq?.status === "partial" && /boq not ready|partial/i.test(`${readyBoq?.messagePl} ${readyBoq?.statusLabelPl}`),
);
assert(
  "E BOQ sourceRef detectedRowCount 12",
  readyBoq?.sourceRef?.artifact?.detectedRowCount === 12,
);

const detailSrc = readSrc("src/app/TenderDetailPage.tsx");
assert("F DetailPage Gate absent", !/TenderAutonomousGate/.test(detailSrc));
assert("F DetailPage uses resolveIkDetailFirstScreen", /resolveIkDetailFirstScreen/.test(detailSrc));
assert("F DetailPage mounts IkEntryHost", /IkEntryHost/.test(detailSrc));
assert(
  "F IK host present · Gate absent (P10)",
  /IkEntryHost/.test(detailSrc) && !/TenderAutonomousGate/.test(detailSrc),
);
assert("F Dual Outcome helper untouched in DetailPage (expertEffective kept)", /isExpertAiRuntimeEffective/.test(detailSrc));

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
assert("F IkEntryHost reuses ExpertConversationSurface", /ExpertConversationSurface/.test(hostSrc));
assert("F IkEntryHost has data-ik-entry-host", /data-ik-entry-host/.test(hostSrc));
assert("R1 IK_ENTRY_SHELL_AUTO_INGEST = false (compile default)", /IK_ENTRY_SHELL_AUTO_INGEST\s*=\s*false/.test(hostSrc));
assert("R1 IK_ENTRY_SHELL_EXECUTE_RESEARCH = false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));
assert("R1 IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(hostSrc));
assert("R1 IK_ENTRY_SHELL_IDENTITY_COVERAGE = false (compile default)", /IK_ENTRY_SHELL_IDENTITY_COVERAGE\s*=\s*false/.test(hostSrc));
assert("R1 no executeResearch: true literal", !/executeResearch:\s*true/.test(hostSrc));
assert("R1 research uses explicit P5/P6 mode flags",
  /executeResearch:\s*p5ResearchOn === true/.test(hostSrc)
  && /executeResearch:\s*p6ResearchOn === true/.test(hostSrc));
assert("R1 EXECUTE_RESEARCH shell const remains false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));
assert(
  "R1 auto-ingest runtime gate (P2)",
  /isIkAutoIngestEnabled/.test(hostSrc) && /if\s*\(\s*!autoIngestOn\s*\)/.test(hostSrc),
);
assert(
  "R1 identity coverage runtime gate (P3)",
  /isIkIdentityCoverageEnabled/.test(hostSrc) && /if\s*\(\s*!identityCoverageOn\s*\)/.test(hostSrc),
);
assert("R1 data-ik-entry-shell", /data-ik-entry-shell/.test(hostSrc));
assert("R1 data-ik-p2-documents-boq marker", /data-ik-p2-documents-boq/.test(hostSrc));
assert("R1 data-ik-p3-identity-coverage marker", /data-ik-p3-identity-coverage/.test(hostSrc));

// Permissions — toggle Super Admin only (app-scoped flag after ON = DF).
const topbarSrc = readSrc("src/app/admin/AdminTopbar.tsx");
assert(
  "C settings gear Super Admin only",
  /adminIsSuperAdmin\(adminSession\.role\)/.test(topbarSrc)
    && /onOpenAdminSettings/.test(topbarSrc),
);
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
assert("C Admin IK toggle present", /data-ik-entry-toggle/.test(adminSrc));
assert("C Admin AUTO_INGEST toggle present", /data-ik-auto-ingest-toggle/.test(adminSrc));
assert("C Admin IDENTITY_COVERAGE toggle present", /data-ik-identity-coverage-toggle/.test(adminSrc));
assert("C default ikAutoIngestEnabled OFF", defaultAppSettings().ikAutoIngestEnabled === false);
assert("C default ikIdentityCoverageEnabled OFF", defaultAppSettings().ikIdentityCoverageEnabled === false);
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
assert(
  "C flag module does not read D",
  !/expertAiDecydentEnabled/.test(flagSrc) && !/isExpertAiRuntimeEffective/.test(flagSrc),
);

const convSrc = readSrc("src/lib/intelligent-estimator/ik-entry-conversation.ts");
assert(
  "F IK conversation does not use NG-10 labels",
  !/AUTONOMOUS_TIMELINE_STEP_LABELS/.test(convSrc)
    && !/AUTONOMOUS_AI_AGENT_LABELS/.test(convSrc)
    && !/TenderAutonomousRunScreen/.test(convSrc),
);

const ng10Files = [
  "src/app/tenders/autonomous/TenderAutonomousGate.tsx",
  "src/app/tenders/autonomous/TenderAutonomousRunScreen.tsx",
  "src/app/tenders/autonomous/TenderAutonomousRunFaq.tsx",
  "src/app/tenders/autonomous/TenderAutonomousOutcomeScreen.tsx",
  "src/lib/tender-autonomous-run-phase.ts",
  "src/lib/tender-autonomous-run-timeline.ts",
  "src/lib/tender-autonomous-run-ux.ts",
  "src/lib/tender-autonomous-run-status.ts",
  "src/lib/tender-autonomous-run-transition.ts",
  "src/lib/tender-autonomous-run-gate-exit.ts",
  "src/lib/tender-autonomous-run-fingerprint.ts",
  "src/lib/tender-autonomous-run-outcome.ts",
  "scripts/test-tender-autonomous-run-phase.mjs",
];
assert("F NG-10 files removed", ng10Files.every((rel) => !existsSync(join(root, rel))));

const settingsSrc = readSrc("src/lib/app-settings.ts");
assert("F AppSettings has ikEntryEnabled", /ikEntryEnabled: boolean/.test(settingsSrc));
assert("F Admin toggle present", /data-ik-entry-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx")));

const noAthWriter = !/serializeAth|writeAth|exportAthFile/.test(convSrc)
  && !/serializeAth|writeAth/.test(hostSrc);
assert("F no ATH writer in P1 files", noAthWriter);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

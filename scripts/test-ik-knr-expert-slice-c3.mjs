/**
 * IK-KNR-EXPERT Slice C3 — host + chrome (T-ROOM-1…30).
 *
 * npx vite-node scripts/test-ik-knr-expert-slice-c3.mjs
 *
 * ZERO mapper / A1 / Research / Owner map / flags / KV · ZERO Hub · ZERO C2 copy edits.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";
import {
  enforceIkConversationTruth,
  hasValidIkSourceRef,
  toIkConversationEvent,
} from "../src/lib/intelligent-estimator/ik-conversation-event.ts";
import { buildIkKnrConversation } from "../src/lib/intelligent-estimator/ik-knr-conversation.ts";

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

function emptyCounts(over = {}) {
  return {
    withBasis: 0,
    withoutBasis: 0,
    recognized: 0,
    candidate: 0,
    hold: 0,
    conflict: 0,
    none: 0,
    resolved: 0,
    ...over,
  };
}

function makeReport(over = {}) {
  return {
    tenderId: "tender-c3",
    status: "COMPLETED",
    inputLineCount: 0,
    outputLineCount: 0,
    counts: emptyCounts(),
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    lines: [],
    examplesHold: [],
    reasons: [],
    ...over,
    counts: emptyCounts(over.counts),
  };
}

function holdExample(lp) {
  return {
    lineId: `hold-${lp}`,
    dwellingId: "d1",
    lp,
    catalogBasis: {
      family: "KNR",
      catalogId: "4-01",
      tableCode: null,
      rawCode: "KNR 4-01",
      display: "KNR 4-01",
      normalizedKey: "KNR|4-01|",
    },
    lineStatus: "HOLD",
    proposedWorkId: null,
    holdReason: "INCOMPLETE_TABLE_CODE",
  };
}

function baseItem(overrides = {}) {
  return {
    id: "tender-c3",
    tenderId: "tender-c3",
    noticeNumber: "2026/BZP C3",
    title: "C3 fixture",
    status: "seen",
    updatedAt: new Date().toISOString(),
    bzpDocuments: [],
    ...overrides,
  };
}

function fakeStep(over = {}) {
  return {
    id: "knr",
    actorLabelPl: "Ekspert od oznaczeń katalogowych",
    status: "done",
    statusLabelPl: "Gotowe",
    messagePl: "x",
    detailPl: null,
    event: "KNR_REPORT",
    offerPricePln: null,
    offerPriceDisplayPl: null,
    iconKey: "flag",
    messageWeight: 1,
    sourceRef: { kind: "evidence", tenderId: "tender-c3", artifact: { n: 1 } },
    ...over,
  };
}

function knrSteps(vm) {
  return vm.steps.filter((s) => String(s.id).startsWith("knr"));
}

function knrCopy(vm) {
  return knrSteps(vm)
    .flatMap((s) => [s.messagePl, s.detailPl, s.statusLabelPl, s.actorLabelPl])
    .filter(Boolean)
    .join("\n");
}

const FORBIDDEN_COPY = [
  /\bidentity\b/i,
  /catalogWorkId/i,
  /catalogBasis/i,
  /knrHint/i,
  /OUR RATE/i,
  /\bbucket\b/i,
  /\bplane\b/i,
  /\bUNKNOWN\b/,
  /\bHOLD\b/,
  /\bcandidate\b/i,
  /\bResearch\b/,
  /\bA1\b/,
  /\bP5\b/,
  /\bP6\b/,
  /\bP7\b/,
  /\bP8\b/,
  /\bmapper\b/i,
  /\bclassifier\b/i,
  /\bSSOT\b/,
  /\bANALYZING\b/,
  /\bCANDIDATE\b/,
  /\bCOMPLETED\b/,
  /\bBLOCKED\b/,
  /\bNONE\b/,
  /\bCONFLICT\b/,
  /\bChief\b/,
  /%/,
  /\bETA\b/i,
  /Analizuję/i,
];

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const chromeSrc = readSrc("src/lib/intelligent-estimator/IkExpertRoomChrome.tsx");
const convSrc = readSrc("src/lib/intelligent-estimator/ik-entry-conversation.ts");
const eventSrc = readSrc("src/lib/intelligent-estimator/ik-conversation-event.ts");
const typesSrc = readSrc("src/lib/expert-conversation-ui/types.ts");
const surfaceSrc = readSrc("src/app/expert-conversation/ExpertConversationSurface.tsx");
const hubSrc = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const c2Src = readSrc("src/lib/intelligent-estimator/ik-knr-conversation.ts");
const labelsSrc = readSrc("src/lib/expert-conversation-ui/labels.ts");

console.log("=== IK-KNR-EXPERT SLICE C3 ===\n");

assert("T-ROOM-1 one host marker", (hostSrc.match(/data-ik-entry-host/g) || []).length === 1);
assert(
  "T-ROOM-2 one Surface in host",
  (hostSrc.match(/<ExpertConversationSurface/g) || []).length === 1,
);
assert("T-ROOM-2 chrome wraps Surface", /IkExpertRoomChrome[\s\S]*ExpertConversationSurface/.test(hostSrc));
assert("T-ROOM-3 no new bus class", !/class IkKnrEventBus/.test(hostSrc + chromeSrc + convSrc));
assert("T-ROOM-3 reuse IkConversationEvent", /toIkConversationEvent/.test(eventSrc));

assert("types knr_lead", /"knr_lead"/.test(typesSrc));
assert("types knr", /\| "knr"/.test(typesSrc) || /"knr"/.test(typesSrc));
assert("types knr_wrap", /"knr_wrap"/.test(typesSrc));
assert("types knr_blocked", /"knr_blocked"/.test(typesSrc));
assert("actor union Knr", /\| "Knr"/.test(eventSrc));
assert("discriminator knr", /"knr" in pkgOrOpts/.test(convSrc));
assert("opts.knr field", /knr\?: IkKnrExpertReport/.test(convSrc));
assert("host useMemo runIkKnrExpert", /useMemo\(\s*\(\)\s*=>[\s\S]*runIkKnrExpert/.test(hostSrc));
{
  const i = hostSrc.indexOf("const knr = useMemo");
  const knrBlock = i >= 0 ? hostSrc.slice(i, i + 450) : "";
  assert("host knr not useEffect", knrBlock.includes("runIkKnrExpert") && !knrBlock.includes("useEffect"), knrBlock.slice(0, 80));
}

const empty = makeReport({
  inputLineCount: 4,
  outputLineCount: 4,
  counts: { none: 4, withoutBasis: 4 },
});
const vmEmpty = buildIkEntryConversationViewModel(baseItem(), { knr: empty });
const emptyKnr = knrSteps(vmEmpty);
assert("T-ROOM-4 opts.knr reaches VM", emptyKnr.length >= 1);
assert("T-ROOM-4 discriminator { knr } not package", emptyKnr.some((s) => s.event === "KNR_LEAD" || s.event === "KNR_WRAP"));
assert("T-ROOM-8 max 3 knr steps", emptyKnr.length <= 3);
assert("T-ROOM-14 withBasis=0 data copy", emptyKnr.some((s) => /Brak oznaczeń katalogowych w danych/.test(s.messagePl)));
assert("T-ROOM-14 not PDF", !/PDF/i.test(knrCopy(vmEmpty)));
assert("T-ROOM-14 not parser", !/parser/i.test(knrCopy(vmEmpty)));

const ids = vmEmpty.steps.map((s) => `${s.event}:${s.id}`);
const boqIdx = ids.findIndex((x) => x.includes("BOQ_STATUS") || x.includes("MASTER_BOQ_READY"));
const knrIdx = ids.findIndex((x) => x.startsWith("KNR_"));
const classIdx = ids.findIndex((x) => x.startsWith("CLASSIFICATION_"));
assert("knr after boq_status", knrIdx > boqIdx && boqIdx >= 0, { boqIdx, knrIdx });
assert("knr before classification or no classification", classIdx < 0 || knrIdx < classIdx);

const holdRep = makeReport({
  inputLineCount: 5,
  outputLineCount: 5,
  counts: { withBasis: 5, recognized: 5, hold: 5 },
  examplesHold: [1, 2, 3, 4].map(holdExample),
});
const vmHold = buildIkEntryConversationViewModel(baseItem(), { knr: holdRep });
const holdKnr = knrSteps(vmHold);
const reportStep = holdKnr.find((s) => s.id === "knr");
const exampleCount = (reportStep?.detailPl || "").split(";").filter(Boolean).length;
assert("T-ROOM-8 COMPLETED 3 steps", holdKnr.length === 3);
assert("T-ROOM-9 max 3 examples", exampleCount <= 3);
assert("T-ROOM-9 no 4th example", exampleCount === 3);

const c2 = buildIkKnrConversation(holdRep);
assert("T-ROOM-6 C2 is step source", holdKnr[0].messagePl === c2.steps[0].messagePl);
assert("T-ROOM-6 C2 wrap copied", holdKnr[2].messagePl === c2.steps[2].messagePl);

for (const s of holdKnr.filter((x) => x.status === "done")) {
  assert("T-ROOM-10 done sourceRef", hasValidIkSourceRef(s.sourceRef), s.id);
}
assert("T-ROOM-11 no hold status on knr steps", holdKnr.every((s) => s.status !== "hold"));

const copyHold = knrCopy(vmHold);
for (const re of FORBIDDEN_COPY) {
  assert(`T-ROOM-13 copy !${re}`, !re.test(copyHold), copyHold);
}
assert("T-ROOM-12 no Analizuję", !/Analizuję/.test(copyHold));
assert("T-ROOM-12 no %", !/%/.test(copyHold));
assert("T-ROOM-12 no ETA", !/\bETA\b/i.test(copyHold));
assert("no assignment copy", !/przypisaliśmy/i.test(copyHold));

const blocked = makeReport({ status: "BLOCKED", reasons: ["MASTER_BOQ_NOT_READY"] });
const vmBlocked = buildIkEntryConversationViewModel(baseItem(), { knr: blocked });
const blockedKnr = knrSteps(vmBlocked);
assert("T-ROOM-15 one blocked step", blockedKnr.length === 1);
assert("T-ROOM-15 blocked status", blockedKnr[0].status === "blocked");
assert("T-ROOM-15 czekam na przedmiar", /Czekam na przedmiar/.test(blockedKnr[0].messagePl));
assert("T-ROOM-15 not fake completed", !/Przejrzałem/.test(knrCopy(vmBlocked)));

const analyzing = makeReport({ status: "ANALYZING" });
const vmAn = buildIkEntryConversationViewModel(baseItem(), { knr: analyzing });
assert("T-ROOM-16 ANALYZING treated blocked", knrSteps(vmAn).every((s) => s.status === "blocked"));
assert("T-ROOM-16 no ANALYZING in UI", !/ANALYZING/.test(knrCopy(vmAn)));

const knrEv = toIkConversationEvent(fakeStep());
assert("T-ROOM-5 actor Knr", knrEv.actor === "Knr");
assert("T-ROOM-16 public toIkConversationEvent", knrEv.actor === "Knr");
assert("T-ROOM-17 KNR label → Knr", knrEv.actor === "Knr");

const leadEv = toIkConversationEvent(fakeStep({
  id: "knr_lead",
  actorLabelPl: "Inteligentny Kosztorysant",
  event: "KNR_LEAD",
}));
assert("T-ROOM-6 kosztorysant not Pricing", leadEv.actor !== "Pricing");
assert("T-ROOM-18 lead not Knr", leadEv.actor !== "Knr");
assert("T-ROOM-18 lead is Chief", leadEv.actor === "Chief");

const laborEv = toIkConversationEvent(fakeStep({ actorLabelPl: "Labor Expert", id: "labor" }));
const matEv = toIkConversationEvent(fakeStep({ actorLabelPl: "Material Expert", id: "material" }));
const chiefEv = toIkConversationEvent(fakeStep({ actorLabelPl: "Chief", id: "chief_start" }));
const priceEv = toIkConversationEvent(fakeStep({ actorLabelPl: "Pricing Expert", id: "pricing" }));
assert("T-ROOM-7 Labor unchanged", laborEv.actor === "Labor");
assert("T-ROOM-7 Material unchanged", matEv.actor === "Material");
assert("T-ROOM-7 Chief unchanged", chiefEv.actor === "Chief");
assert("T-ROOM-7 Pricing unchanged", priceEv.actor === "Pricing");

const enforced = enforceIkConversationTruth([
  fakeStep({ sourceRef: null, status: "done" }),
]);
assert("T-ROOM-19 truth demotes done without ref", enforced[0].status === "hold");

assert("T-ROOM-20 Hub no knr import", !/runIkKnrExpert|buildIkKnrConversation|IkExpertRoomChrome|opts\.knr/.test(hubSrc));
assert("T-ROOM-20 Hub no Knr actor", !/"Knr"/.test(hubSrc));
assert("T-ROOM-30 Surface API { vm }", /export function ExpertConversationSurface\(\{\s*vm,/.test(surfaceSrc));
assert("T-ROOM-30 Surface not edited for knr", !/IkExpertRoomChrome|runIkKnrExpert/.test(surfaceSrc));

assert("T-ROOM-21 no ikKnrEnabled", !/ikKnrEnabled|knrExpertEnabled|ikRoomEnabled/.test(hostSrc + chromeSrc + convSrc + eventSrc));
assert("T-ROOM-22 chrome no localStorage", !/localStorage/.test(chromeSrc));
assert("T-ROOM-22 chrome no AppSettings", !/AppSettings|kw-/.test(chromeSrc));
assert("T-ROOM-28 collapse useState", /useState\(\(\) => !isMobileViewport\(\)\)/.test(chromeSrc));
assert("T-ROOM-26 mobile <768 collapsed", /max-width: 767px/.test(chromeSrc));
assert("T-ROOM-27 mobile 50vh", /max-h-\[50vh\]/.test(chromeSrc));
assert("T-ROOM-29 reduced-motion", /prefersReducedMotion/.test(chromeSrc) && /motion-reduce/.test(chromeSrc));
assert("chrome sticky not fixed", /sticky/.test(chromeSrc) && !/fixed/.test(chromeSrc));
assert("chrome 44px", /min-h-\[44px\]/.test(chromeSrc));
assert("chrome descendant list max-h", /data-expert-conversation-list/.test(chromeSrc));
assert("chrome Brand reuse", /InteligentnyKosztorysantBrand/.test(chromeSrc));
assert("chrome KNR line", /KNR — Ekspert od oznaczeń katalogowych/.test(chromeSrc));
assert("chrome no artifact render", !/JSON\.stringify\(.*artifact/.test(chromeSrc) && !/sourceRef\.artifact/.test(chromeSrc));

assert("T-ROOM-23 chrome no catalogWorkId write", !/catalogWorkId\s*=/.test(chromeSrc + convSrc));
assert("T-ROOM-24 chrome no knrHint write", !/knrHint\s*=/.test(chromeSrc));
assert("T-ROOM-25 chrome no mapper", !/tender-offer-boq-mapping|mapOfferBoqLine/.test(chromeSrc));
assert("T-ROOM-25 chrome no A1", !/classifyEstimatorPricingPlane|classification-gate/.test(chromeSrc));
assert("T-ROOM-25 chrome no Research", !/executeResearch|runIkLaborGapResearch/.test(chromeSrc));
assert("T-ROOM-25 chrome no Owner map", !/applyOwnerKnrMapping|Owner mapping/.test(chromeSrc));
assert("C2 copy file unchanged by C3 contract", /Slice C2/.test(c2Src));
assert("labels.ts has no Knr actor", !/Ekspert od oznaczeń katalogowych/.test(labelsSrc));
assert("actorFromStep stays private", /function actorFromStep/.test(eventSrc) && !/export function actorFromStep/.test(eventSrc));
assert("host one chrome", (hostSrc.match(/<IkExpertRoomChrome/g) || []).length === 1);

console.log(`\nC3 ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

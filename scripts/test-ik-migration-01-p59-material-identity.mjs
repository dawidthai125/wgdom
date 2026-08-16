/**
 * IK-MIGRATION-01 P5.9 — Material identity Owner norm / product map (IDENTITY ONLY).
 * Run: npx vite-node scripts/test-ik-migration-01-p59-material-identity.mjs
 *
 * A–Q: TechnologyPack reuse · provenance · no invent · product map · gaps · integrity · no pricing.
 */
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  runIkMaterialIdentityP59,
  classifyIkMaterialIdentityP59,
  buildIkEntryConversationViewModel,
  P59_ZZK_FOCUS_LINE_SPECS,
  P59_FOCUS_WORK_ZAWOR,
  P59_FOCUS_WORK_ZAPRAWIANIE,
} from "../src/lib/intelligent-estimator/index.ts";
import { resolveDemandProductIdentityExact } from "../src/lib/pricing-expert/material-market-map.ts";
import {
  countWave1RegisteredMaterialsPacks,
  getWave1MaterialsRequiredPendingRow,
  isWave1MaterialsRequiredPending,
  listWave1RegisteredMaterialsPacks,
  WAVE1_MATERIALS_REQUIRED_PENDING,
} from "../src/lib/tender-position-cost/wave1-materials-required.ts";
import { findActiveTechnologyPacksForWorkId } from "../src/lib/tender-position-cost/bom-technology-adapter.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
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

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  return { ok: true, json: async () => ({}), text: async () => "" };
};

// --- A. existing TechnologyPack reuse (count stays 0 — nothing trusted to register)
const packsBefore = countWave1RegisteredMaterialsPacks();
assert("A packs before = 0", packsBefore === 0, packsBefore);
assert(
  "A listWave1RegisteredMaterialsPacks empty",
  listWave1RegisteredMaterialsPacks().length === 0,
);
assert(
  "A no active pack for zaprawianie",
  findActiveTechnologyPacksForWorkId(P59_FOCUS_WORK_ZAPRAWIANIE, []).length === 0,
);

// --- B/C provenance of missing fields (folia remains pending; zaprawianie P5.11 out)
const foliaRow = getWave1MaterialsRequiredPendingRow("cc-p0c-w1-zabezpieczenie-folia");
assert("B folia pending row exists", Boolean(foliaRow));
assert(
  "B missing includes materialKey",
  foliaRow?.missing.includes("materialKey") === true,
  foliaRow?.missing,
);
assert(
  "C missing includes qtyFactor",
  foliaRow?.missing.includes("qtyFactor") === true,
  foliaRow?.missing,
);
assert(
  "B/C pending list does NOT contain zaprawianie (P5.11)",
  !WAVE1_MATERIALS_REQUIRED_PENDING.some((r) => r.workId === P59_FOCUS_WORK_ZAPRAWIANIE),
);

// --- D no invented norm · P5.11 LABOR plane
const zapClass = classifyIkMaterialIdentityP59({
  workId: P59_FOCUS_WORK_ZAPRAWIANIE,
  namePl: "Zaprawianie bruzd o szer. do 100 mm",
  unit: "m",
});
assert("D zaprawianie LABOR_NO_MATERIAL_COMPONENT", zapClass.outcome === "LABOR_NO_MATERIAL_COMPONENT");
assert("D no materialIdentity invented", zapClass.materialIdentity === null);

// --- E existing product mapping (paint proves path works)
const paintExact = resolveDemandProductIdentityExact({
  materialKey: "mat.farba_lateksowa_wewnetrzna",
});
assert("E existing paint identity", paintExact?.materialKey === "mat.farba_lateksowa_wewnetrzna");
const paintClass = classifyIkMaterialIdentityP59({
  materialKey: "mat.farba_lateksowa_wewnetrzna",
  workId: paintExact?.catalogWorkId ?? null,
});
assert("E paint TRUSTED", paintClass.outcome === "TRUSTED_MATERIAL_IDENTITY");

// --- F ambiguous: no silent pick from description alone for zawór
const zaworExact = resolveDemandProductIdentityExact({
  catalogWorkId: P59_FOCUS_WORK_ZAWOR,
  namePl: "Montaż odpowietrzników automatycznych na pionach instalacji C.O. DN 20 mm",
  unit: "szt.",
});
assert("F zawór exact = null (no silent product)", zaworExact === null);

// --- G missing product
const zaworClass = classifyIkMaterialIdentityP59({
  workId: P59_FOCUS_WORK_ZAWOR,
  namePl: "Montaż odpowietrzników automatycznych na pionach instalacji C.O. DN 20 mm",
  unit: "szt.",
});
assert("G PRODUCT_IDENTITY_GAP", zaworClass.outcome === "PRODUCT_IDENTITY_GAP");
assert("G no invented product", zaworClass.materialIdentity === null);

// --- H/I focus report
const report = runIkMaterialIdentityP59({ lines: P59_ZZK_FOCUS_LINE_SPECS });
assert("H/I focus input = 6", report.counts.inputLineCount === 6);
assert("H trusted = 0", report.counts.trustedMaterialIdentity === 0);
assert("I pending = 0 (zaprawianie out)", report.counts.pendingOwnerNorm === 0);
assert("I product gap = 2", report.counts.productIdentityGap === 2);
assert("I labor no material = 4", report.counts.laborNoMaterialComponent === 4);
assert("I owner review = 0", report.counts.ownerReviewRequired === 0);
assert("H status PARTIAL", report.status === "PARTIAL");

const zaworLines = report.lines.filter((l) => l.workId === P59_FOCUS_WORK_ZAWOR);
const zapLines = report.lines.filter((l) => l.workId === P59_FOCUS_WORK_ZAPRAWIANIE);
assert("I zawór 2/2 GAP", zaworLines.length === 2 && zaworLines.every((l) => l.outcome === "PRODUCT_IDENTITY_GAP"));
assert(
  "I zaprawianie 4/4 LABOR_NO_MATERIAL",
  zapLines.length === 4 && zapLines.every((l) => l.outcome === "LABOR_NO_MATERIAL_COMPONENT"),
);

// --- J/K/L/M/N integrity
for (const spec of P59_ZZK_FOCUS_LINE_SPECS) {
  const row = report.lines.find((l) => l.lineId === spec.lineId);
  assert(`J qty ${spec.lineId}`, row?.quantity === spec.quantity);
  assert(`K unit ${spec.lineId}`, row?.unit === spec.unit);
  assert(`L provenance ${spec.lineId}`, Boolean(row?.provenance));
  assert(`M dwelling ${spec.lineId}`, row?.dwellingId === spec.dwellingId);
  assert(`N branch ${spec.lineId}`, row?.branch === spec.branch);
  assert(`integrity flags ${spec.lineId}`, row?.quantityUnchanged && row?.sourceUnitUnchanged && row?.dwellingPreserved && row?.branchPreserved);
}

// --- O/P/Q no pricing / research / auto-Accept
assert("O pricing=false", report.pricing === false);
assert("P research=false", report.research === false);
assert("Q autoAccept=false", report.autoAccept === false);
assert("O invent keys=0", report.counts.inventedMaterialKeys === 0);
assert("O invent qty=0", report.counts.inventedQtyFactors === 0);
assert("O invent products=0", report.counts.inventedProducts === 0);
assert("O qty changes=0", report.counts.quantityChanges === 0);
assert("A packs after = before", report.counts.technologyPackAfter === report.counts.technologyPackBefore);
assert("A packs after = 0", report.counts.technologyPackAfter === 0);
assert("fetch not used for identity", liveFetch === 0);

// Wave1 helper
assert("isWave1 pending zaprawianie false", isWave1MaterialsRequiredPending(P59_FOCUS_WORK_ZAPRAWIANIE) === false);
assert("isWave1 not zawór", isWave1MaterialsRequiredPending(P59_FOCUS_WORK_ZAWOR) === false);

// Gate A — NG-10
forceIkEntryEnabledForTests(null);
assert("Gate A ikEntryEnabled true (P10)", defaultAppSettings().ikEntryEnabled === true);
assert(
  "Gate A ik_entry",
  resolveIkDetailFirstScreen({ settings: defaultAppSettings, canOpenIk: false }) === "ik_entry",
);

// EC facts (identity only)
const item = {
  id: "08def45d-ead6-5db8-962b-120001d33d37",
  title: "ZZK P5.9",
  attachments: [],
};
const vm = buildIkEntryConversationViewModel(item, { materialIdentityP59: report });
const events = vm.steps.map((s) => s.event);
assert(
  "EC MATERIAL_IDENTITY_GAP absent for zaprawianie LABOR",
  !events.includes("MATERIAL_IDENTITY_GAP"),
  events.filter((e) => e.includes("MATERIAL") || e.includes("OWNER")),
);
assert(
  "EC OWNER_MATERIAL_MAPPING_REQUIRED",
  events.includes("OWNER_MATERIAL_MAPPING_REQUIRED"),
);
assert(
  "EC no MATERIAL_PRICE / research",
  !events.some((e) => /PRICE_MEMORY|RESEARCH|CANDIDATE|ACCEPT/i.test(e)),
);

console.log(`\nP5.9 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

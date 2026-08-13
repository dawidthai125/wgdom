/**
 * OWNER-INPUT-01 — tender-scoped Owner Rate Input harness.
 *
 * npx vite-node scripts/test-owner-rate-input-01.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OWNER_RATE_INPUT_LS_KEY,
  clearOwnerRateInputStore,
  createOwnerRateQuestion,
  submitOwnerRateAnswer,
  cancelOwnerRateQuestion,
  getCurrentOwnerInput,
  getCurrentAnswer,
  listAnswerHistory,
  getOwnerRateQuestion,
  listOwnerInputsForTender,
  loadOwnerRateInputStore,
  buildPromptPl,
  isInvalidOwnerRatePrompt,
} from "../src/lib/owner-rate-input/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

function reset() {
  clearOwnerRateInputStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

const OWNER = { userId: "owner-dawid", displayName: "Dawid" };

const MODULE_FILES = [
  "src/lib/owner-rate-input/types.ts",
  "src/lib/owner-rate-input/store.ts",
  "src/lib/owner-rate-input/api.ts",
  "src/lib/owner-rate-input/prompt.ts",
  "src/lib/owner-rate-input/gates.ts",
  "src/lib/owner-rate-input/index.ts",
];

const FORBIDDEN_CONST_RE =
  /\b(85|45)\b|PI31|equipmentRateByKey|companyPricePln|OfferBoqLineKind\.Transport|TRANSPORT_GAP|transportGapCount/;

// ——— T1 create question ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "Brak REAL_SOURCE dla koparki w dossier.",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka", quantity: 12, unit: "h" },
  });
  ok("T1 create ok", r.ok === true);
  if (r.ok) {
    eq("T1 status open", r.question.status, "open");
    eq("T1 tenderId", r.question.tenderId, "tender-A");
    eq("T1 domain", r.question.domain, "equipment");
    ok("T1 prompt contextual", r.question.promptPl.includes("Koparka"));
    ok("T1 prompt tender scope", /tego przetargu/i.test(r.question.promptPl));
    ok("T1 store key", OWNER_RATE_INPUT_LS_KEY === "kw-owner-rate-input-v1");
    eq("T1 events len", loadOwnerRateInputStore().events.length, 1);
  }
}

// ——— T2 tenderId required ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "  ",
    domain: "equipment",
    evidenceSummaryPl: "x",
    askedByRole: "chief",
    equipment: { namePl: "Koparka" },
  });
  ok("T2 missing tenderId", r.ok === false && r.reason === "MISSING_TENDER_ID");
}

// ——— T3 domain required / unsupported ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: /** @type {any} */ ("material"),
    evidenceSummaryPl: "x",
    askedByRole: "chief",
    equipment: { namePl: "Koparka" },
  });
  ok("T3 unsupported domain", r.ok === false && r.reason === "UNSUPPORTED_DOMAIN");
}

// ——— T4 equipment payload ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "evidence eq",
    askedByRole: "cost_expert",
    equipment: { namePl: "Żuraw", quantity: 4, unit: "h", equipmentKey: "crane" },
  });
  ok("T4 ok", r.ok);
  if (r.ok) {
    eq("T4 payload domain", r.question.payload.domain, "equipment");
    eq("T4 name", r.question.payload.equipment.namePl, "Żuraw");
    eq("T4 key", r.question.payload.equipment.equipmentKey, "crane");
  }
}

// ——— T5 transport payload ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "transport",
    evidenceSummaryPl: "evidence tr",
    askedByRole: "chief",
    transport: {
      namePl: "wywóz gruzu",
      quantity: 18,
      unit: "m³",
      transportKind: "container_7m3",
      trips: 3,
    },
    signalKind: "logistics_need",
  });
  ok("T5 ok", r.ok);
  if (r.ok) {
    eq("T5 domain", r.question.domain, "transport");
    eq("T5 name", r.question.payload.transport.namePl, "wywóz gruzu");
    ok("T5 prompt doc", r.question.promptPl.startsWith("Dokumentacja wskazuje"));
  }
}

// ——— T6–T9 answer + approval + provenance ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka", quantity: 12, unit: "h" },
  });
  ok("T6 q", q.ok);
  if (q.ok) {
    const a = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "PLN/h",
      approvedBy: OWNER,
    });
    ok("T6 answer ok", a.ok);
    if (a.ok) {
      eq("T6 amount", a.answer.amountPlnNet, 180);
      eq("T7 approvedBy", a.answer.approvedBy.userId, "owner-dawid");
      ok("T7 approvedAt", typeof a.answer.approvedAt === "string" && a.answer.approvedAt.length > 0);
      eq("T8 sourceClass", a.answer.sourceClass, "owner_input");
      eq("T9 scope", a.answer.scope, "tender_only");
      eq("T9 currency", a.answer.currency, "PLN");
      const st = getOwnerRateQuestion({
        tenderId: "tender-A",
        questionId: q.question.questionId,
      });
      eq("T7 status answered", st?.status, "answered");
    }
  }
}

// ——— T10 cross-tender isolation ———
{
  reset();
  const qA = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka", quantity: 12, unit: "h" },
  });
  ok("T10 qA", qA.ok);
  if (qA.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: qA.question.questionId,
      amountPlnNet: 180,
      unit: "PLN/h",
      approvedBy: OWNER,
    });
    const listB = listOwnerInputsForTender({ tenderId: "tender-B" });
    eq("T10 list B empty", listB.length, 0);
    const leak = getCurrentOwnerInput({
      tenderId: "tender-B",
      questionId: qA.question.questionId,
    });
    eq("T10 no leak to B", leak, null);
    const curA = getCurrentOwnerInput({
      tenderId: "tender-A",
      questionId: qA.question.questionId,
    });
    eq("T10 A has 180", curA?.amountPlnNet, 180);
  }
}

// ——— T11 append-only revision 180→200 ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka", unit: "h" },
  });
  ok("T11 q", q.ok);
  if (q.ok) {
    const a1 = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "PLN/h",
      approvedBy: OWNER,
    });
    const a2 = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 200,
      unit: "PLN/h",
      approvedBy: OWNER,
    });
    ok("T11 a1", a1.ok);
    ok("T11 a2", a2.ok);
    if (a1.ok && a2.ok) {
      eq("T11 rev1", a1.answer.revisionN, 1);
      eq("T11 rev2", a2.answer.revisionN, 2);
      eq("T11 supersedes", a2.answer.supersedesAnswerId, a1.answer.answerId);
      const hist = listAnswerHistory({
        tenderId: "tender-A",
        questionId: q.question.questionId,
      });
      eq("T11 hist len", hist.length, 2);
      eq("T11 hist0", hist[0].amountPlnNet, 180);
      eq("T11 hist1", hist[1].amountPlnNet, 200);
      eq(
        "T11 current 200",
        getCurrentAnswer({
          tenderId: "tender-A",
          questionId: q.question.questionId,
        })?.amountPlnNet,
        200,
      );
      // 180 still in store events
      const amounts = loadOwnerRateInputStore()
        .events.filter((e) => e.kind === "answer_submitted")
        .map((e) => e.amountPlnNet);
      ok("T11 both amounts in events", amounts.includes(180) && amounts.includes(200));
    }
  }
}

// ——— T12 cancellation preserves history ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "transport",
    evidenceSummaryPl: "ev",
    askedByRole: "chief",
    transport: { namePl: "kontener 7 m³", quantity: 2, unit: "szt" },
    signalKind: "logistics_need",
  });
  ok("T12 q", q.ok);
  if (q.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 450,
      unit: "PLN/szt",
      approvedBy: OWNER,
    });
    const c = cancelOwnerRateQuestion({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      cancelledBy: OWNER,
    });
    ok("T12 cancel ok", c.ok);
    eq("T12 status cancelled", c.ok ? c.question.status : null, "cancelled");
    const hist = listAnswerHistory({
      tenderId: "tender-A",
      questionId: q.question.questionId,
    });
    eq("T12 hist retained", hist.length, 1);
    eq("T12 hist amount", hist[0].amountPlnNet, 450);
    eq(
      "T12 current null",
      getCurrentAnswer({
        tenderId: "tender-A",
        questionId: q.question.questionId,
      }),
      null,
    );
  }
}

// ——— T13 no answer = null ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T13 q", q.ok);
  if (q.ok) {
    eq(
      "T13 null",
      getCurrentAnswer({
        tenderId: "tender-A",
        questionId: q.question.questionId,
      }),
      null,
    );
  }
}

// ——— T14 no global default ———
{
  reset();
  eq("T14 empty list", listOwnerInputsForTender({ tenderId: "tender-X" }).length, 0);
  eq(
    "T14 null get",
    getCurrentOwnerInput({ tenderId: "tender-X", questionId: "missing" }),
    null,
  );
}

// ——— T15 forbidden fallback constants absent ———
{
  for (const f of MODULE_FILES) {
    const src = readFileSync(join(ROOT, f), "utf8");
    ok(`T15 no forbidden in ${f}`, !FORBIDDEN_CONST_RE.test(src));
  }
  ok("T15 no fetch used", fetchCalls === 0);
}

// ——— T16 noise transport rejected ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "transport",
    evidenceSummaryPl: "noise line",
    askedByRole: "cost_expert",
    transport: { namePl: "transport (noise)" },
    noise: { isNoise: true, noiseKind: "transport" },
  });
  ok("T16 reject", r.ok === false && r.reason === "NOISE_TRANSPORT");
}

// ——— T17 utyl rejected ———
{
  reset();
  for (const signalKind of ["utylizacja", "disposal_only", "TRANSPORT_UTYLIZACJA"]) {
    const r = createOwnerRateQuestion({
      tenderId: "tender-A",
      domain: "transport",
      evidenceSummaryPl: "utyl",
      askedByRole: "chief",
      transport: { namePl: "utylizacja gruzu" },
      signalKind,
    });
    ok(`T17 reject ${signalKind}`, r.ok === false && r.reason === "UTYLIZACJA_ONLY");
  }
}

// ——— T23 equipment without equipmentKey valid ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka bez key", quantity: 12, unit: "h" },
  });
  ok("T23 ok", r.ok);
  if (r.ok) {
    ok(
      "T23 no key",
      r.question.payload.equipment.equipmentKey === undefined,
    );
  }
}

// ——— T24 transport without transportKind valid ———
{
  reset();
  const r = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "transport",
    evidenceSummaryPl: "ev",
    askedByRole: "chief",
    transport: { namePl: "wywóz około 18 m³ gruzu", quantity: 18, unit: "m³" },
    signalKind: "logistics_need",
  });
  ok("T24 ok", r.ok);
  if (r.ok) {
    ok("T24 no kind", r.question.payload.transport.transportKind === undefined);
  }
}

// ——— T25 lookup without tenderId rejected ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T25 q", q.ok);
  if (q.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 100,
      unit: "h",
      approvedBy: OWNER,
    });
    eq(
      "T25 get without tenderId",
      getCurrentOwnerInput({
        tenderId: "",
        questionId: q.question.questionId,
      }),
      null,
    );
    eq("T25 list without tenderId", listOwnerInputsForTender({ tenderId: "" }).length, 0);
  }
}

// ——— T26 domain mismatch (equipment not in transport list) ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T26 q", q.ok);
  const onlyTr = listOwnerInputsForTender({
    tenderId: "tender-A",
    domain: "transport",
  });
  eq("T26 domain filter empty", onlyTr.length, 0);
  const onlyEq = listOwnerInputsForTender({
    tenderId: "tender-A",
    domain: "equipment",
  });
  eq("T26 equipment listed", onlyEq.length, 1);
}

// ——— T27 answer tenderId mismatch ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T27 q", q.ok);
  if (q.ok) {
    const a = submitOwnerRateAnswer({
      tenderId: "tender-B",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "h",
      approvedBy: OWNER,
    });
    ok("T27 tender mismatch", a.ok === false && a.reason === "TENDER_MISMATCH");
  }
}

// ——— T28 answer questionId mismatch ———
{
  reset();
  createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  const a = submitOwnerRateAnswer({
    tenderId: "tender-A",
    questionId: "orq-does-not-exist",
    amountPlnNet: 180,
    unit: "h",
    approvedBy: OWNER,
  });
  ok("T28 question mismatch", a.ok === false && a.reason === "QUESTION_NOT_FOUND");
}

// ——— T29 amount <= 0 ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T29 q", q.ok);
  if (q.ok) {
    const a0 = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 0,
      unit: "h",
      approvedBy: OWNER,
    });
    const an = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: -10,
      unit: "h",
      approvedBy: OWNER,
    });
    ok("T29 zero", a0.ok === false && a0.reason === "INVALID_AMOUNT");
    ok("T29 negative", an.ok === false && an.reason === "INVALID_AMOUNT");
  }
}

// ——— T30 NaN / Infinity ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T30 q", q.ok);
  if (q.ok) {
    const nan = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: Number.NaN,
      unit: "h",
      approvedBy: OWNER,
    });
    const inf = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: Number.POSITIVE_INFINITY,
      unit: "h",
      approvedBy: OWNER,
    });
    ok("T30 NaN", nan.ok === false && nan.reason === "INVALID_AMOUNT");
    ok("T30 Inf", inf.ok === false && inf.reason === "INVALID_AMOUNT");
  }
}

// ——— T31 currency != PLN ———
{
  reset();
  const q = createOwnerRateQuestion({
    tenderId: "tender-A",
    domain: "equipment",
    evidenceSummaryPl: "ev",
    askedByRole: "cost_expert",
    equipment: { namePl: "Koparka" },
  });
  ok("T31 q", q.ok);
  if (q.ok) {
    const a = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "h",
      currency: /** @type {any} */ ("EUR"),
      approvedBy: OWNER,
    });
    ok("T31 currency", a.ok === false && a.reason === "INVALID_CURRENCY");
  }
}

// ——— Extra: generic prompt rejected; cloud key not in cloud-sync ———
{
  ok(
    "TX generic prompt invalid",
    isInvalidOwnerRatePrompt("Podaj cenę transportu."),
  );
  const p = buildPromptPl("equipment", { namePl: "Koparka", quantity: 12, unit: "h" });
  ok("TX build ok", !isInvalidOwnerRatePrompt(p));
  const cloudSrc = readFileSync(join(ROOT, "src/lib/cloud-sync.ts"), "utf8");
  ok(
    "TX cloud-sync no owner-rate key",
    !cloudSrc.includes("kw-owner-rate-input-v1") &&
      !cloudSrc.includes("owner-rate-input"),
  );
  const apiSrc = readFileSync(join(ROOT, "src/lib/owner-rate-input/api.ts"), "utf8");
  ok(
    "TX no key-only lookup exports",
    !/export function getBy/i.test(apiSrc) &&
      !/export function lookupBy/i.test(apiSrc),
  );
}

eq("TFETCH", fetchCalls, 0);

console.log(`\nWYNIK OWNER-INPUT-01 core: ${pass} PASS / ${fail} FAIL`);

if (fail) {
  console.error("STOP — core harness FAIL");
  process.exit(1);
}

// ——— Child regressions T18–T22 ———
function runChild(label, script, expectPass) {
  const out = execSync(`npx vite-node "${script}"`, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const m =
    out.match(/(\d+)\s+PASS\s*\/\s*(\d+)\s+FAIL/) ||
    out.match(/===\s*(\d+)\s+PASS\s*\/\s*(\d+)\s+FAIL/);
  const p = m ? Number(m[1]) : -1;
  const f = m ? Number(m[2]) : -1;
  ok(`${label} exit parse`, p >= 0 && f === 0, { p, f, tail: out.slice(-200) });
  if (expectPass != null) {
    ok(`${label} count ${expectPass}`, p === expectPass, { p, expectPass });
  }
  return { p, f, out };
}

try {
  // Tip SSOT: test-payroll-bootstrap-runtime-parity-b4.mjs reports 13 PASS / 0 FAIL
  // (historical Owner label "16/16" predates current B4 assert count — do not invent payroll tests).
  runChild("T18 Payroll B4", "scripts/test-payroll-bootstrap-runtime-parity-b4.mjs", 13);
  ok(
    "T18 PayrollView out of OI allowlist",
    !MODULE_FILES.includes("src/app/PayrollView.tsx"),
  );
  const payrollDirty = execSync(
    "git diff --name-only HEAD -- src/lib/payroll-cycle.ts src/lib/cloud-sync.ts src/lib/payroll-carry-forward.ts scripts/test-payroll-bootstrap-runtime-parity-b4.mjs scripts/test-p11-bootstrap-payroll.mjs",
    { cwd: ROOT, encoding: "utf8" },
  ).trim();
  ok("T18 payroll prod/scripts clean vs HEAD", payrollDirty === "");
} catch (e) {
  ok("T18 Payroll", false, String(e));
}

try {
  runChild(
    "T19 C-MODE contract",
    "scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-contract.mjs",
    44,
  );
  runChild(
    "T19 C-MODE fallback",
    "scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-fallback-removal.mjs",
    34,
  );
} catch (e) {
  ok("T19 C-MODE", false, String(e));
}

const fPhases = [
  ["T20 F0", "scripts/test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs", 46],
  ["T20 F1", "scripts/test-tender-boq-pricing-rebuild-01-f1-our-rate.mjs", 36],
  ["T20 F2", "scripts/test-tender-boq-pricing-rebuild-01-f2-material.mjs", 62],
  ["T20 F3", "scripts/test-tender-boq-pricing-rebuild-01-f3-bom.mjs", 41],
  ["T20 F4", "scripts/test-tender-boq-pricing-rebuild-01-f4-boq-shadow.mjs", 36],
  ["T20 F5", "scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs", 37],
  ["T20 F6", "scripts/test-tender-boq-pricing-rebuild-01-f6-ath-catalog-audit.mjs", 21],
];

for (const [label, script, n] of fPhases) {
  try {
    runChild(label, script, n);
  } catch (e) {
    ok(label, false, String(e));
  }
}

try {
  runChild("T21 Equipment-01", "scripts/test-wm-tender-equipment-01.mjs", 36);
} catch (e) {
  ok("T21 Equipment-01", false, String(e));
}

try {
  runChild("T22 Transport-01", "scripts/test-wm-tender-transport-01.mjs", 75);
} catch (e) {
  ok("T22 Transport-01", false, String(e));
}

console.log(`\nWYNIK OWNER-INPUT-01 TOTAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);

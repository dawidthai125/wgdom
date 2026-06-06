/**
 * Sprint 20.1A — Post Implementation Smoke Test (functional)
 * Uruchom: npx vite-node scripts/post-smoke-20.1a.mjs
 * Wymaga: npm run build (logo w dist/assets)
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const distAssets = join(__dir, "..", "dist", "assets");
const logoFile = readdirSync(distAssets).find((n) => n.includes("logo-wg-new"));
if (!logoFile) throw new Error("Brak logo w dist/assets — uruchom npm run build");
const logoBuf = readFileSync(join(distAssets, logoFile));
const origFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const s = String(input);
  if (s.includes("logo-wg") || s.includes(".png") || s.startsWith("/src/imports/")) {
    return new Response(logoBuf, { status: 200, headers: { "Content-Type": "image/png" } });
  }
  return origFetch(input, init);
};
globalThis.FileReader = class FileReader {
  result = "";
  onload = null;
  onloadend = null;
  onerror = null;
  readAsDataURL(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((buf) => {
        this.result = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      })
      .catch((err) => this.onerror?.(err));
  }
};

import { defaultDay, buildWeekSnapshot } from "../src/app/app-domain.ts";
import { toPayrollCalcRows } from "../src/app/PayrollView.tsx";
import {
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
  buildPayrollCarryForwardRecord,
  CARRY_FORWARD_LABEL,
} from "../src/lib/payroll-carry-forward.ts";
import {
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  payrollNetDisplayText,
} from "../src/lib/payroll-export.ts";
import { mergeWeekEmployeeRecord, mergeWeekEmployees } from "../src/lib/cloud-sync.ts";
import { nextPayrollWeekRange } from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = nextPayrollWeekRange(W1);
const W3 = nextPayrollWeekRange(W2);

const R = {};

function log(m) {
  console.log(m);
}

function defaultDays(h = 8) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: h === 8 ? "16:00" : "12:00" }]),
  );
}

function makeEmp(id, dirId, name, rate = "50") {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate,
    days: defaultDays(),
    settled: false,
  };
}

function makeDir(id, name) {
  return { id, name, phone: "+48 500 000 001", position: "Murarz", defaultRate: "50", startDate: "2026-01-01", active: true, notes: "" };
}

function rowFor(emp, directory, weekFrom, weekTo, savedWeeks = []) {
  const calc = calcWeekEmployeeForPayroll(emp, { weekFrom, weekTo, savedWeeks, livePayroll: true });
  return toPayrollCalcRows([{ emp, ...calc }], directory, weekFrom, weekTo, savedWeeks)[0];
}

async function pdfText(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const pdf = await getDocument({ data: buf }).promise;
  let t = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    t += c.items.map((it) => ("str" in it ? it.str : "")).join(" ") + " ";
  }
  return t;
}

function pdfHas(text, needle) {
  return text.includes(needle) || text.replace(/\s+/g, "").includes(needle.replace(/\s+/g, ""));
}

async function docxText(blob) {
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const xml = await zip.file("word/document.xml")?.async("string");
  return xml ? xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function totals(rows) {
  return {
    totalWeekHours: rows.reduce((s, r) => s + r.weekHours, 0),
    totalPrevSatHours: rows.reduce((s, r) => s + r.prevSatHours, 0),
    totalHoursAll: rows.reduce((s, r) => s + r.totalHours, 0),
    totalWeekGross: rows.reduce((s, r) => s + r.weekGross, 0),
    totalPrevSatGross: rows.reduce((s, r) => s + r.prevSatGross, 0),
    totalGross: rows.reduce((s, r) => s + r.grossPay, 0),
    totalWeekZaliczka: rows.reduce((s, r) => s + r.weekZaliczka, 0),
    totalPrevSatZaliczka: rows.reduce((s, r) => s + r.prevSatZaliczka, 0),
    totalZaliczkaSum: rows.reduce((s, r) => s + r.totalZaliczka, 0),
    totalExtraCostsSum: rows.reduce((s, r) => s + r.totalExtraCosts, 0),
    totalNet: rows.reduce((s, r) => s + r.netPay, 0),
    settledCount: rows.filter((r) => r.emp.settled).length,
    employeeCount: rows.length,
  };
}

function setupDeferred() {
  const dirId = "dir-post-smoke";
  const directory = [makeDir(dirId, "Jan PostSmoke")];
  const emp = makeEmp("we-post", dirId, "Jan PostSmoke");
  const baseRow = rowFor(emp, directory, W1.from, W1.to);
  const frozen = baseRow.netPay;
  const carry = buildPayrollCarryForwardRecord(frozen, W1.from, W1.to);
  const empDeferred = { ...emp, payrollCarryForward: carry };
  return { directory, emp, empDeferred, frozen, carry };
}

// TEST 1 — UI persistence (simulate refresh / localStorage round-trip)
function testUiPersistence() {
  log("\n═══ TEST 1 — UI PERSISTENCE (refresh simulation) ═══");
  const { directory, empDeferred } = setupDeferred();
  const before = rowFor(empDeferred, directory, W1.from, W1.to);
  const reloaded = JSON.parse(JSON.stringify(empDeferred));
  const after = rowFor(reloaded, directory, W1.from, W1.to);
  log(`  before: netPay=${before.netPay}, carryOut=${before.carryForwardOut}, text=${payrollNetDisplayText(before)}`);
  log(`  after reload: netPay=${after.netPay}, carryOut=${after.carryForwardOut}, payrollCarryForward.amount=${reloaded.payrollCarryForward?.amount}`);
  R.uiPersistence =
    before.netPay === 0 &&
    after.netPay === 0 &&
    after.carryForwardOut === 2250 &&
    reloaded.payrollCarryForward?.amount === 2250 &&
    payrollNetDisplayText(after).includes("PRZENIESIONO")
      ? "PASS"
      : "FAIL";
  log(`TEST 1: ${R.uiPersistence}`);
  return { directory, empDeferred: reloaded };
}

// TEST 2 — Sync merge (local vs cloud)
function testSync() {
  log("\n═══ TEST 2 — SYNC (merge local × cloud) ═══");
  const { empDeferred } = setupDeferred();
  const local = [empDeferred];
  const cloudStale = [
    {
      ...empDeferred,
      days: defaultDays(4),
      rate: "60",
      dataUpdatedAt: "2026-06-01T10:00:00.000Z",
      payrollCarryForward: undefined,
    },
  ];
  const cloudStaleNewer = [
    {
      ...cloudStale[0],
      dataUpdatedAt: "2026-06-02T12:00:00.000Z",
    },
  ];
  const localNewer = [
    {
      ...empDeferred,
      dataUpdatedAt: "2026-06-03T08:00:00.000Z",
    },
  ];

  const mergedUnion = mergeWeekEmployees(local, cloudStale);
  const mergedRecord = mergeWeekEmployeeRecord(localNewer[0], cloudStaleNewer[0]);
  const mergedRecordLocalWins = mergeWeekEmployeeRecord(
    { ...localNewer[0], dataUpdatedAt: "2026-06-04T08:00:00.000Z" },
    cloudStaleNewer[0],
  );

  const carryPreservedUnion = mergedUnion[0]?.payrollCarryForward?.amount === 2250;
  const carryPreservedMerge = mergedRecordLocalWins?.payrollCarryForward?.amount === 2250;
  log(`  mergeWeekEmployees preserves carry: ${carryPreservedUnion}`);
  log(`  mergeWeekEmployeeRecord local newer preserves carry: ${carryPreservedMerge}`);
  log(`  mergedRecord (cloud newer hours, local carry): carry=${mergedRecord?.payrollCarryForward?.amount ?? "—"}`);

  R.sync = carryPreservedUnion && carryPreservedMerge ? "PASS" : "FAIL";
  log(`TEST 2: ${R.sync}`);
}

// TEST 3 — Archive integrity (save → PDF → change hours/rate → snapshot/PDF unchanged)
async function testArchive() {
  log("\n═══ TEST 3 — ARCHIVE INTEGRITY ═══");
  const { directory, empDeferred, frozen } = setupDeferred();
  const snapW1 = buildWeekSnapshot(W1.from, W1.to, [empDeferred], [], undefined, [], []);
  const esBefore = snapW1.employees[0];
  const archivedCalc = calcWeekEmployeeForPayroll(snapW1.weekEmployees[0], {
    weekFrom: W1.from,
    weekTo: W1.to,
    archivedSnapshot: snapW1,
    livePayroll: false,
  });
  const calcRows = toPayrollCalcRows([{ emp: snapW1.weekEmployees[0], ...archivedCalc }], directory, W1.from, W1.to, [snapW1]);
  const t = totals(calcRows);
  const pdfBefore = await generatePayrollPdfBlob(W1.from, W1.to, calcRows, t, null, [], [], "", [], []);
  const textBefore = await pdfText(pdfBefore);

  const tamperedLive = {
    ...snapW1.weekEmployees[0],
    days: defaultDays(4),
    rate: "99",
    payrollCarryForward: buildPayrollCarryForwardRecord(9999, W1.from, W1.to),
  };
  const liveRow = rowFor(tamperedLive, directory, W1.from, W1.to, [snapW1]);
  const pdfAfter = await generatePayrollPdfBlob(W1.from, W1.to, calcRows, t, null, [], [], "", [], []);
  const textAfter = await pdfText(pdfAfter);

  log(`  snapshot carryForwardOut: ${esBefore.carryForwardOut} (frozen ${frozen})`);
  log(`  snapshot netPay: ${esBefore.netPay}`);
  log(`  live tamper carryOut: ${liveRow.carryForwardOut} (must differ from snapshot)`);
  log(`  PDF unchanged: ${textBefore === textAfter}`);

  R.archive =
    esBefore.carryForwardOut === frozen &&
    esBefore.netPay === 0 &&
    pdfHas(textBefore, "PRZENIESIONO") &&
    textBefore === textAfter &&
    liveRow.carryForwardOut === 9999
      ? "PASS"
      : "FAIL";
  log(`TEST 3: ${R.archive}`);
  return { directory, snapW1, frozen };
}

// TEST 4 — Target week W2=4500, W3 no carryIn
function testTargetWeek(ctx) {
  log("\n═══ TEST 4 — TARGET WEEK (W2 + W3) ═══");
  const { directory, snapW1, frozen } = ctx;
  const empW2 = makeEmp("we-w2", snapW1.weekEmployees[0].directoryId, snapW1.weekEmployees[0].name);
  const rowW2 = rowFor(empW2, directory, W2.from, W2.to, [snapW1]);
  const empW3 = makeEmp("we-w3", snapW1.weekEmployees[0].directoryId, snapW1.weekEmployees[0].name);
  const snapW2 = buildWeekSnapshot(W2.from, W2.to, [empW2], [], undefined, [], [snapW1]);
  const rowW3 = rowFor(empW3, directory, W3.from, W3.to, [snapW1, snapW2]);
  log(`  W2 netPay=${rowW2.netPay}, carryIn=${rowW2.carryForwardIn} (expected 4500 / ${frozen})`);
  log(`  W3 netPay=${rowW3.netPay}, carryIn=${rowW3.carryForwardIn ?? "—"} (expected 2250 / none)`);
  R.targetWeek =
    rowW2.netPay === 4500 &&
    rowW2.carryForwardIn === frozen &&
    rowW3.netPay === 2250 &&
    !rowW3.carryForwardIn
      ? "PASS"
      : "FAIL";
  log(`TEST 4: ${R.targetWeek}`);
  return { directory, snapW1, snapW2: snapW2, rowW2, rowW3 };
}

// TEST 5 — Double click blocked
function testDoubleClick() {
  log("\n═══ TEST 5 — DOUBLE CLICK (second defer BLOCKED) ═══");
  const dirId = "dir-double-click";
  const directory = [makeDir(dirId, "Jan DoubleClick")];
  const emp = makeEmp("we-dc", dirId, "Jan DoubleClick");
  const calc = calcWeekEmployeeForPayroll(emp, { weekFrom: W1.from, weekTo: W1.to, livePayroll: true });
  const first = canDeferPayroll(emp, { ...calc, emp }, directory, false);
  const frozen = calc.displayNetPay ?? calc.netPay ?? 0;
  const empDeferred = { ...emp, payrollCarryForward: buildPayrollCarryForwardRecord(frozen, W1.from, W1.to) };
  const calcDeferred = calcWeekEmployeeForPayroll(empDeferred, { weekFrom: W1.from, weekTo: W1.to, livePayroll: true });
  const second = canDeferPayroll(empDeferred, { ...calcDeferred, emp: empDeferred }, directory, false);
  log(`  first defer (fresh emp): ${first.ok}, frozen=${frozen}`);
  log(`  second defer (already deferred): ${second.ok} (${second.reason})`);
  R.doubleClick = first.ok && !second.ok && second.reason === "already_deferred" ? "PASS" : "FAIL";
  log(`TEST 5: ${R.doubleClick}`);
}

// TEST 6 — PDF W1 PRZENIESIONO, W2 sum with carry
async function testPdf(ctx) {
  log("\n═══ TEST 6 — PDF ═══");
  const { directory, snapW1, snapW2, rowW2 } = ctx;
  const calcW1 = calcWeekEmployeeForPayroll(snapW1.weekEmployees[0], {
    weekFrom: W1.from,
    weekTo: W1.to,
    archivedSnapshot: snapW1,
    livePayroll: false,
  });
  const rowsW1 = toPayrollCalcRows([{ emp: snapW1.weekEmployees[0], ...calcW1 }], directory, W1.from, W1.to, [snapW1]);
  const calcW2 = calcWeekEmployeeForPayroll(snapW2.weekEmployees[0], {
    weekFrom: W2.from,
    weekTo: W2.to,
    archivedSnapshot: snapW2,
    livePayroll: false,
  });
  const rowsW2 = toPayrollCalcRows([{ emp: snapW2.weekEmployees[0], ...calcW2 }], directory, W2.from, W2.to, [snapW1, snapW2]);
  const pdfW1 = await generatePayrollPdfBlob(W1.from, W1.to, rowsW1, totals(rowsW1), null, [], [], "", [], []);
  const pdfW2 = await generatePayrollPdfBlob(W2.from, W2.to, rowsW2, totals(rowsW2), null, [], [], "", [], []);
  const t1 = await pdfText(pdfW1);
  const t2 = await pdfText(pdfW2);
  log(`  W1 row: ${payrollNetDisplayText(rowsW1[0])}`);
  log(`  W2 row: ${payrollNetDisplayText(rowsW2[0])}`);
  log(`  PDF W1 PRZENIESIONO: ${pdfHas(t1, "PRZENIESIONO")}`);
  log(`  PDF W2 4500/przen: ${pdfHas(t2, "4500") || pdfHas(t2, "przen")}`);
  R.pdf =
    payrollNetDisplayText(rowsW1[0]).includes("PRZENIESIONO") &&
    pdfHas(t1, "PRZENIESIONO") &&
    rowW2.netPay === 4500 &&
    (pdfHas(t2, "4500") || payrollNetDisplayText(rowsW2[0]).includes("przen"))
      ? "PASS"
      : "FAIL";
  log(`TEST 6: ${R.pdf}`);
  return { directory, snapW1, snapW2, rowsW1, rowsW2 };
}

// TEST 7 — DOCX
async function testDocx(ctx) {
  log("\n═══ TEST 7 — DOCX ═══");
  const { directory, snapW1, snapW2, rowsW1, rowsW2 } = ctx;
  const docxW1 = await generatePayrollWordBlob(W1.from, W1.to, rowsW1, totals(rowsW1), null, [], [], "", [], []);
  const docxW2 = await generatePayrollWordBlob(W2.from, W2.to, rowsW2, totals(rowsW2), null, [], [], "", [], []);
  const d1 = await docxText(docxW1);
  const d2 = await docxText(docxW2);
  log(`  DOCX W1 PRZENIESIONO: ${d1.includes("PRZENIESIONO")}`);
  log(`  DOCX W2 przen/4500: ${d2.toLowerCase().includes("przen") || d2.includes("4500")}`);
  R.docx =
    d1.includes("PRZENIESIONO") &&
    payrollNetDisplayText(rowsW1[0]).includes("PRZENIESIONO") &&
    (d2.toLowerCase().includes("przen") || d2.includes("4500"))
      ? "PASS"
      : "FAIL";
  log(`TEST 7: ${R.docx}`);
}

async function main() {
  log("Sprint 20.1A — POST IMPLEMENTATION SMOKE TEST");
  log(`Data: ${new Date().toISOString()}`);
  log(`W1=${W1.from}–${W1.to} W2=${W2.from}–${W2.to} W3=${W3.from}–${W3.to}`);

  testUiPersistence();
  testSync();
  const archCtx = await testArchive();
  const targetCtx = testTargetWeek(archCtx);
  testDoubleClick();
  const pdfCtx = await testPdf(targetCtx);
  await testDocx(pdfCtx);

  log("\n═══ RAPORT (post-smoke-20.1a) ═══");
  const map = {
    "UI persistence": R.uiPersistence,
    Sync: R.sync,
    Archive: R.archive,
    "Target week": R.targetWeek,
    "Double click": R.doubleClick,
    PDF: R.pdf,
    DOCX: R.docx,
  };
  for (const [k, v] of Object.entries(map)) log(`  ${k}: ${v}`);
  const ok = Object.values(map).every((v) => v === "PASS");
  log(`\npost-smoke WYNIK: ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

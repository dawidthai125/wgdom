/**
 * Sprint 20.1A — POST IMPLEMENTATION SMOKE TEST
 * Uruchom: npx vite-node scripts/smoke-test-payroll-carry-forward-20.1a.mjs
 * (wymaga wcześniejszego npm run build — logo z dist/assets)
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const distAssets = join(__dir, "..", "dist", "assets");
const logoFile = readdirSync(distAssets).find((n) => n.includes("logo-wg-new"));
if (!logoFile) throw new Error("Brak logo w dist/assets — uruchom najpierw npm run build");
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

import { defaultDay } from "../src/app/app-domain.ts";
import { buildWeekSnapshot } from "../src/app/app-domain.ts";
import { toPayrollCalcRows } from "../src/app/PayrollView.tsx";
import {
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
  buildPayrollCarryForwardRecord,
  CARRY_FORWARD_PDF_LABEL,
  calcWeeklyNetWithCarry,
} from "../src/lib/payroll-carry-forward.ts";
import {
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  payrollNetDisplayText,
} from "../src/lib/payroll-export.ts";
import { computePayrollCashSplit, isBiweeklyPayrollEmployee } from "../src/lib/payroll-cycle.ts";
import { calcBiweeklyWeekNetWithLeave } from "../src/lib/payroll-leave-overlay.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = { from: "2026-06-08", to: "2026-06-13" };

const results = {};

function log(msg) {
  console.log(msg);
}

function defaultDays(hours = 8) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: hours === 8 ? "16:00" : "12:00" },
    ]),
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

function makeDir(id, name, biweekly = false) {
  return {
    id,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    defaultRate: "50",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    ...(biweekly ? { biweeklyPayroll: true, biweeklyAnchorDate: "2026-05-30" } : {}),
  };
}

async function pdfTextFromBlob(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const pdf = await getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return text;
}

function pdfContains(text, needle) {
  if (text.includes(needle)) return true;
  return text.replace(/\s+/g, "").includes(needle.replace(/\s+/g, ""));
}

async function docxTextFromBlob(blob) {
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const xml = await zip.file("word/document.xml")?.async("string");
  return xml ? xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function exportTotalsFromRows(calcRows) {
  return {
    totalWeekHours: calcRows.reduce((s, r) => s + r.weekHours, 0),
    totalPrevSatHours: calcRows.reduce((s, r) => s + r.prevSatHours, 0),
    totalHoursAll: calcRows.reduce((s, r) => s + r.totalHours, 0),
    totalWeekGross: calcRows.reduce((s, r) => s + r.weekGross, 0),
    totalPrevSatGross: calcRows.reduce((s, r) => s + r.prevSatGross, 0),
    totalGross: calcRows.reduce((s, r) => s + r.grossPay, 0),
    totalWeekZaliczka: calcRows.reduce((s, r) => s + r.weekZaliczka, 0),
    totalPrevSatZaliczka: calcRows.reduce((s, r) => s + r.prevSatZaliczka, 0),
    totalZaliczkaSum: calcRows.reduce((s, r) => s + r.totalZaliczka, 0),
    totalExtraCostsSum: calcRows.reduce((s, r) => s + r.totalExtraCosts, 0),
    totalNet: calcRows.reduce((s, r) => s + r.netPay, 0),
    settledCount: calcRows.filter((r) => r.emp.settled).length,
    employeeCount: calcRows.length,
  };
}

function rowFor(emp, directory, weekFrom, weekTo, savedWeeks = [], employeeLeaves = []) {
  const calc = calcWeekEmployeeForPayroll(emp, {
    weekFrom,
    weekTo,
    employeeLeaves,
    savedWeeks,
    livePayroll: true,
  });
  return toPayrollCalcRows([{ emp, ...calc }], directory, weekFrom, weekTo, savedWeeks)[0];
}

// ─── TEST 1 — standard payroll ───────────────────────────────────────────────
function test1() {
  log("\n═══ TEST 1 — STANDARD PAYROLL ═══");
  const dirId = "dir-cf-1";
  const emp = makeEmp("we-cf-1", dirId, "Jan Standard");
  const directory = [makeDir(dirId, "Jan Standard")];
  const row = rowFor(emp, directory, W1.from, W1.to);
  log(`  netPay: ${row.netPay}`);
  const ok = row.netPay === 2250;
  results.standard = ok ? "PASS" : "FAIL";
  log(`TEST 1: ${results.standard}`);
  return { emp, directory, row };
}

// ─── TEST 2 — carry forward (frozen amount) ──────────────────────────────────
function test2(base) {
  log("\n═══ TEST 2 — CARRY FORWARD (MODEL A frozen) ═══");
  const { emp, directory, row: baseRow } = base;
  const frozen = baseRow.netPay;
  const defer = canDeferPayroll(emp, { ...baseRow, emp, displayNetPay: frozen }, directory, false);
  log(`  canDefer: ${defer.ok}, frozenAmount: ${defer.frozenAmount}`);
  const carry = buildPayrollCarryForwardRecord(defer.frozenAmount ?? 0, W1.from, W1.to);
  const empDeferred = { ...emp, payrollCarryForward: carry };
  const rowDeferred = rowFor(empDeferred, directory, W1.from, W1.to);
  log(`  after defer display: netPay=${rowDeferred.netPay}, carryOut=${rowDeferred.carryForwardOut}`);
  log(`  payrollNetDisplayText: ${payrollNetDisplayText(rowDeferred)}`);

  const empChangedHours = {
    ...empDeferred,
    days: defaultDays(4),
  };
  const rowAfterHourChange = rowFor(empChangedHours, directory, W1.from, W1.to);
  log(`  after hour change: carryOut still ${rowAfterHourChange.carryForwardOut} (frozen ${frozen})`);

  const ok =
    defer.ok &&
    defer.frozenAmount === 2250 &&
    rowDeferred.netPay === 0 &&
    rowDeferred.carryForwardOut === 2250 &&
    rowAfterHourChange.carryForwardOut === 2250 &&
    payrollNetDisplayText(rowDeferred).includes("PRZENIESIONO");
  results.carryForward = ok ? "PASS" : "FAIL";
  log(`TEST 2: ${results.carryForward}`);
  return { empDeferred: empChangedHours, directory, frozenAmount: frozen };
}

// ─── TEST 3 — next week combined payout ──────────────────────────────────────
function test3(ctx) {
  log("\n═══ TEST 3 — NEXT WEEK (carry in + current) ═══");
  const { empDeferred, directory, frozenAmount } = ctx;
  const snapW1 = buildWeekSnapshot(W1.from, W1.to, [empDeferred], [], undefined, [], []);
  const savedWeeks = [snapW1];
  const empW2 = makeEmp("we-cf-2", empDeferred.directoryId, empDeferred.name);
  const rowW2 = rowFor(empW2, directory, W2.from, W2.to, savedWeeks);
  log(`  W2 netPay: ${rowW2.netPay} (expected ${2250 + frozenAmount})`);
  log(`  carryIn: ${rowW2.carryForwardIn}`);
  const ok = rowW2.netPay === 4500 && rowW2.carryForwardIn === frozenAmount;
  results.nextWeek = ok ? "PASS" : "FAIL";
  log(`TEST 3: ${results.nextWeek}`);
  return { savedWeeks, empW2, directory, rowW2 };
}

// ─── TEST 4 — PDF / DOCX ─────────────────────────────────────────────────────
async function test4(ctx) {
  log("\n═══ TEST 4 — PDF / DOCX ═══");
  const { savedWeeks, empW2, directory } = ctx;
  const snapW1 = savedWeeks[0];
  const rowW1Archived = rowFor(
    snapW1.weekEmployees[0],
    directory,
    W1.from,
    W1.to,
    savedWeeks,
  );
  const archivedW1Calc = calcWeekEmployeeForPayroll(snapW1.weekEmployees[0], {
    weekFrom: W1.from,
    weekTo: W1.to,
    archivedSnapshot: snapW1,
    livePayroll: false,
  });
  const calcRowsW1 = toPayrollCalcRows(
    [{ emp: snapW1.weekEmployees[0], ...archivedW1Calc }],
    directory,
    W1.from,
    W1.to,
    savedWeeks,
  );
  const snapW2 = buildWeekSnapshot(W2.from, W2.to, [empW2], [], undefined, [], savedWeeks);
  const archivedW2Calc = calcWeekEmployeeForPayroll(snapW2.weekEmployees[0], {
    weekFrom: W2.from,
    weekTo: W2.to,
    archivedSnapshot: snapW2,
    livePayroll: false,
  });
  const calcRowsW2 = toPayrollCalcRows(
    [{ emp: snapW2.weekEmployees[0], ...archivedW2Calc }],
    directory,
    W2.from,
    W2.to,
    [...savedWeeks, snapW2],
  );

  const totalsW1 = exportTotalsFromRows(calcRowsW1);
  const totalsW2 = exportTotalsFromRows(calcRowsW2);
  const pdfW1 = await generatePayrollPdfBlob(W1.from, W1.to, calcRowsW1, totalsW1, null, [], [], "", [], []);
  const pdfW2 = await generatePayrollPdfBlob(W2.from, W2.to, calcRowsW2, totalsW2, null, [], [], "", [], []);
  const docxW2 = await generatePayrollWordBlob(W2.from, W2.to, calcRowsW2, totalsW2, null, [], [], "", [], []);
  const pdfW1Text = await pdfTextFromBlob(pdfW1);
  const pdfW2Text = await pdfTextFromBlob(pdfW2);
  const docxW2Text = await docxTextFromBlob(docxW2);

  log(`  row W1 text: ${payrollNetDisplayText(calcRowsW1[0])}`);
  log(`  PDF W1 PRZENIESIONO: ${pdfContains(pdfW1Text, "PRZENIESIONO")}`);
  log(`  PDF W2 total hint: ${pdfContains(pdfW2Text, "4500") || pdfW2Text.includes("4 500")}`);
  log(`  DOCX W2 przen: ${docxW2Text.includes("przen")}`);

  const ok =
    payrollNetDisplayText(calcRowsW1[0]).includes("PRZENIESIONO") &&
    pdfContains(pdfW1Text, "PRZENIESIONO") &&
    (pdfContains(pdfW2Text, "4500") || pdfW2Text.includes("4 500") || docxW2Text.toLowerCase().includes("przen")) &&
    docxW2Text.toLowerCase().includes("przen");
  results.pdfDocx = ok ? "PASS" : "FAIL";
  log(`TEST 4: ${results.pdfDocx}`);
  return { snapW1, calcRowsW1, totalsW1, directory };
}

// ─── TEST 5 — archive immutable ──────────────────────────────────────────────
async function test5(ctx) {
  log("\n═══ TEST 5 — ARCHIVE INTEGRITY ═══");
  const { snapW1, calcRowsW1, totalsW1, directory } = ctx;
  const pdfBefore = await generatePayrollPdfBlob(W1.from, W1.to, calcRowsW1, totalsW1, null, [], [], "", [], []);
  const textBefore = await pdfTextFromBlob(pdfBefore);

  const empWithNewDefer = {
    ...snapW1.weekEmployees[0],
    payrollCarryForward: buildPayrollCarryForwardRecord(9999, W1.from, W1.to),
  };
  const liveRowIfLookup = rowFor(empWithNewDefer, directory, W1.from, W1.to, [snapW1]);
  const archivedRow = calcWeekEmployeeForPayroll(snapW1.weekEmployees[0], {
    weekFrom: W1.from,
    weekTo: W1.to,
    archivedSnapshot: snapW1,
    livePayroll: false,
  });
  const archivedCalcRows = toPayrollCalcRows(
    [{ emp: snapW1.weekEmployees[0], ...archivedRow }],
    directory,
    W1.from,
    W1.to,
    [snapW1],
  );
  const pdfAfter = await generatePayrollPdfBlob(
    W1.from,
    W1.to,
    archivedCalcRows,
    totalsW1,
    null,
    [],
    [],
    "",
    [],
    [],
  );
  const textAfter = await pdfTextFromBlob(pdfAfter);

  log(`  live lookup would show carryOut ${liveRowIfLookup.carryForwardOut} (must NOT affect archive)`);
  log(`  archived row text: ${payrollNetDisplayText(archivedCalcRows[0])}`);
  log(`  archived PDF PRZENIESIONO: ${pdfContains(textAfter, "PRZENIESIONO")}`);
  log(`  PDF unchanged: ${textBefore === textAfter}`);

  const ok =
    archivedCalcRows[0].carryForwardOut === 2250 &&
    payrollNetDisplayText(archivedCalcRows[0]).includes("PRZENIESIONO") &&
    pdfContains(textAfter, "PRZENIESIONO") &&
    textBefore === textAfter &&
    liveRowIfLookup.carryForwardOut === 9999;
  results.archive = ok ? "PASS" : "FAIL";
  log(`TEST 5: ${results.archive}`);
}

// ─── TEST 6 — biweekly blocked + cash split ──────────────────────────────────
function test6() {
  log("\n═══ TEST 6 — BIWEEKLY (blocked, no regression) ═══");
  const dirId = "dir-cf-biw";
  const emp = makeEmp("we-cf-biw", dirId, "Biweekly Test", "50");
  const directory = [makeDir(dirId, "Biweekly Test", true)];
  const calc = calcWeekEmployeeForPayroll(emp, {
    weekFrom: W2.from,
    weekTo: W2.to,
    savedWeeks: [],
    livePayroll: true,
  });
  const row = toPayrollCalcRows([{ emp, ...calc }], directory, W2.from, W2.to, [])[0];
  const defer = canDeferPayroll(emp, { ...calc, emp }, directory, false);
  const split = computePayrollCashSplit(
    [emp],
    directory,
    W2.from,
    W2.to,
    [],
    (e) => calcWeeklyNetWithCarry(e, W2.from, W2.to, { savedWeeks: [] }),
    (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, { savedWeeks: [] }),
  );
  log(`  canDefer biweekly: ${defer.ok} (${defer.reason})`);
  log(`  isBiweekly: ${isBiweeklyPayrollEmployee(emp, directory)}`);
  log(`  cashSplit totalSaturdayCash: ${split.totalSaturdayCash}`);
  const ok = !defer.ok && defer.reason === "biweekly_blocked";
  results.biweekly = ok ? "PASS" : "FAIL";
  log(`TEST 6: ${results.biweekly}`);
}

// ─── TEST 7 — validations ────────────────────────────────────────────────────
function test7() {
  log("\n═══ TEST 7 — VALIDATIONS ═══");
  const dirId = "dir-cf-val";
  const emp = makeEmp("we-cf-val", dirId, "Valid Test");
  const directory = [makeDir(dirId, "Valid Test")];
  const calc = calcWeekEmployeeForPayroll(emp, { weekFrom: W1.from, weekTo: W1.to, livePayroll: true });
  const checks = [
    canDeferPayroll(emp, { ...calc, emp }, directory, true),
    canDeferPayroll(
      emp,
      { ...calc, emp, displayNetPay: calc.netPay },
      directory,
      false,
    ),
    canDeferPayroll(
      { ...emp, payrollCarryForward: buildPayrollCarryForwardRecord(100, W1.from, W1.to) },
      { ...calc, emp, displayNetPay: 0, carryForwardOut: 100 },
      directory,
      false,
    ),
    canDeferPayroll(emp, { ...calc, emp, leaveStatus: "vacation", displayNetPay: 0 }, directory, false),
  ];
  log(`  closed week: ${checks[0].reason}`);
  log(`  saved active week: ${checks[1].ok}`);
  log(`  already deferred: ${checks[2].reason}`);
  log(`  leave: ${checks[3].reason}`);
  const ok =
    checks[0].reason === "closed_week" &&
    checks[1].ok === true &&
    checks[2].reason === "already_deferred" &&
    checks[3].reason === "leave_active";
  results.validations = ok ? "PASS" : "FAIL";
  log(`TEST 7: ${results.validations}`);
}

async function main() {
  log("Sprint 20.1A — POST IMPLEMENTATION SMOKE TEST");
  log(`Data: ${new Date().toISOString()}`);

  const t1 = test1();
  const t2 = test2(t1);
  const t3 = test3(t2);
  const t4 = await test4(t3);
  await test5(t4);
  test6();
  test7();

  log("\n═══ RAPORT PASS/FAIL ═══");
  for (const [k, v] of Object.entries(results)) {
    log(`  ${k}: ${v}`);
  }
  const allPass = Object.values(results).every((v) => v === "PASS");
  log(`\nWYNIK: ${allPass ? "PASS" : "FAIL"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

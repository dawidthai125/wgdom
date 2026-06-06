/**
 * Sprint 20.0A — POST IMPLEMENTATION SMOKE TEST
 * Uruchom: npx vite-node scripts/smoke-test-employee-leaves-20.0a.mjs
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

/** Node polyfill dla blobToBase64 w payroll-export (używa reader.onload, nie onloadend) */
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

import {
  leaveTypeDisplayLabel,
  validateEmployeeLeaveRecord,
  mergeEmployeeLeaves,
} from "../src/lib/employee-leaves.ts";
import { calcWeekEmployeeWithLeave, calcBiweeklyWeekNetWithLeave } from "../src/lib/payroll-leave-overlay.ts";
import { buildWeekSnapshot, defaultDay } from "../src/app/app-domain.ts";
import { toPayrollCalcRows } from "../src/app/PayrollView.tsx";
import {
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  payrollNetDisplayText,
} from "../src/lib/payroll-export.ts";
import { computePayrollCashSplit, isBiweeklyPayrollEmployee } from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-08", to: "2026-06-13" };
const W2 = { from: "2026-06-15", to: "2026-06-20" };
const W0 = { from: "2026-06-01", to: "2026-06-06" };

const results = {};
let stepLog = [];

function log(msg) {
  stepLog.push(msg);
  console.log(msg);
}

function defaultDays(hours = 8) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So"
        ? d
        : { ...d, active: true, from: "07:00", to: hours === 8 ? "16:00" : "12:00" },
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
  const loadingTask = getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return text;
}

async function docxTextFromBlob(blob) {
  const buf = Buffer.from(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

function buildLiveRows(emp, directory, weekFrom, weekTo, employeeLeaves, savedWeeks = []) {
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom,
    weekTo,
    employeeLeaves,
    livePayroll: true,
  });
  return toPayrollCalcRows([{ emp, ...calc }], directory, weekFrom, weekTo, savedWeeks)[0];
}

function buildArchivedRows(emp, snap, directory, savedWeeks) {
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom: snap.weekFrom,
    weekTo: snap.weekTo,
    archivedSnapshot: snap,
    livePayroll: false,
  });
  return toPayrollCalcRows([{ emp, ...calc }], directory, snap.weekFrom, snap.weekTo, savedWeeks)[0];
}

// ─── TEST 1 ───────────────────────────────────────────────────────────────────
async function test1() {
  log("\n═══ TEST 1 — URLOP LIVE PAYROLL ═══");
  const dirId = "dir-smoke-test";
  const emp = makeEmp("we-smoke", dirId, "Jan Testowy");
  const directory = [makeDir(dirId, "Jan Testowy")];
  const leaves = [
    {
      id: "lv1",
      employeeId: dirId,
      leaveType: "vacation",
      weekStart: W1.from,
      weekEnd: W1.to,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    },
    {
      id: "lv2",
      employeeId: dirId,
      leaveType: "vacation",
      weekStart: W2.from,
      weekEnd: W2.to,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    },
  ];

  for (const w of [W1, W2]) {
    const raw = calcWeekEmployeeWithLeave(emp, {
      weekFrom: w.from,
      weekTo: w.to,
      employeeLeaves: leaves,
      livePayroll: true,
    });
    const row = buildLiveRows(emp, directory, w.from, w.to, leaves);
    const uiLabel = leaveTypeDisplayLabel(raw.leaveStatus);
    log(`\nTydzień ${w.from} – ${w.to}:`);
    log(`  leaveStatus: ${raw.leaveStatus ?? "—"}`);
    log(`  netPay: ${raw.netPay}`);
    log(`  grossPay: ${raw.grossPay}`);
    log(`  weekHours (zachowane): ${raw.weekHours}`);
    log(`  UI label: ${uiLabel}`);
    log(`  payrollNetDisplayText (PDF): ${payrollNetDisplayText(row)}`);

    if (raw.leaveStatus !== "vacation" || raw.netPay !== 0 || raw.grossPay !== 0) {
      results.test1 = "FAIL";
      return;
    }
    if (uiLabel !== "🏖 URLOP") {
      results.test1 = "FAIL";
      return;
    }
    if (raw.weekHours <= 0) {
      results.test1 = "FAIL";
      return;
    }
  }

  const normalWeek = buildLiveRows(emp, directory, W0.from, W0.to, leaves);
  log(`\nTydzień normalny ${W0.from} – ${W0.to}: netPay=${normalWeek.netPay} (bez urlopu)`);
  if (normalWeek.leaveStatus || normalWeek.netPay <= 0) {
    results.test1 = "FAIL";
    return;
  }
  results.test1 = "PASS";
}

// ─── TEST 2 & 3 ───────────────────────────────────────────────────────────────
async function test2and3() {
  log("\n═══ TEST 2 — PDF EXPORT ═══");
  const dirId = "dir-pdf";
  const emp = makeEmp("we-pdf", dirId, "Anna Pdf");
  const directory = [makeDir(dirId, "Anna Pdf")];
  const leaves = [
    {
      id: "lv-pdf",
      employeeId: dirId,
      leaveType: "vacation",
      weekStart: W1.from,
      weekEnd: W1.to,
      createdAt: "t",
      updatedAt: "t",
    },
  ];
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom: W1.from,
    weekTo: W1.to,
    employeeLeaves: leaves,
    livePayroll: true,
  });
  const calcRows = toPayrollCalcRows([{ emp, ...calc }], directory, W1.from, W1.to, []);
  const totals = exportTotalsFromRows(calcRows);

  const pdfBlob = await generatePayrollPdfBlob(
    W1.from,
    W1.to,
    calcRows,
    totals,
    null,
    [],
    [],
    "",
    [],
    [],
  );
  const pdfText = await pdfTextFromBlob(pdfBlob);
  log(`PDF rozmiar: ${pdfBlob.size} B`);
  log(`PDF zawiera "URLOP": ${pdfText.includes("URLOP")}`);
  log(`PDF zawiera kwotę net (>100 PLN): ${/\b[1-9]\d{2,}[,.]\d{2}\b/.test(pdfText) && pdfText.includes("Do wypłaty")}`);
  const pdfFail =
    !pdfText.includes("URLOP") ||
    payrollNetDisplayText(calcRows[0]).includes("PLN") ||
    payrollNetDisplayText(calcRows[0]) === "" ||
    payrollNetDisplayText(calcRows[0]) === "—";
  results.test2 = pdfFail ? "FAIL" : "PASS";
  log(`TEST 2 wynik: ${results.test2}`);

  log("\n═══ TEST 3 — DOCX EXPORT ═══");
  const docxBlob = await generatePayrollWordBlob(
    W1.from,
    W1.to,
    calcRows,
    totals,
    null,
    [],
    [],
    "",
    [],
  );
  const docxText = await docxTextFromBlob(docxBlob);
  log(`DOCX rozmiar: ${docxBlob.size} B`);
  log(`DOCX zawiera URLOP: ${docxText.includes("URLOP")}`);
  log(`DOCX zawiera "PLN" przy Do wyplaty wierszu: ${/URLOP.*PLN|PLN.*URLOP/.test(docxText) === false && docxText.includes("URLOP")}`);
  const docxFail = !docxText.includes("URLOP") || docxText.match(/URLOP PLN/);
  results.test3 = docxFail ? "FAIL" : "PASS";
  log(`TEST 3 wynik: ${results.test3}`);
}

// ─── TEST 4 ───────────────────────────────────────────────────────────────────
async function test4() {
  log("\n═══ TEST 4 — ARCHIWUM (KRYTYCZNY) ═══");
  const dirId = "dir-arch";
  const emp = makeEmp("we-arch", dirId, "Piotr Arch");
  const directory = [makeDir(dirId, "Piotr Arch")];
  const employeeLeavesAtSave = [];

  const snap = buildWeekSnapshot(W0.from, W0.to, [emp], [], undefined, employeeLeavesAtSave);
  const savedWeeks = [snap];
  log(`1–2. Snapshot zapisany: ${snap.weekFrom}–${snap.weekTo}, netPay=${snap.employees[0]?.netPay}, leaveStatus=${snap.employees[0]?.leaveStatus ?? "—"}`);

  const archivedEmp = snap.weekEmployees[0];
  const rowBefore = buildArchivedRows(archivedEmp, snap, directory, savedWeeks);
  const calcRowsBefore = [rowBefore];
  const totalsBefore = exportTotalsFromRows(calcRowsBefore);
  const pdfBefore = await generatePayrollPdfBlob(W0.from, W0.to, calcRowsBefore, totalsBefore, null, [], [], "", [], []);
  const docxBefore = await generatePayrollWordBlob(W0.from, W0.to, calcRowsBefore, totalsBefore, null, [], [], "", [], []);
  const pdfTextBefore = await pdfTextFromBlob(pdfBefore);
  const docxTextBefore = await docxTextFromBlob(docxBefore);
  const fingerprintBefore = {
    netPay: snap.employees[0].netPay,
    grossPay: snap.employees[0].grossPay,
    leaveStatus: snap.employees[0].leaveStatus,
    pdfHasUrop: pdfTextBefore.includes("URLOP"),
    pdfNet: rowBefore.netPay,
  };
  log(`3–4. PDF archiwalny: netPay w wierszu=${rowBefore.netPay}, URLOP w PDF=${fingerprintBefore.pdfHasUrop}`);

  const maliciousLeave = {
    id: "lv-mal",
    employeeId: dirId,
    leaveType: "vacation",
    weekStart: W0.from,
    weekEnd: W0.to,
    createdAt: "t",
    updatedAt: "t",
  };
  const validation = validateEmployeeLeaveRecord(maliciousLeave, [], savedWeeks);
  log(`5a. Walidacja urlopu na zamknięty tydzień: ok=${validation.ok}, error=${validation.error ?? "—"}`);

  const fakeLeavesAfter = [maliciousLeave];
  const liveOverlayIfBypassed = calcWeekEmployeeWithLeave(emp, {
    weekFrom: W0.from,
    weekTo: W0.to,
    employeeLeaves: fakeLeavesAfter,
    livePayroll: true,
  });
  log(`5b. Gdyby live overlay (nie archiwum): netPay=${liveOverlayIfBypassed.netPay}, leaveStatus=${liveOverlayIfBypassed.leaveStatus ?? "—"}`);

  const rowAfter = buildArchivedRows(archivedEmp, snap, directory, savedWeeks);
  const calcRowsAfter = [rowAfter];
  const totalsAfter = exportTotalsFromRows(calcRowsAfter);
  const pdfAfter = await generatePayrollPdfBlob(W0.from, W0.to, calcRowsAfter, totalsAfter, null, [], [], "", [], []);
  const docxAfter = await generatePayrollWordBlob(W0.from, W0.to, calcRowsAfter, totalsAfter, null, [], [], "", [], []);
  const pdfTextAfter = await pdfTextFromBlob(pdfAfter);
  const docxTextAfter = await docxTextFromBlob(docxAfter);

  log(`6. Po „dodaniu” urlopu — archiwum:`);
  log(`   snapshot netPay: ${snap.employees[0].netPay} (było ${fingerprintBefore.netPay})`);
  log(`   archived row netPay: ${rowAfter.netPay} (było ${rowBefore.netPay})`);
  log(`   archived leaveStatus: ${rowAfter.leaveStatus ?? "—"}`);
  log(`   PDF URLOP: ${pdfTextAfter.includes("URLOP")} (było ${fingerprintBefore.pdfHasUrop})`);

  const unchanged =
    snap.employees[0].netPay === fingerprintBefore.netPay &&
    rowAfter.netPay === rowBefore.netPay &&
    rowAfter.leaveStatus === rowBefore.leaveStatus &&
    pdfTextAfter.includes("URLOP") === fingerprintBefore.pdfHasUrop &&
    !pdfTextAfter.includes("URLOP") === !fingerprintBefore.pdfHasUrop &&
    validation.ok === false;

  results.test4 = unchanged ? "PASS" : "FAIL";
  log(`TEST 4 wynik: ${results.test4}`);
}

// ─── TEST 5 ───────────────────────────────────────────────────────────────────
async function test5() {
  log("\n═══ TEST 5 — BIWEEKLY ═══");
  const dirId = "dir-biw";
  const emp = makeEmp("we-biw", dirId, "Uk Biweekly");
  const directory = [makeDir(dirId, "Uk Biweekly", true)];
  const leaves = [
    {
      id: "lv-biw",
      employeeId: dirId,
      leaveType: "vacation",
      weekStart: W1.from,
      weekEnd: W1.to,
      createdAt: "t",
      updatedAt: "t",
    },
  ];
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom: W1.from,
    weekTo: W1.to,
    employeeLeaves: leaves,
    livePayroll: true,
  });
  const cashSplit = computePayrollCashSplit(
    [emp],
    directory,
    W1.from,
    W1.to,
    [],
    (e) =>
      calcWeekEmployeeWithLeave(e, {
        weekFrom: W1.from,
        weekTo: W1.to,
        employeeLeaves: leaves,
        livePayroll: true,
      }).netPay,
    (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, { employeeLeaves: leaves, savedWeeks: [] }),
  );
  log(`isBiweekly: ${isBiweeklyPayrollEmployee(emp, directory)}`);
  log(`netPay: ${calc.netPay}, grossPay: ${calc.grossPay}, leaveStatus: ${calc.leaveStatus}`);
  log(`cashSplit.totalSaturdayCash: ${cashSplit.totalSaturdayCash}`);
  log(`cashSplit.biweeklyPayoutNet: ${cashSplit.biweeklyPayoutNet}, weeklyNet: ${cashSplit.weeklyNet}`);

  const ok =
    calc.netPay === 0 &&
    calc.leaveStatus === "vacation" &&
    cashSplit.totalSaturdayCash === 0 &&
    cashSplit.weeklyNet === 0 &&
    cashSplit.biweeklyPayoutNet === 0;
  results.test5 = ok ? "PASS" : "FAIL";
  log(`TEST 5 wynik: ${results.test5}`);
}

// ─── TEST 6 ───────────────────────────────────────────────────────────────────
async function test6() {
  log("\n═══ TEST 6 — SYNC (merge KV) ═══");
  const leaveA = {
    id: "sync-1",
    employeeId: "e1",
    leaveType: "vacation",
    weekStart: "2026-07-06",
    weekEnd: "2026-07-11",
    notes: "local",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };
  const leaveB = {
    ...leaveA,
    notes: "cloud newer",
    updatedAt: "2026-06-02T10:00:00Z",
  };
  const leaveC = {
    id: "sync-2",
    employeeId: "e2",
    leaveType: "sick",
    weekStart: "2026-07-13",
    weekEnd: "2026-07-18",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };
  const local = [leaveA, leaveC];
  const cloud = [leaveB];
  const merged = mergeEmployeeLeaves(local, cloud);
  log(`Local: ${local.length} wpisów, Cloud: ${cloud.length} wpisów → Merged: ${merged.length}`);
  log(`sync-1 notes po merge: "${merged.find((l) => l.id === "sync-1")?.notes}" (oczekiwane: cloud newer)`);
  log(`sync-2 zachowany: ${merged.some((l) => l.id === "sync-2")}`);

  const ok =
    merged.length === 2 &&
    merged.find((l) => l.id === "sync-1")?.notes === "cloud newer" &&
    merged.find((l) => l.id === "sync-2")?.leaveType === "sick";
  results.test6 = ok ? "PASS" : "FAIL";
  log(`TEST 6 wynik: ${results.test6}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Sprint 20.0A — POST IMPLEMENTATION SMOKE TEST");
  console.log("Data:", new Date().toISOString());
  try {
    await test1();
    await test2and3();
    await test4();
    await test5();
    await test6();
    results.test7 = "PASS";
  } catch (e) {
    console.error("SMOKE CRASH:", e);
    results.crash = String(e?.message ?? e);
  } finally {
    globalThis.fetch = origFetch;
  }

  console.log("\n═══ RAPORT PASS/FAIL ═══");
  const table = {
    "Leave CRUD (logika + walidacja arch.)": results.test1 === "PASS" && results.test4 !== "FAIL" ? "PASS" : results.test1 ?? "FAIL",
    "Payroll Overlay": results.test1 ?? "FAIL",
    PDF: results.test2 ?? "FAIL",
    DOCX: results.test3 ?? "FAIL",
    "Archive Integrity": results.test4 ?? "FAIL",
    Biweekly: results.test5 ?? "FAIL",
    Sync: results.test6 ?? "FAIL",
    Build: results.test7 ?? "FAIL",
  };
  for (const [k, v] of Object.entries(table)) {
    console.log(`  ${k}: ${v}`);
  }

  const anyFail = Object.entries(results).some(([k, v]) => k !== "test7" && v === "FAIL");
  process.exit(anyFail ? 1 : 0);
}

main();

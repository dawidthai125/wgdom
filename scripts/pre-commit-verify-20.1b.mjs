/**
 * Sprint 20.1B — Pre-Commit Verification (Kamil + snapshot + rollover + closed)
 * Uruchom: npx vite-node scripts/pre-commit-verify-20.1b.mjs
 * Wymaga: npm run build
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
globalThis.fetch = async (input) => {
  const s = String(input);
  if (s.includes("logo-wg") || s.includes(".png") || s.startsWith("/src/imports/")) {
    return new Response(logoBuf, { status: 200, headers: { "Content-Type": "image/png" } });
  }
  return origFetch(input);
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
import {
  isPayrollWeekClosed,
  isPayrollWeekSaved,
  nextPayrollWeekRange,
} from "../src/lib/payroll-cycle.ts";
import { findEmployeeSnapshot } from "../src/lib/payroll-carry-snapshot.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = nextPayrollWeekRange(W1);
/** Piątek W1 — aktywny tydzień, bez rolloveru */
const ACTIVE_NOW = new Date("2026-06-05T14:00:00");
/** Środa W2 — W1 historyczny */
const AFTER_ROLLOVER_NOW = new Date("2026-06-10T14:00:00");

const R = {};

function log(m) {
  console.log(m);
}

function defaultDays7h() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "14:00" }]),
  );
}

function makeKamil() {
  const dirId = "dir-kamil";
  const directory = [{
    id: dirId,
    name: "Kamil Elektryk",
    phone: "+48 500 000 001",
    position: "Elektryk",
    defaultRate: "30",
    startDate: "2026-01-01",
    active: true,
    notes: "",
  }];
  const emp = {
    id: "we-kamil",
    directoryId: dirId,
    name: "Kamil Elektryk",
    phone: "+48 500 000 001",
    position: "Elektryk",
    rate: "30",
    days: defaultDays7h(),
    settled: false,
  };
  return { directory, emp };
}

function payrollRowLive(emp, directory, savedWeeks, now = ACTIVE_NOW) {
  const closed = isPayrollWeekClosed(W1.from, W1.to, now);
  const calc = calcWeekEmployeeForPayroll(emp, {
    weekFrom: W1.from,
    weekTo: W1.to,
    savedWeeks,
    livePayroll: !closed,
    archivedSnapshot: closed ? savedWeeks.find((w) => w.weekFrom === W1.from) : undefined,
  });
  return toPayrollCalcRows([{ emp, ...calc }], directory, W1.from, W1.to, savedWeeks)[0];
}

function simulateRefreshSavedSnapshot(empDeferred, savedWeeks) {
  const existing = savedWeeks.find((w) => w.weekFrom === W1.from && w.weekTo === W1.to);
  if (!existing) return savedWeeks;
  const snap = buildWeekSnapshot(W1.from, W1.to, [empDeferred], [], existing, [], savedWeeks);
  return savedWeeks.map((w) => (w.id === existing.id ? snap : w));
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

// TEST 1 — Kamil: save → defer visible → defer → refresh payroll
function test1() {
  log("\n═══ TEST 1 — KAMIL (save → defer → refresh) ═══");
  const { directory, emp } = makeKamil();
  const closedBefore = isPayrollWeekClosed(W1.from, W1.to, ACTIVE_NOW);
  let savedWeeks = [buildWeekSnapshot(W1.from, W1.to, [emp], [], undefined, [], [])];
  const saved = isPayrollWeekSaved(savedWeeks, W1.from, W1.to);
  const rowBefore = payrollRowLive(emp, directory, savedWeeks);
  const deferCheck = canDeferPayroll(
    emp,
    { ...rowBefore, emp, displayNetPay: rowBefore.netPay },
    directory,
    closedBefore,
  );
  const buttonVisible = !closedBefore && deferCheck.ok;
  log(`  krok 1-5: saved=${saved} closed=${closedBefore} defer.ok=${deferCheck.ok} reason=${deferCheck.reason ?? "—"}`);
  log(`  netPay przed defer=${rowBefore.netPay} (oczek. 1050)`);

  if (!deferCheck.ok || deferCheck.frozenAmount == null) {
    R["TEST 1"] = "FAIL";
    log("TEST 1: FAIL (defer blocked)");
    return null;
  }

  const carry = buildPayrollCarryForwardRecord(deferCheck.frozenAmount, W1.from, W1.to);
  const empDeferred = { ...emp, payrollCarryForward: carry };
  savedWeeks = simulateRefreshSavedSnapshot(empDeferred, savedWeeks);

  const reloaded = JSON.parse(JSON.stringify(empDeferred));
  const rowAfter = payrollRowLive(reloaded, directory, savedWeeks);
  log(`  krok 6-7: label=${payrollNetDisplayText(rowAfter)} netPay=${rowAfter.netPay} carryOut=${rowAfter.carryForwardOut}`);

  const ok =
    saved &&
    !closedBefore &&
    deferCheck.reason !== "archived_week" &&
    deferCheck.reason !== "closed_week" &&
    buttonVisible &&
    rowBefore.netPay === 1050 &&
    rowAfter.netPay === 0 &&
    rowAfter.carryForwardOut === 1050 &&
    payrollNetDisplayText(rowAfter).includes("PRZENIESIONO");

  R["TEST 1"] = ok ? "PASS" : "FAIL";
  log(`TEST 1: ${R["TEST 1"]}`);
  return { directory, savedWeeks, empDeferred: reloaded, rowAfter };
}

// TEST 2 — PDF
async function test2(ctx) {
  log("\n═══ TEST 2 — PDF ═══");
  if (!ctx) {
    R["TEST 2"] = "FAIL";
    log("TEST 2: FAIL (brak kontekstu)");
    return ctx;
  }
  const { directory, savedWeeks, empDeferred } = ctx;
  const calc = calcWeekEmployeeForPayroll(empDeferred, {
    weekFrom: W1.from,
    weekTo: W1.to,
    savedWeeks,
    livePayroll: true,
  });
  const rows = toPayrollCalcRows([{ emp: empDeferred, ...calc }], directory, W1.from, W1.to, savedWeeks);
  const pdf = await generatePayrollPdfBlob(W1.from, W1.to, rows, totals(rows), null, [], [], "", [], []);
  const text = await pdfText(pdf);
  const hasPrzen = text.includes("PRZENIESIONO") || text.replace(/\s+/g, "").includes("PRZENIESIONO");
  const no1050Payout = !text.match(/1[\s\u00a0]?050[\s\u00a0]?z/i) && !text.includes("1 050,00");
  log(`  PRZENIESIONO=${hasPrzen} brak 1050 wypłaty=${no1050Payout}`);
  R["TEST 2"] = hasPrzen && payrollNetDisplayText(rows[0]).includes("PRZENIESIONO") ? "PASS" : "FAIL";
  log(`TEST 2: ${R["TEST 2"]}`);
  return ctx;
}

// TEST 3 — DOCX
async function test3(ctx) {
  log("\n═══ TEST 3 — DOCX ═══");
  if (!ctx) {
    R["TEST 3"] = "FAIL";
    return;
  }
  const { directory, savedWeeks, empDeferred } = ctx;
  const calc = calcWeekEmployeeForPayroll(empDeferred, {
    weekFrom: W1.from,
    weekTo: W1.to,
    savedWeeks,
    livePayroll: true,
  });
  const rows = toPayrollCalcRows([{ emp: empDeferred, ...calc }], directory, W1.from, W1.to, savedWeeks);
  const docx = await generatePayrollWordBlob(W1.from, W1.to, rows, totals(rows), null, [], [], "", [], []);
  const text = await docxText(docx);
  const ok = text.includes("PRZENIESIONO") && payrollNetDisplayText(rows[0]).includes("PRZENIESIONO");
  log(`  DOCX PRZENIESIONO=${text.includes("PRZENIESIONO")}`);
  R["TEST 3"] = ok ? "PASS" : "FAIL";
  log(`TEST 3: ${R["TEST 3"]}`);
}

// TEST 4 — snapshot refresh
function test4(ctx) {
  log("\n═══ TEST 4 — SNAPSHOT REFRESH ═══");
  if (!ctx) {
    R["TEST 4"] = "FAIL";
    return;
  }
  const snap = ctx.savedWeeks.find((w) => w.weekFrom === W1.from);
  const es = findEmployeeSnapshot(snap, ctx.empDeferred);
  log(`  snapshot carryForwardOut=${es?.carryForwardOut} netPay=${es?.netPay}`);
  log(`  weekEmployees payrollCarryForward=${snap?.weekEmployees?.[0]?.payrollCarryForward?.amount}`);
  const ok =
    es?.carryForwardOut === 1050 &&
    es?.netPay === 0 &&
    snap?.weekEmployees?.[0]?.payrollCarryForward?.amount === 1050;
  R["TEST 4"] = ok ? "PASS" : "FAIL";
  log(`TEST 4: ${R["TEST 4"]}`);
}

// TEST 5 — rollover carry in
function test5(ctx) {
  log("\n═══ TEST 5 — ROLLOVER (carryForwardIn W2) ═══");
  if (!ctx) {
    R["TEST 5"] = "FAIL";
    return;
  }
  const { directory, savedWeeks } = ctx;
  const empW2 = {
    id: "we-kamil-w2",
    directoryId: ctx.empDeferred.directoryId,
    name: "Kamil Elektryk",
    phone: "+48 500 000 001",
    position: "Elektryk",
    rate: "30",
    days: defaultDays7h(),
    settled: false,
  };
  const calcW2 = calcWeekEmployeeForPayroll(empW2, {
    weekFrom: W2.from,
    weekTo: W2.to,
    savedWeeks,
    livePayroll: true,
  });
  const rowW2 = toPayrollCalcRows([{ emp: empW2, ...calcW2 }], directory, W2.from, W2.to, savedWeeks)[0];
  log(`  carryIn=${rowW2.carryForwardIn} displayNet=${rowW2.netPay} (oczek. 1050 / 2100)`);
  R["TEST 5"] = rowW2.carryForwardIn === 1050 && rowW2.netPay === 2100 ? "PASS" : "FAIL";
  log(`TEST 5: ${R["TEST 5"]}`);
}

// TEST 6 — closed week
function test6(ctx) {
  log("\n═══ TEST 6 — CLOSED WEEK ═══");
  if (!ctx) {
    R["TEST 6"] = "FAIL";
    return;
  }
  const { directory, savedWeeks, empDeferred } = ctx;
  const closed = isPayrollWeekClosed(W1.from, W1.to, AFTER_ROLLOVER_NOW);
  const snap = savedWeeks.find((w) => w.weekFrom === W1.from);
  const archivedCalc = calcWeekEmployeeForPayroll(snap.weekEmployees[0], {
    weekFrom: W1.from,
    weekTo: W1.to,
    archivedSnapshot: snap,
    livePayroll: false,
  });
  const deferCheck = canDeferPayroll(
    empDeferred,
    { ...archivedCalc, emp: snap.weekEmployees[0] },
    directory,
    closed,
  );
  const es = findEmployeeSnapshot(snap, empDeferred);
  log(`  closed=${closed} reason=${deferCheck.reason} snapshot carryOut=${es?.carryForwardOut}`);
  const ok =
    closed &&
    !deferCheck.ok &&
    deferCheck.reason === "closed_week" &&
    es?.carryForwardOut === 1050;
  R["TEST 6"] = ok ? "PASS" : "FAIL";
  log(`TEST 6: ${R["TEST 6"]}`);
}

async function main() {
  log("Sprint 20.1B — Pre-Commit Verification");
  log(`W1=${W1.from}–${W1.to} W2=${W2.from}–${W2.to}`);
  const ctx = test1();
  await test2(ctx);
  await test3(ctx);
  test4(ctx);
  test5(ctx);
  test6(ctx);
  log("\n═══ RAPORT pre-commit-verify-20.1b ═══");
  for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
  const ok = Object.values(R).every((v) => v === "PASS");
  log(`\npre-commit-verify WYNIK: ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

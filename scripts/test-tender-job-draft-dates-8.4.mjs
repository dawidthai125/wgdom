/**
 * ETAP 8.4 — testy parserów dat (node, bez importu tenders-bzp / pdf.js)
 * Run: node scripts/test-tender-job-draft-dates-8.4.mjs
 */

function awardContractDateToIso(contractDate) {
  if (!contractDate?.trim()) return undefined;
  const trimmed = contractDate.trim();
  const dmy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return undefined;
}

function addCalendarDaysIso(isoStart, days) {
  const d = new Date(`${isoStart}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dmyToIso(day, month, year) {
  const dd = parseInt(day, 10);
  const mm = parseInt(month, 10);
  const yyyy = parseInt(year, 10);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return undefined;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1990 || yyyy > 2100) return undefined;
  const probe = new Date(`${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T12:00:00`);
  if (probe.getFullYear() !== yyyy || probe.getMonth() + 1 !== mm || probe.getDate() !== dd) return undefined;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function parseAbsoluteDeadlineFromSwzText(raw) {
  if (!raw?.trim()) return undefined;
  const text = raw.replace(/\s+/g, " ").trim();
  const patterns = [
    /\bdo\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i,
    /termin\s+(?:realizacji|wykonania|zakończenia|zakonczenia)\s*[:\s]+(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return dmyToIso(m[1], m[2], m[3]);
  }
  return undefined;
}

function parseUnambiguousDurationDaysFromSwzText(raw) {
  if (!raw?.trim()) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  const dayMatches = [...text.matchAll(/(\d+)\s*(?:dni|dzień|dzien|dni roboczych?)\b/gi)];
  const monthMatches = [...text.matchAll(/(\d+)\s*(?:miesięcy|miesiące|mies\.?)\b/gi)];
  const hits = [];
  for (const m of dayMatches) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0 && n <= 730) hits.push({ kind: "days", n });
  }
  for (const m of monthMatches) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0 && n <= 36) hits.push({ kind: "months", n });
  }
  if (hits.length !== 1) return null;
  return hits[0].kind === "days" ? hits[0].n : hits[0].n * 30;
}

function resolveEndDateFromSwzFallbackText(raw, startDateIso) {
  const abs = parseAbsoluteDeadlineFromSwzText(raw);
  const dur = parseUnambiguousDurationDaysFromSwzText(raw);
  if (abs && dur) return undefined;
  if (startDateIso && dur) return addCalendarDaysIso(startDateIso, dur);
  if (abs) return abs;
  return undefined;
}

function resolveEndDateFromSwzFallbacks(item, startDateIso) {
  for (const raw of [
    item.swzAnalysis?.implementationDeadlineRaw?.trim() || null,
    item.tenderDossier?.brief?.contractPeriod?.trim() || null,
  ]) {
    if (!raw) continue;
    const end = resolveEndDateFromSwzFallbackText(raw, startDateIso);
    if (end) return end;
  }
  return undefined;
}

function resolveJobDraftDatesFromTender(item) {
  const startDate = awardContractDateToIso(item.awardResult?.contractDate);
  if (startDate) {
    const implDays = item.swzAnalysis?.implementationDays;
    if (implDays != null && implDays > 0) {
      return { startDate, endDate: addCalendarDaysIso(startDate, implDays) };
    }
    const endFromFallback = resolveEndDateFromSwzFallbacks(item, startDate);
    if (endFromFallback) return { startDate, endDate: endFromFallback };
    return { startDate };
  }
  const endOnly = resolveEndDateFromSwzFallbacks(item, undefined);
  if (endOnly) return { endDate: endOnly };
  return {};
}

let ok = 0;
let fail = 0;
function assert(label, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { ok++; console.log(`  OK ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n    got ${g}\n    want ${w}`); }
}

console.log("8.1");
assert("umowa+90d", resolveJobDraftDatesFromTender({
  awardResult: { contractDate: "15-03-2026" },
  swzAnalysis: { implementationDays: 90 },
}), { startDate: "2026-03-15", endDate: "2026-06-13" });

console.log("8.4 okres");
assert("umowa+60dni raw", resolveJobDraftDatesFromTender({
  awardResult: { contractDate: "01-01-2026" },
  swzAnalysis: { implementationDays: null, implementationDeadlineRaw: "60 dni" },
}), { startDate: "2026-01-01", endDate: "2026-03-02" });

assert("umowa+6 mies", resolveJobDraftDatesFromTender({
  awardResult: { contractDate: "2026-01-01" },
  swzAnalysis: { implementationDeadlineRaw: "6 miesięcy" },
}), { startDate: "2026-01-01", endDate: "2026-06-30" });

console.log("8.4 data");
assert("do 31.12.2026", resolveJobDraftDatesFromTender({
  swzAnalysis: { implementationDeadlineRaw: "do 31.12.2026" },
}), { endDate: "2026-12-31" });

assert("brief 120d", resolveJobDraftDatesFromTender({
  awardResult: { contractDate: "10-02-2026" },
  tenderDossier: { brief: { contractPeriod: "120 dni" } },
}), { startDate: "2026-02-10", endDate: "2026-06-10" });

console.log("niepewne");
assert("30 lub 60", resolveJobDraftDatesFromTender({
  swzAnalysis: { implementationDeadlineRaw: "30 lub 60 dni" },
}), {});

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);

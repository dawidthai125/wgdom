/**
 * Sprint 20.0A — Leave Picker UX verification
 * Uruchom: npx vite-node scripts/test-leave-picker-20.0a.mjs
 */
import { listSelectablePayrollWeeks } from "../src/lib/employee-leaves.ts";
import { getPayrollWeekRange, daysBetweenIso } from "../src/lib/payroll-cycle.ts";

const NOW = new Date(2026, 5, 6, 12, 0, 0); // 06.06.2026 (sobota)
const DD_MM_YYYY = /^\d{2}\.\d{2}\.\d{4} – \d{2}\.\d{2}\.\d{4}$/;
const YYYY_FIRST = /^\d{4}\.\d{2}\.\d{2}/;

const archived = [
  {
    id: "arch1",
    weekFrom: "2026-06-01",
    weekTo: "2026-06-06",
    savedAt: "",
    employees: [],
    totalEmployees: 0,
    totalHours: 0,
    totalGross: 0,
    totalZaliczka: 0,
    totalNet: 0,
  },
];

const openWeek = getPayrollWeekRange(NOW);
const options = listSelectablePayrollWeeks(archived, 12, NOW);
const optionsNoArchive = listSelectablePayrollWeeks([], 12, NOW);

console.log("=== Kontekst ===");
console.log(`  Dziś (test): 06.06.2026`);
console.log(`  getPayrollWeekRange: ${openWeek.from} – ${openWeek.to}`);

console.log("\n=== 1. Pierwsze 10 pozycji pickera (bez archiwum w filtrze) ===");
optionsNoArchive.slice(0, 10).forEach((w, i) => {
  console.log(`  ${i + 1}. ${w.label}  [${w.weekFrom} → ${w.weekTo}]`);
});

console.log("\n=== 2. Ostatnie 10 pozycji pickera ===");
optionsNoArchive.slice(-10).forEach((w, i) => {
  const n = optionsNoArchive.length - 10 + i + 1;
  console.log(`  ${n}. ${w.label}  [${w.weekFrom} → ${w.weekTo}]`);
});

console.log("\n=== 3. Granice Pn–So (to − from = 5 dni) ===");
const allPnSo = optionsNoArchive.every((w) => daysBetweenIso(w.weekFrom, w.weekTo) === 5);
console.log(`  Wszystkie tygodnie Pn–So: ${allPnSo ? "TAK" : "NIE"}`);

console.log("\n=== 4. Format DD.MM.YYYY ===");
const allFmt = optionsNoArchive.every((w) => DD_MM_YYYY.test(w.label));
const anyYyyyFirst = optionsNoArchive.some((w) => YYYY_FIRST.test(w.label));
console.log(`  Wszystkie etykiety DD.MM.YYYY – DD.MM.YYYY: ${allFmt ? "TAK" : "NIE"}`);
console.log(`  Brak formatu YYYY.MM.DD: ${!anyYyyyFirst ? "TAK" : "NIE"}`);

console.log("\n=== 5. Brak tygodni historycznych ===");
const beforeOpen = optionsNoArchive.filter((w) => w.weekFrom < openWeek.from);
console.log(`  Tygodni przed otwartym (${openWeek.from}): ${beforeOpen.length}`);
console.log(`  Pierwszy tydzień pickera = otwarty tydzień payroll: ${optionsNoArchive[0]?.weekFrom === openWeek.from ? "TAK" : "NIE"}`);

console.log("\n=== 6. Archiwum wykluczone z listy ===");
const hasArchivedWeek = options.some((w) => w.weekFrom === "2026-06-01" && w.weekTo === "2026-06-06");
console.log(`  Tydzień 01.06–06.06 w archiwum nie na liście: ${!hasArchivedWeek ? "TAK" : "NIE"}`);

console.log("\n=== 7. Horyzont (~52 tygodnie) ===");
console.log(`  Liczba pozycji: ${optionsNoArchive.length}`);

const checks = [
  ["format DD.MM.YYYY", allFmt && !anyYyyyFirst],
  ["Pn–So", allPnSo],
  ["start = open week", optionsNoArchive[0]?.weekFrom === openWeek.from],
  ["no historical", beforeOpen.length === 0],
  ["archive excluded", !hasArchivedWeek],
  ["count ~52", optionsNoArchive.length >= 50 && optionsNoArchive.length <= 53],
];

console.log("\n=== RAPORT ===");
let fail = 0;
for (const [name, ok] of checks) {
  console.log(`  ${name}: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) fail += 1;
}
process.exit(fail ? 1 : 0);

/**
 * v2.57.1 — Menu cleanup: Pracownicy + Kontakty merge (static smoke)
 */
import { buildAdminNavItems, isNavItemActive } from "../src/app/admin/admin-nav.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

const input = {
  canViewTendersNav: true,
  productionWeekEmployees: [],
  directory: [{ id: "1", name: "A", position: "x", phone: "", rate: 0 }],
  contacts: [],
  savedWeeks: [],
  jobs: [],
  recoverableCharges: [],
  adminUserId: "dawid",
};

const withTenders = buildAdminNavItems(input);
const withoutTenders = buildAdminNavItems({ ...input, canViewTendersNav: false });

console.log("T1 — brak osobnej pozycji Kontakty w menu");
assert(!withTenders.some((n) => n.key === "contacts"), "contacts not in nav items");

console.log("T2 — jedna pozycja directory z etykietą");
const dirItem = withTenders.find((n) => n.key === "directory");
assert(dirItem?.label === "Pracownicy i kontakty", `label = ${dirItem?.label}`);

console.log("T3 — liczba pozycji menu (przy tenders)");
assert(withTenders.length === 12, `count with tenders = ${withTenders.length} (expected 12)`);
assert(withoutTenders.length === 11, `count without tenders = ${withoutTenders.length} (expected 11)`);

console.log("T4 — isNavItemActive dla połączonego modułu");
assert(isNavItemActive("directory", "directory"), "directory active on directory view");
assert(isNavItemActive("directory", "contacts"), "directory active on contacts view");
assert(!isNavItemActive("payroll", "contacts"), "payroll not active on contacts view");

console.log("T5 — Notatki operacyjne nadal w menu");
assert(withTenders.some((n) => n.key === "operationalnotes"), "operationalnotes present");

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);

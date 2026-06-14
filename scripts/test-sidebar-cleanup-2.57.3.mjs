/**
 * v2.57.3 — Sidebar cleanup + Kadry (static smoke)
 * Uruchom: npx vite-node scripts/test-sidebar-cleanup-2.57.3.mjs
 */
import { buildAdminNavItems, isNavItemActive } from "../src/app/admin/admin-nav.ts";
import { ADMIN_SIDEBAR_WIDTH_CLASS } from "../src/app/admin/AdminSidebar.tsx";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
  directory: [],
  contacts: [],
  savedWeeks: [],
  jobs: [],
  recoverableCharges: [],
  adminUserId: "dawid",
  operationalNotes: [],
  operationalNotesReadState: [],
  adminSession: { id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" },
};

const nav = buildAdminNavItems(input);
const kadry = nav.find((n) => n.key === "directory");

console.log("T1 — etykieta Kadry");
assert(kadry?.label === "Kadry", `label = ${kadry?.label}`);

console.log("T2 — routing directory/contacts bez zmian");
assert(isNavItemActive("directory", "contacts"), "directory active on contacts");

console.log("T3 — sidebar width w-60 (+16px vs w-56)");
assert(ADMIN_SIDEBAR_WIDTH_CLASS === "w-60", `width class = ${ADMIN_SIDEBAR_WIDTH_CLASS}`);

console.log("T4 — brak sekcji Bieżący tydzień w AdminSidebar");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sidebarSrc = readFileSync(join(root, "src/app/admin/AdminSidebar.tsx"), "utf8");
assert(!sidebarSrc.includes("Bieżący tydzień"), "no Bieżący tydzień block");
assert(!sidebarSrc.includes("productionWeekEmployees"), "no payroll KPI props");

console.log("T5 — dark scrollbar CSS");
const mobileCss = readFileSync(join(root, "src/styles/mobile.css"), "utf8");
assert(mobileCss.includes("admin-sidebar-scroll"), "scrollbar class defined");

console.log("T6 — Notatki operacyjne badge slot");
const notes = nav.find((n) => n.key === "operationalnotes");
assert(notes != null, "operationalnotes in nav");

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);

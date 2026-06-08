/**
 * Desktop Layout Fix 2.50.20 — scroll dokumentu + min-w-0
 * Uruchom: npx vite-node scripts/smoke-test-desktop-layout-2.50.20.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

log("=== Desktop Layout 2.50.20 smoke ===\n");

const indexHtml = read("index.html");
const mobileCss = read("src/styles/mobile.css");
const adminRouter = read("src/app/admin/AdminViewRouter.tsx");
const dashboard = read("src/app/DashboardView.tsx");
const jobs = read("src/app/JobsView.tsx");
const payroll = read("src/app/PayrollView.tsx");
const media = read("src/app/MediaView.tsx");

// T1 — wyłączony scroll dokumentu (md+)
assert(
  "T1_document_overflow_hidden",
  indexHtml.includes("overflow: hidden") && !indexHtml.includes("overflow-y: auto"),
);
assert(
  "T1_root_overflow_hidden",
  indexHtml.includes("#root") && indexHtml.includes("overflow: hidden"),
);

// T2 — offset visualViewport na shellu, nie na body (md+)
assert(
  "T2_viewport_offset_on_shell",
  mobileCss.includes("padding-top: var(--app-viewport-offset-top")
    && !indexHtml.match(/padding-top:\s*var\(--app-viewport-offset-top/),
);

// T3 — min-w-0 łańcuch flex
assert("T3_admin_view_router_min_w_0", adminRouter.includes("min-w-0"));
assert(
  "T3_dashboard_scroll_container",
  dashboard.includes("min-w-0 overflow-y-auto"),
);
assert("T3_media_min_w_0", media.includes("min-w-0"));

// T4 — Dashboard (scroll wewnętrzny)
assert(
  "T4_dashboard_internal_scroll",
  dashboard.includes("flex-1 min-w-0 overflow-y-auto overscroll-contain"),
);

// T5 — Roboty (lista + split mają min-w-0)
assert(
  "T5_jobs_list_min_w_0",
  jobs.includes("flex-[11] min-w-0 min-h-0"),
);
assert(
  "T5_jobs_internal_scroll",
  jobs.includes("flex-1 overflow-y-auto overscroll-contain"),
);

// T6 — Payroll (tabela w overflow-x-auto, panel min-w-0)
assert(
  "T6_payroll_list_min_w_0",
  payroll.includes("flex flex-col flex-1 min-w-0 overflow-hidden"),
);
assert(
  "T6_payroll_internal_scroll",
  payroll.includes("flex-1 overflow-y-auto overscroll-contain"),
);
assert(
  "T6_payroll_table_contained",
  payroll.includes("overflow-x-auto overscroll-x-contain")
    && payroll.includes("min-w-[1040px]"),
);

// T7 — mobile nietknięte (<768px overflow hidden w index)
const mobileBlock = indexHtml.slice(0, indexHtml.indexOf("@media (min-width: 768px)"));
assert(
  "T7_mobile_overflow_hidden",
  mobileBlock.includes("overflow: hidden") && mobileBlock.includes("100dvh"),
);

log("\n--- Podsumowanie ---");
const passed = Object.values(results).filter((r) => r === "PASS").length;
log(`PASS: ${passed}  FAIL: ${Object.values(results).filter((r) => r === "FAIL").length}`);
log("\n✓ Desktop Layout 2.50.20 static smoke — ALL PASS");

/**
 * Sprint 20.5B.2 — Inspector Admin Simplification
 * Uruchom: npx vite-node scripts/smoke-test-inspector-admin-simplification-20.5b2.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveInspectorFeedDeepLink,
  resolveInspectorActivitySection,
  inspectorFeedSectionLabel,
} from "../src/lib/inspector-feed-deeplink.ts";

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

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

log("=== Sprint 20.5B.2 — Inspector Admin Simplification ===\n");

// T1 — Feed → Dokument → Roboty/Dokumenty
{
  const link = resolveInspectorFeedDeepLink({ type: "inspector_document" });
  assert("T1 section documents", link.section === "documents");
  assert("T1 label Dokumenty", link.sectionLabel === "Dokumenty");
}

// T2 — Feed → Zdjęcie → Roboty/Zdjęcia
{
  const link = resolveInspectorFeedDeepLink({ type: "inspector_photo" });
  assert("T2 section photos", link.section === "photos");
  assert("T2 label Zdjęcia", inspectorFeedSectionLabel("photos") === "Zdjęcia");
}

// T3 — Feed → Billing Proposal → Roboty/Przegląd
{
  const link = resolveInspectorFeedDeepLink({ type: "inspector_billing_proposal" });
  assert("T3 section summary", link.section === "summary");
  assert("T3 resolveInspectorActivitySection", resolveInspectorActivitySection("inspector_billing_proposal") === "summary");
}

// T4 — Feed → Notatka WM → Roboty/Przegląd
{
  const link = resolveInspectorFeedDeepLink({ type: "inspector_note" });
  assert("T4 section summary", link.section === "summary");
}

// T5 — Feed → Plik → Roboty/Pliki
{
  const link = resolveInspectorFeedDeepLink({ type: "inspector_file" });
  assert("T5 section files", link.section === "files");
}

// T6 — Email plików z Roboty (JobInspectorFilesPanel + send-job-files-email)
{
  const jobsView = readSrc("src/app/JobsView.tsx");
  assert("T6 JobsView imports JobInspectorFilesPanel", jobsView.includes("JobInspectorFilesPanel"));
  assert("T6 JobsView renders panel in files section", jobsView.includes('detailSection === "files"') && jobsView.includes("hidePackButton"));
  const emailModal = readSrc("src/app/JobFilesEmailModal.tsx");
  assert("T6 send-job-files-email endpoint", emailModal.includes("send-job-files-email"));
  assert("T6 InspectorAdminJobDetail removed from JobsView", !jobsView.includes("InspectorAdminJobDetail"));
}

// T7 — Filtr billing proposal
{
  const adminView = readSrc("src/app/InspectorAdminView.tsx");
  assert("T7 filter inspector_billing_proposal", adminView.includes('"inspector_billing_proposal"'));
  assert("T7 label Propozycje billing filter", adminView.includes("Propozycje billing"));
}

// T8 — Filtr billing note
{
  const adminView = readSrc("src/app/InspectorAdminView.tsx");
  assert("T8 filter inspector_billing_note", adminView.includes('"inspector_billing_note"'));
  assert("T8 label Uwagi billing", adminView.includes("Uwagi billing"));
}

// T9 — KPI billing proposal
{
  const adminView = readSrc("src/app/InspectorAdminView.tsx");
  assert("T9 KPI billingProposals stat", adminView.includes("billingProposals"));
  assert("T9 KPI label Propozycje billing", adminView.includes('{ label: "Propozycje billing"'));
}

// T10 — Portfolio WM na Pulpicie
{
  const dashboard = readSrc("src/app/DashboardView.tsx");
  const inspectorAdmin = readSrc("src/app/InspectorAdminView.tsx");
  assert("T10 Dashboard has WmPortfolioView", dashboard.includes("WmPortfolioView") && dashboard.includes('id="wm-portfolio"'));
  assert("T10 InspectorAdminView no portfolio tab", !inspectorAdmin.includes("WmPortfolioView"));
  assert("T10 InspectorAdminView no portfolio tab UI", !inspectorAdmin.includes('setTab("portfolio")') && !inspectorAdmin.includes("Portfolio WM"));
}

// T11 — InspectorAdminJobDetail usunięty
{
  assert("T11 file deleted", !existsSync(resolve(root, "src/app/InspectorAdminJobDetail.tsx")));
  const adminView = readSrc("src/app/InspectorAdminView.tsx");
  assert("T11 no import", !adminView.includes("InspectorAdminJobDetail"));
  assert("T11 no selectedJobId detail routing", !adminView.includes("selectedJobId"));
  const app = readSrc("src/app/App.tsx");
  assert("T11 no pendingInspectorJobId", !app.includes("pendingInspectorJobId"));
  assert("T11 pendingJobSection exists", app.includes("pendingJobSection"));
}

// T12 — Build (static: kluczowe pliki istnieją)
{
  assert("T12 helper exists", existsSync(resolve(root, "src/lib/inspector-feed-deeplink.ts")));
  assert("T12 AdminViewRouter pendingJobSection", readSrc("src/app/admin/AdminViewRouter.tsx").includes("pendingJobSection"));
  assert("T12 Feed CTA Otwórz w Robotach", readSrc("src/app/InspectorAdminView.tsx").includes("Otwórz w Robotach"));
}

const pass = Object.values(results).filter((r) => r === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);

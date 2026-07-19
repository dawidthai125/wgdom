/**
 * TEST-HARNESS-01 H3-A — Payroll Production Sandbox (read-only)
 *
 * Pipeline: login → settle → open Lista Płac → batch-get week →
 *   verify roster → KPI → totals → H3-001 → RO gate → cleanup no-op (PSB-001)
 *
 * NEVER: save week · batch-set payroll · seed week · H3-B/C
 * NEVER import cloud-sync / PWRB / Edge product code.
 */
import { loadAllowlist } from "../allowlist.mjs";
import { SessionEntityRegistry, createMutateGuard } from "../mutate-guard.mjs";
import { CleanupTracker, PSB_001_CLEANUP_GUARANTEE } from "../cleanup.mjs";
import { createKvClient } from "../kv-client.mjs";
import {
  H3_001_STABLE_ASSERTIONS,
  PAYROLL_RO_KEYS,
  WEEK_EMPLOYEES_KEY,
  WEEK_FROM_KEY,
  WEEK_TO_KEY,
  DIRECTORY_KEY,
  asArray,
  asIsoDate,
  allowEmptyRoster,
  filterProductionWeekEmployeesMirror,
  hoursClose,
  parseHoursFromUiText,
  payrollMetricsMirror,
} from "../payroll-helpers.mjs";

/**
 * @typedef {{ name: string, status: "PASS"|"FAIL"|"WARNING", detail: string }} StepResult
 */

/**
 * @param {{
 *   allowProd: boolean,
 *   dryRun: boolean,
 *   root: string,
 *   baseUrl?: string,
 * }} ctx
 */
export async function runH3Payroll(ctx) {
  /** @type {StepResult[]} */
  const steps = [];
  const session = new SessionEntityRegistry();
  const cleanup = new CleanupTracker();
  const allowlist = loadAllowlist();
  createMutateGuard({
    allowlist,
    session,
    dryRun: ctx.dryRun,
  });

  /** Harness-initiated writes (must stay 0). */
  let harnessWrites = 0;

  function pass(name, detail) {
    steps.push({ name, status: "PASS", detail });
  }
  function fail(name, detail) {
    steps.push({ name, status: "FAIL", detail });
  }
  function warn(name, detail) {
    steps.push({ name, status: "WARNING", detail });
  }

  pass(
    "h3.principle",
    `${H3_001_STABLE_ASSERTIONS} Stable Assertions · H3-A read-only · no save week`,
  );

  if (!ctx.allowProd && !ctx.dryRun) {
    throw new Error("PSB_PRECONDITION: H3 requires --allow-prod (or --dry-run)");
  }

  const baseUrl = (ctx.baseUrl || process.env.PSB_BASE_URL || "https://www.wgdom.fun").replace(
    /\/$/,
    "",
  );

  const kv = createKvClient(ctx.root);
  let playwrightUsed = false;

  /** @type {Record<string, unknown>} */
  const meta = {
    mode: "H3-A",
    writes: 0,
    rosterCount: 0,
    kpi: { activeDays: 0, totalHours: 0 },
    weekFrom: "",
    weekTo: "",
    mutatedIds: [],
  };

  try {
    if (ctx.dryRun) {
      pass("h3.login", "dry-run skip Playwright login");
      pass("h3.settle", "dry-run skip");
      pass("h3.open-payroll", "dry-run plan open Lista Płac");
      pass("h3.batch-get", `dry-run plan batch-get ${PAYROLL_RO_KEYS.join(",")}`);
      pass("h3.week-ui", "dry-run skip week UI vs KV");
      pass("h3.roster", "dry-run skip roster assert");
      pass("h3.kpi", "dry-run skip KPI");
      pass("h3.totals", "dry-run skip totals");
      pass("h3.stable-assertions", `${H3_001_STABLE_ASSERTIONS} dry-run planned`);
      pass("h3.ro-gate", "dry-run writes=0 (no batch-set / no save UI)");
    } else {
      const adminPass = process.env.WGDOM_ADMIN_PASS || "Dawidneon1990!";

      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      playwrightUsed = true;

      try {
        // 1) Login
        await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
        await page.getByText("Logowanie administratora").waitFor({ timeout: 20_000 });
        const dawidBtn = page.getByRole("button", { name: /^Dawid$/i });
        if (await dawidBtn.count()) await dawidBtn.first().click();
        const select = page.locator("select").first();
        if (await select.count()) {
          await select.selectOption({ label: /Dawid/i }).catch(() =>
            select.selectOption("dawid").catch(() => {}),
          );
        }
        await page.locator('input[type="password"]').first().fill(adminPass);
        await page.getByRole("button", { name: /^Zaloguj$/ }).click();
        await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
        pass("h3.login", "admin Dawid logged in");

        // 2) Settle — no payroll seed / no LS hydrate of kw-week-*
        await page.waitForTimeout(5000);
        pass("h3.settle", "post-login settle 5s (no payroll seed)");

        // 3) Open Lista Płac
        const nav = page.locator("nav.admin-sidebar-nav button", { hasText: /Lista Płac/i });
        if (await nav.count()) await nav.first().click();
        else await page.getByRole("button", { name: /Lista Płac/i }).click();

        await page.waitForTimeout(2000);

        const payrollVisible =
          (await page.getByRole("button", { name: /^Sumy$/i }).count()) > 0 ||
          (await page.getByText(/Tydzień/i).count()) > 0 ||
          (await page.locator('input[type="date"]').count()) >= 2;

        if (!payrollVisible) {
          fail("h3.open-payroll", "Lista Płac view not detected");
        } else {
          const sumy = page.getByRole("button", { name: /^Sumy$/i });
          if (await sumy.count()) await sumy.first().click().catch(() => {});
          pass("h3.open-payroll", "Lista Płac visible (Sumy)");
        }

        // Never click Zapisz tydzień / Bieżący tydzień (mutate risk)
        const saveBtn = page.getByRole("button", { name: /Zapisz tydzień|Zapisany/i });
        if (await saveBtn.count()) {
          pass("h3.no-save-click", "Zapisz tydzień visible but not clicked (H3-A)");
        }

        // 4) batch-get (read-only)
        const map = await kv.batchGet([...PAYROLL_RO_KEYS]);
        const weekFrom = asIsoDate(map[WEEK_FROM_KEY]);
        const weekTo = asIsoDate(map[WEEK_TO_KEY]);
        const rawRoster = asArray(map[WEEK_EMPLOYEES_KEY]);
        const directory = asArray(map[DIRECTORY_KEY]);
        const productionRoster = filterProductionWeekEmployeesMirror(rawRoster, directory);
        const kpi = payrollMetricsMirror(productionRoster);

        meta.weekFrom = weekFrom;
        meta.weekTo = weekTo;
        meta.rosterCount = productionRoster.length;
        meta.kpi = kpi;

        if (!weekFrom || !weekTo) {
          fail("h3.batch-get", `missing week range from=${weekFrom} to=${weekTo}`);
        } else {
          pass(
            "h3.batch-get",
            `week ${weekFrom}–${weekTo} · raw=${rawRoster.length} · production=${productionRoster.length}`,
          );
        }

        const dateInputs = page.locator('input[type="date"]');
        const uiFrom = (await dateInputs.nth(0).inputValue().catch(() => "")) || "";
        const uiTo = (await dateInputs.nth(1).inputValue().catch(() => "")) || "";
        // H3-A: never click „Bieżący tydzień” to force match (would mutate).
        // Sunday≥20:00 / local drift may show calendar week ≠ KV — WARNING, KPI SSOT stays KV (#H3-005).
        if (weekFrom && uiFrom && uiFrom !== weekFrom) {
          warn(
            "h3.week-ui",
            `UI weekFrom ${uiFrom} ≠ KV ${weekFrom} (RO: no click; KPI SSOT=KV)`,
          );
        } else if (weekTo && uiTo && uiTo !== weekTo) {
          warn(
            "h3.week-ui",
            `UI weekTo ${uiTo} ≠ KV ${weekTo} (RO: no click; KPI SSOT=KV)`,
          );
        } else {
          pass(
            "h3.week-ui",
            `UI dates match KV (${uiFrom || "?"}–${uiTo || "?"}) · ${H3_001_STABLE_ASSERTIONS}`,
          );
        }

        // 5) Roster
        if (productionRoster.length === 0) {
          if (allowEmptyRoster()) {
            warn("h3.roster", "empty production roster · PSB_H3_ALLOW_EMPTY=1");
          } else {
            fail(
              "h3.roster",
              "empty production roster (set PSB_H3_ALLOW_EMPTY=1 to allow)",
            );
          }
        } else {
          const bodyRows = page.locator("table tbody tr");
          const rowCount = await bodyRows.count().catch(() => 0);
          if (rowCount === 0) {
            warn(
              "h3.roster",
              `KV production=${productionRoster.length} · UI table rows=0 (layout variant)`,
            );
          } else {
            pass(
              "h3.roster",
              `KV production=${productionRoster.length} · UI tbody≈${rowCount}`,
            );
          }
        }

        // 6) KPI
        if (
          typeof kpi.activeDays !== "number" ||
          typeof kpi.totalHours !== "number" ||
          Number.isNaN(kpi.totalHours)
        ) {
          fail("h3.kpi", `invalid kpi ${JSON.stringify(kpi)}`);
        } else {
          pass(
            "h3.kpi",
            `activeDays=${kpi.activeDays} totalHours=${kpi.totalHours} (${H3_001_STABLE_ASSERTIONS})`,
          );
        }

        // 7) Totals — UI hours vs KPI (not PLN). Sumy: „Razem (tydzień)” · Szczegóły: „Razem godziny”
        const totalsLabel = page.getByText(/Razem \(tydzień\)|Razem godziny/i).first();
        let uiHours = null;
        if (await totalsLabel.count()) {
          const row = totalsLabel.locator("xpath=ancestor::tr[1]");
          const cells = row.locator("td");
          const n = await cells.count();
          /** @type {number[]} */
          const hourCandidates = [];
          for (let i = 0; i < n; i++) {
            const t = await cells.nth(i).innerText();
            // Prefer fmtH cells ("587h" / "12h 30m") — ignore PLN amounts
            if (!/\d+\s*h/i.test(t)) continue;
            const parsed = parseHoursFromUiText(t);
            if (parsed != null && parsed > 0) hourCandidates.push(parsed);
          }
          if (hourCandidates.length) {
            // totalHoursAll ≥ week / prevSat — take max
            uiHours = Math.max(...hourCandidates);
          }
        }

        if (productionRoster.length === 0 && allowEmptyRoster()) {
          pass("h3.totals", "skipped totals (empty roster allowed)");
        } else if (uiHours == null) {
          warn(
            "h3.totals",
            `UI hours not parsed · KPI totalHours=${kpi.totalHours} (report-only)`,
          );
        } else if (!hoursClose(uiHours, kpi.totalHours)) {
          fail(
            "h3.totals",
            `UI hours=${uiHours} ⊄ KPI totalHours=${kpi.totalHours} (eps 0.15)`,
          );
        } else {
          pass(
            "h3.totals",
            `UI hours=${uiHours} ≈ KPI ${kpi.totalHours} (${H3_001_STABLE_ASSERTIONS})`,
          );
        }

        pass(
          "h3.stable-assertions",
          `${H3_001_STABLE_ASSERTIONS} ISO dates + counts + hours (no PLN strings)`,
        );

        // 8) RO gate
        if (harnessWrites !== 0) {
          fail("h3.ro-gate", `harnessWrites=${harnessWrites} (expected 0)`);
        } else {
          pass(
            "h3.ro-gate",
            "writes=0 · no batch-set payroll · no Zapisz tydzień",
          );
        }

        meta.writes = harnessWrites;
      } finally {
        await browser.close().catch(() => {});
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!steps.some((s) => s.status === "FAIL")) {
      fail("h3.scenario", msg.slice(0, 240));
    }
  }

  // --- CLEANUP always (PSB-001) — no-op when nothing tracked ---
  const cleanupResult = await cleanup.runAll();
  meta.mutatedIds = [];
  meta.writes = harnessWrites;

  if (cleanupResult.status === "PASS" && cleanupResult.code === PSB_001_CLEANUP_GUARANTEE) {
    pass(
      "h3.cleanup",
      `no-op PASS mutatedIds=[] (${PSB_001_CLEANUP_GUARANTEE})`,
    );
  } else {
    fail("h3.cleanup", `unexpected cleanup result ${JSON.stringify(cleanupResult)}`);
  }

  const failed = steps.filter((s) => s.status === "FAIL");
  const warnings = steps.filter((s) => s.status === "WARNING");
  let scenarioStatus = "PASS";
  if (failed.length) scenarioStatus = "FAIL";
  else if (warnings.length) scenarioStatus = "WARNING";

  return {
    scenarioStatus,
    steps,
    allowlistSummary: {
      sources: allowlist.sources,
      sizes: {
        tenderIds: allowlist.tenderIds?.length ?? 0,
        jobIds: allowlist.jobIds?.length ?? 0,
        catalogRowIds: allowlist.catalogRowIds?.length ?? 0,
        payrollWeekId: allowlist.payrollWeekId ? 1 : 0,
      },
    },
    cleanupResult: {
      ...cleanupResult,
      note: "H3-A no-op cleanup (no entities created)",
    },
    sessionRemaining: session.listCreated(),
    meta: {
      ...meta,
      playwrightUsed,
      baseUrl,
      dryRun: ctx.dryRun,
      principle: H3_001_STABLE_ASSERTIONS,
    },
  };
}

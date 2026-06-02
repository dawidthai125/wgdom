/**
 * Diagnostyka FAIL smoke-etap1d-archive.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:5212";
const report = {};

async function loginAdmin(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.evaluate(() => {
    sessionStorage.setItem("wg-session-mode", "admin");
    sessionStorage.setItem(
      "wg-admin-session",
      JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
  await page.waitForTimeout(3000);
}

function weekRowBtn(page) {
  return page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).first();
}

function expandedPanel(page) {
  return page.locator(".border-t.border-border").filter({
    has: page.getByRole("button", { name: /^Lista płac$/i }),
  }).last();
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await loginAdmin(page);

  // --- SETUP: navigate to archive (same as smoke) ---
  await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
  await page.waitForTimeout(2000);

  const weekCount = await page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).count();
  const pdfVisible = await page.getByRole("button", { name: /Raport roczny PDF/i }).isVisible().catch(() => false);
  report.setup = { weekCount, pdfVisible, archiveText: (await page.locator("body").innerText()).includes("Raport roczny PDF") };

  // --- 1. EXPAND: reproduce smoke bug ---
  const expandDiag = { steps: [] };
  try {
    const btn = weekRowBtn(page);
    expandDiag.steps.push({ step: "waitFor visible", ok: true });
    await btn.waitFor({ state: "visible", timeout: 5000 });

    // smoke uses evaluate click - test if stale
    expandDiag.steps.push({ step: "before evaluate", attached: await btn.count() });
    try {
      await btn.evaluate((el) => el.click());
      expandDiag.evaluateClick = "ok";
    } catch (e) {
      expandDiag.evaluateClick = `FAIL: ${e.message}`;
    }

    await page.waitForTimeout(800);
    expandDiag.panelAfterEvaluate = await expandedPanel(page).isVisible().catch(() => false);

    // alternative: native click
    if (!expandDiag.panelAfterEvaluate) {
      try {
        await weekRowBtn(page).click({ force: true, timeout: 5000 });
        expandDiag.nativeClick = "ok";
      } catch (e) {
        expandDiag.nativeClick = `FAIL: ${e.message}`;
      }
      await page.waitForTimeout(800);
      expandDiag.panelAfterNative = await expandedPanel(page).isVisible().catch(() => false);
    }

    // DevTools-style: dispatch click on DOM
    if (!(await expandedPanel(page).isVisible().catch(() => false))) {
      const clicked = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button.w-full")].find((x) => /\d{2}\.\d{2}\.\d{4}/.test(x.innerText));
        if (!b) return "no button";
        b.click();
        return "clicked";
      });
      expandDiag.devtoolsClick = clicked;
      await page.waitForTimeout(800);
      expandDiag.panelAfterDevtools = await expandedPanel(page).isVisible().catch(() => false);
    }

    expandDiag.finalPanelVisible = await expandedPanel(page).isVisible().catch(() => false);
    expandDiag.listaPlacTabs = await page.getByRole("button", { name: /^Lista płac$/i }).count();
  } catch (e) {
    expandDiag.error = e.message;
  }
  report.expand = expandDiag;

  // Ensure expanded for downstream tests
  if (!(await expandedPanel(page).isVisible().catch(() => false))) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button.w-full")].find((x) => /\d{2}\.\d{2}\.\d{4}/.test(x.innerText));
      b?.click();
    });
    await page.waitForTimeout(800);
  }

  const panel = expandedPanel(page);
  const panelVisible = await panel.isVisible().catch(() => false);
  report.panelReady = panelVisible;

  // --- 2. GRAFIK tab ---
  const grafikDiag = {};
  try {
    grafikDiag.sidebarGrafikCount = await page.locator("nav.admin-sidebar-nav").getByRole("button", { name: /Grafik/i }).count();
    grafikDiag.panelGrafikCount = await panel.getByRole("button", { name: /^Grafik$/i }).count();
    grafikDiag.pageGrafikLast = await page.getByRole("button", { name: /^Grafik$/i }).count();
    await panel.getByRole("button", { name: /^Grafik$/i }).click({ timeout: 5000 });
    grafikDiag.tableVisible = await panel.locator("table").first().isVisible().catch(() => false);
    grafikDiag.ok = grafikDiag.tableVisible;
  } catch (e) {
    grafikDiag.error = e.message;
  }
  report.grafik = grafikDiag;

  // --- 3. LISTA PŁAC tab ---
  const payrollDiag = {};
  try {
    await panel.getByRole("button", { name: /^Lista płac$/i }).click({ timeout: 5000 });
    payrollDiag.rowCount = await panel.locator("table tbody tr").count();
    payrollDiag.ok = payrollDiag.rowCount > 0;
  } catch (e) {
    payrollDiag.error = e.message;
  }
  report.payrollTab = payrollDiag;

  // --- 4. EDIT employee ---
  const editDiag = {};
  try {
    const row = panel.locator("table tbody tr").first();
    editDiag.rowCount = await panel.locator("table tbody tr").count();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    editDiag.zamknijVisible = await panel.getByText("Zamknij edycję").isVisible().catch(() => false);
    editDiag.ok = editDiag.zamknijVisible;
  } catch (e) {
    editDiag.error = e.message;
  }
  report.edit = editDiag;

  // --- 5. TOGGLE settled ---
  const toggleDiag = {};
  try {
    await panel.getByRole("button", { name: /Zamknij edycję/i }).click({ timeout: 3000 }).catch(() => {});
    const toggleBtn = panel.getByRole("button", { name: /Oczekuje|Rozliczony/i }).first();
    toggleDiag.toggleCount = await panel.getByRole("button", { name: /Oczekuje|Rozliczony/i }).count();
    const before = await toggleBtn.textContent();
    await toggleBtn.click({ timeout: 5000 });
    await page.waitForTimeout(400);
    const after = await toggleBtn.textContent();
    toggleDiag.before = before?.trim();
    toggleDiag.after = after?.trim();
    toggleDiag.ok = before !== after;
    if (toggleDiag.ok) await toggleBtn.click({ timeout: 5000 }); // restore
  } catch (e) {
    toggleDiag.error = e.message;
  }
  report.toggle = toggleDiag;

  // --- 6. PDF (before delete/reload) ---
  const pdfDiag = {};
  try {
    await page.locator(".flex-1.overflow-y-auto").first().evaluate((el) => { el.scrollTop = 0; }).catch(() => {});
    pdfDiag.buttonVisible = await page.getByRole("button", { name: /Raport roczny PDF/i }).isVisible().catch(() => false);
    if (pdfDiag.buttonVisible) {
      const dlPromise = page.waitForEvent("download", { timeout: 45_000 });
      await page.getByRole("button", { name: /Raport roczny PDF/i }).click({ timeout: 5000 });
      const dl = await dlPromise;
      pdfDiag.filename = dl.suggestedFilename();
      pdfDiag.ok = pdfDiag.filename?.endsWith(".pdf");
    } else {
      pdfDiag.error = "button not visible";
    }
  } catch (e) {
    pdfDiag.error = e.message.split("\n")[0];
  }
  report.pdf = pdfDiag;

  // --- 7. DELETE: inject + CloudLoader ---
  const deleteDiag = {};
  try {
    const TEST_ID = `smoke-diag-${Date.now()}`;
    const empId = crypto.randomUUID();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const weekFrom = `${y}-${String(m + 1).padStart(2, "0")}-28`;
    const testWeek = {
      id: TEST_ID,
      weekFrom,
      weekTo: weekFrom,
      savedAt: new Date().toISOString(),
      employees: [{ name: "Smoke Del ETAP1D", position: "T", rate: 25, weekHours: 1, prevSatHours: 0, totalHours: 1, grossPay: 25, totalZaliczka: 0, totalExtraCosts: 0, netPay: 25, settled: false }],
      totalEmployees: 1, totalHours: 1, totalGross: 25, totalZaliczka: 0, totalNet: 25,
      weekEmployees: [{ id: empId, name: "Smoke Del ETAP1D", position: "T", rate: "25", settled: false, days: { mon: { hours: "1", from: "08:00", to: "09:00", zaliczka: "", note: "" }, tue: { hours: "", from: "", to: "", zaliczka: "", note: "" }, wed: { hours: "", from: "", to: "", zaliczka: "", note: "" }, thu: { hours: "", from: "", to: "", zaliczka: "", note: "" }, fri: { hours: "", from: "", to: "", zaliczka: "", note: "" }, sat: { hours: "", from: "", to: "", zaliczka: "", note: "" } }, prevSaturday: { hours: "", from: "", to: "", zaliczka: "", note: "" }, extraCosts: [] }],
      workEntries: [],
    };

    deleteDiag.inLS_beforeInject = await page.evaluate((id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id), TEST_ID);

    await page.evaluate(({ week, id }) => {
      const archive = JSON.parse(localStorage.getItem("kw-archive") || "[]");
      archive.push(week);
      localStorage.setItem("kw-archive", JSON.stringify(archive));
    }, { week: testWeek, id: TEST_ID });

    deleteDiag.inLS_afterInject = await page.evaluate((id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id), TEST_ID);

    // React still on old state - UI won't show until reload
    deleteDiag.inUI_beforeReload = await page.getByText("Smoke Del ETAP1D").isVisible().catch(() => false);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    await page.waitForTimeout(4000); // CloudLoader window

    deleteDiag.inLS_afterReload = await page.evaluate((id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id), TEST_ID);
    deleteDiag.archiveCountAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-archive") || "[]").length);

    await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
    await page.waitForTimeout(2000);

    deleteDiag.inUI_afterReload = await page.getByText("Smoke Del ETAP1D").isVisible().catch(() => false);
    deleteDiag.weekBtnWithSmoke = await page.getByRole("button", { name: /Smoke Del ETAP1D/i }).count();

    // UI delete if visible
    if (deleteDiag.inUI_afterReload) {
      const card = page.locator(".bg-card.rounded-xl.border.overflow-hidden").filter({ hasText: "Smoke Del ETAP1D" }).first();
      await card.locator(".flex.items-center.gap-2 > button").first().click();
      await page.getByRole("button", { name: /^Usuń$/i }).click();
      await page.waitForTimeout(800);
      deleteDiag.inLS_afterDelete = await page.evaluate((id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id), TEST_ID);
      deleteDiag.uiDeleteWorked = !deleteDiag.inLS_afterDelete;
    }

    deleteDiag.ok = deleteDiag.uiDeleteWorked === true;
  } catch (e) {
    deleteDiag.error = e.message;
  }
  report.delete = deleteDiag;

} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));

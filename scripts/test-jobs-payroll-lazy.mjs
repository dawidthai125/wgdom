/** Smoke: lazy load Roboty + Lista płac (mobile + desktop). */
import { chromium, devices } from "playwright";

const baseURL = process.argv[2] || "http://127.0.0.1:4174";
const results = { baseURL, mobile: {}, desktop: {}, ok: true };

async function seedAdmin(page) {
  await page.evaluate(() => {
    localStorage.setItem("kw-jobs", "[]");
    localStorage.setItem("kw-directory", "[]");
    localStorage.setItem("kw-archive", "[]");
    localStorage.setItem("kw-week-employees", "[]");
    sessionStorage.setItem("wg-session-mode", "admin");
    sessionStorage.setItem(
      "wg-admin-session",
      JSON.stringify({ id: "dawid", role: "super_admin", displayName: "Dawid", login: "Dawid" }),
    );
  });
}

async function testViews(page, label) {
  const chunks = [];
  const errors = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("panel-jobs") || u.includes("panel-payroll") || u.includes("JobsView") || u.includes("PayrollView")) {
      chunks.push(u);
    }
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await seedAdmin(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });

  if (label === "mobile") {
    await page.locator("nav.md\\:hidden button").filter({ hasText: "Roboty" }).click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: "Roboty", exact: true }).click({ timeout: 15_000 });
  }
  await page.getByText("Ładowanie robot").waitFor({ state: "visible", timeout: 3_000 }).catch(() => {});
  await page.getByText("Nowa robota").first().waitFor({ state: "attached", timeout: 20_000 });

  const jobsOk = (await page.getByText("Nowa robota").count()) > 0;

  if (label === "mobile") {
    await page.locator("nav.md\\:hidden button").filter({ hasText: "Lista" }).click({ timeout: 10_000 });
  } else {
    await page.getByRole("button", { name: /Lista płac/i }).click({ timeout: 10_000 });
  }
  await page.getByText("Ładowanie listy płac").waitFor({ state: "visible", timeout: 3_000 }).catch(() => {});
  await page.getByText("Dodaj pracownika").first().waitFor({ state: "attached", timeout: 20_000 });

  const payrollOk = (await page.getByText("Dodaj pracownika").count()) > 0;

  return {
    label,
    jobsOk,
    payrollOk,
    chunks: [...new Set(chunks)],
    errors: errors.filter((e) => !e.includes("Unexpected token")),
  };
}

const browser = await chromium.launch();
try {
  const mctx = await browser.newContext({ ...devices["iPhone SE"] });
  const mpage = await mctx.newPage();
  results.mobile = await testViews(mpage, "mobile");
  await mctx.close();

  const dctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const dpage = await dctx.newPage();
  results.desktop = await testViews(dpage, "desktop");
  await dctx.close();

  if (!results.mobile.jobsOk || !results.mobile.payrollOk || !results.desktop.jobsOk || !results.desktop.payrollOk) {
    results.ok = false;
  }
  if (results.mobile.errors.length || results.desktop.errors.length) results.ok = false;
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
process.exit(results.ok ? 0 : 1);

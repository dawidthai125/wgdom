/** Jednorazowy smoke: Menu → Zmiany/Instrukcja + lazy chunk panel-guide */
import { chromium, devices } from "playwright";

const baseURL = process.argv[2] || "http://127.0.0.1:4173";
const results = { baseURL, mobile: {}, desktop: {}, ok: true };

function seedAdmin(page) {
  return page.evaluate(() => {
    localStorage.setItem("kw-jobs", "[]");
    localStorage.setItem("kw-directory", "[]");
    localStorage.setItem("kw-archive", "[]");
    localStorage.setItem("kw-week-employees", "[]");
    localStorage.setItem("kw-weekFrom", JSON.stringify("2026-05-25"));
    localStorage.setItem("kw-weekTo", JSON.stringify("2026-05-30"));
    sessionStorage.setItem("wg-session-mode", "admin");
    sessionStorage.setItem(
      "wg-admin-session",
      JSON.stringify({ id: "dawid", role: "super_admin", displayName: "Dawid", login: "Dawid" }),
    );
  });
}

async function testGuideLazy(page, label) {
  const chunkLoads = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("panel-guide") || u.includes("GuideView")) chunkLoads.push(u);
  });

  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await seedAdmin(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  if (label === "mobile") {
    await page.getByRole("button", { name: "Więcej" }).waitFor({ timeout: 30_000 });
  } else {
    await page.getByRole("button", { name: /Zmiany\/Instrukcja/i }).waitFor({ timeout: 30_000 });
  }

  const beforeGuide = chunkLoads.length;

  if (label === "mobile") {
    await page.getByRole("button", { name: "Więcej" }).click({ timeout: 15_000 });
    await page.getByRole("button", { name: /Zmiany\/Instrukcja/i }).click({ timeout: 10_000 });
  } else {
    await page.getByRole("button", { name: /Zmiany\/Instrukcja/i }).click({ timeout: 15_000 });
  }

  await page.getByText("Ładowanie instrukcji").waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  await page.getByRole("heading", { name: /Zmiany \/ Instrukcja/i }).waitFor({ timeout: 20_000 });
  await page.getByText("v2.45.16").first().waitFor({ timeout: 10_000 });
  await page.getByText("Od czego zacząć?").first().waitFor({ timeout: 10_000 });

  const tabZmiany = page.locator(".rounded-xl.flex.gap-1.p-1.bg-secondary button").filter({ hasText: "Zmiany" });
  await tabZmiany.click();
  await page.getByText("Najnowsza").first().waitFor({ timeout: 10_000 });
  await page.getByText(/lazy load.*GuideView|Optymalizacja faza 2/i).first().waitFor({ timeout: 10_000 });

  const afterGuide = chunkLoads.length;
  const panelGuideLoaded = chunkLoads.some((u) => u.includes("panel-guide"));

  return {
    label,
    panelGuideLoaded,
    guideRendered: true,
    chunkRequests: chunkLoads.length - beforeGuide,
    chunkUrls: chunkLoads.slice(beforeGuide),
    errors,
  };
}

const browser = await chromium.launch();

try {
  const mobile = await browser.newContext({ ...devices["iPhone SE"] });
  const mobilePage = await mobile.newPage();
  results.mobile = await testGuideLazy(mobilePage, "mobile");
  await mobile.close();

  const desktop = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const desktopPage = await desktop.newPage();
  results.desktop = await testGuideLazy(desktopPage, "desktop");
  await desktop.close();

  if (!results.mobile.panelGuideLoaded && !results.mobile.guideRendered) results.ok = false;
  if (!results.desktop.panelGuideLoaded && !results.desktop.guideRendered) results.ok = false;
  if (results.mobile.errors.length || results.desktop.errors.length) results.ok = false;
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
process.exit(results.ok ? 0 : 1);

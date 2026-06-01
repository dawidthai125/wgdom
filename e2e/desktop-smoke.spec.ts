import { test, expect } from "@playwright/test";

/** Smoke desktop — 1920×1080 (project desktop-chrome w playwright.config). */
test.describe("Desktop smoke — przeglądarka PC/laptop", () => {
  test("ekran logowania — ładuje się, brak błędu aplikacji", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("text=Application error")).toHaveCount(0);
    await expect(page.locator("text=Unexpected")).toHaveCount(0);
  });

  test("desktop viewport — html overflow-y auto, brak poziomego scrolla", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 45_000 });

    const overflowY = await page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
    expect(["auto", "scroll", "visible"]).toContain(overflowY);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("formularz admin — otwiera się na desktopie", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    const pwd = page.locator('input[type="password"]').first();
    await expect(pwd).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });

  test("lazy chunk inspektora — plik panel-inspector dostępny", async ({ request, baseURL }) => {
    const html = await (await request.get(`${baseURL}/`)).text();
    const match = html.match(/panel-inspector-[\w]+\.js/);
    expect(match, "brak referencji panel-inspector w index.html").toBeTruthy();
    const res = await request.get(`${baseURL}/assets/${match![0]}`);
    expect(res.ok()).toBeTruthy();
    expect((await res.body()).byteLength).toBeGreaterThan(10_000);
  });

  test("service worker v20 — obecny w buildzie", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/sw.js`);
    expect(res.ok()).toBeTruthy();
    const js = await res.text();
    expect(js).toContain("wgdom-shell-v24");
  });

  test("ui-vendor chunk — ładuje się poprawnie", async ({ request, baseURL }) => {
    const html = await (await request.get(`${baseURL}/`)).text();
    const match = html.match(/ui-vendor-[\w]+\.js/);
    expect(match).toBeTruthy();
    const res = await request.get(`${baseURL}/assets/${match![0]}`);
    expect(res.ok()).toBeTruthy();
  });

  test("tryb inspektora — ekran logowania bez błędu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await expect(page.getByText("Logowanie inspektora")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[type="password"], input[placeholder*="hasło" i]').first()).toBeVisible();
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";
import { fetchLazyChunk } from "./chunk-helpers";

/** Smoke desktop — 1920×1080 (project desktop-chrome w playwright.config). */
test.describe("Desktop smoke — przeglądarka PC/laptop", () => {
  test("ekran logowania — ładuje się, brak błędu aplikacji", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("text=Application error")).toHaveCount(0);
    await expect(page.locator("text=Unexpected")).toHaveCount(0);
  });

  test("desktop viewport — html overflow hidden, brak scrollu dokumentu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 45_000 });

    const layout = await page.evaluate(() => ({
      overflowY: getComputedStyle(document.documentElement).overflowY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(layout.overflowY).toBe("hidden");
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 2);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2);
  });

  test("formularz admin — otwiera się na desktopie", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    const pwd = page.locator('input[type="password"]').first();
    await expect(pwd).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });

  test("lazy chunk inspektora — InspectorPanel dostępny", async ({ request, baseURL }) => {
    const { name, bytes } = await fetchLazyChunk(request, baseURL!, "panel-inspector");
    expect(bytes).toBeGreaterThan(10_000);
    expect(name).toMatch(/^InspectorPanel-/);
  });

  test("service worker v25 — obecny w buildzie", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/sw.js`);
    expect(res.ok()).toBeTruthy();
    const js = await res.text();
    expect(js).toMatch(/wgdom-shell-/);
  });

  test("ui-vendor chunk — ładuje się poprawnie", async ({ request, baseURL }) => {
    const { bytes } = await fetchLazyChunk(request, baseURL!, "ui-vendor");
    expect(bytes).toBeGreaterThan(1000);
  });

  test("tryb inspektora — ekran logowania bez błędu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await expect(page.getByText("Logowanie inspektora")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[type="password"], input[placeholder*="hasło" i]').first()).toBeVisible();
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });
});

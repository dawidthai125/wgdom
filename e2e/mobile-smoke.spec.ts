import { test, expect } from "@playwright/test";

/** Widoczny anchor ekranu logowania (logo ma alt, tytuł może być w DOM inaczej). */
async function expectLoginScreen(page: import("@playwright/test").Page) {
  await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: /Inspektor/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Pracownik/i }).first()).toBeVisible();
}

/**
 * Smoke testy mobile — produkcja (www.wgdom.fun) lub preview:
 *   PW_BASE_URL=http://127.0.0.1:4173 npm run test:mobile
 */
test.describe("Mobile smoke — PWA / web", () => {
  test("strona logowania — ładuje się bez poziomego scrolla", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectLoginScreen(page);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("manifest PWA — poprawny JSON z id i ikonami", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/manifest.webmanifest`);
    expect(res.ok()).toBeTruthy();
    const m = await res.json();
    expect(m.id).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(Array.isArray(m.icons)).toBeTruthy();
    expect(m.icons.length).toBeGreaterThanOrEqual(4);
    const maskable = m.icons.filter((i: { purpose?: string }) => String(i.purpose || "").includes("maskable"));
    expect(maskable.length).toBeGreaterThanOrEqual(1);
  });

  test("offline.html — dostępna (Capacitor errorPath / PWA fallback)", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/offline.html`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html.toLowerCase()).toContain("brak");
    expect(html.toLowerCase()).toContain("połączen");
  });

  test("service worker — plik obecny i z offline.html", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/sw.js`);
    expect(res.ok()).toBeTruthy();
    const js = await res.text();
    expect(js).toContain("offline.html");
    expect(js).toMatch(/wgdom-shell-v\d+/);
  });

  test("ikony PWA — 192 i 512 odpowiadają", async ({ request, baseURL }) => {
    for (const path of ["/icons/icon-192.webp", "/icons/icon-512.webp", "/apple-touch-icon.png"]) {
      const res = await request.get(`${baseURL}${path}`);
      expect(res.ok(), path).toBeTruthy();
      expect((await res.body()).byteLength).toBeGreaterThan(500);
    }
  });

  test("viewport i inputy — brak zoom-trigger na iOS (font ≥16px)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectLoginScreen(page);

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /viewport-fit=cover/);

    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    const input = page.locator('input[type="password"], input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    const fontSize = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test("ekran startowy — karty trybu mają min. 44px wysokości", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectLoginScreen(page);

    for (const name of [/Panel administracyjny/i, /Inspektor/i, /Pracownik/i]) {
      const btn = page.getByRole("button", { name }).first();
      const box = await btn.boundingBox();
      expect(box, String(name)).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("deep link web — param open=job nie psuje strony", async ({ page }) => {
    await page.goto("/?open=job&id=test-smoke-id", { waitUntil: "domcontentloaded" });
    await expectLoginScreen(page);
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });
});

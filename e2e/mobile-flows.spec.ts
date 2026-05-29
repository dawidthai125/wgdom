import { test, expect } from "@playwright/test";

/** Głębsze smoke mobile — bez logowania (brak haseł w CI). Produkcja lub preview. */
test.describe("Mobile flows — nawigacja startowa", () => {
  test("admin — formularz logowania, brak poziomego scrolla", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
    await expect(page.getByText("Logowanie administratora")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('select, input[type="password"]').first()).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 2);
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });

  test("inspektor — formularz logowania bez błędu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await expect(page.getByText("Logowanie inspektora")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('select, input[type="password"]').first()).toBeVisible();
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });

  test("pracownik — lista / logowanie bez błędu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Pracownik/i }).first().click();
    await expect(page.getByText(/telefon|PIN|pracownik/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("text=Application error")).toHaveCount(0);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 2);
  });

  test("chunk panel-inspector — dostępny (lazy-load po zalogowaniu)", async ({ request, baseURL }) => {
    const html = await (await request.get(`${baseURL}/`)).text();
    const match = html.match(/panel-inspector-[\w]+\.js/);
    expect(match, "brak panel-inspector w HTML").toBeTruthy();
    const res = await request.get(`${baseURL}/assets/${match![0]}`);
    expect(res.ok()).toBeTruthy();
    expect((await res.body()).byteLength).toBeGreaterThan(50_000);
  });

  test("mobile shell — overflow hidden na html (scroll wewnątrz panelu)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 45_000 });
    const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    expect(overflow).toBe("hidden");
  });

  test("powrót ze screenu logowania — strzałka wstecz działa", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
    await expect(page.getByText("Logowanie administratora")).toBeVisible({ timeout: 15_000 });
    await page.locator('button:has(svg)').first().click();
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});

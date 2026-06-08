import { test, expect } from "@playwright/test";

const LAPTOP_VIEWPORTS = [
  { label: "1366x768", width: 1366, height: 768 },
  { label: "1280x720", width: 1280, height: 720 },
] as const;

async function assertNoDocumentScroll(page: import("@playwright/test").Page) {
  const layout = await page.evaluate(() => ({
    htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    rootOverflow: getComputedStyle(document.getElementById("root")!).overflow,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(layout.htmlOverflowY).toBe("hidden");
  expect(layout.bodyOverflowY).toBe("hidden");
  expect(layout.rootOverflow).toBe("hidden");
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 2);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2);
}

for (const vp of LAPTOP_VIEWPORTS) {
  test.describe(`Desktop layout ${vp.label} — 2.50.20`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("ekran startowy — brak scrollu dokumentu", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({
        timeout: 45_000,
      });
      await assertNoDocumentScroll(page);
    });

    test("formularz logowania admin — brak scrollu dokumentu", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
      await expect(page.getByText("Logowanie administratora")).toBeVisible({ timeout: 15_000 });
      await assertNoDocumentScroll(page);
    });
  });
}

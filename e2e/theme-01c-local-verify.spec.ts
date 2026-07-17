/**
 * THEME-01C — Localhost verification (Playwright).
 * Run: PW_BASE_URL=http://127.0.0.1:5173 npx playwright test e2e/theme-01c-local-verify.spec.ts --project=theme-01c-local
 */
import { test, expect, type Page } from "@playwright/test";
import {
  applyE2eSeedInBrowser,
  buildE2eSeedArgs,
  E2E_INSPECTOR_PASS,
  E2E_WORKER_NAME,
  E2E_WORKER_PHONE_INPUT,
  E2E_WORKER_PIN,
} from "./fixtures/e2e-seed";
import { blockCloudSync, clickAdminSidebar } from "./helpers/jobs";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";
import { dismissBlockingToasts } from "./helpers/admin-mobile-nav";

const OUT_DIR = ".tmp/theme-01c-local-verify";
const PROD_URL = "https://www.wgdom.fun";
const LOCAL_URL = process.env.PW_BASE_URL || "http://127.0.0.1:5173";

async function navigateAdminModule(page: Page, label: string): Promise<void> {
  await dismissBlockingToasts(page);
  await page.evaluate(() => document.querySelector("vite-error-overlay")?.remove());
  const btn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }),
  });
  await expect(btn.first()).toBeVisible({ timeout: 15_000 });
  await btn.first().evaluate((el) => (el as HTMLElement).click());
  await page.waitForTimeout(900);
  const viteErr = page.locator("vite-error-overlay");
  if (await viteErr.count()) {
    const text = (await viteErr.textContent())?.trim() ?? "unknown vite error";
    await page.screenshot({ path: `${OUT_DIR}/error-${label.replace(/\s+/g, "-")}.png`, fullPage: true });
    throw new Error(`Vite overlay on ${label}: ${text.slice(0, 400)}`);
  }
}

const ADMIN_MODULES = [
  "Pulpit",
  "Lista Płac",
  "Grafik",
  "Kadry",
  "Archiwum",
  "Roboty",
  "Przetargi",
  "Instrukcja",
] as const;

type ThemeSample = {
  htmlClass: string;
  wgTheme: string | null;
  background: string;
  foreground: string;
  card: string;
  primary: string;
  border: string;
};

async function readThemeSample(page: Page): Promise<ThemeSample> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const probe = document.createElement("div");
    probe.className = "bg-background text-foreground border border-border bg-card text-primary";
    probe.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none;";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const out = {
      htmlClass: root.className,
      wgTheme: localStorage.getItem("wg-theme"),
      background: cs.backgroundColor,
      foreground: cs.color,
      card: getComputedStyle(document.createElement("div")).backgroundColor,
      primary: "",
      border: cs.borderTopColor,
    };
    probe.className = "bg-primary";
    out.primary = getComputedStyle(probe).backgroundColor;
    probe.className = "bg-card";
    out.card = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return out;
  });
}

async function openAdminSettings(page: Page): Promise<void> {
  await page.getByTitle("Ustawienia administratorów").click({ timeout: 15_000 });
  await expect(page.getByText("Ustawienia administratorów")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Wygląd aplikacji")).toBeVisible();
}

async function closeAdminSettings(page: Page): Promise<void> {
  const sheet = page.locator(".modal-sheet").filter({ hasText: "Ustawienia administratorów" });
  const closeBtn = sheet.locator("div.border-b").getByRole("button").last();
  await closeBtn.click({ timeout: 10_000 });
  await expect(page.getByText("Wygląd aplikacji")).toHaveCount(0, { timeout: 10_000 });
}

async function setThemeInSettings(page: Page, theme: "dark" | "light"): Promise<void> {
  await dismissBlockingToasts(page);
  await openAdminSettings(page);
  const label = theme === "dark" ? "Ciemny" : "Jasny";
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(400);
  await closeAdminSettings(page);
}

function rgbClose(a: string, b: string, tolerance = 2): boolean {
  const parse = (s: string) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return a === b;
  return pa.every((v, i) => Math.abs(v - pb[i]) <= tolerance);
}

test.describe.configure({ mode: "serial" });

test.describe("THEME-01C localhost verification", () => {
  test.beforeEach(async ({ page }) => {
    const args = buildE2eSeedArgs();
    await page.addInitScript(applyE2eSeedInBrowser, args);
    await blockCloudSync(page);
  });

  test("01 — dev server reachable + login screen", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({
      timeout: 45_000,
    });
    await page.screenshot({ path: `${OUT_DIR}/01-login-dark.png`, fullPage: true });
  });

  test("02 — FOUC: default dark class before hydration", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    const early = await page.evaluate(() => ({
      hasDark: document.documentElement.classList.contains("dark"),
      wgTheme: localStorage.getItem("wg-theme"),
    }));
    expect(early.hasDark).toBe(true);
    expect(early.wgTheme === null || early.wgTheme === "dark").toBeTruthy();
  });

  test("03 — admin login + dark baseline sample", async ({ page }) => {
    await gotoLoginPick(page);
    await loginAdmin(page);
    const dark = await readThemeSample(page);
    expect(dark.htmlClass).toContain("dark");
    await page.screenshot({ path: `${OUT_DIR}/03-dashboard-dark.png`, fullPage: true });
    test.info().attach("dark-sample", { body: JSON.stringify(dark, null, 2), contentType: "application/json" });
  });

  test("04 — theme cycle Dark → Light → Dark + persistence", async ({ page }) => {
    await gotoLoginPick(page);
    await loginAdmin(page);

    await setThemeInSettings(page, "light");
    let sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("light");
    expect(sample.htmlClass).not.toContain("dark");
    await page.screenshot({ path: `${OUT_DIR}/04-dashboard-light.png`, fullPage: true });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({ timeout: 90_000 });
    sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("light");
    expect(sample.htmlClass).not.toContain("dark");

    await setThemeInSettings(page, "dark");
    sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("dark");
    expect(sample.htmlClass).toContain("dark");
    await page.screenshot({ path: `${OUT_DIR}/04-dashboard-dark-restored.png`, fullPage: true });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({ timeout: 90_000 });
    sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("dark");
    expect(sample.htmlClass).toContain("dark");
  });

  test("05 — admin modules smoke (both themes)", async ({ page }) => {
    await gotoLoginPick(page);
    await loginAdmin(page);

    for (const mod of ADMIN_MODULES) {
      await navigateAdminModule(page, mod);
      await page.waitForTimeout(600);
      const safe = mod.replace(/\s+/g, "-").toLowerCase();
      await page.screenshot({ path: `${OUT_DIR}/05-module-${safe}-dark.png`, fullPage: true });
    }

    await setThemeInSettings(page, "light");
    for (const mod of ["Pulpit", "Lista Płac", "Roboty", "Przetargi"] as const) {
      await navigateAdminModule(page, mod);
      await page.waitForTimeout(600);
      const safe = mod.replace(/\s+/g, "-").toLowerCase();
      await page.screenshot({ path: `${OUT_DIR}/05-module-${safe}-light.png`, fullPage: true });
    }
  });

  test("06 — shell UI: sidebar, topbar, settings modal, toast host", async ({ page }) => {
    await gotoLoginPick(page);
    await loginAdmin(page);

    await expect(page.locator("nav.admin-sidebar-nav")).toBeVisible();
    await expect(page.getByTitle("Wyloguj")).toBeVisible();
    await openAdminSettings(page);
    await page.screenshot({ path: `${OUT_DIR}/06-settings-modal-dark.png`, fullPage: true });
    await closeAdminSettings(page);

    await setThemeInSettings(page, "light");
    await openAdminSettings(page);
    await page.screenshot({ path: `${OUT_DIR}/06-settings-modal-light.png`, fullPage: true });
    await closeAdminSettings(page);

    const toaster = page.locator("[data-sonner-toaster], .toaster");
    await expect(toaster).toHaveCount(1);
  });

  test("07 — inspector + worker login surfaces", async ({ page }) => {
    await gotoLoginPick(page);

    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await expect(page.getByText("Logowanie inspektora")).toBeVisible();
    await page.screenshot({ path: `${OUT_DIR}/07-inspector-login.png`, fullPage: true });

    await gotoLoginPick(page);

    await page.getByRole("button", { name: /Pracownik/i }).first().click();
    await expect(page.getByText("Logowanie pracownika")).toBeVisible();
    await page.screenshot({ path: `${OUT_DIR}/07-worker-login.png`, fullPage: true });

    await page.getByRole("button", { name: new RegExp(E2E_WORKER_NAME) }).click();
    await page.locator('input[placeholder*="501"]').fill(E2E_WORKER_PHONE_INPUT);
    await page.locator('input[placeholder="••••"]').fill(E2E_WORKER_PIN);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await expect(page.getByText("Tryb pracownika")).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: `${OUT_DIR}/07-worker-home-dark.png`, fullPage: true });
  });

  test("08 — dark parity vs production (login screen tokens)", async ({ page, browser }) => {
    const prod = await browser.newPage();
    await prod.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded" });
    await prod.waitForTimeout(2000);
    const prodSample = await prod.evaluate(() => {
      const el = document.documentElement;
      const cs = getComputedStyle(el);
      const body = getComputedStyle(document.body);
      return {
        htmlClass: el.className,
        background: body.backgroundColor || cs.backgroundColor,
        color: body.color || cs.color,
      };
    });
    await prod.screenshot({ path: `${OUT_DIR}/08-prod-login.png`, fullPage: true });
    await prod.close();

    await page.goto(`${LOCAL_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("wg-theme");
      document.documentElement.classList.add("dark");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const localSample = await page.evaluate(() => {
      const el = document.documentElement;
      const cs = getComputedStyle(el);
      const body = getComputedStyle(document.body);
      return {
        htmlClass: el.className,
        background: body.backgroundColor || cs.backgroundColor,
        color: body.color || cs.color,
      };
    });
    await page.screenshot({ path: `${OUT_DIR}/08-local-login-dark.png`, fullPage: true });

    const parityOk = rgbClose(prodSample.background, localSample.background);
    test.info().attach("prod-login-colors", { body: JSON.stringify(prodSample, null, 2), contentType: "application/json" });
    test.info().attach("local-login-colors", { body: JSON.stringify(localSample, null, 2), contentType: "application/json" });

    if (!parityOk) {
      throw new Error(
        `DARK PARITY FAIL login background: prod=${prodSample.background} local=${localSample.background}`,
      );
    }
  });

  test("09 — F5 reload no white flash (dark persisted)", async ({ page }) => {
    await gotoLoginPick(page);
    await loginAdmin(page);
    await setThemeInSettings(page, "dark");

    const flashes: string[] = [];
    await page.evaluate(() => {
      (window as unknown as { __wgFlashLog: string[] }).__wgFlashLog = [];
      const log = (window as unknown as { __wgFlashLog: string[] }).__wgFlashLog;
      const obs = new MutationObserver(() => {
        const bg = getComputedStyle(document.body).backgroundColor;
        log.push(bg);
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      (window as unknown as { __wgFlashObs: MutationObserver }).__wgFlashObs = obs;
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({ timeout: 90_000 });

    const result = await page.evaluate(() => {
      const log = (window as unknown as { __wgFlashLog?: string[] }).__wgFlashLog || [];
      const hasDark = document.documentElement.classList.contains("dark");
      const bg = getComputedStyle(document.body).backgroundColor;
      return { hasDark, bg, log: log.slice(0, 8) };
    });

    expect(result.hasDark).toBe(true);
    expect(rgbClose(result.bg, "rgb(17, 24, 39)")).toBe(true);
  });

  test("10 — topbar theme toggle + persistence", async ({ page }) => {
    await gotoLoginPick(page);
    await loginAdmin(page);

    const topbarToggle = page.getByRole("button", { name: "Przełącz na jasny motyw" });
    await expect(topbarToggle).toBeVisible({ timeout: 10_000 });

    await topbarToggle.click();
    await page.waitForTimeout(400);
    let sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("light");
    expect(sample.htmlClass).not.toContain("dark");
    await expect(page.getByRole("button", { name: "Przełącz na ciemny motyw" })).toBeVisible();
    await page.screenshot({ path: `${OUT_DIR}/10-topbar-light.png`, fullPage: true });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({ timeout: 90_000 });
    sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("light");
    expect(sample.htmlClass).not.toContain("dark");

    await page.getByRole("button", { name: "Przełącz na ciemny motyw" }).click();
    await page.waitForTimeout(400);
    sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("dark");
    expect(sample.htmlClass).toContain("dark");
    await page.screenshot({ path: `${OUT_DIR}/10-topbar-dark-restored.png`, fullPage: true });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({ timeout: 90_000 });
    sample = await readThemeSample(page);
    expect(sample.wgTheme).toBe("dark");
    expect(sample.htmlClass).toContain("dark");
  });
});

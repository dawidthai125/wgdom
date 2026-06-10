import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type BrowserContext, type Page } from "@playwright/test";

export const CROSS_TAB_SERVER_VERSION_KEY = "wg-update-server-version";
export const DISMISS_KEY = "wg-update-banner-dismiss";
export const MOCK_NEW_VERSION = "9.99.99";
export const UPDATE_BANNER_TEXT = /Dostępna nowa wersja WGDOM/;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function readAppVersionFromDist(): string {
  const versionPath = resolve(root, "dist/version.json");
  if (!existsSync(versionPath)) {
    throw new Error("dist/version.json missing — run npm run build first");
  }
  const data = JSON.parse(readFileSync(versionPath, "utf8")) as { version?: string };
  if (typeof data.version !== "string" || !data.version) {
    throw new Error("dist/version.json must contain { version: string }");
  }
  return data.version;
}

async function fulfillVersionJson(route: import("@playwright/test").Route, version: string): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify({ version }),
  });
}

export async function mockVersionJson(page: Page, version: string): Promise<void> {
  await page.route("**/version.json**", async (route) => fulfillVersionJson(route, version));
}

export async function mockVersionJsonOnContext(context: BrowserContext, version: string): Promise<void> {
  await context.unroute("**/version.json**");
  await context.route("**/version.json**", async (route) => fulfillVersionJson(route, version));
}

export async function mockVersionJsonPhased(
  page: Page,
  beforeVersion: string,
  afterVersion: string,
): Promise<{ advance: () => void }> {
  let useAfter = false;
  await page.route("**/version.json**", async (route) => {
    await fulfillVersionJson(route, useAfter ? afterVersion : beforeVersion);
  });
  return {
    advance: () => {
      useAfter = true;
    },
  };
}

/** Reset storage before document scripts run (must be registered before goto). */
export async function installVersionAwarenessReset(page: Page): Promise<void> {
  await page.addInitScript(
    ({ crossTab, dismiss }) => {
      localStorage.removeItem(crossTab);
      sessionStorage.removeItem(dismiss);
    },
    { crossTab: CROSS_TAB_SERVER_VERSION_KEY, dismiss: DISMISS_KEY },
  );
}

export async function clearVersionAwarenessStorage(page: Page): Promise<void> {
  await page.evaluate(
    ({ crossTab, dismiss }) => {
      localStorage.removeItem(crossTab);
      sessionStorage.removeItem(dismiss);
    },
    { crossTab: CROSS_TAB_SERVER_VERSION_KEY, dismiss: DISMISS_KEY },
  );
}

export async function readCrossTabServerVersion(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), CROSS_TAB_SERVER_VERSION_KEY);
}

export async function readDismissKey(page: Page): Promise<string | null> {
  return page.evaluate((key) => sessionStorage.getItem(key), DISMISS_KEY);
}

export async function assertUpdateBannerVisible(page: Page, serverVersion?: string): Promise<void> {
  await expect(page.getByText(UPDATE_BANNER_TEXT)).toBeVisible({ timeout: 15_000 });
  if (serverVersion) {
    await expect(page.getByText(new RegExp(serverVersion.replace(/\./g, "\\."))).first()).toBeVisible();
  }
}

export async function assertUpdateBannerHidden(page: Page): Promise<void> {
  await expect(page.getByText(UPDATE_BANNER_TEXT)).not.toBeVisible({ timeout: 10_000 });
}

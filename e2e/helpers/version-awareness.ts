import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Detekcja opiera się o Build Identity (commit). Release Version = wyłącznie prezentacja. */
export const CROSS_TAB_SERVER_BUILD_KEY = "wg-update-server-build";
export const DISMISS_KEY = "wg-update-banner-dismiss";
export const MOCK_NEW_VERSION = "9.99.99";
export const MOCK_NEW_COMMIT = "e2e0new0commit";
export const UPDATE_BANNER_TEXT = /Dostępna nowa wersja WGDOM/;

/** Build serwera zwracany przez zamockowany version.json. */
export interface ServerBuild {
  version: string;
  commit: string;
}

export const MOCK_NEW_BUILD: ServerBuild = {
  version: MOCK_NEW_VERSION,
  commit: MOCK_NEW_COMMIT,
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readDistVersionJson(): { version?: string; commit?: string } {
  const versionPath = resolve(root, "dist/version.json");
  if (!existsSync(versionPath)) {
    throw new Error("dist/version.json missing — run npm run build first");
  }
  return JSON.parse(readFileSync(versionPath, "utf8")) as { version?: string; commit?: string };
}

export function readAppVersionFromDist(): string {
  const data = readDistVersionJson();
  if (typeof data.version !== "string" || !data.version) {
    throw new Error("dist/version.json must contain { version: string }");
  }
  return data.version;
}

export function readAppCommitFromDist(): string {
  const data = readDistVersionJson();
  if (typeof data.commit !== "string" || !data.commit) {
    throw new Error("dist/version.json must contain { commit: string }");
  }
  return data.commit;
}

/** Build tożsamy z aktualnym bundlem (brak nowego deployu → brak bannera). */
export function currentDistBuild(): ServerBuild {
  return { version: readAppVersionFromDist(), commit: readAppCommitFromDist() };
}

async function fulfillVersionJson(
  route: import("@playwright/test").Route,
  build: ServerBuild,
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify({ version: build.version, commit: build.commit }),
  });
}

export async function mockVersionJson(page: Page, build: ServerBuild): Promise<void> {
  await page.route("**/version.json**", async (route) => fulfillVersionJson(route, build));
}

export async function mockVersionJsonOnContext(
  context: BrowserContext,
  build: ServerBuild,
): Promise<void> {
  await context.unroute("**/version.json**");
  await context.route("**/version.json**", async (route) => fulfillVersionJson(route, build));
}

export async function mockVersionJsonPhased(
  page: Page,
  beforeBuild: ServerBuild,
  afterBuild: ServerBuild,
): Promise<{ advance: () => void }> {
  let useAfter = false;
  await page.route("**/version.json**", async (route) => {
    await fulfillVersionJson(route, useAfter ? afterBuild : beforeBuild);
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
    { crossTab: CROSS_TAB_SERVER_BUILD_KEY, dismiss: DISMISS_KEY },
  );
}

export async function clearVersionAwarenessStorage(page: Page): Promise<void> {
  await page.evaluate(
    ({ crossTab, dismiss }) => {
      localStorage.removeItem(crossTab);
      sessionStorage.removeItem(dismiss);
    },
    { crossTab: CROSS_TAB_SERVER_BUILD_KEY, dismiss: DISMISS_KEY },
  );
}

export async function readCrossTabServerBuild(page: Page): Promise<ServerBuild | null> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), CROSS_TAB_SERVER_BUILD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServerBuild;
  } catch {
    return null;
  }
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

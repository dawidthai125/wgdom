import { test, expect } from "@playwright/test";
import { gotoLoginPick } from "./helpers/auth";
import {
  assertUpdateBannerHidden,
  assertUpdateBannerVisible,
  installVersionAwarenessReset,
  mockVersionJson,
  mockVersionJsonOnContext,
  mockVersionJsonPhased,
  MOCK_NEW_VERSION,
  readAppVersionFromDist,
  readCrossTabServerVersion,
  readDismissKey,
} from "./helpers/version-awareness";

/**
 * E2E Version Awareness — 20.5Z.2B
 * Wymaga: npm run build && npm run preview (PW_BASE_URL=http://127.0.0.1:4173)
 */
test.describe.configure({ mode: "serial" });

const APP_VERSION = readAppVersionFromDist();

test.describe("E2E Version Awareness — 20.5Z.2B", () => {
  test("VA-001 — detekcja nowej wersji", async ({ page }) => {
    await installVersionAwarenessReset(page);
    await mockVersionJson(page, MOCK_NEW_VERSION);
    await gotoLoginPick(page);

    await assertUpdateBannerVisible(page, MOCK_NEW_VERSION);
    expect(await readCrossTabServerVersion(page)).toBe(MOCK_NEW_VERSION);
  });

  test("VA-002 — dismiss (Później)", async ({ page }) => {
    await installVersionAwarenessReset(page);
    await mockVersionJson(page, MOCK_NEW_VERSION);
    await gotoLoginPick(page);

    await assertUpdateBannerVisible(page, MOCK_NEW_VERSION);
    await page.getByRole("button", { name: "Później" }).click();

    await assertUpdateBannerHidden(page);
    expect(await readDismissKey(page)).toBe(MOCK_NEW_VERSION);
    expect(await readCrossTabServerVersion(page)).toBe(MOCK_NEW_VERSION);
  });

  test("VA-003 — reload + cleanup", async ({ page }) => {
    await installVersionAwarenessReset(page);
    const { advance } = await mockVersionJsonPhased(page, MOCK_NEW_VERSION, APP_VERSION);
    await gotoLoginPick(page);

    await assertUpdateBannerVisible(page, MOCK_NEW_VERSION);
    advance();
    await page.getByRole("button", { name: "Odśwież teraz" }).click();
    await page.waitForLoadState("load");

    expect(await readCrossTabServerVersion(page)).toBeNull();
    await assertUpdateBannerHidden(page);
  });

  test("VA-004 — cross-tab sync", async ({ context }) => {
    const pageB = await context.newPage();
    const pageA = await context.newPage();

    try {
      await mockVersionJsonOnContext(context, APP_VERSION);
      await installVersionAwarenessReset(pageB);
      await gotoLoginPick(pageB);
      await assertUpdateBannerHidden(pageB);

      await mockVersionJsonOnContext(context, MOCK_NEW_VERSION);
      await installVersionAwarenessReset(pageA);
      await gotoLoginPick(pageA);
      await assertUpdateBannerVisible(pageA, MOCK_NEW_VERSION);

      await assertUpdateBannerVisible(pageB, MOCK_NEW_VERSION);
      expect(await readCrossTabServerVersion(pageB)).toBe(MOCK_NEW_VERSION);
    } finally {
      await pageA.close();
      await pageB.close();
    }
  });
});

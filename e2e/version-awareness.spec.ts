import { test, expect } from "@playwright/test";
import { gotoLoginPick } from "./helpers/auth";
import {
  assertUpdateBannerHidden,
  assertUpdateBannerVisible,
  currentDistBuild,
  installVersionAwarenessReset,
  mockVersionJson,
  mockVersionJsonOnContext,
  mockVersionJsonPhased,
  MOCK_NEW_BUILD,
  MOCK_NEW_COMMIT,
  MOCK_NEW_VERSION,
  readCrossTabServerBuild,
  readDismissKey,
} from "./helpers/version-awareness";

/**
 * E2E Version Awareness — Build Identity (commit)
 * Wymaga: npm run build && npm run preview (PW_BASE_URL=http://127.0.0.1:4173)
 * Detekcja: server.commit !== APP_COMMIT. Release Version = wyłącznie prezentacja.
 */
test.describe.configure({ mode: "serial" });

const CURRENT_BUILD = currentDistBuild();

test.describe("E2E Version Awareness — Build Identity", () => {
  test("VA-001 — detekcja nowego builda (commit)", async ({ page }) => {
    await installVersionAwarenessReset(page);
    await mockVersionJson(page, MOCK_NEW_BUILD);
    await gotoLoginPick(page);

    await assertUpdateBannerVisible(page, MOCK_NEW_VERSION);
    expect((await readCrossTabServerBuild(page))?.commit).toBe(MOCK_NEW_COMMIT);
  });

  test("VA-002 — dismiss (Później)", async ({ page }) => {
    await installVersionAwarenessReset(page);
    await mockVersionJson(page, MOCK_NEW_BUILD);
    await gotoLoginPick(page);

    await assertUpdateBannerVisible(page, MOCK_NEW_VERSION);
    await page.getByRole("button", { name: "Później" }).click();

    await assertUpdateBannerHidden(page);
    expect(await readDismissKey(page)).toBe(MOCK_NEW_COMMIT);
    expect((await readCrossTabServerBuild(page))?.commit).toBe(MOCK_NEW_COMMIT);
  });

  test("VA-003 — reload + cleanup", async ({ page }) => {
    await installVersionAwarenessReset(page);
    const { advance } = await mockVersionJsonPhased(page, MOCK_NEW_BUILD, CURRENT_BUILD);
    await gotoLoginPick(page);

    await assertUpdateBannerVisible(page, MOCK_NEW_VERSION);
    advance();
    await page.getByRole("button", { name: "Odśwież teraz" }).click();
    await page.waitForLoadState("load");

    expect(await readCrossTabServerBuild(page)).toBeNull();
    await assertUpdateBannerHidden(page);
  });

  test("VA-004 — cross-tab sync", async ({ context }) => {
    const pageB = await context.newPage();
    const pageA = await context.newPage();

    try {
      await mockVersionJsonOnContext(context, CURRENT_BUILD);
      await installVersionAwarenessReset(pageB);
      await gotoLoginPick(pageB);
      await assertUpdateBannerHidden(pageB);

      await mockVersionJsonOnContext(context, MOCK_NEW_BUILD);
      await installVersionAwarenessReset(pageA);
      await gotoLoginPick(pageA);
      await assertUpdateBannerVisible(pageA, MOCK_NEW_VERSION);

      await assertUpdateBannerVisible(pageB, MOCK_NEW_VERSION);
      expect((await readCrossTabServerBuild(pageB))?.commit).toBe(MOCK_NEW_COMMIT);
    } finally {
      await pageA.close();
      await pageB.close();
    }
  });
});

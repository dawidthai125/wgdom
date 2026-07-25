/**
 * AUDIT ONLY — cross-platform lightbox regression (Chromium emulation).
 * NOT physical iPhone Safari. Does not modify product src.
 *
 *   PW_BASE_URL=http://127.0.0.1:4173 npx playwright test --config=playwright.lightbox-cross-platform.config.mjs
 */
import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import {
  applyE2eSeedInBrowser,
  buildE2eSeedArgs,
  E2E_JOB_ADDRESS,
  E2E_JOB_ID,
  E2E_MARKER,
  E2E_WORKER_NAME,
} from "./fixtures/e2e-seed";
import { gotoLoginPick, loginAdmin, loginInspector } from "./helpers/auth";
import { openAdminJobs, openAdminModule, openE2eJobFromList } from "./helpers/admin-mobile-nav";
import { blockCloudSync, openInspectorJob } from "./helpers/jobs";

type ConsoleBag = { type: string; text: string };

const PHOTO_A = {
  id: "e2e-cp-photo-a",
  path: "e2e/cp-a.gif",
  publicUrl:
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  label: "progress" as const,
  uploadedBy: "E2E",
  uploadedAt: new Date().toISOString(),
  status: "approved" as const,
  caption: "CP-A",
};

const PHOTO_B = {
  ...PHOTO_A,
  id: "e2e-cp-photo-b",
  path: "e2e/cp-b.gif",
  caption: "CP-B",
  label: "before" as const,
};

const overlaySel = ".modal-overlay.modal-sheet, .modal-overlay.modal-lightbox";
/**
 * TEST-HARNESS-LIGHTBOX-01: never append ` button[…]` to a comma-list of roots —
 * CSS parses `.sheet, .lightbox button` as (DIV sheet) OR (lightbox button).
 */
const closeXSel =
  ".modal-overlay.modal-sheet button[aria-label='Zamknij'], .modal-overlay.modal-lightbox button[aria-label='Zamknij']";

async function patchMedia(page: Page) {
  await page.evaluate(
    ({ jobId, photos, workerName, marker }) => {
      const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]") as Array<Record<string, unknown>>;
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;
      job.photos = photos;
      job.inspectorPhotos = [];
      job.workerReports = [
        {
          id: "e2e-cp-wr",
          workerName,
          authorAdminRole: "worker",
          submittedAt: new Date().toISOString(),
          workItems: [{ id: "wi1", text: marker, note: "" }],
          rooms: [],
          generalNote: marker,
          sketch: {
            path: "e2e/cp-sketch.gif",
            publicUrl:
              "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          },
          sketchNote: "CP sketch",
        },
      ];
      localStorage.setItem("kw-jobs", JSON.stringify(jobs));
    },
    { jobId: E2E_JOB_ID, photos: [PHOTO_A, PHOTO_B], workerName: E2E_WORKER_NAME, marker: E2E_MARKER },
  );
}

function attachConsoleCapture(page: Page) {
  const bag: { errors: ConsoleBag[]; pageErrors: string[]; hydration: ConsoleBag[] } = {
    errors: [],
    pageErrors: [],
    hydration: [],
  };
  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    const type = msg.type();
    if (type === "error") bag.errors.push({ type, text });
    if (/hydrat/i.test(text)) bag.hydration.push({ type, text });
  });
  page.on("pageerror", (err) => {
    bag.pageErrors.push(String(err?.message || err));
  });
  return bag;
}

async function seedAdmin(page: Page) {
  const seedArgs = buildE2eSeedArgs();
  await blockCloudSync(page);
  await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
  await gotoLoginPick(page);
  await page.evaluate(applyE2eSeedInBrowser, seedArgs);
  await patchMedia(page);
  await loginAdmin(page);
}

async function seedInspector(page: Page) {
  const seedArgs = buildE2eSeedArgs();
  await blockCloudSync(page);
  await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
  await page.addInitScript(() => {
    try {
      localStorage.setItem("wg-inspector-help-banner", "1");
      localStorage.setItem("wg-pwa-inspector-dismiss", "1");
    } catch { /* ignore */ }
  });
  await gotoLoginPick(page);
  await page.evaluate(applyE2eSeedInBrowser, seedArgs);
  await patchMedia(page);
  await page.evaluate(() => {
    try {
      localStorage.setItem("wg-inspector-help-banner", "1");
      localStorage.setItem("wg-pwa-inspector-dismiss", "1");
    } catch { /* ignore */ }
  });
  await loginInspector(page);
}

async function assertOpen(page: Page) {
  await expect(page.locator("html.modal-scroll-locked")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator(overlaySel).first()).toBeVisible();
}

async function assertClosed(page: Page) {
  await expect(page.locator(overlaySel)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator("html.modal-scroll-locked")).toHaveCount(0, { timeout: 10_000 });
}

async function overlayMeta(page: Page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      parentIsBody: el.parentElement === document.body,
      pointerEvents: cs.pointerEvents,
      zIndex: cs.zIndex,
      position: cs.position,
      coversViewport:
        r.left <= 1 &&
        r.top <= 1 &&
        r.right >= window.innerWidth - 1 &&
        r.bottom >= window.innerHeight - 1,
      width: r.width,
      height: r.height,
      vw: window.innerWidth,
      vh: window.innerHeight,
      hasLightbox: el.classList.contains("modal-lightbox"),
      hasSheet: el.classList.contains("modal-sheet"),
      hasOverlay: el.classList.contains("modal-overlay"),
    };
  }, overlaySel);
}

function assertNoJsNoise(bag: ReturnType<typeof attachConsoleCapture>) {
  const ignore = /favicon|Download the React DevTools|net::ERR_|Failed to load resource:.*(503|404)|e2e-cloud-blocked/i;
  const serious = bag.errors.filter((e) => !ignore.test(e.text));
  const pageSerious = bag.pageErrors.filter((e) => !ignore.test(e));
  expect(pageSerious, `pageerror: ${pageSerious.join(" | ")}`).toEqual([]);
  expect(serious, `console.error: ${serious.map((e) => e.text).join(" | ")}`).toEqual([]);
  expect(bag.hydration, `hydration: ${bag.hydration.map((e) => e.text).join(" | ")}`).toEqual([]);
}

/** Close via X only — asserts target is BUTTON (TEST-HARNESS-LIGHTBOX-01). */
async function closeViaX(page: Page) {
  const xBtn = page.locator(closeXSel).first();
  await expect(xBtn).toBeVisible({ timeout: 10_000 });
  const tag = await xBtn.evaluate((el) => el.tagName);
  expect(tag, "closeViaX must target BUTTON, not overlay DIV").toBe("BUTTON");
  await xBtn.click();
  await assertClosed(page);
}

/**
 * Close via backdrop only — click overlay surface (not the X button).
 * Do not use for L3 (no backdrop onClick by design).
 */
async function closeViaBackdrop(page: Page) {
  const overlay = page.locator(overlaySel).first();
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  expect(box).toBeTruthy();
  // Left edge mid-height — away from bottom footer X / share on L3-style layouts
  await page.mouse.click(box!.x + 8, box!.y + box!.height * 0.45);
  await assertClosed(page);
}

test.describe("Lightbox cross-platform audit (Chromium emul — NOT physical Safari)", () => {
  test("L1 JobPhotoGallery — portal; path X; path backdrop; Escape; rapid×10", async ({ page }) => {
    test.setTimeout(180_000);
    const bag = attachConsoleCapture(page);
    await seedAdmin(page);
    await openAdminJobs(page);
    await openE2eJobFromList(page, E2E_JOB_ADDRESS);
    await page.getByRole("button", { name: /Zdjęcia/i }).first().click();

    const thumbs = page.locator(".group.relative.aspect-square, [class*='aspect-square']");
    await expect(thumbs.first()).toBeVisible({ timeout: 15_000 });

    await thumbs.nth(0).click();
    await assertOpen(page);

    const meta = await overlayMeta(page);
    expect(meta, "overlay missing").toBeTruthy();
    expect(meta!.parentIsBody, "L1 must portal to document.body").toBe(true);
    expect(meta!.hasOverlay).toBe(true);
    expect(meta!.hasLightbox).toBe(true);
    expect(meta!.hasSheet).toBe(false);
    expect(meta!.pointerEvents).not.toBe("none");
    expect(Number(meta!.zIndex) || 0).toBeGreaterThanOrEqual(50);
    expect(meta!.position).toBe("fixed");
    // Full viewport coverage preferred; soft-assert logged via expect soft if partial
    expect(meta!.coversViewport, `coverage ${JSON.stringify(meta)}`).toBe(true);

    await page.keyboard.press("Escape");
    await assertClosed(page);

    // Path X
    await thumbs.nth(0).click();
    await assertOpen(page);
    await closeViaX(page);

    // Path backdrop (separate from X)
    await thumbs.nth(0).click();
    await assertOpen(page);
    await closeViaBackdrop(page);

    // Second photo then rapid ×10
    await thumbs.nth(1).click();
    await assertOpen(page);
    await closeViaX(page);

    for (let i = 0; i < 10; i++) {
      await thumbs.nth(i % 2).click();
      await assertOpen(page);
      await closeViaX(page);
    }

    // body cleanup: no orphan overlays
    await expect(page.locator(overlaySel)).toHaveCount(0);
    await expect(page.locator("html.modal-scroll-locked")).toHaveCount(0);
    assertNoJsNoise(bag);
  });

  test("L2 JobPhotosGalleryView — path Escape; path X; path backdrop; reopen", async ({ page }) => {
    test.setTimeout(180_000);
    const bag = attachConsoleCapture(page);
    await seedAdmin(page);
    await openAdminModule(page, "Zdjęcia i pliki");
    await expect(page.getByText(/W galerii|zdj\./i).first()).toBeVisible({ timeout: 45_000 });
    await page.locator("button").filter({ hasText: E2E_JOB_ADDRESS }).first().click();
    const thumb = page.locator("button.group.relative.aspect-square, button[class*='aspect-square']").first();
    await expect(thumb).toBeVisible({ timeout: 15_000 });

    await thumb.click();
    await assertOpen(page);
    const meta = await overlayMeta(page);
    expect(meta!.hasOverlay).toBe(true);
    expect(meta!.pointerEvents).not.toBe("none");
    // L2 still in-tree (MUX-B1) — parentIsBody may be false
    await page.keyboard.press("Escape");
    await assertClosed(page);

    // Path X
    await thumb.click();
    await assertOpen(page);
    await closeViaX(page);

    // Path backdrop
    await thumb.click();
    await assertOpen(page);
    await closeViaBackdrop(page);

    for (let i = 0; i < 5; i++) {
      await thumb.click();
      await assertOpen(page);
      await closeViaX(page);
    }
    assertNoJsNoise(bag);
  });

  test("L3 InspectorPhotoGallery — path Escape; path X only (no backdrop by design)", async ({ page }) => {
    test.setTimeout(180_000);
    const bag = attachConsoleCapture(page);
    await seedInspector(page);
    await openInspectorJob(page);
    await page.getByRole("toolbar", { name: /Skróty odbioru WM/i }).getByRole("button", { name: "Zdjęcia", exact: true }).click();
    const thumb = page.locator(".aspect-square button").filter({ has: page.locator("img") }).first();
    await expect(thumb).toBeVisible({ timeout: 15_000 });
    await thumb.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(150);
    await thumb.click();
    await assertOpen(page);
    const meta = await overlayMeta(page);
    expect(meta!.hasOverlay).toBe(true);
    expect(meta!.pointerEvents).not.toBe("none");

    // Path Escape
    await page.keyboard.press("Escape");
    await assertClosed(page);

    // Path X (must be BUTTON — harness regression guard)
    await thumb.click();
    await assertOpen(page);
    await closeViaX(page);

    for (let i = 0; i < 5; i++) {
      await thumb.click();
      await assertOpen(page);
      await closeViaX(page);
    }
    assertNoJsNoise(bag);
  });

  test("L4 InspectorOverlays — path Escape; path X; path backdrop", async ({ page }) => {
    test.setTimeout(180_000);
    const bag = attachConsoleCapture(page);
    await seedInspector(page);
    await openInspectorJob(page);
    await page.locator("div.flex.gap-1.overflow-x-auto").getByRole("button", { name: /^Dokumentacja/ }).click();
    const reportBtn = page.getByRole("button", { name: new RegExp(E2E_WORKER_NAME) }).first();
    await reportBtn.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await reportBtn.click();
    const sketchBtn = page.locator("button").filter({ has: page.locator("img[alt='Rysunek']") }).first();
    await expect(sketchBtn).toBeVisible({ timeout: 10_000 });
    await sketchBtn.click();

    await assertOpen(page);
    await page.keyboard.press("Escape");
    await assertClosed(page);

    await sketchBtn.click();
    await assertOpen(page);
    await closeViaX(page);

    await sketchBtn.click();
    await assertOpen(page);
    await closeViaBackdrop(page);
    assertNoJsNoise(bag);
  });

  test("L5 InspectorJobPhotosGalleryView — path Escape; path X; path backdrop; rapid", async ({ page }) => {
    test.setTimeout(180_000);
    const bag = attachConsoleCapture(page);
    await seedInspector(page);
    await page.getByRole("button", { name: /^Galeria$/i }).click();
    await expect(page.getByText(/Galeria zdjęć|W galerii|Galeria \(/i).first()).toBeVisible({ timeout: 20_000 });
    await page.locator("button").filter({ hasText: E2E_JOB_ADDRESS }).first().click();
    const thumb = page.locator("button.group.relative.aspect-square, button[class*='aspect-square']").first();
    await expect(thumb).toBeVisible({ timeout: 15_000 });

    await thumb.click();
    await assertOpen(page);
    await page.keyboard.press("Escape");
    await assertClosed(page);

    await thumb.click();
    await assertOpen(page);
    await closeViaX(page);

    await thumb.click();
    await assertOpen(page);
    await closeViaBackdrop(page);

    for (let i = 0; i < 5; i++) {
      await thumb.click();
      await assertOpen(page);
      await closeViaX(page);
    }
    assertNoJsNoise(bag);
  });
});

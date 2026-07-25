/**
 * AUDIT ONLY — MOBILE-LIGHTBOX-IOS-01 cross-platform regression.
 * Chromium mobile emulation · NOT physical iPhone Safari.
 *
 *   PW_BASE_URL=http://127.0.0.1:4173 npx playwright test --config=playwright.lightbox-cross-platform.config.mjs
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL || "http://127.0.0.1:4173";

/** Pixel 8 — brak w bundled devices; viewport zbliżony do Pixel 8. */
const pixel8 = {
  ...devices["Pixel 7"],
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};

/** Galaxy S23 — brak w bundled; Galaxy S24 jako najbliższy Samsung + jawny proxy w nazwie projektu. */
const galaxyS23Proxy = {
  ...devices["Galaxy S24"],
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

function project(name, device) {
  return {
    name,
    use: { ...device, browserName: "chromium", hasTouch: true },
    testMatch: /lightbox-cross-platform-audit\.spec\.ts/,
  };
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/lightbox-cross-platform.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    hasTouch: true,
  },
  projects: [
    project("cp-iphone-se", devices["iPhone SE"]),
    project("cp-iphone-12", devices["iPhone 12"]),
    project("cp-iphone-14-pro", devices["iPhone 14 Pro"]),
    project("cp-iphone-15-pro-max", devices["iPhone 15 Pro Max"]),
    project("cp-pixel-7", devices["Pixel 7"]),
    project("cp-pixel-8-approx", pixel8),
    project("cp-galaxy-s23-proxy", galaxyS23Proxy),
  ],
});

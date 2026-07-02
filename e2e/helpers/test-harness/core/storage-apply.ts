import type { Page } from "@playwright/test";
import type { HarnessRunManifest } from "./manifest";

export async function readHarnessManifestFromPage(page: Page): Promise<HarnessRunManifest | null> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("wgdom-harness-manifest");
    return raw ? JSON.parse(raw) : null;
  });
}

export async function writeHarnessManifestToPage(
  page: Page,
  manifest: HarnessRunManifest,
): Promise<void> {
  await page.evaluate((m) => {
    sessionStorage.setItem("wgdom-harness-manifest", JSON.stringify(m));
  }, manifest);
}

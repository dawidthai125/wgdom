import { expect, type Page } from "@playwright/test";
import { E2E_JOB_ADDRESS, E2E_MARKER } from "../fixtures/e2e-seed";

export async function blockCloudSync(page: Page): Promise<void> {
  const block = async (route: import("@playwright/test").Route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "e2e-cloud-blocked" }),
    });
  };
  await page.route(/\/functions\/v1\//, block);
  await page.route(/batch-get|batch-set|storage-upload|jobs-backup/, block);
}

export async function snapshotKwJobs(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem("kw-jobs") || "[]");
}

export async function reinjectKwJobs(page: Page, jobsJson: string): Promise<void> {
  await page.evaluate((json) => localStorage.setItem("kw-jobs", json), jobsJson);
}

export async function clickAdminSidebar(page: Page, label: string): Promise<void> {
  const btn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }),
  });
  if (await btn.count()) {
    await btn.first().click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: new RegExp(label, "i") }).first().click({ timeout: 15_000 });
  }
}

export async function openWorkerJob(page: Page): Promise<void> {
  const title = new RegExp(E2E_JOB_ADDRESS.replace(/\./g, "\\."), "i");
  await page.getByRole("button", { name: title }).first().click({ timeout: 15_000 });
  await expect(page.getByText("Galeria — wiele zdjęć")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Dokumentacja robót")).toBeVisible({ timeout: 15_000 });
}

export async function submitWorkerDocumentation(page: Page): Promise<void> {
  const scope = page.getByPlaceholder(/Wpisz wykonane prace/i);
  await scope.fill(E2E_MARKER);
  await page.getByRole("button", { name: /\+ Salon/i }).click();
  const dimInputs = page.locator('input[placeholder="m"]');
  await dimInputs.nth(0).fill("4");
  await dimInputs.nth(1).fill("3");
  await dimInputs.nth(2).fill("2.6");
  await page.getByRole("button", { name: /Wyślij dokumentację do admina/i }).click();
  await expect(page.getByText("Twoja dokumentacja (1)")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(E2E_MARKER)).toBeVisible({ timeout: 10_000 });
}

export async function openAdminJob(page: Page): Promise<void> {
  await clickAdminSidebar(page, "Roboty");
  const title = new RegExp(E2E_JOB_ADDRESS.replace(/\./g, "\\."), "i");
  await page.getByRole("button", { name: title }).first().click({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /^Dokumentacja/ })).toBeVisible({
    timeout: 20_000,
  });
}

export async function selectAdminJobTab(page: Page, tab: "Dokumentacja" | "Pliki"): Promise<void> {
  const pattern = tab === "Pliki" ? /^Pliki \d/ : /^Dokumentacja/;
  await page.getByRole("button", { name: pattern }).click();
}

export async function assertAdminDocumentation(page: Page, workerName: string): Promise<void> {
  await expect(page.getByText(E2E_MARKER)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(workerName)).toBeVisible();
}

export async function assertAdminFilesHub(page: Page): Promise<void> {
  await expect(page.getByText("Dokumentacja robót").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Dokumentacja robót #1/i)).toBeVisible({ timeout: 10_000 });
}

export async function openInspectorJob(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Roboty", exact: true }).click();
  const title = new RegExp(E2E_JOB_ADDRESS.replace(/\./g, "\\."), "i");
  await page.getByRole("button", { name: title }).first().click({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /^Dokumentacja/ })).toBeVisible({
    timeout: 15_000,
  });
}

export async function selectInspectorJobSection(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Dokumentacja/ }).click();
  await expect(page.getByText("Dokumentacja robót").first()).toBeVisible({ timeout: 10_000 });
}

export async function expandInspectorReport(page: Page, workerName: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(workerName) }).first().click();
  await expect(page.getByText(E2E_MARKER)).toBeVisible({ timeout: 15_000 });
}

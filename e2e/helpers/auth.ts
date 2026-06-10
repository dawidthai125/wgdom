import { expect, type Page } from "@playwright/test";
import {
  E2E_ADMIN_PASS,
  E2E_INSPECTOR_PASS,
  E2E_WORKER_NAME,
  E2E_WORKER_PHONE_INPUT,
  E2E_WORKER_PIN,
} from "../fixtures/e2e-seed";

export async function gotoLoginPick(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({
    timeout: 45_000,
  });
}

export async function loginWorker(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Pracownik/i }).first().click();
  await expect(page.getByText("Logowanie pracownika")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: new RegExp(E2E_WORKER_NAME) }).click();
  await page.locator('input[placeholder*="501"]').fill(E2E_WORKER_PHONE_INPUT);
  await page.locator('input[placeholder="••••"]').fill(E2E_WORKER_PIN);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await expect(page.getByText("Tryb pracownika")).toBeVisible({ timeout: 20_000 });
}

export async function logoutWorker(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Wyloguj/i }).first().click();
  await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function loginAdmin(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await expect(page.getByText("Logowanie administratora")).toBeVisible({ timeout: 15_000 });
  await page.locator('input[type="password"]').first().fill(E2E_ADMIN_PASS);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({ timeout: 90_000 });
}

export async function logoutAdmin(page: Page): Promise<void> {
  await page.getByTitle("Wyloguj").click();
  await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function loginInspector(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Inspektor/i }).first().click();
  await expect(page.getByText("Logowanie inspektora")).toBeVisible({ timeout: 15_000 });
  await page.locator('input[type="password"]').first().fill(E2E_INSPECTOR_PASS);
  await page.getByRole("button", { name: /Wejdź do panelu/i }).click();
  await expect(page.getByRole("button", { name: "Roboty" })).toBeVisible({ timeout: 90_000 });
}

export async function logoutInspector(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Wyloguj/i }).click();
  await expect(page.getByRole("button", { name: /Panel administracyjny/i }).first()).toBeVisible({
    timeout: 15_000,
  });
}

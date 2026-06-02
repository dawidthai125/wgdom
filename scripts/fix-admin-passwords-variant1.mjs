/**
 * Wariant 1 — partial restore kw-admin-passwords only
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { chromium } from "playwright";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const slug = env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
const headers = { Authorization: `Bearer ${anonKey}`, apikey: anonKey, "Content-Type": "application/json" };
const BASE_URL = "https://www.wgdom.fun";

const STARTUP_PASSWORDS = {
  Dawid: "Dawidneon1990!",
  Stanislaw: "walek55is",
  Pawel: "watroba1991!",
  Szymon: "Inspektor2026!",
};

async function fetchAdminPasswords() {
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys: ["kw-admin-passwords"] }),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}: ${await res.text()}`);
  const { values } = await res.json();
  return values[0] ?? {};
}

async function setAdminPasswords(value) {
  const res = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys: ["kw-admin-passwords"], values: [value] }),
  });
  if (!res.ok) throw new Error(`batch-set ${res.status}: ${await res.text()}`);
  return res.json();
}

async function testLogin(page, mode, loginName, password) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem("kw-admin-remember-on");
    localStorage.removeItem("kw-admin-remember-pw");
    localStorage.removeItem("kw-admin-remember-user");
    localStorage.removeItem("kw-admin-remember-salt");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.waitForTimeout(3500);

  if (mode === "admin") {
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 15_000 });
    const userBtn = page.getByRole("button", { name: new RegExp(loginName, "i") });
    if (await userBtn.count()) await userBtn.first().click();
  } else {
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await page.waitForSelector("text=Logowanie inspektora", { timeout: 15_000 });
    const userBtn = page.getByRole("button", { name: new RegExp(loginName, "i") });
    if (await userBtn.count()) await userBtn.first().click();
  }

  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.waitForTimeout(5000);

  const hasPulpit = await page.locator("text=Pulpit").isVisible().catch(() => false);
  const hasInspector = await page.locator("text=Inspektor").first().isVisible().catch(() => false);
  const hasBadPass = await page.locator("text=Błędne hasło").isVisible().catch(() => false);
  const hasWorkerMode = await page.locator("text=Tryb pracownika").isVisible().catch(() => false);

  if (mode === "inspector") {
    if (hasBadPass) return { ok: false, detail: "Błędne hasło" };
    if (hasInspector && !hasPulpit) return { ok: true, detail: "Panel inspektora" };
    return { ok: false, detail: "Brak panelu inspektora" };
  }
  if (hasBadPass) return { ok: false, detail: "Błędne hasło" };
  if (hasPulpit) return { ok: true, detail: "Pulpit admina" };
  if (hasWorkerMode) return { ok: false, detail: "Zły tryb (worker)" };
  return { ok: false, detail: "Brak Pulpitu" };
}

// 1–2. Before snapshot + verify
const before = await fetchAdminPasswords();
writeFileSync(
  "before-fix-admin-passwords.json",
  JSON.stringify({ capturedAt: new Date().toISOString(), "kw-admin-passwords": before }, null, 2),
  "utf8",
);
console.log("SNAPSHOT before-fix-admin-passwords.json");
console.log("BEFORE:", JSON.stringify(before, null, 2));

// 3. Restore from backup 2026-06-01
const backup = JSON.parse(readFileSync("c:/Users/dawid/Downloads/WGDOM-backup-2026-06-01/kv-data.json", "utf8"));
const restoreValue = backup["kw-admin-passwords"];
if (!restoreValue || typeof restoreValue !== "object") throw new Error("Brak kw-admin-passwords w backupie 2026-06-01");

console.log("\nRESTORE TO:", JSON.stringify(restoreValue, null, 2));
const setResult = await setAdminPasswords(restoreValue);
console.log("batch-set OK:", JSON.stringify(setResult));

// 4. Verify after
const after = await fetchAdminPasswords();
console.log("\nAFTER:", JSON.stringify(after, null, 2));

// 5. Login tests on production
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const loginResults = {};
try {
  loginResults.Dawid = await testLogin(page, "admin", "Dawid", STARTUP_PASSWORDS.Dawid);
  loginResults.Stanislaw = await testLogin(page, "admin", "Stanislaw", STARTUP_PASSWORDS.Stanislaw);
  loginResults.Pawel_startup = await testLogin(page, "admin", "Pawel", STARTUP_PASSWORDS.Pawel);
  loginResults.Szymon = await testLogin(page, "inspector", "Szymon", STARTUP_PASSWORDS.Szymon);
} finally {
  await browser.close();
}

console.log("\nLOGIN TESTS:");
for (const [k, v] of Object.entries(loginResults)) {
  console.log(`  ${k}: ${v.ok ? "PASS" : "FAIL"} — ${v.detail}`);
}

writeFileSync(
  "after-fix-admin-passwords-report.json",
  JSON.stringify({ before, after, restoreValue, loginResults, setResult }, null, 2),
  "utf8",
);

const superAdminOk = loginResults.Dawid?.ok === true;
process.exit(superAdminOk ? 0 : 1);

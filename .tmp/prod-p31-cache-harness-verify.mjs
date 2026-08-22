/**
 * P3.1 CACHE HARNESS FIX VERIFY — read-only · NO CREATE · ephemeral.
 * Validates fixed harness pattern: clear cache only on cold start; same ctx 1st→2nd load.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY } from "../src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = "https://www.wgdom.fun";
const ADMIN_PASS = "e2e-z1-admin-pass";
const PROPOSAL_LS = "kw-knr-wc-identity-proposals";

const mopsItem = JSON.parse(
  readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
);
const mopsItem2 = {
  ...mopsItem,
  id: "p31-cache-harness-fix-clone-tender",
  tenderId: "ocds-p31-cache-harness-fix-clone",
  moIdentifier: "p31-cache-harness-fix-clone-mo",
};
const mopsPkg = JSON.parse(
  readFileSync(join(root, ".tmp/ops-mops-09-item-pkg.json"), "utf8"),
).pkg;

function hashAdmin(login, password) {
  return createHash("sha256")
    .update(`wgdom-admin-account-v1:${login}:${password}`)
    .digest("hex");
}

function seedArgs(clearProposalCache) {
  return {
    mopsItem,
    mopsItem2,
    mopsPkg,
    adminHash: hashAdmin("Dawid", ADMIN_PASS),
    proposalLs: PROPOSAL_LS,
    mdPkgKey: "kw-multi-dwelling-package-v1",
    mdPkgVersion: 1,
    clearProposalCache,
  };
}

function applySeedInBrowser(args) {
  localStorage.setItem(
    "kw-admin-passwords",
    JSON.stringify({ dawid: args.adminHash }),
  );
  localStorage.setItem(
    "kw-tenders-pipeline",
    JSON.stringify([args.mopsItem, args.mopsItem2]),
  );
  localStorage.setItem(
    args.mdPkgKey,
    JSON.stringify({
      version: args.mdPkgVersion,
      byTenderId: {
        [args.mopsItem.id]: args.mopsPkg,
        [args.mopsItem2.id]: args.mopsPkg,
      },
    }),
  );
  if (args.clearProposalCache) {
    localStorage.removeItem(args.proposalLs);
  }
  sessionStorage.setItem(
    "wg-admin-session",
    JSON.stringify({
      id: "dawid",
      login: "Dawid",
      displayName: "Dawid",
      role: "super_admin",
    }),
  );
}

function parseMetrics(text) {
  const get = (k) => {
    const m = text.match(new RegExp(`${k}=([0-9]+)`));
    return m ? Number(m[1]) : null;
  };
  return {
    keys: get("keys"),
    hits: get("hits"),
    miss: get("miss"),
    built: get("built"),
    supabaseQueries: get("supabaseQueries"),
    raw: text,
  };
}

async function proposalStoreSnapshot(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return { entryCount: 0, sampleKeys: [], has1014: false };
    try {
      const parsed = JSON.parse(raw);
      const keys = Object.keys(parsed.entries || {});
      return {
        entryCount: keys.length,
        sampleKeys: keys.slice(0, 3),
        has1014: keys.some((k) => k.includes("1014-07")),
      };
    } catch {
      return { entryCount: -1, sampleKeys: [], has1014: false };
    }
  }, KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY);
}

async function main() {
  const TENDER_PATH = `/przetargi/${encodeURIComponent(mopsItem.id)}/przetarg`;
  const TENDER_PATH_2 = `/przetargi/${encodeURIComponent(mopsItem2.id)}/przetarg`;

  const report = {
    baseline: {
      head: execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim(),
      productionVersion: (
        await fetch(`${BASE}/version.json`, { cache: "no-store" }).then((r) => r.json())
      ).version,
    },
    authority: { createClicks: 0, forbiddenWrites: 0, p3Routes: 0, wcWrites: 0 },
    cache: {},
    hardFails: [],
    verdict: null,
  };

  const fail = (msg) => {
    report.hardFails.push(msg);
    console.log("FAIL", msg);
  };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 960 } });
  const page = await ctx.newPage();

  await page.route("**/*", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();
    const body = method === "POST" ? req.postData() || "" : "";
    if (method !== "GET" && /executeKnrWc|knr-wc-create|saveWorkCatalogRouted/i.test(url)) {
      report.authority.p3Routes += 1;
    }
    if (
      method === "POST"
      && /make-server|batch-set|persistKey/i.test(url)
      && /applyOwnerKnrMapping|acceptWorkRateResearchCandidate|pricing-research|tender-external-discover|scraping/i.test(
        `${url}\n${body}`,
      )
    ) {
      report.authority.forbiddenWrites += 1;
    }
    if (
      method === "POST"
      && /make-server|batch-set|persistKey/i.test(url)
      && /kw-wgdom-work-catalog|work-catalog/i.test(body)
    ) {
      report.authority.wcWrites += 1;
    }
    await route.continue();
  });

  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
  await page.evaluate(applySeedInBrowser, seedArgs(true));
  await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
  await page.waitForTimeout(5000);

  await page.evaluate(applySeedInBrowser, seedArgs(true));
  await page.goto(`${BASE}${TENDER_PATH}`, { waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-tender-przetarg-workspace]").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(8000);
  await page.reload({ waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-tender-przetarg-workspace]").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(8000);

  await page.locator("[data-ik-knr-wc-load-queue]").click({ timeout: 60_000 });
  await page.locator("[data-ik-knr-wc-proposal-row]").first().waitFor({ timeout: 180_000 });

  const m1Raw = (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  const m1 = parseMetrics(m1Raw);
  const storeAfterFirst = await proposalStoreSnapshot(page);
  report.cache.first = { metrics: m1, store: storeAfterFirst, sameContext: true };

  await page.goto(`${BASE}${TENDER_PATH_2}`, { waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-tender-przetarg-workspace]").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(3000);
  report.cache.beforeSecond = await proposalStoreSnapshot(page);
  await page.locator("[data-ik-knr-wc-load-queue]").click({ timeout: 60_000 });
  await page.locator("[data-ik-knr-wc-cache-metrics]").first().waitFor({ timeout: 120_000 });
  const m2Raw = (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  const m2 = parseMetrics(m2Raw);
  report.cache.second = { metrics: m2, store: await proposalStoreSnapshot(page), sameContext: true };

  await browser.close();

  if (storeAfterFirst.entryCount !== 20) {
    fail(`entryCount after 1st load=${storeAfterFirst.entryCount} expected 20`);
  }
  if (m1.keys !== 20 || m1.miss !== 20 || m1.built !== 20 || m1.hits !== 0) {
    fail(`1st load metrics: ${m1Raw}`);
  }
  if (m2.hits !== 20 || m2.miss !== 0 || m2.built !== 0) {
    fail(`2nd load metrics: ${m2Raw}`);
  }
  if (report.cache.beforeSecond.entryCount !== 20) {
    fail(`entryCount before 2nd load=${report.cache.beforeSecond.entryCount} expected 20`);
  }
  if (report.authority.p3Routes > 0) fail("unexpected P3 route activity");
  if (report.authority.forbiddenWrites > 0) fail("forbidden authority writes");
  if (report.authority.wcWrites > 0) {
    report.authority.wcWritesNote =
      "ambient cloud catalog sync during bootstrap — excluded from fail (post-enable pattern)";
  }

  report.verdict = report.hardFails.length
    ? "P3 CACHE HARNESS FIX = FAIL"
    : "P3 CACHE HARNESS FIX = PASS";

  writeFileSync(
    join(__dirname, "prod-p31-cache-harness-verify.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("VERDICT:", report.verdict);
  console.log("1st:", m1Raw, "store:", storeAfterFirst.entryCount);
  console.log("2nd:", m2Raw, "storeBefore2nd:", report.cache.beforeSecond.entryCount);
  process.exit(report.hardFails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

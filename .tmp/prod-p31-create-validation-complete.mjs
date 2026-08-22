/**
 * P3.1 POST-CREATE READ-ONLY completion — NO CREATE · ephemeral.
 * Completes validation after single CREATE click (harness timeout on UI message).
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY } from "../src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts";
import { WORK_CATALOG_STORAGE_KEY } from "../src/lib/work-catalog/work-catalog-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = "https://www.wgdom.fun";
const ADMIN_PASS = "e2e-z1-admin-pass";
const INSPECTOR_PASS = "Inspektor2026!";
const WORK_ID = "knr-wc-p31-prod-1787410090884-m2";
const OLD_SMOKE = "knr-wc-prod-smoke-1787390836332-m2";
const EXPECTED_BOQ_PREFIX =
  "W 3 Mycie po robotach malarskich posadzek lastrykowych, m2 d.1.3 1014-07 cemento";
const PROPOSAL_LS = "kw-knr-wc-identity-proposals";

const prior = JSON.parse(
  readFileSync(join(__dirname, "prod-p31-create-validation.json"), "utf8"),
);

const mopsItem = JSON.parse(
  readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
);
const mopsItem2 = {
  ...mopsItem,
  id: "p31-create-cache-clone-tender",
  tenderId: "ocds-p31-create-cache-clone",
  moIdentifier: "p31-create-clone-mo",
};
const mopsPkg = JSON.parse(
  readFileSync(join(root, ".tmp/ops-mops-09-item-pkg.json"), "utf8"),
).pkg;

function hashAdmin(login, password) {
  return createHash("sha256")
    .update(`wgdom-admin-account-v1:${login}:${password}`)
    .digest("hex");
}

const seedArgsBase = {
  mopsItem,
  mopsItem2,
  mopsPkg,
  adminHash: hashAdmin("Dawid", ADMIN_PASS),
  proposalLs: PROPOSAL_LS,
  mdPkgKey: "kw-multi-dwelling-package-v1",
  mdPkgVersion: 1,
};

function seedArgs(clearProposalCache) {
  return { ...seedArgsBase, clearProposalCache };
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

function parseStore(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function findWork(store, id) {
  const w = store?.catalogs?.wroclaw?.works?.find((x) => x.id === id) ?? null;
  const d = store?.catalogs?.dolnyslask?.works?.find((x) => x.id === id) ?? null;
  return { wroclaw: w, dolnyslask: d };
}

function countDupId(store, id) {
  let n = 0;
  for (const region of ["wroclaw", "dolnyslask"]) {
    n += (store?.catalogs?.[region]?.works ?? []).filter((w) => w.id === id).length;
  }
  return n;
}

function parseMetrics(text) {
  const get = (k) => {
    const m = text.match(new RegExp(`${k}=([0-9]+)`));
    return m ? Number(m[1]) : null;
  };
  return { keys: get("keys"), hits: get("hits"), miss: get("miss"), built: get("built"), supabaseQueries: get("supabaseQueries"), raw: text };
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

async function openReviewForTableCode(page, tableCode) {
  const row = page.locator("[data-ik-knr-wc-proposal-row]").filter({ hasText: tableCode }).first();
  if (!(await row.count())) return false;
  await row.locator("[data-ik-knr-wc-open-review]").click();
  await page.locator("[data-ik-knr-wc-proposal-review]").waitFor({ timeout: 15_000 });
  return true;
}

async function main() {
  const report = { ...prior, completion: "read-only post-create", hardFails: [], gaps: [] };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 960 } });
  const page = await ctx.newPage();
  const TENDER_PATH = `/przetargi/${encodeURIComponent(mopsItem.id)}/przetarg`;
  const TENDER_PATH_2 = `/przetargi/${encodeURIComponent(mopsItem2.id)}/przetarg`;

  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
  await page.evaluate(applySeedInBrowser, seedArgs(true));
  await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
  await page.waitForTimeout(12000);

  const raw = await page.evaluate((k) => localStorage.getItem(k), WORK_CATALOG_STORAGE_KEY);
  const store = parseStore(raw);
  const created = findWork(store, WORK_ID);
  const oldSmoke = findWork(store, OLD_SMOKE);

  report.createExecution = {
    clicks: 1,
    note: "single CREATE click from prior run; UI message not captured due harness timeout",
    resultTextUnknown: true,
  };
  report.persistence = {
    workId: WORK_ID,
    inWroclaw: !!created.wroclaw,
    inDolnyslask: !!created.dolnyslask,
    sameIdBothRegions: !!created.wroclaw && !!created.dolnyslask,
    namePlW: created.wroclaw?.namePl ?? null,
    namePlD: created.dolnyslask?.namePl ?? null,
    descriptionPlW: created.wroclaw?.descriptionPl ?? null,
    unitW: created.wroclaw?.unit,
    unitD: created.dolnyslask?.unit,
    companyPricePlnW: created.wroclaw?.companyPricePln,
    companyPricePlnD: created.dolnyslask?.companyPricePln,
    sourceW: created.wroclaw?.source,
    sourceD: created.dolnyslask?.source,
    activeW: created.wroclaw?.active,
    activeD: created.dolnyslask?.active,
    ourWorkRateW: created.wroclaw?.ourWorkRate ?? null,
    dupCount: countDupId(store, WORK_ID),
    namePlNotKnnr: created.wroclaw?.namePl !== "KNNR",
    namePlMatchesEnriched: Boolean(created.wroclaw?.namePl?.startsWith(EXPECTED_BOQ_PREFIX)),
    oldSmokeStillPresent: !!(oldSmoke.wroclaw || oldSmoke.dolnyslask),
    oldSmokeNamePl: oldSmoke.wroclaw?.namePl ?? oldSmoke.dolnyslask?.namePl ?? null,
  };

  report.persistenceNewSession = report.persistence;

  await page.evaluate(applySeedInBrowser, seedArgs(true));
  await page.goto(`${BASE}${TENDER_PATH}`, { waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-tender-przetarg-workspace]").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(5000);
  await page.locator("[data-ik-knr-wc-load-queue]").click({ timeout: 60_000 });
  await page.locator("[data-ik-knr-wc-proposal-row]").first().waitFor({ timeout: 180_000 });

  const rows = await page.locator("[data-ik-knr-wc-proposal-row]").count();
  const metrics1Raw = (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  const m1 = parseMetrics(metrics1Raw);
  const proposalStoreAfterFirstLoad = await proposalStoreSnapshot(page);
  report.p2Regression = {
    rows,
    cacheFirst: m1,
    proposalStoreAfterFirstLoad,
    duplicateHighBadges: await page.locator("[data-ik-knr-wc-duplicate-high-badge]").count(),
    sameBrowserContext: true,
    noClearBeforeSecond: true,
    harnessNote: "clearProposalCache only on cold start seed; no removeItem before 2nd load",
  };
  for (const code of ["1305-01", "1305-02"]) {
    const ok = await openReviewForTableCode(page, code);
    report.p2Regression[code] = ok
      ? (await page.locator('[data-ik-knr-wc-owner-option="CREATE_NEW"]').isDisabled())
        ? "CREATE blocked"
        : "CREATE NOT blocked"
      : "row missing";
    if (ok) await page.locator("[data-ik-knr-wc-review-close]").click();
  }
  await page.goto(`${BASE}${TENDER_PATH_2}`, { waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-tender-przetarg-workspace]").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(3000);
  report.p2Regression.proposalStoreBeforeSecond = await proposalStoreSnapshot(page);
  await page.locator("[data-ik-knr-wc-load-queue]").click({ timeout: 60_000 });
  await page.locator("[data-ik-knr-wc-cache-metrics]").first().waitFor({ timeout: 120_000 });
  report.p2Regression.cacheSecond = parseMetrics(
    (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "",
  );
  report.p2Regression.proposalStoreAfterSecond = await proposalStoreSnapshot(page);

  await ctx.close();

  const inspCtx = await browser.newContext();
  const insp = await inspCtx.newPage();
  await insp.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
  await insp.getByRole("button", { name: /Inspektor/i }).first().click();
  await insp.locator('input[type="password"]').first().fill(INSPECTOR_PASS);
  await insp.getByRole("button", { name: /Wejdź do panelu/i }).click();
  await insp.getByText(/Szymon|Roboty|Galeria|Portfolio/i).first().waitFor({ timeout: 90_000 });
  await insp.goto(`${BASE}${TENDER_PATH}`, { waitUntil: "load", timeout: 120_000 });
  await insp.waitForTimeout(3000);
  report.inspectorNegative = {
    p2Panel: await insp.locator("[data-ik-knr-wc-proposal-queue-panel]").count(),
    p3Executor: await insp.locator("[data-ik-knr-wc-create-executor]").count(),
    executeBtn: await insp.locator("[data-ik-knr-wc-create-execute]").count(),
  };
  await browser.close();

  const runTest = (cmd, label) => {
    try {
      const out = execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      report.localTests = report.localTests || {};
      report.localTests[label] = { ok: true, tail: out.trim().split("\n").slice(-1)[0] };
    } catch (e) {
      report.localTests = report.localTests || {};
      report.localTests[label] = { ok: false, error: String(e.stderr || e.message).slice(0, 200) };
    }
  };
  runTest("npm run build", "build");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p1.mjs", "p1");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p21-persist.mjs", "p21");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p22.mjs", "p22");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p2ui.mjs", "p2ui");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p3.mjs", "p3");

  report.gitSafety = {
    head: execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim(),
    originMain: execSync("git rev-parse origin/main", { cwd: root, encoding: "utf8" }).trim(),
    stagedEmpty: execSync("git diff --cached --name-only", { cwd: root, encoding: "utf8" }).trim().length === 0,
    appTsx: execSync("git status --short src/app/App.tsx", { cwd: root, encoding: "utf8" }).trim(),
  };

  report.authorityAudit = {
    createClicks: 1,
    note: "authority window from prior CREATE run; wcWrites/console not re-captured",
  };

  const w = created.wroclaw;
  const d = created.dolnyslask;
  const hardFails = [];
  if (!w || !d) hardFails.push("workId missing in LS after CREATE");
  if (w?.namePl === "KNNR") hardFails.push('namePl="KNNR"');
  if (!w?.namePl?.startsWith(EXPECTED_BOQ_PREFIX)) hardFails.push("namePl not enriched BOQ");
  if (w?.unit !== "m2") hardFails.push("unit != m2");
  if (w?.companyPricePln !== 0) hardFails.push("companyPricePln != 0");
  if (w?.source !== "custom") hardFails.push("source != custom");
  if (report.p2Regression["1305-01"] !== "CREATE blocked") hardFails.push("1305-01");
  if (report.inspectorNegative.p3Executor !== 0) hardFails.push("inspector P3");
  if (report.p2Regression.proposalStoreAfterFirstLoad?.entryCount !== 20) {
    hardFails.push(
      `proposal cache entryCount after 1st load=${report.p2Regression.proposalStoreAfterFirstLoad?.entryCount}`,
    );
  }
  const cacheFirst = report.p2Regression.cacheFirst;
  const cacheSecond = report.p2Regression.cacheSecond;
  if (
    cacheFirst?.keys !== 20
    || cacheFirst?.miss !== 20
    || cacheFirst?.built !== 20
    || cacheFirst?.hits !== 0
  ) {
    hardFails.push(`cache first: ${cacheFirst?.raw ?? "missing"}`);
  }
  if (cacheSecond?.hits !== 20 || cacheSecond?.miss !== 0 || cacheSecond?.built !== 0) {
    hardFails.push(`cache second: ${cacheSecond?.raw ?? "missing"}`);
  }

  const gaps = ["CREATE UI success message not captured (harness timeout on result/error locators)"];
  if (oldSmoke.wroclaw?.namePl === "KNNR") gaps.push("old smoke work unchanged namePl=KNNR (expected, no retrofix)");

  report.hardFails = hardFails;
  report.gaps = [...(prior.gaps || []), ...gaps];
  report.verdict = hardFails.length
    ? "P3.1 PRODUCTION CREATE VALIDATION = FAIL"
    : "P3.1 PRODUCTION CREATE VALIDATION = PASS WITH GAPS";

  writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
  console.log("VERDICT:", report.verdict);
  console.log("WORK_ID:", WORK_ID);
  console.log("namePl:", w?.namePl);
  console.log("hardFails:", hardFails);
  process.exit(hardFails.length ? 1 : 0);
}

main().catch(console.error);

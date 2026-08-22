/**
 * P3.1 PRODUCTION CREATE VALIDATION — ephemeral · NOT committed · EXACTLY ONE CREATE.
 * Production UI path · NO loadMopsKey · NO retry · NO retrofix old smoke workId.
 */
process.env.VITE_SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || "p31-prod-val";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "p31-prod-val-anon";

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import {
  assertKnrWcCreateAllowed,
  suggestCatalogWorkIdFromProposal,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-create.ts";
import {
  buildDescriptionByLineIdFromDocumentExpertLines,
  buildUnitByLineIdFromDocumentExpertLines,
  extractKnrWcBridgeKeysFromKnrExpert,
  runKnrWcIdentityProposalQueueBatch,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-queue.ts";
import {
  KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY } from "../src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts";
import { WORK_CATALOG_STORAGE_KEY } from "../src/lib/work-catalog/work-catalog-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = "https://www.wgdom.fun";
const EXPECT_COMMIT_PREFIX = "5984330";
const ADMIN_PASS = "e2e-z1-admin-pass";
const INSPECTOR_PASS = "Inspektor2026!";
const TARGET_KEY = "KNNR||1014-07";
const TARGET_TABLE = "1014-07";
const OLD_SMOKE_WORK_ID = "knr-wc-prod-smoke-1787390836332-m2";
const PROPOSAL_LS = "kw-knr-wc-identity-proposals";
const EXPECTED_BOQ_PREFIX =
  "W 3 Mycie po robotach malarskich posadzek lastrykowych, m2 d.1.3 1014-07 cemento";

const report = {
  baseline: {},
  selectedProposal: null,
  enrichmentPreCreate: null,
  guardEvaluation: null,
  preCreateAuthority: null,
  createExecution: null,
  createdWorkId: null,
  persistence: null,
  persistenceNewSession: null,
  authorityAudit: null,
  p2Regression: {},
  inspectorNegative: {},
  localTests: {},
  gitSafety: null,
  gaps: [],
  hardFails: [],
  verdict: null,
};

function gap(msg) {
  report.gaps.push(msg);
  console.log("GAP", msg);
}

function fail(msg) {
  report.hardFails.push(msg);
  console.log("FAIL", msg);
}

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

function productionPathProposal(normalizedKey) {
  const tenderId = mopsItem.id;
  const docExpert = runIkDocumentExpert({ item: mopsItem, package: mopsPkg });
  const unitByLineId = buildUnitByLineIdFromDocumentExpertLines(
    docExpert.masterBoqLines?.map((r) => ({
      lineId: r.line.lineId,
      unit: r.line.unit,
    })) ?? [],
  );
  const descriptionByLineId = buildDescriptionByLineIdFromDocumentExpertLines(
    docExpert.masterBoqLines?.map((r) => ({
      lineId: r.line.lineId,
      description: r.line.description,
    })) ?? [],
  );
  const knrReport = runIkKnrExpert({
    tenderId,
    documentExpert: docExpert,
    historicalIndex: null,
  });
  const keys = extractKnrWcBridgeKeysFromKnrExpert(knrReport, {
    unitByLineId,
    descriptionByLineId,
  });
  const batch = runKnrWcIdentityProposalQueueBatch({
    tenderId,
    keys,
    ikEntryEnabled: true,
    p2UiEnabled: true,
    featureEnabled: true,
    persistEnabled: true,
    p22HardeningEnabled: true,
  });
  return batch.proposals.find((p) => p.normalizedKey === normalizedKey) ?? null;
}

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

function parseCatalogStore(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findWorkInStore(store, workId) {
  if (!store?.catalogs) return { wroclaw: null, dolnyslask: null };
  const pick = (region) =>
    store.catalogs?.[region]?.works?.find((w) => w.id === workId) ?? null;
  return { wroclaw: pick("wroclaw"), dolnyslask: pick("dolnyslask") };
}

function countWorks(store) {
  if (!store?.catalogs) return { wroclaw: 0, dolnyslask: 0, total: 0 };
  const w = store.catalogs.wroclaw?.works?.length ?? 0;
  const d = store.catalogs.dolnyslask?.works?.length ?? 0;
  return { wroclaw: w, dolnyslask: d, total: w + d };
}

function countDupId(store, id) {
  let n = 0;
  for (const region of ["wroclaw", "dolnyslask"]) {
    n += (store?.catalogs?.[region]?.works ?? []).filter((w) => w.id === id).length;
  }
  return n;
}

function isForbiddenWrite(url, body) {
  const hay = `${url}\n${body}`;
  return /applyOwnerKnrMapping|acceptWorkRateResearchCandidate|pricing-research|tender-external-discover|scraping/i.test(
    hay,
  );
}

function isWcWriteBody(body) {
  return /kw-wgdom-work-catalog|WORK_CATALOG_STORAGE_KEY|"works"\s*:/i.test(body || "")
    && /work-catalog|kw-wgdom-work-catalog/i.test(body || "");
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

async function runP2CacheRegressionSameContext(page, tenderPath2, report) {
  const rows = await page.locator("[data-ik-knr-wc-proposal-row]").count();
  report.p2Regression.rows = rows;
  report.p2Regression.duplicateHighBadges = await page
    .locator("[data-ik-knr-wc-duplicate-high-badge]")
    .count();

  for (const code of ["1305-01", "1305-02"]) {
    const ok = await openReviewForTableCode(page, code);
    if (!ok) {
      report.p2Regression[code] = "row missing";
      continue;
    }
    const createOff = await page
      .locator('[data-ik-knr-wc-owner-option="CREATE_NEW"]')
      .isDisabled();
    report.p2Regression[code] = createOff ? "CREATE blocked" : "CREATE NOT blocked";
    await page.locator("[data-ik-knr-wc-review-close]").click();
  }

  await page.goto(`${BASE}${tenderPath2}`, { waitUntil: "load", timeout: 120_000 });
  await page.locator("[data-tender-przetarg-workspace]").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(3000);
  report.p2Regression.proposalStoreBeforeSecond = await proposalStoreSnapshot(page);
  await page.locator("[data-ik-knr-wc-load-queue]").click({ timeout: 60_000 });
  await page.locator("[data-ik-knr-wc-cache-metrics]").first().waitFor({ timeout: 120_000 });
  const metrics2Raw =
    (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  report.p2Regression.cacheSecond = parseMetrics(metrics2Raw);
  report.p2Regression.proposalStoreAfterSecond = await proposalStoreSnapshot(page);
  report.p2Regression.sameBrowserContext = true;
  report.p2Regression.noClearBeforeSecond = true;
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

async function readReviewField(page, label) {
  const section = page.locator("[data-ik-knr-wc-proposal-review]");
  const dt = section.locator("dt").filter({ hasText: label }).first();
  if (!(await dt.count())) return null;
  const dd = dt.locator("xpath=following-sibling::dd[1]");
  const text = (await dd.textContent())?.trim() ?? "";
  return text === "—" ? null : text;
}

async function openReviewForTableCode(page, tableCode) {
  const row = page
    .locator("[data-ik-knr-wc-proposal-row]")
    .filter({ hasText: tableCode })
    .first();
  if (!(await row.count())) return false;
  await row.locator("[data-ik-knr-wc-open-review]").click();
  await page.locator("[data-ik-knr-wc-proposal-review]").waitFor({ timeout: 15_000 });
  return true;
}

async function main() {
  const workId = `knr-wc-p31-prod-${Date.now()}-m2`;
  report.createdWorkId = workId;

  // KROK 1 — cold start git (read-only)
  const head = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  const origin = execSync("git rev-parse origin/main", { cwd: root, encoding: "utf8" }).trim();
  const appStatus = execSync("git status --short src/app/App.tsx", { cwd: root, encoding: "utf8" }).trim();
  const staged = execSync("git diff --cached --name-only", { cwd: root, encoding: "utf8" }).trim();
  report.baseline = {
    head,
    originMain: origin,
    headMatchesOrigin: head === origin,
    appTsxStatus: appStatus || "clean",
    stagedEmpty: staged.length === 0,
  };

  const version = await fetch(`${BASE}/version.json`, { cache: "no-store" }).then((r) =>
    r.json(),
  );
  report.baseline.productionVersion = version.version;
  report.baseline.productionCommit = version.commit;
  report.baseline.p3FlagSourceOn = KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED === true;
  report.baseline.plannedWorkId = workId;
  report.baseline.oldSmokeWorkIdUntouched = OLD_SMOKE_WORK_ID;

  if (!String(version.commit || "").startsWith(EXPECT_COMMIT_PREFIX)) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
    fail(`deploy commit mismatch got=${version.commit} expect prefix=${EXPECT_COMMIT_PREFIX}`);
    writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const nodeProposal = productionPathProposal(TARGET_KEY);
  if (!nodeProposal) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
    fail("production path proposal missing for KNNR||1014-07");
    writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 960 } });
  const page = await ctx.newPage();
  const TENDER_PATH = `/przetargi/${encodeURIComponent(mopsItem.id)}/przetarg`;
  const TENDER_PATH_2 = `/przetargi/${encodeURIComponent(mopsItem2.id)}/przetarg`;

  const authority = {
    pre: { wcWrites: 0, forbidden: 0, p3Routes: 0, ambient: 0 },
    create: { wcWrites: 0, forbidden: 0, p3Routes: 0, ambient: 0, wcWriteBodies: [] },
    consoleKnrWcCreate: [],
    createClicked: 0,
  };

  let createPhase = false;

  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("KNR_WC_CREATE")) authority.consoleKnrWcCreate.push(t);
  });

  await page.route("**/*", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();
    const body = method === "POST" ? req.postData() || "" : "";
    const bucket = createPhase ? authority.create : authority.pre;

    if (method === "POST" && /make-server|batch-set|persistKey/i.test(url)) {
      if (isForbiddenWrite(url, body)) bucket.forbidden += 1;
      if (isWcWriteBody(body)) {
        bucket.wcWrites += 1;
        if (createPhase) authority.create.wcWriteBodies.push(body.slice(0, 800));
      } else {
        bucket.ambient += 1;
      }
    }
    if (method !== "GET" && /executeKnrWc|knr-wc-create|knr-wc-identity-bridge-create/i.test(url)) {
      bucket.p3Routes += 1;
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

  const metrics1Raw =
    (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  const m1PreCreate = parseMetrics(metrics1Raw);
  const proposalStoreAfterFirstLoad = await proposalStoreSnapshot(page);
  report.p2Regression = {
    cacheFirst: m1PreCreate,
    proposalStoreAfterFirstLoad,
    harnessNote: "cache cleared only on cold start seed; same ctx through CREATE + 2nd load",
  };

  // KROK 2 — enrichment evidence from production UI review
  const opened = await openReviewForTableCode(page, TARGET_TABLE);
  if (!opened) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
    fail("could not open review for 1014-07");
    await browser.close();
    writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const uiNormalizedKey = await page
    .locator("[data-ik-knr-wc-proposal-review]")
    .getAttribute("data-normalized-key");
  const uiOfficialNamePl = await readReviewField(page, "officialNamePl");
  const uiDescriptionPl = await readReviewField(page, "descriptionPl");
  const uiSourceStatus = (await page.locator("[data-ik-knr-wc-source]").textContent())?.trim();
  const uiRecommendation = (await page.locator("[data-ik-knr-wc-recommendation]").textContent())?.trim();
  const uiDuplicateRisk = (await page.locator("[data-ik-knr-wc-duplicate-risk]").textContent())?.trim();
  const uiUnitRaw = await readReviewField(page, "unitRaw");

  report.enrichmentPreCreate = {
    normalizedKey: uiNormalizedKey,
    officialNamePl: uiOfficialNamePl,
    descriptionPl: uiDescriptionPl,
    descriptionPlLen: uiDescriptionPl?.length ?? 0,
    sourceStatus: uiSourceStatus,
    recommendation: uiRecommendation,
    proposedUnitFromNode: nodeProposal.proposedUnit,
    unitRaw: uiUnitRaw,
    ownerDecisionTarget: "CREATE_NEW",
    duplicateRisk: uiDuplicateRisk,
    staleEvidence: nodeProposal.staleEvidence,
    plannedWorkId: workId,
    enrichedNotKnnr:
      Boolean(uiOfficialNamePl && uiOfficialNamePl !== "KNNR")
      && Boolean(uiDescriptionPl && uiDescriptionPl.length > 10),
    matchesBoqPrefix: Boolean(uiDescriptionPl?.startsWith(EXPECTED_BOQ_PREFIX)),
  };

  report.selectedProposal = {
    normalizedKey: uiNormalizedKey,
    tableCode: nodeProposal.tableCode,
    displayCode: nodeProposal.displayCode,
  };

  if (uiNormalizedKey !== TARGET_KEY) fail(`UI normalizedKey=${uiNormalizedKey}`);
  if (!report.enrichmentPreCreate.enrichedNotKnnr) fail("UI enrichment missing before CREATE");
  if (uiSourceStatus !== "TENDER") fail(`sourceStatus=${uiSourceStatus}`);
  if (uiRecommendation === "HOLD_EVIDENCE") fail("recommendation HOLD_EVIDENCE");
  if (uiDuplicateRisk !== "NONE") fail(`duplicateRisk=${uiDuplicateRisk} expected NONE`);

  await page.locator("[data-ik-knr-wc-review-close]").click();

  // KROK 3 — P3 executor setup
  const preExecutor = await page.locator("[data-ik-knr-wc-create-executor]").count();
  await page.locator("[data-ik-knr-wc-create-load]").click();
  await page.locator("[data-ik-knr-wc-create-select]").waitFor({ timeout: 180_000 });
  await page.selectOption("[data-ik-knr-wc-create-select]", TARGET_KEY);
  await page
    .locator('[data-ik-knr-wc-create-decision]')
    .filter({ hasText: /CREATE_NEW/ })
    .first()
    .click();
  await page.locator("[data-ik-knr-wc-create-work-id]").fill(workId);

  const preCatalogRaw = await page.evaluate(
    (key) => localStorage.getItem(key),
    WORK_CATALOG_STORAGE_KEY,
  );
  const preCatalog = parseCatalogStore(preCatalogRaw) ?? defaultWorkCatalogStore(new Date().toISOString());
  const preCounts = countWorks(preCatalog);
  const preExists = findWorkInStore(preCatalog, workId);
  const oldSmokeExists = findWorkInStore(preCatalog, OLD_SMOKE_WORK_ID);

  const gate = assertKnrWcCreateAllowed({
    proposal: nodeProposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store: preCatalog,
    runtimeP3Enabled: true,
  });

  report.guardEvaluation = {
    assertKnrWcCreateAllowed: gate,
    p3FlagOn: KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED === true,
    ownerDecision: "CREATE_NEW",
    duplicateRisk: nodeProposal.duplicateRisk,
    unitStatus: nodeProposal.unitStatus,
    tableCode: nodeProposal.tableCode,
    proposedUnit: nodeProposal.proposedUnit,
    workIdExistsBefore: !!(preExists.wroclaw || preExists.dolnyslask),
    oldSmokeStillPresent: !!(oldSmokeExists.wroclaw || oldSmokeExists.dolnyslask),
  };

  const preExecuteCount = await page.locator("[data-ik-knr-wc-create-execute]").count();
  report.preCreateAuthority = {
    executorCount: preExecutor,
    executeButtonCount: preExecuteCount,
    p3SpecificRoutes: authority.pre.p3Routes,
    forbiddenWrites: authority.pre.forbidden,
    ambientPostsExcluded: authority.pre.ambient,
    catalogWorksBefore: preCounts,
  };

  if (!gate.ok) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
    fail(`guard blocked: ${gate.reason} — CREATE NOT clicked`);
    await browser.close();
    writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  if (preExecutor !== 1 || preExecuteCount !== 1) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
    fail(`pre-create UI executor=${preExecutor} execute=${preExecuteCount}`);
    await browser.close();
    writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  if (preExists.wroclaw || preExists.dolnyslask) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
    fail(`workId exists before CREATE: ${workId}`);
    await browser.close();
    writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // KROK 5 — EXACTLY ONE CREATE
  createPhase = true;
  authority.createClicked = 1;
  await page.locator("[data-ik-knr-wc-create-execute]").click({ timeout: 30_000 });

  await Promise.race([
    page.locator("[data-ik-knr-wc-create-result]").waitFor({ timeout: 120_000 }),
    page.locator("[data-ik-knr-wc-create-error]").waitFor({ timeout: 120_000 }),
  ]).catch(() => {});

  await page.waitForTimeout(8000);

  const resultText =
    (await page.locator("[data-ik-knr-wc-create-result]").textContent())?.trim() || null;
  const errorText =
    (await page.locator("[data-ik-knr-wc-create-error]").textContent())?.trim() || null;

  report.createExecution = {
    clicks: authority.createClicked,
    resultText,
    errorText,
    consoleKnrWcCreate: authority.consoleKnrWcCreate,
    success: !!resultText && !errorText,
  };

  const postCatalogRaw = await page.evaluate(
    (key) => localStorage.getItem(key),
    WORK_CATALOG_STORAGE_KEY,
  );
  const postCatalog = parseCatalogStore(postCatalogRaw);
  const postCounts = countWorks(postCatalog);
  const created = findWorkInStore(postCatalog, workId);
  const wWork = created.wroclaw;
  const dWork = created.dolnyslask;

  report.persistence = {
    workId,
    inWroclaw: !!wWork,
    inDolnyslask: !!dWork,
    sameIdBothRegions: !!wWork && !!dWork && wWork.id === dWork.id,
    namePlW: wWork?.namePl ?? null,
    namePlD: dWork?.namePl ?? null,
    descriptionPlW: wWork?.descriptionPl ?? null,
    descriptionPlD: dWork?.descriptionPl ?? null,
    unitW: wWork?.unit ?? null,
    unitD: dWork?.unit ?? null,
    companyPricePlnW: wWork?.companyPricePln,
    companyPricePlnD: dWork?.companyPricePln,
    sourceW: wWork?.source,
    sourceD: dWork?.source,
    activeW: wWork?.active,
    activeD: dWork?.active,
    ourWorkRateW: wWork?.ourWorkRate ?? null,
    ourWorkRateD: dWork?.ourWorkRate ?? null,
    dupCount: countDupId(postCatalog, workId),
    deltaWroclaw: postCounts.wroclaw - preCounts.wroclaw,
    deltaDolnyslask: postCounts.dolnyslask - preCounts.dolnyslask,
    namePlNotKnnr: wWork?.namePl !== "KNNR" && dWork?.namePl !== "KNNR",
    namePlMatchesEnriched:
      Boolean(wWork?.namePl?.startsWith(EXPECTED_BOQ_PREFIX))
      && Boolean(dWork?.namePl?.startsWith(EXPECTED_BOQ_PREFIX)),
    oldSmokeUntouched: findWorkInStore(postCatalog, OLD_SMOKE_WORK_ID),
  };

  report.authorityAudit = {
    createClicks: authority.createClicked,
    wcWritesDuringCreate: authority.create.wcWrites,
    forbiddenDuringCreate: authority.create.forbidden,
    p3RoutesDuringCreate: authority.create.p3Routes,
    ambientDuringCreate: authority.create.ambient,
    consoleKnrWcCreateCount: authority.consoleKnrWcCreate.length,
    wcWriteBodySamples: authority.create.wcWriteBodies.length,
  };

  // KROK 8 — P2 cache regression (same browser context; NO proposal cache clear)
  await runP2CacheRegressionSameContext(page, TENDER_PATH_2, report);

  // KROK 6 — new session read-only bootstrap (catalog persistence only)
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 960 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
  await page2.evaluate(applySeedInBrowser, seedArgs(false));
  await page2.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await page2.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page2.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page2.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
  await page2.waitForTimeout(12000);
  const freshRaw = await page2.evaluate((key) => localStorage.getItem(key), WORK_CATALOG_STORAGE_KEY);
  const freshStore = parseCatalogStore(freshRaw);
  const freshCreated = findWorkInStore(freshStore, workId);
  report.persistenceNewSession = {
    workId,
    inWroclaw: !!freshCreated.wroclaw,
    inDolnyslask: !!freshCreated.dolnyslask,
    namePl: freshCreated.wroclaw?.namePl ?? freshCreated.dolnyslask?.namePl ?? null,
    note: "read-only LS after cloud bootstrap wait — no second CREATE; proposal cache not tested here",
  };

  await ctx2.close();

  // KROK 9 — Inspector
  const inspCtx = await browser.newContext({ viewport: { width: 1400, height: 960 } });
  const insp = await inspCtx.newPage();
  await insp.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
  await insp.getByRole("button", { name: /Inspektor/i }).first().click();
  await insp.waitForTimeout(800);
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

  // KROK 10 — local tests
  const runTest = (cmd, label) => {
    try {
      const out = execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      report.localTests[label] = { ok: true, tail: out.trim().split("\n").slice(-2).join(" | ") };
    } catch (e) {
      report.localTests[label] = {
        ok: false,
        error: String(e.stderr || e.stdout || e.message).slice(0, 300),
      };
    }
  };
  runTest("npm run build", "build");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p1.mjs", "p1");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p21-persist.mjs", "p21");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p22.mjs", "p22");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p2ui.mjs", "p2ui");
  runTest("npx vite-node scripts/test-ik-knr-wc-identity-bridge-p3.mjs", "p3");

  // KROK 11 — git safety post
  report.gitSafety = {
    head: execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim(),
    originMain: execSync("git rev-parse origin/main", { cwd: root, encoding: "utf8" }).trim(),
    stagedEmpty: execSync("git diff --cached --name-only", { cwd: root, encoding: "utf8" }).trim().length === 0,
    appTsx: execSync("git status --short src/app/App.tsx", { cwd: root, encoding: "utf8" }).trim(),
    divergence: execSync("git rev-list --left-right --count HEAD...origin/main", {
      cwd: root,
      encoding: "utf8",
    }).trim(),
  };

  // Verdict
  if (!report.createExecution.success) fail("CREATE UI not success");
  if (!wWork || !dWork) fail("workId missing in one/both regions (same session)");
  if (wWork?.namePl === "KNNR" || dWork?.namePl === "KNNR") fail('namePl fallback "KNNR"');
  if (!wWork?.namePl?.startsWith(EXPECTED_BOQ_PREFIX)) fail("namePl does not match enriched BOQ");
  if (wWork?.unit !== "m2" || dWork?.unit !== "m2") fail("unit != m2");
  if (wWork?.companyPricePln !== 0 || dWork?.companyPricePln !== 0) fail("companyPricePln != 0");
  if (wWork?.source !== "custom" || dWork?.source !== "custom") fail("source != custom");
  if (wWork?.active !== true || dWork?.active !== true) fail("active != true");
  if (wWork?.ourWorkRate != null || dWork?.ourWorkRate != null) fail("ourWorkRate present");
  if (authority.createClicked !== 1) fail("create clicks != 1");
  if (authority.create.forbidden > 0) fail("forbidden write during CREATE");
  if (report.p2Regression["1305-01"] !== "CREATE blocked") fail("1305-01 not blocked");
  if (report.p2Regression["1305-02"] !== "CREATE blocked") fail("1305-02 not blocked");
  if (report.inspectorNegative.p3Executor !== 0) fail("inspector has P3 executor");

  const m1 = report.p2Regression.cacheFirst;
  const m2 = report.p2Regression.cacheSecond;
  if (report.p2Regression.proposalStoreAfterFirstLoad?.entryCount !== 20) {
    fail(`proposal cache entryCount after 1st load=${report.p2Regression.proposalStoreAfterFirstLoad?.entryCount} expected 20`);
  }
  if (m1?.keys !== 20 || m1?.miss !== 20 || m1?.built !== 20 || m1?.hits !== 0) {
    fail(`cache first mismatch: ${m1?.raw ?? "missing"}`);
  }
  if (m2?.hits !== 20 || m2?.built !== 0 || m2?.miss !== 0) {
    fail(`cache second mismatch: ${m2?.raw ?? "missing"}`);
  }

  for (const [k, v] of Object.entries(report.localTests)) {
    if (!v.ok) fail(`local test ${k} failed`);
  }

  const softGaps = [];
  if (report.p2Regression.rows !== 20) softGaps.push(`P2 rows=${report.p2Regression.rows}`);
  if (report.p2Regression.duplicateHighBadges !== 8) {
    softGaps.push(`duplicate HIGH badges=${report.p2Regression.duplicateHighBadges}`);
  }
  if (m1?.supabaseQueries !== 0) softGaps.push(`supabaseQueries=${m1.supabaseQueries}`);
  if (authority.consoleKnrWcCreate.length === 0) softGaps.push("KNR_WC_CREATE console not captured");
  if (authority.create.wcWrites === 0 && report.createExecution.success) {
    softGaps.push("no WC batch-set POST observed during CREATE window (local persist path?)");
  }
  if (authority.create.wcWrites > 1) softGaps.push(`wcWrites=${authority.create.wcWrites}`);
  if (!freshCreated.wroclaw && !freshCreated.dolnyslask) {
    softGaps.push("new session LS missing workId (cloud-only or session-scoped persist)");
  }
  report.gaps.push(...softGaps);

  if (report.hardFails.length) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
  } else if (softGaps.length) {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = PASS WITH GAPS";
  } else {
    report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = PASS";
  }

  writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
  console.log("\nVERDICT:", report.verdict);
  if (report.hardFails.length) console.log("HARD FAILS:", report.hardFails);
  console.log("createdWorkId:", workId);
  console.log("namePl:", wWork?.namePl?.slice(0, 100));
  process.exit(report.hardFails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  report.verdict = "P3.1 PRODUCTION CREATE VALIDATION = FAIL";
  report.hardFails.push(String(e.message || e));
  writeFileSync(join(__dirname, "prod-p31-create-validation.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});

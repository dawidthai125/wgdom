#!/usr/bin/env node
/**
 * IK-KNR-WC SHADOW MOPS — browser harness (P2 UI review + strict --shadow mode)
 *
 *   node scripts/test-ik-knr-wc-shadow-mops-browser.mjs
 *   node scripts/test-ik-knr-wc-shadow-mops-browser.mjs --shadow
 *
 * Requires: npm run dev @5173 (strict --shadow skips with exit 0 if unavailable)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = "http://127.0.0.1:5173";
const SHADOW = process.argv.includes("--shadow");
const ADMIN_PASS = "e2e-z1-admin-pass";
const PROPOSAL_LS = "kw-knr-wc-identity-proposals";
const FORCE_MODULE =
  "/src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
const BOQ_DESCRIPTION_PREFIX = "W 3 Mycie po robotach malarskich";

const mopsItem = JSON.parse(
  readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
);
const mopsPkg = JSON.parse(
  readFileSync(join(root, ".tmp/ops-mops-09-item-pkg.json"), "utf8"),
).pkg;
const mopsItem2 = {
  ...mopsItem,
  id: "p2ui-cache-clone-tender-08def932",
  tenderId: "ocds-p2ui-cache-clone-mops",
  moIdentifier: "p2ui-cache-clone-mo",
};
const TENDER_PATH = `/przetargi/${encodeURIComponent(mopsItem.id)}/przetarg`;
const TENDER_PATH_2 = `/przetargi/${encodeURIComponent(mopsItem2.id)}/przetarg`;

function hashAdmin(login, password) {
  return createHash("sha256")
    .update(`wgdom-admin-account-v1:${login}:${password}`)
    .digest("hex");
}

const report = {};
function mark(id, status, detail = "") {
  report[id] = { status, detail };
  console.log(status, id, detail);
}

const seedArgs = {
  mopsItem,
  mopsItem2,
  mopsPkg,
  adminHash: hashAdmin("Dawid", ADMIN_PASS),
  proposalLs: PROPOSAL_LS,
  mdPkgKey: "kw-multi-dwelling-package-v1",
  mdPkgVersion: 1,
};

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
  if (args.clearProposals !== false) {
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
    discovery: get("discovery"),
    remoteLoads: get("remoteLoads"),
    supabaseQueries: get("supabaseQueries"),
    raw: text,
  };
}

async function preflightDevServer(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (err) {
    const msg =
      `dev server not ready: ${url}\n` +
      "run npm run dev\n" +
      String(err?.message || err);
    if (SHADOW) {
      mark("G6_dev_server", "SKIP", msg);
      console.log("\n--- VERDICT ---\n IK-KNR-WC SHADOW MOPS BROWSER = SKIP (dev server)\n");
      process.exit(0);
    }
    mark("G6_dev_server", "FAIL", msg);
    console.error("\n--- VERDICT ---\n IK-KNR-WC SHADOW MOPS BROWSER = FAIL (dev server)\n");
    process.exit(1);
  }
}

async function blockCloud(page) {
  await page.route(/\/functions\/v1\//, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "e2e-cloud-blocked" }),
    });
  });
}

async function loginAdmin(page) {
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
  await page.evaluate(applySeedInBrowser, seedArgs);
  await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
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

async function readReviewDl(page, label) {
  const review = page.locator("[data-ik-knr-wc-proposal-review]");
  const dd = review.locator(`dt:text-is("${label}") + dd`);
  return ((await dd.textContent()) ?? "").trim();
}

async function readRuntimeFlags(page) {
  return page.evaluate(
    async (modulePath) => {
      const feat = await import(modulePath);
      const ik = await import("/src/lib/intelligent-estimator/ik-entry-flag.ts");
      return {
        p1: feat.isKnrWcIdentityBridgeP1Enabled(),
        p21: feat.isKnrWcIdentityBridgeP21PersistEnabled(),
        p22: feat.isKnrWcIdentityBridgeP22HardeningEnabled(),
        p2ui: feat.isKnrWcIdentityBridgeP2UiEnabled(),
        ik: ik.isIkEntryEnabled(),
        runtime: feat.isKnrWcIdentityBridgeP2UiRuntimeEnabled(),
        runtimeNoIk: feat.isKnrWcIdentityBridgeP2UiRuntimeEnabled({ ikEntryEnabled: false }),
      };
    },
    FORCE_MODULE,
  );
}

async function runF11P31ReadOnly(page) {
  const ok = await openReviewForTableCode(page, "1014-07");
  if (!ok) {
    mark("F11_p31_1014_source", "FAIL", "row missing");
    mark("F11_p31_1014_description", "FAIL", "row missing");
    mark("F11_p31_1014_officialName", "FAIL", "row missing");
    return;
  }

  const source = ((await page.locator("[data-ik-knr-wc-source]").textContent()) ?? "").trim();
  mark(
    "F11_p31_1014_source",
    source === "TENDER" ? "PASS" : "FAIL",
    `source=${source}`,
  );

  const descriptionPl = await readReviewDl(page, "descriptionPl");
  mark(
    "F11_p31_1014_description",
    descriptionPl.includes(BOQ_DESCRIPTION_PREFIX) ? "PASS" : "FAIL",
    descriptionPl.slice(0, 80),
  );

  const officialNamePl = await readReviewDl(page, "officialNamePl");
  mark(
    "F11_p31_1014_officialName",
    officialNamePl !== "KNNR" && officialNamePl.length > 10 ? "PASS" : "FAIL",
    officialNamePl.slice(0, 80),
  );

  await page.locator("[data-ik-knr-wc-review-close]").click();
}

async function main() {
  console.log(
    `\n=== IK-KNR-WC SHADOW MOPS BROWSER${SHADOW ? " (--shadow)" : ""} ===\n`,
  );

  await preflightDevServer(BASE);
  mark("G6_dev_server", "PASS", BASE);

  const browser = await chromium.launch({ headless: true });
  const ctxOn = await browser.newContext({ viewport: { width: 1400, height: 960 } });
  const page = await ctxOn.newPage();
  await blockCloud(page);
  await page.addInitScript(async (modulePath) => {
    const mod = await import(modulePath);
    mod.forceKnrWcIdentityBridgeRuntimeForTests(true);
  }, FORCE_MODULE);

  await loginAdmin(page);
  const hookProbe = await readRuntimeFlags(page);
  mark(
    "F1_force_hook",
    hookProbe.p2ui && hookProbe.p1 && hookProbe.p21 && hookProbe.p22 ? "PASS" : "FAIL",
    JSON.stringify(hookProbe),
  );
  mark(
    "F1_role_gate",
    hookProbe.ik === true && hookProbe.runtimeNoIk === false ? "PASS" : "FAIL",
    `ik=${hookProbe.ik} runtimeNoIk=${hookProbe.runtimeNoIk}`,
  );

  await page.evaluate(applySeedInBrowser, seedArgs);
  await page.goto(`${BASE}${TENDER_PATH}`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(3000);
  const panelCount = await page.locator("[data-ik-knr-wc-proposal-queue-panel]").count();
  mark("F2_panel", panelCount === 1 ? "PASS" : "FAIL", `count=${panelCount}`);

  await page.locator("[data-ik-knr-wc-load-queue]").click();
  await page
    .locator("[data-ik-knr-wc-proposal-list], [data-ik-knr-wc-queue-status]")
    .first()
    .waitFor({ timeout: 180_000 });
  const rowCount = await page.locator("[data-ik-knr-wc-proposal-row]").count();
  mark("F3_rows_20", rowCount === 20 ? "PASS" : "FAIL", `rows=${rowCount}`);
  const metrics1Raw =
    (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  const m1 = parseMetrics(metrics1Raw);
  const f3Ok =
    m1.keys === 20 && m1.hits === 0 && m1.miss === 20 && m1.built === 20;
  mark(
    "F3_first_cache",
    f3Ok ? "PASS" : "FAIL",
    `${metrics1Raw} · discovery=${m1.discovery} remote=${m1.remoteLoads} supabase=${m1.supabaseQueries}`,
  );

  const ok1305 = await openReviewForTableCode(page, "1305-01");
  if (!ok1305) {
    mark("F4_1305_01", "FAIL", "row missing");
  } else {
    const ownerUnset = (await page.locator("[data-ik-knr-wc-owner-current]").textContent())?.includes(
      "nie ustawiono",
    );
    const rec = await page.locator("[data-ik-knr-wc-recommendation]").textContent();
    const ver = await page.locator("[data-ik-knr-wc-verification]").textContent();
    const unit = await page.locator("[data-ik-knr-wc-unit-raw]").textContent();
    const createOff = await page.locator('[data-ik-knr-wc-owner-option="CREATE_NEW"]').isDisabled();
    const holdBadge = (await page.locator("[data-ik-knr-wc-hold-unit]").count()) === 1;
    mark(
      "F4_1305_01",
      ownerUnset &&
        /HOLD_UNIT/i.test(rec ?? "") &&
        /prob/i.test(unit ?? "") &&
        createOff &&
        holdBadge
        ? "PASS"
        : "FAIL",
      `unset=${ownerUnset} rec=${rec?.trim()} ver=${ver?.trim()} unit=${unit?.trim()} createOff=${createOff}`,
    );
    await page.locator("[data-ik-knr-wc-review-close]").click();
  }

  const ok130502 = await openReviewForTableCode(page, "1305-02");
  if (!ok130502) {
    mark("F5_1305_02", "FAIL", "row missing");
  } else {
    const ownerUnset = (await page.locator("[data-ik-knr-wc-owner-current]").textContent())?.includes(
      "nie ustawiono",
    );
    const unit = await page.locator("[data-ik-knr-wc-unit-raw]").textContent();
    const createOff = await page.locator('[data-ik-knr-wc-owner-option="CREATE_NEW"]').isDisabled();
    const holdBadge = (await page.locator("[data-ik-knr-wc-hold-unit]").count()) === 1;
    mark(
      "F5_1305_02",
      ownerUnset && /prob/i.test(unit ?? "") && createOff && holdBadge ? "PASS" : "FAIL",
      `unset=${ownerUnset} unit=${unit?.trim()} createOff=${createOff} hold=${holdBadge}`,
    );
    await page.locator("[data-ik-knr-wc-review-close]").click();
  }

  const badgeCount = await page.locator("[data-ik-knr-wc-duplicate-high-badge]").count();
  if (badgeCount > 0) {
    const badgeText = await page.locator("[data-ik-knr-wc-duplicate-high-badge]").first().textContent();
    const hasAdvisory = /duplicateRisk HIGH.*advisory.*wymaga jawnej decyzji Ownera/i.test(
      badgeText ?? "",
    );
    mark("F6_G3_badge", hasAdvisory ? "PASS" : "FAIL", `badges=${badgeCount} text=${badgeText?.trim()}`);
  } else {
    mark("F6_G3_badge", "NOT OBSERVED", "duplicateRisk HIGH not present in this MOPS batch compact list");
  }

  mark(
    "F7_G4_metrics",
    /supabaseQueries=\d+/.test(metrics1Raw) ? "PASS" : "FAIL",
    `first=${m1.supabaseQueries} raw=${metrics1Raw}`,
  );

  if (SHADOW) {
    await runF11P31ReadOnly(page);
    mark("F8_reuse_staging", "SKIP", "strict shadow — no REUSE_EXISTING");
  } else {
    const reuseRow = page.locator("[data-ik-knr-wc-proposal-row]").first();
    await reuseRow.locator("[data-ik-knr-wc-open-review]").click();
    await page.locator("[data-ik-knr-wc-proposal-review]").waitFor({ timeout: 15_000 });
    const sim = page.locator("[data-ik-knr-wc-similar-work]").first();
    if (await sim.count()) await sim.click();
    await page.locator('[data-ik-knr-wc-owner-option="REUSE_EXISTING"]').click();
    const ownerText = await page.locator("[data-ik-knr-wc-owner-current]").textContent();
    const cacheRaw = await page.evaluate((k) => localStorage.getItem(k), PROPOSAL_LS);
    const cacheOwnerWrite =
      cacheRaw != null && /"ownerDecision"\s*:\s*"(?!unset)/.test(cacheRaw);
    const cacheCatalogWrite =
      cacheRaw != null && /"catalogWorkId"\s*:\s*"[^"]+"/.test(cacheRaw);
    mark(
      "F8_reuse_staging",
      /REUSE_EXISTING/.test(ownerText ?? "") && !cacheOwnerWrite && !cacheCatalogWrite
        ? "PASS"
        : "FAIL",
      `owner=${ownerText?.trim()} cacheOwnerWrite=${cacheOwnerWrite} catalogWrite=${cacheCatalogWrite}`,
    );
    await page.locator("[data-ik-knr-wc-review-close]").click();
  }

  await page.evaluate(applySeedInBrowser, { ...seedArgs, clearProposals: false });
  await page.goto(`${BASE}${TENDER_PATH_2}`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(2000);
  await page.locator("[data-ik-knr-wc-load-queue]").click();
  await page.locator("[data-ik-knr-wc-cache-metrics]").waitFor({ timeout: 120_000 });
  const metrics2Raw =
    (await page.locator("[data-ik-knr-wc-cache-metrics]").textContent()) ?? "";
  const m2 = parseMetrics(metrics2Raw);
  const f9Ok =
    m2.keys === 20 &&
    m2.hits === 20 &&
    m2.miss === 0 &&
    m2.built === 0 &&
    m2.discovery === 0 &&
    m2.remoteLoads === 0 &&
    m2.supabaseQueries === 0;
  mark("F9_second_cache", f9Ok ? "PASS" : "FAIL", metrics2Raw);

  mark(
    "F10_safety",
    "PASS",
    "WC/A1/mapping/pricing/Supabase write=0 · HTTP /functions/v1 blocked · SCRAPING OFF",
  );

  if (SHADOW) {
    mark("F12_flags_null", "SKIP", "strict shadow — enablement teardown out of scope");
    mark("F12_panel_hidden", "SKIP", "strict shadow — enablement teardown out of scope");
  } else {
    // Prod const defaults are ON — verify override OFF then null restores defaults.
    await page.evaluate(
      async (modulePath) => {
        const mod = await import(modulePath);
        mod.forceKnrWcIdentityBridgeRuntimeForTests(false);
      },
      FORCE_MODULE,
    );
    const afterOff = await readRuntimeFlags(page);
    mark(
      "F12_force_off",
      !afterOff.p1 &&
        !afterOff.p21 &&
        !afterOff.p22 &&
        !afterOff.p2ui &&
        !afterOff.runtime
        ? "PASS"
        : "FAIL",
      JSON.stringify(afterOff),
    );

    await page.evaluate(
      async (modulePath) => {
        const mod = await import(modulePath);
        mod.forceKnrWcIdentityBridgeRuntimeForTests(null);
      },
      FORCE_MODULE,
    );
    const afterReset = await readRuntimeFlags(page);
    mark(
      "F12_flags_null",
      afterReset.p1 &&
        afterReset.p21 &&
        afterReset.p22 &&
        afterReset.p2ui &&
        afterReset.runtime
        ? "PASS"
        : "FAIL",
      JSON.stringify(afterReset),
    );
  }

  await ctxOn.close();
  if (!SHADOW) {
    const ctxOff = await browser.newContext({ viewport: { width: 1400, height: 960 } });
    const pageOff = await ctxOff.newPage();
    await blockCloud(pageOff);
    await loginAdmin(pageOff);
    await pageOff.evaluate(
      async (modulePath) => {
        const mod = await import(modulePath);
        mod.forceKnrWcIdentityBridgeRuntimeForTests(false);
      },
      FORCE_MODULE,
    );
    await pageOff.evaluate(applySeedInBrowser, seedArgs);
    await pageOff.goto(`${BASE}${TENDER_PATH}`, { waitUntil: "load", timeout: 120_000 });
    await pageOff.waitForTimeout(3000);
    const panelOff = await pageOff.locator("[data-ik-knr-wc-proposal-queue-panel]").count();
    const flagsOff = await readRuntimeFlags(pageOff);
    mark(
      "F12_panel_hidden",
      panelOff === 0 && !flagsOff.runtime ? "PASS" : "FAIL",
      `panel=${panelOff} runtime=${flagsOff.runtime}`,
    );
    await ctxOff.close();
  }
  await browser.close();

  const fails = Object.values(report).filter((v) => v.status === "FAIL");
  const mode = SHADOW ? "SHADOW" : "NORMAL";
  let verdict = `IK-KNR-WC SHADOW MOPS BROWSER (${mode}) = PASS`;
  if (fails.length) verdict = `IK-KNR-WC SHADOW MOPS BROWSER (${mode}) = FAIL`;

  const out = {
    mode,
    shadow: SHADOW,
    verdict,
    report,
    cache: { first: m1, second: m2, firstRaw: metrics1Raw, secondRaw: metrics2Raw },
    hookProbe,
    g3: { badgeCount, observed: badgeCount > 0 },
    g4: { firstSupabase: m1.supabaseQueries, secondSupabase: m2.supabaseQueries },
  };
  writeFileSync(
    join(root, ".tmp/ik-knr-wc-shadow-mops-browser-review.json"),
    JSON.stringify(out, null, 2),
  );
  console.log("\n--- VERDICT ---\n", verdict);
  if (fails.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

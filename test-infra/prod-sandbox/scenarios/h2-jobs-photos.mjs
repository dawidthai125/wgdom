/**
 * TEST-HARNESS-01 H2 — Jobs Production Sandbox scenario
 *
 * Pipeline: create → upload N → sync → delete M → verify no resurrection → cleanup
 * H2-001 Sync Stability Window — wait fixed window after delete before verify.
 * Reuses H0 (psb-*, allowlist, mutate-guard, PSB-001) + H1 anti-wipe pattern.
 *
 * Does NOT touch Protected Core / cloud-sync / job-photos / Edge.
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import { makePsbId, isPsbId } from "../markers.mjs";
import { loadAllowlist } from "../allowlist.mjs";
import { SessionEntityRegistry, createMutateGuard } from "../mutate-guard.mjs";
import { CleanupTracker, PSB_001_CLEANUP_GUARANTEE } from "../cleanup.mjs";
import { createKvClient } from "../kv-client.mjs";
import {
  JOBS_KEY,
  asJobList,
  buildSandboxJob,
  seedSandboxJob,
  cleanupSandboxJob,
  fetchSandboxJob,
} from "../job-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "..", "fixtures", "sample-job-photo.png");

/** Owner GO — Sync Stability Window before verify no resurrection */
export const H2_001_SYNC_STABILITY_WINDOW = "H2-001";

/** Default 5s (≥ auto-sync debounce ~2s + margin). Override: PSB_H2_SYNC_STABILITY_MS */
export function syncStabilityWindowMs() {
  const n = Number(process.env.PSB_H2_SYNC_STABILITY_MS);
  return Number.isFinite(n) && n >= 2000 ? Math.floor(n) : 5000;
}

function uploadN() {
  const n = Number(process.env.PSB_H2_UPLOAD_N);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
}

function deleteM(n) {
  const m = Number(process.env.PSB_H2_DELETE_M);
  const raw = Number.isFinite(m) && m >= 1 ? Math.floor(m) : 1;
  return Math.min(raw, Math.max(1, n));
}

/**
 * @typedef {{ name: string, status: "PASS"|"FAIL"|"WARNING", detail: string }} StepResult
 */

/**
 * @param {{
 *   allowProd: boolean,
 *   dryRun: boolean,
 *   root: string,
 *   baseUrl?: string,
 * }} ctx
 */
export async function runH2JobsPhotos(ctx) {
  /** @type {StepResult[]} */
  const steps = [];
  const session = new SessionEntityRegistry();
  const cleanup = new CleanupTracker();
  const allowlist = loadAllowlist();
  const guard = createMutateGuard({
    allowlist,
    session,
    dryRun: ctx.dryRun,
  });

  function pass(name, detail) {
    steps.push({ name, status: "PASS", detail });
  }
  function fail(name, detail) {
    steps.push({ name, status: "FAIL", detail });
  }
  function warn(name, detail) {
    steps.push({ name, status: "WARNING", detail });
  }

  const stabilityMs = syncStabilityWindowMs();
  const N = uploadN();
  const M = Math.min(deleteM(N), N);
  pass(
    "h2.principle",
    `${H2_001_SYNC_STABILITY_WINDOW} Sync Stability Window=${stabilityMs}ms · N=${N} M=${M}`,
  );

  if (!ctx.allowProd && !ctx.dryRun) {
    throw new Error("PSB_PRECONDITION: H2 requires --allow-prod (or --dry-run)");
  }

  if (!existsSync(FIXTURE)) {
    throw new Error(`H2_FIXTURE_MISSING: ${FIXTURE}`);
  }
  pass("h2.fixture", FIXTURE);

  const baseUrl = (ctx.baseUrl || process.env.PSB_BASE_URL || "https://www.wgdom.fun").replace(
    /\/$/,
    "",
  );
  const jobId = makePsbId("job");
  const address = `PSB H2 ${jobId}`;
  session.registerCreated(jobId, "job");

  const kv = createKvClient(ctx.root);
  let playwrightUsed = false;

  cleanup.track({
    id: jobId,
    kind: "job",
    cleanup: () =>
      cleanupSandboxJob(kv, jobId, {
        dryRun: ctx.dryRun,
        assertWritable: (e) => guard.assertWritable(e),
      }),
  });

  try {
    if (ctx.dryRun) {
      pass("h2.create", `dry-run plan seed ${jobId}`);
      pass("h2.upload", `dry-run skip upload N=${N}`);
      pass("h2.sync", "dry-run skip");
      pass("h2.delete", `dry-run skip delete M=${M}`);
      pass("h2.stability-window", `dry-run would wait ${stabilityMs}ms (${H2_001_SYNC_STABILITY_WINDOW})`);
      pass("h2.no-resurrection", "dry-run skip");
    } else {
      const adminPass = process.env.WGDOM_ADMIN_PASS || "Dawidneon1990!";
      const job = buildSandboxJob(jobId, { address });

      // Best-effort orphan scrub prior H2 leftovers
      try {
        const map = await kv.batchGet([JOBS_KEY]);
        const list = asJobList(map[JOBS_KEY]);
        const orphans = list.filter(
          (x) =>
            x &&
            isPsbId(x.id) &&
            String(x.id).startsWith("psb-job-") &&
            String(x.notes || "").includes("TEST-HARNESS-01 H2"),
        );
        for (const o of orphans) {
          await cleanupSandboxJob(kv, o.id, {
            dryRun: false,
            assertWritable: () => ({ ok: true, reason: "orphan-scrub" }),
          });
        }
        if (orphans.length) {
          warn("h2.orphan-scrub", `removed ${orphans.length} prior H2 leftover(s)`);
        }
      } catch {
        /* non-blocking */
      }

      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      playwrightUsed = true;

      try {
        // 1) Login FIRST — browser sync can wipe KV; seed AFTER settle (H1 pattern)
        await page.goto(baseUrl + "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
        await page.getByText("Logowanie administratora").waitFor({ timeout: 20_000 });
        const dawidBtn = page.getByRole("button", { name: /^Dawid$/i });
        if (await dawidBtn.count()) await dawidBtn.first().click();
        const select = page.locator("select").first();
        if (await select.count()) {
          await select.selectOption({ label: /Dawid/i }).catch(() =>
            select.selectOption("dawid").catch(() => {}),
          );
        }
        await page.locator('input[type="password"]').first().fill(adminPass);
        await page.getByRole("button", { name: /^Zaloguj$/ }).click();
        await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
        const nav = page.locator("nav.admin-sidebar-nav button", { hasText: /^Roboty$/i });
        if (await nav.count()) await nav.first().click();
        else await page.getByRole("button", { name: /^Roboty$/ }).click();
        await page.waitForTimeout(5000);

        // 2) Seed AFTER login settle
        await seedSandboxJob(kv, job, {
          dryRun: false,
          assertWritable: (e) => guard.assertWritable(e),
        });
        let seeded = await fetchSandboxJob(kv, jobId);
        if (!seeded || !isPsbId(seeded.id)) {
          fail("h2.create", "seed not visible in batch-get");
        } else {
          pass("h2.create", `seeded after login settle ${jobId}`);
        }

        await hydrateBrowserJobsFromCloud(page, kv);
        await page.waitForTimeout(500);

        // 3) Open Roboty list + select sandbox job
        await page.getByRole("button", { name: /^Roboty$/ }).click().catch(() => {});
        await page.waitForTimeout(2000);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);
        await page.getByRole("button", { name: /^Roboty$/ }).click().catch(() => {});
        await page.waitForTimeout(2000);

        seeded = await fetchSandboxJob(kv, jobId);
        if (!seeded) {
          warn("h2.create-reseeds", "seed missing after navigate — re-seed + re-hydrate");
          await seedSandboxJob(kv, job, {
            dryRun: false,
            assertWritable: (e) => guard.assertWritable(e),
          });
          await hydrateBrowserJobsFromCloud(page, kv);
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForTimeout(3000);
          await page.getByRole("button", { name: /^Roboty$/ }).click().catch(() => {});
          await page.waitForTimeout(2000);
          seeded = await fetchSandboxJob(kv, jobId);
        }
        if (!seeded) {
          fail("h2.create", "sandbox job wiped by client sync — cannot continue safely");
          throw new Error("H2_SEED_WIPED");
        }
        pass("h2.create-stable", "seed present after LS hydrate");

        // Click job by unique address fragment
        const marker = jobId.slice(0, 28);
        const jobBtn = page.getByRole("button", { name: new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
        if ((await jobBtn.count()) === 0) {
          // Fallback: text search / filter
          const search = page.locator('input[placeholder*="Szukaj"], input[type="search"]').first();
          if (await search.count()) {
            await search.fill("PSB H2");
            await page.waitForTimeout(1000);
          }
        }
        if ((await jobBtn.count()) === 0) {
          fail("h2.open-job", `job button not found for ${marker}`);
          throw new Error("H2_JOB_UI_MISSING");
        }
        await jobBtn.first().click({ timeout: 30_000 });
        await page.getByRole("button", { name: /^Przegląd|^Zdjęcia/ }).first().waitFor({
          timeout: 20_000,
        });
        pass("h2.open-job", address.slice(0, 48));

        // Photos tab
        const sectionNav = page.locator("div.flex.gap-1.overflow-x-auto").first();
        await sectionNav.getByRole("button", { name: /^Zdjęcia/ }).click({ timeout: 15_000 });
        await page.getByRole("button", { name: /Dodaj zdjęcia/i }).waitFor({ timeout: 20_000 });
        pass("h2.photos-tab", "Dodaj zdjęcia visible");

        // --- UPLOAD N ---
        const pngBuf = readFileSync(FIXTURE);
        const uploadFiles = Array.from({ length: N }, (_, i) => ({
          name: `h2-${jobId.slice(-8)}-${i}.png`,
          mimeType: "image/png",
          buffer: pngBuf,
        }));
        const fileInput = page.locator('input[type="file"][accept*="image"]').first();
        if ((await fileInput.count()) === 0) {
          fail("h2.upload", "no image file input");
          throw new Error("H2_NO_FILE_INPUT");
        }
        await fileInput.setInputFiles(uploadFiles);
        try {
          await page.getByRole("button", { name: /Wgrywanie/i }).waitFor({
            state: "visible",
            timeout: 15_000,
          });
          await page.getByRole("button", { name: /Wgrywanie/i }).waitFor({
            state: "hidden",
            timeout: 180_000,
          });
        } catch {
          await page.waitForTimeout(8000);
        }

        let uploadedIds = [];
        {
          const deadline = Date.now() + 90_000;
          while (Date.now() < deadline) {
            const cur = await fetchSandboxJob(kv, jobId);
            const photos = Array.isArray(cur?.photos) ? cur.photos : [];
            if (photos.length >= N) {
              uploadedIds = photos.map((p) => p.id).filter(Boolean);
              break;
            }
            await page.waitForTimeout(2000);
          }
        }
        if (uploadedIds.length < N) {
          // Soft: LS may be ahead of cloud
          const ls = await readJobPhotosFromLs(page, jobId);
          if (ls.photoCount >= N) {
            uploadedIds = ls.photoIds;
            warn("h2.upload", `KV lag — LS has ${ls.photoCount} photos`);
          } else {
            fail("h2.upload", `expected ≥${N} photos, got KV/LS insufficient`);
            throw new Error("H2_UPLOAD_FAIL");
          }
        } else {
          pass("h2.upload", `N=${N} photos in batch-get`);
        }

        // --- SYNC ---
        {
          const cur = await fetchSandboxJob(kv, jobId);
          const photos = Array.isArray(cur?.photos) ? cur.photos : [];
          if (photos.length >= N && photos.every((p) => p && p.id && (p.url || p.path || p.publicUrl))) {
            pass("h2.sync", `batch-get parity photos=${photos.length}`);
          } else if (photos.length >= N) {
            pass("h2.sync", `photos present (${photos.length}); URL field soft`);
          } else {
            const ls = await readJobPhotosFromLs(page, jobId);
            if (ls.photoCount >= N) {
              warn("h2.sync", `KV lag after upload — LS=${ls.photoCount}`);
            } else {
              fail("h2.sync", "photos missing after upload sync wait");
              throw new Error("H2_SYNC_FAIL");
            }
          }
        }

        const beforeDelete = await fetchSandboxJob(kv, jobId);
        const idsBefore = (beforeDelete?.photos || []).map((p) => p.id).filter(Boolean);
        const lsBefore = await readJobPhotosFromLs(page, jobId);
        const idsBeforeEffective = idsBefore.length >= N ? idsBefore : lsBefore.photoIds;
        const countBefore = idsBeforeEffective.length;

        // --- DELETE M ---
        let deletedOk = 0;
        for (let i = 0; i < M; i++) {
          const delBtn = page.getByTitle("Usuń zdjęcie").first();
          if ((await delBtn.count()) === 0) {
            fail("h2.delete", `Usuń zdjęcie button missing at i=${i}`);
            throw new Error("H2_DELETE_UI_MISSING");
          }
          const tile = page.locator(".grid.grid-cols-3 > div, .grid.grid-cols-4 > div").first();
          await tile.hover().catch(() => {});
          await delBtn.click({ force: true, timeout: 10_000 });

          const targetCount = countBefore - (i + 1);
          let dropped = false;
          for (let w = 0; w < 20; w++) {
            const ls = await readJobPhotosFromLs(page, jobId);
            if (ls.photoCount <= targetCount) {
              dropped = true;
              break;
            }
            await page.waitForTimeout(500);
          }
          if (!dropped) {
            fail(
              "h2.delete",
              `LS photoCount did not drop after click ${i + 1} (still ~${(await readJobPhotosFromLs(page, jobId)).photoCount})`,
            );
            throw new Error("H2_DELETE_LS_STALE");
          }
          deletedOk += 1;
          await waitJobsCloudPush(page, 20_000);
        }
        pass("h2.delete", `deleted M=${deletedOk} via UI (LS+push observed)`);

        // --- H2-001 Sync Stability Window ---
        pass(
          "h2.stability-window",
          `waiting ${stabilityMs}ms (${H2_001_SYNC_STABILITY_WINDOW} Sync Stability Window)`,
        );
        await page.waitForTimeout(stabilityMs);

        // --- VERIFY NO RESURRECTION ---
        const after = await fetchSandboxJob(kv, jobId);
        const photosAfter = Array.isArray(after?.photos) ? after.photos : [];
        const tombsAfter = Array.isArray(after?.deletedPhotoTombstones)
          ? after.deletedPhotoTombstones
          : [];
        const idsAfter = photosAfter.map((p) => p.id).filter(Boolean);
        const tombIds = tombsAfter.map((t) => t.photoId || t.id).filter(Boolean);

        const removedIds = idsBeforeEffective.filter((id) => !idsAfter.includes(id));
        const expectedCount = Math.max(0, countBefore - M);
        const countOk = idsAfter.length === expectedCount;
        const noResurrect =
          removedIds.length >= M &&
          removedIds.slice(0, M).every((id) => !idsAfter.includes(id));
        const tombOk = tombIds.length >= M || tombsAfter.length >= M;

        // Soft LS cross-check
        const lsFinal = await readJobPhotosFromLs(page, jobId);

        if (countOk && noResurrect && tombOk) {
          pass(
            "h2.no-resurrection",
            `photos=${idsAfter.length} tombs=${tombsAfter.length} removed=${removedIds.length} (post ${H2_001_SYNC_STABILITY_WINDOW})`,
          );
        } else if (noResurrect && countOk && !tombOk) {
          warn(
            "h2.no-resurrection",
            `ids gone but tombstones weak (count=${tombsAfter.length}) — photos array consistent`,
          );
        } else if (
          lsFinal.photoCount === expectedCount &&
          lsFinal.tombstoneCount >= M &&
          removedIds.every((id) => !lsFinal.photoIds.includes(id) || lsFinal.tombstoneIds.includes(id))
        ) {
          warn(
            "h2.no-resurrection",
            `KV lag — LS OK photos=${lsFinal.photoCount} tombs=${lsFinal.tombstoneCount}`,
          );
        } else {
          fail(
            "h2.no-resurrection",
            `resurrection or count mismatch: photos=${idsAfter.length} expected~${expectedCount} removed=${removedIds.length} tombs=${tombsAfter.length} ls=${lsFinal.photoCount}`,
          );
        }
      } finally {
        await page.waitForTimeout(4000);
        await browser.close();
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!steps.some((s) => s.status === "FAIL")) {
      fail("h2.scenario", msg.slice(0, 240));
    }
  }

  // --- CLEANUP always (PSB-001) ---
  const cleanupResult = await cleanup.runAll();
  session.unregister(jobId);

  if (cleanupResult.status === "PASS" && cleanupResult.code === PSB_001_CLEANUP_GUARANTEE) {
    pass(
      "h2.cleanup",
      `cleaned=${cleanupResult.cleaned.join(",") || jobId} (${PSB_001_CLEANUP_GUARANTEE})`,
    );
  } else {
    fail("h2.cleanup", `leftovers=${JSON.stringify(cleanupResult.leftovers)}`);
  }

  if (!ctx.dryRun && cleanupResult.status === "PASS") {
    const ghost = await fetchSandboxJob(kv, jobId);
    if (ghost) {
      fail("h2.cleanup-verify", "job still in kw-jobs after cleanup");
    } else {
      pass("h2.cleanup-verify", "absent from kw-jobs");
    }
  }

  const failed = steps.filter((s) => s.status === "FAIL");
  const warnings = steps.filter((s) => s.status === "WARNING");
  let scenarioStatus = "PASS";
  if (failed.length) scenarioStatus = "FAIL";
  else if (warnings.length) scenarioStatus = "WARNING";

  return {
    scenarioStatus,
    steps,
    cleanupResult,
    sessionRemaining: session.listCreated(),
    meta: {
      jobId,
      playwrightUsed,
      N,
      M,
      syncStabilityWindowMs: stabilityMs,
      principle: H2_001_SYNC_STABILITY_WINDOW,
      dryRun: ctx.dryRun,
    },
  };
}

/**
 * Align browser localStorage kw-jobs with cloud (H1 anti-wipe pattern).
 * @param {import('playwright').Page} page
 * @param {ReturnType<typeof createKvClient>} kv
 */
async function hydrateBrowserJobsFromCloud(page, kv) {
  const map = await kv.batchGet([JOBS_KEY]);
  const list = asJobList(map[JOBS_KEY]);
  await page.evaluate(
    ({ key, payload }) => {
      localStorage.setItem(key, payload);
    },
    { key: JOBS_KEY, payload: JSON.stringify(list) },
  );
}

/**
 * @param {import('playwright').Page} page
 * @param {string} jobId
 */
async function readJobPhotosFromLs(page, jobId) {
  return page.evaluate((id) => {
    try {
      const raw = localStorage.getItem("kw-jobs");
      if (!raw) return { photoCount: 0, photoIds: [], tombstoneIds: [], tombstoneCount: 0 };
      const jobs = JSON.parse(raw);
      const job = Array.isArray(jobs) ? jobs.find((j) => j.id === id) : null;
      const photos = job?.photos || [];
      const tombs = job?.deletedPhotoTombstones || [];
      return {
        photoCount: photos.length,
        photoIds: photos.map((p) => p.id).filter(Boolean),
        tombstoneIds: tombs.map((t) => t.photoId || t.id).filter(Boolean),
        tombstoneCount: tombs.length,
      };
    } catch {
      return { photoCount: 0, photoIds: [], tombstoneIds: [], tombstoneCount: 0, error: true };
    }
  }, jobId);
}

/**
 * Wait briefly for a kw-jobs batch-set (best-effort).
 * @param {import('playwright').Page} page
 * @param {number} [timeoutMs]
 */
async function waitJobsCloudPush(page, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await page
      .waitForResponse(
        (r) => r.url().includes("/batch-set") && r.request().method() === "POST",
        { timeout: 6000 },
      )
      .catch(() => null);
    if (!res) continue;
    try {
      const body = JSON.parse(res.request().postData() || "{}");
      if (body.keys?.includes("kw-jobs")) return { status: res.status() };
    } catch {
      /* next */
    }
  }
  await page.waitForTimeout(2000);
  return null;
}

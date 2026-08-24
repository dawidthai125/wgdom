/**
 * IK-OWNER-A01-LP5-QUOTES OPS — single-work marketQuotes KV seed (idempotent).
 * Prerequisite: catalog-ik-owner-a01-lp5-ops (CatalogWork present).
 * Target: cc-w2-impregnacja-biobojcza-m2 (LP5/LP10).
 *
 * Dry-run: npx vite-node scripts/catalog-ik-owner-a01-lp5-quotes-ops.mjs
 * Execute:  npx vite-node scripts/catalog-ik-owner-a01-lp5-quotes-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
  IK_OWNER_A01_LP5_OPS_REGIONS,
  IK_OWNER_A01_LP5_QUOTES_OPS_EXPECTED,
  applyA01Lp5QuotesSeed,
  buildIkOwnerA01Lp5QuotesCsv,
  probeA01Lp5QuotesPerRegion,
  workHasA01Lp5UsefulQuotes,
} from "../src/lib/work-catalog/ik-owner-create-a01-lp5-quotes-ops.ts";
import { workMatchesOwnerApprovedA01Lp5Spec } from "../src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const WORK_ID = IK_OWNER_CREATE_A01_LP5_WORK_ID;
const FROZEN_OCZYSZCZENIE = "cc-w2-oczyszczenie-podloza";

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

const env = loadEnv("", process.cwd(), "");
const anon = env.VITE_SUPABASE_ANON_KEY;
const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;

function unwrap(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  return res.json();
}

async function batchSet(keys, values) {
  const res = await fetch(`${edge}/batch-set`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys, values }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-set ${res.status}: ${await res.text()}`);
}

function quotesSummary(work) {
  if (!work?.marketQuotes) return { present: false, cells: 0 };
  let cells = 0;
  for (const byR of Object.values(work.marketQuotes)) {
    if (!byR || typeof byR !== "object") continue;
    cells += Object.keys(byR).length;
  }
  return { present: cells > 0, cells, useful: workHasA01Lp5UsefulQuotes(work) };
}

function stableQuotes(work) {
  return JSON.stringify(work?.marketQuotes ?? null);
}

console.log("=== IK-OWNER-A01-LP5-QUOTES OPS ===");
console.log(`mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · workId=${WORK_ID}`);

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(
  kv.values?.["kw-wgdom-work-catalog"] ??
    kv.values?.[0] ??
    Object.values(kv.values ?? {})[0],
);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-lp5-quotes-backup.json"),
  JSON.stringify({ backedUpAt: TS, catalog }, null, 2),
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));

const {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { getWorkByIdFromStore } = await import(
  "../src/lib/work-catalog/catalog-work-utils.ts"
);
const { commitMarketQuotesImport } = await import("../src/lib/work-catalog/index.ts");

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());

const frozenBefore = Object.fromEntries(
  IK_OWNER_A01_LP5_OPS_REGIONS.map((r) => {
    const frozen = getWorkByIdFromStore(store, FROZEN_OCZYSZCZENIE, r);
    return [r, frozen ? stableQuotes(frozen) : null];
  }),
);

for (const region of IK_OWNER_A01_LP5_OPS_REGIONS) {
  const frozen = getWorkByIdFromStore(store, FROZEN_OCZYSZCZENIE, region);
  if (frozen) {
    const q = quotesSummary(frozen);
    console.log(
      `A01-LP9 frozen ${region}: ${frozen.id} · quotes=${q.present ? "yes" : "no"} · useful=${q.useful}`,
    );
  }
}

const beforeQuotes = probeA01Lp5QuotesPerRegion(store);
const beforeWork = Object.fromEntries(
  IK_OWNER_A01_LP5_OPS_REGIONS.map((r) => {
    const w = getWorkByIdFromStore(store, WORK_ID, r);
    return [
      r,
      w
        ? {
            ok: workMatchesOwnerApprovedA01Lp5Spec(w),
            quotes: quotesSummary(w),
          }
        : null,
    ];
  }),
);
console.log("BEFORE_QUOTES:", JSON.stringify(beforeQuotes, null, 2));
console.log("BEFORE_WORK:", JSON.stringify(beforeWork, null, 2));

const csv = buildIkOwnerA01Lp5QuotesCsv(TS, store);
fs.writeFileSync(path.join(OUT, "catalog-ik-owner-a01-lp5-quotes.csv"), csv, "utf8");
console.log("CSV_PREVIEW:\n" + csv.trim());

let mergeResult;
try {
  mergeResult = applyA01Lp5QuotesSeed(store, TS);
} catch (err) {
  console.error("STOP:", err.message);
  process.exit(2);
}

store = normalizeWorkCatalogStore(mergeResult.store);
console.log("PER_REGION:", JSON.stringify(mergeResult.perRegion));
console.log("PREVIEW_SUMMARY:", JSON.stringify(mergeResult.preview.summary));
console.log(`CHANGED=${mergeResult.changed}`);
if (mergeResult.applyReport) {
  console.log("APPLY_REPORT:", JSON.stringify(mergeResult.applyReport));
}

if (mergeResult.changed) {
  saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });
}

const afterQuotes = probeA01Lp5QuotesPerRegion(store);
const afterWork = Object.fromEntries(
  IK_OWNER_A01_LP5_OPS_REGIONS.map((r) => {
    const w = getWorkByIdFromStore(store, WORK_ID, r);
    return [
      r,
      w
        ? {
            ok: workMatchesOwnerApprovedA01Lp5Spec(w),
            quotes: quotesSummary(w),
          }
        : null,
    ];
  }),
);
console.log("AFTER_QUOTES:", JSON.stringify(afterQuotes, null, 2));
console.log("AFTER_WORK:", JSON.stringify(afterWork, null, 2));

const frozenAfter = Object.fromEntries(
  IK_OWNER_A01_LP5_OPS_REGIONS.map((r) => {
    const frozen = getWorkByIdFromStore(store, FROZEN_OCZYSZCZENIE, r);
    return [r, frozen ? stableQuotes(frozen) : null];
  }),
);
const lp9Untouched = IK_OWNER_A01_LP5_OPS_REGIONS.every(
  (r) => frozenBefore[r] === frozenAfter[r],
);
console.log(`LP9_FROZEN_UNTOUCHED=${lp9Untouched}`);
if (!lp9Untouched) {
  console.error("STOP: LP9 frozen work quotes changed during dry-run merge");
  process.exit(7);
}

const allOk = IK_OWNER_A01_LP5_OPS_REGIONS.every(
  (r) => afterQuotes[r] === "PRESENT_OK" && afterWork[r]?.ok === true,
);
if (!allOk) {
  console.error("STOP: post-merge quotes verification failed");
  process.exit(3);
}

const report = {
  at: TS,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  workId: WORK_ID,
  expected: IK_OWNER_A01_LP5_QUOTES_OPS_EXPECTED,
  beforeQuotes,
  perRegion: mergeResult.perRegion,
  changed: mergeResult.changed,
  previewSummary: mergeResult.preview.summary,
  afterQuotes,
  a01lp9FrozenTouched: !lp9Untouched,
};

if (!EXECUTE) {
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a01-lp5-quotes-ops-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nDRY-RUN OK — run with --execute to commit Quotes + cloud KV");
  process.exit(0);
}

if (!mergeResult.changed) {
  console.log("IDEMPOTENT NO-OP — cloud KV unchanged");
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a01-lp5-quotes-ops-report.json"),
    JSON.stringify({ ...report, cloudWrite: "SKIPPED_NO_CHANGE" }, null, 2),
  );
  process.exit(0);
}

let working = store;
const commitReport = await commitMarketQuotesImport(mergeResult.preview, {
  region: "wroclaw",
  updatedAtIso: TS,
  deps: {
    load: async () => working,
    save: async (next, options) => {
      const updatedAt = options?.updatedAtIso ?? next.updatedAt ?? TS;
      working = normalizeWorkCatalogStore({ ...next, updatedAt });
      const synced = (
        await import("../src/lib/work-catalog/ik-owner-create-a01-lp5-quotes-ops.ts")
      ).syncA01Lp5QuotesWroclawToDolnySlask(working, updatedAt);
      working = normalizeWorkCatalogStore(synced.store);
      saveWorkCatalogStoreLocal(working, { updatedAtIso: working.updatedAt });
      return { ok: true, saved: true };
    },
    loadLocal: () => loadWorkCatalogStoreLocal(),
    saveLocal: (s, opts) => saveWorkCatalogStoreLocal(s, opts),
  },
});
console.log("COMMIT:", commitReport.status, commitReport.apply);

if (commitReport.status !== "committed" && commitReport.status !== "noop") {
  console.error("STOP: commit failed", commitReport.status, commitReport.reason);
  process.exit(4);
}

const postCommit = probeA01Lp5QuotesPerRegion(working);
const wroWork = getWorkByIdFromStore(working, WORK_ID, "wroclaw");
if (postCommit.wroclaw !== "PRESENT_OK" || !workHasA01Lp5UsefulQuotes(wroWork)) {
  console.error("STOP: post-commit quotes gate failed", postCommit);
  process.exit(5);
}

const payload = JSON.parse(JSON.stringify(working));
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-lp5-quotes-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(
  kv2.values?.["kw-wgdom-work-catalog"] ?? Object.values(kv2.values ?? {})[0],
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const cloudVerify = probeA01Lp5QuotesPerRegion(cloudStore);
console.log("CLOUD_VERIFY:", JSON.stringify(cloudVerify));
if (Object.values(cloudVerify).some((v) => v !== "PRESENT_OK")) {
  console.error("STOP: cloud verification failed");
  process.exit(6);
}

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-lp5-quotes-ops-report.json"),
  JSON.stringify({ ...report, cloudWrite: "OK", cloudVerify, commitStatus: commitReport.status }, null, 2),
);
console.log("\n=== IK-OWNER-A01-LP5-QUOTES OPS COMPLETE ===");

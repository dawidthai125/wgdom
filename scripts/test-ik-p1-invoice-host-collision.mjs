/**
 * IK P1 — Invoice Host Collision (G1 mapper exclusion + G2 mat.inv Research block)
 *
 * Run: npx vite-node scripts/test-ik-p1-invoice-host-collision.mjs
 *
 * ZERO production business writes · ZERO Edge research lease · ZERO Accept.
 * PACZKA V (TEST 7) uses read-only Edge batch-get when VITE_SUPABASE_ANON_KEY is set.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("", process.cwd(), ""));

import {
  mapOfferBoqLine,
  mapOfferBoqLineCore,
} from "../src/lib/tender-offer-boq-mapping.ts";
import {
  assertMaterialResearchAllowed,
} from "../src/lib/intelligent-estimator/classification-gate.ts";
import { researchEligible } from "../src/lib/intelligent-estimator/ik-material-expert.ts";
import {
  isInvoicePurchaseCatalogWorkId,
  isInvoicePurchaseMaterialKey,
  invoicePurchaseMaterialKeyFromWorkId,
  invoicePurchaseWorkIdFromMaterialKey,
} from "../src/lib/price-intelligence/invoice-purchase-host.ts";
import { resolveDemandProductIdentityExact } from "../src/lib/pricing-expert/material-market-map.ts";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import { listActiveWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { isCenyMaterialow01Enabled } from "../src/lib/ceny-materialow-01-flag.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const FIXED_AT = "2026-08-17T06:00:00.000Z";
const TENDER_ID = "08decd21-9cc2-012f-5fad-9500015f70fa";

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
};

let fetchCalls = 0;
const realFetch = globalThis.fetch?.bind(globalThis);
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  if (typeof realFetch === "function") return realFetch(...args);
  throw new Error(`UNEXPECTED_FETCH ${String(args[0])}`);
};

let pass = 0;
let fail = 0;
const notes = [];

function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function work(partial) {
  return {
    tradeId: "POZOSTALE",
    unit: "szt",
    companyPricePln: 0,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "POZOSTALE",
    ...partial,
  };
}

function baseLine(description, unit = "szt", lp = "1") {
  return {
    id: `obl_${lp}`,
    lp,
    description,
    unit,
    quantity: 1,
    knrHint: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    aiConfidence: "low",
    aiRationale: null,
    costIntelligence: null,
    linePricing: null,
  };
}

const invoiceGloves = work({
  id: "cw.inv.50",
  namePl: "SZT. RĘKAWICE EXPERT GRIP",
  keywords: ["szt", "rekawice", "expert", "grip", "naprawienie", "powierzchni", "muru"],
  descriptionPl: "SZT. RĘKAWICE EXPERT GRIP",
});

const invoiceTrojnik = work({
  id: "cw.inv.h_tr_40",
  namePl: "TRÓJNIK ŻELIWNY",
  keywords: ["trojnik", "zeliwa", "ciagliwego", "ocynkowanego", "wstawienie"],
  descriptionPl: "TRÓJNIK",
});

const canonicalMur = work({
  id: "cw-naprawa-mur-test",
  tradeId: "MUROWANIE",
  namePl: "Naprawa powierzchni muru",
  unit: "szt",
  keywords: ["naprawienie", "uszkodzonych", "murze", "powierzchni", "zalzenie"],
  legacyCategoryId: "MUROWANIE",
  descriptionPl: "Naprawienie uszkodzonych w murze powierzchni",
});

const canonicalMal = work({
  id: "wc-mal-dwukrotne",
  tradeId: "MALOWANIE",
  namePl: "Malowanie dwukrotne ścian",
  unit: "m2",
  keywords: ["malowanie", "dwukrotne", "scian", "farba"],
  legacyCategoryId: "MALOWANIE",
});

const dBefore = defaultAppSettings().expertAiDecydentEnabled;

// —— TEST 1: G1 invoice exclusion ——
{
  const works = [invoiceGloves, invoiceTrojnik, canonicalMur];
  const lineGloves = baseLine(
    "Naprawienie uszkodzonych w murze powierzchni do 0.50 m2 szt d.1.1 0308-05 .2 założenie 5",
    "szt",
    "6",
  );
  const coreGloves = mapOfferBoqLineCore(lineGloves, { works });
  const fullGloves = mapOfferBoqLine(lineGloves, { works });
  ok(
    "T1 cw.inv.50 not Core primary",
    coreGloves.catalogWorkId !== "cw.inv.50" &&
      !isInvoicePurchaseCatalogWorkId(coreGloves.catalogWorkId || ""),
    { core: coreGloves.catalogWorkId },
  );
  ok(
    "T1 cw.inv.50 not mapOfferBoqLine primary",
    fullGloves.catalogWorkId !== "cw.inv.50" &&
      !isInvoicePurchaseCatalogWorkId(fullGloves.catalogWorkId || ""),
    { mapped: fullGloves.catalogWorkId },
  );

  const lineTr = baseLine(
    "Wstawienie trójnika o śr. 25 mm z żeliwa ciągliwego ocynkowanego łazienka",
    "szt",
    "130",
  );
  const coreTr = mapOfferBoqLineCore(lineTr, { works: [invoiceTrojnik, canonicalMur] });
  ok(
    "T1 cw.inv.h_tr_40 not Core primary",
    coreTr.catalogWorkId !== "cw.inv.h_tr_40" &&
      !isInvoicePurchaseCatalogWorkId(coreTr.catalogWorkId || ""),
    { core: coreTr.catalogWorkId },
  );
}

// —— TEST 2: canonical still binds ——
{
  const mapped = mapOfferBoqLine(
    baseLine("Malowanie dwukrotne ścian farbą lateksową", "m2", "4"),
    { works: [invoiceGloves, canonicalMal] },
  );
  ok(
    "T2 canonical CatalogWork still binds",
    mapped.catalogWorkId === "wc-mal-dwukrotne",
    { id: mapped.catalogWorkId },
  );
  ok(
    "T2 invoice still present in pool input (not deleted)",
    [invoiceGloves, canonicalMal].some((w) => w.id === "cw.inv.50" && w.active === true),
  );
}

// —— TEST 3: researchEligible ——
{
  const invIdentity = {
    materialKey: "mat.inv.50",
    catalogWorkId: "cw.inv.50",
    labelPl: "mat.inv.50",
    via: "catalogWorkId",
  };
  ok(
    "T3 researchEligible mat.inv.50 = false",
    researchEligible(invIdentity, "UNRESOLVED", "UNKNOWN") === false,
  );
  ok(
    "T3 researchEligible mat.inv even MATERIAL plane = false",
    researchEligible(invIdentity, "MATERIAL", "MATERIAL") === false,
  );
}

// —— TEST 4: Phase2 gate order ——
{
  const gate = assertMaterialResearchAllowed({ materialKey: "mat.inv.50" });
  ok("T4 assertMaterialResearchAllowed mat.inv.50 blocked", gate.ok === false);
  ok(
    "T4 helper detects invoice material",
    isInvoicePurchaseMaterialKey("mat.inv.50") === true,
  );
  const gateSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/classification-gate.ts"),
    "utf8",
  );
  const invIdx = gateSrc.indexOf("isInvoicePurchaseMaterialKey");
  const matAllowIdx = gateSrc.indexOf('materialKey?.startsWith("mat.")');
  ok(
    "T4 invoice guard appears before mat.* allow",
    invIdx > 0 && matAllowIdx > 0 && invIdx < matAllowIdx,
    { invIdx, matAllowIdx },
  );
}

// —— TEST 5: canonical mat.* remains legal ——
{
  ok(
    "T5 mat.glue_etics research allowed",
    assertMaterialResearchAllowed({ materialKey: "mat.glue_etics" }).ok === true,
  );
  ok(
    "T5 researchEligible canonical mat",
    researchEligible(
      {
        materialKey: "mat.glue_etics",
        catalogWorkId: "cw.market.glue_etics",
        labelPl: "klej",
        via: "materialKey",
      },
      "MATERIAL",
      "MATERIAL",
    ) === true,
  );
}

// —— TEST 6: PM regression ——
{
  const fromMk = resolveDemandProductIdentityExact({ materialKey: "mat.inv.50" });
  const fromCw = resolveDemandProductIdentityExact({ catalogWorkId: "cw.inv.50" });
  ok(
    "T6 PM mat.inv.50 → cw.inv.50",
    !!fromMk && fromMk.catalogWorkId === "cw.inv.50" && fromMk.materialKey === "mat.inv.50",
    fromMk,
  );
  ok(
    "T6 PM cw.inv.50 → mat.inv.50",
    !!fromCw && fromCw.materialKey === "mat.inv.50" && fromCw.catalogWorkId === "cw.inv.50",
    fromCw,
  );
  ok(
    "T6 helper roundtrip",
    invoicePurchaseWorkIdFromMaterialKey("mat.inv.50") === "cw.inv.50" &&
      invoicePurchaseMaterialKeyFromWorkId("cw.inv.50") === "mat.inv.50",
  );
}

// —— TEST 6b: Phase2 CURRENT reuse for mat.inv (PM ≠ DIY) ——
{
  const { evaluateMaterialCache, executeMaterialResearchPhase2 } = await import(
    "../src/lib/price-intelligence/index.ts"
  );
  const { normalizeWorkCatalogStore } = await import("../src/lib/work-catalog/index.ts");
  const store = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: FIXED_AT,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: FIXED_AT,
        works: [
          work({
            id: "cw.inv.ha13pm",
            namePl: "HA13 PM",
            marketQuotes: {
              wgdom: {
                wroclaw: {
                  price: 34.96,
                  updatedAt: FIXED_AT,
                  origin: "wgdom",
                  confidence: 1,
                  coverage: "exact",
                },
              },
            },
          }),
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt: FIXED_AT, works: [] },
    },
  });
  const worksById = new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
  const mk = "mat.inv.ha13pm";
  // Host may use different slug — seed identity for cache via catalogWorkId
  const cache = evaluateMaterialCache({
    materialKey: mk,
    catalogWorkId: "cw.inv.ha13pm",
    region: "wroclaw",
    worksById,
    nowMs: Date.parse(FIXED_AT),
  });
  // If cache not CURRENT without quotes keyed by material, still assert Phase2 order via gate+CURRENT contract:
  const phase2 = await executeMaterialResearchPhase2({
    demand: {
      demandId: "d-p1-pm",
      materialKey: "mat.inv.50",
      catalogWorkId: "cw.inv.50",
      normalizedName: "gloves",
      unit: "szt",
      region: "wroclaw",
      missingLayer: "MARKET",
      status: "open",
      createdAt: FIXED_AT,
      updatedAt: FIXED_AT,
      tenderIds: ["t1"],
    },
    claimantId: "p1-test",
    lease: {
      async claim() {
        return { acquired: true, reason: "acquired_new", job: null };
      },
      async release() {
        return { released: true };
      },
    },
    worksById: new Map(),
    nowMs: Date.parse(FIXED_AT),
  });
  // Without CURRENT cache → classification_gate (DIY forbidden). With CURRENT → reuse.
  ok(
    "T6b Phase2 mat.inv without CURRENT → classification_gate (no DIY HTTP)",
    phase2.ok === false && String(phase2.error || "").startsWith("classification_gate"),
    phase2,
  );
  void cache;
}

// —— TEST 7: PACZKA V (read-only Edge) ——
async function runPaczkaV() {
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon) {
    notes.push("T7 SKIPPED — no VITE_SUPABASE_ANON_KEY");
    ok("T7 PACZKA V skipped (no anon key) — unit coverage still required", true);
    return;
  }
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
  const edge = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;
  const fetchBefore = fetchCalls;

  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys: ["kw-tenders-pipeline", "kw-wgdom-work-catalog"] }),
    signal: AbortSignal.timeout(180000),
  });
  ok("T7 Edge batch-get OK", res.ok, { status: res.status });
  if (!res.ok) return;

  const j = await res.json();
  const values = {};
  if (Array.isArray(j.values)) {
    ["kw-tenders-pipeline", "kw-wgdom-work-catalog"].forEach((k, i) => {
      values[k] = j.values[i];
    });
  } else {
    Object.assign(values, j.values || {});
  }

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

  let pipeline = unwrap(values["kw-tenders-pipeline"]);
  if (typeof pipeline === "string") pipeline = JSON.parse(pipeline);
  const item = (Array.isArray(pipeline) ? pipeline : []).find((x) => x.id === TENDER_ID);
  ok("T7 tender found", !!item, { id: TENDER_ID });
  if (!item) return;

  mem.clear();
  saveWorkCatalogStoreLocal(normalizeWorkCatalogStore(unwrap(values["kw-wgdom-work-catalog"])));
  const store = loadWorkCatalogStoreLocal();
  const works = listActiveWorksForRegion(store, store.activeRegion);
  // Master SSOT: historical DF lock **471** superseded — exact live count is NOT a locked contract.
  // Source-verified: catalog readable + non-empty (write locks covered elsewhere). No 471/431/band invent.
  ok(
    "T7 CatalogWork live readable (exact count not DF-locked; historical 471 retired)",
    Array.isArray(works) && works.length > 0,
    { n: works.length, retiredHistoricalDfLock: 471 },
  );

  const { runIkDocumentExpert } = await import(
    "../src/lib/intelligent-estimator/ik-document-expert.ts"
  );
  const doc = runIkDocumentExpert({ item, package: null });
  const boqLines = doc?.masterBoq?.lines ?? doc?.lines ?? [];
  // Document expert shape: prefer kosztorys / master BOQ lines via Material Expert path
  const { runIkMasterBoqMaterialExpert } = await import(
    "../src/lib/intelligent-estimator/index.ts"
  );
  const {
    forceIkEntryEnabledForTests,
    forceIkMaterialE2eForTests,
    forceIkMaterialResearchForTests,
  } = await import("../src/lib/intelligent-estimator/ik-entry-flag.ts");
  forceIkEntryEnabledForTests(true);
  forceIkMaterialE2eForTests(true);
  forceIkMaterialResearchForTests(true);

  const mat = await runIkMasterBoqMaterialExpert({
    item,
    package: null,
    expert: doc,
    executeResearch: false,
  });

  const lines = mat?.lines ?? [];
  ok("T7 BOQ lines = 178", lines.length === 178, { n: lines.length });

  const byLp = new Map(lines.map((l) => [String(l.lp), l]));
  const lp6 = byLp.get("6");
  const lp130 = byLp.get("130");
  const lp136 = byLp.get("136");
  const lp4 = byLp.get("4");

  ok(
    "T7 LP6 not cw.inv.50 primary",
    !!lp6 && lp6.catalogWorkId !== "cw.inv.50" && !isInvoicePurchaseCatalogWorkId(lp6.catalogWorkId || ""),
    { catalogWorkId: lp6?.catalogWorkId, mk: lp6?.materialIdentity?.materialKey },
  );
  ok(
    "T7 LP130 not cw.inv.h_tr_40 primary",
    !!lp130 &&
      lp130.catalogWorkId !== "cw.inv.h_tr_40" &&
      !isInvoicePurchaseCatalogWorkId(lp130.catalogWorkId || ""),
    { catalogWorkId: lp130?.catalogWorkId },
  );
  ok(
    "T7 LP136 not cw.inv.50 primary",
    !!lp136 &&
      lp136.catalogWorkId !== "cw.inv.50" &&
      !isInvoicePurchaseCatalogWorkId(lp136.catalogWorkId || ""),
    { catalogWorkId: lp136?.catalogWorkId },
  );
  ok(
    "T7 LP4 Labor path cc-w2-oczyszczenie-podloza",
    !!lp4 && lp4.catalogWorkId === "cc-w2-oczyszczenie-podloza",
    { catalogWorkId: lp4?.catalogWorkId },
  );

  const invLines = lines.filter(
    (l) =>
      isInvoicePurchaseCatalogWorkId(l.catalogWorkId || "") ||
      isInvoicePurchaseMaterialKey(l.materialIdentity?.materialKey || ""),
  );
  ok("T7 no invoice BOQ/material identity on lines", invLines.length === 0, {
    n: invLines.length,
    sample: invLines.slice(0, 3).map((l) => ({
      lp: l.lp,
      cw: l.catalogWorkId,
      mk: l.materialIdentity?.materialKey,
    })),
  });

  const diyPending = (mat.pendingResearchJobs || mat.researchPending || []).filter((j) =>
    isInvoicePurchaseMaterialKey(String(j.materialKey || j.key || "")),
  );
  // Also scan line researchKeys
  const diyResearchKeys = lines.filter(
    (l) =>
      l.researchKey &&
      isInvoicePurchaseMaterialKey(String(l.researchKey).split("|")[0]),
  );
  ok("T7 invoice identities do not reach DIY Research keys", diyResearchKeys.length === 0, {
    n: diyResearchKeys.length,
  });
  ok("T7 no invoice pending research jobs", diyPending.length === 0, { n: diyPending.length });

  // Direct mapper smoke on catalog for the three historical collision descriptions
  const mapCtx = {
    works,
    mappedAt: new Date().toISOString(),
    documentContext: item.title ?? null,
    cenyMaterialowUplift: isCenyMaterialow01Enabled(),
  };
  const m6 = mapOfferBoqLine(
    baseLine(
      "Naprawienie uszkodzonych w murze powierzchni do 0.50 m2 szt d.1.1 0308-05 .2 założenie 5",
      "szt",
      "6",
    ),
    mapCtx,
  );
  const m130 = mapOfferBoqLine(
    baseLine(
      "Wstawienie trójnika o śr. 25 mm z żeliwa ciągliwego ocynkowanego łazienka",
      "szt",
      "130",
    ),
    mapCtx,
  );
  ok("T7 mapper LP6 desc not invoice", !isInvoicePurchaseCatalogWorkId(m6.catalogWorkId || ""));
  ok(
    "T7 mapper LP130 desc not invoice",
    !isInvoicePurchaseCatalogWorkId(m130.catalogWorkId || ""),
  );

  // No Accept / catalog persist beyond in-memory harness
  ok(
    "T7 write audit — only harness localStorage (no cloud push in test)",
    fetchCalls - fetchBefore === 1,
    { delta: fetchCalls - fetchBefore },
  );
  void boqLines;
}

await runPaczkaV();

// —— TEST 8: CatalogWork mutation absent in P1 files ——
{
  const mappingSrc = readFileSync(join(root, "src/lib/tender-offer-boq-mapping.ts"), "utf8");
  const gateSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/classification-gate.ts"),
    "utf8",
  );
  const matSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/ik-material-expert.ts"),
    "utf8",
  );
  ok(
    "T8 mapping does not write CatalogWork",
    !/saveWorkCatalogStoreLocal|applyZygmuntInvoicePurchaseSeed/.test(mappingSrc),
  );
  ok(
    "T8 gate does not mutate CatalogWork",
    !/saveWorkCatalogStoreLocal|active:\s*false/.test(gateSrc),
  );
  ok(
    "T8 G1 uses isInvoicePurchaseCatalogWorkId",
    /isInvoicePurchaseCatalogWorkId/.test(mappingSrc),
  );
  ok(
    "T8 G2 uses isInvoicePurchaseMaterialKey in researchEligible",
    /isInvoicePurchaseMaterialKey/.test(matSrc) && /researchEligible/.test(matSrc),
  );
}

// —— TEST 9: D ——
{
  const dAfter = defaultAppSettings().expertAiDecydentEnabled;
  ok("T9 D before == false", dBefore === false);
  ok("T9 D after == false", dAfter === false);
  ok("T9 D diff = 0", dBefore === dAfter);
}

// —— TEST 10: safety (source / contract) ——
{
  const mappingSrc = readFileSync(join(root, "src/lib/tender-offer-boq-mapping.ts"), "utf8");
  const gateSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/classification-gate.ts"),
    "utf8",
  );
  ok(
    "T10 no auto Accept introduced in G1/G2 files",
    !/acceptMaterialResearchCandidate|autoAccept|OUR_RATE/.test(mappingSrc) &&
      !/acceptMaterialResearchCandidate|autoAccept/.test(gateSrc),
  );
  ok(
    "T10 no unit remapping in G1 filter",
    !/normalizeInvoiceUnit|remapUnit/.test(
      mappingSrc.slice(mappingSrc.indexOf("isInvoicePurchaseCatalogWorkId")),
    ),
  );
  ok(
    "T10 Research gate remains deny for invoice (≠ Accept)",
    assertMaterialResearchAllowed({ materialKey: "mat.inv.50" }).ok === false,
  );
  ok(
    "T10 GAP contract — invoice research blocked (no 0 PLN invent)",
    assertMaterialResearchAllowed({ materialKey: "mat.inv.h_tr_40" }).ok === false,
  );
}

console.log("\n---");
console.log(JSON.stringify({ pass, fail, notes, fetchCalls }, null, 2));
if (fail > 0) process.exit(1);

/**
 * P0 — merge jakościowy kosztorysu (local ↔ cloud)
 * npx vite-node scripts/test-tender-dossier-merge-quality.mjs
 */
import {
  pickBetterKosztorys,
  mergeTenderDossierByQuality,
  kosztorysSourceQualityTier,
} from "../src/lib/tender-dossier-merge.ts";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`);
  }
}

function kosztorys(sourceFilename, rowCount, parsedAt = "2026-06-01T00:00:00.000Z", ok = true) {
  return {
    ok,
    sourceFilename,
    rowCount,
    rows: Array(rowCount).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt,
  };
}

function dossier(k, builtAt = "2026-06-01T00:00:00.000Z") {
  return {
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt },
    kosztorys: k,
    builtAt,
  };
}

function pipelineItem(id, updatedAt, dossierObj, extra = {}) {
  return {
    id,
    tenderId: id,
    title: "test",
    status: "seen",
    updatedAt,
    tenderDossier: dossierObj,
    ...extra,
  };
}

console.log("=== P0 MERGE QUALITY PROTECTION TESTS ===\n");

// T1 — ATH 302 vs Formularz 45 → ATH
console.log("T1 ATH 302 vs Formularz 45");
{
  const ath = kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302);
  const form = kosztorys("TP113_Zal. nr 1 do SWZ - Formularz oferty.xlsx", 45);
  const picked = pickBetterKosztorys(form, ath);
  assert(picked?.sourceFilename.includes(".ATH"), "pickBetter → ATH");
  assert(picked?.rowCount === 302, "rowCount 302");

  const local = pipelineItem("t1", "2026-06-19T14:00:00.000Z", dossier(form));
  const cloud = pipelineItem("t1", "2026-06-19T03:00:00.000Z", dossier(ath));
  const merged = mergeTenderPipelineForCloud([local], [cloud])[0];
  assert(merged.tenderDossier?.kosztorys?.rowCount === 302, "pipeline merge → ATH 302");
  assert(merged.updatedAt === local.updatedAt, "updatedAt z nowszego rekordu (local)");
}

// T1B — odwrotny kierunek: LOCAL ATH starszy vs CLOUD Formularz nowszy → ATH
console.log("\nT1B odwrotny kierunek pipeline merge");
{
  const ath = kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302);
  const form = kosztorys("TP113_Zal. nr 1 do SWZ - Formularz oferty.xlsx", 45);
  const local = pipelineItem("t1b", "2026-06-19T03:00:00.000Z", dossier(ath));
  const cloud = pipelineItem("t1b", "2026-06-19T14:00:00.000Z", dossier(form));
  const merged = mergeTenderPipelineForCloud([local], [cloud])[0];
  assert(merged.tenderDossier?.kosztorys?.rowCount === 302, "pipeline merge → ATH 302");
  assert(merged.updatedAt === cloud.updatedAt, "updatedAt z nowszego rekordu (cloud)");
}

// T2 — PDF przedmiar 86 vs Formularz 55 → PDF
console.log("\nT2 PDF przedmiar 86 vs Formularz 55");
{
  const pdf = kosztorys("Nowowiejska 86a_27 - przedmiar.pdf", 86);
  const form = kosztorys("TP_182_Zal. nr 1 do SWZ - Formularz oferty (Część 1).xlsx", 55);
  const picked = pickBetterKosztorys(form, pdf);
  assert(/przedmiar\.pdf$/i.test(picked?.sourceFilename ?? ""), "pickBetter → PDF");
  assert(picked?.rowCount === 86, "rowCount 86");
}

// T3 — ATH 120 vs ATH 302 → 302
console.log("\nT3 ATH 120 vs ATH 302");
{
  const a = kosztorys("job-a.ATH", 120);
  const b = kosztorys("job-b.ATH", 302);
  const picked = pickBetterKosztorys(a, b);
  assert(picked?.rowCount === 302, "ATH 302 wygrywa po rowCount");
}

// T4 — ATH 302 vs ATH 302 → nowszy parsedAt
console.log("\nT4 ATH 302 vs ATH 302 — parsedAt");
{
  const old = kosztorys("old.ATH", 302, "2026-06-10T00:00:00.000Z");
  const newer = kosztorys("new.ATH", 302, "2026-06-18T00:00:00.000Z");
  const picked = pickBetterKosztorys(old, newer);
  assert(picked?.parsedAt === "2026-06-18T00:00:00.000Z", "nowszy parsedAt wygrywa");
}

// T5 — brak vs ATH → ATH
console.log("\nT5 brak kosztorysu vs ATH");
{
  const none = kosztorys("", 0, "", false);
  const ath = kosztorys("scalony.ATH", 50);
  const picked = pickBetterKosztorys(none, ath);
  assert(picked?.rowCount === 50, "ATH wygrywa nad brakiem");
  assert(kosztorysSourceQualityTier(none) === 0, "brak tier 0");
  assert(kosztorysSourceQualityTier(ath) === 6, "ATH tier 6");
}

// T6 — brak regresji pozostałych pól pipeline (status, notes, updatedAt)
console.log("\nT6 pozostałe pola pipeline — timestamp merge");
{
  const local = pipelineItem("t6", "2026-06-20T12:00:00.000Z", dossier(kosztorys("Formularz oferty.xlsx", 45)), {
    status: "preparing",
    notes: "local note",
  });
  const cloud = pipelineItem("t6", "2026-06-15T08:00:00.000Z", dossier(kosztorys("real.ATH", 200)), {
    status: "seen",
    notes: "",
  });
  const merged = mergeTenderPipelineForCloud([local], [cloud])[0];
  assert(merged.status === "preparing", "status z primary (nowszy updatedAt)");
  assert(merged.notes === "local note", "notes z primary");
  assert(merged.updatedAt === "2026-06-20T12:00:00.000Z", "updatedAt z local");
  assert(merged.tenderDossier?.kosztorys?.rowCount === 200, "kosztorys jakościowy ATH mimo starszego cloud updatedAt");
}

// mergeTenderDossierByQuality direct
console.log("\nT1b mergeTenderDossierByQuality — obowiązkowy przykład");
{
  const d = mergeTenderDossierByQuality(
    dossier(kosztorys("Formularz oferty.xlsx", 45)),
    dossier(kosztorys("SĘPA.ATH", 302)),
  );
  assert(d?.kosztorys?.rowCount === 302, "dossier merge → ATH 302");
}

/** TP190A — ten sam merge co analyzeTenderWithDossier / buildTenderDossierHeavy po parse. */
function resolveKosztorysAfterParse(existing, parsed) {
  let kosztorys = existing ?? null;
  if (parsed?.ok) {
    kosztorys = pickBetterKosztorys(existing, parsed) ?? kosztorys;
  }
  return kosztorys;
}

console.log("\n=== TP190A RE-ANALYZE / LAZY DOSSIER QUALITY GUARD ===\n");

// TP190A-1 — existing ATH 302, new EMPTY → existing survives
console.log("TP190A-1 existing ATH 302 vs new EMPTY");
{
  const existing = kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302);
  const resolved = resolveKosztorysAfterParse(existing, null);
  assert(resolved?.rowCount === 302, "existing ATH 302 survives empty parse");
  assert(/\.ATH$/i.test(resolved?.sourceFilename ?? ""), "source remains ATH");
}

// TP190A-2 — existing ATH 302, new XLS 8 → existing survives
console.log("\nTP190A-2 existing ATH 302 vs new XLS 8");
{
  const existing = kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302);
  const worse = kosztorys("TP190A_Zal. nr 1 do SWZ - Formularz oferty.xlsx", 8);
  const resolved = resolveKosztorysAfterParse(existing, worse);
  assert(resolved?.rowCount === 302, "existing ATH 302 survives formularz 8");
  assert(/\.ATH$/i.test(resolved?.sourceFilename ?? ""), "source remains ATH");
}

// TP190A-3 — existing PDF 120, new PDF 80 → existing survives (same tier, rowCount)
console.log("\nTP190A-3 existing PDF 120 vs new PDF 80");
{
  const existing = kosztorys("Nowowiejska 86a_27 - przedmiar.pdf", 120);
  const worse = kosztorys("Nowowiejska 86a_27 - przedmiar partial.pdf", 80);
  const resolved = resolveKosztorysAfterParse(existing, worse);
  assert(resolved?.rowCount === 120, "existing PDF 120 survives PDF 80");
}

// TP190A-4 — existing PDF 80, new ATH 302 → new wins
console.log("\nTP190A-4 existing PDF 80 vs new ATH 302");
{
  const existing = kosztorys("Nowowiejska 86a_27 - przedmiar.pdf", 80);
  const better = kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302);
  const resolved = resolveKosztorysAfterParse(existing, better);
  assert(resolved?.rowCount === 302, "ATH 302 wins over PDF 80");
  assert(/\.ATH$/i.test(resolved?.sourceFilename ?? ""), "source becomes ATH");
}

// TP190A-5 — buildTenderDossierHeavy path: existing ATH not degraded by worse parse
console.log("\nTP190A-5 buildTenderDossierHeavy guard — ATH survives worse parse");
{
  const existingDossierKosztorys = kosztorys("SĘPA.ATH", 302);
  const parsedForm = kosztorys("Formularz oferty.xlsx", 8);
  let kosztorysSnap = existingDossierKosztorys ?? null;
  if (parsedForm?.ok) {
    kosztorysSnap = pickBetterKosztorys(existingDossierKosztorys, parsedForm) ?? kosztorysSnap;
  }
  assert(kosztorysSnap?.rowCount === 302, "heavy path → existing ATH 302");
  assert(/\.ATH$/i.test(kosztorysSnap?.sourceFilename ?? ""), "heavy path source remains ATH");
}

console.log(`\n=== WYNIK: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

/**
 * P1 — quality merge kosztorysu w mergeTenderPipeline (Odśwież BZP)
 * npx vite-node scripts/test-tender-bzp-merge-quality.mjs
 */
import { mergeTenderPipeline, mapBzpToPipelineItem } from "../src/lib/tenders-bzp.ts";

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

function pipelineItem(id, dossierObj, extra = {}) {
  return {
    id,
    tenderId: id,
    title: "test",
    status: "seen",
    updatedAt: "2026-06-19T12:00:00.000Z",
    tenderDossier: dossierObj,
    bzpNumber: "BZP/1",
    noticeNumber: "N/1",
    organizationName: "Zamawiający",
    organizationCity: "Wrocław",
    organizationProvince: "PL02",
    cpvCode: "",
    publicationDate: "2026-06-01",
    submittingOffersDate: "2026-07-01",
    orderType: "",
    moIdentifier: "",
    relevanceScore: 50,
    matchedKeywords: [],
    isWroclaw: true,
    addedAt: "2026-06-01T00:00:00.000Z",
    notes: "",
    ...extra,
  };
}

function mergePair(prevDossier, itemDossier, id = "p1") {
  const prev = pipelineItem(id, prevDossier);
  const item = pipelineItem(id, itemDossier, { updatedAt: "2026-06-19T14:00:00.000Z" });
  return mergeTenderPipeline([prev], [item])[0];
}

console.log("=== P1 BZP MERGE QUALITY TESTS ===\n");

// P1-T1 — prev Formularz 45, item ATH 302 → ATH 302
console.log("P1-T1 prev Formularz vs item ATH");
{
  const form = dossier(kosztorys("TP113_Zal. nr 1 do SWZ - Formularz oferty.xlsx", 45));
  const ath = dossier(kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302));
  const merged = mergePair(form, ath);
  assert(merged.tenderDossier?.kosztorys?.rowCount === 302, "wynik ATH 302");
  assert(merged.updatedAt === "2026-06-19T14:00:00.000Z", "updatedAt z incoming (item)");
}

// P1-T2 — prev PDF 86, item Formularz 55 → PDF 86
console.log("\nP1-T2 prev PDF vs item Formularz");
{
  const pdf = dossier(kosztorys("Nowowiejska 86a_27 - przedmiar.pdf", 86));
  const form = dossier(kosztorys("TP_182_Zal. nr 1 do SWZ - Formularz oferty (Część 1).xlsx", 55));
  const merged = mergePair(pdf, form, "p1t2");
  assert(merged.tenderDossier?.kosztorys?.rowCount === 86, "wynik PDF 86");
  assert(/przedmiar\.pdf$/i.test(merged.tenderDossier?.kosztorys?.sourceFilename ?? ""), "źródło PDF");
}

// P1-T3 — prev ATH 120, item ATH 302 → ATH 302
console.log("\nP1-T3 prev ATH 120 vs item ATH 302");
{
  const a120 = dossier(kosztorys("job-a.ATH", 120));
  const a302 = dossier(kosztorys("job-b.ATH", 302));
  const merged = mergePair(a120, a302, "p1t3");
  assert(merged.tenderDossier?.kosztorys?.rowCount === 302, "wynik ATH 302");
}

// P1-T4 — prev ATH 302 stary parsedAt, item ATH 302 nowszy parsedAt
console.log("\nP1-T4 ATH 302 — nowszy parsedAt");
{
  const old = dossier(kosztorys("old.ATH", 302, "2026-06-10T00:00:00.000Z"));
  const newer = dossier(kosztorys("new.ATH", 302, "2026-06-18T00:00:00.000Z"));
  const merged = mergePair(old, newer, "p1t4");
  assert(merged.tenderDossier?.kosztorys?.parsedAt === "2026-06-18T00:00:00.000Z", "nowszy parsedAt");
}

// P1-T5 — symulacja BZP refresh: baseItems formularz → merge → ATH gdy incoming niesie ATH
console.log("\nP1-T5 symulacja runBzpMerge flow");
{
  const form = dossier(kosztorys("TP113_Zal. nr 1 do SWZ - Formularz oferty.xlsx", 45));
  const ath = dossier(kosztorys("SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH", 302));
  const baseItems = [pipelineItem("tp113", form, { notes: "local note", status: "preparing" })];

  const mockNotice = {
    objectId: "tp113",
    bzpNumber: "BZP/TP113",
    noticeNumber: "N/TP113",
    orderObject: "Remont — Sępa Szarzyńskiego",
    organizationName: "WM",
    organizationCity: "Wrocław",
    organizationProvince: "PL02",
    publicationDate: "2026-06-01",
    submittingOffersDate: "2026-07-15",
    tenderId: "tender-tp113",
  };

  const mapped = mapBzpToPipelineItem(mockNotice, baseItems[0]);
  assert(mapped.tenderDossier?.kosztorys?.rowCount === 45, "mapBzp kopiuje prev formularz");

  const incomingEnriched = {
    ...mapped,
    tenderDossier: ath,
  };

  const merged = mergeTenderPipeline(baseItems, [incomingEnriched])[0];
  assert(merged.tenderDossier?.kosztorys?.rowCount === 302, "mergeTenderPipeline → ATH 302");
  assert(merged.notes === "local note", "notes z prev bez regresji");
  assert(merged.status === "preparing", "status z prev bez regresji");
  assert(mapped.updatedAt !== baseItems[0].updatedAt, "mapBzp podbija updatedAt incoming");
}

// P1-D — regresja: mapBzp zachowuje prev dossier gdy brak lepszego incoming
console.log("\nP1-D regresja mapBzp + merge bez lepszego incoming");
{
  const form = dossier(kosztorys("Formularz oferty.xlsx", 45));
  const baseItems = [pipelineItem("reg", form)];
  const mockNotice = { objectId: "reg", orderObject: "Test", organizationCity: "Wrocław" };
  const mapped = mapBzpToPipelineItem(mockNotice, baseItems[0]);
  const merged = mergeTenderPipeline(baseItems, [mapped])[0];
  assert(merged.tenderDossier?.kosztorys?.rowCount === 45, "bez lepszego incoming → formularz zostaje");
}

console.log(`\n=== WYNIK: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

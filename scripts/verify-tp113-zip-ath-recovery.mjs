/**
 * TP113 post-deploy validation — dossier + discovery
 * npx vite-node scripts/verify-tp113-zip-ath-recovery.mjs
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  };
}

import { loadEnv } from "vite";
import { fetchTenderDocuments } from "../src/lib/tenders-bzp.ts";
import { buildTenderDocCandidates, parseTenderDossierDocuments } from "../src/lib/tender-document-resolver.ts";
import { discoverBestCostDocument } from "../src/lib/tender-cost-discovery.ts";

const TP113_TENDER_ID = "08dec13d-5547-aa6d-5fad-9500015c4ea0";
const TP113_NOTICE = "2026/BZP 00273812/01";

async function main() {
  const docs = await fetchTenderDocuments(TP113_TENDER_ID, TP113_NOTICE);
  const candidates = await buildTenderDocCandidates(TP113_TENDER_ID, docs);
  const zipInner = candidates.filter((c) => c.zipInnerPath);
  const discovery = discoverBestCostDocument(
    candidates.map((c) => ({ filename: c.filename, score: c.score })),
  );

  console.log("=== TP113 VALIDATION ===\n");
  console.log("zipInnerCount:", zipInner.length);
  console.log("zipInner ATH:", zipInner.filter((c) => /\.ath$/i.test(c.filename)).map((c) => c.filename));
  console.log("discovery:", JSON.stringify(discovery, null, 2));

  const dossier = await parseTenderDossierDocuments(TP113_TENDER_ID, docs, {
    tenderTitle: "REMONT I PRZEBUDOWA BUDYNKU WIELORODZINNEGO PRZY UL. SĘPA SZARZYŃSKIEGO 65A WE WROCŁAWIU",
  });
  const k = dossier.kosztorys;
  const cq = k?.catalogQuantities ?? [];

  console.log("\n--- dossier ---");
  console.log("zipInnerCount (scan):", dossier.zipInnerCount);
  console.log("zipUnpackOk:", dossier.zipUnpackOk);
  console.log("sourceFilename:", k?.sourceFilename);
  console.log("rowCount:", k?.rows?.length ?? 0);
  console.log("catalogQuantities:", cq.length);
  console.log("kosztorys.ok:", k?.ok);
  console.log("costDiscovery:", JSON.stringify(dossier.costDiscovery, null, 2));

  const bad = /formularz\s+ofert/i.test(k?.sourceFilename || "");
  const athWin = /\.ath/i.test(discovery.source || "") || /\.ath/i.test(k?.sourceFilename || "");
  console.log("\n--- verdict ---");
  console.log("formularz NOT winner:", !bad);
  console.log("ATH discovery:", athWin);
  console.log("real rows (>5):", (k?.rows?.length ?? 0) > 5 || cq.length > 5);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * P0-ATH-PREVIEW-HOTFIX — smoke: archive unpack + quick access preview item.
 * npx vite-node scripts/test-p0-ath-preview-hotfix.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { read7zEntry } from "../src/lib/wgdom-7z-archive.ts";
import { is7zFilename, isZipFilename } from "../src/lib/tenders-bzp-filename.ts";
import {
  buildAthQuickAccessContext,
  resolveAthPreviewItem,
} from "../src/lib/tender-ath-quick-access.ts";
import {
  classifyCostDocument,
  resolvedCostStatusDisplay,
} from "../src/lib/tender-data-ssot.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bytes7z = new Uint8Array(readFileSync(join(__dirname, "fixtures/test.7z")));

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

async function readZipEntry(bytes, innerPath) {
  const zip = await JSZip.loadAsync(bytes);
  const entry = zip.file(innerPath);
  if (!entry) return null;
  return new Uint8Array(await entry.async("uint8array"));
}

/** Mirror fixed resolveDocumentBytes — avoids pdfjs import in Node smoke. */
async function resolveDocumentBytes(
  loadBytes,
  documentIndex,
  filename,
  zipInnerPath,
  outerArchiveFilename,
) {
  const outer = await loadBytes(documentIndex);
  const archiveName = outerArchiveFilename ?? filename.split(" → ")[0] ?? filename;
  if (zipInnerPath) {
    if (is7zFilename(archiveName)) {
      const inner = await read7zEntry(outer, zipInnerPath);
      if (inner) return inner;
    } else {
      const inner = await readZipEntry(outer, zipInnerPath);
      if (inner) return inner;
    }
  }
  return outer;
}

async function makeZip(innerName, innerContent) {
  const zip = new JSZip();
  zip.file(innerName, innerContent);
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}

const ZIP_ERR = /Can't find end of central directory/i;

async function smokeResolve(name, outerBytes, innerFilename, opts = {}) {
  const { zipInnerPath, outerArchiveFilename } = opts;
  const loadBytes = async () => outerBytes;
  try {
    const result = await resolveDocumentBytes(
      loadBytes,
      0,
      innerFilename,
      zipInnerPath,
      zipInnerPath ? outerArchiveFilename : undefined,
    );
    assert(`${name} — no JSZip error`, result != null && result.byteLength > 0);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    assert(`${name} — no throw (${msg})`, false);
    return null;
  }
}

const athStandalone = new TextEncoder().encode("ATH standalone content");
await smokeResolve("1 ATH standalone", athStandalone, "przedmiar.ath");

const zipAthBytes = await makeZip("przedmiar.ath", athStandalone);
await smokeResolve("2 ATH in ZIP", zipAthBytes, "przedmiar.ath", {
  zipInnerPath: "przedmiar.ath",
  outerArchiveFilename: "dok.zip",
});

await smokeResolve("3 ATH in 7Z", bytes7z, "sample.ath", {
  zipInnerPath: "sample.ath",
  outerArchiveFilename: "UMiG.7z",
});

const pdfPrInner = "Rynek_IS_W_PR_20260410.pdf";
const pdfPrBytes = new TextEncoder().encode("%PDF-1.4 przedmiar");
const zipPdfPr = await makeZip(pdfPrInner, pdfPrBytes);
await smokeResolve("4 PDF przedmiar in ZIP", zipPdfPr, pdfPrInner, {
  zipInnerPath: pdfPrInner,
  outerArchiveFilename: "przedmiary.zip",
});

await smokeResolve("5 PDF przedmiar in 7Z", bytes7z, pdfPrInner, {
  zipInnerPath: "sample.pdf",
  outerArchiveFilename: "Dokumentacja.7z",
});

const kosztorysPdf = "kosztorys.pdf";
const zipKoszt = await makeZip(kosztorysPdf, pdfPrBytes);
await smokeResolve("6 PDF kosztorys in ZIP", zipKoszt, kosztorysPdf, {
  zipInnerPath: kosztorysPdf,
  outerArchiveFilename: "archiwum.zip",
});

await smokeResolve("7 PDF kosztorys in 7Z", bytes7z, kosztorysPdf, {
  zipInnerPath: "sample.pdf",
  outerArchiveFilename: "pakiet.7z",
});

let oldBugZipErr = false;
try {
  await resolveDocumentBytes(
    async () => bytes7z,
    0,
    pdfPrInner,
    "sample.pdf",
    undefined,
  );
} catch (e) {
  oldBugZipErr = ZIP_ERR.test(e instanceof Error ? e.message : String(e));
}
assert("8 old bug path — JSZip error without outerArchive", oldBugZipErr);

const fixedBytes = await resolveDocumentBytes(
  async () => bytes7z,
  0,
  pdfPrInner,
  "sample.pdf",
  "UMiG.7z",
);
assert("9 fix — outerArchiveFilename enables 7Z unpack", fixedBytes != null && fixedBytes.byteLength > 0);

const pdfItem = {
  tenderId: "t-pdf",
  bzpDocuments: [{ index: 0, filename: "UMiG.7z" }],
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: pdfPrInner,
      sourceDocumentIndex: 0,
      zipInnerPath: "II. PRZEDMIARY/Rynek_IS_W_PR_20260410.pdf",
      totalValue: "0",
      currency: "PLN",
      rowCount: 12,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: new Date().toISOString(),
    },
    scanSummary: {
      kosztorysFound: true,
      estimateFound: false,
      valueFound: false,
      totalDocuments: 1,
      scanned: 1,
      parsed: 1,
      byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 1, other: 0 },
      sevenZipCount: 1,
      criteriaFound: false,
      parsedAt: new Date().toISOString(),
    },
    brief: {
      fields: [],
      scopeDescription: null,
      location: null,
      procedureType: null,
      offerDeadline: null,
      offerOpening: null,
      contractPeriod: null,
      paymentTerms: null,
      contactInfo: null,
      additionalNotes: [],
      builtAt: "",
    },
    builtAt: new Date().toISOString(),
  },
};

const pdfClass = classifyCostDocument(pdfItem);
assert("FIX-1 pdf classify type PDF", pdfClass?.type === "PDF");
assert("FIX-1 pdf label not ATH", resolvedCostStatusDisplay(pdfItem).display.includes("Przedmiar PDF"));

const preview = resolveAthPreviewItem(pdfItem);
assert("FIX-2 preview item", preview?.kind === "tenderBzp");
assert("FIX-2 outer archive", preview?.outerArchiveFilename === "UMiG.7z");
assert("FIX-2 inner filename", preview?.filename === pdfPrInner);

const athCtx = buildAthQuickAccessContext(pdfItem);
assert("FIX-4 PDF quick access enabled", athCtx.enabled === true);
assert("FIX-4 PDF preview ready", athCtx.previewItem != null);

const athOnly = {
  ...pdfItem,
  tenderDossier: {
    ...pdfItem.tenderDossier,
    kosztorys: {
      ...pdfItem.tenderDossier.kosztorys,
      sourceFilename: "sample.ath",
      zipInnerPath: "sample.ath",
    },
    scanSummary: {
      ...pdfItem.tenderDossier.scanSummary,
      costDiscovery: { found: true, type: "zip_ath", source: "UMiG.7z → sample.ath", confidence: 0.99 },
    },
  },
};
assert("FIX-4 ATH quick access enabled", buildAthQuickAccessContext(athOnly).enabled === true);

console.log(`\nP0 ATH preview hotfix: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);

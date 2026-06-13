/**
 * P2-H.3 — 7Z archive support tests.
 * npx vite-node scripts/test-tender-7z-archive.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  list7zFiles,
  read7zEntry,
  pickBestFrom7zBytes,
} from "../src/lib/wgdom-7z-archive.ts";
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
} from "../src/lib/tender-cost-discovery.ts";
import {
  buildKosztorysStatusLine,
  countDocumentsByType,
} from "../src/lib/tender-dossier-pipeline.ts";
import { scoreTenderFilename } from "../src/lib/tenders-bzp-filename.ts";
import { isPdfFilename } from "../src/lib/ath-parser.ts";
import { isXlsxFilename } from "../src/lib/tenders-bzp-filename.ts";

function simulate7zCandidates(outerFilename, innerEntries, documentIndex = 0) {
  const candidates = [{
    documentIndex,
    filename: outerFilename,
    score: scoreTenderFilename(outerFilename),
  }];
  for (const entry of innerEntries) {
    candidates.push({
      documentIndex,
      filename: `${outerFilename} → ${entry.filename}`,
      zipInnerPath: entry.path,
      score: entry.score,
    });
  }
  return candidates;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture7z = readFileSync(join(__dirname, "fixtures/test.7z"));
const bytes7z = new Uint8Array(fixture7z);

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// 1. list7zFiles
const listed = await list7zFiles(bytes7z);
assert("list7zFiles count", listed.length === 3);
assert("list7zFiles has ath", listed.some((e) => e.filename === "sample.ath"));
assert("list7zFiles has xlsx", listed.some((e) => e.filename === "sample.xlsx"));
assert("list7zFiles has pdf", listed.some((e) => e.filename === "sample.pdf"));
assert("list7zFiles ath scored highest", listed[0].filename === "sample.ath");

// 2. read7zEntry
const athBytes = await read7zEntry(bytes7z, "sample.ath");
assert("read7zEntry ath", athBytes != null && athBytes.byteLength > 10);
const pdfBytes = await read7zEntry(bytes7z, "sample.pdf");
assert("read7zEntry pdf", pdfBytes != null && isPdfFilename("sample.pdf"));
const xlsxBytes = await read7zEntry(bytes7z, "sample.xlsx");
assert("read7zEntry xlsx", xlsxBytes != null && isXlsxFilename("sample.xlsx"));

// 3. pickBestFrom7zBytes
const picked = await pickBestFrom7zBytes(bytes7z, "Dokumentacja.7z");
assert("pickBestFrom7zBytes", picked?.filename.includes("sample.ath"));
assert("pickBestFrom7zBytes innerPath", picked?.innerPath === "sample.ath");

// 4. buildTenderDocCandidates logic (7z inner expansion)
const outerName = "Dokumentacja techniczna załącznik 8 do SWZ.7z";
const candidates = simulate7zCandidates(outerName, listed);
assert("buildTenderDocCandidates outer", candidates.some((c) => c.filename.includes(".7z") && !c.zipInnerPath));
assert("buildTenderDocCandidates inner ath", candidates.some((c) => c.filename.includes("sample.ath") && c.zipInnerPath));
assert("buildTenderDocCandidates inner xlsx", candidates.some((c) => c.filename.includes("sample.xlsx")));
assert("buildTenderDocCandidates inner pdf", candidates.some((c) => c.filename.includes("sample.pdf")));

// 5. discoverBestCostDocument
const cost = discoverBestCostDocument(candidates);
assert("discoverBestCostDocument found", cost.found === true);
assert("discoverBestCostDocument zip_ath", cost.type === "zip_ath");
assert("discoverBestCostDocument source ath", cost.source.includes("sample.ath"));

// 6. classifyCostDocumentType inner
const athType = classifyCostDocumentType(`${outerName} → sample.ath`);
assert("classify inner ath", athType.type === "zip_ath");
const xlsxType = classifyCostDocumentType(`${outerName} → sample.xlsx`);
assert("classify inner xlsx", xlsxType.type === "zip_xlsx");

// 7. buildKosztorysStatusLine
const scanWithKosztorys = {
  kosztorysFound: true,
  sevenZipCount: 1,
  byType: countDocumentsByType([outerName]),
  costDiscovery: cost,
};
assert("kosztorys status found", buildKosztorysStatusLine(scanWithKosztorys).includes("Znaleziony"));

const scanWithoutUnpack = {
  kosztorysFound: false,
  sevenZipCount: 1,
  sevenZUnpackOk: false,
  sevenZInnerCount: 0,
  byType: countDocumentsByType([outerName]),
  costDiscovery: null,
};
assert("kosztorys status 7z unpack fail", buildKosztorysStatusLine(scanWithoutUnpack).includes("Błąd odczytu"));

const scanUnpackNoAth = {
  kosztorysFound: false,
  sevenZipCount: 1,
  sevenZUnpackOk: true,
  sevenZInnerCount: 3,
  byType: countDocumentsByType([outerName]),
  costDiscovery: null,
};
assert("kosztorys status 7z no ath", buildKosztorysStatusLine(scanUnpackNoAth).includes("Nie znaleziono kosztorysu ATH"));

console.log(`\n7Z archive tests: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);

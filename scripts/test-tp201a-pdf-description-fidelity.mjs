/**
 * TP201A — PDF Recovery description fidelity (KNR code boundary).
 * npx vite-node scripts/test-tp201a-pdf-description-fidelity.mjs
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}

import {
  parsePdfPrzedmiarLine,
  parsePdfPrzedmiarHeuristic,
  extractKnrCodeSpan,
} from "../src/lib/pdf-przedmiar-heuristic.ts";
import { fetchTenderDocuments, fetchTenderZipEntryBytes, base64ToBytes } from "../src/lib/tenders-bzp.ts";

const TRUNCATED_STARTS = ["óba ", "ładek ", "ż oprawek", "ągów "];

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

function assertDescContains(name, line, needle) {
  const row = parsePdfPrzedmiarLine(line);
  assert(`${name} parsed`, row != null);
  assert(`${name} desc contains "${needle}"`, row?.description?.includes(needle) ?? false);
  assert(`${name} code excludes desc word`, !row?.code?.includes(needle.split(" ")[0]) ?? true);
}

console.log("=== TP201A PDF Description Fidelity ===\n");

// TP201A-1 — Próba szczelności
assertDescContains(
  "TP201A-1",
  "50 d.2.1 KNR INSTAL 0205-01 Próba szczelności instalacji gazowej na ciśnienie lokal. 1 lokal. 1.00",
  "Próba szczelności",
);
const span1 = extractKnrCodeSpan("KNR INSTAL 0205-01 Próba szczelności instalacji");
assert("TP201A-1 code", span1?.code === "KNR INSTAL 0205-01");

// TP201A-2 — Wymiana wkładek
assertDescContains(
  "TP201A-2",
  "49 d.1.8 KNR 4-01 0919-28 analogia Wymiana wkładek do zamków drzwi wejściowych szt 2",
  "Wymiana wkładek",
);
assert("TP201A-2 no ładek start", !parsePdfPrzedmiarLine(
  "49 d.1.8 KNR 4-01 0919-28 analogia Wymiana wkładek do zamków drzwi wejściowych szt 2",
)?.description?.startsWith("ładek"));

// TP201A-3 — Demontaż oprawek
assertDescContains(
  "TP201A-3",
  "87 d.3.1 KNR 4-03 1135-03 Demontaż oprawek zwykłych ściennych szt 4",
  "Demontaż oprawek",
);
assert("TP201A-3 no ż oprawek start", !parsePdfPrzedmiarLine(
  "87 d.3.1 KNR 4-03 1135-03 Demontaż oprawek zwykłych ściennych szt 4",
)?.description?.startsWith("ż oprawek"));

// TP201A-4 — Izolacja rurociągów
assertDescContains(
  "TP201A-4",
  "69 d.2.4 KNR 0-34 0101-03 Izolacja rurociągów śr.12-22 mm otulinami Thermaflex m 10 m 10.00",
  "Izolacja rurociągów",
);
assert("TP201A-4 no ągów start", !parsePdfPrzedmiarLine(
  "69 d.2.4 KNR 0-34 0101-03 Izolacja rurociągów śr.12-22 mm otulinami Thermaflex m 10 m 10.00",
)?.description?.startsWith("ągów"));

// TP201A-5 — TP182 live fixture
async function tp182Fixture() {
  const OCDS = "ocds-148610-83a559be-df3f-4e5f-8935-44ef8bc31e15";
  const NOTICE = "2026/BZP 00296679/01";
  const INNER = "TP182 Zal. nr 3_Opis przedmiotu zamówienia/Zadanie 1/Nowowiejska 86a_27/Nowowiejska 86a_27 - przedmiar.pdf";

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const docs = await fetchTenderDocuments(OCDS, NOTICE);
  const zip = docs.find((d) => d.index === 6);
  if (!zip) throw new Error("TP182 ZIP not found");

  const ent = await fetchTenderZipEntryBytes({
    tenderId: OCDS,
    documentIndex: 6,
    innerPath: INNER,
    downloadUrl: zip.downloadUrl,
    sourcePageUrl: zip.sourcePageUrl,
  });
  const bytes = base64ToBytes(ent.base64);
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  const parts = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" ").replace(/\s+/g, " ").trim());
  }
  const text = parts.join("\n");
  const parsed = parsePdfPrzedmiarHeuristic(text, { likelyScan: false, noTextLayer: false });
  const rows = parsed.rows;

  assert("TP201A-5 rowCount >= 120", rows.length >= 120);
  assert("TP201A-5 rowCount ~123", rows.length >= 123);

  const badTrunc = rows.filter((r) =>
    TRUNCATED_STARTS.some((frag) => r.description.trim().startsWith(frag)),
  );
  assert("TP201A-5 no truncated golden fragments", badTrunc.length === 0);

  const proba = rows.find((r) => r.description.includes("Próba szczelności"));
  assert("TP201A-5 has Próba szczelności row", proba != null);
  assert("TP201A-5 Próba qty", proba?.quantity === "1.00" || proba?.quantity === "1");

  const wklad = rows.find((r) => r.description.includes("Wymiana wkładek") || r.description.includes("wkładek do zamków"));
  assert("TP201A-5 has wkładki row", wklad != null);

  const demont = rows.find((r) => r.description.includes("Demontaż oprawek"));
  assert("TP201A-5 has Demontaż oprawek row", demont != null);

  const izol = rows.find((r) => r.description.includes("Izolacja rurociągów") || r.description.includes("rurociągów śr"));
  assert("TP201A-5 has Izolacja rurociągów row", izol != null);

  const lowercaseStart = rows.filter((r) => /^[a-ząćęłńóśźż]/.test(r.description.trim()));
  assert("TP201A-5 lowercase-start desc < 20%", lowercaseStart.length < rows.length * 0.2);

  console.log(`TP182 rows: ${rows.length}, lowercase-start: ${lowercaseStart.length}, bad trunc: ${badTrunc.length}`);
}

await tp182Fixture();

console.log(`\nTP201A PDF description fidelity: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);

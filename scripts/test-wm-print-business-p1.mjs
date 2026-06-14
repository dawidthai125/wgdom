/**
 * P1 Business — Odbiory WM Druk: podmiana zmiennych + ZIP (Gorlicka 26/6).
 * Symuluje wgrane szablony DOCX/PDF bez storage (in-memory fixtures).
 */
import JSZip from "jszip";
import { parseJobAddressParts, wmPrintZipBaseName } from "../src/lib/wm-print/address-vars.ts";
import { generateDocxFromTemplate, generatePdfTextFromTemplate } from "../src/lib/wm-print/generate-docx.ts";
import { buildWmPrintVariableMap, formatWmPrintDate } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import { seedWmPrintTemplatesIfEmpty } from "../src/lib/wm-print/default-templates.ts";
import { getEnabledWmPrintTemplates } from "../src/lib/wm-print/templates.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

async function makeMinimalDocx(bodyText) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t xml:space="preserve">${bodyText}</w:t></w:r></w:p></w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function readDocxText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  return xml ?? "";
}

const job = { address: "Gorlicka 26", flatNumber: "6" };
const opts = { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") };
const vars = buildWmPrintVariableMap(job, DEFAULT_WM_PRINT_SETTINGS, opts);

console.log("WM Print P1 BUSINESS — Gorlicka 26 m.6\n");

assert(vars.JOB_ADDRESS === "Gorlicka 26/6", "JOB_ADDRESS → Gorlicka 26/6");
assert(vars.JOB_STREET === "Gorlicka", "JOB_STREET → Gorlicka");
assert(vars.JOB_BUILDING === "26", "JOB_BUILDING → 26");
assert(vars.JOB_APARTMENT === "6", "JOB_APARTMENT → 6");
assert(vars.DATE === "14.06.2026 r.", "DATE → 14.06.2026 r.");
assert(vars.JOB_CITY === "Wrocław", "JOB_CITY → Wrocław");

const templateBodies = {
  "Oświadczenie kierownika": "Adres: {{JOB_ADDRESS}} Ulica: {{JOB_STREET}} Bud: {{JOB_BUILDING}} Lok: {{JOB_APARTMENT}} Data: {{DATE}}",
  "Oświadczenie o zatrudnieniu": "Pracownik — {{JOB_ADDRESS}} — {{DATE}}",
  "Oświadczenie podwykonawcy": "Podwykonawca — {{JOB_STREET}} {{JOB_BUILDING}}/{{JOB_APARTMENT}} Data: {{DATE}}",
};

const generated = [];
for (const [name, body] of Object.entries(templateBodies)) {
  const tplBytes = await makeMinimalDocx(body);
  const out = await generateDocxFromTemplate(tplBytes, vars);
  const xml = await readDocxText(out);
  assert(xml.includes("Gorlicka 26/6"), `${name}: JOB_ADDRESS w DOCX`);
  assert(xml.includes("Gorlicka") && !xml.includes("{{JOB_STREET}}"), `${name}: JOB_STREET podstawione`);
  assert(xml.includes("14.06.2026 r."), `${name}: DATE podstawione`);
  generated.push({ name, bytes: out, fileName: `${name.replace(/\s+/g, "-")}.docx` });
}

const pdfTpl = `ZI {{JOB_STREET}} {{JOB_BUILDING}} {{JOB_APARTMENT}} {{DATE}}`;
const pdfOut = await generatePdfTextFromTemplate(new TextEncoder().encode(pdfTpl), vars);
const pdfText = new TextDecoder("latin1").decode(pdfOut);
assert(pdfText.includes("Gorlicka") && pdfText.includes("26") && pdfText.includes("6"), "ZI PDF: pola adresu");
assert(!pdfText.includes("{{JOB_STREET}}"), "ZI PDF: brak surowych placeholderów");

const zipName = `${wmPrintZipBaseName(job.address, job.flatNumber)}_${DEFAULT_WM_PRINT_SETTINGS.zipNameSuffix}.zip`;
assert(zipName === "GORLICKA_26_6_ODBIOR_WM.zip", `ZIP nazwa: ${zipName}`);

const zip = new JSZip();
const templates = seedWmPrintTemplatesIfEmpty([]);
const enabled = getEnabledWmPrintTemplates(templates);
let order = 10;
for (const g of generated) {
  zip.file(`${String(order).padStart(2, "0")}-${g.fileName}`, g.bytes);
  order += 10;
}
zip.file("04-ZI.pdf", pdfOut);
const zipBytes = await zip.generateAsync({ type: "uint8array" });
assert(zipBytes.byteLength > 500, "ZIP wygenerowany (bytes > 500)");

const zipRead = await JSZip.loadAsync(zipBytes);
const names = Object.keys(zipRead.files).filter((n) => !n.endsWith("/"));
assert(names.length >= 4, `ZIP zawiera ${names.length} plików (>= 4)`);

const firstDocx = await zipRead.file(names.find((n) => n.endsWith(".docx")))?.async("uint8array");
if (firstDocx) {
  const xml = await readDocxText(firstDocx);
  assert(xml.includes("Gorlicka 26/6"), "ZIP → DOCX wewnątrz ma poprawny adres");
}

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);

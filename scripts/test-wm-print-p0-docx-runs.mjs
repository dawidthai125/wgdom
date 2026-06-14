/**
 * P0-C — DOCX split-run Word XML + regresja normalnego placeholdera.
 */
import JSZip from "jszip";
import {
  generateDocxFromTemplate,
  substituteParagraphWmPrintVariables,
  substituteWmPrintVariablesInDocxXml,
} from "../src/lib/wm-print/generate-docx.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

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

async function makeDocxXml(bodyInner) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyInner}</w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function readDocxXml(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file("word/document.xml")?.async("string") ?? "";
}

const vars = buildWmPrintVariableMap(
  { address: "Gorlicka 26", flatNumber: "6" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
);

console.log("WM Print P0-C — DOCX split-run\n");

// 1. Split-run jak w Wordzie: {{JOB_ | ADDRESS}}
const splitRunPara = `<w:p>
  <w:r><w:t>Pracownik — </w:t></w:r>
  <w:r><w:t>{{JOB_</w:t></w:r>
  <w:r><w:t>ADDRESS}}</w:t></w:r>
  <w:r><w:t> — data {{DATE}}</w:t></w:r>
</w:p>`;

const splitXml = substituteWmPrintVariablesInDocxXml(splitRunPara, vars);
assert(splitXml.includes("Gorlicka 26/6"), "split-run XML: JOB_ADDRESS podstawione");
assert(!splitXml.includes("{{JOB_ADDRESS}}"), "split-run XML: brak surowego placeholdera");
assert(!splitXml.includes("{{JOB_"), "split-run XML: brak fragmentu JOB_");
assert(splitXml.includes("14.06.2026 r."), "split-run XML: DATE podstawione");

const splitOnly = substituteParagraphWmPrintVariables(splitRunPara, vars);
assert(splitOnly.includes("Gorlicka 26/6"), "substituteParagraph: split-run OK");

// 2. Normalny placeholder w jednym runie
const normalPara = `<w:p><w:r><w:t>Adres: {{JOB_ADDRESS}} Data: {{DATE}}</w:t></w:r></w:p>`;
const normalXml = substituteWmPrintVariablesInDocxXml(normalPara, vars);
assert(normalXml.includes("Gorlicka 26/6"), "normalny placeholder: JOB_ADDRESS");
assert(normalXml.includes("14.06.2026 r."), "normalny placeholder: DATE");
assert(!normalXml.includes("{{"), "normalny placeholder: brak {{");

// 3. Pełny DOCX (Oświadczenie o zatrudnieniu — scenariusz)
const zatrudnienieBody = `<w:p>
  <w:r><w:t>Oświadczenie — </w:t></w:r>
  <w:r><w:t>{{JOB_</w:t></w:r>
  <w:r><w:t>ADDRESS}}</w:t></w:r>
</w:p>
<w:p><w:r><w:t>Data: {{DATE}} Ulica: {{JOB_STREET}}</w:t></w:r></w:p>`;

const docxIn = await makeDocxXml(zatrudnienieBody);
const docxOut = await generateDocxFromTemplate(docxIn, vars);
const xmlOut = await readDocxXml(docxOut);
assert(xmlOut.includes("Gorlicka 26/6"), "DOCX zatrudnienie: JOB_ADDRESS");
assert(xmlOut.includes("Gorlicka") && !xmlOut.includes("{{JOB_STREET}}"), "DOCX zatrudnienie: JOB_STREET");
assert(!xmlOut.includes("{{JOB_ADDRESS}}"), "DOCX zatrudnienie: brak {{JOB_ADDRESS}}");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);

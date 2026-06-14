/**
 * P0.1A — DOCX fix: bezpieczne czyszczenie <w:t>, split-run, proofErr, prod szablony.
 */
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import {
  generateDocxFromTemplate,
  substituteParagraphWmPrintVariables,
  substituteWmPrintVariablesInDocxXml,
  setWtTextContent,
  validateWmPrintDocxXml,
  validateWmPrintDocxBytes,
  listDocxXmlPartPaths,
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

const vars = buildWmPrintVariableMap(
  { address: "Sępa Szarzyńskiego 12", flatNumber: "4" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
);

function domParseOk(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return doc.getElementsByTagName("parsererror").length === 0;
}

const PROD_URLS = {
  kierownik:
    "https://bdpygdvfgbggermvqtys.supabase.co/storage/v1/object/public/make-0afb8820-photos/jobs/wm-print/template-c8ec0bd6-f6a6-42ce-94d5-9605e7c00217-e724de40-00f1-4d8d-9997-7fcb65c1febb.docx",
  zatrudnieniu:
    "https://bdpygdvfgbggermvqtys.supabase.co/storage/v1/object/public/make-0afb8820-photos/jobs/wm-print/template-c8ec0bd6-f6a6-42ce-94d5-9605e7c00217-046ca8c8-a7cf-4b7e-9bf7-d05b7dfacfbd.docx",
};

console.log("WM Print P0.1A — DOCX XML fix\n");

// 1. setWtTextContent — xml:space preserve + pojedyncza spacja (regresja 2.59.9)
const preserveTag = '<w:t xml:space="preserve"> </w:t>';
const cleared = setWtTextContent(preserveTag, "");
assert(cleared === '<w:t xml:space="preserve"></w:t>', "xml:space preserve: tag nietknięty po czyszczeniu");
assert(!cleared.includes("w:txml:space"), "xml:space preserve: brak w:txml:space");
const filled = setWtTextContent(preserveTag, "Sępa Szarzyńskiego 12/4");
assert(
  filled === '<w:t xml:space="preserve">Sępa Szarzyńskiego 12/4</w:t>',
  "xml:space preserve: podmiana treści OK",
);

// 2. split-run placeholder
const splitPara = `<w:p>
  <w:r><w:t>Przy ul. </w:t></w:r>
  <w:r><w:t>{{JOB_</w:t></w:r>
  <w:r><w:t>ADDRESS}}</w:t></w:r>
</w:p>`;
const splitOut = substituteParagraphWmPrintVariables(splitPara, vars);
assert(splitOut.includes("Sępa Szarzyńskiego 12/4"), "split-run: JOB_ADDRESS podstawione");
assert(!splitOut.includes("{{JOB_"), "split-run: brak fragmentu placeholdera");
assert(validateWmPrintDocxXml(splitOut).ok, "split-run: XML valid");
assert(domParseOk(`<w:body xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${splitOut}</w:body>`), "split-run: DOMParser OK");

// 3. proofErr między runami (prod zatrudnieniu pattern)
const proofPara = `<w:p>
  <w:r><w:t>ul.</w:t></w:r>
  <w:r><w:t xml:space="preserve"> </w:t></w:r>
  <w:r><w:t>{{</w:t></w:r>
  <w:proofErr w:type="spellStart"/>
  <w:r><w:t>JOB_ADDRESS</w:t></w:r>
  <w:proofErr w:type="spellEnd"/>
  <w:r><w:t xml:space="preserve">}} </w:t></w:r>
  <w:r><w:t xml:space="preserve"> </w:t></w:r>
  <w:r><w:t>we Wrocławiu</w:t></w:r>
</w:p>`;
const proofOut = substituteParagraphWmPrintVariables(proofPara, vars);
assert(proofOut.includes("Sępa Szarzyńskiego 12/4"), "proofErr: JOB_ADDRESS podstawione");
assert(proofOut.includes("<w:proofErr"), "proofErr: elementy zachowane");
assert(!proofOut.includes("w:txml:space"), "proofErr: brak uszkodzonego tagu");
assert(validateWmPrintDocxXml(proofOut).ok, "proofErr: XML valid");
assert(domParseOk(`<w:body xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${proofOut}</w:body>`), "proofErr: DOMParser OK");

// 4. regresja — normalny placeholder + DATE + JOB_STREET
const normalPara = `<w:p><w:r><w:t>Adres: {{JOB_ADDRESS}} Ulica: {{JOB_STREET}} Data: {{DATE}}</w:t></w:r></w:p>`;
const normalOut = substituteWmPrintVariablesInDocxXml(normalPara, vars);
assert(normalOut.includes("Sępa Szarzyńskiego 12/4"), "regresja: JOB_ADDRESS");
assert(normalOut.includes("Sępa Szarzyńskiego") && !normalOut.includes("{{JOB_STREET}}"), "regresja: JOB_STREET");
assert(normalOut.includes("14.06.2026 r."), "regresja: DATE");
assert(!normalOut.includes("{{"), "regresja: brak {{");

// 5. Produkcja — Oświadczenie kierownika
console.log("\n  Prod: Oświadczenie kierownika");
const kierBytes = new Uint8Array(await (await fetch(PROD_URLS.kierownik)).arrayBuffer());
const kierGen = await generateDocxFromTemplate(kierBytes, vars);
const kierVal = await validateWmPrintDocxBytes(kierGen);
assert(kierVal.ok, `prod kierownik: validateWmPrintDocxBytes (${kierVal.issues.join("; ") || "OK"})`);
const kierZip = await JSZip.loadAsync(kierGen);
const kierXml = await kierZip.file("word/document.xml").async("string");
assert(domParseOk(kierXml), "prod kierownik: DOMParser document.xml");
assert(!kierXml.includes("w:txml:space"), "prod kierownik: brak w:txml:space");
assert(kierXml.includes("Sępa Szarzyńskiego 12/4"), "prod kierownik: JOB_ADDRESS");
assert(kierXml.includes("14.06.2026 r."), "prod kierownik: DATE");
assert(!kierXml.includes("{{JOB_ADDRESS}}"), "prod kierownik: brak surowego placeholdera");

// 6. Produkcja — Oświadczenie o zatrudnieniu
console.log("\n  Prod: Oświadczenie o zatrudnieniu");
const zatrBytes = new Uint8Array(await (await fetch(PROD_URLS.zatrudnieniu)).arrayBuffer());
const zatrGen = await generateDocxFromTemplate(zatrBytes, vars);
const zatrVal = await validateWmPrintDocxBytes(zatrGen);
assert(zatrVal.ok, `prod zatrudnieniu: validateWmPrintDocxBytes (${zatrVal.issues.join("; ") || "OK"})`);
const zatrZip = await JSZip.loadAsync(zatrGen);
const zatrXml = await zatrZip.file("word/document.xml").async("string");
assert(domParseOk(zatrXml), "prod zatrudnieniu: DOMParser document.xml");
assert(!zatrXml.includes("w:txml:space"), "prod zatrudnieniu: brak w:txml:space");
assert(zatrXml.includes("Sępa Szarzyńskiego 12/4"), "prod zatrudnieniu: JOB_ADDRESS");
assert(!zatrXml.includes("{{JOB_ADDRESS}}"), "prod zatrudnieniu: brak surowego placeholdera");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);

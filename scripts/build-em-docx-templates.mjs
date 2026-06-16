/**
 * EM-P1B — buduje 5 szablonów DOCX w public/em-measurements/
 * ★ RETIRED (EM-P1R 2026-06-16) — użyj: node scripts/templatize-em-p1r-from-ssot.mjs
 * Uruchom: node scripts/build-em-docx-templates.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const ROOT = path.resolve(".");
const OUT_DIR = path.join(ROOT, "public", "em-measurements");
const SKELETON = path.join(ROOT, "audit", "wm-print-docx-fixed", "Oświadczenie bezrobotny umowa 154.docx");

function esc(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function p(text) {
  return `<w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function tc(text) {
  return `<w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>${p(text)}</w:tc>`;
}

function tr(cells) {
  return `<w:tr>${cells.map((c) => tc(c)).join("")}</w:tr>`;
}

function tbl(rows) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${rows.join("")}</w:tbl>`;
}

const DOC_OPEN = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>`;
const DOC_CLOSE = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;

function headerBlock3x3() {
  return tbl([
    tr(["NR. {{RAP_NO}}", "Wykonawca: {{EXECUTOR}}", "Data pomiaru {{MEASUREMENT_DATE}}"]),
    tr(["Pomiarowcy: {{TECHNICIAN}}", "{{TECHNICIAN_LICENSE}}", ""]),
    tr([
      "Miejsce pomiaru: {{ADDRESS}}",
      "",
      "Pomiar wykonano miernikiem: {{METER_MODEL}} nr {{METER_SERIAL}}",
    ]),
  ]);
}

const TEMPLATES = {
  "protokol.template.docx": `${DOC_OPEN}
${p("PROTOKÓŁ Z POMIARÓW OCHRONNYCH NR {{RAP_NO}}")}
${p("Przyczyna pomiarów: {{MEASUREMENT_CAUSE}}")}
${p("Data wykonania protokołu: {{PROTOCOL_DATE}}")}
${p("Data wykonania pomiarów: {{MEASUREMENT_DATE}}")}
${p("Użytkownik i miejsce: {{ADDRESS}}")}
${p("Pomiarowiec: {{TECHNICIAN}} · Miernik: {{METER_MODEL}} nr {{METER_SERIAL}}")}
${p("Data kolejnego pomiaru: {{NEXT_MEASUREMENT_DATE}}")}
${tbl([
  tr(["POMIAR"]),
  tr(["BADANIE REZYSTANCJI IZOLACJI OBWODÓW"]),
  tr(["BADANIE OCHRONY PRZED PORAŻENIEM PRZEZ WYŁĄCZENIE"]),
  tr(["BADANIE PARAMETRÓW ZABEZPIECZEŃ RÓŻNICOWO-PRĄDOWYCH"]),
])}
${p("ORZECZENIE: {{VERDICT_TEXT}}")}
${DOC_CLOSE}`,

  "dane-informacyjne.template.docx": `${DOC_OPEN}
${p("NR. {{RAP_NO}} · {{MEASUREMENT_DATE}} · {{TECHNICIAN}} · {{ADDRESS}}")}
${tbl([
  tr(["OGLĘDZINY INSTALACJI ELEKTRYCZNEJ"]),
  tr(["Lp.", "PRZEDMIOT OGLĘDZIN", "OCENA"]),
  tr(["1", "SPOSÓB OCHRONY PRZED PORAŻENIEM", "{{INSPECTION_1}}"]),
  tr(["2", "DOBÓR URZĄDZEŃ I ŚRODKÓW OCHRONY WZGLĘDEM WPŁYWÓW ŚRODOWISKOWYCH", "{{INSPECTION_2}}"]),
  tr(["3", "OZNACZENIE PRZEWODÓW NEUTRALNYCH", "{{INSPECTION_3}}"]),
  tr(["4", "OZNACZENIE OBWODÓW, POŁĄCZEŃ, ŁĄCZNIKÓW I INNYCH ELEMENTÓW INSTALACJI", "{{INSPECTION_4}}"]),
  tr(["5", "POŁĄCZENIE PRZEWODÓW", "{{INSPECTION_5}}"]),
  tr(["6", "STAN URZĄDZEŃ-BRAK WIDOCZNYCH USZKODZEŃ WPŁYWAJĄCYCH NA POGORSZENIE BEZPIECZEŃST", "{{INSPECTION_6}}"]),
  tr(["7", "DOSTĘP DO URZĄDZEŃ DLA WYGODNEJ OBSŁUGI, KONSERWACJI I NAPRAW", "{{INSPECTION_7}}"]),
])}
${DOC_CLOSE}`,

  "badanie-adsc.template.docx": `${DOC_OPEN}
${headerBlock3x3()}
${tbl([tr([`({{EARTHING_SYSTEM}}) Badanie ochrony przed porażeniem przez samoczynne wyłączenie`])])}
${tbl([
  tr(["Lp.", "Symbol", "Badany punkt", "Wyłącznik", "typ", "I [A]", "Ia[A]", "Zs[Ω]", "Za[Ω]", "Ocena"]),
  tr([
    "{{ROW_SUPPLY_LP}}",
    "{{ROW_SUPPLY_SYMBOL}}",
    "{{ROW_SUPPLY_POINT}}",
    "{{ROW_SUPPLY_BREAKER}}",
    "{{ROW_SUPPLY_BREAKER_TYPE}}",
    "{{ROW_SUPPLY_IN}}",
    "{{ROW_SUPPLY_IA}}",
    "{{ROW_SUPPLY_ZS}}",
    "{{ROW_SUPPLY_ZA}}",
    "{{ROW_SUPPLY_ASSESSMENT}}",
  ]),
  tr([
    "{{ROW_LP}}",
    "{{ROW_SYMBOL}}",
    "{{ROW_POINT}}",
    "{{ROW_BREAKER}}",
    "{{ROW_BREAKER_TYPE}}",
    "{{ROW_IN}}",
    "{{ROW_IA}}",
    "{{ROW_ZS}}",
    "{{ROW_ZA}}",
    "{{ROW_ASSESSMENT}}",
  ]),
])}
${DOC_CLOSE}`,

  "badanie-rezystancji.template.docx": `${DOC_OPEN}
${headerBlock3x3()}
${tbl([tr(["BADANIE REZYSTANCJI OBWODÓW"])])}
${tbl([
  tr([
    "Lp.",
    "BADANY OBWÓD(PUNKT)",
    "L1-L2[MΩ]",
    "L2-L3[MΩ]",
    "L1-L3[MΩ]",
    "L1-L2[MΩ]",
    "L1-PE[MΩ]",
    "L2-PE[MΩ]",
    "L3-PE [MΩ]",
    "L1-N[MΩ]",
    "L2-N[MΩ]",
    "L3-N[MΩ]",
    "N-PE[MΩ]",
    "Ra [MΩ]",
    "U iso [V]",
    "OCENA",
  ]),
  tr([
    "{{ROW_SUPPLY_LP}}",
    "{{ROW_SUPPLY_CIRCUIT_NAME}}",
    "{{ROW_SUPPLY_L1L2}}",
    "{{ROW_SUPPLY_L2L3}}",
    "{{ROW_SUPPLY_L1L3}}",
    "{{ROW_SUPPLY_L1L2_ALT}}",
    "{{ROW_SUPPLY_L1PE}}",
    "{{ROW_SUPPLY_L2PE}}",
    "{{ROW_SUPPLY_L3PE}}",
    "{{ROW_SUPPLY_L1N}}",
    "{{ROW_SUPPLY_L2N}}",
    "{{ROW_SUPPLY_L3N}}",
    "{{ROW_SUPPLY_NPE}}",
    "{{ROW_SUPPLY_RA}}",
    "{{ROW_SUPPLY_U_ISO}}",
    "{{ROW_SUPPLY_ASSESSMENT}}",
  ]),
  tr([
    "{{ROW_LP}}",
    "{{ROW_CIRCUIT_NAME}}",
    "{{ROW_L1L2}}",
    "{{ROW_L2L3}}",
    "{{ROW_L1L3}}",
    "{{ROW_L1L2_ALT}}",
    "{{ROW_L1PE}}",
    "{{ROW_L2PE}}",
    "{{ROW_L3PE}}",
    "{{ROW_L1N}}",
    "{{ROW_L2N}}",
    "{{ROW_L3N}}",
    "{{ROW_NPE}}",
    "{{ROW_RA}}",
    "{{ROW_U_ISO}}",
    "{{ROW_ASSESSMENT}}",
  ]),
])}
${DOC_CLOSE}`,

  "parametry-rcd.template.docx": `${DOC_OPEN}
${headerBlock3x3()}
${tbl([tr(["PARAMETRY ZABEZPIECZEŃ RÓŻNICOWO-PRĄDOWYCH"])])}
${tbl([
  tr([
    "Lp.",
    "Symbol",
    "Nazwa obwodu",
    "RCD",
    "TYP",
    "SEL.",
    "IAN [mA]",
    "Ia[mA]",
    "tA[ms]",
    "TRCD[ms]",
    "Ud[V]",
    "Rs[Ω]",
    "Kontrola testu",
    "Ocena",
  ]),
  tr([
    "{{ROW_LP}}",
    "{{ROW_SYMBOL}}",
    "{{ROW_CIRCUIT_NAME}}",
    "{{ROW_RCD_TYPE}}",
    "{{ROW_RCD_AC_TYPE}}",
    "{{ROW_SELECTIVE}}",
    "{{ROW_IAN}}",
    "{{ROW_IA}}",
    "{{ROW_TA}}",
    "{{ROW_TRCD}}",
    "{{ROW_UD}}",
    "{{ROW_RS}}",
    "{{ROW_TEST}}",
    "{{ROW_ASSESSMENT}}",
  ]),
])}
${DOC_CLOSE}`,
};

async function buildOne(name, documentXml) {
  const skeleton = fs.readFileSync(SKELETON);
  const zip = await JSZip.loadAsync(skeleton);
  zip.file("word/document.xml", documentXml);
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(path.join(OUT_DIR, name), out);
  console.log(`  ✓ ${name} (${out.length} B)`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log("=== build-em-docx-templates ===");
for (const [name, xml] of Object.entries(TEMPLATES)) {
  await buildOne(name, xml);
}
console.log("DONE");

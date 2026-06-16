/**
 * EM-P1R — templatyzacja oryginalnych DOCX z Desktop (chirurgiczna edycja XML).
 * Nie generuje layoutu — kopiuje SSOT i podmienia dane + usuwa wiersze przykładowe.
 * Uruchom: node scripts/templatize-em-p1r-from-ssot.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const DESKTOP = "c:\\Users\\dawid\\Desktop\\Dokumenty\\Pomiary Elektryczne";
const OUT_DIR = path.resolve("public", "em-measurements");

const FILES = [
  { key: "protokol", file: "PROTOKÓŁ Z POMIARTÓW OCHRONNYCH STR1.docx", out: "protokol.template.docx" },
  { key: "dane-informacyjne", file: "DANE INFORMACYJNE.docx", out: "dane-informacyjne.template.docx" },
  { key: "badanie-adsc", file: "Badanie chrony przed porażeniem przez samoczynne wyłączenie1.docx", out: "badanie-adsc.template.docx" },
  { key: "badanie-rezystancji", file: "Badanie rezystancji obwodów.docx", out: "badanie-rezystancji.template.docx" },
  { key: "parametry-rcd", file: "parametry zabezpieczen  roznicowo-pradowych.docx", out: "parametry-rcd.template.docx" },
];

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyReplacements(xml, pairs) {
  let out = xml;
  for (const [from, to] of pairs) {
    if (from) out = out.split(from).join(to);
  }
  return out;
}

/** Scala split-run Word w akapicie i podmienia tekst (zachowuje pierwszy w:t). */
function replaceParagraphText(paragraphXml, pairs) {
  const runs = [];
  const re = /<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m;
  let combined = "";
  while ((m = re.exec(paragraphXml)) !== null) {
    runs.push({ full: m[0], attrs: m[1] || "", start: m.index });
    combined += m[2];
  }
  if (!runs.length) return paragraphXml;
  let substituted = combined;
  for (const [from, to] of pairs) {
    if (from) substituted = substituted.split(from).join(to);
  }
  if (substituted === combined) return paragraphXml;
  let result = "";
  let cursor = 0;
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    result += paragraphXml.slice(cursor, r.start);
    const text = i === 0 ? substituted : "";
    result += `<w:t${r.attrs}>${escapeXml(text)}</w:t>`;
    cursor = r.start + r.full.length;
  }
  result += paragraphXml.slice(cursor);
  return result;
}

function applyParagraphReplacements(xml, pairs) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) => replaceParagraphText(para, pairs));
}

function replaceCellText(cellXml, newText) {
  const escaped = escapeXml(newText);
  let first = true;
  let hadWt = false;
  const replaced = cellXml.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (_full, attrs, _content) => {
    hadWt = true;
    if (first) {
      first = false;
      return `<w:t${attrs || ""}>${escaped}</w:t>`;
    }
    return `<w:t${attrs || ""}></w:t>`;
  });
  if (!hadWt && newText) {
    const tcPr = replaced.match(/<w:tcPr[\s\S]*?<\/w:tcPr>/)?.[0] ?? "";
    const tcOpen = replaced.match(/^<w:tc[^>]*>/)?.[0] ?? "<w:tc>";
    return `${tcOpen}${tcPr}<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p></w:tc>`;
  }
  return replaced;
}

function splitTableRows(tableXml) {
  const rows = [];
  const trRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  let m;
  while ((m = trRe.exec(tableXml)) !== null) rows.push(m[0]);
  return rows;
}

function splitRowCells(rowXml) {
  const cells = [];
  const tcRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  let m;
  while ((m = tcRe.exec(rowXml)) !== null) cells.push(m[0]);
  return cells;
}

function rebuildRow(cells) {
  const inner = rowXmlInner(cells);
  return `<w:tr>${inner}</w:tr>`;
}

function rowXmlInner(cells) {
  return cells.join("");
}

function rebuildTable(tableOpen, rows, tableClose = "</w:tbl>") {
  const tblPrAndGrid = tableOpen.match(/^<w:tbl>[\s\S]*?(?=<w:tr)/)?.[0] ?? "<w:tbl>";
  return `${tblPrAndGrid}${rows.join("")}${tableClose}`;
}

function extractTables(xml) {
  const tables = [];
  const tblRe = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  let m;
  while ((m = tblRe.exec(xml)) !== null) tables.push({ full: m[0], index: m.index, length: m[0].length });
  return tables;
}

function replaceTableAtIndex(xml, tableIndex1, newTableXml) {
  const tables = extractTables(xml);
  const t = tables[tableIndex1 - 1];
  if (!t) throw new Error(`Table ${tableIndex1} not found`);
  return xml.slice(0, t.index) + newTableXml + xml.slice(t.index + t.length);
}

function trimTableRows(tableXml, keepCount) {
  const rows = splitTableRows(tableXml);
  const kept = rows.slice(0, keepCount);
  const open = tableXml.match(/^<w:tbl\b[\s\S]*?(?=<w:tr)/)?.[0] ?? "<w:tbl>";
  return open + kept.join("") + "</w:tbl>";
}

function setRowPlaceholders(rowXml, placeholders) {
  const cells = splitRowCells(rowXml);
  if (cells.length !== placeholders.length) {
    throw new Error(`Row cell count ${cells.length} != placeholders ${placeholders.length}`);
  }
  const newCells = cells.map((c, i) => replaceCellText(c, placeholders[i]));
  const trOpen = rowXml.match(/^<w:tr\b[^>]*>/)?.[0] ?? "<w:tr>";
  const trPr = rowXml.match(/<w:trPr[\s\S]*?<\/w:trPr>/)?.[0] ?? "";
  return `${trOpen}${trPr}${newCells.join("")}</w:tr>`;
}

const ADSC_SUPPLY = [
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
];

const ADSC_CIRCUIT = [
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
];

const RES_SUPPLY = [
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
];

const RES_CIRCUIT = [
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
];

const RCD_ROW = [
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
];

function headerScalarPairs({ includeExecutor = true } = {}) {
  const pairs = [
    ["RAP-43-2026", "{{RAP_NO}}"],
    ["Data pomiaru 05.06.2026r.", "Data pomiaru {{MEASUREMENT_DATE}}"],
    ["Pomiarowcy: Dawid Thai Thanh Elektryk Uprawniony", "Pomiarowcy: {{TECHNICIAN}}"],
    [
      "Pomiarowiec: Dawid Thai Thanh Elektryk Uprawniony E/516/374/22, D/517/374/22",
      "Pomiarowiec: {{TECHNICIAN}} {{TECHNICIAN_LICENSE}}",
    ],
    [
      "Miejsce pomiaru: Wrocław, ul. Sępa Szarzyńskiego 83/7",
      "Miejsce pomiaru: {{ADDRESS}}",
    ],
    [
      "Pomiar wykonano miernikiem: Sonel MPI 520 nr 722453",
      "Pomiar wykonano miernikiem: {{METER_MODEL}} nr {{METER_SERIAL}}",
    ],
  ];
  if (includeExecutor) {
    pairs.push(["Wykonawca: W&G DOM", "Wykonawca: {{EXECUTOR}}"]);
  }
  return pairs;
}

function applyHeaderScalars(xml, opts) {
  return applyParagraphReplacements(xml, headerScalarPairs(opts));
}

const PROTOCOL_PAIRS = [
  ["RAP-43-2026", "{{RAP_NO}}"],
  ["instalacja istniejąca", "{{MEASUREMENT_CAUSE}}"],
  ["05.06.2026 r.", "{{PROTOCOL_DATE}}"],
  ["05.06.2026r.", "{{MEASUREMENT_DATE}}"],
  ["05.06.2031r.", "{{NEXT_MEASUREMENT_DATE}}"],
  ["Wrocław ul. Sępa Sarzyńskiego 83/7", "{{ADDRESS}}"],
  [
    "INSTALACJA SPEŁNIA WYMAGANE NORMY I PARAMETRY NADAJE SIĘ DO UŻYTKOWANIA.",
    "{{VERDICT_TEXT}}",
  ],
];

function templatizeProtokol(xml) {
  return applyParagraphReplacements(xml, PROTOCOL_PAIRS);
}

function templatizeDaneInformacyjne(xml) {
  let out = applyHeaderScalars(xml);
  const inspectionPairs = [
    ["WŁAŚCIWY", "{{INSPECTION_1}}"],
    ["WŁAŚCIWE", "{{INSPECTION_3}}"],
    ["POPRAWNE", "{{INSPECTION_4}}"],
    ["TAK", "{{INSPECTION_6}}"],
    ["ZAPEWNIONY", "{{INSPECTION_7}}"],
  ];
  const tables = extractTables(out);
  if (tables.length >= 1) {
    let tbl = tables[0].full;
    const rows = splitTableRows(tbl);
    const inspKeys = [
      "{{INSPECTION_1}}",
      "{{INSPECTION_2}}",
      "{{INSPECTION_3}}",
      "{{INSPECTION_4}}",
      "{{INSPECTION_5}}",
      "{{INSPECTION_6}}",
      "{{INSPECTION_7}}",
    ];
    for (let ri = 2; ri < rows.length && ri - 2 < inspKeys.length; ri++) {
      const cells = splitRowCells(rows[ri]);
      if (cells.length >= 3) {
        cells[2] = replaceCellText(cells[2], inspKeys[ri - 2]);
        const trOpen = rows[ri].match(/^<w:tr\b[^>]*>/)?.[0] ?? "<w:tr>";
        const trPr = rows[ri].match(/<w:trPr[\s\S]*?<\/w:trPr>/)?.[0] ?? "";
        rows[ri] = `${trOpen}${trPr}${cells.join("")}</w:tr>`;
      }
    }
    const open = tbl.match(/^<w:tbl\b[\s\S]*?(?=<w:tr)/)?.[0] ?? "<w:tbl>";
    tbl = open + rows.join("") + "</w:tbl>";
    out = replaceTableAtIndex(out, 1, tbl);
  }
  return out;
}

function templatizeAdsc(xml) {
  let out = applyHeaderScalars(xml, { includeExecutor: true });
  out = applyParagraphReplacements(out, [
    [
      "(TN-S) Badanie ochrony przed porażeniem przez samoczynne wyłączenie",
      "({{EARTHING_SYSTEM}}) Badanie ochrony przed porażeniem przez samoczynne wyłączenie",
    ],
  ]);
  const tables = extractTables(out);
  if (tables.length >= 3) {
    let tbl = tables[2].full;
    tbl = trimTableRows(tbl, 3);
    const rows = splitTableRows(tbl);
    rows[1] = setRowPlaceholders(rows[1], ADSC_SUPPLY);
    rows[2] = setRowPlaceholders(rows[2], ADSC_CIRCUIT);
    const open = tbl.match(/^<w:tbl\b[\s\S]*?(?=<w:tr)/)?.[0] ?? "<w:tbl>";
    tbl = open + rows.join("") + "</w:tbl>";
    out = replaceTableAtIndex(out, 3, tbl);
  }
  return out;
}

function templatizeRezystancji(xml) {
  let out = applyHeaderScalars(xml, { includeExecutor: true });
  const tables = extractTables(out);
  if (tables.length >= 3) {
    let tbl = tables[2].full;
    tbl = trimTableRows(tbl, 3);
    const rows = splitTableRows(tbl);
    rows[1] = setRowPlaceholders(rows[1], RES_SUPPLY);
    rows[2] = setRowPlaceholders(rows[2], RES_CIRCUIT);
    const open = tbl.match(/^<w:tbl\b[\s\S]*?(?=<w:tr)/)?.[0] ?? "<w:tbl>";
    tbl = open + rows.join("") + "</w:tbl>";
    out = replaceTableAtIndex(out, 3, tbl);
  }
  return out;
}

function templatizeRcd(xml) {
  let out = applyHeaderScalars(xml, { includeExecutor: false });
  const tables = extractTables(out);
  if (tables.length >= 3) {
    let tbl = tables[2].full;
    tbl = trimTableRows(tbl, 2);
    const rows = splitTableRows(tbl);
    rows[1] = setRowPlaceholders(rows[1], RCD_ROW);
    const open = tbl.match(/^<w:tbl\b[\s\S]*?(?=<w:tr)/)?.[0] ?? "<w:tbl>";
    tbl = open + rows.join("") + "</w:tbl>";
    out = replaceTableAtIndex(out, 3, tbl);
  }
  return out;
}

const TEMPLATIZERS = {
  protokol: templatizeProtokol,
  "dane-informacyjne": templatizeDaneInformacyjne,
  "badanie-adsc": templatizeAdsc,
  "badanie-rezystancji": templatizeRezystancji,
  "parametry-rcd": templatizeRcd,
};

function resolveDesktopFile(name) {
  const direct = path.join(DESKTOP, name);
  if (fs.existsSync(direct)) return direct;
  const lower = name.toLowerCase();
  for (const f of fs.readdirSync(DESKTOP)) {
    if (f.toLowerCase() === lower) return path.join(DESKTOP, f);
  }
  throw new Error(`SSOT not found: ${name}`);
}

async function templatizeOne({ key, file, out }) {
  const srcPath = resolveDesktopFile(file);
  const buf = fs.readFileSync(srcPath);
  const zip = await JSZip.loadAsync(buf);
  const docPath = "word/document.xml";
  let xml = await zip.file(docPath).async("string");
  const fn = TEMPLATIZERS[key];
  if (!fn) throw new Error(`No templatizer for ${key}`);
  xml = fn(xml);
  zip.file(docPath, xml);
  const outBytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const outPath = path.join(OUT_DIR, out);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, outBytes);
  const tables = extractTables(xml);
  const ph = (xml.match(/\{\{[A-Z0-9_]+\}\}/g) || []).length;
  console.log(`  ✓ ${out} — ${outBytes.length} bytes, tables=${tables.length}, placeholders=${ph}`);
  return { key, out, bytes: outBytes.length, tables: tables.length, placeholders: ph, srcBytes: buf.length };
}

console.log("=== EM-P1R templatize from Desktop SSOT ===\n");
const results = [];
for (const spec of FILES) {
  results.push(await templatizeOne(spec));
}
console.log("\nDone:", results.length, "templates →", OUT_DIR);

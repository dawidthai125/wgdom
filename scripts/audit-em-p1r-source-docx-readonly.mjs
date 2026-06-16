/**
 * EM-P1R — read-only forensics on Desktop source DOCX (SSOT).
 * Usage: npx vite-node scripts/audit-em-p1r-source-docx-readonly.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const DESKTOP = "c:\\Users\\dawid\\Desktop\\Dokumenty\\Pomiary Elektryczne";

const FILES = [
  { key: "protokol", file: "PROTOKÓŁ Z POMIARTÓW OCHRONNYCH STR1.docx" },
  { key: "dane-informacyjne", file: "DANE INFORMACYJNE.docx" },
  { key: "badanie-adsc", file: "Badanie chrony przed porażeniem przez samoczynne wyłączenie1.docx" },
  { key: "badanie-rezystancji", file: "Badanie rezystancji obwodów.docx" },
  { key: "parametry-rcd", file: "parametry zabezpieczen  roznicowo-pradowych.docx" },
];

function cellText(cellXml) {
  const texts = [];
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(cellXml)) !== null) texts.push(m[1]);
  return texts.join("").replace(/\s+/g, " ").trim();
}

function rowText(rowXml) {
  const cells = [];
  const tcRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  let cm;
  while ((cm = tcRe.exec(rowXml)) !== null) {
    const tc = cm[0];
    const gridSpan = tc.match(/<w:gridSpan\b[^>]*w:val="(\d+)"/)?.[1] ?? "1";
    const vMerge = tc.match(/<w:vMerge\b[^>]*w:val="([^"]+)"/)?.[1] ?? tc.includes("<w:vMerge") ? "continue" : null;
    const tcW = tc.match(/<w:tcW\b[^>]*w:w="(\d+)"/)?.[1] ?? null;
    const textDir = tc.match(/<w:textDirection\b[^>]*w:val="([^"]+)"/)?.[1] ?? null;
    cells.push({
      text: cellText(tc),
      gridSpan: Number(gridSpan),
      vMerge,
      tcW,
      textDirection: textDir,
    });
  }
  return cells;
}

function paraTextOutsideTables(xml) {
  const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? xml;
  const parts = [];
  const re = /<w:p\b[\s\S]*?<\/w:p>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[0].includes("<w:tbl")) continue;
    const t = cellText(m[0]);
    if (t) parts.push(t);
  }
  return parts;
}

function extractTables(xml) {
  const tables = [];
  const tblRe = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  let tm;
  let ti = 0;
  while ((tm = tblRe.exec(xml)) !== null) {
    ti += 1;
    const tbl = tm[0];
    const gridCols = [...tbl.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g)].map((x) => Number(x[1]));
    const tblW = tbl.match(/<w:tblW\b[^>]*w:w="(\d+)"/)?.[1] ?? null;
    const tblLayout = tbl.match(/<w:tblLayout\b[^>]*w:type="([^"]+)"/)?.[1] ?? null;
    const rows = [];
    const trRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
    let rm;
    let ri = 0;
    while ((rm = trRe.exec(tbl)) !== null) {
      ri += 1;
      rows.push({ rowIndex: ri, cells: rowText(rm[0]) });
    }
    tables.push({ tableIndex: ti, gridCols, tblW, tblLayout, rowCount: rows.length, rows });
  }
  return tables;
}

async function analyzeDoc(key, fileName) {
  const fp = path.join(DESKTOP, fileName);
  if (!fs.existsSync(fp)) {
    return { key, file: fileName, error: "FILE_NOT_FOUND", path: fp };
  }
  const buf = fs.readFileSync(fp);
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const paragraphs = paraTextOutsideTables(xml);
  const tables = extractTables(xml);
  const sectPr = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";
  const pgSz = sectPr.match(/<w:pgSz\b[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"/);
  const pgMar = {
    top: sectPr.match(/<w:top\b[^>]*w:w="(\d+)"/)?.[1],
    right: sectPr.match(/<w:right\b[^>]*w:w="(\d+)"/)?.[1],
    bottom: sectPr.match(/<w:bottom\b[^>]*w:w="(\d+)"/)?.[1],
    left: sectPr.match(/<w:left\b[^>]*w:w="(\d+)"/)?.[1],
  };
  return {
    key,
    file: fileName,
    path: fp,
    bytes: buf.length,
    page: pgSz ? { w: pgSz[1], h: pgSz[2] } : null,
    margins: pgMar,
    paragraphsOutsideTables: paragraphs,
    tableCount: tables.length,
    tables,
  };
}

const out = { desktop: DESKTOP, analyzedAt: new Date().toISOString(), documents: [] };
for (const f of FILES) {
  out.documents.push(await analyzeDoc(f.key, f.file));
}
console.log(JSON.stringify(out, null, 2));

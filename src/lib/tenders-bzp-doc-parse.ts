/** Parsowanie załączników przetargowych: PDF (pdf.js), DOCX, XLSX, ZIP, 7Z. Ładowany dynamicznie. */

import JSZip from "jszip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  parseKosztorysBytes,
  isKosztorysPreviewExt,
  isPdfFilename,
  type AthPreviewResult,
  type AthPreviewRow,
} from "@/lib/ath-parser";
import { parseSwzPlainText, type TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import {
  is7zFilename,
  isArchiveInnerListableFile,
  isDocxFilename,
  isXlsxFilename,
  isZipFilename,
  scoreTenderFilename,
  type ZipListedFile,
} from "@/lib/tenders-bzp-filename";
import { list7zFiles, pickBestFrom7zBytes, read7zEntry } from "@/lib/wgdom-7z-archive";
import { isPdfPrzedmiarCostFilename } from "@/lib/tender-cost-discovery";
import { pdfPrzedmiarHeuristicToPreview } from "@/lib/pdf-przedmiar-heuristic";
import { recordTenderPdfExtract, recordTenderZipLoad } from "@/lib/tender-pipeline-metrics";

export type { ZipListedFile } from "@/lib/tenders-bzp-filename";
export {
  displayTenderFilename,
  is7zFilename,
  isDocxFilename,
  isXlsxFilename,
  isZipFilename,
  parsePlnFromKosztorysTotal,
  isArchiveInnerListableFile,
  scoreTenderFilename,
} from "@/lib/tenders-bzp-filename";
export { list7zFiles, read7zEntry, pickBestFrom7zBytes } from "@/lib/wgdom-7z-archive";

export interface ResolvedTenderFile {
  bytes: Uint8Array;
  filename: string;
  documentIndex: number;
  zipInnerPath?: string;
}

let pdfWorkerReady = false;

const ZIP_CACHE_MAX = 24;
const PDF_TEXT_CACHE_MAX = 32;
const zipInstanceCache = new Map<string, Promise<JSZip>>();
const pdfTextCache = new Map<string, Promise<{
  text: string;
  pageCount: number;
  likelyScan: boolean;
  noTextLayer: boolean;
}>>();

function bytesFingerprint(bytes: Uint8Array): string {
  const n = Math.min(24, bytes.length);
  let h = bytes.byteLength;
  for (let i = 0; i < n; i += 1) h = (Math.imul(h, 31) + bytes[i]!) | 0;
  return `b-${h}-${bytes.byteLength}`;
}

function cacheSet<K, V>(map: Map<K, V>, key: K, value: V, max: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const oldest = map.keys().next().value;
    if (oldest == null) break;
    map.delete(oldest);
  }
}

async function loadZipCached(bytes: Uint8Array): Promise<JSZip> {
  const key = bytesFingerprint(bytes);
  let pending = zipInstanceCache.get(key);
  if (!pending) {
    recordTenderZipLoad();
    pending = JSZip.loadAsync(bytes);
    cacheSet(zipInstanceCache, key, pending, ZIP_CACHE_MAX);
  }
  return pending;
}

function ensurePdfWorker(): void {
  if (pdfWorkerReady) return;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  pdfWorkerReady = true;
}

export async function listZipFiles(bytes: Uint8Array): Promise<ZipListedFile[]> {
  const zip = await loadZipCached(bytes);
  const out: ZipListedFile[] = [];
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const filename = relativePath.split("/").pop() || relativePath;
    if (/^__MACOSX|\/.DS_Store$/i.test(relativePath)) return;
    if (!isArchiveInnerListableFile(filename)) return;
    const score = scoreTenderFilename(filename);
    if (score >= 6) {
      out.push({ path: relativePath, filename, score });
    }
  });
  return out.sort((a, b) => b.score - a.score);
}

export async function readZipEntry(bytes: Uint8Array, innerPath: string): Promise<Uint8Array | null> {
  const zip = await loadZipCached(bytes);
  const file = zip.file(innerPath);
  if (!file) return null;
  return new Uint8Array(await file.async("arraybuffer"));
}

export async function pickBestFromZipBytes(
  zipBytes: Uint8Array,
  outerName: string,
): Promise<{ bytes: Uint8Array; filename: string; innerPath: string } | null> {
  const entries = await listZipFiles(zipBytes);
  if (!entries.length) return null;
  const best = entries[0];
  const inner = await readZipEntry(zipBytes, best.path);
  if (!inner) return null;
  return {
    bytes: inner,
    filename: `${outerName} → ${best.filename}`,
    innerPath: best.path,
  };
}

export async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
    const text = result.value?.trim() ?? "";
    if (text.length >= 40) return text;
  } catch { /* fallback zip */ }
  try {
    const zip = await JSZip.loadAsync(bytes);
    const doc = zip.file("word/document.xml");
    if (!doc) return "";
    const xml = await doc.async("string");
    return xml
      .replace(/<w:tab[^/]*\/>/g, "\t")
      .replace(/<w:br[^/]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

export async function extractPdfText(bytes: Uint8Array): Promise<{
  text: string;
  pageCount: number;
  likelyScan: boolean;
  noTextLayer: boolean;
}> {
  const key = bytesFingerprint(bytes);
  let pending = pdfTextCache.get(key);
  if (!pending) {
    pending = extractPdfTextUncached(bytes);
    cacheSet(pdfTextCache, key, pending, PDF_TEXT_CACHE_MAX);
  }
  return pending;
}

async function extractPdfTextUncached(bytes: Uint8Array): Promise<{
  text: string;
  pageCount: number;
  likelyScan: boolean;
  noTextLayer: boolean;
}> {
  recordTenderPdfExtract();
  ensurePdfWorker();
  try {
    const loading = pdfjs.getDocument({ data: bytes.slice() });
    const pdf = await loading.promise;
    const parts: string[] = [];
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const line = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) parts.push(line);
    }
    const text = parts.join("\n");
    const charCount = text.replace(/\s/g, "").length;
    const likelyScan = pdf.numPages > 0 && charCount < pdf.numPages * 80;
    const noTextLayer = pdf.numPages === 0 || charCount === 0;
    return { text, pageCount: pdf.numPages, likelyScan, noTextLayer };
  } catch {
    return { text: "", pageCount: 0, likelyScan: false, noTextLayer: true };
  }
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v).trim();
}

/** XLSX → struktura jak kosztorys (heurystyka nagłówków). */
export function parseXlsxToKosztorys(bytes: Uint8Array, filename: string): AthPreviewResult {
  const warnings: string[] = [];
  try {
    const wb = XLSX.read(bytes, { type: "array" });
    const sheetName = wb.SheetNames.find((n) => /koszt|przedm|obmiar|pozyc/i.test(n)) ?? wb.SheetNames[0];
    if (!sheetName) {
      return { ok: false, format: "unknown", rows: [], warnings: ["Pusty plik Excel."] };
    }
    const sheet = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: "" });
    if (!grid.length) {
      return { ok: false, format: "unknown", rows: [], warnings: ["Brak danych w arkuszu."] };
    }
    let headerRow = 0;
    for (let i = 0; i < Math.min(grid.length, 8); i += 1) {
      const row = grid[i].map(cellStr).join(" ").toLowerCase();
      if (/opis|pozyc|j\.?\s*m|ilo[sś]|cena|warto/.test(row)) {
        headerRow = i;
        break;
      }
    }
    const headers = grid[headerRow].map(cellStr);
    const col = (re: RegExp) => headers.findIndex((h) => re.test(h));
    const iLp = col(/lp|l\.?\s*p|nr/i);
    const iDesc = col(/opis|nazwa|pozyc/i);
    const iUnit = col(/j\.?\s*m|jedn/i);
    const iQty = col(/ilo[sś]|nak/i);
    const iPrice = col(/cena|c\.?\s*j/i);
    const iTotal = col(/warto[sś]|razem|suma/i);

    const rows: AthPreviewRow[] = [];
    let totalValue: string | undefined;
    for (let r = headerRow + 1; r < grid.length; r += 1) {
      const line = grid[r].map(cellStr);
      if (line.every((c) => !c)) continue;
      const desc = iDesc >= 0 ? line[iDesc] : line.find((c) => c.length > 8) || "";
      if (!desc || /razem|suma|podsumowanie/i.test(desc)) {
        const maybeTotal = iTotal >= 0 ? line[iTotal] : line[line.length - 1];
        if (maybeTotal && /[\d,.]/.test(maybeTotal)) totalValue = maybeTotal;
        continue;
      }
      rows.push({
        lp: iLp >= 0 ? line[iLp] || String(rows.length + 1) : String(rows.length + 1),
        code: "",
        description: desc.slice(0, 200),
        unit: iUnit >= 0 ? line[iUnit] : "",
        quantity: iQty >= 0 ? line[iQty] : "",
        unitPrice: iPrice >= 0 ? line[iPrice] : "",
        total: iTotal >= 0 ? line[iTotal] : "",
      });
      if (rows.length >= 500) break;
    }
    if (rows.length === 0) {
      warnings.push("Nie rozpoznano kolumn pozycji — pokazano surowy podgląd arkusza.");
      const preview = grid.slice(0, 40).map((row) => row.map(cellStr).join(" | ")).join("\n");
      return { ok: true, format: "text", rows: [], warnings, rawPreview: preview, title: filename };
    }
    return {
      ok: true,
      format: "text",
      title: filename,
      rows,
      totalValue,
      currency: "PLN",
      warnings: [`Arkusz: ${sheetName}`, ...warnings],
    };
  } catch (e) {
    return {
      ok: false,
      format: "unknown",
      rows: [],
      warnings: [e instanceof Error ? e.message : "Błąd odczytu XLSX"],
    };
  }
}

export async function parseDocumentToKosztorys(
  bytes: Uint8Array,
  filename: string,
): Promise<AthPreviewResult | null> {
  if (isKosztorysPreviewExt(filename)) {
    return parseKosztorysBytes(bytes, filename);
  }
  if (isXlsxFilename(filename)) {
    return parseXlsxToKosztorys(bytes, filename);
  }
  if (isPdfPrzedmiarCostFilename(filename)) {
    const { text, likelyScan, noTextLayer } = await extractPdfText(bytes);
    return pdfPrzedmiarHeuristicToPreview(text, filename, { likelyScan, noTextLayer });
  }
  return null;
}

export async function parseDocumentToSwzText(
  bytes: Uint8Array,
  filename: string,
): Promise<{ text: string; source: TenderSwzAnalysis["source"]; warnings: string[] }> {
  const warnings: string[] = [];
  if (isPdfFilename(filename)) {
    const { text, likelyScan, pageCount } = await extractPdfText(bytes);
    if (likelyScan) {
      warnings.push(`PDF (${pageCount} str.) — mało tekstu; możliwy skan bez OCR.`);
    }
    return { text, source: "pdf", warnings };
  }
  if (isDocxFilename(filename)) {
    const text = await extractDocxText(bytes);
    return { text, source: "docx", warnings: text.length < 80 ? ["DOCX — bardzo krótki tekst."] : [] };
  }
  if (isKosztorysPreviewExt(filename) || isXlsxFilename(filename)) {
    return { text: "", source: "manual", warnings: [] };
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return { text, source: "docx", warnings: [] };
}

export function analyzeSwzFromDocumentText(
  text: string,
  source: TenderSwzAnalysis["source"],
  opts?: { sourceFilename?: string; ourEstimatePln?: number | null },
): TenderSwzAnalysis | null {
  if (!text || text.replace(/\s/g, "").length < 80) return null;
  return parseSwzPlainText(text, { source, sourceFilename: opts?.sourceFilename, ourEstimatePln: opts?.ourEstimatePln ?? null });
}

export async function resolveDocumentBytes(
  loadBytes: (documentIndex: number) => Promise<Uint8Array>,
  documentIndex: number,
  filename: string,
  zipInnerPath?: string,
  outerArchiveFilename?: string,
): Promise<Uint8Array> {
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
  if (isZipFilename(archiveName) && !zipInnerPath) {
    const picked = await pickBestFromZipBytes(outer, archiveName);
    if (picked) return picked.bytes;
  }
  if (is7zFilename(archiveName) && !zipInnerPath) {
    const picked = await pickBestFrom7zBytes(outer, archiveName);
    if (picked) return picked.bytes;
  }
  return outer;
}

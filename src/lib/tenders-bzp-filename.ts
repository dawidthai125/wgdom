/** Lekkie helpery nazw plików przetargowych — bez xlsx/mammoth/jszip/pdfjs. */

export interface ZipListedFile {
  path: string;
  filename: string;
  score: number;
}

export function parsePlnFromKosztorysTotal(
  totalValue?: string | null,
  currency?: string | null,
): number | null {
  if (!totalValue?.trim()) return null;
  const cur = (currency || "PLN").toUpperCase();
  if (cur !== "PLN" && cur !== "ZŁ") return null;
  const cleaned = totalValue.replace(/\s/g, "").replace(",", ".");
  const m = cleaned.match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function scoreTenderFilename(name: string): number {
  const n = name.toLowerCase();
  let s = 0;
  if (/kosztorys|przedmiar|obmiar/.test(n)) s += 35;
  if (/modyfik.*swz|swz.*modyfik|zmian.*swz/.test(n)) s += 30;
  if (/swz|opz|specyfikac|formularz/.test(n)) s += 22;
  if (/\.(ath|nor|xml)$/i.test(n)) s += 28;
  if (/\.xlsx?$/i.test(n)) s += 14;
  if (/\.docx?$/i.test(n)) s += 12;
  if (/\.pdf$/i.test(n)) s += 8;
  if (/\.zip$/i.test(n)) s += 6;
  if (/\.7z$/i.test(n)) s += 6;
  return s;
}

const GENERIC_FILENAME_RE =
  /^(dokument|document|file|download|attachment|plik|getfile|index|default)(\.[a-z0-9]{2,5})?$/i;

function extFromContentType(contentType?: string | null): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("pdf")) return ".pdf";
  if (ct.includes("word") || ct.includes("docx")) return ".docx";
  if (ct.includes("msword")) return ".doc";
  if (ct.includes("sheet") || ct.includes("excel")) return ".xlsx";
  if (ct.includes("zip")) return ".zip";
  if (ct.includes("xml")) return ".xml";
  return "";
}

function filenameFromUrl(url?: string): string {
  if (!url) return "";
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    const base = last.split("?")[0];
    if (base.length >= 5 && /\.\w{2,5}$/i.test(base) && !GENERIC_FILENAME_RE.test(base)) return base;
  } catch { /* ignore */ }
  return "";
}

/** Czytelna nazwa pliku — BZP często zwraca samo „dokument”. */
export function displayTenderFilename(
  filename: string,
  opts?: { index?: number; contentType?: string | null; url?: string; prefix?: string },
): string {
  let name = (filename || "").trim();
  try {
    if (name.includes("%")) name = decodeURIComponent(name);
  } catch { /* ignore */ }
  name = name.replace(/\+/g, " ").trim();

  const fromUrl = filenameFromUrl(opts?.url);
  const extInName = name.match(/(\.[a-z0-9]{2,5})$/i)?.[1] || "";
  const ext = extInName || extFromContentType(opts?.contentType) || ".pdf";

  if (!name || GENERIC_FILENAME_RE.test(name) || (name.length < 5 && !extInName)) {
    if (fromUrl) return fromUrl;
    const prefix = opts?.prefix || "Załącznik";
    const n = opts?.index != null ? ` ${opts.index}` : "";
    return `${prefix}${n}${ext}`;
  }

  if (/^[\d_a-f-]{20,}(\.[a-z]+)?$/i.test(name) && fromUrl) return fromUrl;

  return name;
}

export function isZipFilename(name: string): boolean {
  return /\.zip$/i.test(name);
}

export function is7zFilename(name: string): boolean {
  return /\.7z$/i.test(name);
}

/** P2-H.6 — inner ZIP/7Z: tylko rzeczywiste pliki z rozszerzeniem (nie foldery logiczne). */
export function isArchiveInnerListableFile(filename: string): boolean {
  const base = (filename.split("/").pop() ?? filename).trim();
  if (!base || base.endsWith(".")) return false;
  return /\.[a-z0-9]{2,5}$/i.test(base);
}

export function isDocxFilename(name: string): boolean {
  return /\.docx?$/i.test(name);
}

export function isXlsxFilename(name: string): boolean {
  return /\.xlsx?$/i.test(name);
}

/** Najlepszy załącznik SWZ do analizy (modyfikacja > SWZ > inne). */
export function pickBestSwzDocumentForAnalysis<T extends { index: number; filename: string; isSwzHint?: boolean }>(
  docs: T[],
): T | undefined {
  if (!docs.length) return undefined;
  const ranked = [...docs].sort((a, b) => {
    const sa = scoreTenderFilename(a.filename) + (a.isSwzHint ? 18 : 0);
    const sb = scoreTenderFilename(b.filename) + (b.isSwzHint ? 18 : 0);
    return sb - sa;
  });
  return ranked[0];
}

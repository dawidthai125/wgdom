/** Best-effort parser kosztorysów ATH / NOR / XML — bez oficjalnej specyfikacji Athenasoft. */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { resolveJobFileStoragePath, type JobFileAttachment } from "@/lib/job-documents";

export interface AthPreviewRow {
  lp: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export interface AthPreviewResult {
  ok: boolean;
  format: "xml" | "text" | "binary" | "unknown";
  title?: string;
  rows: AthPreviewRow[];
  summary?: string;
  totalValue?: string;
  warnings: string[];
  rawPreview?: string;
}

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function looksBinary(text: string): boolean {
  if (!text) return true;
  const sample = text.slice(0, 8192);
  let nonPrint = 0;
  for (let i = 0; i < sample.length; i += 1) {
    const c = sample.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32 || c > 126) {
      if (c < 160) nonPrint += 1;
    }
  }
  return nonPrint / sample.length > 0.08;
}

function decodeAttempts(bytes: Uint8Array): string[] {
  const out: string[] = [];
  try {
    out.push(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
  } catch { /* ignore */ }
  try {
    out.push(new TextDecoder("windows-1250", { fatal: false }).decode(bytes));
  } catch { /* ignore */ }
  try {
    out.push(new TextDecoder("iso-8859-2", { fatal: false }).decode(bytes));
  } catch { /* ignore */ }

  let u16 = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code < 32 || code === 0xfffd) continue;
    if (code < 0xd800 || code > 0xdfff) u16 += String.fromCharCode(code);
  }
  if (u16.length > 20) out.push(u16);

  return [...new Set(out.filter(Boolean))];
}

function extractEmbeddedXml(text: string): string | null {
  const start = text.indexOf("<?xml");
  if (start >= 0) return text.slice(start);
  const alt = text.indexOf("<Kosztorys");
  if (alt >= 0) return text.slice(alt);
  const alt2 = text.indexOf("<kosztorys");
  if (alt2 >= 0) return text.slice(alt2);
  return null;
}

/** Wyciąga czytelne fragmenty z binarnego ATH (NORMA). */
function extractStringsFromBinary(bytes: Uint8Array, minLen = 5): string[] {
  const found: string[] = [];
  const pushRun = (run: string) => {
    const t = run.trim();
    if (t.length >= minLen && /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9]/.test(t)) found.push(t);
  };

  let ascii = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) ascii += String.fromCharCode(b);
    else if (b >= 0xa0 && b <= 0xff) ascii += String.fromCharCode(b);
    else {
      pushRun(ascii);
      ascii = "";
    }
  }
  pushRun(ascii);

  let u16 = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code >= 32 && code < 0xd800) u16 += String.fromCharCode(code);
    else {
      pushRun(u16);
      u16 = "";
    }
  }
  pushRun(u16);

  return [...new Set(found)].slice(0, 400);
}

function parseNumberLike(s: string): boolean {
  return /^-?\d[\d\s,.]*$/.test(s.trim());
}

function isAthenasoftKosztorys(text: string): boolean {
  return text.includes("[KOSZTORYS ATHENASOFT]");
}

function parseIniField(block: string, key: string): string | undefined {
  const re = new RegExp(`^${key}=(.*)$`, "m");
  const m = block.match(re);
  return m?.[1]?.trim();
}

function firstTabToken(s: string): string {
  return s.split("\t")[0].trim();
}

function firstNumericToken(s: string): string {
  const m = s.trim().match(/^[\d.,]+/);
  return m ? m[0].replace(",", ".") : "";
}

function extractKnrCode(pd: string): string {
  const knrMatch = pd.match(/KNR[\t\s]+([\d-]+)[\t\s]+([\d-]+(?:-\d+)?)/i);
  if (knrMatch) return `KNR ${knrMatch[1]} ${knrMatch[2]}`.trim();
  const parts = pd.split("\t").map((p) => p.trim()).filter(Boolean);
  const idx = parts.findIndex((p) => /^KNR$/i.test(p));
  if (idx >= 0 && parts[idx + 1]) {
    const sub = parts[idx + 2] || "";
    return sub ? `KNR ${parts[idx + 1]} ${sub}` : `KNR ${parts[idx + 1]}`;
  }
  return "";
}

/** Tekstowy format ATH Athenasoft — sekcje [POZYCJA] z polami na=, jm=, ob=, kj=, wn=. */
function parseAthAthenasoftIni(text: string): AthPreviewResult {
  const warnings = [
    "Format ATH Athenasoft — podgląd z sekcji [POZYCJA]. Do pełnej weryfikacji użyj NORMA lub PDF.",
  ];

  const headerEnd = text.indexOf("\n[");
  const header = headerEnd > 0 ? text.slice(0, headerEnd) : text.slice(0, 3000);

  let title = parseIniField(header, "nan");
  const stBlock = text.match(/\[STRONA TYT\][\s\S]*?(?=\n\[|$)/)?.[0];
  if (stBlock) {
    const nb = parseIniField(stBlock, "nb");
    const ab = parseIniField(stBlock, "ab");
    const na = parseIniField(stBlock, "na");
    if (nb && ab) title = `${nb} — ${ab}`;
    else if (nb) title = nb;
    else if (na) title = na;
  }

  const totalValue = firstNumericToken(parseIniField(header, "wk") || "");

  const rows: AthPreviewRow[] = [];
  const sections = text.split("[POZYCJA]");
  for (let i = 1; i < sections.length; i += 1) {
    const block = sections[i];
    const nextSection = block.search(/\n\[[A-Z0-9 ]+\]/);
    const body = nextSection >= 0 ? block.slice(0, nextSection) : block;

    const description = parseIniField(body, "na");
    if (!description) continue;

    const pd = parseIniField(body, "pd") || "";
    const jm = parseIniField(body, "jm") || "";
    const ob = parseIniField(body, "ob") || "";
    const kj = parseIniField(body, "kj") || "";
    const wn = parseIniField(body, "wn") || "";

    const qty = ob.replace(",", ".");
    const total = firstNumericToken(wn) || firstNumericToken(wn.split("\t")[0] || "");
    let unitPrice = firstNumericToken(kj);
    if (!unitPrice && qty && total) {
      const q = parseFloat(qty);
      const t = parseFloat(total);
      if (q > 0 && !Number.isNaN(t)) unitPrice = (t / q).toFixed(2);
    }

    rows.push({
      lp: parseIniField(body, "nu") || String(rows.length + 1),
      code: extractKnrCode(pd),
      description,
      unit: firstTabToken(jm),
      quantity: qty,
      unitPrice,
      total,
    });
  }

  return {
    ok: rows.length > 0,
    format: "text",
    title,
    rows: rows.slice(0, 500),
    totalValue: totalValue || undefined,
    summary: totalValue ? `Wartość kosztorysu: ${totalValue} PLN` : undefined,
    warnings,
  };
}

function parseTextTable(lines: string[]): AthPreviewRow[] {
  const rows: AthPreviewRow[] = [];
  for (const line of lines) {
    const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      const nums = parts.filter(parseNumberLike);
      if (nums.length >= 1) {
        rows.push({
          lp: parts[0] || "",
          code: parts.length > 5 ? parts[1] : "",
          description: parts.length > 5 ? parts.slice(2, -3).join(" ") : parts.slice(1, -2).join(" ") || parts[1] || "",
          unit: parts.length > 5 ? parts[parts.length - 3] : parts[parts.length - 2] || "",
          quantity: parts.length > 5 ? parts[parts.length - 2] : parts[parts.length - 2] || "",
          unitPrice: parts.length > 5 ? parts[parts.length - 1] : "",
          total: parts[parts.length - 1] || "",
        });
        continue;
      }
    }
    const semi = line.split(";").map((p) => p.trim()).filter(Boolean);
    if (semi.length >= 5 && semi.some(parseNumberLike)) {
      rows.push({
        lp: semi[0] || "",
        code: semi[1] || "",
        description: semi.slice(2, -4).join(" ") || semi[2] || "",
        unit: semi[semi.length - 4] || "",
        quantity: semi[semi.length - 3] || "",
        unitPrice: semi[semi.length - 2] || "",
        total: semi[semi.length - 1] || "",
      });
    }
  }
  return rows.slice(0, 500);
}

function parseXml(text: string): AthPreviewResult {
  const warnings: string[] = ["Podgląd XML — uproszczony, bez gwarancji zgodności z NORMA."];
  try {
    const doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.querySelector("parsererror")) {
      return { ok: false, format: "unknown", rows: [], warnings: ["Nie udało się odczytać XML."] };
    }
    const title =
      doc.querySelector("title")?.textContent
      || doc.querySelector("nazwa")?.textContent
      || doc.querySelector("Name")?.textContent
      || undefined;
    const candidates = [
      ...doc.querySelectorAll("pozycja, Pozycja, item, Item, wiersz, row"),
    ];
    const rows: AthPreviewRow[] = [];
    for (const el of candidates) {
      const get = (...names: string[]) => {
        for (const n of names) {
          const node = el.querySelector(n) || el.getElementsByTagName(n)[0];
          if (node?.textContent?.trim()) return node.textContent.trim();
        }
        return "";
      };
      rows.push({
        lp: get("lp", "numer", "nr", "Lp"),
        code: get("kod", "symbol", "code"),
        description: get("opis", "nazwa", "description", "text"),
        unit: get("jm", "jednostka", "unit"),
        quantity: get("ilosc", "quantity", "qty"),
        unitPrice: get("cena", "cena_jedn", "unitPrice"),
        total: get("wartosc", "suma", "total", "value"),
      });
    }
    if (rows.length === 0) {
      const allText = normalizeLines(doc.documentElement.textContent || "");
      return {
        ok: allText.length > 0,
        format: "xml",
        title,
        rows: parseTextTable(allText),
        warnings,
        rawPreview: allText.slice(0, 3000),
      };
    }
    return { ok: true, format: "xml", title, rows: rows.slice(0, 500), warnings };
  } catch {
    return { ok: false, format: "unknown", rows: [], warnings: ["Błąd parsowania XML."] };
  }
}

export function parseKosztorysFile(content: string, filename: string): AthPreviewResult {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const warnings: string[] = [
    "Format ATH/NOR jest zamknięty — podgląd może być niepełny. Do pełnej weryfikacji użyj NORMA lub PDF.",
  ];

  if (isAthenasoftKosztorys(content)) {
    const parsed = parseAthAthenasoftIni(content);
    if (parsed.rows.length > 0) return { ...parsed, warnings: [...warnings, ...parsed.warnings] };
  }

  if (ext === "xml" || content.trimStart().startsWith("<")) {
    const xml = parseXml(content);
    return { ...xml, warnings: [...warnings, ...xml.warnings] };
  }

  if (looksBinary(content)) {
    return {
      ok: false,
      format: "binary",
      rows: [],
      warnings: [
        ...warnings,
        "Plik wygląda na binarny (typowy format ATH z NORMA). Pobierz i otwórz w NORMA lub poproś inspektora o eksport PDF.",
      ],
    };
  }

  const lines = normalizeLines(content);
  const rows = parseTextTable(lines);
  if (rows.length > 0) {
    return {
      ok: true,
      format: "text",
      rows,
      warnings,
      rawPreview: lines.slice(0, 80).join("\n"),
    };
  }

  const printable = lines.filter((l) => l.length > 3 && /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{3,}/.test(l));
  return {
    ok: printable.length > 0,
    format: printable.length > 0 ? "text" : "unknown",
    rows: [],
    warnings,
    rawPreview: printable.slice(0, 60).join("\n") || content.slice(0, 2000),
  };
}

export function parseKosztorysBytes(bytes: Uint8Array, filename: string): AthPreviewResult {
  const warnings: string[] = [
    "Format ATH/NOR jest zamknięty — podgląd może być niepełny. Do pełnej weryfikacji użyj NORMA lub PDF.",
  ];

  for (const text of decodeAttempts(bytes)) {
    if (isAthenasoftKosztorys(text)) {
      const parsed = parseAthAthenasoftIni(text);
      if (parsed.rows.length > 0) {
        return { ...parsed, warnings: [...warnings, ...parsed.warnings] };
      }
    }
    const embedded = extractEmbeddedXml(text);
    if (embedded) {
      const xmlResult = parseKosztorysFile(embedded, "export.xml");
      if (xmlResult.rows.length > 0 || xmlResult.ok) {
        return { ...xmlResult, warnings: [...warnings, ...xmlResult.warnings] };
      }
    }
    if (!looksBinary(text)) {
      const parsed = parseKosztorysFile(text, filename);
      if (parsed.rows.length > 0) return { ...parsed, warnings: [...warnings, ...parsed.warnings] };
      if (parsed.rawPreview && parsed.format === "text") return { ...parsed, warnings: [...warnings, ...parsed.warnings] };
    }
  }

  const strings = extractStringsFromBinary(bytes);
  if (strings.length > 0) {
    const titleMatch = strings.find((s) => s.startsWith("nan="));
    const title = titleMatch?.slice(4).trim();
    const joined = strings.join("\n");
    const tableRows = parseTextTable(normalizeLines(joined));
    if (tableRows.length > 0) {
      return {
        ok: true,
        format: "text",
        title,
        rows: tableRows,
        warnings: [...warnings, "Odczytano fragmenty z pliku binarnego ATH."],
        rawPreview: strings.slice(0, 40).join("\n"),
      };
    }
    const printable = strings.filter((s) => s.length > 8);
    if (printable.length > 0) {
      return {
        ok: true,
        format: "binary",
        title,
        rows: [],
        warnings: [...warnings, "Plik binarny ATH — poniżej wyciągnięte opisy pozycji (bez kwot). Otwórz w NORMA lub poproś o PDF."],
        rawPreview: printable.slice(0, 50).join("\n"),
      };
    }
  }

  return {
    ok: false,
    format: "binary",
    rows: [],
    warnings: [
      ...warnings,
      "Nie udało się odczytać pozycji z pliku ATH. Pobierz plik i otwórz w programie NORMA, lub poproś inspektora o eksport PDF.",
    ],
  };
}

async function fetchBytesViaApi(storagePath: string, filename: string): Promise<Uint8Array | null> {
  const res = await fetch(`${API_BASE}/kosztorys-preview`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ path: storagePath, filename }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || typeof data.base64 !== "string") {
    throw new Error(data.error || `Nie udało się pobrać pliku (${res.status})`);
  }
  const binary = atob(data.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function fetchAndParseKosztorys(
  url: string,
  filename: string,
  storagePath?: string,
  file?: Pick<JobFileAttachment, "path" | "publicUrl">,
): Promise<AthPreviewResult> {
  const resolvedPath = storagePath || (file ? resolveJobFileStoragePath(file) : undefined);
  try {
    if (resolvedPath) {
      try {
        const bytes = await fetchBytesViaApi(resolvedPath, filename);
        if (bytes) return parseKosztorysBytes(bytes, filename);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Błąd pobierania przez serwer";
        /* fallback: direct URL */
        if (!url) {
          return { ok: false, format: "unknown", rows: [], warnings: [msg] };
        }
      }
    }

    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, format: "unknown", rows: [], warnings: [`Nie udało się pobrać pliku (${res.status}).`] };
    }
    const buf = await res.arrayBuffer();
    return parseKosztorysBytes(new Uint8Array(buf), filename);
  } catch {
    return { ok: false, format: "unknown", rows: [], warnings: ["Błąd pobierania pliku do podglądu."] };
  }
}

export function isPdfFilename(name: string): boolean {
  return /\.pdf$/i.test(name);
}

export function isKosztorysPreviewExt(name: string): boolean {
  return /\.(ath|nor|xml)$/i.test(name);
}

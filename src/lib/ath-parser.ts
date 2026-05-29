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
  category?: string;
  categoryLp?: string;
}

export interface AthPreviewCategory {
  lp: string;
  name: string;
  total: string;
  level: number;
  /** Robocizna / materiały / sprzęt (kn=) — gdy dostępne. */
  breakdown?: string;
}

export interface AthPreviewSummaryLine {
  label: string;
  value: string;
  bold?: boolean;
  indent?: number;
}

export interface AthPreviewResult {
  ok: boolean;
  format: "xml" | "text" | "binary" | "unknown";
  title?: string;
  subtitle?: string;
  documentType?: string;
  rows: AthPreviewRow[];
  categories?: AthPreviewCategory[];
  summaryLines?: AthPreviewSummaryLine[];
  summary?: string;
  totalValue?: string;
  currency?: string;
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
    out.push(new TextDecoder("windows-1250", { fatal: false }).decode(bytes));
  } catch { /* ignore */ }
  try {
    out.push(new TextDecoder("iso-8859-2", { fatal: false }).decode(bytes));
  } catch { /* ignore */ }
  try {
    out.push(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
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

/** Athenasoft ATH — zawsze Windows-1250 (UTF-8 psuje ą, ę, ł…). */
function decodeAthText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("windows-1250", { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("iso-8859-2", { fatal: false }).decode(bytes);
  }
}

function cleanAthText(s: string): string {
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").trim();
}

function formatPlnAmount(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumTabNumbers(s: string): number {
  return s
    .split("\t")
    .map((p) => parseFloat(p.trim().replace(",", ".")))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => a + b, 0);
}

function categoryLevel(lp: string): number {
  return lp.includes(".") ? lp.split(".").length - 1 : 0;
}

interface AthSection {
  title: string;
  body: string;
}

function splitAthSections(text: string): AthSection[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const starts: { title: string; index: number }[] = [];
  const re = /^\[([^\]]+)\]/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    starts.push({ title: match[1], index: match.index });
  }
  const out: AthSection[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const { title, index } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : normalized.length;
    const chunk = normalized.slice(index, end);
    const body = chunk.replace(/^\[[^\]]+\]\n?/, "");
    out.push({ title, body });
  }
  return out;
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

/** Tekstowy format ATH Athenasoft — działy [ELEMENT], pozycje [POZYCJA], narzuty, suma wk=. */
function parseAthAthenasoftIni(text: string): AthPreviewResult {
  const warnings = [
    "Podgląd na wzór wydruku NORMA — działy, pozycje i podsumowanie. Do pełnej weryfikacji użyj NORMA lub PDF.",
  ];

  const sections = splitAthSections(text);
  const headerSec = sections.find((s) => s.title === "KOSZTORYS ATHENASOFT")?.body ?? text.slice(0, 3000);
  const titlePage = sections.find((s) => s.title === "STRONA TYT")?.body;

  let title = cleanAthText(parseIniField(headerSec, "nan") || "");
  let subtitle: string | undefined;
  let documentType: string | undefined;

  if (titlePage) {
    documentType = cleanAthText(parseIniField(titlePage, "na") || "");
    const nb = cleanAthText(parseIniField(titlePage, "nb") || "");
    const ab = cleanAthText(parseIniField(titlePage, "ab") || "");
    const ni = cleanAthText(parseIniField(titlePage, "ni") || "");
    const nfn = cleanAthText(parseIniField(titlePage, "nfn") || "");
    if (nb && ab) title = `${nb} — ${ab}`;
    else if (nb) title = nb;
    const parts = [ni && `Inwestor: ${ni}`, nfn && `Wykonawca: ${nfn}`].filter(Boolean);
    if (parts.length) subtitle = parts.join(" · ");
  }

  const currency = cleanAthText(parseIniField(headerSec, "wan") || "PLN");
  const totalValue = firstNumericToken(parseIniField(headerSec, "wk") || "");

  const narzuty: { name: string; code: string; percent: string }[] = [];
  for (const sec of sections) {
    if (!sec.title.startsWith("NARZUTY NORMA")) continue;
    const nameParts = (parseIniField(sec.body, "na") || "").split("\t").map(cleanAthText).filter(Boolean);
    const waParts = (parseIniField(sec.body, "wa") || "").split("\t");
    const pct = firstNumericToken(waParts[0] || "");
    if (nameParts.length) {
      narzuty.push({
        name: nameParts[0],
        code: nameParts[1] || "",
        percent: pct,
      });
    }
  }

  const headerNarLabels = (parseIniField(headerSec, "na") || "").split("\t").map(cleanAthText);
  const headerNarRaw = (parseIniField(headerSec, "wn") || "").split("\t");
  const headerNarAmounts = new Map<string, string>();
  headerNarLabels.forEach((label, i) => {
    if (!label) return;
    const v = firstNumericToken(headerNarRaw[i] || "");
    if (v) headerNarAmounts.set(label.toLowerCase(), v);
  });

  const categories: AthPreviewCategory[] = [];
  const rows: AthPreviewRow[] = [];
  let currentCategory: AthPreviewCategory | undefined;

  for (const sec of sections) {
    if (sec.title.startsWith("ELEMENT ")) {
      const lp = cleanAthText(parseIniField(sec.body, "nu") || "");
      const name = cleanAthText(parseIniField(sec.body, "na") || "");
      if (!name) continue;
      const wa = firstNumericToken(parseIniField(sec.body, "wa") || "");
      const kn = parseIniField(sec.body, "kn");
      let breakdown: string | undefined;
      if (kn) {
        const parts = kn.split("\t").map((p) => firstNumericToken(p)).filter(Boolean);
        if (parts.length >= 3) {
          breakdown = `R ${formatPlnAmount(parts[0])} · M ${formatPlnAmount(parts[1])} · S ${formatPlnAmount(parts[2])} PLN`;
        }
      }
      const cat: AthPreviewCategory = {
        lp: lp || String(categories.length + 1),
        name,
        total: wa ? formatPlnAmount(wa) : "—",
        level: categoryLevel(lp || "1"),
        breakdown,
      };
      categories.push(cat);
      currentCategory = cat;
      continue;
    }

    if (sec.title !== "POZYCJA") continue;

    const description = cleanAthText(parseIniField(sec.body, "na") || "");
    if (!description) continue;

    const pd = parseIniField(sec.body, "pd") || "";
    const jm = parseIniField(sec.body, "jm") || "";
    const ob = parseIniField(sec.body, "ob") || "";
    const kj = parseIniField(sec.body, "kj") || "";
    const wn = parseIniField(sec.body, "wn") || "";

    const qty = ob.replace(",", ".");
    const totalNum = sumTabNumbers(wn);
    const total = totalNum > 0 ? formatPlnAmount(totalNum) : firstNumericToken(wn);
    let unitPrice = firstNumericToken(kj);
    const q = parseFloat(qty);
    if (!unitPrice && q > 0 && totalNum > 0) {
      unitPrice = formatPlnAmount(totalNum / q);
    } else if (unitPrice) {
      unitPrice = formatPlnAmount(unitPrice);
    }

    rows.push({
      lp: cleanAthText(parseIniField(sec.body, "nu") || String(rows.length + 1)),
      code: extractKnrCode(pd),
      description,
      unit: firstTabToken(jm),
      quantity: qty,
      unitPrice,
      total,
      category: currentCategory?.name,
      categoryLp: currentCategory?.lp,
    });
  }

  const summaryLines: AthPreviewSummaryLine[] = [];

  if (categories.length > 0) {
    summaryLines.push({ label: "Podsumowanie działów", value: "", bold: true });
    for (const cat of categories) {
      summaryLines.push({
        label: cat.lp ? `${cat.lp}  ${cat.name}` : cat.name,
        value: cat.total !== "—" ? `${cat.total} ${currency}` : "—",
        bold: cat.level === 0,
        indent: cat.level,
      });
      if (cat.breakdown) {
        summaryLines.push({
          label: "skład: robocizna / materiały / sprzęt",
          value: cat.breakdown,
          indent: cat.level + 1,
        });
      }
    }
  }

  if (narzuty.length > 0 || headerNarAmounts.size > 0) {
    summaryLines.push({ label: "Narzuty i podatki", value: "", bold: true });
    for (const n of narzuty) {
      const key = n.name.toLowerCase();
      const amount = headerNarAmounts.get(key);
      summaryLines.push({
        label: n.code ? `${n.name} (${n.code})` : n.name,
        value: amount
          ? `${formatPlnAmount(amount)} ${currency} (${n.percent} %)`
          : n.percent ? `${n.percent} %` : "—",
        indent: 1,
      });
    }
    for (const [label, amount] of headerNarAmounts) {
      if (narzuty.some((n) => n.name.toLowerCase() === label)) continue;
      summaryLines.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: `${formatPlnAmount(amount)} ${currency}`,
        indent: 1,
      });
    }
  }

  if (totalValue) {
    summaryLines.push({
      label: "WARTOŚĆ CAŁKOWITA KOSZTORYSU",
      value: `${formatPlnAmount(totalValue)} ${currency}`,
      bold: true,
    });
  }

  const positionsSum = rows.reduce((s, r) => {
    const n = parseFloat(r.total.replace(/\s/g, "").replace(",", "."));
    return s + (Number.isNaN(n) ? 0 : n);
  }, 0);

  return {
    ok: rows.length > 0,
    format: "text",
    title: title || undefined,
    subtitle,
    documentType,
    rows: rows.slice(0, 500),
    categories,
    summaryLines,
    totalValue: totalValue || undefined,
    currency,
    summary: totalValue
      ? `Wartość całkowita: ${formatPlnAmount(totalValue)} ${currency}${positionsSum > 0 ? ` · suma pozycji (widok uproszczony): ${formatPlnAmount(positionsSum)} ${currency}` : ""}`
      : undefined,
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

  const athText = decodeAthText(bytes);
  if (isAthenasoftKosztorys(athText)) {
    const parsed = parseAthAthenasoftIni(athText);
    if (parsed.rows.length > 0 || parsed.summaryLines?.length) {
      return { ...parsed, warnings: [...warnings, ...parsed.warnings] };
    }
  }

  for (const text of decodeAttempts(bytes)) {
    if (isAthenasoftKosztorys(text)) {
      const parsed = parseAthAthenasoftIni(text);
      if (parsed.rows.length > 0 || parsed.summaryLines?.length) {
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

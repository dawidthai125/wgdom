/** Best-effort parser kosztorysów ATH / NOR / XML — bez oficjalnej specyfikacji Athenasoft. */

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

function parseNumberLike(s: string): boolean {
  return /^-?\d[\d\s,.]*$/.test(s.trim());
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

export async function fetchAndParseKosztorys(url: string, filename: string): Promise<AthPreviewResult> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, format: "unknown", rows: [], warnings: [`Nie udało się pobrać pliku (${res.status}).`] };
    }
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (looksBinary(text)) {
      text = new TextDecoder("windows-1250", { fatal: false }).decode(bytes);
    }
    return parseKosztorysFile(text, filename);
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

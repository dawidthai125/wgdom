/**
 * TP194A — naprawa mojibake UTF-8↔Latin-1 w nazwach plików (Open Nexus / platformazakupowa).
 * Keep in sync with src/lib/tender-filename-encoding.ts
 */

const UTF8_MOJIBAKE_RE = /[ÅÃÄÂÐÑ¿]|Ã.|Å./;

const POLISH_CHAR_RE = /[ąćęłńóśźż]/i;

const TENDER_FILENAME_EXT_RE = /\.(pdf|docx?|xlsx?|zip|7z|ath|nor)$/i;

export function hasUtf8Mojibake(value: string): boolean {
  return UTF8_MOJIBAKE_RE.test(value);
}

export function hasPolishChars(value: string): boolean {
  return POLISH_CHAR_RE.test(value);
}

export function repairUtf8Mojibake(value: string): string {
  const input = (value || "").trim();
  if (!input || !hasUtf8Mojibake(input)) return input;
  try {
    const bytes = new Uint8Array([...input].map((ch) => ch.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!repaired || hasUtf8Mojibake(repaired)) return input;
    return repaired;
  } catch {
    return input;
  }
}

export function parseDispositionFilename(header: string | null | undefined): string {
  if (!header) return "";
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return repairUtf8Mojibake(decodeURIComponent(star[1]));
    } catch {
      return repairUtf8Mojibake(star[1]);
    }
  }
  const plain = header.match(/filename="([^"]+)"/i);
  if (plain) return repairUtf8Mojibake(plain[1]);
  const unquoted = header.match(/filename=([^;]+)/i);
  if (unquoted) return repairUtf8Mojibake(unquoted[1].trim());
  return "";
}

function pickHtmlFilename(...candidates: Array<string | null | undefined>): string {
  for (const raw of candidates) {
    const candidate = (raw || "").trim();
    if (!candidate) continue;
    if (!TENDER_FILENAME_EXT_RE.test(candidate)) continue;
    if (hasUtf8Mojibake(candidate)) continue;
    if (hasPolishChars(candidate)) return candidate.slice(0, 200);
  }
  return "";
}

export function resolvePlatformazakupowaFilename(opts: {
  contentDisposition: string | null | undefined;
  htmlFilename?: string | null;
  htmlLabel?: string | null;
  fallback?: string | null;
}): string {
  const fromCdRaw = parseDispositionFilename(opts.contentDisposition ?? null);
  const fromCd = fromCdRaw || "";
  const htmlPick = pickHtmlFilename(opts.htmlFilename, opts.htmlLabel);

  if (fromCd && hasUtf8Mojibake(fromCd) && htmlPick) {
    return htmlPick;
  }

  if (fromCd) return fromCd;

  const htmlFallback = pickHtmlFilename(opts.htmlFilename, opts.htmlLabel);
  if (htmlFallback) return htmlFallback;

  const repairedFallback = repairUtf8Mojibake((opts.fallback || "").trim());
  return repairedFallback || fromCd;
}

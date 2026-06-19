/**
 * SmartPZP MVP — URL extraction + listaDokumentow HTML parser (pure, testable).
 * Keep in sync with supabase/functions/.../tender-smartpzp.ts (pure section).
 */

export const SMARTPZP_ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "zip", "7z", "ath", "nor",
]);

export const SMARTPZP_PROCEEDING_URL_RE =
  /portal\.smartpzp\.pl\/([a-z0-9_-]+)\/public\/postepowanie\?postepowanie=(\d+)/i;

export const SMARTPZP_RK_QUERY = "wgdomRk";

export interface SmartPzpProceedingRef {
  tenant: string;
  proceedingId: string;
  canonicalUrl: string;
}

export interface SmartPzpDocumentRow {
  rk: string;
  rowIndex: string;
  filename: string;
  extension: string;
  uploadedAt?: string;
}

/** Wyciąga pierwszy kanoniczny URL postępowania z noticeHtml. */
export function extractSmartPzpProceedingUrl(noticeHtml: string): SmartPzpProceedingRef | null {
  if (!noticeHtml?.trim()) return null;
  for (const m of noticeHtml.matchAll(/https?:\/\/[^\s"'<>]*smartpzp\.pl[^\s"'<>]*/gi)) {
    const ref = parseSmartPzpProceedingUrl(m[0].replace(/[.,;)]+$/g, ""));
    if (ref) return ref;
  }
  const rel = noticeHtml.match(SMARTPZP_PROCEEDING_URL_RE);
  if (rel) {
    const tenant = rel[1];
    const proceedingId = rel[2];
    return {
      tenant,
      proceedingId,
      canonicalUrl: `https://portal.smartpzp.pl/${tenant}/public/postepowanie?postepowanie=${proceedingId}`,
    };
  }
  return null;
}

export function parseSmartPzpProceedingUrl(url: string): SmartPzpProceedingRef | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const m = u.href.match(SMARTPZP_PROCEEDING_URL_RE);
    if (!m) return null;
    return {
      tenant: m[1],
      proceedingId: m[2],
      canonicalUrl: `https://portal.smartpzp.pl/${m[1]}/public/postepowanie?postepowanie=${m[2]}`,
    };
  } catch {
    return null;
  }
}

export function extractSmartPzpProceedingUrlFromText(text: string): string | null {
  return extractSmartPzpProceedingUrl(text)?.canonicalUrl ?? null;
}

export function buildSmartPzpDownloadUrl(canonicalUrl: string, rk: string): string {
  const u = new URL(canonicalUrl);
  u.searchParams.set(SMARTPZP_RK_QUERY, rk);
  return u.href;
}

export function parseSmartPzpDownloadUrl(downloadUrl: string): { pageUrl: string; rk: string } | null {
  if (!downloadUrl?.trim()) return null;
  try {
    const u = new URL(downloadUrl);
    if (!/smartpzp\.pl/i.test(u.hostname)) return null;
    const rk = u.searchParams.get(SMARTPZP_RK_QUERY)?.trim();
    if (!rk || !/^\d+$/.test(rk)) return null;
    u.searchParams.delete(SMARTPZP_RK_QUERY);
    return { pageUrl: u.href, rk };
  } catch {
    return null;
  }
}

export function extractViewStateFromHtml(html: string): string {
  return (
    html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/i)?.[1]
    || html.match(/id="javax\.faces\.ViewState"[^>]*value="([^"]+)"/i)?.[1]
    || ""
  );
}

export function extractViewStateFromPartialResponse(xml: string): string | null {
  const m = xml.match(/<update id="javax\.faces\.ViewState"><!\[CDATA\[([^\]]+)\]\]>/i)
    || xml.match(/ViewState[^>]*value="([^"]+)"/i);
  return m?.[1] ?? null;
}

/** Parser tabeli listaDokumentowTabela (PrimeFaces datatable). */
export function parseListaDokumentowHtml(html: string): SmartPzpDocumentRow[] {
  if (!html?.trim()) return [];
  const out: SmartPzpDocumentRow[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(
    /<tr[^>]*data-ri="(\d+)"[^>]*data-rk="(\d+)"[\s\S]*?<\/tr>/gi,
  )) {
    const rowIndex = m[1];
    const rk = m[2];
    if (seen.has(rk)) continue;

    const rowHtml = m[0];
    const spanMatch = rowHtml.match(/<span[^>]*>([^<]+\.(pdf|docx?|xlsx?|zip|7z|ath|nor))<\/span>/i);
    const rawName = spanMatch?.[1]?.trim()
      || rowHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(/\s{2,}/)[0]?.trim()
      || "";
    const filename = rawName.replace(/\s+\d{2}-\d{2}-\d{4}.*/, "").trim();
    const extMatch = filename.match(/\.([a-z0-9]+)$/i);
    const extension = (extMatch?.[1] || "").toLowerCase();
    if (!extension || !SMARTPZP_ALLOWED_EXTENSIONS.has(extension)) continue;

    const dateMatch = rowHtml.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})/);
    seen.add(rk);
    out.push({
      rk,
      rowIndex,
      filename,
      extension,
      uploadedAt: dateMatch?.[1],
    });
  }
  return out;
}

export function inferSmartPzpContentType(filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc": return "application/msword";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls": return "application/vnd.ms-excel";
    case "zip": return "application/zip";
    case "7z": return "application/x-7z-compressed";
    default: return "application/octet-stream";
  }
}

export function smartPzpFilenameMatchesExpected(contentDisposition: string, expectedFilename: string): boolean {
  if (!contentDisposition?.trim() || !expectedFilename?.trim()) return false;
  const cd = contentDisposition.toLowerCase();
  const base = expectedFilename.toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
  const cdNorm = cd.replace(/[^a-z0-9._-]+/g, "_");
  const shortBase = base.replace(/\.[^.]+$/, "").slice(0, 12);
  return cdNorm.includes(shortBase) || cd.includes(expectedFilename.toLowerCase().slice(0, 20));
}

/**
 * SmartPZP MVP — session + JSF download (Edge).
 * Pure helpers synced with src/lib/tender-smartpzp.ts
 */

export const SMARTPZP_FETCH_UA = "WGDOM/2.62.16 smartpzp";
export const SMARTPZP_FORM = "postepowanieTabs:listaDokumentowForm";
export const SMARTPZP_TABLE = `${SMARTPZP_FORM}:listaDokumentowTabela`;
export const SMARTPZP_PRZYCISKI = `${SMARTPZP_FORM}:przyciskiDokumentacja`;
export const SMARTPZP_DOWNLOAD_BTN = `${SMARTPZP_FORM}:downloadBtn`;
export const SMARTPZP_BUTTON_YES = `${SMARTPZP_FORM}:buttonYes`;

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

export interface SmartPzpSession {
  pageUrl: string;
  html: string;
  cookie: string;
  viewState: string;
}

export function extractSmartPzpProceedingUrl(noticeHtml: string): SmartPzpProceedingRef | null {
  if (!noticeHtml?.trim()) return null;
  for (const m of noticeHtml.matchAll(/https?:\/\/[^\s"'<>]*smartpzp\.pl[^\s"'<>]*/gi)) {
    const ref = parseSmartPzpProceedingUrl(m[0].replace(/[.,;)]+$/g, ""));
    if (ref) return ref;
  }
  const rel = noticeHtml.match(SMARTPZP_PROCEEDING_URL_RE);
  if (rel) {
    return {
      tenant: rel[1],
      proceedingId: rel[2],
      canonicalUrl: `https://portal.smartpzp.pl/${rel[1]}/public/postepowanie?postepowanie=${rel[2]}`,
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
    out.push({ rk, rowIndex, filename, extension, uploadedAt: dateMatch?.[1] });
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

function isSmartPzpBinaryResponse(contentType: string, bytes: Uint8Array): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("html")) return false;
  if (bytes.byteLength < 64) return false;
  if (ct.includes("pdf") || ct.includes("octet") || ct.includes("zip")
    || ct.includes("spreadsheet") || ct.includes("wordprocessing")) return true;
  return bytes[0] === 0x25 && bytes[1] === 0x50; // %P PDF
}

export function parseSmartPzpSetCookie(headers: Headers): string {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie()
      .map((c) => c.split(";")[0])
      .filter((c) => c && !/=\s*deleted$/i.test(c))
      .join("; ");
  }
  const raw = headers.get("set-cookie");
  if (!raw) return "";
  return raw.split(/,(?=[^;]+?=)/)
    .map((c) => c.split(";")[0].trim())
    .filter((c) => c && !/=\s*deleted$/i.test(c))
    .join("; ");
}

export function mergeSmartPzpCookies(prev: string, setCookie: string): string {
  const jar = new Map<string, string>();
  for (const part of prev.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [k, ...v] = part.split("=");
    if (k) jar.set(k, v.join("="));
  }
  for (const chunk of setCookie.split(/,(?=[^;]+?=)/)) {
    const seg = chunk.split(";")[0].trim();
    const [k, ...v] = seg.split("=");
    if (k) jar.set(k, v.join("="));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function openSmartPzpSession(pageUrl: string): Promise<SmartPzpSession | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*",
        "User-Agent": SMARTPZP_FETCH_UA,
        "Accept-Language": "pl-PL,pl;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const viewState = extractViewStateFromHtml(html);
    if (!viewState || !html.includes("listaDokumentowTabela")) return null;
    return {
      pageUrl: res.url,
      html,
      cookie: parseSmartPzpSetCookie(res.headers),
      viewState,
    };
  } catch {
    return null;
  }
}

async function smartPzpPartialPost(
  session: SmartPzpSession,
  fields: Record<string, string>,
): Promise<SmartPzpSession> {
  const body = new URLSearchParams({
    [SMARTPZP_FORM]: SMARTPZP_FORM,
    "javax.faces.ViewState": session.viewState,
    ...fields,
    "javax.faces.partial.ajax": "true",
  });
  const res = await fetch(session.pageUrl, {
    method: "POST",
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*",
      "User-Agent": SMARTPZP_FETCH_UA,
      Cookie: session.cookie,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Faces-Request": "partial/ajax",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  const nextVs = extractViewStateFromPartialResponse(text) || session.viewState;
  return {
    ...session,
    cookie: mergeSmartPzpCookies(session.cookie, parseSmartPzpSetCookie(res.headers)),
    viewState: nextVs,
  };
}

async function selectSmartPzpRow(session: SmartPzpSession, rk: string): Promise<SmartPzpSession> {
  return smartPzpPartialPost(session, {
    "javax.faces.source": SMARTPZP_TABLE,
    "javax.faces.partial.event": "rowSelectCheckbox",
    "javax.faces.partial.execute": SMARTPZP_TABLE,
    "javax.faces.partial.render": `${SMARTPZP_TABLE} ${SMARTPZP_PRZYCISKI}`,
    "javax.faces.behavior.event": "rowSelectCheckbox",
    [`${SMARTPZP_TABLE}_instantSelectedRowKey`]: rk,
    [`${SMARTPZP_TABLE}_selection`]: rk,
  });
}

async function postSmartPzpFormDownload(
  session: SmartPzpSession,
  rk: string,
  buttonId: string,
): Promise<{ res: Response; session: SmartPzpSession }> {
  const body = new URLSearchParams({
    [SMARTPZP_FORM]: SMARTPZP_FORM,
    "javax.faces.ViewState": session.viewState,
    [`${SMARTPZP_TABLE}_selection`]: rk,
    [buttonId]: buttonId,
  });
  const res = await fetch(session.pageUrl, {
    method: "POST",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/pdf,*/*",
      "User-Agent": SMARTPZP_FETCH_UA,
      Cookie: session.cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
  const nextVs = extractViewStateFromHtml(await res.clone().text()) || session.viewState;
  return {
    res,
    session: {
      ...session,
      cookie: mergeSmartPzpCookies(session.cookie, parseSmartPzpSetCookie(res.headers)),
      viewState: nextVs,
    },
  };
}

export async function downloadSmartPzpDocument(opts: {
  pageUrl: string;
  rk: string;
  expectedFilename?: string;
  rowIndex?: string;
}): Promise<
  | { ok: true; bytes: Uint8Array; filename: string; contentType: string }
  | { ok: false; error: string }
> {
  const session0 = await openSmartPzpSession(opts.pageUrl);
  if (!session0) return { ok: false, error: "smartpzp_session_failed" };

  const rowMeta = parseListaDokumentowHtml(session0.html).find((d) => d.rk === opts.rk);
  const expectedFilename = opts.expectedFilename || rowMeta?.filename || "";

  try {
    let session = await selectSmartPzpRow(session0, opts.rk);
    const attempts = [SMARTPZP_DOWNLOAD_BTN, SMARTPZP_BUTTON_YES];

    for (const buttonId of attempts) {
      const { res, session: nextSession } = await postSmartPzpFormDownload(session, opts.rk, buttonId);
      session = nextSession;
      if (!res.ok) continue;

      const ct = (res.headers.get("content-type") || "").split(";")[0];
      const cd = res.headers.get("content-disposition") || "";
      const bytes = new Uint8Array(await res.arrayBuffer());

      if (!isSmartPzpBinaryResponse(ct, bytes)) continue;

      const rawName = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1]
        || expectedFilename
        || "dokument.bin";
      const filename = decodeURIComponent(rawName.replace(/"/g, "").trim());

      if (expectedFilename && cd && !smartPzpFilenameMatchesExpected(cd, expectedFilename)) {
        continue;
      }

      return {
        ok: true,
        bytes,
        filename,
        contentType: ct || inferSmartPzpContentType(filename),
      };
    }
  } catch {
    return { ok: false, error: "smartpzp_download_failed" };
  }

  return { ok: false, error: "smartpzp_download_failed" };
}

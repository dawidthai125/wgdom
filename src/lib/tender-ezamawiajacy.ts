/**
 * P2-H.1 — Marketplanet / *.ezamawiajacy.pl (sesja JSESSIONID + repository/download).
 */

export const EZAMAWIAJACY_HOST_RE = /\.ezamawiajacy\.pl/i;

export const EZAMAWIAJACY_PAGE_RE =
  /https?:\/\/[a-z0-9-]+\.ezamawiajacy\.pl\/pn\/[A-Za-z0-9_]+\/demand\/\d+\/notice\/public\/details/gi;

export const EZAMAWIAJACY_REPO_RE = /\/repository\/download\/[A-Za-z0-9]+/g;

export const EZAMAWIAJACY_FETCH_UA = "WGDOM/2.55.0 ezamawiajacy";

export interface EzamawiajacyAttachmentRef {
  tokenPath: string;
  label?: string;
}

export interface EzamawiajacyPageSession {
  pageUrl: string;
  finalUrl: string;
  cookie: string;
  html: string;
  tokenPaths: string[];
}

export interface EzamawiajacyBzpDocumentMeta {
  index: number;
  documentId: string;
  filename: string;
  contentType: string;
  downloadUrl: string;
  isSwzHint: boolean;
  platform: "ezamawiajacy";
  sourcePageUrl: string;
}

/** Strony postępowania z ogłoszenia BZP. */
export function extractEzamawiajacyPageUrls(noticeHtml: string): string[] {
  if (!noticeHtml?.trim()) return [];
  const out = new Set<string>();
  for (const m of noticeHtml.matchAll(EZAMAWIAJACY_PAGE_RE)) {
    out.add(m[0].replace(/[.,;)]+$/g, ""));
  }
  for (const url of [...noticeHtml.matchAll(/https?:\/\/[^\s<>"']+/gi)]
    .map((m) => m[0].replace(/[.,;)]+$/g, ""))) {
    if (!EZAMAWIAJACY_HOST_RE.test(url)) continue;
    if (/\/demand\/\d+\/notice\/public\/details/i.test(url)) {
      out.add(url);
    }
  }
  return [...out];
}

export function parseEzamawiajacyRepoTokens(html: string): string[] {
  if (!html?.trim()) return [];
  return [...new Set([...html.matchAll(EZAMAWIAJACY_REPO_RE)].map((m) => m[0]))];
}

/** Markery HTML Marketplanet: attachmentWidget, downloadPostUrl, mpFrm3. */
export function parseEzamawiajacyAttachmentsFromHtml(html: string): EzamawiajacyAttachmentRef[] {
  if (!html?.trim()) return [];
  const out = new Map<string, EzamawiajacyAttachmentRef>();

  const add = (tokenPath: string, label?: string) => {
    if (!tokenPath.includes("/repository/download/")) return;
    const prev = out.get(tokenPath);
    if (!prev || (label && !prev.label)) {
      out.set(tokenPath, { tokenPath, label: label?.trim() || prev?.label });
    }
  };

  for (const m of html.matchAll(EZAMAWIAJACY_REPO_RE)) {
    add(m[0]);
  }

  for (const m of html.matchAll(
    /<a[^>]+href=["']([^"']*\/repository\/download\/[A-Za-z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const label = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    add(m[1].startsWith("/") ? m[1] : `/${m[1].split("/").slice(-3).join("/")}`, label);
  }

  for (const block of html.match(/attachmentWidget[\s\S]{0,4000}/gi) ?? []) {
    for (const t of parseEzamawiajacyRepoTokens(block)) add(t);
    const name = block.match(/class=["'][^"']*file[^"']*["'][^>]*>([^<]{3,120})</i)?.[1]?.trim();
    const token = [...block.matchAll(EZAMAWIAJACY_REPO_RE)][0]?.[0];
    if (token) add(token, name);
  }

  for (const block of html.match(/mpFrm3[\s\S]{0,6000}/gi) ?? []) {
    for (const t of parseEzamawiajacyRepoTokens(block)) add(t);
  }

  for (const m of html.matchAll(/downloadPostUrl["'\s:=]+([^"'\\s>]+)/gi)) {
    const val = m[1];
    if (val.includes("repository/download")) {
      const token = val.match(EZAMAWIAJACY_REPO_RE)?.[0];
      if (token) add(token);
    }
  }

  return [...out.values()];
}

export function extractEzamawiajacyFolderUrls(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  for (const m of html.matchAll(/href=["']([^"']*\?folder=\d+[^"']*)["']/gi)) {
    try {
      out.add(new URL(m[1], baseUrl).href);
    } catch {
      /* skip */
    }
  }
  for (const m of html.matchAll(/\/pn\/[A-Za-z0-9_]+\/demand\/notice\/public\/\d+\/details\?folder=\d+[^"'\\s]*/gi)) {
    out.add(origin + m[0]);
  }
  return [...out];
}

export function parseSetCookieHeader(headers: Headers): string {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie().map((c) => c.split(";")[0]).filter(Boolean).join("; ");
  }
  const raw = headers.get("set-cookie");
  if (!raw) return "";
  return raw.split(/,(?=[^;]+?=)/).map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
}

function extFromContentType(ct: string): string {
  const l = ct.toLowerCase();
  if (l.includes("pdf")) return ".pdf";
  if (l.includes("wordprocessingml") || l.includes("docx")) return ".docx";
  if (l.includes("msword")) return ".doc";
  if (l.includes("spreadsheetml") || l.includes("excel")) return ".xlsx";
  if (l.includes("ms-excel")) return ".xls";
  if (l.includes("zip")) return ".zip";
  return ".bin";
}

function normalizeFilename(raw: string | null, index: number, contentType: string): string {
  const name = (raw || "").trim();
  if (name && !/^(dokument|document|file|download)$/i.test(name)) return name;
  return `Zalacznik_${index}${extFromContentType(contentType)}`;
}

function isSwzFilename(name: string): boolean {
  const n = name.toLowerCase();
  return /swz|opz|specyfikac|kosztorys|formularz/.test(n);
}

function parseDispositionFilename(cd: string | null): string | null {
  if (!cd) return null;
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const plain = cd.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() || null;
}

function isHtmlNotFound(body: Uint8Array, contentType: string): boolean {
  if (!contentType.includes("html")) return false;
  const text = new TextDecoder().decode(body.slice(0, 400));
  return /nie zosta[ał] znaleziony|404|Podany plik/i.test(text);
}

export async function openEzamawiajacyPageSession(
  pageUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<EzamawiajacyPageSession | null> {
  if (!EZAMAWIAJACY_HOST_RE.test(pageUrl)) return null;
  try {
    const res = await fetchFn(pageUrl, {
      headers: { Accept: "text/html,*/*", "User-Agent": EZAMAWIAJACY_FETCH_UA },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const attachments = parseEzamawiajacyAttachmentsFromHtml(html);
    return {
      pageUrl,
      finalUrl: res.url,
      cookie: parseSetCookieHeader(res.headers),
      html,
      tokenPaths: attachments.map((a) => a.tokenPath),
    };
  } catch {
    return null;
  }
}

export async function collectEzamawiajacyTokenPaths(
  session: EzamawiajacyPageSession,
  fetchFn: typeof fetch = fetch,
): Promise<EzamawiajacyAttachmentRef[]> {
  const refs = new Map<string, EzamawiajacyAttachmentRef>();
  for (const a of parseEzamawiajacyAttachmentsFromHtml(session.html)) {
    refs.set(a.tokenPath, a);
  }
  const folders = extractEzamawiajacyFolderUrls(session.html, session.finalUrl).slice(0, 4);
  for (const folderUrl of folders) {
    try {
      const res = await fetchFn(folderUrl, {
        headers: {
          Accept: "text/html,*/*",
          "User-Agent": EZAMAWIAJACY_FETCH_UA,
          Cookie: session.cookie,
          Referer: session.finalUrl,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      for (const a of parseEzamawiajacyAttachmentsFromHtml(html)) {
        refs.set(a.tokenPath, a);
      }
    } catch {
      /* next folder */
    }
  }
  return [...refs.values()];
}

export async function probeEzamawiajacyDocumentMeta(
  origin: string,
  tokenPath: string,
  session: Pick<EzamawiajacyPageSession, "cookie" | "finalUrl">,
  fetchFn: typeof fetch = fetch,
): Promise<{ contentType: string; contentDisposition: string | null } | null> {
  if (!session.cookie?.trim()) return null;
  const downloadUrl = origin + tokenPath;
  try {
    const res = await fetchFn(downloadUrl, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "User-Agent": EZAMAWIAJACY_FETCH_UA,
        Cookie: session.cookie,
        Referer: session.finalUrl,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "application/octet-stream";
    const cd = res.headers.get("content-disposition");
    try {
      await res.body?.cancel();
    } catch {
      /* probe only */
    }
    if (ct.includes("html") && !cd) return null;
    return { contentType: ct, contentDisposition: cd };
  } catch {
    return null;
  }
}

export async function downloadEzamawiajacyToken(
  origin: string,
  tokenPath: string,
  session: Pick<EzamawiajacyPageSession, "cookie" | "finalUrl">,
  label?: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string } | null> {
  if (!session.cookie?.trim()) return null;
  const downloadUrl = origin + tokenPath;
  try {
    const res = await fetchFn(downloadUrl, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "User-Agent": EZAMAWIAJACY_FETCH_UA,
        Cookie: session.cookie,
        Referer: session.finalUrl,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    if (bytes.byteLength < 100 || bytes.byteLength > 15 * 1024 * 1024) return null;
    if (isHtmlNotFound(bytes, contentType)) return null;
    const filename = normalizeFilename(
      parseDispositionFilename(res.headers.get("content-disposition")) || label || null,
      1,
      contentType,
    );
    return {
      bytes,
      filename,
      contentType: contentType.split(";")[0],
    };
  } catch {
    return null;
  }
}

export async function fetchEzamawiajacyDocumentByIndex(
  sourcePageUrl: string,
  documentIndex: number,
  fetchFn: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string } | null> {
  if (documentIndex < 1 || !EZAMAWIAJACY_HOST_RE.test(sourcePageUrl)) return null;
  const session = await openEzamawiajacyPageSession(sourcePageUrl, fetchFn);
  if (!session?.cookie) return null;
  const origin = new URL(session.finalUrl).origin;
  const attachments = await collectEzamawiajacyTokenPaths(session, fetchFn);
  const ref = attachments[documentIndex - 1];
  if (!ref) return null;
  const file = await downloadEzamawiajacyToken(origin, ref.tokenPath, session, ref.label, fetchFn);
  if (!file) return null;
  const filename = normalizeFilename(
    file.filename || ref.label || null,
    documentIndex,
    file.contentType,
  );
  return { bytes: file.bytes, filename, contentType: file.contentType };
}

/** Lista dokumentów BZP z notice HTML (sesja per strona, bez cache tokenów). */
export async function fetchEzamawiajacyDocuments(
  noticeHtml: string,
  fetchFn: typeof fetch = fetch,
): Promise<EzamawiajacyBzpDocumentMeta[]> {
  const pages = extractEzamawiajacyPageUrls(noticeHtml);
  if (pages.length === 0) return [];

  const docs: EzamawiajacyBzpDocumentMeta[] = [];
  const seen = new Set<string>();
  let idx = 0;

  for (const pageUrl of pages.slice(0, 2)) {
    const session = await openEzamawiajacyPageSession(pageUrl, fetchFn);
    if (!session?.cookie) continue;
    const origin = new URL(session.finalUrl).origin;
    const attachments = await collectEzamawiajacyTokenPaths(session, fetchFn);

    for (const ref of attachments.slice(0, 30)) {
      const meta = await probeEzamawiajacyDocumentMeta(origin, ref.tokenPath, session, fetchFn);
      if (!meta) continue;
      const rawName = parseDispositionFilename(meta.contentDisposition) || ref.label || null;
      const filename = normalizeFilename(rawName, idx + 1, meta.contentType);
      const key = `${filename}|${ref.tokenPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      idx += 1;
      docs.push({
        index: idx,
        documentId: `ezamawiajacy_${idx}`,
        filename,
        contentType: meta.contentType.split(";")[0],
        downloadUrl: origin + ref.tokenPath,
        isSwzHint: isSwzFilename(filename),
        platform: "ezamawiajacy",
        sourcePageUrl: pageUrl,
      });
    }
  }
  return docs;
}

export function isEzamawiajacyDownloadUrl(url: string): boolean {
  return EZAMAWIAJACY_HOST_RE.test(url) && /\/repository\/download\//i.test(url);
}

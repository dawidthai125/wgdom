/**
 * SSRF / URL safety for discovery enqueue (HTTPS only · no private · no credentials).
 */

const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|::1$)/i;

const ALLOWED_CONTENT_TYPES = new Set([
  "text/html",
  "application/pdf",
  "application/xhtml+xml",
  "text/plain",
  "application/json",
]);

export function assertDiscoveryUrlSafe(urlStr: string):
  | { ok: true; url: URL; host: string; normalized: string }
  | { ok: false; reasonPl: string } {
  const raw = String(urlStr || "").trim();
  if (!raw) return { ok: false, reasonPl: "Pusty URL." };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reasonPl: "Niepoprawny URL." };
  }
  if (u.protocol !== "https:") {
    return { ok: false, reasonPl: "Tylko HTTPS (SSRF guard)." };
  }
  if (u.username || u.password) {
    return { ok: false, reasonPl: "URL z credentials zabroniony." };
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!host || PRIVATE_HOST_RE.test(host) || PRIVATE_HOST_RE.test(u.hostname)) {
    return { ok: false, reasonPl: "Host lokalny / prywatny zabroniony." };
  }
  // Block literal IP private ranges via hostname digits
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number);
    const a = parts[0]!, b = parts[1]!;
    if (
      a === 10
      || a === 127
      || (a === 192 && b === 168)
      || (a === 172 && b >= 16 && b <= 31)
      || a === 0
    ) {
      return { ok: false, reasonPl: "Prywatny adres IP zabroniony." };
    }
  }
  u.hash = "";
  const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
  const normalized = `${u.protocol}//${host}${path}${u.search}`;
  return { ok: true, url: u, host, normalized };
}

export function isDiscoveryContentTypeAllowed(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const base = String(contentType).split(";")[0]!.trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.has(base);
}

/** Max redirects for future fetch validation (contract constant). */
export const DISCOVERY_REDIRECT_CAP = 3;

export { ALLOWED_CONTENT_TYPES };

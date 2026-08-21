/**
 * KL-7-P2B — SSRF host / IP guards (before any fetch).
 * Fail-closed. No DNS rebinding mitigation beyond literal IP denial in v1.
 */

const PRIVATE_IPV4_RE =
  /^(?:127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/;

const IPV4_LITERAL_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isIpv4Literal(host: string): boolean {
  return IPV4_LITERAL_RE.test(host);
}

function isPrivateOrLocalIpv4(host: string): boolean {
  if (!isIpv4Literal(host)) return false;
  if (PRIVATE_IPV4_RE.test(host)) return true;
  const m = host.match(IPV4_LITERAL_RE);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a > 255 || b > 255 || Number(m[3]) > 255 || Number(m[4]) > 255) return true;
  // 100.64.0.0/10 CGNAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function stripBrackets(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
  return host;
}

/** True when hostname must be denied (loopback / private / link-local / metadata). */
export function isKnrDiscoverySsrfDeniedHost(hostname: string): boolean {
  const raw = String(hostname ?? "").trim().toLowerCase();
  if (!raw) return true;
  const host = stripBrackets(raw);

  if (
    host === "localhost"
    || host === "localhost."
    || host.endsWith(".localhost")
    || host === "metadata.google.internal"
    || host === "metadata.google"
  ) {
    return true;
  }

  if (isPrivateOrLocalIpv4(host)) return true;

  // IPv6 loopback / link-local / ULA
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host.startsWith("fe80:") || host.startsWith("fe80::")) return true;
  if (host.startsWith("fc") || host.startsWith("fd")) {
    // Unique local fc00::/7 — coarse deny for hex prefix
    if (/^f[cd][0-9a-f]{0,2}:/i.test(host)) return true;
  }
  if (host === "::" || host === "0:0:0:0:0:0:0:0") return true;

  // IPv4-mapped IPv6 :ffff:127.0.0.1
  const mapped = host.match(/:ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped && isPrivateOrLocalIpv4(mapped[1]!)) return true;

  return false;
}

export function assertKnrDiscoveryUrlSafeForFetch(
  urlStr: string,
): { ok: true; url: URL } | { ok: false; reason: "INVALID_URL" | "SSRF_DENIED" | "NON_HTTPS" } {
  let url: URL;
  try {
    url = new URL(String(urlStr ?? "").trim());
  } catch {
    return { ok: false, reason: "INVALID_URL" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "NON_HTTPS" };
  if (url.username || url.password) return { ok: false, reason: "INVALID_URL" };
  if (isKnrDiscoverySsrfDeniedHost(url.hostname)) {
    return { ok: false, reason: "SSRF_DENIED" };
  }
  return { ok: true, url };
}

export const KNR_DISCOVERY_SSRF_P2B_IMPLEMENTED = true as const;

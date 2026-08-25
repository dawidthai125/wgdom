/**
 * KL-7-P2B — KNR discovery HTTP allowlist SSOT.
 * Production: EMPTY → NO CLAIM · NO FETCH.
 * Client never sends raw URL — only sourceId resolves here.
 */

export type KnrDiscoveryAllowlistEntry = {
  sourceId: string;
  /** Exact HTTPS hostname (lowercase). */
  hostname: string;
  /** Approved absolute HTTPS URL — never client-supplied. */
  url: string;
  /** Legal origin id for gate (must not be scrape_* unless OD). */
  originId: string;
  active: boolean;
  priority: "GOVERNMENT" | "OFFICIAL_PUBLIC_DOCUMENT" | "UNIVERSITY" | "OTHER";
};

/**
 * Production allowlist — Owner-curated only.
 * Phase 2D + 2E: each sourceId maps to one exact HTTPS URL · no wildcards · no raw client URL.
 */
export const KNR_DISCOVERY_HTTP_ALLOWLIST: readonly KnrDiscoveryAllowlistEntry[] =
  Object.freeze([
    {
      sourceId: "l3_bip_malopolska_1646919",
      hostname: "bip.malopolska.pl",
      url: "https://bip.malopolska.pl/api/files/1646919",
      originId: "knr_official_public_document",
      active: true,
      priority: "OFFICIAL_PUBLIC_DOCUMENT",
    },
    {
      sourceId: "l3_rckik_wroclaw_1202_07",
      hostname: "www.rckik.wroclaw.pl",
      url: "https://www.rckik.wroclaw.pl/przetargi/20110629132027przedmiar_robot_zalacznik_7.pdf",
      originId: "knr_official_public_document",
      active: true,
      priority: "OFFICIAL_PUBLIC_DOCUMENT",
    },
  ]);

/** Test-only fixture — NEVER merge into production constant. */
export const KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE: readonly KnrDiscoveryAllowlistEntry[] =
  Object.freeze([
    {
      sourceId: "p2b_test_gov_fixture",
      hostname: "example.com",
      url: "https://example.com/knr-fixture.html",
      originId: "knr_government_public",
      active: true,
      priority: "GOVERNMENT",
    },
  ]);

export function listKnrDiscoveryAllowlist(
  override?: readonly KnrDiscoveryAllowlistEntry[] | null,
): readonly KnrDiscoveryAllowlistEntry[] {
  return override ?? KNR_DISCOVERY_HTTP_ALLOWLIST;
}

export function isKnrDiscoveryAllowlistEmpty(
  override?: readonly KnrDiscoveryAllowlistEntry[] | null,
): boolean {
  return listKnrDiscoveryAllowlist(override).filter((e) => e.active).length === 0;
}

export function resolveKnrDiscoveryAllowlistSource(
  sourceId: string,
  override?: readonly KnrDiscoveryAllowlistEntry[] | null,
):
  | { ok: true; entry: KnrDiscoveryAllowlistEntry }
  | { ok: false; reason: "UNKNOWN_SOURCE" | "SOURCE_INACTIVE" | "INVALID_URL" | "HOST_MISMATCH" } {
  const id = String(sourceId ?? "").trim();
  if (!id) return { ok: false, reason: "UNKNOWN_SOURCE" };
  const entry = listKnrDiscoveryAllowlist(override).find((e) => e.sourceId === id);
  if (!entry) return { ok: false, reason: "UNKNOWN_SOURCE" };
  if (!entry.active) return { ok: false, reason: "SOURCE_INACTIVE" };
  let parsed: URL;
  try {
    parsed = new URL(entry.url);
  } catch {
    return { ok: false, reason: "INVALID_URL" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "INVALID_URL" };
  if (parsed.hostname.toLowerCase() !== entry.hostname.toLowerCase()) {
    return { ok: false, reason: "HOST_MISMATCH" };
  }
  return { ok: true, entry };
}

export function isKnrDiscoveryHostnameAllowlisted(
  hostname: string,
  override?: readonly KnrDiscoveryAllowlistEntry[] | null,
): boolean {
  const h = String(hostname ?? "").trim().toLowerCase();
  if (!h) return false;
  return listKnrDiscoveryAllowlist(override).some(
    (e) => e.active && e.hostname.toLowerCase() === h,
  );
}

export const KNR_DISCOVERY_ALLOWLIST_P2B_IMPLEMENTED = true as const;

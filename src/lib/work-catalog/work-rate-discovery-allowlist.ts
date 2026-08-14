/**
 * WORK-RATE-RESEARCH-DISCOVERY-01 INFRA — PASS 2 category URL allowlist.
 *
 * Owner-curated · deterministic · same 4 hosts only.
 * Client never sends URL — Edge/client resolve sourceId+categoryKey → URL.
 * Default allowlist is EMPTY (SOURCE GAP / no niche claim).
 */

import type { WorkRateAuthorizedSourceId } from "@/lib/work-catalog/work-rate-legal";
import {
  WORK_RATE_CANONICAL_CENNIK_URL,
  isWorkRateSelectiveUrlAllowed,
} from "@/lib/work-catalog/work-rate-source-html-parse";

/** Category keys — discovery routing only · never set PLN. */
export type WorkRateCategoryKey =
  | "default"
  | "painting"
  | "masonry_plaster"
  | "plaster"
  | "flooring"
  | "repairs"
  | "grooves"
  | "sealing_protection"
  | "unknown";

export type WorkRateWorkFamily =
  | "painting"
  | "plaster"
  | "priming"
  | "flooring"
  | "grooves"
  | "sealing_protection"
  | "repairs"
  | "demolition"
  | "masonry"
  | "electrical"
  | "plumbing"
  | "unknown";

export type WorkRatePass2AllowlistEntry = {
  sourceId: WorkRateAuthorizedSourceId;
  categoryKey: Exclude<WorkRateCategoryKey, "default" | "unknown">;
  url: string;
};

/**
 * Production PASS2 allowlist — EMPTY until Owner approves non-niche URLs.
 * Niche (wykwity/bruzdy/folia) MUST NOT be inserted without Source Audit PASS.
 */
export const WORK_RATE_PASS2_CATEGORY_ALLOWLIST: readonly WorkRatePass2AllowlistEntry[] =
  Object.freeze([]);

/** Max extra category pages per source after PASS1 (deterministic budget). */
export const WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE = 2 as const;

let allowlistOverride: readonly WorkRatePass2AllowlistEntry[] | null = null;

/** Test-only — restore with null. */
export function setWorkRatePass2AllowlistForTests(
  entries: readonly WorkRatePass2AllowlistEntry[] | null,
): void {
  allowlistOverride = entries;
}

export function getWorkRatePass2Allowlist(): readonly WorkRatePass2AllowlistEntry[] {
  return allowlistOverride ?? WORK_RATE_PASS2_CATEGORY_ALLOWLIST;
}

export function isWorkRatePass2AllowlistEmpty(): boolean {
  return getWorkRatePass2Allowlist().length === 0;
}

export function resolveWorkRatePass2Url(
  sourceId: WorkRateAuthorizedSourceId,
  categoryKey: string,
): string | null {
  const key = String(categoryKey || "").trim();
  if (!key || key === "default" || key === "unknown") return null;
  const row = getWorkRatePass2Allowlist().find(
    (e) => e.sourceId === sourceId && e.categoryKey === key,
  );
  if (!row) return null;
  if (!isWorkRateSelectiveUrlAllowed(row.url)) return null;
  return row.url;
}

export function listWorkRatePass2CategoryKeysForSource(
  sourceId: WorkRateAuthorizedSourceId,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const e of getWorkRatePass2Allowlist()) {
    if (e.sourceId !== sourceId) continue;
    if (seen.has(e.categoryKey)) continue;
    seen.add(e.categoryKey);
    keys.push(e.categoryKey);
    if (keys.length >= WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE) break;
  }
  return keys;
}

/** Family → preferred category keys (only those present in allowlist are fetched). */
const FAMILY_TO_CATEGORY: Record<WorkRateWorkFamily, readonly string[]> = {
  painting: ["painting"],
  plaster: ["plaster", "masonry_plaster"],
  priming: ["painting", "plaster"],
  flooring: ["flooring"],
  grooves: ["grooves"],
  sealing_protection: ["sealing_protection"],
  repairs: ["repairs"],
  demolition: ["repairs"],
  masonry: ["masonry_plaster"],
  electrical: [],
  plumbing: [],
  unknown: [],
};

export function resolveWorkRateWorkFamily(input: {
  workId?: string;
  namePl?: string;
}): WorkRateWorkFamily {
  const blob = `${input.workId || ""} ${input.namePl || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (/malow|paint|farba/.test(blob)) return "painting";
  if (/grunt/.test(blob)) return "priming";
  if (/glad|gladz|szpachl|tynk/.test(blob)) return "plaster";
  if (/panel|podlog|cyklin/.test(blob)) return "flooring";
  if (/wykwit|zaciek/.test(blob)) return "repairs";
  if (/zapraw.*bruz|zamurow.*bruz|uzupeln.*bruz|uzupełn.*bruz/.test(blob))
    return "grooves";
  if (/kucie.*bruz|bruzd.*beton/.test(blob)) return "grooves";
  if (/foli|zabezpiecz.*okien|zabezpiecz.*stolark|oslon.*okien/.test(blob))
    return "sealing_protection";
  if (/wykuc|demontaz|kucie/.test(blob)) return "demolition";
  if (/murars|murowan/.test(blob)) return "masonry";
  if (/elektr/.test(blob)) return "electrical";
  if (/hydraul|wod.-kan/.test(blob)) return "plumbing";
  return "unknown";
}

/**
 * Category keys to try for PASS2 for this work — intersection(family prefs, allowlist).
 * Empty ⇒ PASS1 only.
 */
export function listWorkRatePass2CategoryKeysForWork(input: {
  workId?: string;
  namePl?: string;
  sourceId: WorkRateAuthorizedSourceId;
}): string[] {
  const family = resolveWorkRateWorkFamily(input);
  const prefs = FAMILY_TO_CATEGORY[family] ?? [];
  const available = new Set(listWorkRatePass2CategoryKeysForSource(input.sourceId));
  const out: string[] = [];
  for (const k of prefs) {
    if (available.has(k)) out.push(k);
    if (out.length >= WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE) break;
  }
  // If family unknown but source has allowlisted keys, do NOT auto-fetch all
  // (deterministic: only family-mapped keys).
  return out;
}

export function normalizeWorkRateDiscoveryUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return String(url || "").trim().toLowerCase();
  }
}

/** PASS1 canonical URL for source (unchanged semantics). */
export function resolveWorkRatePass1CanonicalUrl(
  sourceId: WorkRateAuthorizedSourceId,
): string | null {
  const url = WORK_RATE_CANONICAL_CENNIK_URL[sourceId];
  if (!url || !isWorkRateSelectiveUrlAllowed(url)) return null;
  return url;
}

const VALID_SOURCE_IDS = new Set([
  "kb_pl",
  "sccot",
  "extradom",
  "cennikremontow_pl",
]);

/**
 * Edge/client contract SSOT — resolve lookup URL.
 * Arbitrary `url` in request → REJECT. Client may only send sourceId + categoryKey.
 * Mirrored in Edge `workRateResolveSelectiveLookupUrl` (Deno cannot import src/).
 */
export function resolveWorkRateSelectiveLookupRequest(input: {
  sourceId: unknown;
  query: unknown;
  categoryKey?: unknown;
  /** Forbidden if present (even null). */
  url?: unknown;
  hasOwnUrlProperty?: boolean;
}):
  | {
      ok: true;
      sourceId: WorkRateAuthorizedSourceId;
      url: string;
      discoveryMethod: "PASS1_CANONICAL" | "PASS2_CATEGORY";
      categoryKey: string | null;
    }
  | { ok: false; error: string } {
  if (input.hasOwnUrlProperty === true || input.url !== undefined) {
    return { ok: false, error: "arbitrary_url_forbidden" };
  }
  const sourceId = String(input.sourceId || "").trim();
  if (!VALID_SOURCE_IDS.has(sourceId)) {
    return { ok: false, error: "invalid_sourceId" };
  }
  const sid = sourceId as WorkRateAuthorizedSourceId;
  const query = String(input.query || "").trim();
  if (query.length < 2) {
    return { ok: false, error: "empty_query" };
  }
  const categoryKeyRaw = String(input.categoryKey ?? "").trim();
  const categoryKey =
    categoryKeyRaw && categoryKeyRaw !== "default" ? categoryKeyRaw : null;

  if (categoryKey) {
    const pass2 = resolveWorkRatePass2Url(sid, categoryKey);
    if (!pass2) {
      return { ok: false, error: "unknown_category_key" };
    }
    return {
      ok: true,
      sourceId: sid,
      url: pass2,
      discoveryMethod: "PASS2_CATEGORY",
      categoryKey,
    };
  }

  const pass1 = resolveWorkRatePass1CanonicalUrl(sid);
  if (!pass1) {
    return { ok: false, error: "url_not_allowed" };
  }
  return {
    ok: true,
    sourceId: sid,
    url: pass1,
    discoveryMethod: "PASS1_CANONICAL",
    categoryKey: null,
  };
}

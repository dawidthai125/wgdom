/**
 * GLOBAL-KNOWLEDGE-E1A — Legal Gate (pure).
 */

import type {
  GlobalKnowledgeAllowedUse,
  GlobalKnowledgeLicenceRecord,
  GlobalKnowledgeOriginId,
} from "./types";

/** Origins dozwolone w E1A (bez scrape / live feed). */
export const GLOBAL_KNOWLEDGE_ORIGIN_WHITELIST: readonly GlobalKnowledgeOriginId[] = [
  "manual_owner",
  "licensed_bundle",
  "user_controlled_import",
  "wgdom_internal",
  "technology_foundation",
] as const;

/** Origins STOP (Legal / AD-01). */
export const GLOBAL_KNOWLEDGE_ORIGIN_DENYLIST: readonly string[] = [
  "scrape_kb_pl",
  "scrape_sekocenbud",
  "scrape_interbud",
  "live_unlicensed_api",
  "marketplace_scrape",
] as const;

export type LegalGateRejectCode =
  | "MISSING_LICENCE_ID"
  | "LICENCE_UNKNOWN"
  | "LICENCE_INACTIVE"
  | "LICENCE_EXPIRED"
  | "ORIGIN_DENIED"
  | "ORIGIN_NOT_WHITELISTED"
  | "ORIGIN_NOT_ON_LICENCE"
  | "ALLOWED_USE_EMPTY"
  | "ALLOWED_USE_NOT_ON_LICENCE";

export interface LegalGateInput {
  licenceId: string;
  originId: string;
  allowedUse: GlobalKnowledgeAllowedUse[];
  /** ISO „teraz”. */
  nowIso?: string;
}

export interface LegalGateResult {
  ok: boolean;
  codes: LegalGateRejectCode[];
  licence: GlobalKnowledgeLicenceRecord | null;
}

export function isOriginWhitelisted(originId: string): boolean {
  return (GLOBAL_KNOWLEDGE_ORIGIN_WHITELIST as readonly string[]).includes(originId);
}

export function isOriginDenied(originId: string): boolean {
  return GLOBAL_KNOWLEDGE_ORIGIN_DENYLIST.includes(originId);
}

/**
 * Legal Gate — hard reject bez aktywnej licencji / whitelist origin / allowedUse.
 */
export function evaluateLegalGate(
  input: LegalGateInput,
  licences: readonly GlobalKnowledgeLicenceRecord[],
): LegalGateResult {
  const codes: LegalGateRejectCode[] = [];
  const licenceId = String(input.licenceId || "").trim();
  const originId = String(input.originId || "").trim();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const uses = Array.isArray(input.allowedUse) ? input.allowedUse : [];

  if (!licenceId) {
    codes.push("MISSING_LICENCE_ID");
    return { ok: false, codes, licence: null };
  }

  if (isOriginDenied(originId)) {
    codes.push("ORIGIN_DENIED");
  } else if (!isOriginWhitelisted(originId)) {
    codes.push("ORIGIN_NOT_WHITELISTED");
  }

  const licence = licences.find((l) => l.licenceId === licenceId) ?? null;
  if (!licence) {
    codes.push("LICENCE_UNKNOWN");
    return { ok: false, codes, licence: null };
  }
  if (!licence.active) codes.push("LICENCE_INACTIVE");
  if (licence.validTo) {
    const end = Date.parse(licence.validTo);
    const now = Date.parse(nowIso);
    if (Number.isFinite(end) && Number.isFinite(now) && now > end) {
      codes.push("LICENCE_EXPIRED");
    }
  }
  if (!licence.originsAllowed.includes(originId) && isOriginWhitelisted(originId)) {
    codes.push("ORIGIN_NOT_ON_LICENCE");
  }
  if (uses.length === 0) {
    codes.push("ALLOWED_USE_EMPTY");
  } else {
    const missing = uses.filter((u) => !licence.allowedUse.includes(u));
    if (missing.length) codes.push("ALLOWED_USE_NOT_ON_LICENCE");
  }

  return { ok: codes.length === 0, codes, licence };
}

/** Seed licencji wewnętrznej Owner — umożliwia przyszły controlled import (nie auto-data). */
export function createOwnerManualLicence(): GlobalKnowledgeLicenceRecord {
  return {
    licenceId: "lic-wgdom-owner-manual-v1",
    labelPl: "W&G DOM — import ręczny Ownera",
    originsAllowed: ["manual_owner", "wgdom_internal", "user_controlled_import"],
    allowedUse: ["identity", "lexicon", "graph"],
    active: true,
    validTo: null,
    notes: "E1A foundation — bez indicative_rate (E7 OUT).",
  };
}

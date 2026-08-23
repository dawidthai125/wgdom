/**
 * W2 — TRUSTED identity preserve policy (mapper glue).
 * REUSE F5 TRUSTED_MATCH contract — does NOT change competing / AMBIGUOUS policy.
 */

import type {
  OfferBoqLine,
  OfferBoqMatchMethod,
} from "@/lib/tender-offer-boq";

/** Mirror of boq-shadow-adapter TRUSTED_MATCH — keep in sync semantically, not duplicated logic path. */
export const TRUSTED_IDENTITY_MATCH_METHODS: ReadonlySet<OfferBoqMatchMethod> = new Set([
  "exact_knr",
  "catalog_map",
  "alias",
  "manual",
]);

const UNTRUSTED_METHODS: ReadonlySet<OfferBoqMatchMethod> = new Set([
  "unmatched",
  "category_heuristic",
]);

/**
 * True when line already carries a complete trusted identity tuple that mapper must not overwrite.
 */
export function hasCompleteTrustedIdentityTuple(
  line: Pick<
    OfferBoqLine,
    | "catalogWorkId"
    | "matchMethod"
    | "matchConfidence"
    | "isNoise"
  >,
): boolean {
  if (line.isNoise === true) return false;
  const catalogWorkId = String(line.catalogWorkId ?? "").trim();
  if (!catalogWorkId) return false;
  const method = line.matchMethod;
  if (!method || UNTRUSTED_METHODS.has(method)) return false;
  if (!TRUSTED_IDENTITY_MATCH_METHODS.has(method)) return false;
  if (line.matchConfidence === "low") return false;
  return true;
}

/**
 * When trusted tuple is complete, return preserved line for mapper short-circuit.
 * Returns null when mapper should run normally.
 */
export function preserveOfferBoqLineIfTrusted(line: OfferBoqLine): OfferBoqLine | null {
  if (!hasCompleteTrustedIdentityTuple(line)) return null;
  return {
    ...line,
    normalizedDescription: line.normalizedDescription ?? null,
    aliasRuleId: line.aliasRuleId ?? null,
  };
}

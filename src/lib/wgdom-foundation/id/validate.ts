import { ID_TYPES, PREFIX } from "./prefixes";
import { FND_ID_INVALID, type IdType } from "./types";

/** ULID: 26 znaków Crockford Base32 (bez I, L, O, U). Canonical = UPPERCASE. */
export const ULID_LENGTH = 26;
export const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const ULID_CHAR = new Set(ULID_ALPHABET.split(""));
const ULID_BODY_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Prefiksy posortowane od najdłuższego — unika fałszywego match przy rozszerzeniach. */
const PREFIX_ENTRIES: Array<{ type: IdType; prefix: string }> = ID_TYPES.map((type) => ({
  type,
  prefix: PREFIX[type],
}))
  .slice()
  .sort((a, b) => b.prefix.length - a.prefix.length);

export type ParsedId = {
  type: IdType;
  ulid: string;
};

export function isValidUlidBody(ulid: string): boolean {
  if (typeof ulid !== "string" || ulid.length !== ULID_LENGTH) return false;
  if (!ULID_BODY_RE.test(ulid)) return false;
  for (let i = 0; i < ulid.length; i++) {
    if (!ULID_CHAR.has(ulid[i]!)) return false;
  }
  return true;
}

/**
 * Parsuje PublicId = `${PREFIX}${ulid}`.
 * Lowercase ULID → reject (Fail Loud format).
 * Legacy UUID → null.
 */
export function parseId(value: string): ParsedId | null {
  if (typeof value !== "string" || value.length === 0) return null;

  for (const { type, prefix } of PREFIX_ENTRIES) {
    if (!value.startsWith(prefix)) continue;
    const rest = value.slice(prefix.length);
    if (!isValidUlidBody(rest)) return null;
    // Double prefix: snap_snap_<ulid> — rest zaczynałby się od prefiksu i nie byłby samym ULID
    // (już odrzucone przez isValidUlidBody jeśli zawiera `_` lub ma złą długość).
    // Dodatkowo: jeśli po prefiksie znowu występuje ten sam prefix + coś — invalid length/alphabet.
    return { type, ulid: rest };
  }
  return null;
}

export function isValidId(value: string, type?: IdType): boolean {
  const parsed = parseId(value);
  if (!parsed) return false;
  if (type !== undefined && parsed.type !== type) return false;
  return true;
}

export function assertId(value: string, type: IdType): void {
  if (!isValidId(value, type)) {
    const err = new Error(`Invalid foundation id for type "${type}"`);
    (err as Error & { code: string }).code = FND_ID_INVALID;
    throw err;
  }
}

/** Brand helpers — walidacja + brand (FOUNDATION-03). */
export function asSnapshotId(value: string): import("./types").SnapshotId {
  assertId(value, "snapshot");
  return value as import("./types").SnapshotId;
}

export function asRecipeId(value: string): import("./types").RecipeId {
  assertId(value, "recipe");
  return value as import("./types").RecipeId;
}

export function asVariantId(value: string): import("./types").VariantId {
  assertId(value, "variant");
  return value as import("./types").VariantId;
}

export function asProductKeyId(value: string): import("./types").ProductKeyId {
  assertId(value, "productKey");
  return value as import("./types").ProductKeyId;
}

export function asObservationId(value: string): import("./types").ObservationId {
  assertId(value, "observation");
  return value as import("./types").ObservationId;
}

export function asAggregateId(value: string): import("./types").AggregateId {
  assertId(value, "aggregate");
  return value as import("./types").AggregateId;
}

export function asAnalysisId(value: string): import("./types").AnalysisId {
  assertId(value, "analysis");
  return value as import("./types").AnalysisId;
}

export function asOfferBoqId(value: string): import("./types").OfferBoqId {
  assertId(value, "offerBoq");
  return value as import("./types").OfferBoqId;
}

export function asBidId(value: string): import("./types").BidId {
  assertId(value, "bid");
  return value as import("./types").BidId;
}

export function asDecisionId(value: string): import("./types").DecisionId {
  assertId(value, "decision");
  return value as import("./types").DecisionId;
}

export function asStartId(value: string): import("./types").StartId {
  assertId(value, "start");
  return value as import("./types").StartId;
}

export function asProjectCaseId(value: string): import("./types").ProjectCaseId {
  assertId(value, "projectCase");
  return value as import("./types").ProjectCaseId;
}

export function asEventId(value: string): import("./types").EventId {
  assertId(value, "event");
  return value as import("./types").EventId;
}

export function asFoundationId(value: string): import("./types").FoundationId {
  assertId(value, "foundation");
  return value as import("./types").FoundationId;
}

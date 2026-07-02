/**
 * P3.1B — słownik mapowania identyfikatorów źródeł rynku → roboty WGDOM (pure).
 * Bez CSV, UI, cloud, Przetargów.
 */

import type { MarketWorkMappingIndex } from "@/lib/work-catalog/market-source-adapter";
import {
  isMarketOriginId,
  type MarketOriginId,
} from "@/lib/work-catalog/market-sources";

export interface MarketWorkMapping {
  origin: MarketOriginId;
  externalId: string;
  workId: string;
  confidence: number;
  aliases: string[];
  updatedAt: string;
}

export interface MarketWorkMappingStore {
  mappings: MarketWorkMapping[];
  updatedAt: string;
}

export type MarketWorkMappingMatchedVia = "externalId" | "alias";

export interface MarketWorkMappingFindResult {
  mapping: MarketWorkMapping;
  matchedVia: MarketWorkMappingMatchedVia;
  matchedKey: string;
}

export interface MarketWorkMappingMatched {
  origin: MarketOriginId;
  externalId: string;
  workId: string;
  confidence: number;
  mapping: MarketWorkMapping;
  matchedVia: MarketWorkMappingMatchedVia;
}

export interface MarketWorkMappingUnmatched {
  origin: MarketOriginId;
  externalId: string;
  reason: "not_found";
}

export interface MarketWorkMappingRejected {
  origin: MarketOriginId;
  externalId: string;
  reason: "empty_external" | "invalid_origin" | "duplicate_in_batch";
  errors: string[];
}

export interface MarketWorkMappingReport {
  matched: MarketWorkMappingMatched[];
  unmatched: MarketWorkMappingUnmatched[];
  rejected: MarketWorkMappingRejected[];
}

export interface MarketWorkMappingValidationIssue {
  index: number;
  field: string;
  message: string;
}

export interface MarketWorkMappingValidateResult {
  ok: boolean;
  issues: MarketWorkMappingValidationIssue[];
}

export type RegisterMappingResult =
  | { ok: true; mapping: MarketWorkMapping; replaced: boolean }
  | { ok: false; reason: "duplicate_external" | "alias_collision" | "invalid"; errors: string[] };

export interface RegisterMappingOptions {
  updatedAtIso?: string;
  allowReplace?: boolean;
}

export interface ListMappingsFilter {
  origin?: MarketOriginId;
  workId?: string;
}

export interface MarketWorkMappingBatchItem {
  origin: MarketOriginId;
  externalId: string;
}

const DEFAULT_STORE_UPDATED_AT = "2026-06-13T00:00:00.000Z";

function normalizeExternalKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeAliases(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = normalizeExternalKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function parseConfidence(value: unknown, fallback = 0.7): number | null {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

export function createEmptyMarketWorkMappingStore(
  updatedAtIso: string = DEFAULT_STORE_UPDATED_AT,
): MarketWorkMappingStore {
  return { mappings: [], updatedAt: updatedAtIso };
}

export function normalizeMarketWorkMapping(
  raw: unknown,
  fallbackUpdatedAt: string,
): MarketWorkMapping | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Partial<MarketWorkMapping>;

  if (!isMarketOriginId(input.origin)) return null;
  if (typeof input.externalId !== "string" || !input.externalId.trim()) return null;
  if (typeof input.workId !== "string" || !input.workId.trim()) return null;

  const confidence = parseConfidence(input.confidence);
  if (confidence == null) return null;

  const updatedAt =
    typeof input.updatedAt === "string" && input.updatedAt.trim()
      ? input.updatedAt.trim()
      : fallbackUpdatedAt;

  return {
    origin: input.origin,
    externalId: input.externalId.trim(),
    workId: input.workId.trim(),
    confidence,
    aliases: normalizeAliases(input.aliases),
    updatedAt,
  };
}

export function validateMappings(
  mappings: unknown[],
  options: { knownWorkIds?: ReadonlySet<string> } = {},
): MarketWorkMappingValidateResult {
  const issues: MarketWorkMappingValidationIssue[] = [];
  const seenPrimary = new Set<string>();

  mappings.forEach((raw, index) => {
    const mapping = normalizeMarketWorkMapping(raw, DEFAULT_STORE_UPDATED_AT);
    if (!mapping) {
      issues.push({ index, field: "mapping", message: "Niepoprawny kształt mapowania" });
      return;
    }

    const primaryKey = `${mapping.origin}:${normalizeExternalKey(mapping.externalId)}`;
    if (seenPrimary.has(primaryKey)) {
      issues.push({
        index,
        field: "externalId",
        message: `Duplikat externalId dla origin ${mapping.origin}`,
      });
    } else {
      seenPrimary.add(primaryKey);
    }

    if (options.knownWorkIds && !options.knownWorkIds.has(mapping.workId)) {
      issues.push({
        index,
        field: "workId",
        message: `Nieznany workId: ${mapping.workId}`,
      });
    }

    for (const alias of mapping.aliases) {
      const aliasKey = `${mapping.origin}:${normalizeExternalKey(alias)}`;
      if (seenPrimary.has(aliasKey)) {
        issues.push({
          index,
          field: "aliases",
          message: `Alias koliduje z innym kluczem: ${alias}`,
        });
      }
    }
  });

  return { ok: issues.length === 0, issues };
}

function collectLookupKeys(mapping: MarketWorkMapping): { key: string; via: MarketWorkMappingMatchedVia }[] {
  const keys: { key: string; via: MarketWorkMappingMatchedVia }[] = [
    { key: normalizeExternalKey(mapping.externalId), via: "externalId" },
  ];
  for (const alias of mapping.aliases) {
    keys.push({ key: normalizeExternalKey(alias), via: "alias" });
  }
  return keys;
}

function mappingLookupIndex(
  store: MarketWorkMappingStore,
  origin?: MarketOriginId,
): Map<string, MarketWorkMappingFindResult> {
  const index = new Map<string, MarketWorkMappingFindResult>();

  for (const mapping of store.mappings) {
    if (origin && mapping.origin !== origin) continue;

    for (const { key, via } of collectLookupKeys(mapping)) {
      const composite = `${mapping.origin}:${key}`;
      if (index.has(composite)) continue;
      index.set(composite, {
        mapping,
        matchedVia: via,
        matchedKey: via === "externalId" ? mapping.externalId : key,
      });
    }
  }

  return index;
}

export function findMapping(
  store: MarketWorkMappingStore,
  origin: MarketOriginId,
  externalId: string,
): MarketWorkMappingFindResult | null {
  const key = normalizeExternalKey(externalId);
  if (!key) return null;
  const index = mappingLookupIndex(store, origin);
  return index.get(`${origin}:${key}`) ?? null;
}

export function listMappings(
  store: MarketWorkMappingStore,
  filter: ListMappingsFilter = {},
): MarketWorkMapping[] {
  return store.mappings.filter((mapping) => {
    if (filter.origin && mapping.origin !== filter.origin) return false;
    if (filter.workId && mapping.workId !== filter.workId) return false;
    return true;
  });
}

function findDuplicateMapping(
  store: MarketWorkMappingStore,
  mapping: MarketWorkMapping,
  excludeExternalId?: string,
): MarketWorkMapping | null {
  const excludeKey = excludeExternalId ? normalizeExternalKey(excludeExternalId) : null;

  for (const existing of store.mappings) {
    if (existing.origin !== mapping.origin) continue;

    for (const { key } of collectLookupKeys(existing)) {
      if (excludeKey && key === excludeKey) continue;

      for (const { key: newKey } of collectLookupKeys(mapping)) {
        if (key === newKey) return existing;
      }
    }
  }

  return null;
}

export function registerMapping(
  store: MarketWorkMappingStore,
  input: unknown,
  options: RegisterMappingOptions = {},
): { store: MarketWorkMappingStore; result: RegisterMappingResult } {
  const updatedAtIso = options.updatedAtIso ?? store.updatedAt;
  const mapping = normalizeMarketWorkMapping(input, updatedAtIso);

  if (!mapping) {
    return {
      store,
      result: {
        ok: false,
        reason: "invalid",
        errors: ["Niepoprawne mapowanie — origin, externalId, workId, confidence"],
      },
    };
  }

  const primaryKey = normalizeExternalKey(mapping.externalId);
  const existingIdx = store.mappings.findIndex(
    (item) =>
      item.origin === mapping.origin
      && normalizeExternalKey(item.externalId) === primaryKey,
  );

  if (existingIdx >= 0) {
    if (!options.allowReplace) {
      return {
        store,
        result: {
          ok: false,
          reason: "duplicate_external",
          errors: [`Mapowanie już istnieje: ${mapping.origin}/${mapping.externalId}`],
        },
      };
    }

    const without = store.mappings.filter((_, idx) => idx !== existingIdx);
    const collision = findDuplicateMapping(
      { ...store, mappings: without },
      mapping,
      mapping.externalId,
    );
    if (collision) {
      return {
        store,
        result: {
          ok: false,
          reason: "alias_collision",
          errors: [`Alias koliduje z ${collision.origin}/${collision.externalId}`],
        },
      };
    }

    const nextMappings = [...without, mapping].sort((a, b) =>
      a.origin.localeCompare(b.origin) || a.externalId.localeCompare(b.externalId, "pl"),
    );

    return {
      store: { mappings: nextMappings, updatedAt: updatedAtIso },
      result: { ok: true, mapping, replaced: true },
    };
  }

  const collision = findDuplicateMapping(store, mapping);
  if (collision) {
    return {
      store,
      result: {
        ok: false,
        reason: "alias_collision",
        errors: [`Klucz koliduje z ${collision.origin}/${collision.externalId}`],
      },
    };
  }

  const nextMappings = [...store.mappings, mapping].sort((a, b) =>
    a.origin.localeCompare(b.origin) || a.externalId.localeCompare(b.externalId, "pl"),
  );

  return {
    store: { mappings: nextMappings, updatedAt: updatedAtIso },
    result: { ok: true, mapping, replaced: false },
  };
}

export function resolveMappingBatch(
  store: MarketWorkMappingStore,
  items: MarketWorkMappingBatchItem[],
): MarketWorkMappingReport {
  const matched: MarketWorkMappingMatched[] = [];
  const unmatched: MarketWorkMappingUnmatched[] = [];
  const rejected: MarketWorkMappingRejected[] = [];
  const seenBatch = new Set<string>();

  for (const item of items) {
    if (!isMarketOriginId(item.origin)) {
      rejected.push({
        origin: "kb_pl",
        externalId: String(item.externalId ?? ""),
        reason: "invalid_origin",
        errors: ["Niepoprawny origin"],
      });
      continue;
    }

    const externalId = typeof item.externalId === "string" ? item.externalId.trim() : "";
    if (!externalId) {
      rejected.push({
        origin: item.origin,
        externalId: "",
        reason: "empty_external",
        errors: ["Pusty externalId"],
      });
      continue;
    }

    const batchKey = `${item.origin}:${normalizeExternalKey(externalId)}`;
    if (seenBatch.has(batchKey)) {
      rejected.push({
        origin: item.origin,
        externalId,
        reason: "duplicate_in_batch",
        errors: ["Duplikat w partii"],
      });
      continue;
    }
    seenBatch.add(batchKey);

    const hit = findMapping(store, item.origin, externalId);
    if (!hit) {
      unmatched.push({ origin: item.origin, externalId, reason: "not_found" });
      continue;
    }

    matched.push({
      origin: item.origin,
      externalId,
      workId: hit.mapping.workId,
      confidence: hit.mapping.confidence,
      mapping: hit.mapping,
      matchedVia: hit.matchedVia,
    });
  }

  return { matched, unmatched, rejected };
}

/** Indeks dla adapterów P3.1A — jeden origin. */
export function buildMarketWorkMappingIndexForOrigin(
  store: MarketWorkMappingStore,
  origin: MarketOriginId,
): MarketWorkMappingIndex {
  const byExternalCode: Record<string, { workId: string; confidence?: number }> = {};

  for (const mapping of store.mappings) {
    if (mapping.origin !== origin) continue;
    for (const { key } of collectLookupKeys(mapping)) {
      if (byExternalCode[key]) continue;
      byExternalCode[key] = {
        workId: mapping.workId,
        confidence: mapping.confidence,
      };
    }
  }

  return { byExternalCode };
}

export function buildMarketWorkMappingIndex(
  store: MarketWorkMappingStore,
): Record<MarketOriginId, MarketWorkMappingIndex> {
  const out: Partial<Record<MarketOriginId, MarketWorkMappingIndex>> = {};
  for (const mapping of store.mappings) {
    if (!out[mapping.origin]) {
      out[mapping.origin] = buildMarketWorkMappingIndexForOrigin(store, mapping.origin);
    }
  }
  return out as Record<MarketOriginId, MarketWorkMappingIndex>;
}

/**
 * WR-LABOR-IDENTITY-MAPPING-01 — Owner-curated identity gate (Hybrid C · B).
 * exact_normalized only · BEFORE D1 synonyms / namesLooselyMatch · NOT a pricing engine.
 *
 * A1–A12 Owner Closeout locks apply. ZERO Catalog / OUR RATE / Accept / Evidence KV write.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import type { WorkRateEvidenceScopeTag } from "@/lib/work-catalog/work-rate-evidence-scope";

export const LABOR_IDENTITY_MAPPING_TABLE_VERSION = 1 as const;
export const LABOR_IDENTITY_MAPPING_MAX_ALIASES = 12 as const;
export const LABOR_IDENTITY_MAPPING_MATCH_MODE = "exact_normalized" as const;

export type LaborIdentityMappingMatchMode = typeof LABOR_IDENTITY_MAPPING_MATCH_MODE;

export type LaborIdentityMappingSourceId =
  | "kb_pl"
  | "cennikremontow_pl"
  | "sccot"
  | "extradom"
  | "*";

export type LaborIdentityMappingCategoryKey =
  | "electrical"
  | "plumbing"
  | "heating_co"
  | "gas"
  | "white_install"
  | "demolition"
  | "waste"
  | "grooves"
  | "other";

export type LaborIdentityIncludesMaterialPolicy = "reject" | "require_labor_only";

export type LaborIdentityMappingRow = {
  mappingId: string;
  version: number;
  workId: string;
  sourceId: LaborIdentityMappingSourceId;
  categoryKey: LaborIdentityMappingCategoryKey;
  matchMode: LaborIdentityMappingMatchMode;
  observedNameAliases: readonly string[];
  /** Catalog work unit — explicit; no implicit conversion. */
  catalogUnit: WgdomCostUnit | string;
  /** Source row unit that may bind — explicit; no implicit conversion. */
  observedUnit: WgdomCostUnit | string;
  laborOnlyRequired: boolean;
  includesMaterialPolicy: LaborIdentityIncludesMaterialPolicy;
  allowedScopeTags: readonly WorkRateEvidenceScopeTag[] | null;
  regionPolicy: {
    prefer: readonly ("WROCLAW" | "REGIONAL" | "POLSKA")[];
    allowNational: true;
  };
  confidence: "HIGH" | "MEDIUM" | "LOW";
  ownerApproval: boolean;
  active: boolean;
  provenance: {
    approvedBy: string;
    approvedAt: string;
    evidenceUrls: readonly string[];
    notesPl: string;
  };
};

export type LaborIdentityResolveStatus =
  | "HIT"
  | "MISS"
  | "AMBIGUOUS"
  | "BLOCKED";

export type LaborIdentityResolveResult =
  | {
      status: "HIT";
      workId: string;
      mappingId: string;
      mappingVersion: number;
      matchedAlias: string;
      confidence: "HIGH" | "MEDIUM" | "LOW";
      catalogUnit: string;
      observedUnit: string;
      /** Echo input flags — never mutated. */
      laborOnly: boolean;
      includesMaterial: boolean;
      regionScope: string | null;
    }
  | {
      status: "MISS";
      laborOnly: boolean;
      includesMaterial: boolean;
      regionScope: string | null;
    }
  | {
      status: "AMBIGUOUS";
      mappingIds: readonly string[];
      laborOnly: boolean;
      includesMaterial: boolean;
      regionScope: string | null;
    }
  | {
      status: "BLOCKED";
      reason:
        | "unknown_workId"
        | "legacy_bucket_forbidden"
        | "unit_mismatch"
        | "material_policy"
        | "inactive_or_unapproved"
        | "invalid_config"
        | "alias_cap_exceeded";
      messagePl: string;
      laborOnly: boolean;
      includesMaterial: boolean;
      regionScope: string | null;
    };

/** A3 — legacy family buckets forbidden as mapping targets in v1. */
const FORBIDDEN_LEGACY_BUCKET_PREFIXES = Object.freeze([
  "legacy-elektryka-",
  "legacy-hydraulika-",
  "legacy-instalacje_gaz-",
  "legacy-rozbiorki-",
  "legacy-instalacje_co-",
] as const);

export function normalizeLaborIdentityName(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function laborIdentityNamesExactNormalizedMatch(
  a: string,
  b: string,
): boolean {
  const na = normalizeLaborIdentityName(a);
  const nb = normalizeLaborIdentityName(b);
  return Boolean(na) && na === nb;
}

export function isForbiddenLegacyBucketWorkId(workId: string): boolean {
  const id = String(workId || "").trim().toLowerCase();
  if (!id) return true;
  return FORBIDDEN_LEGACY_BUCKET_PREFIXES.some((p) => id.startsWith(p));
}

export function unitsCompatibleExact(
  catalogUnit: string,
  observedUnit: string,
  rowCatalogUnit: string,
  rowObservedUnit: string,
): boolean {
  const c = normalizeWorkRateUnitToken(catalogUnit);
  const o = normalizeWorkRateUnitToken(observedUnit);
  const rc = normalizeWorkRateUnitToken(rowCatalogUnit);
  const ro = normalizeWorkRateUnitToken(rowObservedUnit);
  if (!c || !o || !rc || !ro) return false;
  // A2: no implicit conversion — catalog must equal mapping.catalogUnit,
  // observed must equal mapping.observedUnit; typically catalogUnit===observedUnit.
  return c === rc && o === ro;
}

/**
 * Production registry — Owner-approved concrete aliases only
 * (WR-LABOR-IDENTITY-MAPPING-WAVE-1 Closeout · APPROVE = tablica + podejście;
 * IK-OWNER-MAP A01-S1 · APPROVE = WM LP4 oczyszczenie only · LP5 EXCLUDED;
 * IK-OWNER-CREATE A01-LP5 · APPROVE = WM LP5/LP10 impregnacja biobójcza on dedicated workId).
 * HOLD rows (oprawa / zawór / gniazdo / white / zmywanie / …) must NOT appear here.
 */
export const WORK_RATE_IDENTITY_MAPPINGS: readonly LaborIdentityMappingRow[] =
  Object.freeze([
    {
      mappingId: "lim-w1-tablica-rozdzielcza-cr",
      version: 1,
      workId: "p2b-tablica-rozdzielcza-mieszkaniowa-szt",
      sourceId: "cennikremontow_pl",
      categoryKey: "electrical",
      matchMode: LABOR_IDENTITY_MAPPING_MATCH_MODE,
      observedNameAliases: Object.freeze(["Montaż skrzynki rozdzielczej"]),
      catalogUnit: "szt",
      observedUnit: "szt",
      laborOnlyRequired: true,
      includesMaterialPolicy: "reject",
      allowedScopeTags: null,
      regionPolicy: {
        prefer: Object.freeze(["WROCLAW", "REGIONAL", "POLSKA"] as const),
        allowNational: true,
      },
      confidence: "HIGH",
      ownerApproval: true,
      active: true,
      provenance: {
        approvedBy: "owner",
        approvedAt: "2026-08-14T17:06:00.000Z",
        evidenceUrls: Object.freeze([
          "https://cennikremontow.pl/instalacje-elektryczne-cennik",
        ]),
        notesPl:
          "WAVE-1 APPROVE — skrzynka rozdzielcza ≡ tablica rozdzielcza mieszkaniowa (exact_normalized).",
      },
    },
    {
      mappingId: "lim-w1-podejscie-wod-kan-cr",
      version: 1,
      workId: "p2b-podejscie-wod-kan-mb",
      sourceId: "cennikremontow_pl",
      categoryKey: "plumbing",
      matchMode: LABOR_IDENTITY_MAPPING_MATCH_MODE,
      observedNameAliases: Object.freeze([
        "Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź",
      ]),
      catalogUnit: "mb",
      observedUnit: "mb",
      laborOnlyRequired: true,
      includesMaterialPolicy: "reject",
      allowedScopeTags: null,
      regionPolicy: {
        prefer: Object.freeze(["WROCLAW", "REGIONAL", "POLSKA"] as const),
        allowNational: true,
      },
      confidence: "HIGH",
      ownerApproval: true,
      active: true,
      provenance: {
        approvedBy: "owner",
        approvedAt: "2026-08-14T17:06:00.000Z",
        evidenceUrls: Object.freeze([
          "https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik",
        ]),
        notesPl:
          "WAVE-1 APPROVE — podejście wod-kan operation-to-operation (exact_normalized · mb).",
      },
    },
    {
      mappingId: "lim-ik-a01-lp4-oczyszczenie-wm",
      version: 1,
      workId: "cc-w2-oczyszczenie-podloza",
      sourceId: "*",
      categoryKey: "other",
      matchMode: LABOR_IDENTITY_MAPPING_MATCH_MODE,
      observedNameAliases: Object.freeze([
        "Przygotowanie i naprawa podłoża-oczyszczenie powierzchni muru",
      ]),
      catalogUnit: "m2",
      observedUnit: "m2",
      laborOnlyRequired: true,
      includesMaterialPolicy: "reject",
      allowedScopeTags: null,
      regionPolicy: {
        prefer: Object.freeze(["WROCLAW", "REGIONAL", "POLSKA"] as const),
        allowNational: true,
      },
      confidence: "HIGH",
      ownerApproval: true,
      active: true,
      provenance: {
        approvedBy: "owner",
        approvedAt: "2026-08-23T14:00:00.000Z",
        evidenceUrls: Object.freeze([
          "docs/architecture/IK-OWNER-POLICY-RESOLUTION-03.md",
        ]),
        notesPl:
          "A01-S1 IK-OWNER-MAP — WM Paczka V LP4 oczyszczenie powierzchni (exact_normalized · m2). " +
          "LP5 impregnacja biobójcza EXPLICITLY EXCLUDED — brak aliasu impregnacji. " +
          "Zmywanie HOLD (brak BOQ). alias-pack-wave2 ≠ Owner SSOT.",
      },
    },
    {
      mappingId: "lim-ik-a01-lp5-impregnacja-wm",
      version: 1,
      workId: "cc-w2-impregnacja-biobojcza-m2",
      sourceId: "*",
      categoryKey: "other",
      matchMode: LABOR_IDENTITY_MAPPING_MATCH_MODE,
      observedNameAliases: Object.freeze([
        "Impregnacja biobójcza ręczna m2 d.1.1 0103-01 Krotność = 2 .2 poz.4",
        "Impregnacja biobójcza ręczna m2 d.1.1 0103-01 Krotność = 2 poz.8",
      ]),
      catalogUnit: "m2",
      observedUnit: "m2",
      laborOnlyRequired: true,
      includesMaterialPolicy: "reject",
      allowedScopeTags: null,
      regionPolicy: {
        prefer: Object.freeze(["WROCLAW", "REGIONAL", "POLSKA"] as const),
        allowNational: true,
      },
      confidence: "HIGH",
      ownerApproval: true,
      active: true,
      provenance: {
        approvedBy: "owner",
        approvedAt: "2026-08-23T20:00:00.000Z",
        evidenceUrls: Object.freeze([
          "docs/architecture/IK-OWNER-CREATE-A01-LP5-DECISION.md",
          "docs/architecture/IK-OWNER-POLICY-RESOLUTION-03.md",
        ]),
        notesPl:
          "A01-LP5 IK-OWNER-CREATE — WM Paczka V LP5/LP10 impregnacja biobójcza (exact_normalized · m2). " +
          "EXCLUDED from cc-w2-oczyszczenie-podloza (A01-S1 frozen). " +
          "Zmywanie HOLD · gruntowanie ≠ biobójcza.",
      },
    },
  ]);

let mappingsForTests: readonly LaborIdentityMappingRow[] | null = null;

export function setWorkRateIdentityMappingsForTests(
  rows: readonly LaborIdentityMappingRow[] | null,
): void {
  mappingsForTests = rows;
}

export function listWorkRateIdentityMappings(): readonly LaborIdentityMappingRow[] {
  return mappingsForTests ?? WORK_RATE_IDENTITY_MAPPINGS;
}

export type LaborIdentityMappingValidationIssue = {
  mappingId: string;
  code:
    | "alias_cap_exceeded"
    | "legacy_bucket_forbidden"
    | "unknown_workId"
    | "empty_aliases"
    | "duplicate_alias_normalized"
    | "invalid_match_mode"
    | "missing_units"
    | "allow_flagged_forbidden"
    | "inactive_ok";
  messagePl: string;
};

export function validateLaborIdentityMappingRow(
  row: LaborIdentityMappingRow,
  knownWorkIds?: ReadonlySet<string> | readonly string[] | null,
): LaborIdentityMappingValidationIssue[] {
  const issues: LaborIdentityMappingValidationIssue[] = [];
  const id = row.mappingId || "(missing)";

  if (row.matchMode !== LABOR_IDENTITY_MAPPING_MATCH_MODE) {
    issues.push({
      mappingId: id,
      code: "invalid_match_mode",
      messagePl: `matchMode must be ${LABOR_IDENTITY_MAPPING_MATCH_MODE}.`,
    });
  }

  if (!row.catalogUnit || !row.observedUnit) {
    issues.push({
      mappingId: id,
      code: "missing_units",
      messagePl: "catalogUnit and observedUnit are required.",
    });
  }

  const aliases = row.observedNameAliases || [];
  if (aliases.length === 0) {
    issues.push({
      mappingId: id,
      code: "empty_aliases",
      messagePl: "At least one exact alias required.",
    });
  }
  if (aliases.length > LABOR_IDENTITY_MAPPING_MAX_ALIASES) {
    issues.push({
      mappingId: id,
      code: "alias_cap_exceeded",
      messagePl: `Alias cap ${LABOR_IDENTITY_MAPPING_MAX_ALIASES} exceeded (${aliases.length}).`,
    });
  }

  const seen = new Set<string>();
  for (const a of aliases) {
    const n = normalizeLaborIdentityName(a);
    if (!n) continue;
    if (seen.has(n)) {
      issues.push({
        mappingId: id,
        code: "duplicate_alias_normalized",
        messagePl: `Duplicate normalized alias: ${a}`,
      });
    }
    seen.add(n);
  }

  if (isForbiddenLegacyBucketWorkId(row.workId)) {
    issues.push({
      mappingId: id,
      code: "legacy_bucket_forbidden",
      messagePl: `Legacy bucket workId forbidden in v1: ${row.workId}`,
    });
  }

  if (knownWorkIds) {
    const set =
      knownWorkIds instanceof Set
        ? knownWorkIds
        : new Set([...knownWorkIds].map((x) => String(x)));
    if (!set.has(row.workId)) {
      issues.push({
        mappingId: id,
        code: "unknown_workId",
        messagePl: `Unknown workId: ${row.workId}`,
      });
    }
  }

  // A4 — allow_flagged not in type; guard if cast sneaks in
  const policy = String(row.includesMaterialPolicy || "");
  if (policy === "allow_flagged") {
    issues.push({
      mappingId: id,
      code: "allow_flagged_forbidden",
      messagePl: "allow_flagged is forbidden in v1.",
    });
  }

  return issues;
}

export function validateLaborIdentityMappingRegistry(
  rows: readonly LaborIdentityMappingRow[] = listWorkRateIdentityMappings(),
  knownWorkIds?: ReadonlySet<string> | readonly string[] | null,
): { ok: boolean; issues: LaborIdentityMappingValidationIssue[] } {
  const issues: LaborIdentityMappingValidationIssue[] = [];
  for (const row of rows) {
    issues.push(...validateLaborIdentityMappingRow(row, knownWorkIds));
  }
  // Reject config if any hard errors (not inactive_ok)
  const hard = issues.filter((i) => i.code !== "inactive_ok");
  return { ok: hard.length === 0, issues };
}

function sourceIdMatches(
  rowSource: LaborIdentityMappingSourceId,
  inputSource: string,
): boolean {
  if (rowSource === "*") return true;
  return rowSource === inputSource;
}

function isProductionEligible(row: LaborIdentityMappingRow): boolean {
  return (
    row.active === true &&
    row.ownerApproval === true &&
    row.confidence === "HIGH" &&
    row.matchMode === LABOR_IDENTITY_MAPPING_MATCH_MODE
  );
}

function materialBlocked(
  row: LaborIdentityMappingRow,
  laborOnly: boolean,
  includesMaterial: boolean,
): boolean {
  if (row.laborOnlyRequired && !laborOnly) return true;
  if (row.includesMaterialPolicy === "reject" && includesMaterial) return true;
  if (row.includesMaterialPolicy === "require_labor_only" && !laborOnly) {
    return true;
  }
  if (row.includesMaterialPolicy === "require_labor_only" && includesMaterial) {
    return true;
  }
  return false;
}

/**
 * Global resolve: observedName → workId (identity gate).
 * Does not mutate laborOnly / includesMaterial / region.
 */
export function resolveLaborIdentityMapping(input: {
  observedName: string;
  observedUnit: string;
  /** When resolving in context of a known catalog work research. */
  catalogUnit?: string | null;
  sourceId: string;
  laborOnly: boolean;
  includesMaterial: boolean;
  regionScope?: string | null;
  knownWorkIds?: ReadonlySet<string> | readonly string[] | null;
  mappings?: readonly LaborIdentityMappingRow[] | null;
}): LaborIdentityResolveResult {
  const laborOnly = Boolean(input.laborOnly);
  const includesMaterial = Boolean(input.includesMaterial);
  const regionScope =
    input.regionScope == null ? null : String(input.regionScope);

  const echo = { laborOnly, includesMaterial, regionScope } as const;
  const rows = input.mappings ?? listWorkRateIdentityMappings();
  const catalogUnit = input.catalogUnit ?? input.observedUnit;

  const hits: {
    row: LaborIdentityMappingRow;
    matchedAlias: string;
  }[] = [];

  for (const row of rows) {
    const cfgIssues = validateLaborIdentityMappingRow(row, input.knownWorkIds);
    const hard = cfgIssues.filter(
      (i) =>
        i.code === "alias_cap_exceeded" ||
        i.code === "legacy_bucket_forbidden" ||
        i.code === "unknown_workId" ||
        i.code === "invalid_match_mode" ||
        i.code === "allow_flagged_forbidden" ||
        i.code === "missing_units",
    );
    if (hard.length > 0) {
      // Skip invalid rows for resolve; registry validate is separate FAIL.
      continue;
    }
    if (!isProductionEligible(row)) continue;
    if (!sourceIdMatches(row.sourceId, input.sourceId)) continue;
    if (
      !unitsCompatibleExact(
        String(catalogUnit),
        input.observedUnit,
        String(row.catalogUnit),
        String(row.observedUnit),
      )
    ) {
      continue;
    }

    let matchedAlias: string | null = null;
    for (const alias of row.observedNameAliases) {
      if (laborIdentityNamesExactNormalizedMatch(alias, input.observedName)) {
        matchedAlias = alias;
        break;
      }
    }
    if (!matchedAlias) continue;

    if (materialBlocked(row, laborOnly, includesMaterial)) {
      return {
        status: "BLOCKED",
        reason: "material_policy",
        messagePl: "Material/labor policy rejected bind (flags preserved).",
        ...echo,
      };
    }

    hits.push({ row, matchedAlias });
  }

  if (hits.length === 0) {
    return { status: "MISS", ...echo };
  }

  // A11 — ambiguity: distinct mappingIds
  const uniqueIds = [...new Set(hits.map((h) => h.row.mappingId))];
  if (uniqueIds.length > 1) {
    return { status: "AMBIGUOUS", mappingIds: uniqueIds, ...echo };
  }

  // Same mappingId duplicated — treat as single HIT
  const hit = hits[0]!;
  if (isForbiddenLegacyBucketWorkId(hit.row.workId)) {
    return {
      status: "BLOCKED",
      reason: "legacy_bucket_forbidden",
      messagePl: `Legacy bucket forbidden: ${hit.row.workId}`,
      ...echo,
    };
  }

  if (input.knownWorkIds) {
    const set =
      input.knownWorkIds instanceof Set
        ? input.knownWorkIds
        : new Set([...input.knownWorkIds].map((x) => String(x)));
    if (!set.has(hit.row.workId)) {
      return {
        status: "BLOCKED",
        reason: "unknown_workId",
        messagePl: `Unknown workId: ${hit.row.workId}`,
        ...echo,
      };
    }
  }

  return {
    status: "HIT",
    workId: hit.row.workId,
    mappingId: hit.row.mappingId,
    mappingVersion: hit.row.version,
    matchedAlias: hit.matchedAlias,
    confidence: hit.row.confidence,
    catalogUnit: String(hit.row.catalogUnit),
    observedUnit: String(hit.row.observedUnit),
    ...echo,
  };
}

/**
 * Exact aliases for one researched workId (identity gate contribution to parse).
 * Does not include OWNER_SYNONYMS (A path stays separate).
 */
export function listExactIdentityAliasesForWork(input: {
  workId: string;
  catalogUnit: string;
  sourceId?: string | null;
  mappings?: readonly LaborIdentityMappingRow[] | null;
}): readonly string[] {
  if (isForbiddenLegacyBucketWorkId(input.workId)) return Object.freeze([]);
  const rows = input.mappings ?? listWorkRateIdentityMappings();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isProductionEligible(row)) continue;
    if (row.workId !== input.workId) continue;
    if (
      input.sourceId &&
      !sourceIdMatches(row.sourceId, input.sourceId)
    ) {
      continue;
    }
    if (
      normalizeWorkRateUnitToken(input.catalogUnit) !==
      normalizeWorkRateUnitToken(String(row.catalogUnit))
    ) {
      continue;
    }
    if (validateLaborIdentityMappingRow(row).some((i) => i.code === "alias_cap_exceeded")) {
      continue;
    }
    for (const alias of row.observedNameAliases) {
      const n = normalizeLaborIdentityName(alias);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(alias);
    }
  }
  return Object.freeze(out);
}

/**
 * After parse: confirm offer binds to researched work via mapping (exact) or miss.
 * Used to apply material policy without mutating flags.
 */
export function matchLaborIdentityMappingForWork(input: {
  workId: string;
  catalogUnit: string;
  observedName: string;
  observedUnit: string;
  sourceId: string;
  laborOnly: boolean;
  includesMaterial: boolean;
  regionScope?: string | null;
  knownWorkIds?: ReadonlySet<string> | readonly string[] | null;
  mappings?: readonly LaborIdentityMappingRow[] | null;
}): LaborIdentityResolveResult {
  const resolved = resolveLaborIdentityMapping({
    observedName: input.observedName,
    observedUnit: input.observedUnit,
    catalogUnit: input.catalogUnit,
    sourceId: input.sourceId,
    laborOnly: input.laborOnly,
    includesMaterial: input.includesMaterial,
    regionScope: input.regionScope,
    knownWorkIds: input.knownWorkIds,
    mappings: input.mappings,
  });

  if (resolved.status === "HIT" && resolved.workId !== input.workId) {
    // Hit another work — treat as miss for this research target
    return {
      status: "MISS",
      laborOnly: input.laborOnly,
      includesMaterial: input.includesMaterial,
      regionScope: input.regionScope ?? null,
    };
  }
  return resolved;
}

/** Test helper — build a valid HIGH approved row. */
export function buildLaborIdentityMappingFixture(
  partial: Partial<LaborIdentityMappingRow> &
    Pick<LaborIdentityMappingRow, "mappingId" | "workId" | "observedNameAliases">,
): LaborIdentityMappingRow {
  return {
    mappingId: partial.mappingId,
    version: partial.version ?? 1,
    workId: partial.workId,
    sourceId: partial.sourceId ?? "*",
    categoryKey: partial.categoryKey ?? "other",
    matchMode: LABOR_IDENTITY_MAPPING_MATCH_MODE,
    observedNameAliases: partial.observedNameAliases,
    catalogUnit: partial.catalogUnit ?? "szt",
    observedUnit: partial.observedUnit ?? partial.catalogUnit ?? "szt",
    laborOnlyRequired: partial.laborOnlyRequired ?? true,
    includesMaterialPolicy: partial.includesMaterialPolicy ?? "reject",
    allowedScopeTags: partial.allowedScopeTags ?? null,
    regionPolicy: partial.regionPolicy ?? {
      prefer: ["WROCLAW", "REGIONAL", "POLSKA"],
      allowNational: true,
    },
    confidence: partial.confidence ?? "HIGH",
    ownerApproval: partial.ownerApproval ?? true,
    active: partial.active ?? true,
    provenance: partial.provenance ?? {
      approvedBy: "test",
      approvedAt: "2026-08-14T00:00:00.000Z",
      evidenceUrls: ["https://cennikremontow.pl/fixture"],
      notesPl: "test fixture",
    },
  };
}

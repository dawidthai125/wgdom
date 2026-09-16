/**
 * NORMATIVE_RMS_TO_DISCOVERY_V1_HARD_ADAPTER — thin CONNECT (Owner GO / Design Freeze).
 *
 * normative RMS → gates → KnrDiscoveryEvidenceRecord → upsert (caller) → V1 (caller).
 * REUSE: parseAthKnrNormExport · discovery types · V1 hash helpers.
 * ZERO new Engine / Catalog / Accept / Orchestra / storage.
 * ATH = AUXILIARY NORMATIVE only · never tender price source.
 * PLN / OUR RATE → R = FORBIDDEN.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import {
  buildNoMaterialNormQueryHash,
  buildWorkIdDiscoveryQueryHash,
} from "@/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract";
import type { KnrNormLine } from "./knr-catalog-entry-types";
import type { KnrParsedAthPosition } from "./knr-export-parser";
import { parseAthKnrNormExport } from "./knr-export-parser";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
  KnrDiscoveryNormLine,
  KnrDiscoverySourceRef,
} from "./knr-discovery-evidence-types";
import {
  emptyKnrDiscoveryEvidenceStore,
  upsertKnrDiscoveryEvidenceOffline,
} from "./knr-discovery-evidence-store";

export const NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION =
  "normative-rms-discovery-v1-adapter-1" as const;

export type NormativeRmsOrigin =
  | "LICENSED_ATH_EXPORT"
  | "PUBLIC_ALLOWLIST_NAKŁADOWY"
  | "OWNER_ASSERTED";

export type NoMaterialNormPolicy =
  | "OMIT"
  | "OWNER_EXPLICIT"
  | "EVIDENCE_DERIVED_IF_GO";

export type AdapterDenyReason =
  | "AMBIGUOUS_IDENTITY"
  | "MISSING_FAMILY_TABLE_POSITION"
  | "SUFFIX_ONLY_FORBIDDEN"
  | "CROSS_FAMILY_FORBIDDEN"
  | "MISSING_LABOR_R"
  | "R_QTY_INVALID"
  | "UNIT_NOT_RG"
  | "CONFLICTING_R_QTY"
  | "MISSING_PROVENANCE"
  | "EXTRACTION_INVALID"
  | "PLN_OR_RATE_ORIGIN_FORBIDDEN"
  | "FORBIDDEN_ORIGIN_FIELDS"
  | "EMPTY_INPUT";

export type NormativeRmsAdapterInput = {
  family: string;
  catalog?: string | null;
  table: string;
  position: string;
  displayCode: string;
  evidenceKeyV1: string;
  identityKeyV2?: string | null;
  positionUnit: string;
  laborNorms: readonly KnrDiscoveryNormLine[] | readonly KnrNormLine[];
  materialNorms: readonly KnrDiscoveryNormLine[] | readonly KnrNormLine[];
  equipmentNorms?: readonly KnrDiscoveryNormLine[] | readonly KnrNormLine[] | null;
  sources: readonly KnrDiscoverySourceRef[];
  origin: NormativeRmsOrigin;
  workId?: string | null;
  description?: string | null;
  extractionValidation?: { ok: boolean; codes: string[] } | null;
  /**
   * Owner GO (this IMPLEMENT): EVIDENCE_DERIVED_IF_GO allowed when
   * R HARD + M empty + trusted origin + provenance + unambiguous identity.
   * Default OMIT → V1 MISSING_NO_MATERIAL_NORM (fail-closed).
   */
  noMaterialNormPolicy?: NoMaterialNormPolicy | null;
  /** Existing record family — mismatch → deny (cross-family / conflict). */
  existingFamily?: string | null;
  nowIso: string;
  /**
   * Spoiler fields — if present on input bag, adapter DENY (PLN→R forbidden).
   * Callers must not pass pricing; tests may inject to prove deny.
   */
  forbiddenPricingProbe?: {
    pricePln?: number | null;
    ourRatePln?: number | null;
    suggestedRatePln?: number | null;
    marketBaseRatePln?: number | null;
  } | null;
};

export type NormativeRmsAdapterResult =
  | {
      ok: true;
      record: KnrDiscoveryEvidenceRecord;
      auditWhy: string[];
      noMaterialNormEmitted: boolean;
      adapterVersion: typeof NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION;
    }
  | {
      ok: false;
      reason: AdapterDenyReason;
      auditWhy: string[];
      adapterVersion: typeof NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION;
    };

function foldUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/m\^?2\b/g, "m2")
    .replace(/\s+/g, "");
}

function isRgUnit(u: string): boolean {
  const f = foldUnit(u);
  return f === "r-g" || f === "rg" || f === "r.g" || f === "rob-g" || f.includes("r-g");
}

function foldFamily(f: string): string {
  return String(f || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Parse evidenceKeyV1 `FAMILY|catalog|table-pos` (e.g. KNR|4-01|0909-04). */
export function parseEvidenceKeyV1Parts(evidenceKeyV1: string): {
  family: string;
  catalog: string;
  table: string;
  position: string;
  tablePosition: string;
} | null {
  const raw = String(evidenceKeyV1 || "").trim();
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const family = parts[0]!;
  const catalog = parts[1]!;
  const tablePosition = parts[2]!;
  const m = /^(\d{3,4})-(\d{2})$/i.exec(tablePosition);
  if (!m) return null;
  return {
    family,
    catalog,
    table: m[1]!,
    position: m[2]!,
    tablePosition,
  };
}

function deny(
  reason: AdapterDenyReason,
  auditWhy: string[],
): NormativeRmsAdapterResult {
  return {
    ok: false,
    reason,
    auditWhy,
    adapterVersion: NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION,
  };
}

function mapNormLines(
  lines: readonly KnrDiscoveryNormLine[] | readonly KnrNormLine[] | null | undefined,
): KnrDiscoveryNormLine[] {
  if (!lines?.length) return [];
  return lines.map((l) => ({
    kind: l.kind,
    code: String(l.code || ""),
    description: String(l.description || ""),
    unit: String(l.unit || ""),
    quantity: Number(l.quantity),
    sourceRef: l.sourceRef ?? null,
  }));
}

/**
 * Thin RMS → discovery V1-HARD shaped record (does not upsert / does not Accept).
 */
export function adaptNormativeRmsToDiscoveryV1HardInput(
  input: NormativeRmsAdapterInput,
): NormativeRmsAdapterResult {
  const auditWhy: string[] = [];
  if (!input || !input.nowIso) {
    return deny("EMPTY_INPUT", ["missing input/nowIso"]);
  }

  const probe = input.forbiddenPricingProbe;
  if (
    probe
    && (probe.pricePln != null
      || probe.ourRatePln != null
      || probe.suggestedRatePln != null
      || probe.marketBaseRatePln != null)
  ) {
    return deny("PLN_OR_RATE_ORIGIN_FORBIDDEN", [
      "PLN / OUR RATE / suggestedRate must not supply R",
    ]);
  }

  if (input.extractionValidation && input.extractionValidation.ok === false) {
    return deny("EXTRACTION_INVALID", [
      `extractionValidation.ok=false codes=${(input.extractionValidation.codes || []).join(",")}`,
    ]);
  }

  const family = foldFamily(input.family);
  const table = String(input.table || "").trim();
  const position = String(input.position || "").trim();
  const evidenceKeyV1 = String(input.evidenceKeyV1 || "").trim();
  const displayCode = String(input.displayCode || "").trim();

  if (!family || !table || !position || !evidenceKeyV1 || !displayCode) {
    return deny("MISSING_FAMILY_TABLE_POSITION", [
      "family + table + position + evidenceKeyV1 + displayCode required",
    ]);
  }

  // Suffix-only: position/table without catalog segment in key, or key is bare code.
  if (/^\d{3,4}-\d{2}$/i.test(evidenceKeyV1) || !evidenceKeyV1.includes("|")) {
    return deny("SUFFIX_ONLY_FORBIDDEN", [
      "evidenceKeyV1 must be FAMILY|catalog|table-pos — suffix-only forbidden",
    ]);
  }

  const keyParts = parseEvidenceKeyV1Parts(evidenceKeyV1);
  if (!keyParts) {
    return deny("AMBIGUOUS_IDENTITY", [
      `cannot parse evidenceKeyV1=${evidenceKeyV1}`,
    ]);
  }

  if (foldFamily(keyParts.family) !== family) {
    return deny("CROSS_FAMILY_FORBIDDEN", [
      `input family=${family} vs key family=${keyParts.family}`,
    ]);
  }

  // table may be "0909" + position "04" OR already "0909-04"
  const tableAsTp = /^\d{3,4}-\d{2}$/i.test(table)
    ? table
    : `${table}-${position}`.replace(/\s+/g, "");
  if (keyParts.tablePosition.toLowerCase() !== tableAsTp.toLowerCase()) {
    return deny("AMBIGUOUS_IDENTITY", [
      `table/position mismatch key=${keyParts.tablePosition} vs ${tableAsTp}`,
    ]);
  }

  if (input.catalog != null && String(input.catalog).trim()) {
    if (
      String(input.catalog).trim().toLowerCase()
      !== keyParts.catalog.toLowerCase()
    ) {
      return deny("AMBIGUOUS_IDENTITY", [
        `catalog mismatch input=${input.catalog} key=${keyParts.catalog}`,
      ]);
    }
  }

  const existingFam = input.existingFamily ? foldFamily(input.existingFamily) : "";
  if (existingFam && existingFam !== family) {
    return deny("CROSS_FAMILY_FORBIDDEN", [
      `existingFamily=${existingFam} ≠ ${family}`,
    ]);
  }

  if (!input.sources?.length) {
    return deny("MISSING_PROVENANCE", ["sources[] empty"]);
  }
  for (const s of input.sources) {
    if (!s?.sourceId || !s.urlHash || !s.contentHash || !s.fetchedAt) {
      return deny("MISSING_PROVENANCE", [
        "each source needs sourceId, urlHash, contentHash, fetchedAt",
      ]);
    }
  }

  const laborNorms = mapNormLines(input.laborNorms).filter((l) => l.kind === "R");
  const materialNorms = mapNormLines(input.materialNorms).filter((l) => l.kind === "M");
  const equipmentNorms = mapNormLines(input.equipmentNorms).filter((l) => l.kind === "S");

  if (laborNorms.length === 0) {
    return deny("MISSING_LABOR_R", ["no kind=R laborNorms"]);
  }

  const hardR: KnrDiscoveryNormLine[] = [];
  for (const l of laborNorms) {
    if (!Number.isFinite(l.quantity) || l.quantity <= 0) {
      return deny("R_QTY_INVALID", [`R qty invalid: ${l.quantity}`]);
    }
    if (!isRgUnit(l.unit)) {
      return deny("UNIT_NOT_RG", [`labor unit=${l.unit} not r-g family`]);
    }
    hardR.push({ ...l, unit: "r-g" });
  }

  const qtySet = new Set(hardR.map((h) => h.quantity));
  if (qtySet.size > 1) {
    return deny("CONFLICTING_R_QTY", ["multiple distinct HARD R quantities"]);
  }

  const policy: NoMaterialNormPolicy = input.noMaterialNormPolicy || "OMIT";
  let noMaterialNormEmitted = false;
  const sources: KnrDiscoverySourceRef[] = input.sources.map((s) => ({ ...s }));
  const queryHashes: string[] = [];

  if (input.workId) {
    queryHashes.push(buildWorkIdDiscoveryQueryHash(String(input.workId).trim()));
  }

  const trustedOrigin =
    input.origin === "LICENSED_ATH_EXPORT"
    || input.origin === "PUBLIC_ALLOWLIST_NAKŁADOWY"
    || input.origin === "OWNER_ASSERTED";

  if (policy === "OWNER_EXPLICIT") {
    queryHashes.push(buildNoMaterialNormQueryHash(evidenceKeyV1));
    const hasFrag = sources.some((s) =>
      /\bNO_MATERIAL_NORM\b/.test(String(s.fragment || "")),
    );
    if (!hasFrag && sources[0]) {
      sources[0] = {
        ...sources[0],
        fragment: `${sources[0].fragment || ""} · NO_MATERIAL_NORM`.trim(),
      };
    }
    noMaterialNormEmitted = true;
    auditWhy.push("NO_MATERIAL_NORM OWNER_EXPLICIT");
  } else if (policy === "EVIDENCE_DERIVED_IF_GO") {
    // Owner GO (this IMPLEMENT): evidence-derived only when complete normative
    // assertion for this identity — R HARD + M empty + trusted + provenance.
    // NEVER from PDF lack of material column / laborOnlyRequired alone.
    if (
      materialNorms.length === 0
      && hardR.length > 0
      && trustedOrigin
      && sources.length > 0
    ) {
      queryHashes.push(buildNoMaterialNormQueryHash(evidenceKeyV1));
      if (!sources.some((s) => /\bNO_MATERIAL_NORM\b/.test(String(s.fragment || "")))) {
        sources.push({
          ...sources[0]!,
          sourceId: `${sources[0]!.sourceId}_nomaterial_derived`,
          urlHash: fnv1aHex(`NO_MATERIAL_NORM|${evidenceKeyV1}|derived`),
          fragment: `NO_MATERIAL_NORM|evidence-derived|R=${hardR[0]!.quantity}|origin=${input.origin}`,
          contentHash: fnv1aHex(
            `NO_MATERIAL_NORM|${evidenceKeyV1}|${hardR[0]!.quantity}|derived`,
          ),
          fetchedAt: input.nowIso,
        });
      }
      noMaterialNormEmitted = true;
      auditWhy.push(
        "NO_MATERIAL_NORM EVIDENCE_DERIVED_IF_GO (R>0 · M=0 · trusted origin)",
      );
    } else {
      auditWhy.push(
        "NO_MATERIAL_NORM OMIT — evidence-derived gates not met (fail-closed)",
      );
    }
  } else {
    auditWhy.push("NO_MATERIAL_NORM OMIT (policy default)");
  }

  // Reject invent if materials present but someone tried derived no-mat
  if (materialNorms.length > 0 && noMaterialNormEmitted) {
    return deny("EXTRACTION_INVALID", [
      "NO_MATERIAL_NORM cannot emit when materialNorms present",
    ]);
  }

  const laborQty = hardR[0]!.quantity;
  const record: KnrDiscoveryEvidenceRecord = {
    schemaVersion: 1,
    evidenceKeyV1,
    identityKeyV2: input.identityKeyV2 ?? null,
    family: input.family.trim(),
    displayCode,
    description: input.description ?? displayCode,
    unit: String(input.positionUnit || "").trim() || undefined,
    discoveryStatus: sources.length >= 2 ? "CORROBORATED" : "DISCOVERED",
    lifecycleState: "ACTIVE",
    sources,
    norms: {
      laborNorms: hardR,
      materialNorms,
      equipmentNorms,
    },
    queryHashes: [
      ...queryHashes,
      fnv1aHex(`LABOR|${evidenceKeyV1}|${laborQty}`),
      fnv1aHex(`${input.origin}|${evidenceKeyV1}`),
    ],
    freshness: "FRESH",
    contentHash: fnv1aHex(
      `RMS_ADAPTER|${input.origin}|${evidenceKeyV1}|R=${laborQty}|M=${materialNorms.length}|nm=${noMaterialNormEmitted}`,
    ),
    lastFetchedAt: input.nowIso,
    lastResearchAt: input.nowIso,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    catalogRevisionLink: null,
  };

  auditWhy.push(
    `adapted origin=${input.origin} R=${laborQty} r-g M=${materialNorms.length} nm=${noMaterialNormEmitted}`,
  );

  return {
    ok: true,
    record,
    auditWhy,
    noMaterialNormEmitted,
    adapterVersion: NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION,
  };
}

/** Upsert adapted record into discovery store (existing SSOT). */
export function upsertAdaptedNormativeRmsDiscovery(input: {
  adapted: Extract<NormativeRmsAdapterResult, { ok: true }>;
  store?: KnrDiscoveryEvidenceStore | null;
  nowIso: string;
}): {
  store: KnrDiscoveryEvidenceStore;
  record: KnrDiscoveryEvidenceRecord;
} {
  const base = input.store ?? emptyKnrDiscoveryEvidenceStore(input.nowIso);
  const up = upsertKnrDiscoveryEvidenceOffline({
    record: input.adapted.record,
    nowIso: input.nowIso,
    storeOverride: base,
  });
  return { store: up.store, record: up.record };
}

export type AdaptAthRmsToDiscoveryV1HardInput = {
  athBytes: Uint8Array;
  /** Target display e.g. "KNR 4-01 0909-04" */
  targetDisplayCode: string;
  evidenceKeyV1: string;
  workId?: string | null;
  positionUnit?: string | null;
  source: KnrDiscoverySourceRef;
  nowIso: string;
  noMaterialNormPolicy?: NoMaterialNormPolicy | null;
  includeIncompleteRms?: boolean;
  store?: KnrDiscoveryEvidenceStore | null;
  /** When true, persist via upsert; default true. */
  persist?: boolean;
  /** Catalog-basis family — mismatch with ATH parse → DENY (cross-family). */
  existingFamily?: string | null;
};

/**
 * ATH AUX CONNECT: parseAthKnrNormExport (unchanged) → adapter → optional upsert.
 */
export function adaptAthRmsToDiscoveryV1Hard(
  input: AdaptAthRmsToDiscoveryV1HardInput,
):
  | {
      ok: true;
      adapted: Extract<NormativeRmsAdapterResult, { ok: true }>;
      store: KnrDiscoveryEvidenceStore | null;
      record: KnrDiscoveryEvidenceRecord | null;
      position: KnrParsedAthPosition;
      auditWhy: string[];
    }
  | {
      ok: false;
      reason: string;
      auditWhy: string[];
    } {
  const parsed = parseAthKnrNormExport(input.athBytes, {
    targetDisplayCode: input.targetDisplayCode,
    includeIncompleteRms: input.includeIncompleteRms === true,
  });
  if (!parsed.ok) {
    return {
      ok: false,
      reason: parsed.code,
      auditWhy: [parsed.messagePl],
    };
  }
  const want = input.targetDisplayCode.replace(/\s+/g, " ").trim().toUpperCase();
  const position =
    parsed.positions.find(
      (p) => p.displayCode.replace(/\s+/g, " ").trim().toUpperCase() === want,
    ) || parsed.positions[0];
  if (!position) {
    return {
      ok: false,
      reason: "POSITION_NOT_FOUND",
      auditWhy: ["no ATH position after parse"],
    };
  }

  const table = String(position.identity.table || "").trim();
  const column = String(position.identity.column || "").trim();
  const catalog = String(position.identity.catalog || "").trim();
  const family = String(position.identity.family || "KNR").trim();
  if (!table || !column) {
    return {
      ok: false,
      reason: "AMBIGUOUS_IDENTITY",
      auditWhy: ["ATH position missing table/column"],
    };
  }

  const adapted = adaptNormativeRmsToDiscoveryV1HardInput({
    family,
    catalog,
    table,
    position: column,
    displayCode: position.displayCode,
    evidenceKeyV1: input.evidenceKeyV1,
    identityKeyV2: position.identityKeyV2,
    positionUnit: input.positionUnit || position.unit,
    laborNorms: position.norms.laborNorms,
    materialNorms: position.norms.materialNorms,
    equipmentNorms: position.norms.equipmentNorms,
    sources: [input.source],
    origin: "LICENSED_ATH_EXPORT",
    workId: input.workId,
    description: position.description,
    noMaterialNormPolicy: input.noMaterialNormPolicy ?? "EVIDENCE_DERIVED_IF_GO",
    existingFamily: input.existingFamily,
    nowIso: input.nowIso,
  });

  if (!adapted.ok) {
    return {
      ok: false,
      reason: adapted.reason,
      auditWhy: adapted.auditWhy,
    };
  }

  if (input.persist === false) {
    return {
      ok: true,
      adapted,
      store: null,
      record: null,
      position,
      auditWhy: adapted.auditWhy,
    };
  }

  const up = upsertAdaptedNormativeRmsDiscovery({
    adapted,
    store: input.store,
    nowIso: input.nowIso,
  });
  return {
    ok: true,
    adapted,
    store: up.store,
    record: up.record,
    position,
    auditWhy: adapted.auditWhy,
  };
}

/**
 * Public allowlist path — CONNECT only when caller already extracted bound RMS.
 * Does NOT invent PDF/HTML R parser (PUBLIC = PARTIAL until separate extract GO).
 */
export function adaptPublicExtractedRmsToDiscoveryV1Hard(input: {
  rms: Omit<
    NormativeRmsAdapterInput,
    "origin" | "noMaterialNormPolicy" | "nowIso"
  > & {
    nowIso: string;
    noMaterialNormPolicy?: NoMaterialNormPolicy | null;
  };
  store?: KnrDiscoveryEvidenceStore | null;
  persist?: boolean;
}):
  | {
      ok: true;
      adapted: Extract<NormativeRmsAdapterResult, { ok: true }>;
      store: KnrDiscoveryEvidenceStore | null;
      record: KnrDiscoveryEvidenceRecord | null;
    }
  | { ok: false; reason: AdapterDenyReason; auditWhy: string[] } {
  const adapted = adaptNormativeRmsToDiscoveryV1HardInput({
    ...input.rms,
    origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
    noMaterialNormPolicy: input.rms.noMaterialNormPolicy ?? "EVIDENCE_DERIVED_IF_GO",
  });
  if (!adapted.ok) {
    return { ok: false, reason: adapted.reason, auditWhy: adapted.auditWhy };
  }
  if (input.persist === false) {
    return { ok: true, adapted, store: null, record: null };
  }
  const up = upsertAdaptedNormativeRmsDiscovery({
    adapted,
    store: input.store,
    nowIso: input.rms.nowIso,
  });
  return { ok: true, adapted, store: up.store, record: up.record };
}

export const NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_IMPLEMENTED = true as const;

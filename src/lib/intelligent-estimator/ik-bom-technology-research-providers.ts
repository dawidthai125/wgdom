/**
 * IK BOM Technology Research — provider interfaces.
 *
 * Licensed / internal / public evidence only.
 * NEVER scrape commercial KNR/KNNR or SEKOCENBUD without legal adapter+license.
 */

import type {
  IkBomTechEvidence,
  IkBomTechNormCandidate,
  IkBomTechResearchBudget,
  IkBomTechTenderClaim,
  IkBomInternalNormEntry,
  IkBomProviderAvailability,
} from "./ik-bom-technology-research-types";
import {
  extractIkBomPodstawaEvidence,
  normativeLookupKey,
} from "./ik-bom-podstawa-extract";

export type NormativeCatalogSearchQuery = {
  workId: string;
  description: string;
  unit: string;
  classification?: string | null;
  tenderId?: string;
  dwellingId?: string;
  lineId?: string;
  budget?: IkBomTechResearchBudget;
  lookupKey?: string | null;
};

export type NormativeCatalogProvider = {
  readonly providerId: string;
  readonly availability: IkBomProviderAvailability;
  readonly requiredConfigPl?: string;
  searchNormCandidates(
    query: NormativeCatalogSearchQuery,
  ): IkBomTechNormCandidate[] | Promise<IkBomTechNormCandidate[]>;
};

export type TenderDocumentsEvidenceProvider = {
  readonly providerId: string;
  readonly availability: IkBomProviderAvailability;
  readonly requiredConfigPl?: string;
  findTechnologyClaims(opts: {
    tenderId: string;
    dwellingId: string;
    lineId: string;
    description: string;
    unit: string;
    workId: string;
  }): IkBomTechTenderClaim[] | Promise<IkBomTechTenderClaim[]>;
};

export type ManufacturerEvidenceProvider = {
  readonly providerId: string;
  readonly availability: IkBomProviderAvailability;
  readonly requiredConfigPl?: string;
  findSystemEvidence(opts: {
    description: string;
    workId: string;
    systemHint?: string | null;
  }): IkBomTechEvidence[] | Promise<IkBomTechEvidence[]>;
  findConsumption(opts: {
    description: string;
    workId: string;
    unit: string;
  }):
    | Array<{
        materialKey: string;
        description: string;
        unit: string;
        qtyFactor: number;
        evidence: IkBomTechEvidence[];
      }>
    | Promise<
        Array<{
          materialKey: string;
          description: string;
          unit: string;
          qtyFactor: number;
          evidence: IkBomTechEvidence[];
        }>
      >;
};

export type PublicTechnicalEvidenceProvider = {
  readonly providerId: string;
  readonly availability: IkBomProviderAvailability;
  readonly requiredConfigPl?: string;
  searchPublicEvidence(opts: {
    description: string;
    workId: string;
    unit: string;
    budget?: IkBomTechResearchBudget;
  }): IkBomTechEvidence[] | Promise<IkBomTechEvidence[]>;
};

export type WebEvidenceHit = {
  url: string;
  title: string;
  publisher?: string;
  excerpt: string;
  authority: number;
  evidenceHash?: string;
  supports: IkBomTechEvidence["supports"];
};

export type WebEvidenceProvider = {
  readonly providerId: string;
  readonly availability: IkBomProviderAvailability;
  readonly requiredConfigPl?: string;
  search(opts: {
    description: string;
    workId: string;
    unit: string;
    maxResults: number;
  }): WebEvidenceHit[] | Promise<WebEvidenceHit[]>;
};

export type AnalogTenderBomHit = {
  sourceTenderId: string;
  workId: string;
  unit: string;
  materials: Array<{
    materialKey: string;
    description: string;
    unit: string;
    qtyFactor: number;
    sourceRef: string;
  }>;
  evidence: IkBomTechEvidence[];
  confidenceCap: number;
};

export type AnalogTenderEvidenceProvider = {
  readonly providerId: string;
  readonly availability: IkBomProviderAvailability;
  findAnalog(opts: {
    workId: string;
    description: string;
    unit: string;
    excludeTenderId: string;
  }): AnalogTenderBomHit[] | Promise<AnalogTenderBomHit[]>;
};

export type SekocenbudAdapterStatus =
  | { available: true; edition: string; region: string | null }
  | { available: false; reason: "NO_LICENSE" | "NOT_CONFIGURED" | "DENIED" };

export type SekocenbudAdapter = {
  readonly providerId: string;
  status(): SekocenbudAdapterStatus;
};

export const nullNormativeCatalogProvider: NormativeCatalogProvider = {
  providerId: "normative.null",
  availability: "NOT_CONFIGURED",
  requiredConfigPl:
    "Wstrzyknij InternalNorm entries (Owner) lub LicensedNorm provider (WACETOB/KNR license).",
  searchNormCandidates: () => [],
};

export const licensedNormativeCatalogProvider: NormativeCatalogProvider = {
  providerId: "normative.licensed.wacetob_sekocenbud",
  availability: "LICENSE_REQUIRED",
  requiredConfigPl:
    "Wymaga Owner: legalna licencja WACETOB/KNR-KNNR i/lub SEKOCENBUD + adapter. SEKOCENBUD price ≠ BOM qtyFactor.",
  searchNormCandidates: () => [],
};

export const nullTenderDocumentsEvidenceProvider: TenderDocumentsEvidenceProvider = {
  providerId: "tender-docs.null",
  availability: "NOT_CONFIGURED",
  requiredConfigPl:
    "Podłącz claim extractor OPZ/STWiORB lub createTenderPodstawaEvidenceProvider.",
  findTechnologyClaims: () => [],
};

export const nullManufacturerEvidenceProvider: ManufacturerEvidenceProvider = {
  providerId: "manufacturer.null",
  availability: "NOT_CONFIGURED",
  requiredConfigPl: "Owner: allowlist URL TDS + hard consumption parser.",
  findSystemEvidence: () => [],
  findConsumption: () => [],
};

export const nullPublicTechnicalEvidenceProvider: PublicTechnicalEvidenceProvider = {
  providerId: "public-tech.null",
  availability: "NOT_CONFIGURED",
  requiredConfigPl: "Owner: allowlist BIP/public technical hosts.",
  searchPublicEvidence: () => [],
};

export const nullWebEvidenceProvider: WebEvidenceProvider = {
  providerId: "web.null",
  availability: "DISABLED",
  requiredConfigPl:
    "Web research OFF by default. Enable only with allowlist + budget; TIER5 cannot alone close BOM.",
  search: () => [],
};

export const nullAnalogTenderEvidenceProvider: AnalogTenderEvidenceProvider = {
  providerId: "analog.null",
  availability: "NOT_CONFIGURED",
  findAnalog: () => [],
};

export const nullSekocenbudAdapter: SekocenbudAdapter = {
  providerId: "sekocenbud.null",
  status: () => ({ available: false, reason: "NOT_CONFIGURED" }),
};

export function createInternalNormativeCatalogProvider(
  entries: readonly IkBomInternalNormEntry[],
): NormativeCatalogProvider {
  const byKey = new Map(
    entries.map((e) => [e.lookupKey.toUpperCase(), e] as const),
  );
  return {
    providerId: "normative.internal",
    availability: entries.length > 0 ? "AVAILABLE" : "NOT_CONFIGURED",
    requiredConfigPl:
      entries.length > 0
        ? undefined
        : "Pusta baza InternalNorm — wstrzyknij Owner VERIFIED entries.",
    searchNormCandidates(query) {
      const out: IkBomTechNormCandidate[] = [];
      const key = String(query.lookupKey ?? "").toUpperCase();
      if (key && byKey.has(key)) {
        out.push(entryToNormCandidate(byKey.get(key)!));
      }
      const pod = extractIkBomPodstawaEvidence({ description: query.description });
      for (const tc of pod.tableCodes) {
        for (const e of entries) {
          if (e.itemId === tc || e.lookupKey.toUpperCase().endsWith(`|${tc}`)) {
            if (!out.some((c) => c.itemId === e.itemId && c.catalogId === e.catalogId)) {
              out.push(entryToNormCandidate(e));
            }
          }
        }
      }
      return out.sort((a, b) => b.score - a.score);
    },
  };
}

function entryToNormCandidate(e: IkBomInternalNormEntry): IkBomTechNormCandidate {
  return {
    catalog: e.catalog,
    catalogId: e.catalogId,
    tableId: e.tableId,
    itemId: e.itemId,
    description: e.description,
    unit: e.unit,
    score: e.score,
    materials: e.laborOnly ? [] : e.materials.map((m) => ({ ...m })),
    evidence: e.evidence,
  };
}

/**
 * Evidence-only: podstawa/KNR from description — NEVER invents qtyFactor.
 */
export function createTenderPodstawaEvidenceProvider(): TenderDocumentsEvidenceProvider {
  return {
    providerId: "tender-docs.podstawa-extract",
    availability: "AVAILABLE",
    findTechnologyClaims(opts) {
      const nowIso = new Date().toISOString();
      const pod = extractIkBomPodstawaEvidence({ description: opts.description });
      if (!pod.catalogBasis && pod.tableCodes.length === 0) return [];
      return [
        {
          dwellingId: opts.dwellingId,
          lineId: opts.lineId,
          claimKind: "TECHNOLOGY",
          text: [
            "Podstawa z opisu przedmiaru (evidence only — bez qtyFactor)",
            pod.catalogBasis?.display || pod.rawHints.join(" · ") || pod.tableCodes.join(","),
            ...pod.notesPl,
          ]
            .filter(Boolean)
            .join(" · "),
          materialKey: null,
          unit: null,
          qtyFactor: null,
          sourceRef: `podstawa:${normativeLookupKey(pod.catalogBasis) || pod.tableCodes.join("|") || "none"}`,
          documentRole: "PRZEDMIAR",
          evidence: [
            {
              sourceKind: "TENDER_PRIMARY",
              sourceRef: `line-description:${opts.lineId}`,
              retrievedAt: nowIso,
              excerpt: opts.description.slice(0, 240),
              supports: ["NORMATIVE_BASIS", "TECHNOLOGY"],
              authority: 0.7,
            },
          ],
        },
      ];
    },
  };
}

export function createFixtureNormativeCatalogProvider(
  candidates: IkBomTechNormCandidate[],
): NormativeCatalogProvider {
  return {
    providerId: "normative.fixture",
    availability: candidates.length ? "AVAILABLE" : "NOT_CONFIGURED",
    searchNormCandidates() {
      return [...candidates].sort((a, b) => b.score - a.score);
    },
  };
}

export function createFixtureTenderClaimsProvider(
  claims: IkBomTechTenderClaim[],
): TenderDocumentsEvidenceProvider {
  return {
    providerId: "tender-docs.fixture",
    availability: "AVAILABLE",
    findTechnologyClaims(opts) {
      return claims.filter(
        (c) =>
          (!c.dwellingId || c.dwellingId === opts.dwellingId)
          && (!c.lineId || c.lineId === opts.lineId),
      );
    },
  };
}

export function createFixtureManufacturerProvider(opts: {
  consumption: Array<{
    materialKey: string;
    description: string;
    unit: string;
    qtyFactor: number;
    evidence: IkBomTechEvidence[];
  }>;
}): ManufacturerEvidenceProvider {
  return {
    providerId: "manufacturer.fixture",
    availability: "AVAILABLE",
    findSystemEvidence: () => opts.consumption.flatMap((c) => c.evidence),
    findConsumption: () => opts.consumption,
  };
}

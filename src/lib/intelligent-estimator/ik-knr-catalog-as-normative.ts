/**
 * Bridge: kw-knr-catalog → NormativeCatalogProvider for BOM L2.
 *
 * Serves BOM materials ONLY from VERIFIED/STALE entries with hard materialNorms.
 * PENDING_VERIFY → evidence-only (empty candidates) — KNR known, BOM HOLD.
 * ZERO invent.
 */

import type { KnrCatalogStore } from "./knr-knowledge/knr-catalog-store";
import { isKnrCatalogEntryServable } from "./knr-knowledge/knr-catalog-lookup";
import type {
  IkBomTechNormCandidate,
} from "./ik-bom-technology-research-types";
import type { NormativeCatalogProvider } from "./ik-bom-technology-research-providers";
import { extractIkBomPodstawaEvidence } from "./ik-bom-podstawa-extract";
import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "./knr-knowledge/knr-identity-v2";

function entryToNormCandidate(
  entry: {
    displayCode: string;
    description: string;
    unit: string;
    evidenceKeyV1: string;
    identity: { family?: string | null; catalog?: string | null; table?: string | null };
    norms: {
      materialNorms: Array<{
        code: string;
        description: string;
        unit: string;
        quantity: number;
        sourceRef?: string | null;
      }>;
    };
  },
  nowIso: string,
): IkBomTechNormCandidate | null {
  const materials = entry.norms.materialNorms
    .filter((m) => String(m.code).trim() && Number.isFinite(m.quantity) && m.quantity >= 0)
    .map((m) => ({
      materialKey: String(m.code).trim(),
      description: m.description || m.code,
      unit: m.unit,
      qtyFactor: m.quantity,
      role: "PRIMARY" as const,
      sourceRef: m.sourceRef || entry.evidenceKeyV1,
    }));
  if (!materials.length) return null;
  const family = String(entry.identity.family ?? "KNR").toUpperCase();
  const catalog =
    family === "KNR-W" || family === "KNNR" || family === "KNR"
      ? (family as "KNR" | "KNR-W" | "KNNR")
      : "OTHER";
  return {
    catalog,
    catalogId: String(entry.identity.catalog ?? entry.displayCode),
    tableId: entry.identity.table ?? null,
    itemId: String(entry.identity.table ?? entry.evidenceKeyV1),
    description: entry.description,
    unit: entry.unit,
    score: 0.94,
    materials,
    evidence: [
      {
        sourceKind: "NORMATIVE_CATALOG",
        sourceRef: `knr-catalog:${entry.evidenceKeyV1}`,
        retrievedAt: nowIso,
        excerpt: entry.description.slice(0, 160),
        supports: ["NORMATIVE_BASIS", "MATERIAL", "QTY_FACTOR", "UNIT", "TECHNOLOGY"],
        authority: 0.95,
      },
    ],
  };
}

/**
 * Normative provider backed by IK KNR catalog SSOT (read-only).
 */
export function createKnrCatalogNormativeProvider(
  catalogStore: KnrCatalogStore,
  opts?: { nowIso?: string },
): NormativeCatalogProvider {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const entries = Object.values(catalogStore.entries ?? {});
  return {
    providerId: "normative.knr-catalog-ssot",
    availability: entries.some((e) => isKnrCatalogEntryServable(e))
      ? "AVAILABLE"
      : "NOT_CONFIGURED",
    requiredConfigPl: entries.length
      ? undefined
      : "Katalog KNR pusty — uruchom Public KNR Research lub Owner VERIFY.",
    searchNormCandidates(query) {
      const out: IkBomTechNormCandidate[] = [];
      const key = String(query.lookupKey ?? "").toUpperCase();
      const pod = extractIkBomPodstawaEvidence({ description: query.description });
      const basis =
        pod.catalogBasis
        ?? (key ? buildCatalogBasisFromRawCode(key.replace(/\|/g, " ")) : null);
      let identityKey = "";
      if (basis) {
        const partial = parseIdentityPartialFromCatalogBasis(basis);
        identityKey = foldIdentityKeyV2(partial);
      }
      for (const entry of entries) {
        if (!isKnrCatalogEntryServable(entry)) continue;
        const ek = String(entry.evidenceKeyV1 ?? "").toUpperCase();
        const match =
          (key && ek === key)
          || (identityKey && entry.identityKeyV2 === identityKey)
          || (basis?.tableCode
            && String(entry.identity.table ?? "").includes(String(basis.tableCode)));
        if (!match) continue;
        const cand = entryToNormCandidate(entry, nowIso);
        if (cand) out.push(cand);
      }
      return out.sort((a, b) => b.score - a.score);
    },
  };
}

/** Inspect PENDING_VERIFY presence for diagnostics (KNR found, BOM hold). */
export function findPendingKnrInCatalog(
  catalogStore: KnrCatalogStore,
  lookupKey: string | null,
): { found: boolean; description: string | null; unit: string | null; evidenceKeyV1: string | null } {
  if (!lookupKey) {
    return { found: false, description: null, unit: null, evidenceKeyV1: null };
  }
  const key = lookupKey.toUpperCase();
  for (const entry of Object.values(catalogStore.entries ?? {})) {
    if (entry.verificationStatus !== "PENDING_VERIFY") continue;
    if (String(entry.evidenceKeyV1 ?? "").toUpperCase() !== key
      && !String(entry.evidenceKeyV1 ?? "").toUpperCase().endsWith(key.split("|").pop() || "___")) {
      continue;
    }
    return {
      found: true,
      description: entry.description,
      unit: entry.unit,
      evidenceKeyV1: entry.evidenceKeyV1,
    };
  }
  return { found: false, description: null, unit: null, evidenceKeyV1: null };
}

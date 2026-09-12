/**
 * Orchestra ATESD / ATHED technology phase (CONNECT + LIVE FETCH).
 *
 * REUSE: runAutonomousTechnologyEvidenceDiscoveryBatchAsync
 *   → ATHED → ATSS → ATA → in-memory TechnologyPack → AUTO_BOM → AMPED/AUT-MAT probe
 *
 * ZERO second Orchestra · ZERO invent · ZERO cloud TechnologyPack persist · ZERO Finance.
 * Input: trusted identity · valid unit · not noise.
 * ATA_BOM_ONLY (ATA-v1.1): ATHED→ATSS→ATA→Pack without OUR RATE.
 * Optional research enrichment still gates on ourRateEligible; financeReady still requires OUR RATE.
 * Exhausted focus table codes are caller-supplied skips (no tender hardcode in engine).
 */

import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import type { IkDocumentExpertReport } from "@/lib/intelligent-estimator/ik-document-expert";
import { hasCompleteTrustedIdentityTuple } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";
import {
  runAutonomousTechnologyEvidenceDiscoveryBatchAsync,
  type AtesdItemResult,
  type AtesdLeafInput,
  AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION,
} from "@/lib/work-catalog/autonomous-technology-evidence-discovery";
import type { RunAthedResult } from "@/lib/intelligent-estimator/autonomous-technology-hard-evidence-discovery";
import type { RunAmpedResult } from "@/lib/price-intelligence/autonomous-material-price-evidence-discovery";
import type { TechnologyPack } from "@/lib/technology-foundation/types";
import { listAllPacks } from "@/lib/technology-foundation/pack-registry";
import { ensureBaselineTechnologyPacksRegistered } from "@/lib/technology-foundation/ensure-baseline-technology-packs";

export const IK_ATESD_TECHNOLOGY_PHASE_SCHEMA_VERSION = 1 as const;
export const IK_ATESD_TECHNOLOGY_PHASE_SEAM_ID =
  "orchestra.atesd_technology_after_g2_before_p6" as const;

export type IkAtesdTechnologyPhaseResult = {
  schemaVersion: typeof IK_ATESD_TECHNOLOGY_PHASE_SCHEMA_VERSION;
  seamId: typeof IK_ATESD_TECHNOLOGY_PHASE_SEAM_ID;
  version: typeof AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION;
  evaluatedAtIso: string;
  status: "ok" | "skipped" | "blocked";
  skipReason: string | null;
  items: AtesdItemResult[];
  athedByWorkId: Record<string, RunAthedResult>;
  ampedByWorkId: Record<string, RunAmpedResult>;
  packs: TechnologyPack[];
  counts: {
    candidatesConsidered: number;
    skippedNoise: number;
    skippedUntrusted: number;
    skippedInvalidUnit: number;
    skippedNoOurRate: number;
    skippedExhaustedFocus: number;
    uniqueWorkIds: number;
    ourRateEligible: number;
    athedPerformed: number;
    athedHard: number;
    athedSoft: number;
    athedNoEvidence: number;
    technologyCandidates: number;
    technologyPackBuilt: number;
    autoBomPass: number;
    matResolved: number;
    financeReady: number;
  };
  liveFetchEnabled: boolean;
  ownerRuntimeDependency: 0;
  microSequencing: false;
  productionMutation: false;
  technologyPackPersisted: false;
};

function isNoiseLine(line: OfferBoqLine): boolean {
  return line.isNoise === true || String(line.noiseKind || "").length > 0;
}

/** Extract KNR/KNNR table code tokens from description / knrHint (generic). */
export function extractOfferBoqTableCodeTokens(
  line: Pick<OfferBoqLine, "description" | "knrHint">,
): string[] {
  const blob = `${String(line.knrHint || "")} ${String(line.description || "")}`;
  const out = new Set<string>();
  for (const m of blob.matchAll(/\b(\d{4}-\d{2})\b/g)) {
    if (m[1]) out.add(m[1]);
  }
  return [...out];
}

function lineHitsExhaustedFocus(
  line: OfferBoqLine,
  exhausted: ReadonlySet<string>,
): boolean {
  if (exhausted.size === 0) return false;
  return extractOfferBoqTableCodeTokens(line).some((c) => exhausted.has(c));
}

function collectOfferRefs(input: {
  expert: IkDocumentExpertReport;
  package: TenderPackage | null;
}): { dwellingId: string; line: OfferBoqLine }[] {
  const refs: { dwellingId: string; line: OfferBoqLine }[] = [];
  const dwellings = input.package?.dwellings ?? [];
  if (dwellings.length > 0) {
    for (const d of dwellings) {
      for (const line of d.offerBoq?.lines ?? []) {
        refs.push({ dwellingId: d.dwellingId, line });
      }
    }
    return refs;
  }
  for (const line of input.expert.offerBoq?.lines ?? []) {
    refs.push({ dwellingId: "", line });
  }
  return refs;
}

/**
 * Build ATESD leaves from Orchestra OfferBoQ — fail-closed input contract.
 */
export function buildAtesdLeavesFromOrchestraOfferBoq(input: {
  expert: IkDocumentExpertReport;
  package: TenderPackage | null;
  store: WorkCatalogStore;
  nowMs?: number;
  /** CLOSED/EXHAUSTED focus table codes from prior terminal audit — no reprobe. */
  exhaustedFocusTableCodes?: readonly string[] | null;
  /**
   * Include trusted leaves without OUR RATE so ATHED can pursue BOM technology evidence.
   * Default true. ATESD research/candidate still respects leaf.ourRateEligible.
   */
  includeTrustedWithoutOurRate?: boolean;
}): {
  leaves: AtesdLeafInput[];
  skippedNoise: number;
  skippedUntrusted: number;
  skippedInvalidUnit: number;
  skippedNoOurRate: number;
  skippedExhaustedFocus: number;
  candidatesConsidered: number;
} {
  const nowMs = input.nowMs ?? Date.now();
  const refs = collectOfferRefs(input);
  const exhausted = new Set(
    (input.exhaustedFocusTableCodes || [])
      .map((c) => String(c || "").trim())
      .filter(Boolean),
  );
  const includeWithoutRate = input.includeTrustedWithoutOurRate !== false;
  let skippedNoise = 0;
  let skippedUntrusted = 0;
  let skippedInvalidUnit = 0;
  let skippedNoOurRate = 0;
  let skippedExhaustedFocus = 0;
  const byWork = new Map<string, AtesdLeafInput>();

  for (const { line } of refs) {
    if (isNoiseLine(line)) {
      skippedNoise += 1;
      continue;
    }
    if (lineHitsExhaustedFocus(line, exhausted)) {
      skippedExhaustedFocus += 1;
      continue;
    }
    const unit = String(line.unit || "").trim();
    if (!unit) {
      skippedInvalidUnit += 1;
      continue;
    }
    const trusted = hasCompleteTrustedIdentityTuple(line);
    const workId = String(line.catalogWorkId || "").trim();
    if (!trusted || !workId) {
      skippedUntrusted += 1;
      continue;
    }
    const looked = lookupWorkRate(input.store, workId, unit, nowMs);
    const ourRateEligible = looked?.status === "CURRENT";
    if (!ourRateEligible) {
      skippedNoOurRate += 1;
      if (!includeWithoutRate) continue;
    }
    const key = `${workId}|${unit.toLowerCase()}`;
    if (byWork.has(key)) continue;
    const tableCodes = extractOfferBoqTableCodeTokens(line);
    byWork.set(key, {
      catalogWorkId: workId,
      description: String(line.description || workId),
      unit,
      quantity: typeof line.quantity === "number" ? line.quantity : undefined,
      ourRateEligible,
      knrFamily: null,
      knrCode: tableCodes[0] ?? null,
    });
  }

  return {
    leaves: [...byWork.values()],
    skippedNoise,
    skippedUntrusted,
    skippedInvalidUnit,
    skippedNoOurRate,
    skippedExhaustedFocus,
    candidatesConsidered: refs.length,
  };
}

export async function runIkAtesdTechnologyPhase(input: {
  expert: IkDocumentExpertReport;
  package: TenderPackage | null;
  store?: WorkCatalogStore;
  packs?: readonly TechnologyPack[];
  nowMs?: number;
  tenderId?: string;
  /** Live ATHED HTTP via legal allowlist/registry. */
  executeAthedFetch?: boolean;
  athedFetchImpl?: Parameters<
    typeof runAutonomousTechnologyEvidenceDiscoveryBatchAsync
  >[0]["athedFetchImpl"];
  athedMaxProbes?: number;
  disableAmpedLive?: boolean;
  /** In-memory pack register for AUTO_BOM probe — never cloud persist. */
  registerAcceptedPackInMemory?: boolean;
  exhaustedFocusTableCodes?: readonly string[] | null;
  includeTrustedWithoutOurRate?: boolean;
}): Promise<IkAtesdTechnologyPhaseResult> {
  const nowMs = input.nowMs ?? Date.now();
  const store = input.store ?? loadWorkCatalogStoreLocal();
  ensureBaselineTechnologyPacksRegistered();
  const packsIn = input.packs ?? listAllPacks();
  const liveFetchEnabled = input.executeAthedFetch === true;

  const built = buildAtesdLeavesFromOrchestraOfferBoq({
    expert: input.expert,
    package: input.package,
    store,
    nowMs,
    exhaustedFocusTableCodes: input.exhaustedFocusTableCodes,
    includeTrustedWithoutOurRate: input.includeTrustedWithoutOurRate,
  });

  const emptyCounts = {
    candidatesConsidered: built.candidatesConsidered,
    skippedNoise: built.skippedNoise,
    skippedUntrusted: built.skippedUntrusted,
    skippedInvalidUnit: built.skippedInvalidUnit,
    skippedNoOurRate: built.skippedNoOurRate,
    skippedExhaustedFocus: built.skippedExhaustedFocus,
    uniqueWorkIds: built.leaves.length,
    ourRateEligible: 0,
    athedPerformed: 0,
    athedHard: 0,
    athedSoft: 0,
    athedNoEvidence: 0,
    technologyCandidates: 0,
    technologyPackBuilt: 0,
    autoBomPass: 0,
    matResolved: 0,
    financeReady: 0,
  };

  if (built.leaves.length === 0) {
    return {
      schemaVersion: IK_ATESD_TECHNOLOGY_PHASE_SCHEMA_VERSION,
      seamId: IK_ATESD_TECHNOLOGY_PHASE_SEAM_ID,
      version: AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION,
      evaluatedAtIso: new Date(nowMs).toISOString(),
      status: "skipped",
      skipReason: "NO_ATESD_ELIGIBLE_LEAVES",
      items: [],
      athedByWorkId: {},
      ampedByWorkId: {},
      packs: [...packsIn],
      counts: emptyCounts,
      liveFetchEnabled,
      ownerRuntimeDependency: 0,
      microSequencing: false,
      productionMutation: false,
      technologyPackPersisted: false,
    };
  }

  const batch = await runAutonomousTechnologyEvidenceDiscoveryBatchAsync({
    store,
    packs: packsIn,
    items: built.leaves,
    nowMs,
    tenderId: input.tenderId,
    registerAcceptedPackInMemory: input.registerAcceptedPackInMemory !== false,
    disableAthedFetch: !liveFetchEnabled,
    athedFetchImpl: input.athedFetchImpl,
    athedMaxProbes: input.athedMaxProbes,
    disableAmpedLive: input.disableAmpedLive !== false,
  });

  let athedPerformed = 0;
  let athedHard = 0;
  let athedSoft = 0;
  let athedNoEvidence = 0;
  for (const r of Object.values(batch.athedByWorkId)) {
    athedPerformed += 1;
    if (r.evidenceClass === "HARD_EVIDENCE") athedHard += 1;
    else if (r.evidenceClass === "SOFT_ONLY") athedSoft += 1;
    else athedNoEvidence += 1;
  }

  return {
    schemaVersion: IK_ATESD_TECHNOLOGY_PHASE_SCHEMA_VERSION,
    seamId: IK_ATESD_TECHNOLOGY_PHASE_SEAM_ID,
    version: AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION,
    evaluatedAtIso: new Date(nowMs).toISOString(),
    status: "ok",
    skipReason: null,
    items: batch.items,
    athedByWorkId: batch.athedByWorkId,
    ampedByWorkId: batch.ampedByWorkId,
    packs: batch.packs,
    counts: {
      ...emptyCounts,
      uniqueWorkIds: built.leaves.length,
      ourRateEligible: batch.totals.ourRateEligible,
      athedPerformed,
      athedHard,
      athedSoft,
      athedNoEvidence,
      technologyCandidates: batch.totals.technologyCandidates,
      technologyPackBuilt: batch.totals.technologyPackBuilt,
      autoBomPass: batch.totals.autoBomPass,
      matResolved: batch.totals.matResolved,
      financeReady: batch.totals.financeReady,
    },
    liveFetchEnabled,
    ownerRuntimeDependency: 0,
    microSequencing: false,
    productionMutation: false,
    technologyPackPersisted: false,
  };
}

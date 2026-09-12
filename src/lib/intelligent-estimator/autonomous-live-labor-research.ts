/**
 * Live labor research for resolved LABOR plane — routes pomiar → APF.
 *
 * Returns ephemeral Candidate evidence. Does NOT Accept / write OUR RATE.
 * Durable Evidence persist for AUT-R1 KEEP-4 sources = separate GO when needed.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  runSelectiveWorkRateResearch,
  type RunSelectiveWorkRateResearchResult,
  type WorkRateResearchCandidate,
} from "@/lib/work-catalog/work-rate-research";
import {
  calculateRepresentativeWorkRate,
  type WorkRateQualifiedObservation,
} from "@/lib/work-catalog/work-rate-qualify";
import { computeProposedWorkRatePln } from "@/lib/work-catalog/work-rate-market-base";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";
import type { WorkRateSourceId } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import { runAutonomousPricingFallback } from "@/lib/tender-position-cost/autonomous-pricing-fallback/run";
import { buildApfResearchQuery } from "@/lib/tender-position-cost/autonomous-pricing-fallback/query";
import type { ApfLaborMarketObservation } from "@/lib/tender-position-cost/autonomous-pricing-fallback/types";
import {
  resolveAutonomousLaborResearchPath,
  type ResolveAutonomousLaborResearchPathResult,
} from "./autonomous-labor-research-path";
import {
  persistApfLaborEvidenceToCanonical,
  resolveApfEvidenceCatalogUnit,
  buildCandidateFromDurableLaborEvidence,
  type PersistApfLaborEvidenceResult,
} from "./apf-labor-evidence-persist";

export type AutonomousLiveLaborResearchResult = {
  path: ResolveAutonomousLaborResearchPathResult;
  selective: RunSelectiveWorkRateResearchResult | null;
  apf: Awaited<ReturnType<typeof runAutonomousPricingFallback>> | null;
  /** Ephemeral WorkRate-shaped candidate for AUT-R1 *evaluation* only (never Accept here). */
  workRateShapedCandidate: WorkRateResearchCandidate | null;
  stopClass:
    | "B_VALIDATION_MATCH_REJECT"
    | "E_P527_MEASUREMENT_POLICY"
    | "APF_LIVE_CANDIDATE"
    | "APF_HOLD"
    | "SELECTIVE_CANDIDATE"
    | "GAP"
    | "BLOCKED";
  acceptExecuted: false;
  productionOurRateWrite: false;
  /** Durable Evidence write for AUT-R1 KEEP-4 / APF compatibility. */
  durableEvidenceWriteRequired: boolean;
  durableEvidenceWriteNote: string | null;
  /** Result of canonical APF Evidence persist when persistEvidence=true on APF path. */
  apfEvidencePersist: PersistApfLaborEvidenceResult | null;
};

function apfObsToQualified(
  o: ApfLaborMarketObservation,
  engineUnit: string,
): WorkRateQualifiedObservation | null {
  const rate = Number(o.unitRatePln);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  // APF hosts are Owner-authorized for measurement plane — not KEEP-4 WorkRateSourceId.
  // Cast for shape compatibility; AUT-R1 Accept writer must not run without separate GO.
  return {
    sourceId: o.sourceId as WorkRateSourceId,
    workNamePl: o.summaryPl,
    ratePln: Math.round(rate * 100) / 100,
    unit: engineUnit as WgdomCostUnit,
    regionScope: "POLSKA" as WorkRateRegionScope,
    laborOnly: true,
    sourceUrl: String(o.sourceUrl ?? o.sourceId),
    observedAt: o.observedAt,
    netGross: o.netGross === "netto" || o.netGross === "brutto" ? o.netGross : "unknown",
    sourceMinPln: null,
    sourceMaxPln: null,
    marketBaseKind: "point",
  };
}

function buildWorkRateShapedFromApf(opts: {
  workId: string;
  namePl: string;
  unit: string;
  observations: readonly ApfLaborMarketObservation[];
  marginPct: number;
}): WorkRateResearchCandidate | null {
  const catalogUnit = resolveApfEvidenceCatalogUnit(opts.unit);
  if (!catalogUnit) return null;
  const primary = opts.observations.filter((o) => o.sourceRole !== "SECONDARY");
  const pool = primary.length > 0 ? primary : opts.observations;
  const qualified = pool
    .map((o) => apfObsToQualified(o, catalogUnit))
    .filter((x): x is WorkRateQualifiedObservation => x != null);
  if (!qualified.length) return null;
  const rep = calculateRepresentativeWorkRate(qualified);
  if (rep.status !== "ok" || rep.medianPln == null) return null;
  const proposed = computeProposedWorkRatePln(rep.medianPln, opts.marginPct);
  if (proposed == null) return null;
  return {
    workId: opts.workId,
    unit: catalogUnit,
    namePl: opts.namePl,
    suggestedRatePln: proposed,
    marketBaseRatePln: rep.medianPln,
    wgdomMarginPct: opts.marginPct,
    proposedOurRatePln: proposed,
    sourceMinPln: null,
    sourceMaxPln: null,
    regionScope: rep.regionScope,
    countryScope: "POLSKA",
    widthClaim: "NOT_SPECIFIED",
    sampleSize: rep.sampleSize,
    lowSample: rep.lowSample === true,
    observations: qualified,
    previousOurRatePln: null,
    previousFreshness: "MISSING",
  };
}

export type RunAutonomousLiveLaborResearchInput = {
  store: WorkCatalogStore;
  workId: string;
  unit: string;
  namePl: string;
  tenderId?: string;
  lineId?: string;
  lp?: string | null;
  nowIso?: string;
  marginPct?: number;
  /** Default false — never persist Evidence this GO unless Owner separate GO. */
  persistEvidence?: boolean;
  /** Ordered match names for KEEP-4 HTML parse (catalog / tokens / cleaned BOQ). */
  matchNamesPl?: readonly string[] | null;
  identityStatus?: "RESOLVED" | "UNRESOLVED" | null;
  packs?: import("@/lib/technology-foundation/types").TechnologyPack[] | null;
};

/**
 * LABOR resolved → live research on the correct plane (NORMAL or APF).
 * Stops before Accept.
 */
export async function runAutonomousLiveLaborResearch(
  input: RunAutonomousLiveLaborResearchInput,
): Promise<AutonomousLiveLaborResearchResult> {
  const path = resolveAutonomousLaborResearchPath({
    unit: input.unit,
    namePl: input.namePl,
  });
  const marginPct = input.marginPct ?? 20;

  if (path.path === "BLOCKED") {
    return {
      path,
      selective: null,
      apf: null,
      workRateShapedCandidate: null,
      stopClass: "E_P527_MEASUREMENT_POLICY",
      acceptExecuted: false,
      productionOurRateWrite: false,
      durableEvidenceWriteRequired: false,
      durableEvidenceWriteNote: null,
      apfEvidencePersist: null,
    };
  }

  if (path.path === "APF_MEASUREMENT_EPHEMERAL") {
    const query = buildApfResearchQuery({
      tenderId: input.tenderId || "TPI/729/autonomous-research-seams",
      dwellingId: null,
      line: {
        lineId: input.lineId || "apf-line",
        lp: input.lp ?? null,
        description: input.namePl,
        unit: input.unit,
        quantity: 1,
        catalogWorkId: input.workId,
      },
    });
    const apf = await runAutonomousPricingFallback({
      tenderId: query.tenderId,
      dwellingId: null,
      query,
      httpResearch: "production",
      nowIso: input.nowIso,
    });

    const marketObs =
      apf.status === "CANDIDATE"
        ? (apf.evidence || [])
            .filter((e) => e.kind === "MARKET_LABOR_OBS" && e.marketUnitRatePln != null)
            .map(
              (e) =>
                ({
                  evidenceId: e.evidenceId,
                  unitRatePln: e.marketUnitRatePln!,
                  unit: input.unit,
                  sourceId: String(e.sourceId || "apf"),
                  sourceUrl: e.sourceUrl ?? null,
                  sourceRole: "PRIMARY",
                  observedAt: e.retrievedAt,
                  summaryPl: e.summaryPl,
                  laborOnly: true,
                }) satisfies ApfLaborMarketObservation,
            )
        : [];

    let workRateShaped = buildWorkRateShapedFromApf({
      workId: input.workId,
      namePl: input.namePl,
      unit: input.unit,
      observations: marketObs,
      marginPct,
    });
    if (
      !workRateShaped &&
      apf.status === "CANDIDATE" &&
      apf.ephemeralBasis?.components?.labor?.unitRatePln
    ) {
      const rate = apf.ephemeralBasis.components.labor.unitRatePln;
      const catalogUnit = resolveApfEvidenceCatalogUnit(input.unit);
      const proposed =
        catalogUnit != null ? computeProposedWorkRatePln(rate, marginPct) : null;
      if (proposed != null && catalogUnit) {
        const obs: WorkRateQualifiedObservation = {
          sourceId: "energospin_pl" as WorkRateSourceId,
          workNamePl: input.namePl,
          ratePln: rate,
          unit: catalogUnit,
          regionScope: "POLSKA",
          laborOnly: true,
          sourceUrl:
            apf.evidence.find((e) => e.sourceUrl)?.sourceUrl ||
            "https://www.energospin.pl/cennik/",
          observedAt: apf.ephemeralBasis.provenance.builtAt,
          netGross: "unknown",
        };
        const withUrl = (apf.evidence || []).find(
          (e) => e.sourceUrl && e.kind === "MARKET_LABOR_OBS",
        );
        if (withUrl?.sourceUrl) {
          obs.sourceUrl = withUrl.sourceUrl;
          obs.sourceId = String(withUrl.sourceId || obs.sourceId) as WorkRateSourceId;
          obs.observedAt = withUrl.retrievedAt || obs.observedAt;
        }
        workRateShaped = {
          workId: input.workId,
          unit: catalogUnit,
          namePl: input.namePl,
          suggestedRatePln: proposed,
          marketBaseRatePln: rate,
          wgdomMarginPct: marginPct,
          proposedOurRatePln: proposed,
          sourceMinPln: null,
          sourceMaxPln: null,
          regionScope: "POLSKA",
          countryScope: "POLSKA",
          widthClaim: "NOT_SPECIFIED",
          sampleSize: 1,
          lowSample: true,
          observations: [obs],
          previousOurRatePln: null,
          previousFreshness: "MISSING",
        };
      }
    }

    let apfEvidencePersist: PersistApfLaborEvidenceResult | null = null;
    if (apf.status === "CANDIDATE" && input.persistEvidence === true) {
      apfEvidencePersist = persistApfLaborEvidenceToCanonical({
        workId: input.workId,
        workNamePl: input.namePl,
        unit: input.unit,
        apfEvidence: apf.evidence,
        identityTrusted: true,
        nowIso: input.nowIso || new Date().toISOString(),
        marginPct,
        persist: true,
      });
      if (apfEvidencePersist.ok && apfEvidencePersist.candidateFromDurable) {
        workRateShaped = apfEvidencePersist.candidateFromDurable;
      }
    }

    const durableOk = apfEvidencePersist?.ok === true;
    return {
      path,
      selective: null,
      apf,
      workRateShapedCandidate: workRateShaped,
      stopClass: apf.status === "CANDIDATE" ? "APF_LIVE_CANDIDATE" : "APF_HOLD",
      acceptExecuted: false,
      productionOurRateWrite: false,
      durableEvidenceWriteRequired: apf.status === "CANDIDATE" && !durableOk,
      durableEvidenceWriteNote: durableOk
        ? null
        : apf.status === "CANDIDATE"
          ? "APF Candidate ephemeral — call persistEvidence=true for canonical Evidence write, or separate persistence GO."
          : null,
      apfEvidencePersist,
    };
  }

  // NORMAL selective
  const selective = await runSelectiveWorkRateResearch({
    store: input.store,
    workId: input.workId,
    unit: input.unit as WgdomCostUnit,
    namePl: input.namePl,
    matchNamesPl: input.matchNamesPl,
    persistEvidence: input.persistEvidence === true,
    bypassCooldown: true,
    laborMarginPolicy: { defaultLaborCommercialMarginPct: marginPct },
    identityStatus: input.identityStatus ?? "RESOLVED",
    packs: input.packs ?? null,
  });

  let stopClass: AutonomousLiveLaborResearchResult["stopClass"] = "GAP";
  let workRateShaped: WorkRateResearchCandidate | null = null;

  if (selective.status === "CANDIDATE") {
    stopClass = "SELECTIVE_CANDIDATE";
    workRateShaped = selective.candidate;
  } else if (selective.status === "EVIDENCE_REUSE") {
    // Durable Evidence ≠ OUR RATE — rebuild Candidate shape for AUT-R1 eval only.
    const built = buildCandidateFromDurableLaborEvidence({
      workId: input.workId,
      workNamePl: input.namePl,
      unit: input.unit,
      observations: selective.observations,
      marginPct,
    });
    if (built) {
      stopClass = "SELECTIVE_CANDIDATE";
      workRateShaped = built;
    } else {
      stopClass = "GAP";
    }
  } else if (
    selective.status === "GAP" &&
    (selective.rejects || []).some((r) => r.reason === "match_empty")
  ) {
    stopClass = "B_VALIDATION_MATCH_REJECT";
  } else if (selective.status === "BLOCKED") {
    stopClass = "BLOCKED";
  }

  return {
    path,
    selective,
    apf: null,
    workRateShapedCandidate: workRateShaped,
    stopClass,
    acceptExecuted: false,
    productionOurRateWrite: false,
    durableEvidenceWriteRequired: false,
    durableEvidenceWriteNote: null,
    apfEvidencePersist: null,
  };
}


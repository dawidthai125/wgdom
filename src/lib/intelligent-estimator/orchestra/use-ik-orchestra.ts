/**
 * W1 Orchestra — React hook (runtime adapter for IkEntryHost).
 * Holds refs/latches/effects; delegates sync pipeline to ik-orchestra-engine.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { IkNg02IngestBridgeResult } from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";
import {
  buildP2IngestFingerprint,
  isP2AttemptStale,
  p2CleanupInvalidate,
  shouldReleaseBridgeBusy,
  shouldSuppressP2DoubleStart,
} from "@/lib/intelligent-estimator/ik-entry-p2-ingest-latch";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import {
  canRunDocumentDiscovery,
  isDocumentDiscoverySettled,
} from "@/lib/tender-document-discovery";
import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
import { runIkP7PositionCostBid } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import { runIkF5AutoGapResolution } from "@/lib/intelligent-estimator/ik-f5-auto-gap-resolution";
import type { IkF5AutoGapResolutionResult } from "@/lib/intelligent-estimator/ik-f5-auto-gap-resolution";
import { runIkP8RiskDecision } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import {
  buildIkG3FinalBidRecord,
  persistIkG3FinalBid,
  IK_G3_DEFAULT_VAT_RATE,
  readIkG3FinalBid,
} from "@/lib/intelligent-estimator/ik-g3-final-bid";
import { evaluateIkG3PersistReady } from "@/lib/intelligent-estimator/evaluate-ik-g3-persist-ready";
import {
  expertChainMayProceedFromReport,
  resolveIkExpertAdmission,
} from "@/lib/intelligent-estimator/ik-expert-admission";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import {
  isIkP2DocumentsBoqActive,
  isIkIdentityCoverageEnabled,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  isIkAtesdTechnologyE2eActive,
  isIkAtesdExecuteFetchActive,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
  isIkP8RiskDecisionE2eActive,
} from "@/lib/intelligent-estimator/ik-entry-flag";
import type { IkAtesdTechnologyPhaseResult } from "./ik-atesd-technology-phase";
import { evaluateAllDwellingsInPackage } from "@/lib/multi-dwelling/orchestration";
import { getTenderPackage, upsertTenderPackage } from "@/lib/multi-dwelling/store";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { buildIkIdentityCoverageOpsView } from "./ik-identity-coverage-ops";
import {
  buildOwnerInputRefreshKey,
  materializeIkF5OnPackage,
} from "./ik-f5-package-refresh";
import { buildIkOwnerActionQueue } from "./ik-owner-action-queue";
import { buildIkPackageBlockerReport } from "./ik-package-blocker-report";
import { buildIkOwnerActionFreshnessKey } from "./ik-owner-action-freshness";
import type { KnrKnowledgeEnvelope } from "@/lib/intelligent-estimator/knr-knowledge";
import {
  buildKnrKl3bAthFilesFromHistoricalIndex,
  collectKl3TargetDisplayCodes,
  historicalIndexKl3Signature,
} from "@/lib/intelligent-estimator/historical-executed/historical-ath-kl3-files";
import { computeIkOrchestraSyncSnapshot } from "./ik-orchestra-engine";
import {
  shouldLatchIdentityPersistAttempt,
  isGatedIdentityPersistSuccess,
  runGatedIdentityPersistAwaitCloud,
  type IkIdentityPersistSessionGate,
} from "./ik-identity-persist-glue";
import {
  isP5LaborAttemptStale,
  p5LaborCleanupInvalidate,
  shouldSkipP5LaborRestart,
} from "./ik-p5-labor-settle-latch";
import {
  buildAtesdAttemptKey,
  buildKl3KnowledgeKey,
  buildLaborAttemptKey,
  buildMaterialAttemptKey,
  executeAtesdTechnologyPhase,
  executeKl3KnowledgeLookup,
  executeP2IngestBridge,
  executeP5LaborExpert,
  executeP6MaterialExpert,
  needsIkNg02Ingest,
  resolveKl3InFlightCancelCleanup,
} from "./ik-orchestra-runtime";
import {
  buildKnrReanalysisSignalFromHostResult,
  planKnrReanalysisOrchestraInvalidation,
  type IkKnrReanalysisSignal,
} from "./ik-knr-reanalysis-seam";
import { resolveEffectiveItem } from "./orchestra-ports";
import type {
  IkOrchestraHostInput,
  IkOrchestraSnapshot,
  IkOwnerGateApi,
} from "./orchestra-types";
import type { IkOrchestraRefreshPhaseKind } from "./orchestra-refresh-phase";
import type { OwnerManualIdentityOverride } from "./ik-identity-phase";
import {
  buildG1ManualOverride,
  buildG1RejectKey,
  findLaborLineCandidate,
  findMaterialLineCandidate,
  removeManualOverride,
  upsertManualOverride,
  type IkOwnerGateG1RejectKey,
} from "./ik-owner-gate-actions";
import { acceptIkMaterialResearchCandidate } from "@/lib/intelligent-estimator/ik-material-expert";
import { acceptIkLaborResearchAndNotifyIdempotent } from "@/lib/ik-pricing-orchestrator/labor-research-bridge";
import {
  isIkFullTenderWalkEnabled,
  projectIkReadiness,
  runFullTenderWalk,
  type IkReadinessProjection,
  type RunFullTenderWalkResult,
} from "@/lib/intelligent-estimator/full-tender-walk";
import { pushIkFullWalkLedgerToCloudSafe } from "@/lib/intelligent-estimator/full-tender-walk/ledger-store";
import { runAutonomousIdentityWritebackFromCompoundPhase } from "./ik-autonomous-identity-writeback";
import {
  scheduleManyIkContinuations,
  planIkContinuationResearchArm,
  loadIkContinuationFromPackage,
  applyIkContinuationExecutorOutcome,
  upsertIkContinuationRecord,
  persistIkContinuationOnPackage,
  resolveContinuationRefreshPhase,
  type IkContinuationExecutorOutcome,
} from "./ik-research-continuation";

export function useIkOrchestra({
  item,
  onUpdate,
  pipelineIngest,
  athPreviewEnabled = true,
  chiefSession = null,
  historicalIndex = null,
  pricingCatalogRevision = 0,
  onPricingAccepted,
}: IkOrchestraHostInput): IkOrchestraSnapshot {
  const [flagEpoch, setFlagEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setFlagEpoch((n) => n + 1);
    if (typeof window === "undefined") return;
    window.addEventListener("focus", bump);
    window.addEventListener("storage", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("storage", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);
  const flags = useMemo(
    () => ({
      p2DocumentsBoqOn: isIkP2DocumentsBoqActive() === true,
      identityCoverageOn: isIkIdentityCoverageEnabled() === true,
      p5LaborOn: isIkP5LaborE2eActive() === true,
      p5ResearchOn: isIkP5LaborExecuteResearchActive() === true,
      atesdTechnologyOn: isIkAtesdTechnologyE2eActive() === true,
      atesdExecuteFetchOn: isIkAtesdExecuteFetchActive() === true,
      p6MaterialOn: isIkP6MaterialE2eActive() === true,
      p6ResearchOn: isIkP6MaterialExecuteResearchActive() === true,
      p7F5On: isIkP7F5E2eActive() === true,
      p8RiskOn: isIkP8RiskDecisionE2eActive() === true,
      flagEpoch,
    }),
    [flagEpoch],
  );
  const {
    p2DocumentsBoqOn,
    p5LaborOn,
    p5ResearchOn,
    atesdTechnologyOn,
    atesdExecuteFetchOn,
    p6MaterialOn,
    p6ResearchOn,
  } = flags;

  const [pkgEpoch, setPkgEpoch] = useState(0);
  const pkg = useMemo(
    () => getTenderPackage(item.id),
    [item.id, pkgEpoch],
  );
  const [ingest, setIngest] = useState<IkNg02IngestBridgeResult | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [labor, setLabor] = useState<IkLaborExpertReport | null>(null);
  const [material, setMaterial] = useState<IkMaterialExpertReport | null>(null);
  const [atesdTechnology, setAtesdTechnology] =
    useState<IkAtesdTechnologyPhaseResult | null>(null);
  const [identityPersistOutcome, setIdentityPersistOutcome] = useState<
    import("./ik-identity-persist-glue").IkIdentityPersistOutcome | null
  >(null);

  /** A08-P3 G1 — tender-scoped manual identity overrides (session). */
  const [manualOverrides, setManualOverrides] = useState<OwnerManualIdentityOverride[]>([]);
  const [g1RejectedKeys, setG1RejectedKeys] = useState<Set<IkOwnerGateG1RejectKey>>(() => new Set());
  const [g2LaborRejectedKeys, setG2LaborRejectedKeys] = useState<Set<IkOwnerGateG1RejectKey>>(
    () => new Set(),
  );
  const [g2MaterialRejectedKeys, setG2MaterialRejectedKeys] = useState<Set<IkOwnerGateG1RejectKey>>(
    () => new Set(),
  );
  const [identityResearchEpoch, setIdentityResearchEpoch] = useState(0);
  const [catalogReloadEpoch, setCatalogReloadEpoch] = useState(0);
  const [laborRecalcEpoch, setLaborRecalcEpoch] = useState(0);
  const [materialRecalcEpoch, setMaterialRecalcEpoch] = useState(0);

  const onPricingAcceptedRef = useRef(onPricingAccepted);
  onPricingAcceptedRef.current = onPricingAccepted;

  const persistSessionGateRef = useRef<IkIdentityPersistSessionGate>(new Map());
  const persistAttemptKeyRef = useRef<string | null>(null);
  const f5EvalAttemptKeyRef = useRef<string | null>(null);
  const f5OiRefreshKeyRef = useRef<string | null>(null);
  /** GO-AUTO-IDENTITY-01 — AID writeback attempt latch (per compound fingerprint). */
  const autonomousIdentityWritebackKeyRef = useRef<string | null>(null);
  /** GO-AUTO-IDENTITY-01 — ATESD pack persist → material refresh latch. */
  const atesdPackRefreshKeyRef = useRef<string | null>(null);
  /** GO-AUTO-IDENTITY-01 — research continuation arm latch. */
  const researchContinuationArmKeyRef = useRef<string | null>(null);

  const p2RunGenerationRef = useRef(0);
  const p2BusyOwnerGenRef = useRef<number | null>(null);
  const p2InFlightFingerprintRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const itemRef = useRef(item);
  itemRef.current = item;
  const athPreviewEnabledRef = useRef(athPreviewEnabled);
  athPreviewEnabledRef.current = athPreviewEnabled;

  const dossierBuilding = pipelineIngest?.dossierBuilding === true;
  const dossierEnriching = pipelineIngest?.dossierEnriching === true;
  const hasPipelineIngest = pipelineIngest != null;
  const dossierBuildingRef = useRef(dossierBuilding);
  dossierBuildingRef.current = dossierBuilding;
  const dossierEnrichingRef = useRef(dossierEnriching);
  dossierEnrichingRef.current = dossierEnriching;

  const needsP2Ingest = needsIkNg02Ingest(item);
  /** CONNECT — ensureDocuments is unreachable while needsIkNg02Ingest requires attachments. */
  const needsP2EnsureDocuments =
    countTenderAttachments(item) === 0
    && canRunDocumentDiscovery(item)
    && !isDocumentDiscoverySettled(item);
  const p2Fingerprint = useMemo(
    () => buildP2IngestFingerprint(item),
    [
      item.id,
      item.tenderId,
      item.bzpDocuments?.length,
      item.documentsFetchedAt,
      needsP2Ingest,
      needsP2EnsureDocuments,
    ],
  );

  const laborAttemptedRef = useRef<string | null>(null);
  const laborRunGenerationRef = useRef(0);
  const materialAttemptedRef = useRef<string | null>(null);
  const atesdAttemptedRef = useRef<string | null>(null);
  const laborSettledRef = useRef(false);
  const atesdSettledRef = useRef(false);
  const [laborSettleTick, setLaborSettleTick] = useState(0);
  const [atesdSettleTick, setAtesdSettleTick] = useState(0);
  const [knrKnowledge, setKnrKnowledge] = useState<KnrKnowledgeEnvelope | null>(null);
  const [knowledgeBusy, setKnowledgeBusy] = useState(false);
  const [knrReanalysisSignal, setKnrReanalysisSignal] =
    useState<IkKnrReanalysisSignal | null>(null);
  const knowledgeAttemptedRef = useRef<string | null>(null);
  const knrDownstreamDeferredRef = useRef(false);

  const effectiveItem = resolveEffectiveItem({ item, ingest });

  // P2 Documents→BOQ — latch: generation + isStale + owner-safe bridgeBusy (HB1/HB2).
  useEffect(() => {
    if (!p2DocumentsBoqOn) {
      setIngest(null);
      setBridgeBusy(false);
      p2BusyOwnerGenRef.current = null;
      p2InFlightFingerprintRef.current = null;
      return;
    }

    const snapItem = itemRef.current;
    const key = snapItem.id || snapItem.tenderId || "";
    if (!key) return;
    if (dossierBuildingRef.current || dossierEnrichingRef.current) return;
    const ensureDocs =
      countTenderAttachments(snapItem) === 0
      && canRunDocumentDiscovery(snapItem)
      && !isDocumentDiscoverySettled(snapItem);
    if (!needsIkNg02Ingest(snapItem) && !ensureDocs) return;
    if (!onUpdateRef.current) return;
    if (
      shouldSuppressP2DoubleStart({
        fingerprint: p2Fingerprint,
        inFlightFingerprint: p2InFlightFingerprintRef.current,
        busyOwnerGen: p2BusyOwnerGenRef.current,
      })
    ) {
      return;
    }

    let cancelled = false;
    const generation = ++p2RunGenerationRef.current;
    p2BusyOwnerGenRef.current = generation;
    p2InFlightFingerprintRef.current = p2Fingerprint;
    setBridgeBusy(true);

    const isStale = () =>
      isP2AttemptStale({
        cancelled,
        generation,
        runGenerationCurrent: p2RunGenerationRef.current,
      });

    const releaseIfOwner = () => {
      if (
        shouldReleaseBridgeBusy({
          generation,
          runGenerationCurrent: p2RunGenerationRef.current,
          busyOwnerGen: p2BusyOwnerGenRef.current,
        })
      ) {
        setBridgeBusy(false);
        p2BusyOwnerGenRef.current = null;
        p2InFlightFingerprintRef.current = null;
      }
    };

    void (async () => {
      try {
        if (hasPipelineIngest) {
          await new Promise((r) => setTimeout(r, 1500));
          if (isStale()) return;
          if (dossierBuildingRef.current || dossierEnrichingRef.current) return;
          const live = itemRef.current;
          const ensureLive =
            countTenderAttachments(live) === 0
            && canRunDocumentDiscovery(live)
            && !isDocumentDiscoverySettled(live);
          if (!needsIkNg02Ingest(live) && !ensureLive) return;
        }
        if (isStale()) return;

        await executeP2IngestBridge({
          liveItem: itemRef.current,
          athPreviewEnabled: athPreviewEnabledRef.current,
          onUpdate: onUpdateRef.current,
          tenderKey: key,
          isStale,
          setIngest,
          getLiveItem: () => itemRef.current,
        });
      } finally {
        releaseIfOwner();
      }
    })();

    return () => {
      cancelled = true;
      const inv = p2CleanupInvalidate({
        generation,
        runGenerationCurrent: p2RunGenerationRef.current,
        busyOwnerGen: p2BusyOwnerGenRef.current,
      });
      p2RunGenerationRef.current = inv.nextRunGeneration;
      if (inv.releaseBusy) {
        setBridgeBusy(false);
        p2BusyOwnerGenRef.current = inv.nextBusyOwner;
        p2InFlightFingerprintRef.current = null;
      }
    };
  }, [
    p2DocumentsBoqOn,
    p2Fingerprint,
    athPreviewEnabled,
    dossierBuilding,
    dossierEnriching,
    hasPipelineIngest,
    // Intentionally NOT: onUpdate (HB1), item, pkg, pipelineIngest object (HB2).
  ]);

  const fullSnapshot = useMemo(
    () =>
      computeIkOrchestraSyncSnapshot({
        item,
        effectiveItem,
        pkg,
        ingest,
        historicalIndex: historicalIndex ?? null,
        knrKnowledge,
        knowledgeBusy,
        flags,
        chiefSession: chiefSession ?? null,
        manualOverrides,
        knrReanalysisSignal,
      }),
    [
      item,
      effectiveItem,
      pkg,
      ingest,
      historicalIndex,
      knrKnowledge,
      knowledgeBusy,
      flags,
      chiefSession,
      manualOverrides,
      identityResearchEpoch,
      catalogReloadEpoch,
      pricingCatalogRevision,
      knrReanalysisSignal,
    ],
  );

  const workCatalogStore = useMemo(
    () => loadWorkCatalogStoreLocal(),
    [pkgEpoch, catalogReloadEpoch, pricingCatalogRevision],
  );

  const {
    report,
    knr,
    postIdentityExpert,
    identityContext,
    classification,
    compoundIdentityPhase,
    identityCoverage,
    positionCostBid: syncPositionCostBid,
    riskDecision: syncRiskDecision,
    knrDownstreamDeferred,
    knrReanalysisDiag,
  } = fullSnapshot;

  knrDownstreamDeferredRef.current = knrDownstreamDeferred === true;

  const positionCostBidBase = useMemo(() => {
    if (!syncPositionCostBid) return null;
    if (!labor || labor.counts.apfCandidates <= 0) {
      return syncPositionCostBid;
    }
    return runIkP7PositionCostBid({
      item: effectiveItem,
      expert: postIdentityExpert,
      package: pkg,
      store: workCatalogStore,
      labor,
    });
  }, [
    syncPositionCostBid,
    labor,
    effectiveItem,
    postIdentityExpert,
    pkg,
    workCatalogStore,
  ]);

  const f5AutoGapResolution = useMemo((): IkF5AutoGapResolutionResult | null => {
    if (!flags.p7F5On || !positionCostBidBase) return null;
    if (positionCostBidBase.gapLineCount <= 0 && positionCostBidBase.cutoverGatePass) {
      return null;
    }
    if (positionCostBidBase.gapLineCount <= 0) return null;
    return runIkF5AutoGapResolution({
      item: effectiveItem,
      expert: postIdentityExpert,
      package: pkg,
      store: workCatalogStore,
      initialP7: positionCostBidBase,
      labor,
      material,
      maxIterations: 3,
    });
  }, [
    flags.p7F5On,
    positionCostBidBase,
    effectiveItem,
    postIdentityExpert,
    pkg,
    workCatalogStore,
    labor,
    material,
  ]);

  const positionCostBid = useMemo(() => {
    if (f5AutoGapResolution?.finalP7) return f5AutoGapResolution.finalP7;
    return positionCostBidBase;
  }, [f5AutoGapResolution, positionCostBidBase]);

  const riskDecision = useMemo(() => {
    if (!flags.p8RiskOn) {
      return syncRiskDecision;
    }
    if (!labor || labor.counts.apfCandidates <= 0 || !positionCostBid) {
      return syncRiskDecision;
    }
    return runIkP8RiskDecision({
      item: effectiveItem,
      p7: positionCostBid,
      bidProposal: positionCostBid.proposal ?? null,
      expert: postIdentityExpert,
      chiefSession: chiefSession ?? null,
      knrHistorical: knr,
    });
  }, [
    flags.p8RiskOn,
    syncRiskDecision,
    labor,
    positionCostBid,
    effectiveItem,
    postIdentityExpert,
    chiefSession,
    knr,
  ]);

  const ownerActionFreshnessKey = useMemo(() => {
    const tenderId = item.id || item.tenderId || "";
    return buildIkOwnerActionFreshnessKey(tenderId, pricingCatalogRevision);
  }, [item.id, item.tenderId, pricingCatalogRevision]);

  const packageBlockers = useMemo(() => {
    if (!pkg) return null;
    return buildIkPackageBlockerReport(pkg, workCatalogStore, {
      nowMs: Date.now(),
      ensureOwnerQuestions: false,
    });
  }, [pkg, workCatalogStore, identityPersistOutcome, ownerActionFreshnessKey]);

  const ownerActionQueue = useMemo(() => {
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId) return null;
    return buildIkOwnerActionQueue({
      tenderId,
      pkg,
      store: workCatalogStore,
      identityContext,
      identityCoverage,
      classification,
      labor,
      material,
      packageBlockers,
    });
  }, [
    effectiveItem,
    pkg,
    workCatalogStore,
    identityContext,
    identityCoverage,
    classification,
    labor,
    material,
    packageBlockers,
    ownerActionFreshnessKey,
  ]);

  const identityCoverageOps = useMemo(
    () => buildIkIdentityCoverageOpsView(identityCoverage),
    [identityCoverage],
  );

  const refreshF5AfterOwnerInput = useCallback(() => {
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId) return;
    const refreshKey = buildOwnerInputRefreshKey(tenderId);
    if (f5OiRefreshKeyRef.current === refreshKey) return;
    f5OiRefreshKeyRef.current = refreshKey;
    materializeIkF5OnPackage(tenderId, {
      store: workCatalogStore,
      nowMs: Date.now(),
      ensureOwnerQuestions: false,
      refreshKey,
    });
    setPkgEpoch((n) => n + 1);
  }, [effectiveItem, workCatalogStore]);

  const identityPersistPlanKey = useMemo(() => {
    if (!identityContext?.persistPlans?.length) return "";
    return identityContext.persistPlans
      .map((p) => `${p.dwellingId}:${p.identityHash}`)
      .sort()
      .join("|");
  }, [identityContext]);

  // A08-P3 — manual override changes must allow re-persist + F5 re-eval.
  useEffect(() => {
    persistAttemptKeyRef.current = null;
    f5EvalAttemptKeyRef.current = null;
  }, [manualOverrides]);

  // W2 — gated identity persist (NEVER inside sync useMemo).
  // C+D: await flush + cloud readback before latch / SUCCESS.
  useEffect(() => {
    if (!identityPersistPlanKey || !identityContext?.persistPlans?.length) {
      return;
    }
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId) return;
    if (persistAttemptKeyRef.current === identityPersistPlanKey) return;

    let cancelled = false;
    const plans = identityContext.persistPlans;
    void (async () => {
      const outcome = await runGatedIdentityPersistAwaitCloud({
        tenderId,
        package: pkg ?? getTenderPackage(tenderId),
        plans,
        sessionGate: persistSessionGateRef.current,
      });
      if (cancelled) return;
      if (shouldLatchIdentityPersistAttempt(outcome)) {
        persistAttemptKeyRef.current = identityPersistPlanKey;
      }
      setIdentityPersistOutcome(outcome);
      if (isGatedIdentityPersistSuccess(outcome)) {
        setPkgEpoch((n) => n + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identityPersistPlanKey, identityContext, effectiveItem, pkg]);

  // W3 — materialize F5 f5Gate/subtotals on LS after identity persist SUCCESS only.
  useEffect(() => {
    if (!identityPersistOutcome || !isGatedIdentityPersistSuccess(identityPersistOutcome)) {
      return;
    }
    if (!identityPersistPlanKey) return;
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId) return;
    if (f5EvalAttemptKeyRef.current === identityPersistPlanKey) return;
    f5EvalAttemptKeyRef.current = identityPersistPlanKey;

    const pkg = getTenderPackage(tenderId);
    if (!pkg) return;

    const store = loadWorkCatalogStoreLocal();
    const evaluated = evaluateAllDwellingsInPackage(pkg, {
      store,
      nowMs: Date.now(),
      ensureOwnerQuestions: false,
    });
    upsertTenderPackage(evaluated);
    setPkgEpoch((n) => n + 1);
  }, [identityPersistOutcome, identityPersistPlanKey, effectiveItem]);

  // GO24 — durable OfferBoq attestation for AUTO_RATE/BOM (REUSE/pack · no catalog invent write).
  const g2PersistAttemptKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const phase = fullSnapshot.autoG2Phase;
    if (!phase?.package) return;
    if (phase.counts.autoRateAccept === 0 && phase.counts.autoBomAccept === 0) return;
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId) return;
    const key = [
      "g2",
      tenderId,
      phase.counts.autoRateAccept,
      phase.counts.autoBomAccept,
      phase.counts.rateIdempotentNoop,
      phase.counts.bomIdempotentNoop,
      phase.counts.overwriteBlocked,
    ].join("|");
    if (g2PersistAttemptKeyRef.current === key) return;
    g2PersistAttemptKeyRef.current = key;
    upsertTenderPackage(phase.package);
    setPkgEpoch((n) => n + 1);
  }, [fullSnapshot.autoG2Phase, effectiveItem]);

  // AUT-G3-PERSIST — after P7/P8 settle · latch like AutoG2 · Owner g3Accept remains override.
  const g3PersistAttemptKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!flags.p7F5On) return;
    const liveItem = itemRef.current;
    const liveUpdate = onUpdateRef.current;
    const tenderPipelineId = String(liveItem?.id || "").trim();
    if (!tenderPipelineId || !positionCostBid) return;

    const gate = evaluateIkG3PersistReady({
      expert: postIdentityExpert,
      p7: positionCostBid,
      risk: riskDecision,
      requireBidCutover: true,
    });
    if (!gate.ready) return;

    const existing = readIkG3FinalBid(liveItem);
    if (existing && existing.netPln > 0) return;

    const net = positionCostBid.recommendedBidPln!;
    const vatRate = IK_G3_DEFAULT_VAT_RATE;
    const vatPln = Math.round(net * vatRate);
    const grossPln = Math.round(net + vatPln);
    const key = [
      "aut-g3",
      tenderPipelineId,
      net,
      positionCostBid.completeLineCount,
      positionCostBid.billableLineCount,
      riskDecision?.status ?? "none",
    ].join("|");
    if (g3PersistAttemptKeyRef.current === key) return;
    g3PersistAttemptKeyRef.current = key;

    void (async () => {
      const built = buildIkG3FinalBidRecord({
        tenderPipelineId,
        ocdsId: liveItem.tenderId ?? null,
        netPln: net,
        vatPln,
        grossPln,
        vatRate,
        p7RecommendedNetPln: net,
        caseLabel: "AUT-G3-PERSIST",
        source: "autonomous_g3",
      });
      if (!built.ok) return;
      if (liveUpdate) {
        liveUpdate({ ikFinalBid: built.record });
        return;
      }
      await persistIkG3FinalBid({
        tenderPipelineId,
        expectedOcds: liveItem.tenderId ?? null,
        netPln: net,
        vatPln,
        grossPln,
        vatRate,
        p7RecommendedNetPln: net,
        caseLabel: "AUT-G3-PERSIST",
        source: "autonomous_g3",
      });
    })();
  }, [
    flags.p7F5On,
    positionCostBid,
    riskDecision,
    postIdentityExpert,
    effectiveItem,
  ]);

  // KL-3 HOST — lookup + on-MISS discovery (async · Orchestra reanalysis seam on complete).
  // Deps use stable knowledgeKey string (not knr/report object identity) so setKnowledgeBusy(true)
  // → snapshot rebuild cannot self-cancel the in-flight attempt (RCA: permanent busy latch).
  const tenderIdForKl3 = effectiveItem.id || effectiveItem.tenderId || "";
  const mayProceedForKl3 = expertChainMayProceedFromReport(report);
  // Historical Executed ATH (AUX normative source) — key includes index signature so KL-3
  // re-runs once history hydrates; null index ⇒ athFiles=[] ⇒ host fail-closed (SKIPPED_NO_ATH).
  const historicalKl3Signature = historicalIndexKl3Signature(historicalIndex);
  const kl3KnowledgeKey = useMemo(() => {
    if (!tenderIdForKl3 || knr.lines.length === 0) return "";
    return `${buildKl3KnowledgeKey(tenderIdForKl3, knr)}|ir${identityResearchEpoch}|${historicalKl3Signature}`;
  }, [tenderIdForKl3, knr, identityResearchEpoch, historicalKl3Signature]);
  const knrForKl3Ref = useRef(knr);
  const reportForKl3Ref = useRef(report);
  const historicalForKl3Ref = useRef(historicalIndex);
  knrForKl3Ref.current = knr;
  reportForKl3Ref.current = report;
  historicalForKl3Ref.current = historicalIndex;

  useEffect(() => {
    if (!mayProceedForKl3) {
      setKnrKnowledge(null);
      setKnowledgeBusy(false);
      setKnrReanalysisSignal(null);
      knowledgeAttemptedRef.current = null;
      return;
    }
    if (!tenderIdForKl3 || !kl3KnowledgeKey) {
      setKnrKnowledge(null);
      setKnowledgeBusy(false);
      setKnrReanalysisSignal(null);
      return;
    }
    if (knowledgeAttemptedRef.current === kl3KnowledgeKey) return;

    knowledgeAttemptedRef.current = kl3KnowledgeKey;
    let cancelled = false;
    setKnowledgeBusy(true);
    const knrSnap = knrForKl3Ref.current;
    const reportSnap = reportForKl3Ref.current;
    // Historical Executed ATH → KnrKl3bAthFile[] (1 target → 1 file; conflicts/multi → omitted).
    const { athFiles } = buildKnrKl3bAthFilesFromHistoricalIndex({
      historicalIndex: historicalForKl3Ref.current,
      targetDisplayCodes: collectKl3TargetDisplayCodes(knrSnap.lines),
    });
    void executeKl3KnowledgeLookup({
      tenderId: tenderIdForKl3,
      knr: knrSnap,
      documentExpert: reportSnap,
      athFiles,
      isCancelled: () => cancelled,
      setKnrKnowledge,
      setKnowledgeBusy,
      onHostComplete: (hostResult) => {
        const signal = buildKnrReanalysisSignalFromHostResult(
          hostResult,
          knrSnap.lines.map((l) => ({ lineId: l.lineId, dwellingId: l.dwellingId })),
        );
        setKnrReanalysisSignal(signal);
        const plan = planKnrReanalysisOrchestraInvalidation(signal, {
          // G-ORD-02 — real defer state from last Orchestra snapshot (not hardcoded).
          downstreamAlreadyDeferred: knrDownstreamDeferredRef.current,
        });
        if (plan.clearKnowledgeAttemptLatch) {
          knowledgeAttemptedRef.current = null;
        }
        if (plan.bumpIdentityResearchEpoch) {
          setIdentityResearchEpoch((n) => n + 1);
        }
        if (plan.bumpLaborRecalcEpoch) {
          laborAttemptedRef.current = null;
          setLaborRecalcEpoch((n) => n + 1);
        }
        if (plan.bumpMaterialRecalcEpoch) {
          materialAttemptedRef.current = null;
          setMaterialRecalcEpoch((n) => n + 1);
        }
      },
    });

    return () => {
      cancelled = true;
      const cleanup = resolveKl3InFlightCancelCleanup({
        inFlightKnowledgeKey: kl3KnowledgeKey,
        attemptedKey: knowledgeAttemptedRef.current,
      });
      knowledgeAttemptedRef.current = cleanup.nextAttemptedKey;
      if (cleanup.clearBusy) setKnowledgeBusy(false);
    };
  }, [mayProceedForKl3, tenderIdForKl3, kl3KnowledgeKey]);

  // P5 Labor E2E — generation + sticky clear on cancel-before-settle (pending race fix).
  useEffect(() => {
    if (!p5LaborOn) {
      laborSettledRef.current = true;
      laborAttemptedRef.current = null;
      laborRunGenerationRef.current += 1;
      setLabor(null);
      return;
    }
    if (knrDownstreamDeferred) {
      laborSettledRef.current = false;
      laborAttemptedRef.current = null;
      setLabor(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !expertChainMayProceedFromReport(postIdentityExpert)) {
      laborSettledRef.current = false;
      setLabor(null);
      return;
    }
    const laborKey = `${buildLaborAttemptKey(key, postIdentityExpert, p5ResearchOn)}|lr${laborRecalcEpoch}`;
    if (
      shouldSkipP5LaborRestart({
        laborKey,
        laborAttemptedKey: laborAttemptedRef.current,
      })
    ) {
      return;
    }
    laborSettledRef.current = false;
    laborAttemptedRef.current = laborKey;
    let cancelled = false;
    let settled = false;
    const generation = ++laborRunGenerationRef.current;
    void executeP5LaborExpert({
      effectiveItem,
      pkg,
      expert: postIdentityExpert,
      p5ResearchOn,
      isCancelled: () =>
        isP5LaborAttemptStale({
          cancelled,
          generation,
          runGenerationCurrent: laborRunGenerationRef.current,
        }),
      setLabor,
      onSettled: () => {
        settled = true;
        laborSettledRef.current = true;
        setLaborSettleTick((n) => n + 1);
      },
    });
    return () => {
      cancelled = true;
      const inv = p5LaborCleanupInvalidate({
        generation,
        runGenerationCurrent: laborRunGenerationRef.current,
        settled,
        laborKey,
        laborAttemptedKey: laborAttemptedRef.current,
      });
      laborRunGenerationRef.current = inv.nextRunGeneration;
      laborAttemptedRef.current = inv.nextLaborAttemptedKey;
    };
  }, [effectiveItem, pkg, postIdentityExpert, p5LaborOn, p5ResearchOn, laborRecalcEpoch, knrDownstreamDeferred]);

  // ATESD / ATHED CONNECT — after P5 settle (OUR RATE), before P6
  useEffect(() => {
    if (!atesdTechnologyOn) {
      atesdSettledRef.current = true;
      atesdAttemptedRef.current = null;
      setAtesdTechnology(null);
      return;
    }
    if (knrDownstreamDeferred) {
      atesdSettledRef.current = false;
      atesdAttemptedRef.current = null;
      setAtesdTechnology(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !expertChainMayProceedFromReport(postIdentityExpert)) {
      atesdSettledRef.current = false;
      setAtesdTechnology(null);
      return;
    }
    if (p5LaborOn && laborSettledRef.current !== true) return;
    const atesdKey = `${buildAtesdAttemptKey(key, postIdentityExpert, atesdExecuteFetchOn)}|ar${laborRecalcEpoch}|${catalogReloadEpoch}`;
    if (atesdAttemptedRef.current === atesdKey) return;
    atesdAttemptedRef.current = atesdKey;
    atesdSettledRef.current = false;
    let cancelled = false;
    void executeAtesdTechnologyPhase({
      effectiveItem,
      pkg,
      expert: postIdentityExpert,
      executeAthedFetch: atesdExecuteFetchOn,
      isCancelled: () => cancelled,
      setAtesd: setAtesdTechnology,
      onSettled: () => {
        atesdSettledRef.current = true;
        setAtesdSettleTick((n) => n + 1);
      },
    });
    return () => {
      cancelled = true;
    };
  }, [
    effectiveItem,
    pkg,
    postIdentityExpert,
    atesdTechnologyOn,
    atesdExecuteFetchOn,
    p5LaborOn,
    laborSettleTick,
    laborRecalcEpoch,
    catalogReloadEpoch,
    knrDownstreamDeferred,
  ]);

  // P6 Material E2E
  useEffect(() => {
    if (!p6MaterialOn) {
      setMaterial(null);
      return;
    }
    if (knrDownstreamDeferred) {
      materialAttemptedRef.current = null;
      setMaterial(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !expertChainMayProceedFromReport(postIdentityExpert)) {
      setMaterial(null);
      return;
    }
    if (p5LaborOn && laborSettledRef.current !== true) return;
    if (atesdTechnologyOn && atesdSettledRef.current !== true) return;
    const materialKey = `${buildMaterialAttemptKey(key, postIdentityExpert, p6ResearchOn)}|mr${materialRecalcEpoch}`;
    if (materialAttemptedRef.current === materialKey) return;
    materialAttemptedRef.current = materialKey;
    let cancelled = false;
    void executeP6MaterialExpert({
      effectiveItem,
      pkg,
      expert: postIdentityExpert,
      p6ResearchOn,
      isCancelled: () => cancelled,
      setMaterial,
    });
    return () => {
      cancelled = true;
    };
  }, [
    effectiveItem,
    pkg,
    postIdentityExpert,
    p6MaterialOn,
    p6ResearchOn,
    p5LaborOn,
    atesdTechnologyOn,
    laborSettleTick,
    atesdSettleTick,
    materialRecalcEpoch,
    knrDownstreamDeferred,
  ]);

  const bumpOrchestraAfterPricingAccept = useCallback(() => {
    setCatalogReloadEpoch((n) => n + 1);
    setPkgEpoch((n) => n + 1);
    onPricingAcceptedRef.current?.();
  }, []);

  /**
   * W5 CONNECT — TARGET refreshPhase = existing bump + domain epochs.
   * Not a second refresh system (§2A.6).
   */
  const refreshPhase = useCallback(
    (kind: IkOrchestraRefreshPhaseKind = "pricing_accept") => {
      bumpOrchestraAfterPricingAccept();
      if (kind === "labor_accept") {
        laborAttemptedRef.current = null;
        setLaborRecalcEpoch((n) => n + 1);
      } else if (kind === "material_accept") {
        materialAttemptedRef.current = null;
        setMaterialRecalcEpoch((n) => n + 1);
      } else if (kind === "catalog_accept") {
        knowledgeAttemptedRef.current = null;
        setIdentityResearchEpoch((n) => n + 1);
      }
    },
    [bumpOrchestraAfterPricingAccept],
  );

  /**
   * GO-AUTO-IDENTITY-01 — AID/AIR trusted → OfferBoq writeback → catalog_accept refresh.
   * CONFLICT / wrong unit → OWNER_EXCEPTION (no write). NEED_RESEARCH → continuation sidecar.
   */
  useEffect(() => {
    if (!compoundIdentityPhase) return;
    if (compoundIdentityPhase.status !== "ready" && compoundIdentityPhase.status !== "partial") {
      return;
    }
    const tid = String(effectiveItem.id || effectiveItem.tenderId || "").trim();
    if (!tid || !pkg) return;
    const fp = [
      tid,
      compoundIdentityPhase.parentCount,
      compoundIdentityPhase.trustedCount,
      compoundIdentityPhase.unresolvedCount,
      compoundIdentityPhase.reasons.slice(0, 8).join("|"),
    ].join("::");
    if (autonomousIdentityWritebackKeyRef.current === fp) return;
    autonomousIdentityWritebackKeyRef.current = fp;

    let cancelled = false;
    void (async () => {
      const wb = await runAutonomousIdentityWritebackFromCompoundPhase({
        tenderId: tid,
        package: pkg,
        compoundIdentity: compoundIdentityPhase,
      });
      if (cancelled) return;

      if (wb.researchContinuationLineIds.length > 0) {
        scheduleManyIkContinuations({
          tenderId: tid,
          package: pkg,
          lineIds: wb.researchContinuationLineIds,
          domain: "identity",
          reasonFingerprint: "aid_need_research",
        });
        setPkgEpoch((n) => n + 1);
      }

      if (wb.canonicalMutationPersisted) {
        setIdentityPersistOutcome(wb.persistOutcome);
        setPkgEpoch((n) => n + 1);
        refreshPhase("catalog_accept");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compoundIdentityPhase, effectiveItem, pkg, refreshPhase]);

  /**
   * GO-AUTO-IDENTITY-01 — TechnologyPack durable persist → material_accept refresh (G2/P7).
   * Only when technologyPackPersisted === true (explicit durable confirm).
   */
  useEffect(() => {
    if (!atesdTechnology || atesdTechnology.status !== "ok") return;
    if (atesdTechnology.technologyPackPersisted !== true) return;
    const key = [
      effectiveItem.id,
      atesdTechnology.evaluatedAtIso,
      atesdTechnology.counts.technologyPackBuilt,
      "pack_persisted",
    ].join("|");
    if (atesdPackRefreshKeyRef.current === key) return;
    atesdPackRefreshKeyRef.current = key;
    refreshPhase("material_accept");
  }, [atesdTechnology, effectiveItem.id, refreshPhase]);

  /**
   * GO-AUTO-IDENTITY-01 — after labor settles with candidate/evidence, advance continuation.
   * Refresh ONLY on canonical_mutation_persisted (AUT-R1 already uses ownerGate refresh).
   */
  useEffect(() => {
    if (!labor || labor.status !== "ready") return;
    const tid = String(effectiveItem.id || "").trim();
    if (!tid) return;
    const pkgNow = getTenderPackage(tid);
    if (!pkgNow) return;
    let sidecar = loadIkContinuationFromPackage(pkgNow);
    let changed = false;
    let refreshKind: ReturnType<typeof resolveContinuationRefreshPhase> = null;

    for (const line of labor.lines ?? []) {
      const rec = sidecar.records.find(
        (r) => r.lineId === line.lineId && r.domain === "labor" && r.tenderId === tid,
      );
      if (!rec) continue;
      if (rec.status === "RESOLVED" || rec.status === "OWNER_EXCEPTION" || rec.status === "EXHAUSTED") {
        continue;
      }
      let outcome: IkContinuationExecutorOutcome = "no_change";
      if (line.rateStatus === "CURRENT_HIT" || line.rateStatus === "INTERNAL_EXACT_HIT") {
        outcome = "canonical_mutation_persisted";
      } else if (line.candidate != null) {
        outcome = "evidence_persisted";
      } else if (
        line.rateStatus === "MISS"
        || line.rateStatus === "STALE_TREATED_AS_MISS"
        || line.rateStatus === "RESEARCH_PENDING"
      ) {
        outcome = "retry_due";
      }
      const advanced = applyIkContinuationExecutorOutcome(rec, outcome);
      if (advanced.status !== rec.status || advanced.attempts !== rec.attempts) {
        sidecar = upsertIkContinuationRecord(sidecar, advanced);
        changed = true;
        const kind = resolveContinuationRefreshPhase("labor", outcome);
        if (kind) refreshKind = kind;
      }
    }

    if (changed) {
      persistIkContinuationOnPackage({ tenderId: tid, package: pkgNow, sidecar });
      setPkgEpoch((n) => n + 1);
    }
    if (refreshKind) {
      refreshPhase(refreshKind);
    }
  }, [labor, effectiveItem.id, refreshPhase]);

  const chiefMaterialAvailable = chiefSession != null;

  const ownerGate: IkOwnerGateApi = useMemo(
    () => ({
      manualOverrides,
      chiefMaterialAvailable,
      isG1Rejected: (dwellingId, lineId) =>
        g1RejectedKeys.has(buildG1RejectKey(dwellingId, lineId)),
      isG2LaborRejected: (dwellingId, lineId) =>
        g2LaborRejectedKeys.has(buildG1RejectKey(dwellingId, lineId)),
      isG2MaterialRejected: (dwellingId, lineId) =>
        g2MaterialRejectedKeys.has(buildG1RejectKey(dwellingId, lineId)),
      g1Accept: ({ dwellingId, lineId, catalogWorkId }) => {
        const id = catalogWorkId.trim();
        if (!id) return { ok: false, reason: "MISSING_CATALOG_WORK_ID" };
        const override = buildG1ManualOverride({ dwellingId, lineId, catalogWorkId: id });
        setManualOverrides((prev) => upsertManualOverride(prev, override));
        setG1RejectedKeys((prev) => {
          const next = new Set(prev);
          next.delete(buildG1RejectKey(dwellingId, lineId));
          return next;
        });
        return { ok: true };
      },
      g1Edit: ({ dwellingId, lineId, catalogWorkId }) => {
        const id = catalogWorkId.trim();
        if (!id) return { ok: false, reason: "MISSING_CATALOG_WORK_ID" };
        const override = buildG1ManualOverride({ dwellingId, lineId, catalogWorkId: id });
        setManualOverrides((prev) => upsertManualOverride(prev, override));
        setG1RejectedKeys((prev) => {
          const next = new Set(prev);
          next.delete(buildG1RejectKey(dwellingId, lineId));
          return next;
        });
        return { ok: true };
      },
      g1Reject: ({ dwellingId, lineId }) => {
        setG1RejectedKeys((prev) => new Set(prev).add(buildG1RejectKey(dwellingId, lineId)));
        setManualOverrides((prev) => removeManualOverride(prev, dwellingId, lineId));
        return { ok: true };
      },
      g1ResearchAgain: ({ dwellingId, lineId }) => {
        void dwellingId;
        void lineId;
        knowledgeAttemptedRef.current = null;
        setIdentityResearchEpoch((n) => n + 1);
        return { ok: true };
      },
      g2LaborReject: ({ dwellingId, lineId }) => {
        setG2LaborRejectedKeys((prev) => new Set(prev).add(buildG1RejectKey(dwellingId, lineId)));
        return { ok: true };
      },
      g2LaborRecalculate: ({ dwellingId, lineId }) => {
        setG2LaborRejectedKeys((prev) => {
          const next = new Set(prev);
          next.delete(buildG1RejectKey(dwellingId, lineId));
          return next;
        });
        laborAttemptedRef.current = null;
        setLaborRecalcEpoch((n) => n + 1);
        return { ok: true };
      },
      g2LaborAccept: async ({ dwellingId, lineId }) => {
        const row = findLaborLineCandidate(labor, dwellingId, lineId);
        if (!row?.candidate) return { ok: false, reason: "NO_LABOR_CANDIDATE" };
        const store = loadWorkCatalogStoreLocal();
        const result = await acceptIkLaborResearchAndNotifyIdempotent({
          store,
          candidate: row.candidate,
          notify: {
            bumpPricingCatalogRevision: () => {},
            bumpChiefRefresh: () => {},
          },
        });
        if (!result.ok) return { ok: false, reason: result.reason };
        if (result.skippedDuplicate) return { ok: true, noop: true, reason: "IDEMPOTENT_NOOP" };
        if (!result.notified) return { ok: false, reason: "PERSIST_FAILED" };
        // W5 — REUSE approved refreshPhase seam (was inline bump + labor epoch).
        refreshPhase("labor_accept");
        return { ok: true };
      },
      g2MaterialReject: ({ dwellingId, lineId }) => {
        setG2MaterialRejectedKeys((prev) => new Set(prev).add(buildG1RejectKey(dwellingId, lineId)));
        return { ok: true };
      },
      g2MaterialRecalculate: ({ dwellingId, lineId }) => {
        setG2MaterialRejectedKeys((prev) => {
          const next = new Set(prev);
          next.delete(buildG1RejectKey(dwellingId, lineId));
          return next;
        });
        materialAttemptedRef.current = null;
        setMaterialRecalcEpoch((n) => n + 1);
        return { ok: true };
      },
      g2MaterialAccept: async ({ dwellingId, lineId }) => {
        if (!chiefMaterialAvailable) {
          return { ok: false, reason: "CHIEF_OFF" };
        }
        const row = findMaterialLineCandidate(material, dwellingId, lineId);
        if (!row?.candidate) return { ok: false, reason: "NO_MATERIAL_CANDIDATE" };
        try {
          const acceptResult = await acceptIkMaterialResearchCandidate({
            candidate: row.candidate,
            expectedUnit: row.unit,
          });
          if (!acceptResult.ok || !acceptResult.persisted) {
            return {
              ok: false,
              reason: acceptResult.error ?? "MATERIAL_ACCEPT_FAILED",
            };
          }
          // W5 — REUSE approved refreshPhase seam.
          refreshPhase("material_accept");
          return { ok: true };
        } catch {
          return { ok: false, reason: "MATERIAL_ACCEPT_FAILED" };
        }
      },
      g3Accept: async ({
        netPln,
        vatPln,
        grossPln,
        vatRate,
        p7RecommendedNetPln,
        expectedOcds,
        caseLabel,
      }) => {
        const liveItem = itemRef.current;
        const liveUpdate = onUpdateRef.current;
        const tenderPipelineId = String(liveItem.id || "").trim();
        const gate = evaluateIkG3PersistReady({
          expert: postIdentityExpert,
          p7: positionCostBid,
          risk: riskDecision,
          requireBidCutover: false,
        });
        if (!gate.ready) {
          return {
            ok: false,
            reason:
              gate.reason === "PACKAGE_GATE_FAIL" || gate.reason === "P7_GAPS"
                ? "FINAL_BID_NOT_READY_PACKAGE_PARTIAL"
                : gate.reason,
          };
        }
        const built = buildIkG3FinalBidRecord({
          tenderPipelineId,
          ocdsId: expectedOcds ?? liveItem.tenderId ?? null,
          netPln,
          vatPln,
          grossPln,
          vatRate,
          p7RecommendedNetPln,
          caseLabel,
          source: "owner_g3",
        });
        if (!built.ok) return { ok: false, reason: built.reason };
        if (
          expectedOcds != null &&
          String(expectedOcds).trim() &&
          String(liveItem.tenderId || "").trim() !== String(expectedOcds).trim()
        ) {
          return { ok: false, reason: "OCDS_MISMATCH" };
        }
        if (liveUpdate) {
          liveUpdate({ ikFinalBid: built.record });
          return { ok: true };
        }
        const result = await persistIkG3FinalBid({
          tenderPipelineId,
          expectedOcds: expectedOcds ?? liveItem.tenderId ?? null,
          netPln,
          vatPln,
          grossPln,
          vatRate,
          p7RecommendedNetPln,
          caseLabel,
          source: "owner_g3",
        });
        if (!result.ok) return { ok: false, reason: result.reason };
        if (result.noop) return { ok: true, noop: true, reason: "IDEMPOTENT_NOOP" };
        return { ok: true };
      },
    }),
    [
      manualOverrides,
      g1RejectedKeys,
      g2LaborRejectedKeys,
      g2MaterialRejectedKeys,
      labor,
      material,
      chiefMaterialAvailable,
      refreshPhase,
      postIdentityExpert,
      positionCostBid,
      riskDecision,
    ],
  );

  /** IK-FTO-01 — Full Walk: visit every Master BOQ line · LINE HOLD ≠ TENDER STOP. */
  const fullTenderWalk = useMemo((): RunFullTenderWalkResult | null => {
    if (!isIkFullTenderWalkEnabled()) return null;
    const masterLines = postIdentityExpert?.masterBoqLines ?? [];
    const refs =
      masterLines.length > 0
        ? masterLines.map((l) => ({
            lineId: l.line.lineId,
            lp: l.line.lp != null ? String(l.line.lp) : null,
            description: l.line.description ?? null,
          }))
        : (labor?.lines ?? []).map((l) => ({
            lineId: l.lineId,
            lp: null,
            description: l.description ?? null,
          }));
    if (refs.length === 0) return null;
    /** Minimal CONNECT — P7 shadow positionComplete (existing SSOT · no new resolver). */
    const positionCompleteByLineId: Record<string, boolean> = {};
    for (const row of positionCostBid?.shadow?.lines ?? []) {
      if (row.positionComplete === true && row.lineId) {
        positionCompleteByLineId[row.lineId] = true;
      }
    }
    return runFullTenderWalk({
      tenderId: String(effectiveItem.id || item.id || "").trim(),
      lines: refs,
      labor,
      material,
      executeResearchPermission: flags.p5ResearchOn === true,
      persist: true,
      positionCompleteByLineId,
    });
  }, [postIdentityExpert, labor, material, flags.p5ResearchOn, item.id, effectiveItem.id, positionCostBid]);

  /**
   * IK-FTO-01 — researchShouldExecuteLineIds → existing ikContinuation + P5/P6 arm
   * (no Research Engine 2 · preserves GO-AUTO identity continuation path).
   */
  useEffect(() => {
    if (!fullTenderWalk) return;
    const tid = String(effectiveItem.id || "").trim();
    if (!tid || !pkg) return;

    const shouldExec = fullTenderWalk.researchShouldExecuteLineIds ?? [];
    if (shouldExec.length > 0) {
      scheduleManyIkContinuations({
        tenderId: tid,
        package: pkg,
        lineIds: shouldExec,
        domain: "labor",
        reasonFingerprint: "fto_research_required",
      });
    }

    const sidecar = loadIkContinuationFromPackage(getTenderPackage(tid) ?? pkg);
    const plan = planIkContinuationResearchArm({ sidecar });
    const armKey = [
      tid,
      plan.laborLineIds.join(","),
      plan.materialLineIds.join(","),
      plan.identityLineIds.join(","),
      flags.p5ResearchOn ? "1" : "0",
    ].join("|");
    if (researchContinuationArmKeyRef.current === armKey) return;
    researchContinuationArmKeyRef.current = armKey;

    if (plan.identityLineIds.length > 0) {
      knowledgeAttemptedRef.current = null;
      setIdentityResearchEpoch((n) => n + 1);
    }

    if (plan.laborLineIds.length > 0 && flags.p5ResearchOn === true && flags.p5LaborOn === true) {
      laborAttemptedRef.current = null;
      setLaborRecalcEpoch((n) => n + 1);
      let next = sidecar;
      for (const lineId of plan.laborLineIds) {
        const rec = next.records.find(
          (r) => r.lineId === lineId && r.domain === "labor" && r.tenderId === tid,
        );
        if (!rec) continue;
        const advanced = applyIkContinuationExecutorOutcome(rec, "no_change");
        next = upsertIkContinuationRecord(next, advanced);
      }
      persistIkContinuationOnPackage({ tenderId: tid, package: pkg, sidecar: next });
    }

    if (plan.materialLineIds.length > 0 && flags.p6ResearchOn === true && flags.p6MaterialOn === true) {
      materialAttemptedRef.current = null;
      setMaterialRecalcEpoch((n) => n + 1);
    }
  }, [
    fullTenderWalk,
    effectiveItem.id,
    pkg,
    flags.p5ResearchOn,
    flags.p5LaborOn,
    flags.p6ResearchOn,
    flags.p6MaterialOn,
  ]);

  useEffect(() => {
    if (!fullTenderWalk) return;
    void pushIkFullWalkLedgerToCloudSafe();
  }, [fullTenderWalk?.ledger.updatedAt, fullTenderWalk?.ledger.walkId]);

  const readinessProjection = useMemo((): IkReadinessProjection | null => {
    if (!fullTenderWalk) return null;
    return projectIkReadiness({
      item: effectiveItem,
      expert: postIdentityExpert,
      p7: positionCostBid,
      risk: riskDecision,
      ledger: fullTenderWalk.ledger,
      currentWalkId: fullTenderWalk.ledger.walkId,
      currentWalkStartedAt: fullTenderWalk.ledger.startedAt,
    });
  }, [fullTenderWalk, effectiveItem, postIdentityExpert, positionCostBid, riskDecision]);

  return useMemo(
    () => ({
      effectiveItem,
      pkg,
      ingest,
      bridgeBusy,
      labor,
      material,
      atesdTechnology,
      flags,
      ...fullSnapshot,
      positionCostBid,
      f5AutoGapResolution,
      riskDecision,
      identityPersistOutcome,
      packageBlockers,
      ownerActionQueue,
      identityCoverageOps,
      refreshF5AfterOwnerInput,
      refreshPhase,
      ownerGate,
      fullTenderWalk,
      readinessProjection,
    }),
    [
      effectiveItem,
      pkg,
      ingest,
      bridgeBusy,
      labor,
      material,
      atesdTechnology,
      flags,
      fullSnapshot,
      positionCostBid,
      f5AutoGapResolution,
      riskDecision,
      identityPersistOutcome,
      packageBlockers,
      ownerActionQueue,
      identityCoverageOps,
      refreshF5AfterOwnerInput,
      refreshPhase,
      ownerGate,
      fullTenderWalk,
      readinessProjection,
    ],
  );
}

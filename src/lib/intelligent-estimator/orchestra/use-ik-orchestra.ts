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
} from "@/lib/intelligent-estimator/ik-g3-final-bid";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import {
  isIkP2DocumentsBoqActive,
  isIkIdentityCoverageEnabled,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
  isIkP8RiskDecisionE2eActive,
} from "@/lib/intelligent-estimator/ik-entry-flag";
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
import { computeIkOrchestraSyncSnapshot } from "./ik-orchestra-engine";
import {
  runGatedIdentityPersist,
  type IkIdentityPersistSessionGate,
} from "./ik-identity-persist-glue";
import {
  isP5LaborAttemptStale,
  p5LaborCleanupInvalidate,
  shouldSkipP5LaborRestart,
} from "./ik-p5-labor-settle-latch";
import {
  buildKl3KnowledgeKey,
  buildLaborAttemptKey,
  buildMaterialAttemptKey,
  executeKl3KnowledgeLookup,
  executeP2IngestBridge,
  executeP5LaborExpert,
  executeP6MaterialExpert,
  needsIkNg02Ingest,
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
  const flags = useMemo(
    () => ({
      p2DocumentsBoqOn: isIkP2DocumentsBoqActive() === true,
      identityCoverageOn: isIkIdentityCoverageEnabled() === true,
      p5LaborOn: isIkP5LaborE2eActive() === true,
      p5ResearchOn: isIkP5LaborExecuteResearchActive() === true,
      p6MaterialOn: isIkP6MaterialE2eActive() === true,
      p6ResearchOn: isIkP6MaterialExecuteResearchActive() === true,
      p7F5On: isIkP7F5E2eActive() === true,
      p8RiskOn: isIkP8RiskDecisionE2eActive() === true,
    }),
    [],
  );
  const {
    p2DocumentsBoqOn,
    p5LaborOn,
    p5ResearchOn,
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
  const laborSettledRef = useRef(false);
  const [laborSettleTick, setLaborSettleTick] = useState(0);
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
  useEffect(() => {
    if (!identityPersistPlanKey || !identityContext?.persistPlans?.length) {
      return;
    }
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId) return;
    if (persistAttemptKeyRef.current === identityPersistPlanKey) return;
    persistAttemptKeyRef.current = identityPersistPlanKey;

    const outcome = runGatedIdentityPersist({
      tenderId,
      package: getTenderPackage(tenderId),
      plans: identityContext.persistPlans,
      sessionGate: persistSessionGateRef.current,
    });
    setIdentityPersistOutcome(outcome);
    if (outcome.writes.length > 0) {
      setPkgEpoch((n) => n + 1);
    }
  }, [identityPersistPlanKey, identityContext, effectiveItem]);

  // W3 — materialize F5 f5Gate/subtotals on LS after identity persist writes.
  useEffect(() => {
    if (!identityPersistOutcome?.writes?.length) return;
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

  // KL-3 HOST — lookup + on-MISS discovery (async · Orchestra reanalysis seam on complete).
  useEffect(() => {
    if (!report.masterBoq.readyForExperts) {
      setKnrKnowledge(null);
      setKnowledgeBusy(false);
      setKnrReanalysisSignal(null);
      knowledgeAttemptedRef.current = null;
      return;
    }
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId || knr.lines.length === 0) {
      setKnrKnowledge(null);
      setKnowledgeBusy(false);
      setKnrReanalysisSignal(null);
      return;
    }
    const knowledgeKey = `${buildKl3KnowledgeKey(tenderId, knr)}|ir${identityResearchEpoch}`;
    if (knowledgeAttemptedRef.current === knowledgeKey) return;

    knowledgeAttemptedRef.current = knowledgeKey;
    let cancelled = false;
    setKnowledgeBusy(true);
    void executeKl3KnowledgeLookup({
      tenderId,
      knr,
      documentExpert: report,
      isCancelled: () => cancelled,
      setKnrKnowledge,
      setKnowledgeBusy,
      onHostComplete: (hostResult) => {
        const signal = buildKnrReanalysisSignalFromHostResult(
          hostResult,
          knr.lines.map((l) => ({ lineId: l.lineId, dwellingId: l.dwellingId })),
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
    };
  }, [effectiveItem, knr, report.masterBoq.readyForExperts, identityResearchEpoch]);

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
      setLabor(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !postIdentityExpert.masterBoq.readyForExperts) {
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

  // P6 Material E2E
  useEffect(() => {
    if (!p6MaterialOn) {
      setMaterial(null);
      return;
    }
    if (knrDownstreamDeferred) {
      setMaterial(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !postIdentityExpert.masterBoq.readyForExperts) {
      setMaterial(null);
      return;
    }
    if (p5LaborOn && laborSettledRef.current !== true) return;
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
    p5LaborOn,
    p6MaterialOn,
    p6ResearchOn,
    laborSettleTick,
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
        const built = buildIkG3FinalBidRecord({
          tenderPipelineId,
          ocdsId: expectedOcds ?? liveItem.tenderId ?? null,
          netPln,
          vatPln,
          grossPln,
          vatRate,
          p7RecommendedNetPln,
          caseLabel,
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
    ],
  );

  return useMemo(
    () => ({
      effectiveItem,
      pkg,
      ingest,
      bridgeBusy,
      labor,
      material,
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
    }),
    [
      effectiveItem,
      pkg,
      ingest,
      bridgeBusy,
      labor,
      material,
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
    ],
  );
}

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
import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
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
  buildKl3KnowledgeKey,
  buildLaborAttemptKey,
  buildMaterialAttemptKey,
  executeKl3KnowledgeLookup,
  executeP2IngestBridge,
  executeP5LaborExpert,
  executeP6MaterialExpert,
  needsIkNg02Ingest,
} from "./ik-orchestra-runtime";
import { resolveEffectiveItem } from "./orchestra-ports";
import type { IkOrchestraHostInput, IkOrchestraSnapshot } from "./orchestra-types";

export function useIkOrchestra({
  item,
  onUpdate,
  pipelineIngest,
  athPreviewEnabled = true,
  chiefSession = null,
  historicalIndex = null,
  pricingCatalogRevision = 0,
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
  const p2Fingerprint = useMemo(
    () => buildP2IngestFingerprint(item),
    [
      item.id,
      item.tenderId,
      item.bzpDocuments?.length,
      item.documentsFetchedAt,
      needsP2Ingest,
    ],
  );

  const laborAttemptedRef = useRef<string | null>(null);
  const materialAttemptedRef = useRef<string | null>(null);
  const laborSettledRef = useRef(false);
  const [laborSettleTick, setLaborSettleTick] = useState(0);
  const [knrKnowledge, setKnrKnowledge] = useState<KnrKnowledgeEnvelope | null>(null);
  const [knowledgeBusy, setKnowledgeBusy] = useState(false);
  const knowledgeAttemptedRef = useRef<string | null>(null);

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
    if (!needsIkNg02Ingest(snapItem)) return;
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
          if (!needsIkNg02Ingest(itemRef.current)) return;
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
    ],
  );

  const {
    report,
    knr,
    postIdentityExpert,
    identityContext,
    classification,
    identityCoverage,
  } = fullSnapshot;

  const workCatalogStore = useMemo(() => loadWorkCatalogStoreLocal(), [pkgEpoch]);

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

  // KL-3 HOST — lookup-only knowledge side-channel (async · does not block P3/P5/P6).
  useEffect(() => {
    if (!report.masterBoq.readyForExperts) {
      setKnrKnowledge(null);
      setKnowledgeBusy(false);
      knowledgeAttemptedRef.current = null;
      return;
    }
    const tenderId = effectiveItem.id || effectiveItem.tenderId || "";
    if (!tenderId || knr.lines.length === 0) {
      setKnrKnowledge(null);
      setKnowledgeBusy(false);
      return;
    }
    const knowledgeKey = buildKl3KnowledgeKey(tenderId, knr);
    if (knowledgeAttemptedRef.current === knowledgeKey) return;

    knowledgeAttemptedRef.current = knowledgeKey;
    let cancelled = false;
    setKnowledgeBusy(true);
    void executeKl3KnowledgeLookup({
      tenderId,
      knr,
      isCancelled: () => cancelled,
      setKnrKnowledge,
      setKnowledgeBusy,
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveItem, knr, report.masterBoq.readyForExperts]);

  // P5 Labor E2E
  useEffect(() => {
    if (!p5LaborOn) {
      laborSettledRef.current = true;
      setLabor(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !postIdentityExpert.masterBoq.readyForExperts) {
      laborSettledRef.current = false;
      setLabor(null);
      return;
    }
    const laborKey = buildLaborAttemptKey(key, postIdentityExpert, p5ResearchOn);
    if (laborAttemptedRef.current === laborKey) return;
    laborSettledRef.current = false;
    laborAttemptedRef.current = laborKey;
    let cancelled = false;
    void executeP5LaborExpert({
      effectiveItem,
      pkg,
      expert: postIdentityExpert,
      p5ResearchOn,
      isCancelled: () => cancelled,
      setLabor,
      onSettled: () => {
        laborSettledRef.current = true;
        setLaborSettleTick((n) => n + 1);
      },
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveItem, pkg, postIdentityExpert, p5LaborOn, p5ResearchOn]);

  // P6 Material E2E
  useEffect(() => {
    if (!p6MaterialOn) {
      setMaterial(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !postIdentityExpert.masterBoq.readyForExperts) {
      setMaterial(null);
      return;
    }
    if (p5LaborOn && laborSettledRef.current !== true) return;
    const materialKey = buildMaterialAttemptKey(key, postIdentityExpert, p6ResearchOn);
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
  }, [effectiveItem, pkg, postIdentityExpert, p5LaborOn, p6MaterialOn, p6ResearchOn, laborSettleTick]);

  return {
    effectiveItem,
    pkg,
    ingest,
    bridgeBusy,
    labor,
    material,
    flags,
    ...fullSnapshot,
    identityPersistOutcome,
    packageBlockers,
    ownerActionQueue,
    identityCoverageOps,
    refreshF5AfterOwnerInput,
  };
}

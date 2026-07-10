import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderPipelineRuntime } from "@/lib/tender-pipeline/tender-pipeline-types";
import {
  autonomousRunStorageKey,
  buildAutonomousRunFingerprint,
  deriveAutonomousRunRequired,
  type AutonomousRunPersistedState,
} from "@/lib/tender-autonomous-run-fingerprint";
import {
  deriveAutonomousEtaSeconds,
  deriveAutonomousRunPhase,
} from "@/lib/tender-autonomous-run-phase";
import {
  AUTONOMOUS_RUN_MIN_DISPLAY_MS,
  formatAutonomousEtaSeconds,
} from "@/lib/tender-autonomous-run-ux";
import {
  TenderAutonomousRunScreen,
  type TenderAutonomousRunScreenMode,
} from "@/app/tenders/autonomous/TenderAutonomousRunScreen";

const COMPLETE_HOLD_MS = 850;

type GatePhase = "workspace" | "running" | "complete_hold" | "outcome";

function loadPersistedAutonomousRun(tenderId: string): AutonomousRunPersistedState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(autonomousRunStorageKey(tenderId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutonomousRunPersistedState;
    if (typeof parsed.fingerprint !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function TenderAutonomousGate({
  item,
  pipelineRuntime,
  intelligenceCtx,
  pricingCatalogRevision,
  onBack,
  outcomeSlot,
  children,
}: {
  item: TenderPipelineItem;
  pipelineRuntime: TenderPipelineRuntime;
  intelligenceCtx: TenderIntelligenceContext | null;
  pricingCatalogRevision: number;
  onBack: () => void;
  /** NG-10-05 — ekran rekomendacji; gdy brak, most outcome_bridge. */
  outcomeSlot?: ReactNode;
  children: ReactNode;
}) {
  const persisted = useMemo(
    () => loadPersistedAutonomousRun(item.id),
    [item.id],
  );

  const fingerprint = useMemo(
    () => buildAutonomousRunFingerprint(
      item,
      pipelineRuntime.ownerFinanceProposal,
      pricingCatalogRevision,
    ),
    [item, pipelineRuntime.ownerFinanceProposal, pricingCatalogRevision],
  );

  const runRequired = useMemo(
    () => deriveAutonomousRunRequired({
      fingerprint,
      lastCompletedFingerprint: persisted?.fingerprint ?? null,
      pipelineState: pipelineRuntime.pipelineState,
      item,
    }),
    [fingerprint, persisted?.fingerprint, pipelineRuntime.pipelineState, item],
  );

  const [gatePhase, setGatePhase] = useState<GatePhase>(() =>
    runRequired ? "running" : "workspace",
  );
  const [runStartedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const [initialEtaSeconds, setInitialEtaSeconds] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const completeHoldStartedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (gatePhase === "workspace" && runRequired) {
      setGatePhase("running");
    }
  }, [gatePhase, runRequired]);

  useEffect(() => {
    if (gatePhase !== "running" && gatePhase !== "complete_hold") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [gatePhase]);

  const phaseInput = useMemo(() => ({
    item,
    pipelineState: pipelineRuntime.pipelineState,
    autoRunning: pipelineRuntime.autoRunning,
    dossierBuilding: pipelineRuntime.dossierBuilding,
    dossierSaving: pipelineRuntime.dossierSaving,
    dossierParseFailed: pipelineRuntime.dossierParseFailed,
    ownerFinanceProposal: pipelineRuntime.ownerFinanceProposal,
    intelligenceCtx,
    trustAssessment: pipelineRuntime.trustAssessment,
    kosztorysProcessSession: pipelineRuntime.kosztorysProcessSession,
    executiveMainWorksCount: intelligenceCtx?.executive?.mainWorks.length,
    elapsedMs: Date.now() - runStartedAt,
  }), [
    item,
    pipelineRuntime,
    intelligenceCtx,
    runStartedAt,
    tick,
  ]);

  const phaseView = useMemo(
    () => deriveAutonomousRunPhase(phaseInput),
    [phaseInput],
  );

  const rowCount = item.tenderDossier?.kosztorys?.rowCount ?? 0;
  const etaSeconds = deriveAutonomousEtaSeconds({
    pipelineState: pipelineRuntime.pipelineState,
    elapsedMs: Date.now() - runStartedAt,
    rowCount,
    autoRunning: pipelineRuntime.autoRunning,
    dossierBuilding: pipelineRuntime.dossierBuilding,
  });

  useEffect(() => {
    if (gatePhase !== "running" || initialEtaSeconds != null) return;
    setInitialEtaSeconds(etaSeconds);
  }, [gatePhase, initialEtaSeconds, etaSeconds]);

  const etaExceeded = gatePhase === "running"
    && initialEtaSeconds != null
    && !phaseView.runComplete
    && (Date.now() - runStartedAt) > initialEtaSeconds * 1000 + 3000;

  const minDisplayElapsed = (Date.now() - runStartedAt) >= AUTONOMOUS_RUN_MIN_DISPLAY_MS;

  useEffect(() => {
    if (gatePhase !== "running") return;
    if (!phaseView.runComplete || !minDisplayElapsed) return;
    if (completeHoldStartedRef.current) return;
    completeHoldStartedRef.current = true;
    setGatePhase("complete_hold");
  }, [gatePhase, phaseView.runComplete, minDisplayElapsed, tick]);

  useEffect(() => {
    if (gatePhase !== "complete_hold") return;
    const id = window.setTimeout(() => {
      setGatePhase("outcome");
    }, COMPLETE_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [gatePhase]);

  const screenMode: TenderAutonomousRunScreenMode | null = useMemo(() => {
    if (gatePhase === "running") return "running";
    if (gatePhase === "complete_hold") return "complete_hold";
    if (gatePhase === "outcome" && !outcomeSlot) return "outcome_bridge";
    return null;
  }, [gatePhase, outcomeSlot]);

  const showAutonomousOverlay = gatePhase !== "workspace";
  const showRunScreen = screenMode != null;

  const handleBack = useCallback(() => {
    setGatePhase("workspace");
    onBack();
  }, [onBack]);

  if (!showAutonomousOverlay) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="hidden" aria-hidden data-tender-autonomous-gate-active>
        {children}
      </div>

      {showRunScreen && (
        <TenderAutonomousRunScreen
          tenderTitle={item.title ?? ""}
          mode={screenMode}
          activeLiveMessage={phaseView.activeLive?.message ?? null}
          achievements={phaseView.achievements}
          etaLabel={formatAutonomousEtaSeconds(etaSeconds)}
          etaExceeded={etaExceeded}
          reducedMotion={reducedMotion}
          onBack={handleBack}
        />
      )}

      {gatePhase === "outcome" && outcomeSlot}
    </>
  );
}

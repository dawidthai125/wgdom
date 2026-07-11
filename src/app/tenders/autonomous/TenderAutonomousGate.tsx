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
  deriveAutonomousGateExitReady,
  type AutonomousGateOutcomeMode,
} from "@/lib/tender-autonomous-run-gate-exit";
import {
  deriveAutonomousEtaSeconds,
  deriveAutonomousRunPhase,
} from "@/lib/tender-autonomous-run-phase";
import {
  AUTONOMOUS_RUN_MIN_DISPLAY_MS,
  formatAutonomousEtaSeconds,
} from "@/lib/tender-autonomous-run-ux";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import {
  TenderAutonomousRunScreen,
  type TenderAutonomousRunScreenMode,
} from "@/app/tenders/autonomous/TenderAutonomousRunScreen";
import { TenderAutonomousOutcomeScreen } from "@/app/tenders/autonomous/TenderAutonomousOutcomeScreen";

const COMPLETE_HOLD_MS = 850;
const REVEAL_MS = 500;

type GatePhase =
  | "workspace"
  | "running"
  | "complete_hold"
  | "partial_hold"
  | "outcome"
  | "revealing";

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

function savePersistedAutonomousRun(
  tenderId: string,
  state: AutonomousRunPersistedState,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(autonomousRunStorageKey(tenderId), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function TenderAutonomousGate({
  item,
  pipelineRuntime,
  intelligenceCtx,
  pricingCatalogRevision,
  onBack,
  onReveal,
  children,
}: {
  item: TenderPipelineItem;
  pipelineRuntime: TenderPipelineRuntime;
  intelligenceCtx: TenderIntelligenceContext | null;
  pricingCatalogRevision: number;
  onBack: () => void;
  /** Po Reveal (S2→S3): scroll top, opcjonalna nawigacja tab. */
  onReveal?: () => void;
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
  const [outcomeMode, setOutcomeMode] = useState<AutonomousGateOutcomeMode>("complete");
  const [timeoutExitFlag, setTimeoutExitFlag] = useState(false);
  const [discoveryPendingFlag, setDiscoveryPendingFlag] = useState(false);
  const [runStartedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const [initialEtaSeconds, setInitialEtaSeconds] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const gateExitStartedRef = useRef(false);
  /**
   * AC-18 / AC-11 — po wejściu do Workspace (Reveal) nie wracaj do S1 w tej sesji.
   * Pipeline i discovery mogą dokończyć pracę; children (Workspace) dostają aktualizacje.
   */
  const sessionWorkspaceUnlockedRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (sessionWorkspaceUnlockedRef.current) return;
    if (gatePhase === "workspace" && runRequired) {
      setGatePhase("running");
    }
  }, [gatePhase, runRequired]);

  useEffect(() => {
    if (gatePhase !== "running" && gatePhase !== "complete_hold" && gatePhase !== "partial_hold") {
      return;
    }
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

  const elapsedMs = Date.now() - runStartedAt;
  const rowCount = item.tenderDossier?.kosztorys?.rowCount ?? 0;
  const etaSeconds = deriveAutonomousEtaSeconds({
    pipelineState: pipelineRuntime.pipelineState,
    elapsedMs,
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
    && elapsedMs > initialEtaSeconds * 1000 + 3000;

  const minDisplayElapsed = elapsedMs >= AUTONOMOUS_RUN_MIN_DISPLAY_MS;

  const gateExit = useMemo(
    () => deriveAutonomousGateExitReady({
      input: phaseInput,
      elapsedMs,
      minDisplayElapsed,
    }),
    [phaseInput, elapsedMs, minDisplayElapsed],
  );

  useEffect(() => {
    if (gatePhase !== "running") return;
    if (!gateExit.ready || gateExit.outcomeMode == null) return;
    if (gateExitStartedRef.current) return;
    gateExitStartedRef.current = true;
    setOutcomeMode(gateExit.outcomeMode);
    const isTimeout = gateExit.partialReason === "timeout";
    setTimeoutExitFlag(isTimeout);
    setDiscoveryPendingFlag(isTimeout && !isDocumentDiscoverySettled(item));
    setGatePhase(gateExit.outcomeMode === "partial" ? "partial_hold" : "complete_hold");
  }, [gatePhase, gateExit.ready, gateExit.outcomeMode, gateExit.partialReason, item, tick]);

  useEffect(() => {
    if (gatePhase !== "complete_hold" && gatePhase !== "partial_hold") return;
    const id = window.setTimeout(() => {
      setGatePhase("outcome");
    }, COMPLETE_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [gatePhase]);

  useEffect(() => {
    if (gatePhase !== "revealing") return;
    const ms = reducedMotion ? 0 : REVEAL_MS;
    const id = window.setTimeout(() => {
      sessionWorkspaceUnlockedRef.current = true;
      setGatePhase("workspace");
      onRevealRef.current?.();
    }, ms);
    return () => window.clearTimeout(id);
  }, [gatePhase, reducedMotion]);

  const handleOutcomeCta = useCallback(() => {
    sessionWorkspaceUnlockedRef.current = true;
    savePersistedAutonomousRun(item.id, {
      fingerprint,
      completedAt: new Date().toISOString(),
      outcomeDecision: intelligenceCtx?.overlay.displayDecision ?? null,
    });
    setGatePhase("revealing");
  }, [item.id, fingerprint, intelligenceCtx?.overlay.displayDecision]);

  const screenMode: TenderAutonomousRunScreenMode | null = useMemo(() => {
    if (gatePhase === "running") return "running";
    if (gatePhase === "complete_hold") return "complete_hold";
    if (gatePhase === "partial_hold") return "partial_hold";
    if (gatePhase === "outcome" && !intelligenceCtx) return "outcome_bridge";
    return null;
  }, [gatePhase, intelligenceCtx]);

  const showRunScreen = screenMode != null;
  const showOutcomeOverlay = gatePhase === "outcome" || gatePhase === "revealing";
  const workspaceMounted = gatePhase === "revealing";
  const gateBlocksWorkspace = gatePhase !== "workspace" && gatePhase !== "revealing";

  const handleBack = useCallback(() => {
    setGatePhase("workspace");
    onBack();
  }, [onBack]);

  if (sessionWorkspaceUnlockedRef.current || gatePhase === "workspace") {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={
          gateBlocksWorkspace
            ? "hidden"
            : workspaceMounted
              ? `ng10-workspace-reveal-root${reducedMotion ? "" : " ng10-workspace-reveal-enter"}`
              : undefined
        }
        aria-hidden={gateBlocksWorkspace}
        data-tender-autonomous-gate-active={gateBlocksWorkspace ? "" : undefined}
      >
        {workspaceMounted && (
          <style>{`
            @keyframes ng10-workspace-reveal-in {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .ng10-workspace-reveal-enter {
              animation: ng10-workspace-reveal-in 300ms ease-out forwards;
            }
            @media (prefers-reduced-motion: reduce) {
              .ng10-workspace-reveal-enter { animation: none; }
            }
          `}</style>
        )}
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

      {showOutcomeOverlay && intelligenceCtx && (
        <TenderAutonomousOutcomeScreen
          intelligenceCtx={intelligenceCtx}
          ownerFinanceWarnings={pipelineRuntime.ownerFinanceProposal?.warnings}
          tenderTitle={item.title ?? ""}
          reducedMotion={reducedMotion}
          exiting={gatePhase === "revealing"}
          outcomeMode={outcomeMode}
          timeoutExit={timeoutExitFlag}
          discoveryPending={discoveryPendingFlag}
          onCta={handleOutcomeCta}
        />
      )}
    </>
  );
}

export { savePersistedAutonomousRun, loadPersistedAutonomousRun, type GatePhase };

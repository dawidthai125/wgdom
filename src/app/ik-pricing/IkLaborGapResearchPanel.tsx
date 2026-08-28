/**
 * IK-E2E-WIRE-01 W2 — Hub panel: F5 shadow → labor gaps → research → Owner Accept.
 * F5 remains pure (read-only costing call) · research is orchestration only.
 */

import { useCallback, useMemo, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { buildOfferBoqDocumentForPipelineItem } from "@/lib/tender-offer-boq-explainability";
import { computeShadowPositionCostsForOfferBoq } from "@/lib/tender-position-cost";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import {
  inventoryIkGapsFromShadow,
  type IkLaborGapJob,
} from "@/lib/ik-pricing-orchestrator";
import {
  acceptIkLaborResearchAndNotifyIdempotent,
  buildIkLaborExpertRecommendation,
  runIkLaborGapResearch,
} from "@/lib/ik-pricing-orchestrator/labor-research-bridge";
import type { HubPricingAcceptedMeta } from "@/lib/intelligent-estimator/orchestra/orchestra-refresh-phase";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { WgButton } from "@/app/ui";
import { IkLaborCandidateReviewCard } from "@/app/ik-pricing/IkLaborCandidateReviewCard";

export type IkLaborGapResearchPanelProps = {
  item: TenderPipelineItem;
  /**
   * W5 CONNECT — after persist SUCCESS.
   * Prefer parent that routes to Orchestra.refreshPhase (labor_accept).
   * LEGACY: notifyIkPricingAccepted dual bump only.
   */
  onPriceResearchAccepted?: (meta?: HubPricingAcceptedMeta) => void;
};

type StatusMsg = { kind: "info" | "error"; text: string };

export function IkLaborGapResearchPanel({
  item,
  onPriceResearchAccepted,
}: IkLaborGapResearchPanelProps) {
  const tendersCtx = useTendersContextOptional();
  const [laborJobs, setLaborJobs] = useState<IkLaborGapJob[]>([]);
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusMsg | null>(null);
  const [candidate, setCandidate] = useState<WorkRateResearchCandidate | null>(null);
  const [activeJob, setActiveJob] = useState<IkLaborGapJob | null>(null);

  const recommendation = useMemo(
    () => (candidate ? buildIkLaborExpertRecommendation(candidate) : null),
    [candidate],
  );

  const scanGaps = useCallback(() => {
    setStatus(null);
    setCandidate(null);
    setActiveJob(null);
    const doc = buildOfferBoqDocumentForPipelineItem({ item });
    if (!doc) {
      setLaborJobs([]);
      setScanned(true);
      setStatus({ kind: "error", text: "Brak OfferBoq — nie można zbudować shadow F5." });
      return;
    }
    const store = loadWorkCatalogStoreLocal();
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc,
      store,
      nowMs: Date.now(),
      paintCoats: 2,
      ensureOwnerQuestions: false,
    });
    const inv = inventoryIkGapsFromShadow({
      shadow,
      tenderId: item.id,
    });
    setLaborJobs(inv.laborJobs);
    setScanned(true);
    setStatus({
      kind: "info",
      text:
        inv.laborJobs.length === 0
          ? "Brak luk BRAK_STAWKI_ROBOT (identity OK)."
          : `Znaleziono ${inv.laborJobs.length} luk robocizny do researchu.`,
    });
  }, [item]);

  const researchJob = useCallback(async (job: IkLaborGapJob) => {
    setBusy(true);
    setStatus(null);
    setCandidate(null);
    setActiveJob(job);
    try {
      const store = loadWorkCatalogStoreLocal();
      const result = await runIkLaborGapResearch({ job, store });
      if (result.status === "REUSE") {
        setStatus({
          kind: "info",
          text: `CURRENT → REUSE (${result.ourRatePln} PLN) — bez research HTTP.`,
        });
        setActiveJob(null);
        return;
      }
      if (result.status === "COOLDOWN") {
        setStatus({ kind: "info", text: result.messagePl });
        return;
      }
      if (result.status === "BLOCKED") {
        setStatus({ kind: "error", text: "Research zablokowany (legal gate)." });
        return;
      }
      if (result.status === "SKIPPED_SESSION_BUSY") {
        setStatus({ kind: "info", text: result.messagePl });
        return;
      }
      if (result.status === "CANDIDATE") {
        setCandidate(result.candidate);
        setStatus({
          kind: "info",
          text: `Kandydat gotowy (HTTP ${result.httpFetchCount}). Owner Accept wymagany.`,
        });
        return;
      }
      setStatus({
        kind: "error",
        text: result.messagePl || "Brak wyniku researchu — pozycja pozostaje GAP.",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const handleAccept = useCallback(async () => {
    if (!candidate) return;
    setBusy(true);
    setStatus(null);
    try {
      const store = loadWorkCatalogStoreLocal();
      const useParentDual = typeof onPriceResearchAccepted === "function";

      // W5 — REUSE idempotent Accept (same seam as ownerGate.g2LaborAccept).
      const result = await acceptIkLaborResearchAndNotifyIdempotent({
        store,
        candidate,
        notify: useParentDual
          ? {
              // Parent / Orchestra.refreshPhase performs dual bump — stubs here.
              bumpPricingCatalogRevision: () => {},
              bumpChiefRefresh: () => {},
            }
          : {
              bumpPricingCatalogRevision: () => {
                tendersCtx?.bumpPricingCatalogRevision();
              },
              bumpChiefRefresh: () => {},
            },
      });

      if (!result.ok) {
        setStatus({
          kind: "error",
          text: `Accept/persist FAIL (${result.reason}) — ZERO bump.`,
        });
        return;
      }

      if (result.skippedDuplicate) {
        setStatus({
          kind: "info",
          text: "Accept IDEMPOTENT_NOOP — bez ponownego bump/refresh.",
        });
        setCandidate(null);
        setActiveJob(null);
        scanGaps();
        return;
      }

      if (useParentDual) {
        // W5 CONNECT — Hub labor Accept → Orchestra.refreshPhase(labor_accept)
        // (parent maps to refreshPhase when Bridge live; else LEGACY notify).
        onPriceResearchAccepted({ phase: "labor_accept" });
      }

      setCandidate(null);
      setActiveJob(null);
      setStatus({
        kind: "info",
        text: "OUR RATE zapisana (Owner Accept) · Orchestra refresh seam.",
      });
      scanGaps();
    } finally {
      setBusy(false);
    }
  }, [candidate, onPriceResearchAccepted, tendersCtx, scanGaps]);

  const handleReject = useCallback(() => {
    setCandidate(null);
    setActiveJob(null);
    setStatus({ kind: "info", text: "Candidate REJECT — bez zapisu." });
  }, []);

  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-3 space-y-2"
      data-ik-labor-gap-research-panel
    >
      <p className={TEUX_SECTION_TITLE}>Uzupełnij braki robocizny (IK W2)</p>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
        F5 wykrywa BRAK_STAWKI_ROBOT → research rynkowy → Owner Accept → Work Catalog →
        recompute. Materiały = W3 (później).
      </p>
      <WgButton
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={scanGaps}
        data-ik-labor-scan-gaps
      >
        Skanuj luki OUR RATE
      </WgButton>

      {status && (
        <p
          className={`${TEUX_FONT_CAPTION} ${
            status.kind === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
          data-ik-labor-status
        >
          {status.text}
        </p>
      )}

      {scanned && laborJobs.length > 0 && !candidate && (
        <ul className="space-y-2" data-ik-labor-gap-list>
          {laborJobs.map((job) => (
            <li
              key={job.dedupeKey}
              className="rounded-md border border-border/60 bg-background/50 p-2 space-y-1"
              data-ik-labor-gap-row
            >
              <p className={TEUX_FONT_BODY}>
                LP {job.lp} · {job.namePl}
              </p>
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                {job.workId} · {job.unit}
              </p>
              <WgButton
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void researchJob(job)}
                data-ik-labor-research-one
              >
                {busy && activeJob?.dedupeKey === job.dedupeKey
                  ? "Research…"
                  : "Research stawki"}
              </WgButton>
            </li>
          ))}
        </ul>
      )}

      {candidate && (
        <IkLaborCandidateReviewCard
          candidate={candidate}
          recommendation={recommendation}
          busy={busy}
          onAccept={() => void handleAccept()}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

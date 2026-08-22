/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2 UI — Owner Review / Proposal Queue (Hub).
 * ONE batch call per tender load · ZERO WC/A1/mapping/pricing write · ZERO HTTP.
 */

import { useCallback, useMemo, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { runIkKnrExpert } from "@/lib/intelligent-estimator/ik-knr-expert";
import type {
  KnrWcIdentityProposal,
  KnrWcOwnerDecision,
  KnrWcSimilarWork,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-types";
import { isKnrWcIdentityBridgeP2UiRuntimeEnabled } from "@/lib/intelligent-estimator/knr-wc-identity-bridge-feature";
import {
  buildDescriptionByLineIdFromDocumentExpertLines,
  buildUnitByLineIdFromDocumentExpertLines,
  extractKnrWcBridgeKeysFromKnrExpert,
  runKnrWcIdentityProposalQueueBatch,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-queue";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import { isIkEntryEnabled } from "@/lib/intelligent-estimator/ik-entry-flag";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { WgButton } from "@/app/ui";
import { IkKnrWcIdentityProposalReviewCard } from "@/app/ik-pricing/IkKnrWcIdentityProposalReviewCard";

export type IkKnrWcIdentityProposalQueuePanelProps = {
  item: TenderPipelineItem;
};

type OwnerStagingRow = {
  decision: KnrWcOwnerDecision;
  selectedWorkId: string | null;
};

type StatusMsg = { kind: "info" | "error"; text: string };

export function IkKnrWcIdentityProposalQueuePanel({
  item,
}: IkKnrWcIdentityProposalQueuePanelProps) {
  const runtimeEnabled = useMemo(
    () =>
      isKnrWcIdentityBridgeP2UiRuntimeEnabled({
        ikEntryEnabled: isIkEntryEnabled(),
      }),
    [],
  );

  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<StatusMsg | null>(null);
  const [proposals, setProposals] = useState<KnrWcIdentityProposal[]>([]);
  const [cacheSummary, setCacheSummary] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [stagingByKey, setStagingByKey] = useState<Record<string, OwnerStagingRow>>({});

  const activeProposal = useMemo(
    () => proposals.find((p) => p.normalizedKey === activeKey) ?? null,
    [proposals, activeKey],
  );

  const activeStaging = activeKey
    ? stagingByKey[activeKey] ?? { decision: "unset" as const, selectedWorkId: null }
    : { decision: "unset" as const, selectedWorkId: null };

  const loadQueue = useCallback(() => {
    if (!runtimeEnabled) return;
    setBusy(true);
    setStatus(null);
    setActiveKey(null);
    try {
      const tenderId = item.id || item.tenderId || "";
      const docExpert = runIkDocumentExpert({
        item,
        package: getTenderPackage(tenderId),
      });
      const unitByLineId = buildUnitByLineIdFromDocumentExpertLines(
        docExpert.masterBoqLines?.map((r) => ({
          lineId: r.line.lineId,
          unit: r.line.unit,
        })) ?? [],
      );
      const descriptionByLineId = buildDescriptionByLineIdFromDocumentExpertLines(
        docExpert.masterBoqLines?.map((r) => ({
          lineId: r.line.lineId,
          description: r.line.description,
        })) ?? [],
      );
      const knrReport = runIkKnrExpert({
        tenderId,
        documentExpert: docExpert,
        historicalIndex: null,
      });

      if (knrReport.status === "BLOCKED") {
        setProposals([]);
        setLoaded(true);
        setStatus({
          kind: "error",
          text: `KNR Expert BLOCKED: ${knrReport.reasons.join(", ") || "brak gotowości BOQ"}`,
        });
        return;
      }

      const keys = extractKnrWcBridgeKeysFromKnrExpert(knrReport, {
        unitByLineId,
        descriptionByLineId,
      });
      if (keys.length === 0) {
        setProposals([]);
        setLoaded(true);
        setStatus({
          kind: "info",
          text: "Brak linii CANDIDATE w raporcie KNR Expert — kolejka pusta.",
        });
        return;
      }

      const batch = runKnrWcIdentityProposalQueueBatch({
        tenderId,
        keys,
        ikEntryEnabled: true,
        p2UiEnabled: true,
        featureEnabled: true,
        persistEnabled: true,
        p22HardeningEnabled: true,
      });

      setProposals(batch.proposals);
      setLoaded(true);
      const m = batch.cacheMetrics;
      setCacheSummary(
        `keys=${m.uniqueKeys} hits=${m.cacheHits} miss=${m.cacheMisses} built=${m.proposalsBuilt} discovery=${m.discoveryCalls} remoteLoads=${m.remoteStoreLoads} supabaseQueries=${m.supabaseQueries}`,
      );
      setStatus({
        kind: "info",
        text: `Załadowano ${batch.proposals.length} propozycji (batch · jeden call).`,
      });
    } catch (err) {
      setProposals([]);
      setLoaded(true);
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "Błąd ładowania kolejki.",
      });
    } finally {
      setBusy(false);
    }
  }, [item, runtimeEnabled]);

  const setOwnerDecision = useCallback(
    (normalizedKey: string, decision: KnrWcOwnerDecision) => {
      setStagingByKey((prev) => ({
        ...prev,
        [normalizedKey]: {
          decision,
          selectedWorkId:
            decision === "REUSE_EXISTING"
              ? (prev[normalizedKey]?.selectedWorkId ?? null)
              : null,
        },
      }));
    },
    [],
  );

  const selectSimilarWork = useCallback(
    (normalizedKey: string, work: KnrWcSimilarWork) => {
      setStagingByKey((prev) => ({
        ...prev,
        [normalizedKey]: {
          decision: "REUSE_EXISTING",
          selectedWorkId: work.workId,
        },
      }));
    },
    [],
  );

  if (!runtimeEnabled) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-3 space-y-2"
      data-ik-knr-wc-proposal-queue-panel
    >
      <p className={TEUX_SECTION_TITLE}>KNR → WC Identity — kolejka Owner Review (P2 UI)</p>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
        Propozycje z cache bridge (evidence/assist). Decyzja Ownera = staging only · bez zapisu
        CatalogWork / mapowania.
      </p>
      <WgButton
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={loadQueue}
        data-ik-knr-wc-load-queue
      >
        {busy ? "Ładowanie…" : "Załaduj kolejkę propozycji"}
      </WgButton>

      {status ? (
        <p
          className={`${TEUX_FONT_CAPTION} ${
            status.kind === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
          data-ik-knr-wc-queue-status
        >
          {status.text}
        </p>
      ) : null}

      {cacheSummary ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-ik-knr-wc-cache-metrics>
          {cacheSummary}
        </p>
      ) : null}

      {loaded && proposals.length > 0 && !activeProposal ? (
        <ul className="space-y-2" data-ik-knr-wc-proposal-list>
          {proposals.map((p) => {
            const staged = stagingByKey[p.normalizedKey];
            return (
              <li
                key={p.proposalId}
                className="rounded-md border border-border/60 bg-background/50 p-2 space-y-1"
                data-ik-knr-wc-proposal-row
                data-normalized-key={p.normalizedKey}
              >
                <p className={TEUX_FONT_BODY}>
                  {p.displayCode} · {p.tableCode}
                </p>
                <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                  {p.normalizedKey} · sug.: {p.recommendation}
                  {p.staleEvidence ? " · stale" : ""}
                  {p.unitStatus === "HOLD_UNIT" ? " · HOLD_UNIT" : ""}
                </p>
                {p.duplicateRisk === "HIGH" ? (
                  <p
                    className={`${TEUX_FONT_CAPTION} font-semibold text-destructive`}
                    data-ik-knr-wc-duplicate-high-badge
                  >
                    duplicateRisk HIGH — advisory · wymaga jawnej decyzji Ownera
                  </p>
                ) : null}
                {staged && staged.decision !== "unset" ? (
                  <p className={`${TEUX_FONT_CAPTION} text-violet-800 dark:text-violet-200`}>
                    Owner: {staged.decision}
                    {staged.selectedWorkId ? ` → ${staged.selectedWorkId}` : ""}
                  </p>
                ) : null}
                <WgButton
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveKey(p.normalizedKey)}
                  data-ik-knr-wc-open-review
                >
                  Review
                </WgButton>
              </li>
            );
          })}
        </ul>
      ) : null}

      {activeProposal ? (
        <IkKnrWcIdentityProposalReviewCard
          proposal={activeProposal}
          ownerDecision={activeStaging.decision}
          selectedWorkId={activeStaging.selectedWorkId}
          onOwnerDecision={(d) => setOwnerDecision(activeProposal.normalizedKey, d)}
          onSelectSimilarWork={(w) => selectSimilarWork(activeProposal.normalizedKey, w)}
          onClose={() => setActiveKey(null)}
        />
      ) : null}
    </div>
  );
}

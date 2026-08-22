/**
 * IK-KNR-WC-IDENTITY-BRIDGE P3 — Owner-gated CatalogWork CREATE executor.
 * NEW host seam · P2 UI files remain immutable · explicit Execute only.
 */

import { useCallback, useMemo, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { runIkKnrExpert } from "@/lib/intelligent-estimator/ik-knr-expert";
import type {
  KnrWcIdentityProposal,
  KnrWcOwnerDecision,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-types";
import { isKnrWcIdentityBridgeP3CreateRuntimeEnabled } from "@/lib/intelligent-estimator/knr-wc-identity-bridge-feature";
import {
  buildDescriptionByLineIdFromDocumentExpertLines,
  buildUnitByLineIdFromDocumentExpertLines,
  extractKnrWcBridgeKeysFromKnrExpert,
  runKnrWcIdentityProposalQueueBatch,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-queue";
import {
  executeKnrWcCatalogWorkCreate,
  isKnrWcCreateBlockedByProposal,
  suggestCatalogWorkIdFromProposal,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-create";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import { isIkEntryEnabled } from "@/lib/intelligent-estimator/ik-entry-flag";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { WgButton } from "@/app/ui";

export type IkKnrWcIdentityCreateExecutorProps = {
  item: TenderPipelineItem;
  proposal?: KnrWcIdentityProposal | null;
  ownerDecision?: KnrWcOwnerDecision;
  selectedWorkId?: string | null;
};

type ExecuteStatus =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "ok"; workId: string; message: string }
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

export function IkKnrWcIdentityCreateExecutor({
  item,
  proposal: proposalProp = null,
  ownerDecision: ownerDecisionProp = "unset",
  selectedWorkId: _selectedWorkId = null,
}: IkKnrWcIdentityCreateExecutorProps) {
  void _selectedWorkId;

  const runtimeEnabled = useMemo(
    () =>
      isKnrWcIdentityBridgeP3CreateRuntimeEnabled({
        ikEntryEnabled: isIkEntryEnabled(),
      }),
    [],
  );

  const [proposals, setProposals] = useState<KnrWcIdentityProposal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [ownerDecision, setOwnerDecision] = useState<KnrWcOwnerDecision>(
    ownerDecisionProp,
  );
  const [workIdDraft, setWorkIdDraft] = useState("");
  const [confirmDuplicateHigh, setConfirmDuplicateHigh] = useState(false);
  const [confirmStaleEvidence, setConfirmStaleEvidence] = useState(false);
  const [status, setStatus] = useState<ExecuteStatus>({ kind: "idle" });

  const activeProposal = useMemo(() => {
    if (proposalProp) return proposalProp;
    return proposals.find((p) => p.normalizedKey === selectedKey) ?? null;
  }, [proposalProp, proposals, selectedKey]);

  const effectiveDecision = proposalProp ? ownerDecisionProp : ownerDecision;

  const loadProposals = useCallback(() => {
    if (!runtimeEnabled) return;
    setStatus({ kind: "idle" });
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
        return;
      }
      const keys = extractKnrWcBridgeKeysFromKnrExpert(knrReport, {
        unitByLineId,
        descriptionByLineId,
      });
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
      if (!proposalProp && batch.proposals.length > 0 && !selectedKey) {
        const first = batch.proposals.find((p) => !isKnrWcCreateBlockedByProposal(p));
        if (first) {
          setSelectedKey(first.normalizedKey);
          setWorkIdDraft(suggestCatalogWorkIdFromProposal(first));
        }
      }
    } catch (err) {
      setProposals([]);
      setLoaded(true);
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Błąd ładowania propozycji.",
      });
    }
  }, [item, proposalProp, runtimeEnabled, selectedKey]);

  const onSelectProposal = useCallback(
    (key: string) => {
      setSelectedKey(key);
      const p = proposals.find((row) => row.normalizedKey === key);
      if (p) {
        setWorkIdDraft(suggestCatalogWorkIdFromProposal(p));
        setConfirmDuplicateHigh(false);
        setConfirmStaleEvidence(false);
      }
    },
    [proposals],
  );

  const onExecute = useCallback(async () => {
    if (!activeProposal) return;
    setStatus({ kind: "busy" });
    try {
      const store = loadWorkCatalogStoreLocal();
      const result = await executeKnrWcCatalogWorkCreate({
        proposal: activeProposal,
        ownerDecision: effectiveDecision,
        workId: workIdDraft.trim(),
        store,
        runtimeP3Enabled: runtimeEnabled,
        confirmDuplicateHigh,
        confirmStaleEvidence,
      });

      if (!result.ok) {
        setStatus({ kind: "error", message: result.message });
        return;
      }

      if (!result.saved) {
        setStatus({
          kind: "blocked",
          message: `Zapis zablokowany: ${result.blocked}`,
        });
        return;
      }

      setStatus({
        kind: "ok",
        workId: result.workId,
        message: `CatalogWork utworzony: ${result.workId} (catalogWorksCreated=${result.catalogWorksCreated})`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Błąd CREATE.",
      });
    }
  }, [
    activeProposal,
    confirmDuplicateHigh,
    confirmStaleEvidence,
    effectiveDecision,
    runtimeEnabled,
    workIdDraft,
  ]);

  if (!runtimeEnabled) {
    return null;
  }

  const createBlocked = activeProposal
    ? isKnrWcCreateBlockedByProposal(activeProposal)
    : true;
  const needsDuplicateConfirm = activeProposal?.duplicateRisk === "HIGH";
  const needsStaleConfirm = activeProposal?.staleEvidence === true;
  const canExecute =
    activeProposal
    && effectiveDecision === "CREATE_NEW"
    && !createBlocked
    && workIdDraft.trim().length > 0
    && (!needsDuplicateConfirm || confirmDuplicateHigh)
    && (!needsStaleConfirm || confirmStaleEvidence)
    && status.kind !== "busy";

  return (
    <div
      className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-3 space-y-3"
      data-ik-knr-wc-create-executor
    >
      <p className={TEUX_SECTION_TITLE}>KNR → WC Identity — CREATE (P3)</p>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
        Jawny zapis CatalogWork przez Ownera · saveWorkCatalogRouted only · bez A1/map/pricing/HTTP.
      </p>

      {!proposalProp && !loaded ? (
        <WgButton
          type="button"
          variant="secondary"
          onClick={loadProposals}
          data-ik-knr-wc-create-load
        >
          Załaduj propozycje do CREATE
        </WgButton>
      ) : null}

      {!proposalProp && loaded && proposals.length > 0 ? (
        <label className={`flex flex-col gap-1 ${TEUX_FONT_BODY}`}>
          <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Propozycja</span>
          <select
            className="h-9 rounded-md border border-border bg-background px-2"
            value={selectedKey}
            onChange={(e) => onSelectProposal(e.target.value)}
            data-ik-knr-wc-create-select
          >
            <option value="">— wybierz —</option>
            {proposals.map((p) => (
              <option key={p.proposalId} value={p.normalizedKey}>
                {p.displayCode} · {p.tableCode} · {p.recommendation}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!proposalProp ? (
        <div className="flex flex-wrap gap-2">
          <WgButton
            type="button"
            variant={ownerDecision === "CREATE_NEW" ? "primary" : "secondary"}
            onClick={() => setOwnerDecision("CREATE_NEW")}
            data-ik-knr-wc-create-decision
          >
            ownerDecision = CREATE_NEW
          </WgButton>
        </div>
      ) : (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-ik-knr-wc-create-decision-readonly>
          ownerDecision: {effectiveDecision}
        </p>
      )}

      {activeProposal ? (
        <>
          {createBlocked ? (
            <p
              className={`${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-100`}
              data-ik-knr-wc-create-blocked
            >
              CREATE zablokowany (HOLD_UNIT / 1305-01/02).
            </p>
          ) : null}

          {needsDuplicateConfirm ? (
            <label className={`flex items-center gap-2 ${TEUX_FONT_CAPTION}`}>
              <input
                type="checkbox"
                checked={confirmDuplicateHigh}
                onChange={(e) => setConfirmDuplicateHigh(e.target.checked)}
                data-ik-knr-wc-create-confirm-duplicate
              />
              Potwierdzam CREATE mimo duplicateRisk=HIGH (advisory)
            </label>
          ) : null}

          {needsStaleConfirm ? (
            <label className={`flex items-center gap-2 ${TEUX_FONT_CAPTION}`}>
              <input
                type="checkbox"
                checked={confirmStaleEvidence}
                onChange={(e) => setConfirmStaleEvidence(e.target.checked)}
                data-ik-knr-wc-create-confirm-stale
              />
              Potwierdzam CREATE mimo staleEvidence (advisory)
            </label>
          ) : null}

          <label className={`flex flex-col gap-1 ${TEUX_FONT_BODY}`}>
            <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>workId (CatalogWork)</span>
            <input
              type="text"
              className="h-9 rounded-md border border-border bg-background px-2 font-mono text-sm"
              value={workIdDraft}
              onChange={(e) => setWorkIdDraft(e.target.value)}
              data-ik-knr-wc-create-work-id
            />
          </label>

          <WgButton
            type="button"
            variant="primary"
            disabled={!canExecute}
            onClick={() => void onExecute()}
            data-ik-knr-wc-create-execute
          >
            {status.kind === "busy" ? "Zapis…" : "Wykonaj CREATE (Owner)"}
          </WgButton>
        </>
      ) : null}

      {status.kind === "ok" ? (
        <p className={`${TEUX_FONT_CAPTION} text-emerald-800 dark:text-emerald-200`} data-ik-knr-wc-create-result>
          {status.message}
        </p>
      ) : null}
      {status.kind === "blocked" || status.kind === "error" ? (
        <p className={`${TEUX_FONT_CAPTION} text-destructive`} data-ik-knr-wc-create-error>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

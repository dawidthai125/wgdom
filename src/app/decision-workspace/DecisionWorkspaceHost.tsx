/**
 * DECISION-WORKSPACE-01 + DECISION-PERSIST-01 —
 * Session → Validation cache → VM → Surface · persist wire (Host only).
 * TM-01 S6 — Persist-first · legacy projection via setOwnerDecision.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAccess } from "@/app/admin-access";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import {
  buildValidationSnapshot,
  hydrateDecision,
  recordDecision,
} from "@/lib/decision-persist";
import { mapPersistActionToLegacyOwnerDecision } from "@/lib/decision-persist-legacy-bridge";
import {
  buildDecisionWorkspaceViewModel,
  clearValidationCache,
  dropValidationCacheForCase,
  resolveValidationForDossier,
  type DecydentActionId,
  type DecydentLocalDecision,
} from "@/lib/decision-workspace-ui";
import {
  isDecisionWorkspaceStackEnabled,
} from "@/lib/tender-expert-effective";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { DecisionWorkspaceSurface } from "./DecisionWorkspaceSurface";

export function DecisionWorkspaceHost({
  session,
  tenderId = "",
  scoringBundle = null,
}: {
  session: ChiefSessionOutput;
  /** DECISION-PERSIST-01 — prop drill from Hub (item.id). */
  tenderId?: string;
  /** TM-01 S6 — REUSE intelligenceCtx.scoringBundle (no re-score). */
  scoringBundle?: TenderScoringBundle | null;
}) {
  const { session: adminSession } = useAdminAccess();
  const { ownerDecisions } = useTendersContext();
  const setOwnerDecision = ownerDecisions.setOwnerDecision;
  /** P0 — DW stack := isDecisionWorkspaceEnabled via isDecisionWorkspaceStackEnabled (coupled to D Session); ignores module access. */
  const flagEnabled = isDecisionWorkspaceStackEnabled();
  const [localDecision, setLocalDecision] = useState<DecydentLocalDecision | null>(
    null,
  );
  const [selectedScenarioStrategy, setSelectedScenarioStrategy] = useState<
    string | null
  >(null);
  const [toastPl, setToastPl] = useState<string | null>(null);

  const caseId = session.caseId;
  const dossierFinishedAt = session.dossier?.finishedAt ?? "";

  useEffect(() => {
    setSelectedScenarioStrategy(null);
    setToastPl(null);
    if (
      flagEnabled &&
      tenderId &&
      caseId &&
      dossierFinishedAt
    ) {
      setLocalDecision(
        hydrateDecision(tenderId, caseId, dossierFinishedAt),
      );
    } else {
      setLocalDecision(null);
    }
    return () => {
      if (caseId) dropValidationCacheForCase(caseId);
      else clearValidationCache();
    };
  }, [caseId, dossierFinishedAt, tenderId, flagEnabled]);

  const { validation, validationFailed } = useMemo(() => {
    if (!flagEnabled) {
      return { validation: null, validationFailed: false };
    }
    return resolveValidationForDossier(session.dossier);
  }, [flagEnabled, session.dossier]);

  const vm = useMemo(() => {
    return buildDecisionWorkspaceViewModel({
      session,
      validation,
      localDecision,
      flagEnabled,
      selectedScenarioStrategy,
      validationFailed,
    });
  }, [
    session,
    validation,
    localDecision,
    flagEnabled,
    selectedScenarioStrategy,
    validationFailed,
  ]);

  const onAction = useCallback(
    (action: DecydentActionId) => {
      if (action === "return") {
        setLocalDecision(null);
        setSelectedScenarioStrategy(null);
        setToastPl("Powrót do przeglądu przebiegu");
        const el = document.getElementById("chief-dossier-surface");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const id = session.caseId ?? session.dossier?.caseId ?? "";
      const finishedAt = session.dossier?.finishedAt ?? "";
      const scenario =
        action === "approve" ? selectedScenarioStrategy : null;
      const next: DecydentLocalDecision = {
        action,
        scenarioStrategy: scenario,
        decidedAt: new Date().toISOString(),
        caseId: id,
      };

      const snapshot = buildValidationSnapshot(validation);
      const actor = {
        userId: adminSession?.id?.trim() || "unknown",
        ...(adminSession?.displayName?.trim()
          ? { displayName: adminSession.displayName.trim() }
          : {}),
      };

      // TM-01 S6 — Persist FIRST · ZERO legacy mirror on Persist fail
      let persisted = false;
      if (tenderId && id && finishedAt && snapshot) {
        const recorded = recordDecision({
          tenderId,
          caseId: id,
          action,
          scenario,
          actor,
          dossierFinishedAt: finishedAt,
          validationSnapshot: snapshot,
        });
        if (recorded) {
          persisted = true;
          setLocalDecision({
            action: recorded.action,
            scenarioStrategy: recorded.scenario,
            decidedAt: recorded.createdAt,
            caseId: recorded.caseId,
          });
        }
      }

      if (!persisted) {
        setLocalDecision(next);
        setToastPl(
          tenderId && id && finishedAt
            ? "Nie udało się zapisać lokalnie (limit pamięci?) — decyzja tylko w sesji"
            : "Decyzja lokalna (brak danych do zapisu) — tylko w sesji",
        );
        return;
      }

      const persistOkLabel =
        action === "approve"
          ? "Decyzja zapisana lokalnie: zatwierdzono"
          : action === "reject"
            ? "Decyzja zapisana lokalnie: odrzucono"
            : "Decyzja zapisana lokalnie: do przeglądu";

      // Missing / mismatched scoringBundle → Persist SUCCESS · legacy SKIP
      if (!scoringBundle) {
        setToastPl(`${persistOkLabel} · lejek niedostępny (brak scoringu)`);
        return;
      }
      if (scoringBundle.item.id !== tenderId) {
        setToastPl(`${persistOkLabel} · lejek pominięty (rozjazd id)`);
        return;
      }

      const mapped = mapPersistActionToLegacyOwnerDecision(action);
      if (mapped == null) {
        setToastPl(`${persistOkLabel} · lejek pominięty`);
        return;
      }

      try {
        setOwnerDecision(scoringBundle, mapped);
        setToastPl(`${persistOkLabel} · lejek zaktualizowany`);
      } catch {
        setToastPl(`${persistOkLabel} · lejek nie zapisany (błąd projekcji)`);
      }
    },
    [
      session.caseId,
      session.dossier?.caseId,
      session.dossier?.finishedAt,
      selectedScenarioStrategy,
      validation,
      adminSession?.id,
      adminSession?.displayName,
      tenderId,
      scoringBundle,
      setOwnerDecision,
    ],
  );

  if (!flagEnabled || vm.uiPhase === "hidden" || vm.uiPhase === "no_dossier") {
    return null;
  }

  return (
    <div className="space-y-2" data-decision-workspace-host data-s2-dw-primary="1">
      <DecisionWorkspaceSurface
        vm={vm}
        selectedScenarioStrategy={selectedScenarioStrategy}
        onSelectScenario={setSelectedScenarioStrategy}
        onAction={onAction}
      />
      {toastPl && (
        <p
          className="text-[11px] text-muted-foreground px-1"
          data-decision-toast
          role="status"
        >
          {toastPl}
        </p>
      )}
    </div>
  );
}

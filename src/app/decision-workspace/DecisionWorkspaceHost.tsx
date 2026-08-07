/**
 * DECISION-WORKSPACE-01 + DECISION-PERSIST-01 —
 * Session → Validation cache → VM → Surface · persist wire (Host only).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAccess } from "@/app/admin-access";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import {
  buildValidationSnapshot,
  hydrateDecision,
  recordDecision,
} from "@/lib/decision-persist";
import {
  buildDecisionWorkspaceViewModel,
  clearValidationCache,
  dropValidationCacheForCase,
  isDecisionWorkspaceEnabled,
  resolveValidationForDossier,
  type DecydentActionId,
  type DecydentLocalDecision,
} from "@/lib/decision-workspace-ui";
import { DecisionWorkspaceSurface } from "./DecisionWorkspaceSurface";

export function DecisionWorkspaceHost({
  session,
  tenderId = "",
}: {
  session: ChiefSessionOutput;
  /** DECISION-PERSIST-01 — prop drill from Hub (item.id). */
  tenderId?: string;
}) {
  const flagEnabled = isDecisionWorkspaceEnabled();
  const { session: adminSession } = useAdminAccess();
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

      setToastPl(
        action === "approve"
          ? "Decyzja zapisana lokalnie: zatwierdzono"
          : action === "reject"
            ? "Decyzja zapisana lokalnie: odrzucono"
            : "Decyzja zapisana lokalnie: do przeglądu",
      );
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
    ],
  );

  if (!flagEnabled || vm.uiPhase === "hidden") return null;

  return (
    <div className="space-y-2" data-decision-workspace-host>
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

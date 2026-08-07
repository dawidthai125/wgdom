/**
 * DECISION-WORKSPACE-01 — Host: Session → Validation cache → VM → Surface.
 * localDecision in-memory only · zero persist · zero Session/Chief BC.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChiefSessionOutput } from "@/lib/chief-session";
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
}: {
  session: ChiefSessionOutput;
}) {
  const flagEnabled = isDecisionWorkspaceEnabled();
  const [localDecision, setLocalDecision] = useState<DecydentLocalDecision | null>(
    null,
  );
  const [selectedScenarioStrategy, setSelectedScenarioStrategy] = useState<
    string | null
  >(null);
  const [toastPl, setToastPl] = useState<string | null>(null);

  const caseId = session.caseId;

  useEffect(() => {
    setLocalDecision(null);
    setSelectedScenarioStrategy(null);
    setToastPl(null);
    return () => {
      if (caseId) dropValidationCacheForCase(caseId);
      else clearValidationCache();
    };
  }, [caseId]);

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
      const next: DecydentLocalDecision = {
        action,
        scenarioStrategy:
          action === "approve" ? selectedScenarioStrategy : null,
        decidedAt: new Date().toISOString(),
        caseId: id,
      };
      setLocalDecision(next);
      setToastPl(
        action === "approve"
          ? "Decyzja lokalna: zatwierdzono (bez zapisu)"
          : action === "reject"
            ? "Decyzja lokalna: odrzucono (bez zapisu)"
            : "Decyzja lokalna: do przeglądu (bez zapisu)",
      );
    },
    [session.caseId, session.dossier?.caseId, selectedScenarioStrategy],
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

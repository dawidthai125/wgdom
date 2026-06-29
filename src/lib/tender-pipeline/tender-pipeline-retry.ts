/**
 * NG-02.1B — SSOT retry scopes pipeline (discovery / heavy / full).
 */

import { clearDossierInflightForItem } from "@/app/hooks/useTenderDossierHeavyLazy";
import {
  resetDiscoveryPhaseForItem,
  resetPipelineBootstrapForItem,
} from "@/app/hooks/useTenderDocumentsBootstrap";

export type PipelineRetryScope = "heavy" | "discovery" | "full";

export function retryTenderPipelinePhase(itemId: string, scope: PipelineRetryScope): void {
  clearDossierInflightForItem(itemId);
  if (scope === "heavy") return;
  resetDiscoveryPhaseForItem(itemId);
  if (scope === "discovery") return;
  resetPipelineBootstrapForItem(itemId);
}

/**
 * NG10-UX-02 — Dynamic Status (prezentacja only).
 * Nadpisuje wyłącznie warstwę copy — nie mutuje ACTIVITY_SPECS ani runtime.
 */

import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";
import type {
  AutonomousRunPhaseView,
  DeriveAutonomousRunPhaseInput,
} from "@/lib/tender-autonomous-run-phase";
import { AUTONOMOUS_FALLBACK_LIVE_MESSAGES } from "@/lib/tender-autonomous-run-ux";

export const AUTONOMOUS_STATUS_PROFITABILITY_NO_HEAVY =
  "Oceniam opłacalność na podstawie ogłoszenia — pełny kosztorys jest niedostępny.";

export const AUTONOMOUS_STATUS_PROFITABILITY_HEAVY =
  "Oceniam opłacalność — doprecyzowuję marżę z kosztorysu.";

export const AUTONOMOUS_STATUS_DISCOVERY_SLOW =
  "Nadal pobieram dokumenty z BZP — duże ogłoszenia wymagają więcej czasu.";

export const AUTONOMOUS_STATUS_ZERO_DOCS =
  "Brak załączników w ogłoszeniu — przechodzę do analizy wstępnej.";

export const AUTONOMOUS_STATUS_DOSSIER_PROCESSING =
  "Przetwarzam załączniki — to może potrwać przy dużych plikach PDF.";

export const AUTONOMOUS_STATUS_PRICING =
  "Wyliczam koszty na podstawie katalogu i pozycji kosztorysu.";

export const AUTONOMOUS_STATUS_PARTIAL_DATA =
  "Część danych jest niepełna — rekomendacja może być wstępna.";

const FALLBACK_AFTER_MS = 20_000;
const DISCOVERY_SLOW_AFTER_MS = 30_000;

function deriveFallbackStatusMessage(elapsedMs: number): string {
  const idx = Math.floor(elapsedMs / 10_000) % AUTONOMOUS_FALLBACK_LIVE_MESSAGES.length;
  return AUTONOMOUS_FALLBACK_LIVE_MESSAGES[idx]!;
}

function isFallbackLiveMessage(message: string): boolean {
  return (AUTONOMOUS_FALLBACK_LIVE_MESSAGES as readonly string[]).includes(
    message as (typeof AUTONOMOUS_FALLBACK_LIVE_MESSAGES)[number],
  );
}

/**
 * Kontekstowy komunikat S3 — priorytet P0→P4 (DF §5.1).
 * Zwraca null gdy brak kontekstu do wyświetlenia (happy path, wczesna faza).
 */
export function deriveAutonomousStatusMessage(
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
): string | null {
  if (phaseView.runComplete) return null;

  const elapsedMs = input.elapsedMs ?? 0;
  const marginPct = input.intelligenceCtx?.finance.marginPct ?? null;
  const heavyDone = tenderDossierHeavyParseDone(input.item.tenderDossier);

  if (phaseView.activePhaseId === "profitability" && marginPct == null) {
    return heavyDone
      ? AUTONOMOUS_STATUS_PROFITABILITY_HEAVY
      : AUTONOMOUS_STATUS_PROFITABILITY_NO_HEAVY;
  }

  if (!isDocumentDiscoverySettled(input.item) && elapsedMs > DISCOVERY_SLOW_AFTER_MS) {
    return AUTONOMOUS_STATUS_DISCOVERY_SLOW;
  }

  if (isDocumentDiscoverySettled(input.item) && countTenderAttachments(input.item) === 0) {
    return AUTONOMOUS_STATUS_ZERO_DOCS;
  }

  if (input.dossierBuilding || input.dossierSaving) {
    return AUTONOMOUS_STATUS_DOSSIER_PROCESSING;
  }

  if (input.pipelineState === PipelineState.Pricing) {
    return AUTONOMOUS_STATUS_PRICING;
  }

  if (
    input.trustAssessment?.overall === "partial"
    || input.intelligenceCtx?.overlay.confidence === "low"
  ) {
    return AUTONOMOUS_STATUS_PARTIAL_DATA;
  }

  if (elapsedMs > FALLBACK_AFTER_MS && phaseView.activeLive?.kind === "live") {
    const liveMsg = phaseView.activeLive.message;
    if (isFallbackLiveMessage(liveMsg)) {
      return liveMsg;
    }
  }

  return null;
}

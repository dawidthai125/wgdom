import { HelpCircle } from "lucide-react";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import type { HealthExplanation, ForecastHorizonExplanation } from "@/lib/tender-center-explain";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import {
  explainOpportunityScore,
  explainStrategicDecision,
} from "@/lib/tender-center-explain";
import { ExplainBullets, ExplainReasonList } from "@/app/tender-center/components/ExplainBullets";
import { DECISION_LABEL_PL } from "@/lib/tender-center-decision";
import { METRIC_LABEL_PL, OPPORTUNITY_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";

export function CommandCenterExplainability({
  health,
  healthExplanation,
  bestOpportunity,
  forecastHorizonExplanations,
}: {
  health: CompanyHealthResult;
  healthExplanation: HealthExplanation;
  bestOpportunity: TenderScoringBundle | null;
  forecastHorizonExplanations: ForecastHorizonExplanation[];
}) {
  const oppExplain = bestOpportunity
    ? explainOpportunityScore(bestOpportunity.opportunity)
    : null;
  const stratExplain = bestOpportunity
    ? explainStrategicDecision(bestOpportunity)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <HelpCircle size={14} className="text-primary" />
        <p className="text-[10px] uppercase tracking-wide font-medium">
          Wyjaśnienia systemu decyzyjnego
        </p>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold">{METRIC_LABEL_PL.healthIndex} — dlaczego {health.index}?</p>
        <p className="text-[10px] text-muted-foreground leading-snug">{healthExplanation.summary}</p>
        <ExplainBullets plus={healthExplanation.plus} minus={healthExplanation.minus} compact />
      </div>

      {bestOpportunity && oppExplain && (
        <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3 space-y-2">
          <p className="text-xs font-semibold">{OPPORTUNITY_LABEL_PL.score} — {bestOpportunity.item.title.slice(0, 48)}…</p>
          <ExplainBullets plus={oppExplain.plus} minus={oppExplain.minus} compact />
        </div>
      )}

      {bestOpportunity && stratExplain && (
        <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3 space-y-2">
          <p className="text-xs font-semibold">Decyzja strategiczna — {DECISION_LABEL_PL[bestOpportunity.decision]}</p>
          <p className="text-[10px] text-muted-foreground">{stratExplain.summary}</p>
          <ExplainReasonList reasons={stratExplain.reasons} title="Powody" />
        </div>
      )}

      {forecastHorizonExplanations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">Prognoza obłożenia — skąd wynik?</p>
          {forecastHorizonExplanations.map((ex) => (
            <div key={ex.horizon.days} className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
              <p className="text-xs font-semibold tabular-nums mb-1">
                {ex.horizon.days} dni: {ex.horizon.utilizationPct}%
              </p>
              <ExplainReasonList reasons={ex.reasons} title="Powód" />
              {ex.recommendation && (
                <p className="text-[10px] font-medium text-primary mt-1.5">{ex.recommendation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!bestOpportunity && (
        <p className="text-xs text-muted-foreground">Brak przetargu do wyjaśnienia scoringu.</p>
      )}
    </div>
  );
}

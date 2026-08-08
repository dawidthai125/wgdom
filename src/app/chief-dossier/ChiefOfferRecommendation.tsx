import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_FONT_MONO, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type {
  DecisionMakerSignalPayload,
  OfferPrimaryRecommendation,
  OfferScenario,
} from "@/lib/offer-expert";
import type { CostOfferHandoffPayload } from "@/lib/cost-expert";
import { formatPlnDisplay } from "./chiefDossierUiTokens";

function BreakdownRows({
  breakdown,
}: {
  breakdown: OfferPrimaryRecommendation["breakdown"];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
      <dt className="text-muted-foreground">Real Cost</dt>
      <dd className={`${TEUX_FONT_MONO} text-right`}>{formatPlnDisplay(breakdown.realCostPln)}</dd>
      <dt className="text-muted-foreground">Marża ({(breakdown.marginPct * 100).toFixed(1)}%)</dt>
      <dd className={`${TEUX_FONT_MONO} text-right`}>{formatPlnDisplay(breakdown.marginPln)}</dd>
      <dt className="text-muted-foreground">Ryzyko ({(breakdown.riskPct * 100).toFixed(1)}%)</dt>
      <dd className={`${TEUX_FONT_MONO} text-right`}>{formatPlnDisplay(breakdown.riskPln)}</dd>
      <dt className="text-muted-foreground font-semibold">Cena oferty</dt>
      <dd className={`${TEUX_FONT_MONO} text-right font-semibold`}>
        {formatPlnDisplay(breakdown.offerPricePln)}
      </dd>
    </dl>
  );
}

export function ChiefOfferRecommendation({
  primaryRecommendation,
  scenarios,
  decisionMakerPayload,
  offerHandoffPayload,
}: {
  primaryRecommendation: OfferPrimaryRecommendation;
  scenarios: OfferScenario[];
  decisionMakerPayload: DecisionMakerSignalPayload | null;
  offerHandoffPayload: CostOfferHandoffPayload | null;
}) {
  return (
    <section
      className="rounded-lg border border-border/60 bg-secondary/10 px-3 py-3 space-y-3"
      data-chief-offer-recommendation
      data-s4-pln-chrome="secondary"
    >
      <div>
        <p className={TEUX_SECTION_TITLE}>Rekomendacja Oferty</p>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
          Strategia: {primaryRecommendation.strategy} · kwota w Hub (primary)
        </p>
      </div>

      <p className={`text-base font-semibold tabular-nums ${TEUX_FONT_MONO}`}>
        {formatPlnDisplay(primaryRecommendation.offerPricePln)}
      </p>
      {primaryRecommendation.summaryPl && (
        <p className={TEUX_FONT_BODY}>{primaryRecommendation.summaryPl}</p>
      )}

      <BreakdownRows breakdown={primaryRecommendation.breakdown} />

      {scenarios.length > 0 && (
        <div className="space-y-2 border-t border-border/50 pt-2">
          <p className={TEUX_SECTION_TITLE}>Scenariusze</p>
          <ul className="space-y-2">
            {scenarios.map((s) => (
              <li
                key={s.strategy}
                className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2"
                data-chief-offer-scenario={s.strategy}
              >
                <p className={`${TEUX_FONT_CAPTION} font-semibold`}>
                  {s.labelPl} · {s.strategy}
                </p>
                <p className={`${TEUX_FONT_MONO} text-sm mt-0.5`}>
                  {formatPlnDisplay(s.breakdown.offerPricePln)}
                </p>
                <div className="mt-1.5">
                  <BreakdownRows breakdown={s.breakdown} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {decisionMakerPayload && (
        <div
          className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2 space-y-1"
          data-chief-decision-maker-payload
        >
          <p className={TEUX_SECTION_TITLE}>Sygnał Decydenta</p>
          <p className={TEUX_FONT_CAPTION}>
            Oferta:{" "}
            <span className={TEUX_FONT_MONO}>
              {formatPlnDisplay(decisionMakerPayload.offerPricePln)}
            </span>
            {" · "}Real:{" "}
            <span className={TEUX_FONT_MONO}>
              {formatPlnDisplay(decisionMakerPayload.realCostPln)}
            </span>
          </p>
          <p className={TEUX_FONT_CAPTION}>Pewność: {decisionMakerPayload.pewnosc}</p>
          {decisionMakerPayload.primarySummaryPl && (
            <p className={TEUX_FONT_BODY}>{decisionMakerPayload.primarySummaryPl}</p>
          )}
          {decisionMakerPayload.contractCo && (
            <p className={`${TEUX_FONT_BODY} text-muted-foreground`}>
              {decisionMakerPayload.contractCo}
            </p>
          )}
        </div>
      )}

      {offerHandoffPayload && (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground border-t border-border/50 pt-2`}>
          Real Cost (handoff):{" "}
          <span className={TEUX_FONT_MONO}>
            {formatPlnDisplay(offerHandoffPayload.realCostPln)}
          </span>
          {offerHandoffPayload.contractSummaryPl
            ? ` — ${offerHandoffPayload.contractSummaryPl}`
            : ""}
        </p>
      )}
    </section>
  );
}

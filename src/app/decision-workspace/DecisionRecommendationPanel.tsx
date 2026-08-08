import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_FONT_MONO, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { OfferPrimaryRecommendation, OfferScenario } from "@/lib/offer-expert";
import type { DecisionWorkspaceViewModel } from "@/lib/decision-workspace-ui";
import { OFFER_PLN_SOURCE_BADGE_PL } from "@/lib/decision-workspace-ui";
import { formatPlnDisplay } from "./formatPln";

function BreakdownRows({
  breakdown,
}: {
  breakdown: OfferPrimaryRecommendation["breakdown"];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
      <dt className="text-muted-foreground">Real Cost</dt>
      <dd className={`${TEUX_FONT_MONO} text-right`}>
        {formatPlnDisplay(breakdown.realCostPln)}
      </dd>
      <dt className="text-muted-foreground">
        Marża ({(breakdown.marginPct * 100).toFixed(1)}%)
      </dt>
      <dd className={`${TEUX_FONT_MONO} text-right`}>
        {formatPlnDisplay(breakdown.marginPln)}
      </dd>
      <dt className="text-muted-foreground">
        Ryzyko ({(breakdown.riskPct * 100).toFixed(1)}%)
      </dt>
      <dd className={`${TEUX_FONT_MONO} text-right`}>
        {formatPlnDisplay(breakdown.riskPln)}
      </dd>
      <dt className="text-muted-foreground font-semibold">Cena oferty</dt>
      <dd className={`${TEUX_FONT_MONO} text-right font-semibold`}>
        {formatPlnDisplay(breakdown.offerPricePln)}
      </dd>
    </dl>
  );
}

export function DecisionRecommendationPanel({
  vm,
  selectedScenarioStrategy,
  onSelectScenario,
}: {
  vm: DecisionWorkspaceViewModel;
  selectedScenarioStrategy: string | null;
  onSelectScenario: (strategy: string | null) => void;
}) {
  if (!vm.hasPrimary || !vm.primaryRecommendation) {
    if (
      vm.uiPhase === "ready_for_decision" ||
      vm.uiPhase === "decision_recorded" ||
      vm.uiPhase === "process_blocked"
    ) {
      return (
        <section
          className="rounded-lg border border-dashed border-border px-3 py-2"
          data-decision-recommendation-panel
        >
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
            Brak rekomendacji Oferty
          </p>
        </section>
      );
    }
    return null;
  }

  const primary = vm.primaryRecommendation;

  return (
    <section
      className="rounded-lg border border-border/60 bg-secondary/10 px-3 py-3 space-y-3"
      data-decision-recommendation-panel
      data-s4-step="rekomendacja"
      data-s4-pln-chrome="secondary"
    >
      <div>
        <p className={TEUX_SECTION_TITLE}>Rekomendacja Oferty</p>
        <p
          className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}
          data-s3-offer-source-badge
        >
          {OFFER_PLN_SOURCE_BADGE_PL}
        </p>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
          Strategia: {primary.strategy} · nie jest to Twoja decyzja · kwota primary w Hub
        </p>
      </div>

      <p
        className={`text-base font-semibold tabular-nums ${TEUX_FONT_MONO}`}
        data-s3-dw-primary-pln={String(primary.offerPricePln)}
      >
        {formatPlnDisplay(primary.offerPricePln)}
      </p>
      {primary.summaryPl && <p className={TEUX_FONT_BODY}>{primary.summaryPl}</p>}

      <BreakdownRows breakdown={primary.breakdown} />

      {vm.scenarios.length > 0 && (
        <div className="space-y-2 border-t border-border/50 pt-2">
          <p className={TEUX_SECTION_TITLE}>Scenariusze (wybór referencji)</p>
          <ul className="space-y-2">
            {vm.scenarios.map((s: OfferScenario) => {
              const selected = selectedScenarioStrategy === s.strategy;
              return (
                <li key={s.strategy}>
                  <label
                    className={`flex cursor-pointer gap-2 rounded-md border px-2.5 py-2 ${
                      selected
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/60 bg-background/50"
                    }`}
                    data-decision-offer-scenario={s.strategy}
                  >
                    <input
                      type="radio"
                      name="decision-scenario"
                      className="mt-1"
                      checked={selected}
                      onChange={() => onSelectScenario(s.strategy)}
                    />
                    <span className="flex-1 min-w-0">
                      <p className={`${TEUX_FONT_CAPTION} font-semibold`}>
                        {s.labelPl} · {s.strategy}
                      </p>
                      <p className={`${TEUX_FONT_MONO} text-sm mt-0.5`}>
                        {formatPlnDisplay(s.breakdown.offerPricePln)}
                      </p>
                      <div className="mt-1.5">
                        <BreakdownRows breakdown={s.breakdown} />
                      </div>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {selectedScenarioStrategy != null && (
            <button
              type="button"
              className={`${TEUX_FONT_CAPTION} text-muted-foreground underline`}
              onClick={() => onSelectScenario(null)}
            >
              Wyczyść wybór (Approve = primary)
            </button>
          )}
        </div>
      )}

      {vm.decisionMakerPayload && (
        <div
          className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2 space-y-1"
          data-decision-maker-payload
        >
          <p className={TEUX_SECTION_TITLE}>Sygnał Decydenta (RO)</p>
          <p className={TEUX_FONT_CAPTION}>
            Oferta:{" "}
            <span className={TEUX_FONT_MONO}>
              {formatPlnDisplay(vm.decisionMakerPayload.offerPricePln)}
            </span>
            {" · "}Real:{" "}
            <span className={TEUX_FONT_MONO}>
              {formatPlnDisplay(vm.decisionMakerPayload.realCostPln)}
            </span>
          </p>
          <p className={TEUX_FONT_CAPTION}>
            Pewność: {vm.decisionMakerPayload.pewnosc}
          </p>
        </div>
      )}

      {vm.offerHandoffPayload && (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground border-t border-border/50 pt-2`}>
          Real Cost (handoff):{" "}
          <span className={TEUX_FONT_MONO}>
            {formatPlnDisplay(vm.offerHandoffPayload.realCostPln)}
          </span>
        </p>
      )}
    </section>
  );
}

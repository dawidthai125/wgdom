import type { OfferDetailsView } from "@/lib/expert-workspace-ui";
import { EXPERT_PANEL_ORDER_LABELS_PL } from "@/lib/expert-workspace-ui";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { ExpertEmpty, ExpertField, ExpertPanelShell, ExpertSubTitle } from "./ExpertPanelShell";
import {
  EXPERT_SCROLL_CLASS,
  formatPctDisplay,
  formatPlnDisplay,
} from "./formatDisplay";

export function OfferDetailsPanel({ view }: { view: OfferDetailsView }) {
  return (
    <ExpertPanelShell role="offer" titlePl={EXPERT_PANEL_ORDER_LABELS_PL.offer}>
      {!view.hasResult ? (
        <ExpertEmpty label={view.emptyLabelPl} />
      ) : (
        <>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-expert-offer-decision-note>
            {view.decisionNotePl}
          </p>

          {view.primary ? (
            <>
              <ExpertSubTitle>Szczegóły Eksperta Oferty — primary</ExpertSubTitle>
              <ExpertField label="Strategia" value={view.primary.strategy} />
              <ExpertField
                label="Cena oferty"
                value={formatPlnDisplay(view.primary.offerPricePln)}
              />
              <ExpertField
                label="Real Cost"
                value={formatPlnDisplay(view.primary.realCostPln)}
              />
              <ExpertField
                label="Marża"
                value={`${formatPlnDisplay(view.primary.marginPln)} (${formatPctDisplay(view.primary.marginPct * 100)})`}
              />
              <ExpertField
                label="Ryzyko"
                value={`${formatPlnDisplay(view.primary.riskPln)} (${formatPctDisplay(view.primary.riskPct * 100)})`}
              />
              <ExpertField label="Summary" value={view.primary.summaryPl} />
            </>
          ) : (
            <ExpertEmpty label="Brak primary recommendation" />
          )}

          <ExpertSubTitle>Scenariusze</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-offer-scenarios>
            {view.scenarios.length === 0 ? (
              <ExpertEmpty label="Brak scenariuszy" />
            ) : (
              view.scenarios.map((s) => (
                <p key={s.strategy} className={TEUX_FONT_BODY}>
                  {s.labelPl} ({s.strategy}): {formatPlnDisplay(s.offerPricePln)} · Real{" "}
                  {formatPlnDisplay(s.realCostPln)}
                </p>
              ))
            )}
          </div>

          <ExpertField
            label="Sygnał do Decydenta"
            value={view.signalToDecisionMaker ? "tak" : "nie"}
          />
          {view.decisionMakerRows.map((r) => (
            <ExpertField
              key={r.labelPl}
              label={r.labelPl}
              value={
                r.labelPl.includes("Cena") || r.labelPl.includes("Real")
                  ? formatPlnDisplay(Number(r.valuePl))
                  : r.valuePl
              }
            />
          ))}
        </>
      )}
    </ExpertPanelShell>
  );
}

import type { PricingDetailsView } from "@/lib/expert-workspace-ui";
import { EXPERT_PANEL_ORDER_LABELS_PL } from "@/lib/expert-workspace-ui";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { ExpertEmpty, ExpertField, ExpertPanelShell, ExpertSubTitle } from "./ExpertPanelShell";
import {
  EXPERT_SCROLL_CLASS,
  formatNumDisplay,
  formatPctDisplay,
  formatPlnDisplay,
} from "./formatDisplay";

export function PricingDetailsPanel({ view }: { view: PricingDetailsView }) {
  return (
    <ExpertPanelShell role="pricing" titlePl={EXPERT_PANEL_ORDER_LABELS_PL.pricing}>
      {!view.hasResult ? (
        <ExpertEmpty label={view.emptyLabelPl} />
      ) : (
        <>
          <ExpertField
            label="Requires reanalysis"
            value={view.requiresReanalysis ? "tak" : "nie"}
          />
          <ExpertField
            label="Return to Material Expert"
            value={view.returnToMaterialExpert ? "tak" : "nie"}
          />
          {view.returnReasonsPl.length > 0 && (
            <ul className={`${TEUX_FONT_BODY} list-disc pl-4 space-y-0.5`}>
              {view.returnReasonsPl.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {view.reanalysisMaterialKeys.length > 0 && (
            <ExpertField
              label="Reanalysis keys"
              value={view.reanalysisMaterialKeys.join(", ")}
            />
          )}

          <ExpertSubTitle>Linie rynku</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-pricing-lines>
            {view.lines.length === 0 ? (
              <ExpertEmpty label="Brak pozycji" />
            ) : (
              view.lines.map((l) => (
                <div
                  key={`${l.materialKey}-${l.namePl}`}
                  className="border-b border-border/30 pb-1.5 mb-1.5 last:border-0"
                >
                  <p className={TEUX_FONT_BODY}>
                    {l.materialKey} · {l.namePl} · {formatNumDisplay(l.quantity)} {l.unit}
                  </p>
                  <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                    Market: {formatPlnDisplay(l.marketPricePln)} · {l.freshness} · trend{" "}
                    {l.trend}
                    {l.trendDeltaPct != null
                      ? ` (${formatPctDisplay(l.trendDeltaPct)})`
                      : ""}{" "}
                    · risk {l.priceRisk}
                    {l.spreadPct != null ? ` · spread ${formatPctDisplay(l.spreadPct)}` : ""}
                  </p>
                  {l.sources.length > 0 && (
                    <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                      Źródła:{" "}
                      {l.sources
                        .map(
                          (s) =>
                            `${s.origin}/${s.regionCode} ${formatPlnDisplay(s.pricePln)}`,
                        )
                        .join("; ")}
                    </p>
                  )}
                  {l.returnReasonPl ? (
                    <p className={`${TEUX_FONT_CAPTION}`}>{l.returnReasonPl}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </ExpertPanelShell>
  );
}

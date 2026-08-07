import type { CostDetailsView } from "@/lib/expert-workspace-ui";
import { EXPERT_PANEL_ORDER_LABELS_PL } from "@/lib/expert-workspace-ui";
import { TEUX_FONT_BODY } from "@/lib/tender-ux-tokens";
import { ExpertEmpty, ExpertField, ExpertPanelShell, ExpertSubTitle } from "./ExpertPanelShell";
import { EXPERT_SCROLL_CLASS, formatNumDisplay, formatPlnDisplay } from "./formatDisplay";

function formatMaybePln(raw: string): string {
  if (raw === "—") return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  // passthrough display: values ending with % stay; others as PLN when look like money labels
  return formatPlnDisplay(n);
}

export function CostDetailsPanel({ view }: { view: CostDetailsView }) {
  return (
    <ExpertPanelShell role="cost" titlePl={EXPERT_PANEL_ORDER_LABELS_PL.cost}>
      {!view.hasResult ? (
        <ExpertEmpty label={view.emptyLabelPl} />
      ) : (
        <>
          <ExpertField label="Completeness OK" value={view.completenessOk ? "tak" : "nie"} />
          <ExpertField
            label="Handoff to Offer"
            value={view.handoffToOfferExpert ? "tak" : "nie"}
          />
          {view.handoffBlockersPl.length > 0 && (
            <ul className={`${TEUX_FONT_BODY} list-disc pl-4 space-y-0.5`}>
              {view.handoffBlockersPl.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          <ExpertSubTitle>Breakdown (Real Cost)</ExpertSubTitle>
          {view.breakdown.map((r) => (
            <ExpertField
              key={r.labelPl}
              label={r.labelPl}
              value={
                r.labelPl.includes("%")
                  ? r.valuePl === "—"
                    ? "—"
                    : `${r.valuePl}%`
                  : formatMaybePln(r.valuePl)
              }
            />
          ))}

          <ExpertSubTitle>Comparative</ExpertSubTitle>
          {view.comparative.map((r) => (
            <ExpertField
              key={r.labelPl}
              label={r.labelPl}
              value={
                r.labelPl.includes("%")
                  ? r.valuePl === "—"
                    ? "—"
                    : `${r.valuePl}%`
                  : formatMaybePln(r.valuePl)
              }
            />
          ))}
          {view.comparativeNotesPl.map((n) => (
            <p key={n} className={TEUX_FONT_BODY}>
              {n}
            </p>
          ))}

          <ExpertSubTitle>Linie materiałów</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-cost-materials>
            {view.materialLines.map((l) => (
              <p key={`${l.materialKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                {l.materialKey} · {l.namePl} · {formatNumDisplay(l.quantity)} {l.unit} ·
                purchase {formatPlnDisplay(l.purchaseTotalPln)} · market{" "}
                {formatPlnDisplay(l.marketTotalPln)}
              </p>
            ))}
          </div>

          <ExpertSubTitle>Linie robocizny</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-cost-labour>
            {view.labourLines.map((l) => (
              <p key={`${l.labourKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                {l.labourKey} · {l.namePl} · {formatNumDisplay(l.hours)} h ·{" "}
                {formatPlnDisplay(l.totalPln)}
              </p>
            ))}
          </div>

          <ExpertSubTitle>Linie sprzętu</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-cost-equipment>
            {view.equipmentLines.map((l) => (
              <p key={`${l.equipmentKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                {l.equipmentKey} · {l.namePl} · {formatNumDisplay(l.quantity)} {l.unit} ·{" "}
                {formatPlnDisplay(l.totalPln)}
              </p>
            ))}
          </div>

          {view.handoffPayloadRows.length > 0 && (
            <>
              <ExpertSubTitle>Handoff payload</ExpertSubTitle>
              {view.handoffPayloadRows.map((r) => (
                <ExpertField
                  key={r.labelPl}
                  label={r.labelPl}
                  value={
                    r.labelPl.includes("Cost") || r.labelPl.includes("PLN")
                      ? formatMaybePln(r.valuePl)
                      : r.valuePl
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </ExpertPanelShell>
  );
}

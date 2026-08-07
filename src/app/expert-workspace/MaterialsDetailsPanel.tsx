import type { MaterialsDetailsView } from "@/lib/expert-workspace-ui";
import { EXPERT_PANEL_ORDER_LABELS_PL } from "@/lib/expert-workspace-ui";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { ExpertEmpty, ExpertField, ExpertPanelShell, ExpertSubTitle } from "./ExpertPanelShell";
import { EXPERT_SCROLL_CLASS, formatNumDisplay } from "./formatDisplay";

export function MaterialsDetailsPanel({ view }: { view: MaterialsDetailsView }) {
  return (
    <ExpertPanelShell role="materials" titlePl={EXPERT_PANEL_ORDER_LABELS_PL.materials}>
      {!view.hasResult ? (
        <ExpertEmpty label={view.emptyLabelPl} />
      ) : (
        <>
          <ExpertField label="Kompletność" value={view.completeness} />
          <ExpertField label="Nota" value={view.completenessNotePl} />
          {view.packMaterialCoverage && (
            <ExpertField
              label="Pokrycie pack materials"
              value={`req ${view.packMaterialCoverage.required} · present ${view.packMaterialCoverage.present} · conforming ${view.packMaterialCoverage.conforming}`}
            />
          )}

          <ExpertSubTitle>Linie</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-materials-lines>
            {view.lines.length === 0 ? (
              <ExpertEmpty label="Brak pozycji" />
            ) : (
              view.lines.map((l) => (
                <p key={`${l.materialKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                  {l.materialKey} · {l.namePl} · {formatNumDisplay(l.quantity)} {l.unit} ·{" "}
                  {l.conformity}
                  {l.notePl ? ` — ${l.notePl}` : ""}
                </p>
              ))
            )}
          </div>

          {view.variants.length > 0 && (
            <>
              <ExpertSubTitle>Warianty</ExpertSubTitle>
              <div className={EXPERT_SCROLL_CLASS} data-expert-materials-variants>
                {view.variants.map((v) => (
                  <div key={v.baseMaterialKey} className="space-y-0.5">
                    <p className={`${TEUX_FONT_CAPTION} font-semibold`}>
                      {v.baseNamePl} ({v.baseMaterialKey})
                    </p>
                    {v.options.map((o) => (
                      <p
                        key={`${o.kind}-${o.materialKey}`}
                        className={`${TEUX_FONT_BODY} pl-2`}
                      >
                        [{o.kind}] {o.namePl} — {o.rationalePl}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {view.gaps.length > 0 && (
            <>
              <ExpertSubTitle>Gaps / ryzyka</ExpertSubTitle>
              <ul className={`${TEUX_FONT_BODY} list-disc pl-4 space-y-0.5`}>
                {view.gaps.map((g) => (
                  <li key={`${g.code}-${g.messagePl}`}>
                    [{g.kind}] {g.messagePl || g.code}
                    {g.relatedPl ? ` (${g.relatedPl})` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </ExpertPanelShell>
  );
}

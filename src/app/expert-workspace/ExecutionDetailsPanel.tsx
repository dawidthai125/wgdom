import type { ExecutionDetailsView } from "@/lib/expert-workspace-ui";
import {
  EMPTY_BOM_LINES_PL,
  EMPTY_BOM_PL,
  EMPTY_BUNDLE_PL,
  EMPTY_PLAN_PL,
} from "@/lib/expert-workspace-ui/labels";
import { EXPERT_PANEL_ORDER_LABELS_PL } from "@/lib/expert-workspace-ui";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { ExpertEmpty, ExpertField, ExpertPanelShell, ExpertSubTitle } from "./ExpertPanelShell";
import { EXPERT_SCROLL_CLASS, formatNumDisplay } from "./formatDisplay";

export function ExecutionDetailsPanel({ view }: { view: ExecutionDetailsView }) {
  return (
    <ExpertPanelShell role="execution" titlePl={EXPERT_PANEL_ORDER_LABELS_PL.execution}>
      {!view.hasResult ? (
        <ExpertEmpty label={view.emptyLabelPl} />
      ) : (
        <>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{view.traceCaptionPl}</p>

          {view.selection && (
            <>
              <ExpertSubTitle>Pack selection</ExpertSubTitle>
              <ExpertField label="Pack" value={`${view.selection.namePl} (${view.selection.packId}@${view.selection.packVersion})`} />
              <ExpertField label="Score" value={formatNumDisplay(view.selection.score)} />
              {view.selection.matchReasonsPl.length > 0 && (
                <ul className={`${TEUX_FONT_BODY} list-disc pl-4 space-y-0.5`}>
                  {view.selection.matchReasonsPl.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              {view.selection.matchedLineIds.length > 0 && (
                <ExpertField
                  label="Matched lines"
                  value={view.selection.matchedLineIds.join(", ")}
                />
              )}
            </>
          )}

          <ExpertField label="Technology decision" value={view.technologyDecision} />

          {view.packRef && (
            <ExpertField
              label="Pack ref"
              value={`${view.packRef.namePl} (${view.packRef.packId}@${view.packRef.packVersion})`}
            />
          )}

          <ExpertSubTitle>Plan</ExpertSubTitle>
          {!view.plan ? (
            <ExpertEmpty label={EMPTY_PLAN_PL} />
          ) : (
            <>
              <ExpertField
                label="Plan"
                value={`${view.plan.planId} · rev ${view.plan.planRevision}`}
              />
              <div className={EXPERT_SCROLL_CLASS} data-expert-plan-scroll>
                {view.plan.stages.map((st) => (
                  <div key={`${st.order}-${st.namePl}`} className="space-y-0.5">
                    <p className={`${TEUX_FONT_CAPTION} font-semibold`}>
                      {st.order}. {st.namePl}
                    </p>
                    {st.steps.map((s) => (
                      <p
                        key={`${s.order}-${s.catalogWorkId}`}
                        className={`${TEUX_FONT_BODY} pl-2 text-foreground/90`}
                      >
                        {s.order}. {s.namePl} · {s.catalogWorkId} · qty{" "}
                        {formatNumDisplay(s.quantity)}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          <ExpertSubTitle>Bundle</ExpertSubTitle>
          {!view.bundle ? (
            <ExpertEmpty label={EMPTY_BUNDLE_PL} />
          ) : (
            <>
              <ExpertField label="Bundle" value={`${view.bundle.namePl} (${view.bundle.bundleId})`} />
              <div className={EXPERT_SCROLL_CLASS} data-expert-bundle-scroll>
                {view.bundle.steps.map((s) => (
                  <p key={s.stepId || `${s.order}-${s.workId}`} className={TEUX_FONT_BODY}>
                    {s.order}. {s.workId}
                    {s.quantityDefault != null
                      ? ` · qty ${formatNumDisplay(s.quantityDefault)}`
                      : ""}
                    {s.notePl ? ` — ${s.notePl}` : ""}
                  </p>
                ))}
              </div>
            </>
          )}

          <ExpertSubTitle>BOM</ExpertSubTitle>
          {!view.bom ? (
            <ExpertEmpty label={EMPTY_BOM_PL} />
          ) : (
            <>
              <ExpertField
                label="BOM"
                value={`${view.bom.bomId} · ${view.bom.packId}@${view.bom.packVersion} · rev ${view.bom.planRevision}`}
              />
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Materials</p>
              <div className={EXPERT_SCROLL_CLASS} data-expert-bom-materials>
                {view.bom.materials.length === 0 ? (
                  <ExpertEmpty label={EMPTY_BOM_LINES_PL} />
                ) : (
                  view.bom.materials.map((m) => (
                    <p key={`${m.materialKey}-${m.namePl}`} className={TEUX_FONT_BODY}>
                      {m.materialKey} · {m.namePl} · {formatNumDisplay(m.quantity)} {m.unit}
                    </p>
                  ))
                )}
              </div>
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Equipment</p>
              <div className={EXPERT_SCROLL_CLASS} data-expert-bom-equipment>
                {view.bom.equipment.length === 0 ? (
                  <ExpertEmpty label={EMPTY_BOM_LINES_PL} />
                ) : (
                  view.bom.equipment.map((e) => (
                    <p key={`${e.equipmentKey}-${e.namePl}`} className={TEUX_FONT_BODY}>
                      {e.equipmentKey} · {e.namePl} · {formatNumDisplay(e.quantity)} {e.unit}
                    </p>
                  ))
                )}
              </div>
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Labour</p>
              <div className={EXPERT_SCROLL_CLASS} data-expert-bom-labour>
                {view.bom.labour.length === 0 ? (
                  <ExpertEmpty label={EMPTY_BOM_LINES_PL} />
                ) : (
                  view.bom.labour.map((l) => (
                    <p key={`${l.labourKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                      {l.labourKey} · {l.namePl} · {formatNumDisplay(l.hours)} h
                    </p>
                  ))
                )}
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

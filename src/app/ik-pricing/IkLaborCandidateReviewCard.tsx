/**
 * IK-E2E-WIRE-01 W2 + IK-LABOR-EXPERT-REC-01 — Owner Accept card.
 * Expert recommendation is informational only · ZERO auto-Accept.
 */

import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import { WORK_RATE_AUTHORIZED_SOURCES } from "@/lib/work-catalog/work-rate-legal";
import { WORK_RATE_REGION_SCOPE_LABELS_PL } from "@/lib/work-catalog/work-rate-types";
import type { LaborRateExpertRecommendation } from "@/lib/ik-pricing-orchestrator";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { WgButton } from "@/app/ui";

export type IkLaborCandidateReviewCardProps = {
  candidate: WorkRateResearchCandidate;
  /** Full RO expert rec (preferred). */
  recommendation?: LaborRateExpertRecommendation | null;
  /** Compat: plain PL summary when recommendation object absent. */
  recommendationPl?: string;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
};

function sourceLabel(sourceId: string): string {
  return WORK_RATE_AUTHORIZED_SOURCES.find((s) => s.id === sourceId)?.namePl ?? sourceId;
}

const STANCE_PL: Record<string, string> = {
  RECOMMEND_ACCEPT: "ACCEPT (rekomendacja)",
  RECOMMEND_CAUTION: "OSTROŻNIE",
  RECOMMEND_REJECT: "ODRZUĆ (rekomendacja)",
  NO_RECOMMENDATION: "BRAK REKOMENDACJI",
};

export function IkLaborCandidateReviewCard({
  candidate,
  recommendation,
  recommendationPl,
  busy = false,
  onAccept,
  onReject,
}: IkLaborCandidateReviewCardProps) {
  const pack = recommendation?.evidence ?? null;
  const regionScope = pack?.requestedRegionScope ?? candidate.regionScope;
  const regionLabel =
    WORK_RATE_REGION_SCOPE_LABELS_PL[regionScope] ?? regionScope;
  const sources = [
    ...new Set(
      (pack?.observations ?? candidate.observations).map((o) =>
        sourceLabel(o.sourceId),
      ),
    ),
  ].join(", ");
  const ratePln = recommendation?.candidateRatePln ?? candidate.suggestedRatePln;
  const sampleSize = pack?.sampleSize ?? candidate.sampleSize;
  const regionalSample = pack?.regionalSampleCount ?? sampleSize;
  const lowSample = pack?.lowSample ?? candidate.lowSample;
  const prev = pack?.previousOurRatePln ?? candidate.previousOurRatePln;
  const deltaPln = pack?.deltaPln ?? null;
  const deltaPct = pack?.deltaPct ?? null;
  const summary =
    recommendation?.summaryPl ??
    recommendationPl ??
    "";
  const stance = recommendation?.stance ?? null;
  const confidence = recommendation?.confidence ?? null;
  const findings = recommendation?.findings ?? [];

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2"
      data-ik-labor-candidate-review
    >
      <p className={`${TEUX_SECTION_TITLE} text-foreground`}>Kandydat OUR RATE (robocizna)</p>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
        {candidate.namePl} · {candidate.workId}
      </p>
      <p
        className={`${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-200`}
        data-ik-labor-expert-disclaimer
      >
        Rekomendacja eksperta — tylko informacyjna. Zapis wyłącznie po Owner Accept.
      </p>
      <dl className={`${TEUX_FONT_BODY} grid grid-cols-2 gap-x-3 gap-y-1`}>
        <dt className="text-muted-foreground">Stawka (evidence)</dt>
        <dd className="tabular-nums font-semibold" data-ik-labor-candidate-rate>
          {ratePln} PLN/{candidate.unit}
        </dd>
        {stance ? (
          <>
            <dt className="text-muted-foreground">Stance</dt>
            <dd data-ik-labor-expert-stance>{STANCE_PL[stance] ?? stance}</dd>
          </>
        ) : null}
        {confidence ? (
          <>
            <dt className="text-muted-foreground">Confidence</dt>
            <dd data-ik-labor-expert-confidence>{confidence}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Jednostka</dt>
        <dd data-ik-labor-candidate-unit>{candidate.unit}</dd>
        <dt className="text-muted-foreground">Region</dt>
        <dd data-ik-labor-candidate-region>{regionLabel}</dd>
        <dt className="text-muted-foreground">Źródła</dt>
        <dd data-ik-labor-candidate-source>{sources || "—"}</dd>
        <dt className="text-muted-foreground">Sample</dt>
        <dd data-ik-labor-candidate-sample>
          n={sampleSize} · regional={regionalSample}
          {lowSample ? " · lowSample" : ""}
        </dd>
        <dt className="text-muted-foreground">Poprzednia OUR RATE</dt>
        <dd data-ik-labor-candidate-previous>
          {prev != null ? `${prev} PLN/${candidate.unit}` : "—"}
        </dd>
        <dt className="text-muted-foreground">Delta</dt>
        <dd data-ik-labor-candidate-delta>
          {deltaPln != null
            ? `${deltaPln} PLN` + (deltaPct != null ? ` (${deltaPct}%)` : "")
            : "—"}
        </dd>
      </dl>
      {findings.length > 0 ? (
        <ul
          className={`${TEUX_FONT_CAPTION} list-disc pl-4 space-y-0.5 text-muted-foreground`}
          data-ik-labor-expert-findings
        >
          {findings.map((f) => (
            <li key={f.code} data-finding-code={f.code}>
              [{f.severity}] {f.messagePl}
            </li>
          ))}
        </ul>
      ) : null}
      <p
        className={`${TEUX_FONT_CAPTION} text-muted-foreground leading-relaxed`}
        data-ik-labor-candidate-recommendation
      >
        {summary}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <WgButton
          type="button"
          variant="primary"
          disabled={busy}
          onClick={onAccept}
          data-ik-labor-candidate-accept
        >
          ACCEPT
        </WgButton>
        <WgButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onReject}
          data-ik-labor-candidate-reject
        >
          REJECT
        </WgButton>
      </div>
    </div>
  );
}

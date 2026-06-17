import { BookOpen, CalendarPlus, ShieldAlert } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { isTenderOpenForOffers } from "@/lib/tenders-bzp";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { computeReferenceMatchSummary, downloadTenderDeadlineIcs } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { TenderParticipationPanel } from "@/app/TenderParticipationPanel";
import { TenderWorksRegisterPanel } from "@/app/TenderWorksRegisterPanel";
import { TenderFitPanel } from "@/app/TenderFitPanel";
import { TENDER_QUALIFICATION_SECTION_ID } from "@/lib/tender-workspace-ux";
import { TENDER_OWNER_WORKSPACE_SECTION_COPY } from "@/lib/tender-owner-language-pl";

export function TenderQualificationWorkspace({
  item,
  swz,
  fit,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
}) {
  const profile = loadCompanyProfileLocal();
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const refMatch = computeReferenceMatchSummary(item, profile);

  return (
    <div id={TENDER_QUALIFICATION_SECTION_ID} className="space-y-3 scroll-mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        {TENDER_OWNER_WORKSPACE_SECTION_COPY.qualification}
      </p>

      <div className="rounded-xl border border-border bg-card px-3 py-2.5 space-y-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <ShieldAlert size={13} className="text-primary" />
          Wadium
        </p>
        {wadium.blocked ? (
          <p className="text-[10px] text-red-700 dark:text-red-400">
            <strong>Blokada udziału</strong> — {wadium.summary}. Limit profilu: {profile.maxWadiumPln.toLocaleString("pl-PL")} zł.
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">{wadium.summary}</p>
        )}
      </div>

      {refMatch.status !== "unknown" && (
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-xs font-semibold flex items-center gap-1.5 mb-1">
            <BookOpen size={13} className="text-primary" />
            Referencje
          </p>
          <p className={`text-[10px] ${
            refMatch.status === "ok" ? "text-emerald-700 dark:text-emerald-400"
              : refMatch.status === "partial" ? "text-amber-700 dark:text-amber-400"
                : "text-red-700 dark:text-red-400"
          }`}
          >
            {refMatch.summary}
          </p>
        </div>
      )}

      {item.submittingOffersDate && isTenderOpenForOffers(item.submittingOffersDate) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); downloadTenderDeadlineIcs(item); }}
          className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
        >
          <CalendarPlus size={11} />
          Dodaj termin ofert do kalendarza
        </button>
      )}

      <TenderParticipationPanel swz={swz} />
      <TenderWorksRegisterPanel tenderId={item.tenderId ?? item.id} swz={swz} />
      <TenderFitPanel fit={fit} awardCriteria={swz?.awardCriteria} />
    </div>
  );
}

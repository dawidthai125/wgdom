import { TenderUxSkeleton, TEUX5_SKELETON } from "@/app/tenders/loading/TenderUxSkeleton";

function SummarySlotSkeleton() {
  return (
    <div className={`flex flex-col ${TEUX5_SKELETON.gapSm} min-w-0`}>
      <TenderUxSkeleton className={`${TEUX5_SKELETON.rowSm} w-20`} />
      <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-full max-w-[12rem]`} />
    </div>
  );
}

export function TenderDocumentsSummarySkeleton() {
  return (
    <section
      className={`rounded-xl border border-primary/20 bg-primary/5 overflow-hidden ${TEUX5_SKELETON.radiusLg}`}
      aria-label="Ładowanie podsumowania dokumentów"
      data-teux5-documents-summary-skeleton
      aria-busy="true"
    >
      <div className="px-4 py-2.5 border-b border-primary/10 flex flex-wrap items-center justify-between gap-2">
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-44`} />
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowSm} w-32`} />
      </div>

      <div className={`px-4 py-3 ${TEUX5_SKELETON.gapSection} flex flex-col`}>
        <div className={`grid ${TEUX5_SKELETON.gapSection} sm:grid-cols-2`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SummarySlotSkeleton key={i} />
          ))}
        </div>

        <div className={`pt-2 border-t border-primary/10 ${TEUX5_SKELETON.gapSection} flex flex-col`}>
          <TenderUxSkeleton className={`${TEUX5_SKELETON.rowSm} w-28`} />
          <div className={`flex flex-wrap ${TEUX5_SKELETON.gapSm}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <TenderUxSkeleton
                key={i}
                className={`${TEUX5_SKELETON.chipH} w-24 ${TEUX5_SKELETON.radius}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

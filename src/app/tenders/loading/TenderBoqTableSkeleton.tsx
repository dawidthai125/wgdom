import { TenderUxSkeleton, TEUX5_SKELETON } from "@/app/tenders/loading/TenderUxSkeleton";

export function TenderBoqTableSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <section
      className={`${TEUX5_SKELETON.gapSection} flex flex-col`}
      data-teux5-boq-skeleton
      aria-busy="true"
      aria-label="Ładowanie kosztorysu BOQ"
    >
      <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-28`} />

      <TenderUxSkeleton className={`${TEUX5_SKELETON.inputH} w-full ${TEUX5_SKELETON.radiusLg}`} />

      <div className={`flex flex-wrap ${TEUX5_SKELETON.gapSm}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <TenderUxSkeleton
            key={i}
            className={`${TEUX5_SKELETON.chipH} w-16 ${TEUX5_SKELETON.radiusLg}`}
          />
        ))}
      </div>

      <div className={`${TEUX5_SKELETON.gapSection} flex flex-col`}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center ${TEUX5_SKELETON.gap} py-2 border-b border-border/40 last:border-0`}
          >
            <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-8 shrink-0`} />
            <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} flex-1`} />
            <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-14 shrink-0 hidden sm:block`} />
          </div>
        ))}
      </div>
    </section>
  );
}

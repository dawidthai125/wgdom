import { TenderUxSkeleton, TEUX5_SKELETON } from "@/app/tenders/loading/TenderUxSkeleton";

export function TenderListCardSkeleton() {
  return (
    <article
      className={`rounded-xl border border-border bg-card overflow-hidden ${TEUX5_SKELETON.radiusLg}`}
      data-teux5-list-card-skeleton
      aria-hidden
    >
      <div className={`w-full px-4 py-3 flex ${TEUX5_SKELETON.gap}`}>
        <div className={`flex-1 min-w-0 ${TEUX5_SKELETON.gapSection} flex flex-col`}>
          <div className={`flex flex-wrap ${TEUX5_SKELETON.gapSm}`}>
            <TenderUxSkeleton className={`${TEUX5_SKELETON.badgeH} w-14`} />
            <TenderUxSkeleton className={`${TEUX5_SKELETON.badgeH} w-20`} />
            <TenderUxSkeleton className={`${TEUX5_SKELETON.badgeH} w-12 lg:hidden`} />
          </div>
          <TenderUxSkeleton className={`${TEUX5_SKELETON.titleH} w-full max-w-md`} />
          <TenderUxSkeleton className={`${TEUX5_SKELETON.titleH} w-3/4 max-w-sm`} />
          <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-full max-w-xs`} />
          <div className={`grid grid-cols-3 ${TEUX5_SKELETON.gap} pt-0.5`}>
            <TenderUxSkeleton className={TEUX5_SKELETON.rowH} />
            <TenderUxSkeleton className={TEUX5_SKELETON.rowH} />
            <TenderUxSkeleton className={TEUX5_SKELETON.rowH} />
          </div>
        </div>
        <div className={`hidden lg:flex flex-col items-end ${TEUX5_SKELETON.gapSm} shrink-0`}>
          <TenderUxSkeleton className={`${TEUX5_SKELETON.badgeH} w-20`} />
          <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-16`} />
        </div>
      </div>
    </article>
  );
}

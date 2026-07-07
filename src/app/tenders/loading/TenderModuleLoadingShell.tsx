import { TenderListCardSkeleton } from "@/app/tenders/list/TenderListCardSkeleton";
import { TenderUxSkeleton, TEUX5_SKELETON } from "@/app/tenders/loading/TenderUxSkeleton";

function TenderModuleHeaderSkeleton() {
  return (
    <div
      className="shrink-0 px-4 sm:px-6 py-3 border-b border-border bg-card/95 flex flex-wrap items-center justify-between gap-3"
      data-teux5-module-header-skeleton
      aria-hidden
    >
      <div className={`min-w-0 flex-1 ${TEUX5_SKELETON.gapSection} flex flex-col`}>
        <div className={`flex items-center ${TEUX5_SKELETON.gap}`}>
          <TenderUxSkeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
          <TenderUxSkeleton className={`${TEUX5_SKELETON.titleH} w-40 max-w-[50vw]`} />
        </div>
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-full max-w-md`} />
      </div>
      <TenderUxSkeleton className={`h-11 w-36 shrink-0 ${TEUX5_SKELETON.radiusLg}`} />
    </div>
  );
}

function TenderModuleTabBarSkeleton() {
  return (
    <div
      className="shrink-0 px-4 sm:px-6 py-2 border-b border-border bg-secondary/30 overflow-hidden"
      data-teux5-module-tabs-skeleton
      aria-hidden
    >
      <div className={`flex ${TEUX5_SKELETON.gapSm} min-w-0`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <TenderUxSkeleton
            key={i}
            className={`${TEUX5_SKELETON.chipH} flex-1 min-w-[4.5rem] max-w-[7rem] ${TEUX5_SKELETON.radiusLg}`}
          />
        ))}
      </div>
    </div>
  );
}

export function TenderModuleLoadingShell({
  showHeader = true,
  showTabBar = true,
  cardCount = 3,
}: {
  showHeader?: boolean;
  showTabBar?: boolean;
  cardCount?: number;
}) {
  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
      data-teux5-module-loading
      aria-busy="true"
      aria-label="Ładowanie modułu Przetargi"
    >
      {showHeader && <TenderModuleHeaderSkeleton />}
      {showTabBar && <TenderModuleTabBarSkeleton />}
      <div
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 ${TEUX5_SKELETON.gapSection} flex flex-col`}
        data-teux5-list-loading
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <TenderListCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

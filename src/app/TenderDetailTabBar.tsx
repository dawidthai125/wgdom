import { useRef } from "react";
import {
  TENDER_DETAIL_V4_ACTIVE_TAB_ORDER,
  TENDER_DETAIL_V4_TAB_LABELS,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";
import { useHorizontalScrollShadow } from "@/app/tenders/mobile/useHorizontalScrollShadow";

export function TenderDetailTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TenderDetailV4TabId;
  onTabChange: (tab: TenderDetailV4TabId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shadow = useHorizontalScrollShadow(scrollRef, true);

  return (
    <div
      className="relative -mx-1 px-1"
      data-tender-detail-tabs-wrap
      data-tender-detail-tabs-scroll-shadow={shadow.left || shadow.right ? "true" : "false"}
    >
      {shadow.left && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-5 z-[1] bg-gradient-to-r from-card via-card/80 to-transparent"
          aria-hidden
          data-tender-detail-tabs-shadow="left"
        />
      )}
      {shadow.right && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-5 z-[1] bg-gradient-to-l from-card via-card/80 to-transparent"
          aria-hidden
          data-tender-detail-tabs-shadow="right"
        />
      )}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-thin"
        role="tablist"
        aria-label="Sekcje przetargu"
        data-tender-detail-tabs
      >
        {TENDER_DETAIL_V4_ACTIVE_TAB_ORDER.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-tender-tab={tab}
              className={`shrink-0 px-3 py-2 min-h-[44px] lg:min-h-[36px] lg:py-1.5 rounded-lg text-xs md:max-lg:text-[11px] max-[390px]:px-2.5 max-[390px]:text-[11px] font-medium transition-colors duration-150 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              onClick={() => onTabChange(tab)}
            >
              {TENDER_DETAIL_V4_TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

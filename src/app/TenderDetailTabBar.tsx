import {
  TENDER_DETAIL_V4_ACTIVE_TAB_ORDER,
  TENDER_DETAIL_V4_TAB_LABELS,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";

export function TenderDetailTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TenderDetailV4TabId;
  onTabChange: (tab: TenderDetailV4TabId) => void;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 -mx-1 px-1 scrollbar-thin"
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
            className={`shrink-0 px-3 py-2 min-h-[44px] lg:min-h-[36px] lg:py-1.5 rounded-lg text-xs md:max-lg:text-[11px] font-medium transition-colors duration-150 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
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
  );
}

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
            className={`shrink-0 px-3 py-2 min-h-[40px] max-[390px]:min-h-[36px] max-[390px]:px-2.5 max-[390px]:py-1.5 rounded-lg text-xs max-[390px]:text-[11px] font-medium transition-colors ${
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

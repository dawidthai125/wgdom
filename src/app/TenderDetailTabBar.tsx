import {
  TENDER_DETAIL_V4_PLACEHOLDER_TABS,
  TENDER_DETAIL_V4_TAB_LABELS,
  TENDER_DETAIL_V4_TAB_ORDER,
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
    >
      {TENDER_DETAIL_V4_TAB_ORDER.map((tab) => {
        const isActive = tab === activeTab;
        const isSoon = TENDER_DETAIL_V4_PLACEHOLDER_TABS.has(tab);
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`shrink-0 px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            onClick={() => onTabChange(tab)}
          >
            {TENDER_DETAIL_V4_TAB_LABELS[tab]}
            {isSoon && !isActive && (
              <span className="ml-1 text-[9px] opacity-70">· wkrótce</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

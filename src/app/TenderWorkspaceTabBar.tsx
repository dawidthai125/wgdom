import {
  ClipboardList,
  FileStack,
  ShieldCheck,
  Calculator,
  Send,
} from "lucide-react";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import {
  TENDER_WORKSPACE_TAB_LABELS,
  TENDER_WORKSPACE_TAB_ORDER,
} from "@/lib/tender-workspace-ux";

const TAB_ICONS: Record<TenderWorkspaceTabId, typeof ClipboardList> = {
  overview: ClipboardList,
  documents: FileStack,
  qualification: ShieldCheck,
  valuation: Calculator,
  offer: Send,
};

export function TenderWorkspaceTabBar({
  activeTab,
  onTabChange,
  badges,
}: {
  activeTab: TenderWorkspaceTabId;
  onTabChange: (tab: TenderWorkspaceTabId) => void;
  /** Opcjonalne liczniki / sygnały na tabie (np. monitoring). */
  badges?: Partial<Record<TenderWorkspaceTabId, string>>;
}) {
  return (
    <div
      className="shrink-0 -mx-1 px-1 py-1.5 overflow-x-auto"
      role="tablist"
      aria-label="Obszary przetargu"
    >
      <div className="inline-flex min-w-full sm:min-w-0 rounded-xl bg-secondary p-0.5 border border-border gap-0.5">
        {TENDER_WORKSPACE_TAB_ORDER.map((id) => {
          const Icon = TAB_ICONS[id];
          const badge = badges?.[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={(e) => {
                e.stopPropagation();
                onTabChange(id);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-colors min-h-[36px] whitespace-nowrap flex-1 sm:flex-none justify-center ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} className="shrink-0" />
              {TENDER_WORKSPACE_TAB_LABELS[id]}
              {badge && (
                <span className={`text-[9px] px-1 py-0 rounded-full ${
                  activeTab === id ? "bg-primary-foreground/20" : "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

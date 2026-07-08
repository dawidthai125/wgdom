import {
  Building2,
  LayoutGrid,
  Library,
  List,
  MapPin,
  Settings2,
  Tags,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TENDERS_MODULE_LABELS, type TendersTabId } from "@/lib/tenders-module-labels";
import { filterTenderModuleNavTabs } from "@/lib/tender-module-nav-sheet";
import {
  TEUX_FONT_CAPTION,
  TEUX_FONT_TITLE,
  TEUX_TRANSITION_FAST,
} from "@/lib/tender-ux-tokens";

const TAB_ICONS: Record<TendersTabId, LucideIcon> = {
  list: List,
  strategy: LayoutGrid,
  map: MapPin,
  profile: Building2,
  workcatalog: Library,
  pricebase: Tags,
  settings: Settings2,
};

export function TenderModuleNavSheet({
  open,
  activeTab,
  canViewWorkCatalog,
  workspaceContext,
  onClose,
  onSelectTab,
}: {
  open: boolean;
  activeTab: TendersTabId;
  canViewWorkCatalog: boolean;
  /** NG-08-01 — kontekst bieżącego tender workspace (continuity hint). */
  workspaceContext?: { tenderRef: string; title: string };
  onClose: () => void;
  onSelectTab: (tab: TendersTabId) => void;
}) {
  if (!open) return null;

  const tabs = filterTenderModuleNavTabs(canViewWorkCatalog);

  return (
    <div
      className="lg:hidden fixed inset-0 z-50"
      data-tender-module-nav-sheet
      role="dialog"
      aria-modal="true"
      aria-label="Nawigacja modułu Przetargi"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Zamknij menu modułu"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl px-4 pt-4 pb-2 max-h-[70dvh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className={TEUX_FONT_TITLE}>{TENDERS_MODULE_LABELS.moduleTitle}</p>
          <button
            type="button"
            onClick={onClose}
            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground ${TEUX_TRANSITION_FAST}`}
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mb-3`}>
          Przejdź do innej zakładki modułu bez powrotu do listy.
        </p>
        {workspaceContext && (
          <div
            className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
            data-tender-workspace-continuity-hint
          >
            <p className={`${TEUX_FONT_CAPTION} text-muted-foreground leading-snug`}>
              Aktywny workspace:{" "}
              <span className="font-medium text-foreground">{workspaceContext.tenderRef}</span>
            </p>
            <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5 line-clamp-2`}>
              {workspaceContext.title}
            </p>
            <p className={`${TEUX_FONT_CAPTION} text-muted-foreground/80 mt-1`}>
              Powrót do tego przetargu: Zamknij menu lub Wstecz na liście.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pb-2">
          {tabs.map((tabId) => {
            const Icon = TAB_ICONS[tabId];
            const selected = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                data-tender-module-nav-tab={tabId}
                className={`flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-xl border text-left ${TEUX_TRANSITION_FAST} touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  selected
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "bg-secondary/40 border-border text-foreground hover:bg-secondary/70"
                }`}
                onClick={() => onSelectTab(tabId)}
              >
                <Icon size={18} className="shrink-0" aria-hidden />
                <span className={`${TEUX_FONT_CAPTION} font-medium leading-tight`}>
                  {TENDERS_MODULE_LABELS.tabs[tabId]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

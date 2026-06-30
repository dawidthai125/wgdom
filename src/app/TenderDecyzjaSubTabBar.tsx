import {
  DECYZJA_V4_SUB_TAB_LABELS,
  DECYZJA_V4_SUB_TAB_ORDER,
  type DecyzjaV4EmbedWorkspace,
} from "@/lib/tender-detail-routes-v4";

export function TenderDecyzjaSubTabBar({
  activeWorkspace,
  onWorkspaceChange,
}: {
  activeWorkspace: DecyzjaV4EmbedWorkspace;
  onWorkspaceChange: (ws: DecyzjaV4EmbedWorkspace) => void;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto overscroll-x-contain -mx-1 px-1 scrollbar-thin"
      role="tablist"
      aria-label="Sekcje decyzji"
      data-tender-decyzja-subtabs
    >
      {DECYZJA_V4_SUB_TAB_ORDER.map((ws) => {
        const isActive = ws === activeWorkspace;
        return (
          <button
            key={ws}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-decyzja-ws={ws}
            className={`shrink-0 px-3 py-1.5 min-h-[40px] rounded-md text-[11px] font-medium transition-colors ${
              isActive
                ? "bg-secondary text-foreground ring-1 ring-border"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
            onClick={() => onWorkspaceChange(ws)}
          >
            {DECYZJA_V4_SUB_TAB_LABELS[ws]}
          </button>
        );
      })}
    </div>
  );
}

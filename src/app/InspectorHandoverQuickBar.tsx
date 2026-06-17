import { Camera, ClipboardList, Download } from "lucide-react";
import type { InspectorHandoverQuickActionId } from "@/lib/inspector-handover-ux";
import { INSPECTOR_HANDOVER_QUICK_ACTIONS } from "@/lib/inspector-handover-ux";

const ICONS = {
  download_package: Download,
  checklist: ClipboardList,
  photos: Camera,
} as const;

export function InspectorHandoverQuickBar({
  packageReady,
  downloadBusy,
  onAction,
}: {
  packageReady: boolean;
  downloadBusy?: boolean;
  onAction: (id: InspectorHandoverQuickActionId) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none"
      role="toolbar"
      aria-label="Skróty odbioru WM"
    >
      {INSPECTOR_HANDOVER_QUICK_ACTIONS.map(({ id, label }) => {
        const Icon = ICONS[id];
        const disabled = id === "download_package" && downloadBusy;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onAction(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium min-h-[44px] touch-manipulation transition-colors ${
              id === "download_package" && packageReady
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground border border-border hover:bg-secondary/80"
            } disabled:opacity-50`}
          >
            <Icon size={14} />
            {id === "download_package" && downloadBusy ? "Pobieranie…" : label}
          </button>
        );
      })}
    </div>
  );
}

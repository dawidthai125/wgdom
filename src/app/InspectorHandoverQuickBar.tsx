import { Camera, ClipboardList, Download } from "lucide-react";
import type { InspectorHandoverQuickActionId } from "@/lib/inspector-handover-ux";
import { INSPECTOR_HANDOVER_QUICK_ACTIONS } from "@/lib/inspector-handover-ux";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

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
        const isPrimary = id === "download_package" && packageReady;
        return (
          <WgButton
            key={id}
            type="button"
            variant={isPrimary ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onAction(id)}
            className={cn(
              "shrink-0 gap-1.5 px-3 text-xs font-medium",
              WG_TOUCH_MIN,
              "h-11",
              !isPrimary && "border border-border",
            )}
          >
            <Icon size={14} />
            {id === "download_package" && downloadBusy ? "Pobieranie…" : label}
          </WgButton>
        );
      })}
    </div>
  );
}

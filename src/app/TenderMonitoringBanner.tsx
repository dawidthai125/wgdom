import { AlertTriangle } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { shouldShowTenderMonitoringBanner } from "@/lib/tender-workspace-ux";

export function TenderMonitoringBanner({
  item,
  onOpenStrategy,
}: {
  item: TenderPipelineItem;
  onOpenStrategy?: () => void;
}) {
  if (!shouldShowTenderMonitoringBanner(item)) return null;

  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[10px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
        <AlertTriangle size={13} className="shrink-0" />
        <span><strong>Wykryto nowe zmiany lub pytania</strong> — sprawdź monitoring na zakładce Strategia.</span>
      </p>
      {onOpenStrategy && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenStrategy(); }}
          className="text-[10px] font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline shrink-0"
        >
          Otwórz Strategię →
        </button>
      )}
    </div>
  );
}

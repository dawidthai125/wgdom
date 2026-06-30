import { AlertTriangle } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { shouldShowTenderMonitoringBanner } from "@/lib/tender-workspace-ux";

export function TenderMonitoringBanner({
  item,
  onOpenStrategy,
  compact = false,
}: {
  item: TenderPipelineItem;
  onOpenStrategy?: () => void;
  /** NG-03.4 — jedna linia przy Action Bar. */
  compact?: boolean;
}) {
  if (!shouldShowTenderMonitoringBanner(item)) return null;

  return (
    <div
      className={`rounded-lg border border-amber-500/35 bg-amber-500/10 flex items-center justify-between gap-2 ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2 flex-wrap"
      }`}
      data-tender-monitoring-banner={compact ? "compact" : "default"}
    >
      <p className={`text-amber-900 dark:text-amber-200 flex items-center gap-1.5 min-w-0 ${
        compact ? "text-[10px] line-clamp-1" : "text-[10px] flex-wrap"
      }`}>
        <AlertTriangle size={compact ? 12 : 13} className="shrink-0" />
        <span>
          {compact ? (
            <strong>Nowe zmiany w monitoringu</strong>
          ) : (
            <><strong>Wykryto nowe zmiany lub pytania</strong> — sprawdź monitoring na zakładce Strategia.</>
          )}
        </span>
      </p>
      {onOpenStrategy && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenStrategy(); }}
          className="text-[10px] font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline shrink-0"
        >
          {compact ? "Strategia" : "Otwórz Strategię →"}
        </button>
      )}
    </div>
  );
}

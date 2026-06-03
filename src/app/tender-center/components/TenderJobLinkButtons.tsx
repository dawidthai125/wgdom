import { Briefcase } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

const btnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-colors";

/**
 * Przyciski „Utwórz robotę” / „Otwórz robotę” — tylko status wygrany (jak Classic).
 */
export function TenderJobLinkButtons({
  item,
  onCreateJob,
  onOpenJob,
  size = "default",
}: {
  item: TenderPipelineItem;
  onCreateJob?: (item: TenderPipelineItem) => void;
  onOpenJob?: (jobId: string) => void;
  size?: "default" | "compact";
}) {
  if (item.status !== "won") return null;

  const compact = size === "compact";

  if (item.linkedJobId && onOpenJob) {
    return (
      <button
        type="button"
        onClick={() => onOpenJob(item.linkedJobId!)}
        className={`${btnClass} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 ${
          compact ? "text-[10px] px-2 py-1 min-h-[32px]" : ""
        }`}
      >
        <Briefcase size={compact ? 11 : 12} />
        Otwórz robotę
      </button>
    );
  }

  if (!item.linkedJobId && onCreateJob) {
    return (
      <button
        type="button"
        onClick={() => onCreateJob(item)}
        className={`${btnClass} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 ${
          compact ? "text-[10px] px-2 py-1 min-h-[32px]" : ""
        }`}
      >
        <Briefcase size={compact ? 11 : 12} />
        Utwórz robotę
      </button>
    );
  }

  return null;
}

/** Alerty Action Center z ETAP 8 — realizacja wygranego przetargu. */
export function isWonRealizationAction(actionId: string): boolean {
  return actionId.startsWith("won-realization-");
}

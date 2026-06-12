import { useMemo } from "react";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildTenderAttentionItems,
  type TenderAttentionItem,
} from "@/lib/tenders-attention";

function toneClasses(tone: TenderAttentionItem["tone"]): string {
  switch (tone) {
    case "red":
      return "border-red-500/30 bg-red-500/5 hover:bg-red-500/10";
    case "orange":
      return "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10";
    default:
      return "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10";
  }
}

function toneEmoji(tone: TenderAttentionItem["tone"]): string {
  switch (tone) {
    case "red": return "🔴";
    case "orange": return "🟠";
    default: return "🟡";
  }
}

function AttentionCard({
  item,
  onOpenTender,
}: {
  item: TenderAttentionItem;
  onOpenTender?: (tenderId: string) => void;
}) {
  const titleShort = item.title.length > 52 ? `${item.title.slice(0, 52)}…` : item.title;

  return (
    <button
      type="button"
      onClick={() => onOpenTender?.(item.tenderItemId)}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${toneClasses(item.tone)}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5" aria-hidden>{toneEmoji(item.tone)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate" title={item.title}>
            {titleShort}
          </p>
          <ul className="mt-1 space-y-0.5">
            {item.lines.map((line) => (
              <li key={line} className="text-[11px] text-muted-foreground">{line}</li>
            ))}
          </ul>
          <p className="text-[10px] text-primary font-medium mt-2">Otwórz przetarg →</p>
        </div>
        {onOpenTender && <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />}
      </div>
    </button>
  );
}

export function TendersAttentionPanel({
  items,
  onOpenTender,
}: {
  items: TenderPipelineItem[];
  onOpenTender?: (tenderId: string) => void;
}) {
  const attention = useMemo(() => buildTenderAttentionItems(items), [items]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AlertCircle size={16} className="text-red-500" />
        <h2 className="text-sm font-semibold">Wymaga uwagi</h2>
        {attention.length > 0 && (
          <span className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
            {attention.length}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        {attention.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">
            Brak pilnych pozycji — termin &gt;3 dni i brak świeżych zmian dokumentów / Q&A w ostatnich 7 dniach.
          </p>
        ) : (
          attention.map((row) => (
            <AttentionCard key={row.tenderItemId} item={row} onOpenTender={onOpenTender} />
          ))
        )}
      </div>
    </section>
  );
}

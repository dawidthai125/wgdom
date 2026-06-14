import { ScrollText, ArrowRight } from "lucide-react";

export function OperationalNotesUnreadBanner({
  count,
  onGoToNotes,
}: {
  count: number;
  onGoToNotes: () => void;
}) {
  if (count <= 0) return null;

  return (
    <div
      className="shrink-0 mx-3 sm:mx-4 mt-2 mb-0 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <ScrollText size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-200">Masz nowe notatki operacyjne.</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nieprzeczytane: <span className="font-semibold text-foreground">{count}</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGoToNotes}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 min-h-[44px] rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-100 hover:bg-amber-500/30 transition-colors"
      >
        Przejdź do notatek
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

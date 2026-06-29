import {
  analysisStepStateToTone,
  mapAnalysisStepStateLabel,
  type DocumentsTabSummarySlot,
  type DocumentsTabSummaryTone,
  type TenderDocumentsTabSummary,
} from "@/lib/tender-documents-tab-summary";
import type { DocumentsTrustBadgeView } from "@/lib/tender-trust-ui";
import { TrustBadge } from "@/app/tenders/trust/TrustBadge";

function toneClass(tone: DocumentsTabSummaryTone): string {
  switch (tone) {
    case "ok":
      return "text-emerald-700 dark:text-emerald-400";
    case "detected":
      return "text-sky-700 dark:text-sky-400";
    case "partial":
    case "pending":
      return "text-amber-700 dark:text-amber-400";
    case "warn":
      return "text-orange-700 dark:text-orange-400";
    default:
      return "text-muted-foreground";
  }
}

function SummarySlotRow({ slot }: { slot: DocumentsTabSummarySlot }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs min-w-0">
      <span className="text-muted-foreground shrink-0">{slot.label}</span>
      <span className={`font-medium min-w-0 break-words ${toneClass(slot.tone)}`}>
        {slot.value}
      </span>
    </div>
  );
}

export function TenderDocumentsSummaryHeader({
  summary,
  trustBadge,
}: {
  summary: TenderDocumentsTabSummary;
  trustBadge?: DocumentsTrustBadgeView | null;
}) {
  const documentSlots = [
    summary.swz,
    summary.przedmiarAth,
    summary.kosztorys,
    summary.umowa,
    summary.formularz,
  ];

  return (
    <section
      className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden"
      aria-label="Podsumowanie dokumentów"
      data-tenders-documents-summary-header
    >
      <div className="px-4 py-2.5 border-b border-primary/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Podsumowanie dokumentów
          </p>
          {trustBadge && (
            <TrustBadge
              level={trustBadge.level}
              labelPl={trustBadge.labelPl}
              title={trustBadge.title}
            />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Ostatnia analiza:{" "}
          <span className="font-medium text-foreground">{summary.lastAnalysisLabel}</span>
        </p>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {documentSlots.map((slot) => (
            <SummarySlotRow key={slot.id} slot={slot} />
          ))}
        </div>

        <div className="pt-2 border-t border-primary/10 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Gotowość procesu
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.processReadiness.map((row) => {
              const tone = analysisStepStateToTone(row.state);
              return (
                <span
                  key={row.id}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                    tone === "ok"
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25"
                      : tone === "pending"
                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25"
                        : tone === "warn"
                          ? "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/25"
                          : "bg-secondary/60 text-muted-foreground border-border"
                  }`}
                  title={row.label}
                >
                  {row.label}
                  <span className="opacity-80">· {mapAnalysisStepStateLabel(row.state)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

import type { DocumentPreviewSummary } from "@/lib/tender-document-summary-header";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="font-medium text-foreground min-w-0 break-words">{value}</span>
    </div>
  );
}

export function DocumentSummaryHeader({ summary }: { summary: DocumentPreviewSummary }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden mb-3">
      <div className="px-4 py-3 border-b border-primary/10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          {summary.headline}
        </p>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <SummaryRow label="Typ:" value={summary.typeLabel} />
        <SummaryRow label="Pozycje:" value={summary.rowCountDisplay} />
        <SummaryRow label="Status:" value={summary.statusLabel} />
        {summary.valueLabel && (
          <SummaryRow label="Wartość:" value={summary.valueLabel} />
        )}
        <SummaryRow label="Wycena:" value={summary.pricingLabel} />
        <SummaryRow label="Źródło:" value={summary.sourceLabel} />
        {summary.categoryCount != null && summary.categoryCount > 0 && (
          <SummaryRow label="Działy:" value={String(summary.categoryCount)} />
        )}
      </div>
    </div>
  );
}

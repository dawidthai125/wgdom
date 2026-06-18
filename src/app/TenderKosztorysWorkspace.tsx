import { useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildKosztorysV4Display,
  buildKosztorysV4Stats,
  type KosztorysV4CatalogDisplayRow,
} from "@/lib/tender-detail-v4-display";
import { isKosztorysAwaitingHeavyParse } from "@/lib/tender-analysis-status-ux";
import { KOSZTORYS_AWAITING_PARSE_HINT } from "@/lib/tender-analysis-status-ux";
import { resolveAthPreviewItem } from "@/lib/tender-ath-quick-access";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";

function KosztorysKpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function KosztorysCatalogTable({ rows }: { rows: KosztorysV4CatalogDisplayRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-secondary/60">
          <tr>
            <th className="text-left px-2 py-2 font-medium">Lp</th>
            <th className="text-left px-2 py-2 font-medium min-w-[200px]">Opis</th>
            <th className="text-left px-2 py-2 font-medium">j.m.</th>
            <th className="text-right px-2 py-2 font-medium">Ilość</th>
            <th className="text-left px-2 py-2 font-medium">Katalog</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.lp}-${i}`} className="border-t border-border/50 hover:bg-secondary/20">
              <td className="px-2 py-1.5 font-mono">{r.lp}</td>
              <td className="px-2 py-1.5">{r.description}</td>
              <td className="px-2 py-1.5">{r.unit || "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.quantity || "—"}</td>
              <td className="px-2 py-1.5 font-mono text-[10px]">{r.catalog || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KosztorysEmptyMessage({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>
  );
}

export function TenderKosztorysWorkspace({
  item,
  athPreviewEnabled = true,
}: {
  item: TenderPipelineItem;
  athPreviewEnabled?: boolean;
}) {
  const stats = useMemo(() => buildKosztorysV4Stats(item), [item]);
  const display = useMemo(() => buildKosztorysV4Display(item), [item]);
  const k = item.tenderDossier?.kosztorys;
  const awaiting = isKosztorysAwaitingHeavyParse(item);
  const [showAllRows, setShowAllRows] = useState(false);
  const [docPreview, setDocPreview] = useState<InspectorFileItem | null>(null);

  const athPreviewItem = useMemo(() => resolveAthPreviewItem(item), [item]);
  const canOpenFullPreview = athPreviewEnabled && athPreviewItem != null;

  const tableRows = display.catalogRows;
  const previewLimit = 20;
  const visibleRows = showAllRows ? tableRows : tableRows.slice(0, previewLimit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            stats.athReady
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : awaiting
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-red-500/15 text-red-700 dark:text-red-400"
          }`}
        >
          {stats.athReady ? <CheckCircle2 size={14} /> : awaiting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
          {stats.athStatusLabel}
        </div>

        {canOpenFullPreview && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15"
            onClick={() => setDocPreview(athPreviewItem)}
            data-kosztorys-full-preview-cta
          >
            <Eye size={14} />
            Pełny podgląd ATH
          </button>
        )}
      </div>

      {awaiting && (
        <p className="text-xs text-muted-foreground">{KOSZTORYS_AWAITING_PARSE_HINT}</p>
      )}

      {display.source === "rows_fallback" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Brak catalogQuantities — tymczasowy podgląd ze snapshot rows (debug).
        </p>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KosztorysKpiCard label="Pozycje ATH" value={stats.athPositionsDisplay} />
        <KosztorysKpiCard label="Pozycje wycenione" value={stats.pricedDisplay} />
        <KosztorysKpiCard label="Pozycje niewycenione" value={stats.unpricedDisplay} />
        <KosztorysKpiCard label="Wartość wyceny" value={stats.valuationValueDisplay} />
      </div>

      {k?.sourceFilename && (
        <p className="text-xs text-muted-foreground">{k.sourceFilename}</p>
      )}

      {tableRows.length > 0 ? (
        <div className="space-y-2">
          <KosztorysCatalogTable rows={visibleRows} />
          {tableRows.length > previewLimit && (
            <button
              type="button"
              className="text-xs text-primary font-medium hover:underline"
              onClick={() => setShowAllRows((v) => !v)}
            >
              {showAllRows
                ? "Pokaż mniej pozycji"
                : `Pokaż wszystkie (${tableRows.length} pozycji)`}
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">
            {tableRows.length} pozycji kosztorysowych
            {display.source === "catalog" ? " · źródło: catalogQuantities" : ""}
            {k?.totalValue ? ` · wartość wg pliku: ${k.totalValue} ${k.currency || "PLN"}` : ""}
          </p>
        </div>
      ) : display.emptyMessage ? (
        <KosztorysEmptyMessage text={display.emptyMessage} />
      ) : !stats.athReady && !awaiting ? (
        <KosztorysEmptyMessage text="Otwórz zakładkę Dokumenty, aby załadować i przeanalizować kosztorys ATH." />
      ) : null}

      {(k?.categories?.length ?? 0) > 0 && tableRows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {k!.categories.map((c, i) => (
            <span key={i} className="text-[10px] bg-secondary px-2 py-1 rounded border border-border">
              {c.name}: <strong>{c.total}</strong>
            </span>
          ))}
        </div>
      )}

      {docPreview && (
        <JobFilePreviewModal
          item={docPreview}
          athPreviewEnabled={athPreviewEnabled}
          bzpDocuments={item.bzpDocuments}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}

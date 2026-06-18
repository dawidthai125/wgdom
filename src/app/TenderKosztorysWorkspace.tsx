import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { buildKosztorysV4Stats } from "@/lib/tender-detail-v4-display";
import { isKosztorysAwaitingHeavyParse } from "@/lib/tender-analysis-status-ux";
import { KOSZTORYS_AWAITING_PARSE_HINT } from "@/lib/tender-analysis-status-ux";

function KosztorysKpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function KosztorysCostTable({
  rows,
}: {
  rows: { lp: string; description: string; unit: string; quantity: string; unitPrice: string; total: string }[];
}) {
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
            <th className="text-right px-2 py-2 font-medium">Cena</th>
            <th className="text-right px-2 py-2 font-medium">Wartość</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.lp}-${i}`} className="border-t border-border/50 hover:bg-secondary/20">
              <td className="px-2 py-1.5 font-mono">{r.lp}</td>
              <td className="px-2 py-1.5">{r.description}</td>
              <td className="px-2 py-1.5">{r.unit || "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.quantity || "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.unitPrice || "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono font-medium">{r.total || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TenderKosztorysWorkspace({ item }: { item: TenderPipelineItem }) {
  const stats = useMemo(() => buildKosztorysV4Stats(item), [item]);
  const k = item.tenderDossier?.kosztorys;
  const awaiting = isKosztorysAwaitingHeavyParse(item);
  const [showAllRows, setShowAllRows] = useState(false);

  const tableRows = k?.rows ?? [];
  const visibleRows = showAllRows ? tableRows.slice(0, 80) : tableRows.slice(0, 20);

  return (
    <div className="space-y-4">
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

      {awaiting && (
        <p className="text-xs text-muted-foreground">{KOSZTORYS_AWAITING_PARSE_HINT}</p>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KosztorysKpiCard label="Pozycje ATH" value={stats.athPositionsDisplay} />
        <KosztorysKpiCard label="Pozycje wycenione" value={stats.pricedDisplay} />
        <KosztorysKpiCard label="Pozycje niewycenione" value={stats.unpricedDisplay} />
        <KosztorysKpiCard label="Wartość wyceny" value={stats.valuationValueDisplay} />
      </div>

      {k?.title && (
        <p className="text-xs text-muted-foreground">{k.title}</p>
      )}

      {tableRows.length > 0 ? (
        <div className="space-y-2">
          <KosztorysCostTable rows={visibleRows} />
          {tableRows.length > 20 && (
            <button
              type="button"
              className="text-xs text-primary font-medium hover:underline"
              onClick={() => setShowAllRows((v) => !v)}
            >
              {showAllRows
                ? "Pokaż mniej pozycji"
                : `Pokaż więcej (${Math.min(tableRows.length, 80)} z ${k?.rowCount ?? tableRows.length})`}
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">
            {tableRows.length} pozycji w skrócie
            {k?.totalValue ? ` · wartość wg pliku: ${k.totalValue} ${k.currency || "PLN"}` : ""}
          </p>
        </div>
      ) : stats.athReady && stats.athPositions === 0 ? (
        <p className="text-sm text-muted-foreground">Brak rozpoznanych pozycji w kosztorysie.</p>
      ) : !stats.athReady ? (
        <p className="text-sm text-muted-foreground">
          Otwórz zakładkę Dokumenty, aby załadować i przeanalizować kosztorys ATH.
        </p>
      ) : null}

      {(k?.categories?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {k!.categories.map((c, i) => (
            <span key={i} className="text-[10px] bg-secondary px-2 py-1 rounded border border-border">
              {c.name}: <strong>{c.total}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

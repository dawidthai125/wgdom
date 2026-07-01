import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { KosztorysBoqExplorerView } from "@/lib/tender-kosztorys-boq-explorer";
import { filterKosztorysBoqRows } from "@/lib/tender-kosztorys-boq-explorer";
import {
  KOSZTORYS_PRO_FILTER_OPTIONS,
  kosztorysFilterEmptyMessage,
  type KosztorysProFilterId,
} from "@/lib/tender-kosztorys-pro-dashboard";
import {
  TenderDesktopTable,
  TenderMobileRowCard,
  TenderMobileTableCards,
} from "@/app/tenders/mobile/tender-mobile-row-cards";
import { boqRowMobileFields, BoqRowDesktopCells } from "@/app/kosztorys/KosztorysBoqRowFields";
import type { TenderTrustReason } from "@/lib/tender-trust-layer";
import { TrustReasonList } from "@/app/tenders/trust/TrustReasonList";

const PREVIEW_LIMIT = 20;

export function KosztorysBoqExplorerSection({
  view,
  categoryFilter,
  onCategoryFilterChange,
  sourceFilename,
  totalValueLabel,
  rowsFallbackSource,
  trustReasons,
  trustLevelIcon,
}: {
  view: KosztorysBoqExplorerView;
  categoryFilter: KosztorysProFilterId;
  onCategoryFilterChange: (id: KosztorysProFilterId) => void;
  sourceFilename?: string | null;
  totalValueLabel?: string | null;
  rowsFallbackSource?: boolean;
  trustReasons?: TenderTrustReason[];
  trustLevelIcon?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllRows, setShowAllRows] = useState(false);

  const filteredRows = useMemo(
    () => filterKosztorysBoqRows(view.rows, { query: searchQuery, categoryFilter }),
    [view.rows, searchQuery, categoryFilter],
  );

  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, PREVIEW_LIMIT);

  const filterLabel = KOSZTORYS_PRO_FILTER_OPTIONS.find((o) => o.id === categoryFilter)?.label;
  const searchActive = searchQuery.trim().length > 0;

  return (
    <section className="space-y-3" data-kosztorys-boq-explorer data-kosztorys-boq-row-count={filteredRows.length}>
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-background/95 backdrop-blur-sm space-y-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowAllRows(false);
            }}
            placeholder="Szukaj pozycji (opis, LP, KNR)…"
            aria-label="Szukaj pozycji kosztorysu"
            className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
            data-kosztorys-boq-search
          />
        </div>

        <div className="flex flex-wrap gap-1.5" data-kosztorys-category-filters>
          {KOSZTORYS_PRO_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onCategoryFilterChange(opt.id)}
              className={`min-h-[44px] px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                categoryFilter === opt.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {rowsFallbackSource && (
        <p
          className="text-xs text-amber-700 dark:text-amber-400"
          data-kosztorys-source="rows_fallback"
        >
          Brak catalogQuantities — podgląd oparty o snapshot rows (debug).
        </p>
      )}

      {sourceFilename && (
        <p className="text-xs text-muted-foreground">{sourceFilename}</p>
      )}

      {filteredRows.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">BOQ Explorer</h3>

          <TenderMobileTableCards>
            {visibleRows.map((row) => (
              <TenderMobileRowCard
                key={row.rowKey}
                title={`${row.lp}. ${row.description}`}
                fields={boqRowMobileFields(row)}
              />
            ))}
          </TenderMobileTableCards>

          <TenderDesktopTable>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium">Lp</th>
                    <th className="text-left px-2 py-2 font-medium min-w-[200px]">Opis</th>
                    <th className="text-left px-2 py-2 font-medium">j.m.</th>
                    <th className="text-right px-2 py-2 font-medium">Ilość</th>
                    <th className="text-left px-2 py-2 font-medium">KNR</th>
                    <th className="text-right px-2 py-2 font-medium">Cena ATH</th>
                    <th className="text-right px-2 py-2 font-medium">Wartość ATH</th>
                    <th className="text-right px-2 py-2 font-medium">Cena WGDOM</th>
                    <th className="text-right px-2 py-2 font-medium">Wartość WGDOM</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row.rowKey}
                      className="border-t border-border/50 hover:bg-secondary/20"
                      data-kosztorys-boq-row={row.lp}
                    >
                      <BoqRowDesktopCells row={row} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TenderDesktopTable>

          {filteredRows.length > PREVIEW_LIMIT && (
            <button
              type="button"
              className="min-h-[44px] text-xs text-primary font-medium hover:underline"
              onClick={() => setShowAllRows((v) => !v)}
            >
              {showAllRows
                ? "Pokaż mniej pozycji"
                : `Pokaż wszystkie (${filteredRows.length} pozycji)`}
            </button>
          )}

          <p className="text-[10px] text-muted-foreground">
            {filteredRows.length} pozycji
            {searchActive ? ` · wyszukiwanie: „${searchQuery.trim()}”` : ""}
            {categoryFilter !== "all" ? ` · filtr: ${filterLabel}` : ""}
            {view.meta.catalogSourceLabel ? ` · ${view.meta.catalogSourceLabel}` : ""}
            {totalValueLabel ?? ""}
          </p>

          {(trustReasons?.length ?? 0) > 0 && trustLevelIcon && (
            <TrustReasonList reasons={trustReasons} levelIcon={trustLevelIcon} />
          )}
        </div>
      ) : searchActive ? (
        <p className="text-sm text-muted-foreground">
          Brak pozycji dla zapytania „{searchQuery.trim()}”.
        </p>
      ) : categoryFilter !== "all" ? (
        <p className="text-sm text-muted-foreground">{kosztorysFilterEmptyMessage(categoryFilter)}</p>
      ) : null}
    </section>
  );
}

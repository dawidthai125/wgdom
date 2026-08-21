/**
 * KL-7-UX-1 — Firma → Katalog KNR (read-only).
 * REUSE catalog-shared chrome · ZERO PLN / OUR RATE / VERIFY write / HTTP.
 */

import { useEffect, useMemo, useState } from "react";
import { BookMarked, History } from "lucide-react";
import {
  CatalogFreshnessToolbar,
  CatalogPager,
  catalogFreshnessDot,
  catalogFreshnessToneClass,
  formatCatalogDateTimePl,
} from "@/app/catalog-shared";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  KNR_CATALOG_UI_FRESHNESS_FILTERS,
  KNR_CATALOG_UI_PAGE_SIZE,
  KNR_CATALOG_UI_VERIFICATION_FILTERS,
  buildKnrCatalogUiRows,
  loadKnrCatalogEntriesForUi,
  paginateKnrCatalogUiRows,
  type KnrCatalogUiFreshnessFilter,
  type KnrCatalogUiRow,
  type KnrCatalogUiVerificationFilter,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui";

export function KnrCatalogPanel() {
  const [search, setSearch] = useState("");
  const [freshnessFilter, setFreshnessFilter] =
    useState<KnrCatalogUiFreshnessFilter>("ALL");
  const [verificationFilter, setVerificationFilter] =
    useState<KnrCatalogUiVerificationFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyRow, setHistoryRow] = useState<KnrCatalogUiRow | null>(null);
  const [tick, setTick] = useState(0);
  const [cloudHydrated, setCloudHydrated] = useState(false);

  // KL-7-P0 — hydrate local cache from cloud SSOT (read-only merge · anti-wipe).
  useEffect(() => {
    let cancelled = false;
    void import("@/lib/intelligent-estimator/knr-knowledge/knr-catalog-sync")
      .then(({ loadKnrCatalogStore }) => loadKnrCatalogStore())
      .then(() => {
        if (!cancelled) {
          setCloudHydrated(true);
          setTick((n) => n + 1);
        }
      })
      .catch(() => {
        if (!cancelled) setCloudHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loaded = useMemo(() => {
    void tick;
    return loadKnrCatalogEntriesForUi({ useDemoWhenEmpty: true });
  }, [tick]);

  const allRows = useMemo(
    () =>
      buildKnrCatalogUiRows({
        entries: loaded.entries,
        search: "",
        freshnessFilter: "ALL",
        verificationFilter: "ALL",
        isUxFixture: loaded.source === "ux1_demo",
      }),
    [loaded],
  );

  const summary = useMemo(() => {
    let fresh = 0;
    let stale = 0;
    let verified = 0;
    for (const r of allRows) {
      if (r.opsFreshness === "FRESH") fresh += 1;
      else stale += 1;
      if (r.verificationStatus === "VERIFIED") verified += 1;
    }
    return { total: allRows.length, fresh, stale, verified };
  }, [allRows]);

  const rows = useMemo(
    () =>
      buildKnrCatalogUiRows({
        entries: loaded.entries,
        search,
        freshnessFilter,
        verificationFilter,
        isUxFixture: loaded.source === "ux1_demo",
      }),
    [loaded, search, freshnessFilter, verificationFilter],
  );

  const pageData = useMemo(
    () => paginateKnrCatalogUiRows(rows, page, KNR_CATALOG_UI_PAGE_SIZE),
    [rows, page],
  );

  function onQueryChange(
    next: Partial<{
      search: string;
      freshness: KnrCatalogUiFreshnessFilter;
      verification: KnrCatalogUiVerificationFilter;
    }>,
  ): void {
    if (next.search != null) setSearch(next.search);
    if (next.freshness != null) setFreshnessFilter(next.freshness);
    if (next.verification != null) setVerificationFilter(next.verification);
    setPage(1);
  }

  return (
    <div
      className="space-y-3"
      data-knr-catalog-panel
      data-knr-source={loaded.source}
      data-knr-cloud-hydrated={cloudHydrated ? "1" : "0"}
    >
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="flex items-start gap-2">
          <BookMarked size={16} className="text-primary mt-0.5 shrink-0" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold">Katalog KNR</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Normy KNR (R/M/S), tożsamość i status weryfikacji — osobno od Naszego Katalogu
              Robót i cen materiałów. Tylko VERIFIED + ACTIVE może zasilać Host (poza tym
              panelem). Ten widok jest tylko do odczytu · bez PLN · bez discovery HTTP.
            </p>
          </div>
        </div>

        {loaded.source === "ux1_demo" && (
          <p
            className="text-[11px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200"
            role="status"
            data-knr-ux1-demo-banner
          >
            Lokalny katalog pusty — pokazano fixture UX-1 (klucz Owner evidence, puste R/M/S,
            status STRUCTURAL). To nie jest VERIFIED i nie zasila wyceny.
          </p>
        )}

        <CatalogFreshnessToolbar
          filters={KNR_CATALOG_UI_FRESHNESS_FILTERS}
          selected={freshnessFilter}
          onSelect={(id) => onQueryChange({ freshness: id })}
          search={search}
          onSearch={(raw) => onQueryChange({ search: raw })}
          searchPlaceholder="Kod KNR, opis, family…"
          searchAriaLabel="Wyszukaj w katalogu KNR"
        />

        <div className="flex flex-wrap gap-1.5">
          {KNR_CATALOG_UI_VERIFICATION_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onQueryChange({ verification: f.id })}
              aria-pressed={verificationFilter === f.id}
              aria-label={`Filtr weryfikacji: ${f.label}`}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border min-h-[40px]",
                verificationFilter === f.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span>
            Razem: <strong className="text-foreground">{summary.total}</strong>
          </span>
          <span>
            Aktualne: <strong className="text-foreground">{summary.fresh}</strong>
          </span>
          <span>
            Przeterminowane: <strong className="text-foreground">{summary.stale}</strong>
          </span>
          <span>
            Zweryfikowane: <strong className="text-foreground">{summary.verified}</strong>
          </span>
          <WgButton
            type="button"
            variant="ghost"
            className="!min-h-[36px] !px-2 !text-[11px]"
            onClick={() => {
              void import("@/lib/intelligent-estimator/knr-knowledge/knr-catalog-sync")
                .then(({ loadKnrCatalogStore }) => loadKnrCatalogStore())
                .finally(() => setTick((n) => n + 1));
            }}
            aria-label="Odśwież katalog lokalny / cloud"
          >
            Odśwież lokalnie
          </WgButton>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[960px]">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Lp.</th>
                <th className="px-2 py-2 font-medium">Kod KNR</th>
                <th className="px-2 py-2 font-medium">Opis</th>
                <th className="px-2 py-2 font-medium">j.m.</th>
                <th className="px-2 py-2 font-medium">R/M/S</th>
                <th className="px-2 py-2 font-medium">Family</th>
                <th className="px-2 py-2 font-medium">Weryfikacja</th>
                <th className="px-2 py-2 font-medium">Freshness</th>
                <th className="px-2 py-2 font-medium">Źródło</th>
                <th className="px-2 py-2 font-medium">Aktualizacja</th>
                <th className="px-2 py-2 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-muted-foreground"
                    data-knr-catalog-empty
                  >
                    Brak rekordów KNR w lokalnym katalogu.
                  </td>
                </tr>
              )}
              {pageData.items.map((row, i) => {
                const absIndex = (pageData.page - 1) * pageData.pageSize + i + 1;
                const open = expandedId === row.rowId;
                return (
                  <tr
                    key={row.rowId}
                    className="border-t border-border/60 align-top hover:bg-secondary/20"
                    data-knr-catalog-row={row.evidenceKeyV1}
                    data-verification={row.verificationStatus}
                    data-ops-freshness={row.opsFreshness}
                    data-ux-fixture={row.isUxFixture ? "1" : "0"}
                  >
                    <td className="px-2 py-2 text-muted-foreground">{absIndex}</td>
                    <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">
                      {row.displayCode}
                    </td>
                    <td className="px-2 py-2 max-w-[14rem]">
                      <span className="line-clamp-2">{row.description}</span>
                    </td>
                    <td className="px-2 py-2 tabular-nums">{row.unit}</td>
                    <td className="px-2 py-2 tabular-nums whitespace-nowrap">
                      {row.normsSummaryPl}
                    </td>
                    <td className="px-2 py-2">{row.family}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{row.verificationLabelPl}</td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium whitespace-nowrap",
                          catalogFreshnessToneClass(row.freshnessChrome),
                        )}
                      >
                        <span aria-hidden>{catalogFreshnessDot(row.freshnessChrome)}</span>
                        {row.freshnessLabelPl}
                      </span>
                    </td>
                    <td className="px-2 py-2 max-w-[10rem]">
                      <span className="line-clamp-2">{row.sourceLabelPl}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatCatalogDateTimePl(row.updatedAt)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1 min-w-[7rem]">
                        <WgButton
                          type="button"
                          variant="secondary"
                          className="!min-h-[36px] !px-2 !text-[11px]"
                          onClick={() => setExpandedId(open ? null : row.rowId)}
                          aria-expanded={open}
                          aria-label={`Szczegóły: ${row.displayCode}`}
                        >
                          {open ? "Ukryj" : "Szczegóły"}
                        </WgButton>
                        <WgButton
                          type="button"
                          variant="ghost"
                          className="!min-h-[36px] !px-2 !text-[11px]"
                          onClick={() => setHistoryRow(row)}
                          aria-label={`Historia: ${row.displayCode}`}
                        >
                          <History size={12} aria-hidden />
                          Historia
                        </WgButton>
                      </div>
                      {open && (
                        <div
                          className="mt-2 rounded-lg border border-border/70 bg-secondary/20 p-2 space-y-1 text-[11px] text-muted-foreground"
                          data-knr-catalog-details
                        >
                          <div>
                            <span className="font-medium text-foreground">evidenceKeyV1:</span>{" "}
                            {row.evidenceKeyV1}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">identityKeyV2:</span>{" "}
                            <span className="break-all">{row.identityKeyV2}</span>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Publisher:</span>{" "}
                            {row.publisher}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Edition:</span>{" "}
                            {row.edition}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Lifecycle:</span>{" "}
                            {row.lifecycleState}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Ostatnia weryfikacja:</span>{" "}
                            {formatCatalogDateTimePl(row.verifiedAt)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Źródła / Update:</span>{" "}
                            placeholder UX-1 — pełny pipeline w KL-7-P1/P2
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Porównaj:</span>{" "}
                            niedostępne w UX-1 (read-only)
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <CatalogPager
          page={pageData.page}
          totalPages={pageData.totalPages}
          total={pageData.total}
          pageSize={pageData.pageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {historyRow && (
        <div
          className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-2"
          data-knr-catalog-history
          role="dialog"
          aria-label="Historia KNR"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Historia — {historyRow.displayCode}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Append-only history store = KL-7-P1. UX-1: podgląd bieżącego rekordu (bez zapisu).
              </p>
            </div>
            <WgButton
              type="button"
              variant="secondary"
              className="!min-h-[36px]"
              onClick={() => setHistoryRow(null)}
            >
              Zamknij
            </WgButton>
          </div>
          <ul className="text-[11px] space-y-1 text-muted-foreground">
            <li>Utworzono: {formatCatalogDateTimePl(historyRow.entry.createdAt)}</li>
            <li>Aktualizacja: {formatCatalogDateTimePl(historyRow.updatedAt)}</li>
            <li>Weryfikacja: {formatCatalogDateTimePl(historyRow.verifiedAt)}</li>
            <li>Status: {historyRow.verificationLabelPl}</li>
            <li>contentHash: {historyRow.entry.contentHash || "—"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

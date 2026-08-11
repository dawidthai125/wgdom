/**
 * PRICE-MEMORY-CATALOG-01/03 — Firma → Nasz katalog cen.
 * Material candidates + Price Memory status · commercial margin · force refresh ONE key.
 * ZERO HTTP on open · seed ensure pushCloud=false.
 * UI polish: PL labels only — technical enums stay in data layer.
 */

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Tag } from "lucide-react";
import { useWorkCatalog } from "@/app/hooks/useWorkCatalog";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import { indexWorksById, getRegionSlice } from "@/lib/work-catalog";
import {
  OUR_PRICE_CATALOG_PAGE_SIZE,
  acceptForceRefreshCandidate,
  buildOurPriceCatalogRows,
  createEdgeResearchLeasePort,
  ensureOurPriceCatalogMaterialPurchaseSeed,
  forceResearchMaterialMarketPrice,
  paginateOurPriceCatalogRows,
  resetMaterialResearchSessionCooldownForTests,
  type MaterialCacheUsability,
  type OurPriceCatalogFreshnessFilter,
  type OurPriceCatalogRow,
  type PriceCandidate,
} from "@/lib/price-intelligence";
import { WgButton, WgField } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

function formatPln(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł`;
}

function formatObservedAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** User-facing freshness — enums CURRENT/STALE/MISSING stay in data. */
function freshnessLabelPl(freshness: MaterialCacheUsability): string {
  switch (freshness) {
    case "CURRENT":
      return "AKTUALNA";
    case "STALE":
      return "PRZETERMINOWANA";
    case "MISSING":
      return "BRAK CENY";
    default:
      return "NIEZNANA";
  }
}

function freshnessToneClass(freshness: MaterialCacheUsability): string {
  switch (freshness) {
    case "CURRENT":
      return "text-emerald-700 dark:text-emerald-400";
    case "STALE":
      return "text-orange-700 dark:text-orange-400";
    case "MISSING":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function freshnessDot(freshness: MaterialCacheUsability): string {
  switch (freshness) {
    case "CURRENT":
      return "🟢";
    case "STALE":
      return "🟠";
    case "MISSING":
      return "🔴";
    default:
      return "⚪";
  }
}

function formatPriceChangeLines(row: OurPriceCatalogRow): {
  primary: string;
  secondary?: string;
  tone: "up" | "down" | "flat" | "unknown";
} {
  if (row.priceChange.status === "UNKNOWN") {
    return { primary: "Brak danych porównawczych", tone: "unknown" };
  }
  const d = row.priceChange.deltaPln ?? 0;
  const p = row.priceChange.deltaPct ?? 0;
  const sign = d > 0 ? "+" : "";
  const pln = `${sign}${d.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł`;
  const pct = `${sign}${p.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%`;
  const tone =
    row.priceChange.direction === "up"
      ? "up"
      : row.priceChange.direction === "down"
        ? "down"
        : "flat";
  return { primary: pln, secondary: pct, tone };
}

function formatSourceLabel(row: OurPriceCatalogRow): string {
  const origins = row.sourceCoverage.origins.filter(Boolean);
  if (origins.length === 0) return "—";
  return origins.join(", ");
}

function originHistoryLabel(origin: string): string {
  const o = String(origin || "").trim().toLowerCase();
  if (o === "wgdom") return "Zakup / WGDOM";
  if (o === "leroy" || o === "leroymerlin") return "Leroy Merlin";
  if (o === "castorama") return "Castorama";
  if (o === "obi") return "OBI";
  return origin || "—";
}

const FRESHNESS_FILTERS: { id: OurPriceCatalogFreshnessFilter; label: string }[] = [
  { id: "ALL", label: "Wszystkie" },
  { id: "CURRENT", label: "Aktualne" },
  { id: "STALE", label: "Przeterminowane" },
  { id: "MISSING", label: "Brak ceny" },
];

export function OurPriceCatalogPanel() {
  const { session } = useAdminAccess();
  const isSuperAdmin = session ? adminIsSuperAdmin(session.role) : false;
  const {
    store,
    reload,
    updateCommercialMargin,
    applyGlobalCommercialMarginFloor,
  } = useWorkCatalog();

  const [search, setSearch] = useState("");
  const [freshnessFilter, setFreshnessFilter] =
    useState<OurPriceCatalogFreshnessFilter>("ALL");
  const [page, setPage] = useState(1);
  const [globalMargin, setGlobalMargin] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pendingAccept, setPendingAccept] = useState<{
    row: OurPriceCatalogRow;
    candidate: PriceCandidate;
  } | null>(null);
  const [errorPl, setErrorPl] = useState<string | null>(null);
  const [marginDraft, setMarginDraft] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [seedReady, setSeedReady] = useState(false);

  // CATALOG-03: local purchase seed · pushCloud=false · ZERO live HTTP
  useEffect(() => {
    ensureOurPriceCatalogMaterialPurchaseSeed({ pushCloud: false });
    reload();
    setSeedReady(true);
  }, [reload]);

  const allRows = useMemo(
    () =>
      seedReady
        ? buildOurPriceCatalogRows({
            store,
            search: "",
            freshnessFilter: "ALL",
          })
        : [],
    [store, seedReady],
  );

  const summary = useMemo(() => {
    let current = 0;
    let stale = 0;
    let missing = 0;
    for (const r of allRows) {
      if (r.freshness === "CURRENT") current += 1;
      else if (r.freshness === "STALE") stale += 1;
      else if (r.freshness === "MISSING") missing += 1;
    }
    return {
      total: allRows.length,
      current,
      stale,
      missing,
      labor: 0,
    };
  }, [allRows]);

  const rows = useMemo(
    () =>
      seedReady
        ? buildOurPriceCatalogRows({
            store,
            search,
            freshnessFilter,
          })
        : [],
    [store, search, freshnessFilter, seedReady],
  );

  const pageData = useMemo(
    () => paginateOurPriceCatalogRows(rows, page, OUR_PRICE_CATALOG_PAGE_SIZE),
    [rows, page],
  );

  async function onSaveMargin(row: OurPriceCatalogRow): Promise<void> {
    const raw = marginDraft[row.workId] ?? String(row.marginPct ?? "");
    const n = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      setErrorPl("Nieprawidłowa marża.");
      return;
    }
    setErrorPl(null);
    const res = await updateCommercialMargin(row.workId, n);
    if (!res.ok) setErrorPl(res.message);
  }

  async function onApplyGlobal(): Promise<void> {
    const n = Number(String(globalMargin).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      setErrorPl("Podaj poprawną minimalną marżę %.");
      return;
    }
    setErrorPl(null);
    const ids = rows.map((r) => r.workId);
    const res = await applyGlobalCommercialMarginFloor(ids, n);
    if (!res.ok) setErrorPl(res.message);
  }

  async function onForceRefresh(row: OurPriceCatalogRow): Promise<void> {
    if (busyKey) return;
    setBusyKey(row.workId);
    setErrorPl(null);
    setPendingAccept(null);
    try {
      resetMaterialResearchSessionCooldownForTests();
      const worksById = indexWorksById(getRegionSlice(store)?.works ?? []);
      const claimantId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `owner_${crypto.randomUUID()}`
          : `owner_${Date.now()}`;
      const result = await forceResearchMaterialMarketPrice({
        materialKey: row.materialKey,
        catalogWorkId: row.workId,
        namePl: row.namePl,
        unit: row.unit,
        region: store.activeRegion,
        claimantId,
        lease: createEdgeResearchLeasePort(),
        worksById,
        forceRefresh: true,
      });
      if (!result.ok || !result.candidate) {
        setErrorPl(
          result.error === "current_reuse_no_research"
            ? "Aktualizacja zablokowana — cena jest już uznana za aktualną. Spróbuj ponownie z wymuszeniem."
            : result.error === "rate_limited" || result.error === "cooldown"
              ? "Odczekaj chwilę przed kolejną aktualizacją tego materiału."
              : "Nie udało się pobrać ceny rynkowej. Spróbuj ponownie.",
        );
        return;
      }
      setPendingAccept({ row, candidate: result.candidate });
    } catch (e) {
      setErrorPl(
        e instanceof Error ? e.message : "Nie udało się pobrać ceny rynkowej.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function onAcceptPending(): Promise<void> {
    if (!pendingAccept || busyKey) return;
    setBusyKey(pendingAccept.row.workId);
    setErrorPl(null);
    try {
      const accepted = await acceptForceRefreshCandidate({
        candidate: pendingAccept.candidate,
        expectedUnit: pendingAccept.row.unit,
      });
      if (!accepted.ok || !accepted.persisted) {
        setErrorPl(accepted.error || "Nie udało się zapisać nowej ceny.");
        return;
      }
      setPendingAccept(null);
      reload();
    } catch (e) {
      setErrorPl(e instanceof Error ? e.message : "Nie udało się zapisać nowej ceny.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-3" data-our-price-catalog>
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Tag size={16} className="text-primary mt-0.5 shrink-0" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold">Nasz katalog cen</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Nasz katalog materiałów — aktualność cen: AKTUALNA / PRZETERMINOWANA / BRAK
              CENY. Marża WGDOM jest ustawiana osobno.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Ceny są przechowywane w Pamięci Cen i mogą zostać ręcznie zaktualizowane dla
              wybranego materiału.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end flex-wrap">
          <div className="flex flex-wrap gap-1.5 order-2 sm:order-1">
            {FRESHNESS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFreshnessFilter(f.id);
                  setPage(1);
                }}
                aria-pressed={freshnessFilter === f.id}
                aria-label={`Filtr: ${f.label}`}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border min-h-[40px]",
                  freshnessFilter === f.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex-1 min-w-[12rem] space-y-1 order-1 sm:order-2">
            <span className="text-[11px] text-muted-foreground">Wyszukiwarka</span>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className={cn(
                  "w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm",
                  WG_TOUCH_MIN,
                )}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Wpisz nazwę materiału lub klucz materiału..."
                aria-label="Wyszukaj materiał"
              />
            </div>
          </label>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end border-t border-border/60 pt-3">
            <WgField
              label="Minimalna marża dla wszystkich (%)"
              value={globalMargin}
              onChange={(e) => setGlobalMargin(e.target.value)}
              inputMode="decimal"
              className="sm:max-w-[14rem]"
            />
            <WgButton type="button" variant="secondary" onClick={() => void onApplyGlobal()}>
              Zastosuj
            </WgButton>
          </div>
        )}

        {errorPl && (
          <p className="text-xs text-destructive" role="alert">
            {errorPl}
          </p>
        )}

        {pendingAccept && (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2"
            data-price-catalog-accept
          >
            <p className="text-xs font-medium">
              Potwierdź nową cenę rynkową — {pendingAccept.row.namePl}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Propozycja: {formatPln(pendingAccept.candidate.priceNet)}. Marża handlowa bez
              zmian. Zapis dopiero po potwierdzeniu.
            </p>
            <div className="flex flex-wrap gap-2">
              <WgButton
                type="button"
                onClick={() => void onAcceptPending()}
                disabled={busyKey === pendingAccept.row.workId}
              >
                Zapisz nową cenę
              </WgButton>
              <WgButton
                type="button"
                variant="secondary"
                onClick={() => setPendingAccept(null)}
              >
                Anuluj
              </WgButton>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[860px]">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Lp.</th>
                <th className="px-2 py-2 font-medium">Materiał</th>
                <th className="px-2 py-2 font-medium">Jedn.</th>
                <th className="px-2 py-2 font-medium">Cena bazowa</th>
                <th className="px-2 py-2 font-medium">Aktualność</th>
                <th className="px-2 py-2 font-medium">Data / godzina</th>
                <th className="px-2 py-2 font-medium">Zmiana</th>
                <th className="px-2 py-2 font-medium">Marża</th>
                <th className="px-2 py-2 font-medium">Cena z marżą</th>
                <th className="px-2 py-2 font-medium">Źródło</th>
                <th className="px-2 py-2 font-medium">Akcja</th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((row, i) => {
                const absIndex = (pageData.page - 1) * pageData.pageSize + i + 1;
                const change = formatPriceChangeLines(row);
                return (
                  <tr
                    key={row.workId}
                    className="border-t border-border/60 align-top hover:bg-secondary/20"
                    data-price-catalog-row={row.workId}
                    data-freshness={row.freshness}
                  >
                    <td className="px-2 py-2 text-muted-foreground">{absIndex}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() =>
                          setExpandedId((id) => (id === row.workId ? null : row.workId))
                        }
                        aria-expanded={expandedId === row.workId}
                        aria-label={`Szczegóły: ${row.namePl}`}
                      >
                        {row.namePl}
                      </button>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {row.materialKey}
                      </div>
                      {expandedId === row.workId && (
                        <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                          <div>
                            Data ceny:{" "}
                            {row.priceObservedAt
                              ? formatObservedAt(row.priceObservedAt)
                              : "—"}
                          </div>
                          <div>
                            Marża zaktualizowana:{" "}
                            {row.commercialPricing?.updatedAt
                              ? formatObservedAt(row.commercialPricing.updatedAt)
                              : "—"}
                          </div>
                          {(row.history ?? []).slice(-5).reverse().map((h, hi) => (
                            <div key={`${h.updatedAt}-${hi}`}>
                              Historia {formatObservedAt(h.updatedAt)} · {formatPln(h.price)} ·{" "}
                              {originHistoryLabel(h.origin)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">{row.unit || "—"}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.basePrice == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatPln(row.basePrice)
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium whitespace-nowrap",
                          freshnessToneClass(row.freshness),
                        )}
                        title={freshnessLabelPl(row.freshness)}
                      >
                        <span aria-hidden>{freshnessDot(row.freshness)}</span>
                        {freshnessLabelPl(row.freshness)}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.priceObservedAt
                        ? formatObservedAt(row.priceObservedAt)
                        : "—"}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-[10px]">
                      <div
                        className={cn(
                          change.tone === "up" &&
                            "text-emerald-700 dark:text-emerald-400",
                          change.tone === "down" && "text-destructive",
                          change.tone === "unknown" && "text-muted-foreground",
                        )}
                      >
                        <div>{change.primary}</div>
                        {change.secondary != null && <div>{change.secondary}</div>}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1">
                          <input
                            className="w-14 rounded border border-border bg-background px-1 py-1 text-xs min-h-[36px]"
                            value={
                              marginDraft[row.workId] ??
                              (row.marginUnset ? "" : String(row.marginPct))
                            }
                            placeholder="—"
                            onChange={(e) =>
                              setMarginDraft((d) => ({
                                ...d,
                                [row.workId]: e.target.value,
                              }))
                            }
                            inputMode="decimal"
                            aria-label={`Marża ${row.namePl}`}
                          />
                          <span className="text-muted-foreground">%</span>
                          <button
                            type="button"
                            className="text-[10px] text-primary underline min-h-[36px] px-1"
                            onClick={() => void onSaveMargin(row)}
                            aria-label={`Zapisz marżę: ${row.namePl}`}
                          >
                            OK
                          </button>
                        </div>
                      ) : row.marginUnset ? (
                        <span className="text-muted-foreground">Brak marży</span>
                      ) : (
                        `${row.marginPct}%`
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.basePrice == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : row.sellPrice == null ? (
                        <span className="text-muted-foreground">Brak marży</span>
                      ) : (
                        formatPln(row.sellPrice)
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-[11px]">{formatSourceLabel(row)}</span>
                    </td>
                    <td className="px-2 py-2">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] min-h-[40px]",
                            "hover:bg-secondary/50 disabled:opacity-50",
                          )}
                          disabled={busyKey === row.workId}
                          onClick={() => void onForceRefresh(row)}
                          title={
                            row.freshness === "MISSING"
                              ? "Pobierz cenę rynkową dla tego materiału"
                              : "Odśwież cenę rynkową dla tego materiału"
                          }
                          aria-label={`Aktualizuj cenę: ${row.namePl}`}
                        >
                          <RefreshCw size={12} aria-hidden />
                          Aktualizuj
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageData.items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                    Brak materiałów dla bieżącego filtra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 px-3 py-3 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Łącznie materiałów:{" "}
              <span className="font-medium text-foreground">{summary.total}</span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400">
              🟢 Aktualne: {summary.current}
            </span>
            <span className="text-orange-700 dark:text-orange-400">
              🟠 Przeterminowane: {summary.stale}
            </span>
            <span className="text-destructive">🔴 Brak ceny: {summary.missing}</span>
            <span title="Robocizna nie jest pozycją tego katalogu materiałów">
              ⚪ Robocizna: {summary.labor}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span>
              Widok: {pageData.total} · strona {pageData.page} z {pageData.totalPages} ·{" "}
              {OUR_PRICE_CATALOG_PAGE_SIZE} na stronę
            </span>
            <div className="flex gap-1">
              <WgButton
                type="button"
                variant="secondary"
                disabled={pageData.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Poprzednia strona"
              >
                Poprzednia
              </WgButton>
              <WgButton
                type="button"
                variant="secondary"
                disabled={pageData.page >= pageData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Następna strona"
              >
                Następna
              </WgButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

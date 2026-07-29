import { useCallback, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, ArrowLeft, Search } from "lucide-react";
import {
  MARKET_ORIGIN_IDS,
  MARKET_ORIGIN_LABELS_PL,
  MARKET_REGION_CODES,
  captureMarketQuotesSnapshot,
  commitMarketQuotesImport,
  createSeededMarketWorkMappingStore,
  loadWorkCatalogStoreLocal,
  marketRegionLabelPl,
  previewMarketCsvImport,
  restoreMarketQuotesSnapshot,
  type MarketCsvPreviewReport,
  type MarketOriginId,
  type MarketQuotesRollbackSnapshot,
  type MarketRegionCode,
} from "@/lib/work-catalog";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";
import {
  buildCsvPreviewViewModel,
  csvPreviewStatusLabelPl,
  DEFAULT_CSV_PREVIEW_REGION,
  filterCsvPreviewTableRows,
  formatCsvPreviewConfidence,
  type CsvPreviewDisplayStatus,
} from "@/app/work-catalog/work-catalog-csv-import-preview";

type Props = {
  workNameById: ReadonlyMap<string, string>;
  onBack: () => void;
  /** Po udanym commit / rollback — odśwież listę Biblioteki. */
  onCatalogMutated?: () => void;
};

const STATUS_CHIP_CLASS: Record<CsvPreviewDisplayStatus, string> = {
  matched: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  low_confidence: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  unmatched: "bg-orange-500/15 text-orange-900 dark:text-orange-100",
  rejected: "bg-red-500/15 text-red-800 dark:text-red-200",
  ignored: "bg-muted text-muted-foreground",
};

const SUMMARY_KEYS: {
  key: keyof ReturnType<typeof buildCsvPreviewViewModel>["summary"];
  status: CsvPreviewDisplayStatus | null;
  label: string;
}[] = [
  { key: "matched", status: "matched", label: "Dopasowane" },
  { key: "lowConfidence", status: "low_confidence", label: "Niska pewność" },
  { key: "unmatched", status: "unmatched", label: "Bez mapowania" },
  { key: "rejected", status: "rejected", label: "Odrzucone" },
  { key: "ignored", status: "ignored", label: "Pominięte" },
];

function formatCommitStatusPl(status: string, blocked?: string): string {
  switch (status) {
    case "committed":
      return "Zapisano ceny rynkowe w katalogu.";
    case "noop":
      return "Brak zmian do zapisania (import nie zmienił marketQuotes).";
    case "blocked":
      return blocked === "legacy_only_blocks_work"
        ? "Zapis zablokowany — tryb katalogu legacy_only."
        : "Zapis zablokowany przez tryb katalogu.";
    case "rolled-back":
      return "Zapis nieudany — przywrócono poprzedni stan lokalny.";
    default:
      return status;
  }
}

export function WorkCatalogCsvImportPreviewPanel({
  workNameById,
  onBack,
  onCatalogMutated,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [defaultOrigin, setDefaultOrigin] = useState<MarketOriginId>("kb_pl");
  const [regionFilter, setRegionFilter] = useState<MarketRegionCode>(DEFAULT_CSV_PREVIEW_REGION);
  const [statusFilter, setStatusFilter] = useState<CsvPreviewDisplayStatus | "all">("all");
  const [rawReport, setRawReport] = useState<MarketCsvPreviewReport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<MarketQuotesRollbackSnapshot | null>(null);

  const viewModel = useMemo(() => {
    if (!rawReport) return null;
    return buildCsvPreviewViewModel(rawReport, regionFilter, workNameById);
  }, [rawReport, regionFilter, workNameById]);

  const tableRows = useMemo(() => {
    if (!viewModel) return [];
    return filterCsvPreviewTableRows(viewModel.rows, statusFilter);
  }, [viewModel, statusFilter]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setRawReport(null);
    setParseError(null);
    setStatusFilter("all");
    setCommitMessage(null);
    setCommitError(null);
    setUndoSnapshot(null);

    if (!file) {
      setFileName(null);
      setCsvText(null);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsvText(text);
    };
    reader.onerror = () => {
      setParseError("Nie udało się odczytać pliku CSV");
      setCsvText(null);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!csvText?.trim()) {
      setParseError("Wybierz plik CSV przed analizą");
      return;
    }

    setAnalyzing(true);
    setParseError(null);
    setCommitMessage(null);
    setCommitError(null);
    setUndoSnapshot(null);

    try {
      const report = previewMarketCsvImport(csvText, {
        defaultOrigin,
        mappingStore: createSeededMarketWorkMappingStore({
          works: [...workNameById.keys()].map((id) => ({ id })),
        }),
        fallbackUpdatedAt: new Date().toISOString(),
      });

      if (report.parse.rows.length === 0 && report.rejected.length === 0) {
        setParseError("Plik CSV jest pusty lub nie zawiera poprawnych wierszy");
        setRawReport(null);
      } else {
        setRawReport(report);
        setStatusFilter("all");
      }
    } catch {
      setParseError("Błąd analizy CSV — sprawdź format pliku");
      setRawReport(null);
    } finally {
      setAnalyzing(false);
    }
  }, [csvText, defaultOrigin, workNameById]);

  /** IC-1: wyłącznie commitMarketQuotesImport — bez bezpośredniego apply. */
  const handleCommit = useCallback(async () => {
    if (!rawReport) return;
    setCommitting(true);
    setCommitError(null);
    setCommitMessage(null);

    try {
      const before = loadWorkCatalogStoreLocal();
      const snapshot = captureMarketQuotesSnapshot(before);
      const report = await commitMarketQuotesImport(rawReport, {
        region: before.activeRegion,
      });

      setCommitMessage(formatCommitStatusPl(report.status, report.blocked));

      if (report.status === "committed") {
        setUndoSnapshot(snapshot);
        onCatalogMutated?.();
      } else if (report.status === "rolled-back") {
        setUndoSnapshot(null);
        onCatalogMutated?.();
      } else if (report.status === "blocked") {
        setUndoSnapshot(null);
        setCommitError(formatCommitStatusPl(report.status, report.blocked));
        setCommitMessage(null);
      }
    } catch {
      setCommitError("Nie udało się zapisać importu cen rynkowych.");
      setUndoSnapshot(null);
    } finally {
      setCommitting(false);
    }
  }, [rawReport, onCatalogMutated]);

  /** Rollback lokalny REUSE P3.2 snapshot + istniejący write-router. */
  const handleRollback = useCallback(async () => {
    if (!undoSnapshot) return;
    setRollingBack(true);
    setCommitError(null);

    try {
      const current = loadWorkCatalogStoreLocal();
      const restored = restoreMarketQuotesSnapshot(current, undoSnapshot);
      if (!restored.restored) {
        setCommitError("Nie można cofnąć — uszkodzony lub nieaktualny snapshot.");
        return;
      }

      const updatedAtIso = new Date().toISOString();
      const saveResult = await saveWorkCatalogRouted(restored.store, {
        updatedAtIso,
        previousStore: current,
      });

      if (!saveResult.ok) {
        setCommitError("Cofnięcie lokalne OK — synchronizacja chmury nie powiodła się.");
        onCatalogMutated?.();
        setUndoSnapshot(null);
        return;
      }
      if (!saveResult.saved) {
        setCommitError("Cofnięcie zablokowane przez tryb katalogu.");
        return;
      }

      setCommitMessage("Przywrócono marketQuotes sprzed ostatniego importu.");
      setUndoSnapshot(null);
      onCatalogMutated?.();
    } catch {
      setCommitError("Nie udało się cofnąć ostatniego importu.");
    } finally {
      setRollingBack(false);
    }
  }, [undoSnapshot, onCatalogMutated]);

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background"
      data-wc-p33-import-panel
    >
      <header className="shrink-0 border-b border-border px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted touch-manipulation"
            aria-label="Wróć do listy robót"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">
              Import CSV — ceny rynkowe
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Podgląd → zapis marketQuotes · bez zmiany ceny firmy
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="work-catalog-csv-file"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Plik CSV
              </label>
              <input
                ref={fileInputRef}
                id="work-catalog-csv-file"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="block w-full min-h-[44px] text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
              {fileName && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{fileName}</p>
              )}
            </div>

            <div className="w-full sm:w-40">
              <label
                htmlFor="work-catalog-csv-origin"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Domyślne źródło
              </label>
              <select
                id="work-catalog-csv-origin"
                value={defaultOrigin}
                onChange={(e) => setDefaultOrigin(e.target.value as MarketOriginId)}
                className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
              >
                {MARKET_ORIGIN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {MARKET_ORIGIN_LABELS_PL[id]}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-44">
              <label
                htmlFor="work-catalog-csv-region"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Filtr regionu
              </label>
              <select
                id="work-catalog-csv-region"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as MarketRegionCode)}
                className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
              >
                {MARKET_REGION_CODES.map((code) => (
                  <option key={code} value={code}>
                    {marketRegionLabelPl(code)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!csvText || analyzing}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground disabled:opacity-50 sm:w-auto touch-manipulation"
            >
              <Search size={18} aria-hidden />
              {analyzing ? "Analiza…" : "Analiza"}
            </button>
          </div>

          {viewModel && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void handleCommit()}
                disabled={committing || rollingBack}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto touch-manipulation"
                data-wc-p33-commit
              >
                {committing ? "Zapisywanie…" : "Zastosuj do katalogu"}
              </button>
              <button
                type="button"
                onClick={() => void handleRollback()}
                disabled={!undoSnapshot || committing || rollingBack}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground disabled:opacity-50 sm:w-auto touch-manipulation"
                data-wc-p33-rollback
              >
                {rollingBack ? "Cofanie…" : "Cofnij ostatni import"}
              </button>
            </div>
          )}

          {parseError && (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {parseError}
            </p>
          )}
          {commitError && (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {commitError}
            </p>
          )}
          {commitMessage && (
            <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-200" role="status">
              {commitMessage}
            </p>
          )}
        </div>

        {viewModel && (
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Podsumowanie analizy CSV"
          >
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`min-h-[44px] rounded-full px-3 text-xs font-medium touch-manipulation ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card"
              }`}
            >
              Wszystkie ({viewModel.summary.total})
            </button>
            {SUMMARY_KEYS.map(({ key, status, label }) => {
              const count = viewModel.summary[key];
              if (typeof count !== "number") return null;
              const selected = statusFilter === status;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => status && setStatusFilter(status)}
                  disabled={!status}
                  className={`min-h-[44px] rounded-full px-3 text-xs font-medium touch-manipulation ${
                    selected && status
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 md:px-6">
        {!viewModel ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <FileSpreadsheet
              size={32}
              className="mx-auto mb-3 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">Wgraj plik CSV i uruchom analizę</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Najpierw podgląd dopasowań, potem „Zastosuj do katalogu” zapisze marketQuotes
              (region aktywny katalogu). Cena firmy nie jest zmieniana.
            </p>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Brak wierszy w wybranym filtrze</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Źródło</th>
                  <th className="px-3 py-2.5 font-medium">ID zewnętrzne</th>
                  <th className="px-3 py-2.5 font-medium">Robota WGDOM</th>
                  <th className="px-3 py-2.5 font-medium">Region</th>
                  <th className="px-3 py-2.5 font-medium">Confidence</th>
                  <th className="px-3 py-2.5 font-medium">Powód</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={`${row.rowIndex}-${row.lineNumber ?? "x"}`} className="border-b border-border/60">
                    <td className="px-3 py-2.5">{row.originLabel}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{row.externalId ?? "—"}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5" title={row.workLabel}>
                      {row.workLabel}
                    </td>
                    <td className="px-3 py-2.5">{row.regionLabel ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatCsvPreviewConfidence(row.confidence)}</td>
                    <td className="max-w-[220px] px-3 py-2.5 text-xs text-muted-foreground">
                      {row.reason}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_CHIP_CLASS[row.displayStatus]
                        }`}
                      >
                        {csvPreviewStatusLabelPl(row.displayStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

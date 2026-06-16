import { useMemo, useState } from "react";
import { Download, Loader2, Package, Search } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import {
  buildMeasurementCatalogRows,
  catalogAvailableYears,
  filterMeasurementCatalogRows,
  MEASUREMENT_CATALOG_STATUS_LABELS,
  type MeasurementCatalogFilters,
  type MeasurementCatalogRow,
} from "@/lib/electrical-measurements/measurement-catalog";
import {
  catalogDocxFileName,
  downloadCatalogMultiZip,
  downloadCatalogSingleZip,
} from "@/lib/electrical-measurements/measurement-catalog-zip";
import {
  downloadEmDocxDocument,
  emDocxDocumentKindLabel,
  EM_DOCX_DOCUMENT_KINDS,
  type EmDocxDocumentKind,
} from "@/lib/electrical-measurements/generate-em-docx";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementCatalogStatus,
  ElectricalMeasurementRegistryState,
} from "@/lib/electrical-measurements/types";

const DOC_DOWNLOAD_LABELS: Record<EmDocxDocumentKind, string> = {
  protokol: "Pobierz Protokół",
  "dane-informacyjne": "Pobierz Dane Informacyjne",
  "badanie-adsc": "Pobierz ADSC",
  "badanie-rezystancji": "Pobierz Rezystancję",
  "parametry-rcd": "Pobierz RCD",
};

function statusBadgeClass(status: MeasurementCatalogRow["status"]): string {
  if (status === "ACTIVE") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "TEST") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

export function MeasurementCatalogPanel({
  jobs,
  measurements,
  registry,
  onOpenJob,
}: {
  jobs: Job[];
  measurements: ElectricalMeasurement[];
  registry: ElectricalMeasurementRegistryState;
  onOpenJob?: (jobId: string) => void;
}) {
  const allRows = useMemo(
    () => buildMeasurementCatalogRows(measurements, registry, jobs),
    [measurements, registry, jobs],
  );

  const [filters, setFilters] = useState<MeasurementCatalogFilters>({ status: "ALL" });
  const [selectedRapId, setSelectedRapId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [downloadingKind, setDownloadingKind] = useState<EmDocxDocumentKind | null>(null);

  const filteredRows = useMemo(
    () => filterMeasurementCatalogRows(allRows, filters),
    [allRows, filters],
  );

  const years = useMemo(() => catalogAvailableYears(allRows), [allRows]);

  const selectedRow = useMemo(
    () => filteredRows.find((r) => r.id === selectedRapId) ?? allRows.find((r) => r.id === selectedRapId) ?? null,
    [filteredRows, allRows, selectedRapId],
  );

  const selectedJob = selectedRow ? jobs.find((j) => j.id === selectedRow.jobId) ?? null : null;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAllVisible = () => {
    const packable = filteredRows.filter((r) => r.measurement && r.status !== "CANCELLED");
    const allChecked = packable.length > 0 && packable.every((r) => checkedIds.has(r.id));
    setCheckedIds((prev) => {
      const n = new Set(prev);
      if (allChecked) {
        for (const r of packable) n.delete(r.id);
      } else {
        for (const r of packable) n.add(r.id);
      }
      return n;
    });
  };

  const checkedRows = useMemo(
    () => allRows.filter((r) => checkedIds.has(r.id) && r.measurement && r.status !== "CANCELLED"),
    [allRows, checkedIds],
  );

  const handleDownloadDoc = async (kind: EmDocxDocumentKind) => {
    if (!selectedRow?.measurement || !selectedJob) return;
    setDownloadingKind(kind);
    try {
      await downloadEmDocxDocument(kind, { measurement: selectedRow.measurement, job: selectedJob });
      toast.success(`Pobrano: ${catalogDocxFileName(selectedRow.rapNumber, kind)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd generowania DOCX");
    } finally {
      setDownloadingKind(null);
    }
  };

  const handleSingleZip = async () => {
    if (!selectedRow?.measurement || !selectedJob) return;
    setBusy(true);
    const res = await downloadCatalogSingleZip(selectedRow, selectedJob);
    setBusy(false);
    if (res.ok) toast.success(`Pobrano ${selectedRow.rapNumber}.zip`);
    else toast.error(res.error);
  };

  const handleMultiZip = async () => {
    if (checkedRows.length === 0) {
      toast.error("Zaznacz co najmniej jeden aktywny raport");
      return;
    }
    setBusy(true);
    const res = await downloadCatalogMultiZip(checkedRows, jobs);
    setBusy(false);
    if (res.ok) toast.success(`Pobrano archiwum (${checkedRows.length} raportów)`);
    else toast.error(res.error);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 min-h-0">
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Rok</label>
            <select
              value={filters.year ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value || undefined }))}
              className="mt-0.5 block px-3 py-2 rounded-lg border border-border bg-card text-sm min-w-[100px]"
            >
              <option value="">Wszystkie</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Numer RAP</label>
            <input
              value={filters.rapQuery ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, rapQuery: e.target.value }))}
              placeholder="RAP-45-2026"
              className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Adres</label>
            <div className="relative mt-0.5">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filters.addressQuery ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, addressQuery: e.target.value }))}
                placeholder="Kleczkowska…"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</label>
            <select
              value={filters.status ?? "ALL"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as MeasurementCatalogFilters["status"],
                }))
              }
              className="mt-0.5 block px-3 py-2 rounded-lg border border-border bg-card text-sm min-w-[120px]"
            >
              <option value="ALL">Wszystkie</option>
              {(Object.keys(MEASUREMENT_CATALOG_STATUS_LABELS) as ElectricalMeasurementCatalogStatus[]).map((s) => (
                <option key={s} value={s}>
                  {MEASUREMENT_CATALOG_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {checkedRows.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleMultiZip()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
            Pobierz wybrane ZIP ({checkedRows.length})
          </button>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      aria-label="Zaznacz widoczne"
                      onChange={toggleAllVisible}
                      checked={
                        filteredRows.filter((r) => r.measurement && r.status !== "CANCELLED").length > 0 &&
                        filteredRows
                          .filter((r) => r.measurement && r.status !== "CANCELLED")
                          .every((r) => checkedIds.has(r.id))
                      }
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Numer RAP</th>
                  <th className="px-3 py-2 font-medium hidden sm:table-cell">Data</th>
                  <th className="px-3 py-2 font-medium">Adres</th>
                  <th className="px-3 py-2 font-medium hidden md:table-cell">Pomiarowiec</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Brak raportów w katalogu.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const active = selectedRapId === row.id;
                    const canPack = row.measurement != null && row.status !== "CANCELLED";
                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer transition-colors ${active ? "bg-primary/8" : "hover:bg-secondary/40"}`}
                        onClick={() => setSelectedRapId(row.id)}
                      >
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checkedIds.has(row.id)}
                            disabled={!canPack}
                            onChange={() => toggleCheck(row.id)}
                            aria-label={`Zaznacz ${row.rapNumber}`}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium font-mono text-xs">{row.rapNumber}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.measurementDate}</td>
                        <td className="px-3 py-2.5 truncate max-w-[180px]">{row.address}</td>
                        <td className="px-3 py-2.5 truncate max-w-[140px] hidden md:table-cell text-muted-foreground">
                          {row.technicianName}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}
                          >
                            {MEASUREMENT_CATALOG_STATUS_LABELS[row.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{filteredRows.length} raport(ów) · źródło: kw-electrical-measurements + registry</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4 min-w-0 xl:sticky xl:top-0 self-start">
        {!selectedRow ? (
          <p className="text-sm text-muted-foreground">Kliknij raport na liście, aby zobaczyć szczegóły i pobierać dokumenty.</p>
        ) : (
          <>
            <div>
              <h2 className="font-semibold text-base font-mono">{selectedRow.rapNumber}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {MEASUREMENT_CATALOG_STATUS_LABELS[selectedRow.status]}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Data</dt>
                <dd>{selectedRow.measurementDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Robota</dt>
                <dd className="flex items-center gap-2 flex-wrap">
                  <span>{selectedRow.jobTitle}</span>
                  {onOpenJob && (
                    <button
                      type="button"
                      onClick={() => onOpenJob(selectedRow.jobId)}
                      className="text-xs text-primary hover:underline"
                    >
                      Otwórz w Pomiary
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pomiarowiec</dt>
                <dd>{selectedRow.technicianName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Model miernika</dt>
                <dd>{selectedRow.meterModel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Nr miernika</dt>
                <dd>{selectedRow.meterSerialNumber}</dd>
              </div>
            </dl>

            {selectedRow.measurement && selectedJob ? (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dokumenty</p>
                <div className="flex flex-col gap-1.5">
                  {EM_DOCX_DOCUMENT_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      disabled={downloadingKind != null || busy}
                      onClick={() => void handleDownloadDoc(kind)}
                      className="flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50"
                      title={emDocxDocumentKindLabel(kind)}
                    >
                      {downloadingKind === kind ? (
                        <Loader2 size={14} className="animate-spin shrink-0" />
                      ) : (
                        <Download size={14} className="shrink-0" />
                      )}
                      {DOC_DOWNLOAD_LABELS[kind]}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSingleZip()}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/15 disabled:opacity-50 mt-1"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                    Pobierz komplet ZIP
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground border-t border-border pt-3">
                Raport anulowany — brak dokumentów do pobrania.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

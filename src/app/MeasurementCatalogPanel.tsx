import { useMemo, useState } from "react";
import { Download, Loader2, Package, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import { JobElectricalMeasurementsPanel } from "@/app/JobElectricalMeasurementsPanel";
import type { AdminSession } from "@/lib/admin-auth";
import { RapRegistryPanel } from "@/app/RapRegistryPanel";
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
  catalogSingleZipDownloadName,
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
  ElectricalMeasurementSettings,
} from "@/lib/electrical-measurements/types";
import { deleteElectricalMeasurementsFromBundle } from "@/lib/electrical-measurements/delete-bundle";
import {
  isDetachedMeasurement,
  resolveMeasurementExportJob,
} from "@/lib/electrical-measurements/link-status";

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
  measurementSettings,
  adminSession,
  onChangeMeasurements,
  onChangeRegistry,
  onCommitMeasurements,
  onOpenJob,
  onOpenJobInJobs,
}: {
  jobs: Job[];
  measurements: ElectricalMeasurement[];
  registry: ElectricalMeasurementRegistryState;
  measurementSettings: ElectricalMeasurementSettings;
  adminSession?: AdminSession | null;
  onChangeMeasurements: (next: ElectricalMeasurement[]) => void;
  onChangeRegistry: (next: ElectricalMeasurementRegistryState) => void;
  onCommitMeasurements: (
    nextMeasurements: ElectricalMeasurement[],
    nextRegistry: ElectricalMeasurementRegistryState,
  ) => void;
  /** WM Druk → Pomiary (ta sama roboty). */
  onOpenJob?: (jobId: string) => void;
  /** Roboty → szczegóły roboty (deep-link). */
  onOpenJobInJobs?: (jobId: string) => void;
}) {
  const [subView, setSubView] = useState<"katalog" | "rejestr">("katalog");

  const openJobDetails = (jobId: string) => {
    if (onOpenJobInJobs) onOpenJobInJobs(jobId);
    else onOpenJob?.(jobId);
  };

  if (subView === "rejestr") {
    return (
      <div className="space-y-4">
        <CatalogSubTabs subView={subView} onChange={setSubView} />
        <RapRegistryPanel
          jobs={jobs}
          measurements={measurements}
          registry={registry}
          onOpenJobInJobs={onOpenJobInJobs ? openJobDetails : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CatalogSubTabs subView={subView} onChange={setSubView} />
      <MeasurementCatalogMain
        jobs={jobs}
        measurements={measurements}
        registry={registry}
        measurementSettings={measurementSettings}
        adminSession={adminSession}
        onChangeMeasurements={onChangeMeasurements}
        onChangeRegistry={onChangeRegistry}
        onCommitMeasurements={onCommitMeasurements}
        onOpenJob={onOpenJob}
        openJobDetails={openJobDetails}
        hasJobDeepLink={Boolean(onOpenJobInJobs || onOpenJob)}
      />
    </div>
  );
}

function CatalogSubTabs({
  subView,
  onChange,
}: {
  subView: "katalog" | "rejestr";
  onChange: (v: "katalog" | "rejestr") => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-secondary/60 w-fit">
      <button
        type="button"
        onClick={() => onChange("katalog")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          subView === "katalog" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Katalog
      </button>
      <button
        type="button"
        onClick={() => onChange("rejestr")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          subView === "rejestr" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Rejestr RAP
      </button>
    </div>
  );
}

function resolveCatalogEditJob(
  measurement: ElectricalMeasurement,
  jobs: Job[],
): Job | null {
  if (isDetachedMeasurement(measurement) || !measurement.jobId) return null;
  return jobs.find((j) => j.id === measurement.jobId) ?? null;
}

function MeasurementCatalogMain({
  jobs,
  measurements,
  registry,
  measurementSettings,
  adminSession,
  onChangeMeasurements,
  onChangeRegistry,
  onCommitMeasurements,
  onOpenJob,
  openJobDetails,
  hasJobDeepLink,
}: {
  jobs: Job[];
  measurements: ElectricalMeasurement[];
  registry: ElectricalMeasurementRegistryState;
  measurementSettings: ElectricalMeasurementSettings;
  adminSession?: AdminSession | null;
  onChangeMeasurements: (next: ElectricalMeasurement[]) => void;
  onChangeRegistry: (next: ElectricalMeasurementRegistryState) => void;
  onCommitMeasurements: (
    nextMeasurements: ElectricalMeasurement[],
    nextRegistry: ElectricalMeasurementRegistryState,
  ) => void;
  onOpenJob?: (jobId: string) => void;
  openJobDetails: (jobId: string) => void;
  hasJobDeepLink: boolean;
}) {
  const allRows = useMemo(
    () => buildMeasurementCatalogRows(measurements, registry, jobs),
    [measurements, registry, jobs],
  );

  /** Katalog — tylko raporty z danymi (bez wpisów registry-only po usunięciu). */
  const catalogRows = useMemo(
    () => allRows.filter((r) => r.measurement != null),
    [allRows],
  );

  const [filters, setFilters] = useState<MeasurementCatalogFilters>({ status: "ALL" });
  const [selectedRapId, setSelectedRapId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [downloadingKind, setDownloadingKind] = useState<EmDocxDocumentKind | null>(null);
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);

  const editingMeasurement = useMemo(
    () => (editingMeasurementId ? measurements.find((m) => m.id === editingMeasurementId) ?? null : null),
    [measurements, editingMeasurementId],
  );

  const filteredRows = useMemo(
    () => filterMeasurementCatalogRows(catalogRows, filters),
    [catalogRows, filters],
  );

  const years = useMemo(() => catalogAvailableYears(catalogRows), [catalogRows]);

  const selectedRow = useMemo(
    () => filteredRows.find((r) => r.id === selectedRapId) ?? catalogRows.find((r) => r.id === selectedRapId) ?? null,
    [filteredRows, catalogRows, selectedRapId],
  );

  const selectedDetached = selectedRow?.measurement ? isDetachedMeasurement(selectedRow.measurement) : false;

  const selectedExportJob = useMemo(() => {
    if (!selectedRow?.measurement) return null;
    return resolveMeasurementExportJob(selectedRow.measurement, jobs);
  }, [selectedRow, jobs]);

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
    () => catalogRows.filter((r) => checkedIds.has(r.id) && r.measurement),
    [catalogRows, checkedIds],
  );

  const applyDelete = (ids: string[], confirmMessage: string) => {
    if (ids.length === 0) return;
    if (!window.confirm(confirmMessage)) return;
    const result = deleteElectricalMeasurementsFromBundle(measurements, registry, ids);
    if (result.deletedIds.length === 0) return;
    onChangeMeasurements(result.measurements);
    onChangeRegistry(result.registry);
    onCommitMeasurements(result.measurements, result.registry);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const id of result.deletedIds) next.delete(id);
      return next;
    });
    if (selectedRapId && result.deletedIds.includes(selectedRapId)) {
      setSelectedRapId(null);
    }
    if (editingMeasurementId && result.deletedIds.includes(editingMeasurementId)) {
      setEditingMeasurementId(null);
    }
    toast.success(
      result.deletedIds.length === 1
        ? "Usunięto raport"
        : `Usunięto ${result.deletedIds.length} raportów`,
    );
  };

  const handleDeleteRow = (row: MeasurementCatalogRow) => {
    if (!row.measurement) return;
    applyDelete([row.id], `Usunąć raport ${row.rapNumber}?`);
  };

  const handleDeleteChecked = () => {
    if (checkedRows.length === 0) {
      toast.error("Zaznacz co najmniej jeden raport do usunięcia");
      return;
    }
    applyDelete(checkedRows.map((r) => r.id), `Usunąć ${checkedRows.length} raportów?`);
  };

  const handleDownloadDoc = async (kind: EmDocxDocumentKind) => {
    if (!selectedRow?.measurement || !selectedExportJob) return;
    setDownloadingKind(kind);
    try {
      await downloadEmDocxDocument(kind, { measurement: selectedRow.measurement, job: selectedExportJob });
      toast.success(`Pobrano: ${catalogDocxFileName(selectedRow.rapNumber, kind)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd generowania DOCX");
    } finally {
      setDownloadingKind(null);
    }
  };

  const handleSingleZip = async () => {
    if (!selectedRow?.measurement || !selectedExportJob) return;
    setBusy(true);
    const res = await downloadCatalogSingleZip(selectedRow, selectedExportJob);
    setBusy(false);
    if (res.ok) {
      toast.success(`Pobrano ${catalogSingleZipDownloadName(selectedRow.rapNumber, selectedRow.address)}`);
    } else toast.error(res.error);
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

  const startEdit = (measurementId: string) => {
    setSelectedRapId(measurementId);
    setEditingMeasurementId(measurementId);
  };

  const stopEdit = () => {
    setEditingMeasurementId(null);
  };

  const handleEditorCommit = (
    nextMeasurements: ElectricalMeasurement[],
    nextRegistry: ElectricalMeasurementRegistryState,
  ) => {
    onChangeMeasurements(nextMeasurements);
    onChangeRegistry(nextRegistry);
    onCommitMeasurements(nextMeasurements, nextRegistry);
    toast.success("Zapisano zmiany raportu");
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
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Wyszukaj RAP</label>
            <input
              value={filters.rapQuery ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, rapQuery: e.target.value }))}
              placeholder="45 · RAP-45 · RAP-45-2026"
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
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Robota</label>
            <input
              value={filters.jobQuery ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, jobQuery: e.target.value }))}
              placeholder="Zakres / id…"
              className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleMultiZip()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
              Pobierz wybrane ZIP ({checkedRows.length})
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDeleteChecked}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Usuń zaznaczone ({checkedRows.length})
            </button>
          </div>
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
                  <th className="px-3 py-2 font-medium hidden md:table-cell">Robota</th>
                  <th className="px-3 py-2 font-medium hidden lg:table-cell">Pomiarowiec</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium w-36">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
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
                        <td className="px-3 py-2.5 font-medium font-mono text-xs">
                          {hasJobDeepLink ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openJobDetails(row.jobId);
                              }}
                              className="text-primary hover:underline"
                            >
                              {row.rapNumber}
                            </button>
                          ) : (
                            row.rapNumber
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.measurementDate}</td>
                        <td className="px-3 py-2.5 truncate max-w-[180px]">
                          {hasJobDeepLink ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openJobDetails(row.jobId);
                              }}
                              className="text-left truncate max-w-full hover:text-primary hover:underline"
                            >
                              {row.address}
                            </button>
                          ) : (
                            row.address
                          )}
                        </td>
                        <td className="px-3 py-2.5 truncate max-w-[140px] hidden md:table-cell text-muted-foreground" title={row.jobName}>
                          {row.jobName}
                        </td>
                        <td className="px-3 py-2.5 truncate max-w-[140px] hidden lg:table-cell text-muted-foreground">
                          {row.technicianName}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}
                          >
                            {MEASUREMENT_CATALOG_STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          {canPack ? (
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(row.id)}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
                                  editingMeasurementId === row.id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:bg-secondary"
                                }`}
                              >
                                <Pencil size={12} />
                                Edytuj
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-destructive/30 text-destructive font-medium hover:bg-destructive/10"
                              >
                                <Trash2 size={12} />
                                Usuń
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

      <div className="rounded-xl border border-border bg-card p-4 space-y-4 min-w-0 xl:sticky xl:top-0 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
        {editingMeasurement ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-base font-mono">{editingMeasurement.reportNumber}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Edycja — numer RAP bez zmian</p>
              </div>
              <button
                type="button"
                onClick={stopEdit}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-border hover:bg-secondary shrink-0"
              >
                <X size={12} />
                Zamknij
              </button>
            </div>
            <JobElectricalMeasurementsPanel
              variant="catalog-edit"
              job={resolveCatalogEditJob(editingMeasurement, jobs)}
              focusedMeasurementId={editingMeasurement.id}
              measurements={measurements}
              registry={registry}
              measurementSettings={measurementSettings}
              adminSession={adminSession}
              onChangeMeasurements={onChangeMeasurements}
              onChangeRegistry={onChangeRegistry}
              onCommit={handleEditorCommit}
            />
          </div>
        ) : !selectedRow ? (
          <p className="text-sm text-muted-foreground">Kliknij raport na liście, aby zobaczyć szczegóły i pobierać dokumenty.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-base font-mono">{selectedRow.rapNumber}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MEASUREMENT_CATALOG_STATUS_LABELS[selectedRow.status]}
                </p>
              </div>
              {selectedRow.measurement && selectedRow.status !== "CANCELLED" && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(selectedRow.id)}
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                  >
                    <Pencil size={14} />
                    Edytuj
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(selectedRow)}
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive font-medium hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    Usuń
                  </button>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Data</dt>
                <dd>{selectedRow.measurementDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Adres</dt>
                <dd>
                  {hasJobDeepLink ? (
                    <button type="button" onClick={() => openJobDetails(selectedRow.jobId)} className="text-primary hover:underline">
                      {selectedRow.address}
                    </button>
                  ) : (
                    selectedRow.address
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Robota</dt>
                <dd className="flex items-center gap-2 flex-wrap">
                  <span>{selectedRow.jobName}</span>
                  {hasJobDeepLink && !selectedDetached && (
                    <button
                      type="button"
                      onClick={() => openJobDetails(selectedRow.jobId)}
                      className="text-xs text-primary hover:underline"
                    >
                      Otwórz w Robotach
                    </button>
                  )}
                  {onOpenJob && (
                    <button
                      type="button"
                      onClick={() => onOpenJob(selectedRow.jobId)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Pomiary WM
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

            {selectedRow.measurement && selectedExportJob ? (
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

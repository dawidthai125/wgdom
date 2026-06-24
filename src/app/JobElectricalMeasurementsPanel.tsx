import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileDown, Gauge, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { Job } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import { filterElectricalMeasurementsForJob } from "@/lib/electrical-measurements/merge";
import {
  downloadEmDocxDocument,
  EM_DOCX_DOCUMENT_KINDS,
  emDocxDocumentKindLabel,
  type EmDocxDocumentKind,
} from "@/lib/electrical-measurements/generate-em-docx";
import {
  buildElectricalMeasurementPreview,
  buildJobElectricalMeasurementsSummary,
} from "@/lib/electrical-measurements/preview";
import { deleteElectricalMeasurementsFromBundle } from "@/lib/electrical-measurements/delete-bundle";
import {
  addElectricalMeasurementCircuit,
  addElectricalMeasurementRcd,
  createEmptyElectricalMeasurement,
  recalculateElectricalMeasurementValues,
  removeElectricalMeasurementCircuit,
  removeElectricalMeasurementRcd,
  touchElectricalMeasurement,
  updateElectricalMeasurementCircuit,
  updateElectricalMeasurementRcd,
  upsertElectricalMeasurement,
} from "@/lib/electrical-measurements/report";
import {
  hasGeneratedMeasurementValues,
  patchAdscCircuitValues,
  patchAdscSupplyValues,
  patchRcdValues,
  resolveAdscCircuitValues,
  resolveAdscSupplyValues,
  resolveRcdValues,
} from "@/lib/electrical-measurements/measurement-value-engine";
import {
  assignRapForJob,
  getRegistryEntryForKey,
  getRegistryEntryForJob,
  registryStatusLabel,
} from "@/lib/electrical-measurements/registry";
import {
  createTestElectricalMeasurement,
  isTestMeasurement,
  jobHasProductionMeasurement,
} from "@/lib/electrical-measurements/test-report";
import {
  getMeasurementRegistryKey,
  isDetachedMeasurement,
  resolveMeasurementExportJob,
} from "@/lib/electrical-measurements/link-status";
import { isMeasurementMetaFieldsEditable } from "@/lib/electrical-measurements/settings";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementRegistryState,
  ElectricalMeasurementSettings,
} from "@/lib/electrical-measurements/types";
import {
  BREAKER_TYPES,
  CIRCUIT_TYPE_LABELS,
  CIRCUIT_TYPES,
  RCD_DEVICE_TYPES,
  SUPPLY_TYPE_LABELS,
  SUPPLY_TYPES,
} from "@/lib/electrical-measurements/types";

function isEmAdministrator(session?: AdminSession | null): boolean {
  if (!session) return false;
  return session.role === "admin" || adminIsSuperAdmin(session.role);
}

export function JobElectricalMeasurementsPanel({
  job,
  focusedMeasurementId = null,
  measurements,
  registry,
  measurementSettings,
  adminSession,
  onChangeMeasurements,
  onChangeRegistry,
  onCommit,
  variant = "default",
}: {
  /** Powiązany raport — wymagany gdy brak focusedMeasurementId. */
  job?: Job | null;
  /** Samodzielny / pojedynczy RAP — edycja po id raportu. */
  focusedMeasurementId?: string | null;
  measurements: ElectricalMeasurement[];
  registry: ElectricalMeasurementRegistryState;
  measurementSettings: ElectricalMeasurementSettings;
  adminSession?: AdminSession | null;
  onChangeMeasurements: (next: ElectricalMeasurement[]) => void;
  onChangeRegistry: (next: ElectricalMeasurementRegistryState) => void;
  onCommit: (
    nextMeasurements: ElectricalMeasurement[],
    nextRegistry: ElectricalMeasurementRegistryState,
  ) => void;
  /** EM-CATALOG-002 — edycja z katalogu: bez tworzenia nowych raportów. */
  variant?: "default" | "catalog-edit";
}) {
  const jobReports = useMemo(() => {
    if (focusedMeasurementId) {
      const m = measurements.find((x) => x.id === focusedMeasurementId);
      return m ? [m] : [];
    }
    if (!job) return [];
    return filterElectricalMeasurementsForJob(measurements, job.id);
  }, [measurements, job, focusedMeasurementId]);
  const productionReports = useMemo(
    () => jobReports.filter((r) => !isTestMeasurement(r)),
    [jobReports],
  );
  const testReports = useMemo(
    () => jobReports.filter((r) => isTestMeasurement(r)),
    [jobReports],
  );

  const jobSummary = useMemo(
    () => buildJobElectricalMeasurementsSummary(jobReports),
    [jobReports],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [generatingKind, setGeneratingKind] = useState<EmDocxDocumentKind | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (focusedMeasurementId) {
      setSelectedId(focusedMeasurementId);
      setDetailsExpanded(true);
      return;
    }
    if (jobReports.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !jobReports.some((r) => r.id === selectedId)) {
      setSelectedId(jobReports[0].id);
    }
  }, [jobReports, selectedId, focusedMeasurementId]);

  const selected = useMemo(() => {
    if (jobReports.length === 0) return null;
    if (selectedId) {
      const hit = jobReports.find((r) => r.id === selectedId);
      if (hit) return hit;
    }
    if (focusedMeasurementId) {
      return jobReports.find((r) => r.id === focusedMeasurementId) ?? jobReports[0];
    }
    return jobReports[0];
  }, [jobReports, selectedId, focusedMeasurementId]);

  const selectedReportLabel = (selected?.reportNumber ?? "").trim() || "Bez numeru";
  const preview = selected ? buildElectricalMeasurementPreview(selected) : null;
  const sortedCircuits = selected
    ? [...selected.circuits].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const focusedMeasurement = useMemo(
    () => (focusedMeasurementId ? measurements.find((m) => m.id === focusedMeasurementId) ?? null : null),
    [measurements, focusedMeasurementId],
  );

  const registryEntry = useMemo(() => {
    if (focusedMeasurement) {
      const key = getMeasurementRegistryKey(focusedMeasurement);
      return key ? getRegistryEntryForKey(registry, key) : undefined;
    }
    if (!job) return undefined;
    return getRegistryEntryForJob(registry, job.id);
  }, [registry, job, focusedMeasurement]);

  const isDetachedContext = focusedMeasurement
    ? isDetachedMeasurement(focusedMeasurement)
    : selected
      ? isDetachedMeasurement(selected)
      : false;
  const isCatalogEdit = variant === "catalog-edit";
  const pomiaryChecklistDone = job?.documents?.pomiary === true;
  const showPomiaryCompletedBlock =
    !isDetachedContext && Boolean(job) && pomiaryChecklistDone && productionReports.length === 0 && registryEntry != null;
  const isAdmin = isEmAdministrator(adminSession);
  const hasProductionReport = job ? jobHasProductionMeasurement(measurements, job.id) : false;
  const selectedIsTest = selected ? isTestMeasurement(selected) : false;

  const persistBundle = (
    nextMeasurement: ElectricalMeasurement,
    nextRegistry: ElectricalMeasurementRegistryState = registry,
  ) => {
    const nextAll = upsertElectricalMeasurement(measurements, nextMeasurement);
    onChangeMeasurements(nextAll);
    onChangeRegistry(nextRegistry);
    onCommit(nextAll, nextRegistry);
  };

  const persist = (nextMeasurement: ElectricalMeasurement) => {
    persistBundle(nextMeasurement, registry);
  };

  const handleCreateTestReport = () => {
    if (!job) return;
    const created = createTestElectricalMeasurement(job.id, measurements, measurementSettings);
    const nextAll = upsertElectricalMeasurement(measurements, created);
    onChangeMeasurements(nextAll);
    onCommit(nextAll, registry);
    setSelectedId(created.id);
    setDetailsExpanded(true);
  };

  const handleCreateReport = () => {
    if (!job) return;
    const { registry: nextRegistry, entry } = assignRapForJob(registry, job.id);
    const created = createEmptyElectricalMeasurement(job.id, entry.rapNumber, measurementSettings);
    const nextAll = upsertElectricalMeasurement(measurements, created);
    onChangeMeasurements(nextAll);
    onChangeRegistry(nextRegistry);
    onCommit(nextAll, nextRegistry);
    setSelectedId(created.id);
    setDetailsExpanded(true);
  };

  const handleRecreateReport = () => {
    if (!registryEntry) return;
    handleCreateReport();
  };

  const handleDeleteReport = () => {
    if (!selected) return;
    if (!window.confirm(`Usunąć raport ${selected.reportNumber}?`)) return;
    const result = deleteElectricalMeasurementsFromBundle(measurements, registry, [selected.id]);
    onChangeMeasurements(result.measurements);
    onChangeRegistry(result.registry);
    onCommit(result.measurements, result.registry);
    const fallbackJobId = job?.id;
    setSelectedId(
      fallbackJobId
        ? (result.measurements.filter((m) => m.jobId === fallbackJobId)[0]?.id ?? null)
        : (result.measurements.find((m) => m.id === focusedMeasurementId)?.id ?? null),
    );
  };

  const metaFieldsEditable = selected ? isMeasurementMetaFieldsEditable(selected) : false;

  const handleEnableMetaOverride = () => {
    if (!selected) return;
    persist(touchElectricalMeasurement(selected, { metaFieldsOverridden: true }));
  };

  const patchSelected = (patch: Parameters<typeof touchElectricalMeasurement>[1]) => {
    if (!selected) return;
    persist(touchElectricalMeasurement(selected, patch));
  };

  const handleGenerateDocx = async (kind: EmDocxDocumentKind) => {
    if (!selected) return;
    const exportJob = job ? job : resolveMeasurementExportJob(selected);
    setGenerateError(null);
    setGeneratingKind(kind);
    try {
      await downloadEmDocxDocument(kind, { measurement: selected, job: exportJob });
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Nie udało się wygenerować DOCX");
    } finally {
      setGeneratingKind(null);
    }
  };

  const docxButtonLabels: Record<EmDocxDocumentKind, string> = {
    protokol: "Generuj Protokół",
    "dane-informacyjne": "Generuj Dane Informacyjne",
    "parametry-rcd": "Generuj RCD",
    "badanie-adsc": "Generuj ADSC",
    "badanie-rezystancji": "Generuj Rezystancję",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Gauge size={14} className="text-primary shrink-0" />
            {isCatalogEdit ? "Edycja raportu" : "Pomiary Elektryczne"}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>Raporty: {jobSummary.reportCount}</span>
            {testReports.length > 0 && <span>Test: {testReports.length}</span>}
            <span>Obwody: {jobSummary.circuitCount}</span>
            <span>RCD: {jobSummary.rcdCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isCatalogEdit && jobReports.length > 0 && (
            <button
              type="button"
              onClick={() => setDetailsExpanded((v) => !v)}
              className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground"
            >
              {detailsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {detailsExpanded ? "Zwiń" : "Rozwiń"}
            </button>
          )}
          {!isCatalogEdit && !showPomiaryCompletedBlock && !hasProductionReport && job && !isDetachedContext && (
            <button
              type="button"
              onClick={handleCreateReport}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-medium"
            >
              <Plus size={12} />
              Nowy raport
            </button>
          )}
          {!isCatalogEdit && job && !isDetachedContext && (
            <button
              type="button"
              onClick={handleCreateTestReport}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100 font-medium hover:bg-amber-500/15"
            >
              <Plus size={12} />
              Nowy raport testowy
            </button>
          )}
          {!isCatalogEdit && showPomiaryCompletedBlock && isAdmin && (
            <button
              type="button"
              onClick={handleRecreateReport}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-medium"
            >
              <Plus size={12} />
              Utwórz raport ponownie
            </button>
          )}
        </div>
      </div>

      {registryEntry && !selectedIsTest && (
        <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-[11px] space-y-0.5">
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>
              <span className="text-muted-foreground">Numer RAP: </span>
              <span className="font-medium font-mono">{registryEntry.rapNumber}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Status: </span>
              <span className="font-medium">{registryStatusLabel(registryEntry.status)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Data przypisania: </span>
              <span>{new Date(registryEntry.assignedAt).toLocaleString("pl-PL")}</span>
            </span>
          </div>
        </div>
      )}

      {showPomiaryCompletedBlock && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-100">
          Pomiary zostały wykonane.
          {registryEntry && (
            <span className="block mt-0.5 font-medium font-mono">Numer: {registryEntry.rapNumber}</span>
          )}
        </div>
      )}

      {jobReports.length === 0 && !showPomiaryCompletedBlock ? (
        <p className="text-xs text-muted-foreground">
          {isDetachedContext
            ? "Brak raportu do edycji."
            : "Brak raportów pomiarowych dla tej roboty. Użyj „Nowy pomiar” u góry zakładki lub przycisków poniżej."}
        </p>
      ) : jobReports.length === 0 ? null : !selected ? (
        <p className="text-xs text-muted-foreground">Ładowanie raportu…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-muted-foreground">Raport:</label>
            {isCatalogEdit || jobReports.length <= 1 ? (
              <span className="text-xs font-mono font-medium">
                {selectedReportLabel}
                {selectedIsTest ? " [TEST]" : ""}
              </span>
            ) : (
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 min-w-[180px]"
              >
                {jobReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reportNumber.trim() || "Bez numeru"}
                    {isTestMeasurement(r) ? " [TEST]" : ""}
                    {r.measurementDate ? ` · ${r.measurementDate}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {detailsExpanded && selected && (
            <div className="space-y-4">
              {selectedIsTest && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                  Raport testowy — bez wpisu w rejestrze RAP, bez wpływu na checklistę odbiorową.
                </div>
              )}
              {isDetachedMeasurement(selected) && (
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-100">
                  Samodzielny pomiar — bez powiązania z robotą. Adres trafia do DOCX i katalogu.
                </div>
              )}
              <section className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-foreground">1. Dane pomiaru</h4>
                  {!isCatalogEdit && (
                    <button
                      type="button"
                      onClick={handleDeleteReport}
                      className="text-[11px] text-destructive flex items-center gap-1 hover:underline"
                    >
                      <Trash2 size={11} />
                      Usuń raport
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {selectedIsTest ? "Numer raportu (TEST)" : "Numer raportu (RAP)"}
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={selected.reportNumber}
                      title={
                        selectedIsTest
                          ? "Raport testowy — bez wpisu w rejestrze RAP"
                          : "Numer przypisany trwale z rejestru RAP"
                      }
                      className="w-full text-xs rounded-lg border border-border bg-secondary/40 px-2 py-1.5 font-mono cursor-not-allowed"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Data pomiaru</span>
                    <input
                      type="date"
                      value={selected.measurementDate}
                      onChange={(e) => patchSelected({ measurementDate: e.target.value.slice(0, 10) })}
                      className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Pomiarowiec</span>
                    <input
                      type="text"
                      readOnly={!metaFieldsEditable}
                      value={selected.technicianName}
                      onChange={(e) => patchSelected({ technicianName: e.target.value })}
                      className={`w-full text-xs rounded-lg border border-border px-2 py-1.5 ${
                        metaFieldsEditable ? "bg-background" : "bg-secondary/40 cursor-not-allowed"
                      }`}
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Model miernika</span>
                    <input
                      type="text"
                      readOnly={!metaFieldsEditable}
                      value={selected.meterModel}
                      onChange={(e) => patchSelected({ meterModel: e.target.value })}
                      className={`w-full text-xs rounded-lg border border-border px-2 py-1.5 ${
                        metaFieldsEditable ? "bg-background" : "bg-secondary/40 cursor-not-allowed"
                      }`}
                    />
                  </label>
                  <label className="space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] text-muted-foreground">Numer miernika</span>
                    <input
                      type="text"
                      readOnly={!metaFieldsEditable}
                      value={selected.meterSerialNumber}
                      onChange={(e) => patchSelected({ meterSerialNumber: e.target.value })}
                      className={`w-full text-xs rounded-lg border border-border px-2 py-1.5 ${
                        metaFieldsEditable ? "bg-background" : "bg-secondary/40 cursor-not-allowed"
                      }`}
                    />
                  </label>
                  {isDetachedMeasurement(selected) && (
                    <>
                      <label className="space-y-0.5 sm:col-span-2">
                        <span className="text-[10px] text-muted-foreground">Adres obiektu</span>
                        <input
                          type="text"
                          value={selected.manualAddress ?? ""}
                          onChange={(e) => patchSelected({ manualAddress: e.target.value })}
                          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                        />
                      </label>
                      <label className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Nr lokalu</span>
                        <input
                          type="text"
                          value={selected.manualFlatNumber ?? ""}
                          onChange={(e) => patchSelected({ manualFlatNumber: e.target.value })}
                          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                        />
                      </label>
                    </>
                  )}
                </div>
                {!metaFieldsEditable && (
                  <button
                    type="button"
                    onClick={handleEnableMetaOverride}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Nadpisz dla tego raportu
                  </button>
                )}
              </section>

              <section className="space-y-2 rounded-lg border border-border p-3">
                <h4 className="text-xs font-semibold text-foreground">2. Zasilanie</h4>
                <div className="flex flex-wrap gap-3">
                  {SUPPLY_TYPES.map((st) => (
                    <label key={st} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name={`em-supply-${selected.id}`}
                        checked={selected.supplyType === st}
                        onChange={() => patchSelected({ supplyType: st })}
                      />
                      {SUPPLY_TYPE_LABELS[st]}
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-foreground">3. Obwody</h4>
                  <button
                    type="button"
                    onClick={() => persist(addElectricalMeasurementCircuit(selected))}
                    className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus size={11} />
                    Dodaj obwód
                  </button>
                </div>
                {sortedCircuits.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Brak obwodów — dodaj pierwszy.</p>
                ) : (
                  <ul className="space-y-2">
                    {sortedCircuits.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                        <span className="text-[10px] text-muted-foreground w-5 shrink-0">#{c.sortOrder}</span>
                        <select
                          value={c.type}
                          onChange={(e) =>
                            persist(
                              updateElectricalMeasurementCircuit(selected, c.id, {
                                type: e.target.value as (typeof CIRCUIT_TYPES)[number],
                              }),
                            )
                          }
                          className="text-xs rounded border border-border bg-background px-2 py-1"
                        >
                          {CIRCUIT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {CIRCUIT_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-muted-foreground">Wyłącznik:</span>
                        {BREAKER_TYPES.map((bt) => (
                          <label key={bt} className="flex items-center gap-1 text-xs">
                            <input
                              type="radio"
                              name={`breaker-${c.id}`}
                              checked={c.breakerType === bt}
                              onChange={() =>
                                persist(updateElectricalMeasurementCircuit(selected, c.id, { breakerType: bt }))
                              }
                            />
                            {bt}
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={() => persist(removeElectricalMeasurementCircuit(selected, c.id))}
                          className="ml-auto text-muted-foreground hover:text-destructive p-1"
                          title="Usuń obwód"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-foreground">4. RCD</h4>
                  <button
                    type="button"
                    onClick={() => persist(addElectricalMeasurementRcd(selected))}
                    className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus size={11} />
                    Dodaj RCD
                  </button>
                </div>
                {selected.rcds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Brak RCD — dodaj pierwszy.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.rcds.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                        <input
                          type="text"
                          value={r.symbol}
                          onChange={(e) =>
                            persist(updateElectricalMeasurementRcd(selected, r.id, { symbol: e.target.value }))
                          }
                          className="w-20 text-xs rounded border border-border bg-background px-2 py-1"
                          placeholder="RCD1"
                        />
                        <select
                          value={r.deviceType}
                          onChange={(e) =>
                            persist(
                              updateElectricalMeasurementRcd(selected, r.id, {
                                deviceType: e.target.value as (typeof RCD_DEVICE_TYPES)[number],
                              }),
                            )
                          }
                          className="text-xs rounded border border-border bg-background px-2 py-1"
                        >
                          {RCD_DEVICE_TYPES.map((dt) => (
                            <option key={dt} value={dt}>
                              {dt}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => persist(removeElectricalMeasurementRcd(selected, r.id))}
                          className="ml-auto text-muted-foreground hover:text-destructive p-1"
                          title="Usuń RCD"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-foreground">5. Wyniki pomiarów</h4>
                  <button
                    type="button"
                    onClick={() => selected && persist(recalculateElectricalMeasurementValues(selected))}
                    className="text-[11px] text-primary flex items-center gap-1 hover:underline font-medium"
                    title="Ponowne losowanie wartości (seed raportu)"
                  >
                    <RefreshCw size={11} />
                    Przelicz wartości
                  </button>
                </div>
                {!hasGeneratedMeasurementValues(selected) ? (
                  <p className="text-[11px] text-muted-foreground">
                    Brak wygenerowanych wartości — kliknij „Przelicz wartości”.
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground">
                      Wygenerowano: {new Date(selected.valueSet!.generatedAt).toLocaleString("pl-PL")}
                      {selected.circuits.length !== Object.keys(selected.valueSet!.adscByCircuitId).length && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                          · Dodano obwody — przelicz wartości
                        </span>
                      )}
                    </p>
                    <div className="space-y-2">
                      <p className="text-[10px] font-medium text-muted-foreground">ADSC — Zs [Ω]</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-24 shrink-0">Zasilanie</span>
                        <input
                          type="text"
                          value={resolveAdscSupplyValues(selected).zs}
                          onChange={(e) =>
                            persist(patchAdscSupplyValues(selected, { zs: e.target.value }))
                          }
                          className="w-16 text-xs rounded border border-border bg-background px-2 py-1 font-mono"
                        />
                      </div>
                      {sortedCircuits.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-24 shrink-0 truncate" title={c.displayName}>
                            #{c.sortOrder} {c.displayName}
                          </span>
                          <input
                            type="text"
                            value={resolveAdscCircuitValues(selected, c).zs}
                            onChange={(e) =>
                              persist(patchAdscCircuitValues(selected, c.id, { zs: e.target.value }))
                            }
                            className="w-16 text-xs rounded border border-border bg-background px-2 py-1 font-mono"
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Za={resolveAdscCircuitValues(selected, c).za} · I={resolveAdscCircuitValues(selected, c).inAmps}A
                          </span>
                        </div>
                      ))}
                    </div>
                    {selected.rcds.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[10px] font-medium text-muted-foreground">RCD — Rs [Ω]</p>
                        {selected.rcds.map((r) => (
                          <div key={r.id} className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16 shrink-0">{r.symbol}</span>
                            <input
                              type="text"
                              value={resolveRcdValues(selected, r).rs}
                              onChange={(e) =>
                                persist(patchRcdValues(selected, r.id, { rs: e.target.value }))
                              }
                              className="w-16 text-xs rounded border border-border bg-background px-2 py-1 font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              {preview && (
                <>
                  <section className="space-y-2 rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold text-foreground">Generuj dokumenty Word</h4>
                    <p className="text-[10px] text-muted-foreground">
                      Pobierz pojedynczy plik DOCX na podstawie danych raportu (bez ZIP).
                    </p>
                    {generateError && (
                      <p className="text-[11px] text-destructive">{generateError}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {EM_DOCX_DOCUMENT_KINDS.map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          disabled={generatingKind !== null}
                          title={emDocxDocumentKindLabel(kind)}
                          onClick={() => handleGenerateDocx(kind)}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-50"
                        >
                          {generatingKind === kind ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <FileDown size={11} />
                          )}
                          {docxButtonLabels[kind]}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3 rounded-lg border border-dashed border-border bg-secondary/20 p-3">
                    <h4 className="text-xs font-semibold text-foreground">Podgląd (zapisane wartości)</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Liczba dokumentów: {preview.summary.documentCount}</span>
                      <span>Liczba obwodów: {preview.summary.circuitCount}</span>
                      <span>Liczba RCD: {preview.summary.rcdCount}</span>
                    </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Ochrona przed porażeniem</p>
                    <ul className="text-xs space-y-0.5">
                      {preview.adsc.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Rezystancja</p>
                    <ul className="text-xs space-y-0.5">
                      {preview.resistance.map((line, i) => (
                        <li key={`${line}-${i}`}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">RCD</p>
                    {preview.rcd.length === 0 ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : (
                      <ul className="text-xs space-y-0.5">
                        {preview.rcd.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

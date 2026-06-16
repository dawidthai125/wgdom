import { useEffect, useMemo, useState } from "react";
import { Gauge, Plus, Trash2 } from "lucide-react";
import type { Job } from "@/app/app-domain";
import { filterElectricalMeasurementsForJob } from "@/lib/electrical-measurements/merge";
import { buildElectricalMeasurementPreview } from "@/lib/electrical-measurements/preview";
import {
  addElectricalMeasurementCircuit,
  addElectricalMeasurementRcd,
  createEmptyElectricalMeasurement,
  removeElectricalMeasurementCircuit,
  removeElectricalMeasurementRcd,
  touchElectricalMeasurement,
  updateElectricalMeasurementCircuit,
  updateElectricalMeasurementRcd,
  upsertElectricalMeasurement,
} from "@/lib/electrical-measurements/report";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import {
  BREAKER_TYPES,
  CIRCUIT_TYPE_LABELS,
  CIRCUIT_TYPES,
  RCD_DEVICE_TYPES,
  SUPPLY_TYPE_LABELS,
  SUPPLY_TYPES,
} from "@/lib/electrical-measurements/types";

export function JobElectricalMeasurementsPanel({
  job,
  measurements,
  onChangeMeasurements,
  onCommitMeasurements,
}: {
  job: Job;
  measurements: ElectricalMeasurement[];
  onChangeMeasurements: (next: ElectricalMeasurement[]) => void;
  onCommitMeasurements: (next: ElectricalMeasurement[]) => void;
}) {
  const jobReports = useMemo(
    () => filterElectricalMeasurementsForJob(measurements, job.id),
    [measurements, job.id],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (jobReports.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !jobReports.some((r) => r.id === selectedId)) {
      setSelectedId(jobReports[0].id);
    }
  }, [jobReports, selectedId]);

  const selected = jobReports.find((r) => r.id === selectedId) ?? null;
  const preview = selected ? buildElectricalMeasurementPreview(selected) : null;

  const persist = (nextMeasurement: ElectricalMeasurement) => {
    const nextAll = upsertElectricalMeasurement(measurements, nextMeasurement);
    onChangeMeasurements(nextAll);
    onCommitMeasurements(nextAll);
  };

  const handleCreateReport = () => {
    const created = createEmptyElectricalMeasurement(job.id);
    const nextAll = upsertElectricalMeasurement(measurements, created);
    onChangeMeasurements(nextAll);
    onCommitMeasurements(nextAll);
    setSelectedId(created.id);
  };

  const patchSelected = (patch: Parameters<typeof touchElectricalMeasurement>[1]) => {
    if (!selected) return;
    persist(touchElectricalMeasurement(selected, patch));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-3 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Gauge size={14} className="text-primary shrink-0" />
            Pomiary Elektryczne
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Wiele raportów pomiarowych na jedną robotę — protokoły DOCX w EM-P1.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateReport}
          className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-medium"
        >
          <Plus size={12} />
          Nowy raport
        </button>
      </div>

      {jobReports.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Brak raportów pomiarowych dla tej roboty. Kliknij „Nowy raport”, aby rozpocząć.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-muted-foreground">Raport:</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 min-w-[180px]"
            >
              {jobReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reportNumber.trim() || "Bez numeru"}
                  {r.measurementDate ? ` · ${r.measurementDate}` : ""}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">
              {jobReports.length} raport{jobReports.length === 1 ? "" : jobReports.length < 5 ? "y" : "ów"} dla roboty
            </span>
          </div>

          {selected && (
            <div className="space-y-4">
              <section className="space-y-2 rounded-lg border border-border p-3">
                <h4 className="text-xs font-semibold text-foreground">1. Dane pomiaru</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Numer raportu</span>
                    <input
                      type="text"
                      value={selected.reportNumber}
                      onChange={(e) => patchSelected({ reportNumber: e.target.value })}
                      placeholder="np. RAP-12-2026"
                      className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
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
                      value={selected.technicianName}
                      onChange={(e) => patchSelected({ technicianName: e.target.value })}
                      className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Model miernika</span>
                    <input
                      type="text"
                      value={selected.meterModel}
                      onChange={(e) => patchSelected({ meterModel: e.target.value })}
                      className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                    />
                  </label>
                  <label className="space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] text-muted-foreground">Numer miernika</span>
                    <input
                      type="text"
                      value={selected.meterSerialNumber}
                      onChange={(e) => patchSelected({ meterSerialNumber: e.target.value })}
                      className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                    />
                  </label>
                </div>
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
                {selected.circuits.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Brak obwodów — dodaj pierwszy.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.circuits.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5">
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

              {preview && (
                <section className="space-y-3 rounded-lg border border-dashed border-border bg-secondary/20 p-3">
                  <h4 className="text-xs font-semibold text-foreground">Podgląd (tylko odczyt)</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Liczba dokumentów: {preview.summary.documentCount}</span>
                    <span>Liczba obwodów: {preview.summary.circuitCount}</span>
                    <span>Liczba RCD: {preview.summary.rcdCount}</span>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Ochrona przed porażeniem</p>
                    <ul className="text-xs space-y-0.5">
                      {preview.adscLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Rezystancja</p>
                    <ul className="text-xs space-y-0.5">
                      {preview.resistanceLines.map((line, i) => (
                        <li key={`${line}-${i}`}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">RCD</p>
                    {preview.rcdLines.length === 0 ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : (
                      <ul className="text-xs space-y-0.5">
                        {preview.rcdLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

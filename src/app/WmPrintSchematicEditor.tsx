import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import { applyPreset, CIRCUIT_PRESET_IDS, type CircuitPresetId } from "@/lib/electrical-schematics/circuit-presets";
import { touchSchematic } from "@/lib/electrical-schematics/report";
import {
  SCHEMATIC_LAYOUT_PROFILE_LABELS,
  SCHEMATIC_STATUS_LABELS,
  SCHEMATIC_UI_LAYOUT_PROFILES,
  circuitPresetLabel,
} from "@/lib/electrical-schematics/schematic-ui-labels";
import type {
  SchematicBreakerType,
  SchematicCircuit,
  SchematicLayoutProfile,
  SchematicStatus,
  SingleLineDiagram,
} from "@/lib/electrical-schematics/types";
import { DEFAULT_SCHEMATIC_TITLE } from "@/lib/electrical-schematics/types";

const INPUT =
  "w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm";
const LABEL = "text-xs font-medium text-muted-foreground";

function sortedCircuits(circuits: SchematicCircuit[]): SchematicCircuit[] {
  return [...circuits].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function WmPrintSchematicEditor({
  diagram,
  jobs,
  onChange,
}: {
  diagram: SingleLineDiagram;
  jobs: Job[];
  onChange: (next: SingleLineDiagram) => void;
}) {
  const patch = (partial: Partial<Omit<SingleLineDiagram, "id" | "createdAt">>) => {
    onChange(touchSchematic(diagram, partial));
  };

  const updateCircuit = (circuitId: string, partial: Partial<SchematicCircuit>) => {
    const circuits = diagram.circuits.map((c) =>
      c.id === circuitId ? { ...c, ...partial } : c,
    );
    onChange(touchSchematic(diagram, { circuits }));
  };

  const applyCircuitPreset = (circuitId: string, presetId: CircuitPresetId) => {
    const circuit = diagram.circuits.find((c) => c.id === circuitId);
    if (!circuit) return;
    const payload = applyPreset(presetId, { name: circuit.name.trim() || undefined });
    updateCircuit(circuitId, { ...payload, presetId });
  };

  const addCircuit = (presetId: CircuitPresetId) => {
    const maxOrder = diagram.circuits.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    const circuit: SchematicCircuit = {
      id: crypto.randomUUID(),
      sortOrder: maxOrder + 1,
      ...applyPreset(presetId),
    };
    onChange(touchSchematic(diagram, { circuits: [...diagram.circuits, circuit] }));
  };

  const removeCircuit = (circuitId: string) => {
    const circuits = diagram.circuits.filter((c) => c.id !== circuitId);
    onChange(touchSchematic(diagram, { circuits }));
  };

  const moveCircuit = (circuitId: string, dir: -1 | 1) => {
    const ordered = sortedCircuits(diagram.circuits);
    const idx = ordered.findIndex((c) => c.id === circuitId);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= ordered.length) return;
    const reordered = [...ordered];
    [reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]];
    const circuits = reordered.map((c, i) => ({ ...c, sortOrder: i + 1 }));
    onChange(touchSchematic(diagram, { circuits }));
  };

  const linkedJob = diagram.jobId ? jobs.find((j) => j.id === diagram.jobId) : undefined;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Dane główne</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={LABEL}>Tytuł</label>
            <input
              className={INPUT}
              value={diagram.title}
              onChange={(e) => patch({ title: e.target.value || DEFAULT_SCHEMATIC_TITLE })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Adres (nagłówek PDF)</label>
            <input
              className={INPUT}
              value={diagram.address}
              onChange={(e) => patch({ address: e.target.value })}
              placeholder="WROCŁAW, UL. …"
            />
          </div>
          <div>
            <label className={LABEL}>Data dokumentu</label>
            <input
              type="date"
              className={INPUT}
              value={diagram.documentDate}
              onChange={(e) => patch({ documentDate: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select
              className={INPUT}
              value={diagram.status}
              onChange={(e) => patch({ status: e.target.value as SchematicStatus })}
            >
              {(Object.keys(SCHEMATIC_STATUS_LABELS) as SchematicStatus[]).map((s) => (
                <option key={s} value={s}>
                  {SCHEMATIC_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Layout</label>
            <select
              className={INPUT}
              value={diagram.layoutProfile}
              onChange={(e) => patch({ layoutProfile: e.target.value as SchematicLayoutProfile })}
              disabled={!SCHEMATIC_UI_LAYOUT_PROFILES.includes(diagram.layoutProfile)}
            >
              {SCHEMATIC_UI_LAYOUT_PROFILES.map((p) => (
                <option key={p} value={p}>
                  {SCHEMATIC_LAYOUT_PROFILE_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Robota (opcjonalnie)</label>
            <select
              className={INPUT}
              value={diagram.jobId ?? ""}
              onChange={(e) => {
                const jobId = e.target.value || undefined;
                const job = jobId ? jobs.find((j) => j.id === jobId) : undefined;
                patch({
                  jobId,
                  ...(job && !diagram.address.trim()
                    ? { address: jobDisplayTitle(job).toUpperCase() }
                    : {}),
                });
              }}
            >
              <option value="">— brak —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {jobDisplayTitle(j)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {linkedJob && (
          <p className="text-xs text-muted-foreground">
            Powiązana robota: {jobDisplayTitle(linkedJob)}
            {diagram.sourceMeasurementRef ? ` · ${diagram.sourceMeasurementRef}` : ""}
          </p>
        )}
        {diagram.flags?.test && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">TEST-RAP — schemat testowy</p>
        )}
        <div>
          <label className={LABEL}>Notatki wewnętrzne</label>
          <textarea
            className={`${INPUT} min-h-[72px] resize-y`}
            value={diagram.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || undefined })}
            placeholder="Uwagi operacyjne (nie trafiają na PDF)…"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Zasilanie i aparaty</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Szyna (etykieta)</label>
            <input
              className={INPUT}
              value={diagram.supply.busLabel}
              onChange={(e) => patch({ supply: { ...diagram.supply, busLabel: e.target.value } })}
            />
          </div>
          <div>
            <label className={LABEL}>Kabel główny</label>
            <input
              className={INPUT}
              value={diagram.supply.mainCableLabel}
              onChange={(e) => patch({ supply: { ...diagram.supply, mainCableLabel: e.target.value } })}
            />
          </div>
          {diagram.mainSwitch && (
            <div>
              <label className={LABEL}>FR / wyłącznik główny</label>
              <input
                className={INPUT}
                value={diagram.mainSwitch.label}
                onChange={(e) =>
                  patch({
                    mainSwitch: { ...diagram.mainSwitch!, label: e.target.value },
                  })
                }
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Wyłącznik przedlicznikowy</label>
            <div className="flex gap-2">
              <select
                className={INPUT}
                value={diagram.mainBreaker.breakerType}
                onChange={(e) =>
                  patch({
                    mainBreaker: {
                      ...diagram.mainBreaker,
                      breakerType: e.target.value as SchematicBreakerType,
                    },
                  })
                }
              >
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
              <input
                type="number"
                className={`${INPUT} w-20`}
                value={diagram.mainBreaker.ratedCurrentA}
                onChange={(e) =>
                  patch({
                    mainBreaker: {
                      ...diagram.mainBreaker,
                      ratedCurrentA: Number(e.target.value) || 0,
                    },
                  })
                }
              />
              <span className="text-sm self-center text-muted-foreground">A</span>
            </div>
          </div>
          <div>
            <label className={LABEL}>RCD główne</label>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="number"
                className={`${INPUT} w-16`}
                value={diagram.mainRcd.ratedCurrentA}
                onChange={(e) =>
                  patch({
                    mainRcd: {
                      ...diagram.mainRcd,
                      ratedCurrentA: Number(e.target.value) || 0,
                    },
                  })
                }
              />
              <span className="text-xs text-muted-foreground">A</span>
              <input
                type="number"
                className={`${INPUT} w-16`}
                value={diagram.mainRcd.sensitivityMa}
                onChange={(e) =>
                  patch({
                    mainRcd: {
                      ...diagram.mainRcd,
                      sensitivityMa: Number(e.target.value) || 0,
                    },
                  })
                }
              />
              <span className="text-xs text-muted-foreground">mA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Obwody ({diagram.circuits.length})</h3>
          <div className="flex flex-wrap gap-1">
            <select
              className="px-2 py-1 rounded-lg border border-border bg-background text-xs"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value as CircuitPresetId;
                if (v) addCircuit(v);
                e.target.value = "";
              }}
            >
              <option value="">+ Preset…</option>
              {CIRCUIT_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {circuitPresetLabel(id)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {sortedCircuits(diagram.circuits).map((circuit, idx, arr) => (
            <div key={circuit.id} className="rounded-lg border border-border p-3 space-y-2 bg-secondary/20">
              <div className="flex flex-wrap gap-2 items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">#{circuit.sortOrder}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveCircuit(circuit.id, -1)}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30"
                    title="Wyżej"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === arr.length - 1}
                    onClick={() => moveCircuit(circuit.id, 1)}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30"
                    title="Niżej"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCircuit(circuit.id)}
                    className="p-1 rounded text-destructive hover:bg-destructive/10"
                    title="Usuń obwód"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>Nazwa</label>
                  <input
                    className={INPUT}
                    value={circuit.name}
                    onChange={(e) => updateCircuit(circuit.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Preset</label>
                  <select
                    className={INPUT}
                    value={circuit.presetId ?? ""}
                    onChange={(e) => applyCircuitPreset(circuit.id, e.target.value as CircuitPresetId)}
                  >
                    <option value="">—</option>
                    {CIRCUIT_PRESET_IDS.map((id) => (
                      <option key={id} value={id}>
                        {circuitPresetLabel(id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Kabel</label>
                  <input
                    className={INPUT}
                    value={circuit.cableLabel}
                    onChange={(e) => updateCircuit(circuit.id, { cableLabel: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Wyłącznik</label>
                  <div className="flex gap-1">
                    <select
                      className={INPUT}
                      value={circuit.breakerType}
                      onChange={(e) =>
                        updateCircuit(circuit.id, {
                          breakerType: e.target.value as SchematicBreakerType,
                        })
                      }
                    >
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                    <input
                      type="number"
                      className={`${INPUT} w-16`}
                      value={circuit.ratedCurrentA}
                      onChange={(e) =>
                        updateCircuit(circuit.id, {
                          ratedCurrentA: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-xs self-center">A · {circuit.poles}P</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {diagram.circuits.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak obwodów — dodaj preset.</p>
          )}
        </div>
      </section>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import { WmPrintSchematicEditor } from "@/app/WmPrintSchematicEditor";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import { generateSchematicPdf } from "@/lib/electrical-schematics/export-pdf";
import { importSchematicFromMeasurement } from "@/lib/electrical-schematics/import-from-measurement";
import { getSchematicById, getSchematicBySourceMeasurementId } from "@/lib/electrical-schematics/merge";
import { validateSchematicForExport } from "@/lib/electrical-schematics/normalize";
import {
  duplicateSchematic,
  removeSchematic,
  upsertSchematic,
} from "@/lib/electrical-schematics/report";
import { renderSchematicSvg, SchematicRenderError } from "@/lib/electrical-schematics/render-svg";
import {
  SCHEMATIC_STATUS_LABELS,
  SCHEMATIC_UI_LAYOUT_PROFILES,
  SCHEMATIC_UI_START_TEMPLATE_IDS,
  schematicStartTemplateLabel,
} from "@/lib/electrical-schematics/schematic-ui-labels";
import { buildSchematicFromTemplate } from "@/lib/electrical-schematics/start-templates";
import type { SchematicStartTemplateId, SchematicStatus, SingleLineDiagram } from "@/lib/electrical-schematics/types";

type StatusFilter = "all" | SchematicStatus;

function matchesSearch(diagram: SingleLineDiagram, q: string): boolean {
  if (!q) return true;
  const hay = [
    diagram.title,
    diagram.address,
    diagram.notes ?? "",
    diagram.sourceMeasurementRef ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function statusBadgeClass(status: SchematicStatus): string {
  return status === "final"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

export function WmPrintSchematicsPanel({
  jobs,
  measurements,
  schematics,
  onChangeSchematics,
  onCommitSchematics,
}: {
  jobs: Job[];
  measurements: ElectricalMeasurement[];
  schematics: SingleLineDiagram[];
  onChangeSchematics: (next: SingleLineDiagram[]) => void;
  onCommitSchematics: (next?: SingleLineDiagram[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showImportPicker, setShowImportPicker] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const sorted = useMemo(
    () => [...schematics].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [schematics],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return matchesSearch(d, q);
    });
  }, [sorted, search, statusFilter]);

  const selected = selectedId ? getSchematicById(schematics, selectedId) ?? null : null;

  const previewSvg = useMemo(() => {
    if (!selected) return null;
    if (!SCHEMATIC_UI_LAYOUT_PROFILES.includes(selected.layoutProfile)) {
      return null;
    }
    try {
      return renderSchematicSvg(selected);
    } catch (e) {
      return e instanceof SchematicRenderError ? `<!-- ${e.message} -->` : null;
    }
  }, [selected]);

  const persist = (next: SingleLineDiagram[]) => {
    onChangeSchematics(next);
    onCommitSchematics(next);
  };

  const handleEditorChange = (diagram: SingleLineDiagram) => {
    const { schematics: next } = upsertSchematic(schematics, diagram);
    onChangeSchematics(next);
    onCommitSchematics(next);
  };

  const createFromTemplate = (templateId: SchematicStartTemplateId) => {
    const diagram = buildSchematicFromTemplate(templateId, {
      address: "",
    });
    const { schematics: next } = upsertSchematic(schematics, diagram);
    persist(next);
    setSelectedId(diagram.id);
    setShowCreateMenu(false);
    toast.success(`Utworzono: ${schematicStartTemplateLabel(templateId)}`);
  };

  const createFromMeasurement = (measurement: ElectricalMeasurement) => {
    const existing = getSchematicBySourceMeasurementId(schematics, measurement.id);
    if (existing) {
      toast.message("Schemat powiązany z tym RAP już istnieje — otwieram kopię.");
      setSelectedId(existing.id);
      setShowImportPicker(false);
      return;
    }
    const job = measurement.jobId ? jobs.find((j) => j.id === measurement.jobId) : undefined;
    const diagram = importSchematicFromMeasurement(measurement, {
      address: job ? jobDisplayTitle(job).toUpperCase() : "",
    });
    const { schematics: next } = upsertSchematic(schematics, diagram);
    persist(next);
    setSelectedId(diagram.id);
    setShowImportPicker(false);
    toast.success(`Zaimportowano z ${measurement.reportNumber}`);
  };

  const handleDuplicate = () => {
    if (!selected) return;
    const copy = duplicateSchematic(selected, {
      jobId: selected.jobId,
      address: selected.address,
    });
    const { schematics: next } = upsertSchematic(schematics, copy);
    persist(next);
    setSelectedId(copy.id);
    toast.success("Zduplikowano schemat");
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!window.confirm(`Usunąć schemat „${selected.address || selected.title}”?`)) return;
    const { schematics: next } = removeSchematic(schematics, selected.id);
    persist(next);
    setSelectedId(null);
    toast.success("Usunięto schemat");
  };

  const handleExportPdf = async () => {
    if (!selected) return;
    const validation = validateSchematicForExport(selected);
    if (!validation.ok) {
      toast.error(`Uzupełnij pola: ${validation.missing.join(", ")}`);
      return;
    }
    if (!SCHEMATIC_UI_LAYOUT_PROFILES.includes(selected.layoutProfile)) {
      toast.error("Eksport PDF niedostępny dla tego layoutu w MVP");
      return;
    }
    if (selected.status === "draft") {
      const ok = window.confirm(
        "Schemat ma status roboczy. PDF będzie zawierał znak wodny WERSJA ROBOCZA.\n\nPobierz mimo to?",
      );
      if (!ok) return;
    }
    setPdfBusy(true);
    try {
      const { bytes, fileName } = await generateSchematicPdf(selected);
      saveAs(new Blob([bytes], { type: "application/pdf" }), fileName);
      toast.success(`Pobrano ${fileName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd eksportu PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const importableMeasurements = useMemo(
    () => [...measurements].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [measurements],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] gap-4 min-h-0">
      <div className="space-y-3 min-h-0 flex flex-col">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj adresu, tytułu…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          >
            <option value="all">Wszystkie statusy</option>
            <option value="draft">Robocze</option>
            <option value="final">Finalne</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 relative">
          <button
            type="button"
            onClick={() => {
              setShowCreateMenu((v) => !v);
              setShowImportPicker(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={14} />
            Utwórz
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImportPicker((v) => !v);
              setShowCreateMenu(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium"
          >
            Z pomiaru
          </button>
          {showCreateMenu && (
            <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border border-border bg-card shadow-lg p-1">
              <p className="px-2 py-1 text-xs text-muted-foreground font-medium">Szablon startowy</p>
              {SCHEMATIC_UI_START_TEMPLATE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => createFromTemplate(id)}
                  className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-secondary"
                >
                  {schematicStartTemplateLabel(id)}
                </button>
              ))}
            </div>
          )}
          {showImportPicker && (
            <div className="absolute top-full left-0 z-20 mt-1 w-full max-w-md max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg p-1">
              {importableMeasurements.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Brak raportów pomiarowych.</p>
              ) : (
                importableMeasurements.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => createFromMeasurement(m)}
                    className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-secondary"
                  >
                    <span className="font-medium">{m.reportNumber}</span>
                    {m.address ? (
                      <span className="block text-xs text-muted-foreground truncate">{m.address}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden flex-1 min-h-[240px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Brak schematów dla filtrów.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className={`w-full text-left px-3 py-3 hover:bg-secondary/50 transition-colors ${
                      selectedId === d.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusBadgeClass(d.status)}`}>
                        {SCHEMATIC_STATUS_LABELS[d.status]}
                      </span>
                      {d.flags?.test && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700">
                          TEST
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1 line-clamp-2">
                      {d.address.trim() || d.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.documentDate} · {d.circuits.length} obw.
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} / {schematics.length} schematów · sync chmura</p>
      </div>

      <div className="min-w-0 space-y-4">
        {!selected ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-border bg-card p-4">
            Wybierz schemat z listy lub utwórz nowy (szablon lub import z pomiaru RAP).
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h2 className="text-sm font-semibold truncate">
                {selected.address.trim() || selected.title}
              </h2>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary"
                >
                  <Copy size={14} />
                  Duplikuj
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                  Usuń
                </button>
                <button
                  type="button"
                  disabled={pdfBusy}
                  onClick={() => void handleExportPdf()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Eksport PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WmPrintSchematicEditor
                diagram={selected}
                jobs={jobs}
                onChange={handleEditorChange}
              />
              <section className="rounded-xl border border-border bg-card p-3 space-y-2 lg:sticky lg:top-0 self-start">
                <h3 className="text-sm font-semibold">Podgląd SVG</h3>
                {previewSvg && previewSvg.startsWith("<svg") ? (
                  <div
                    className="w-full overflow-auto rounded-lg border border-border bg-white min-h-[280px] max-h-[70vh]"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-4">
                    {!SCHEMATIC_UI_LAYOUT_PROFILES.includes(selected.layoutProfile)
                      ? "Podgląd niedostępny dla tego layoutu w MVP."
                      : "Nie udało się wyrenderować podglądu — sprawdź pola obwodów."}
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Package,
  Settings,
  ClipboardList,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import { computeWmPrintCompleteness } from "@/lib/wm-print/completeness";
import {
  jobMatchesWmPrintFilter,
  wmPrintJobStatusLabel,
  WM_PRINT_FILTER_LABELS,
} from "@/lib/wm-print/filters";
import {
  groupWmPrintJobsByPhase,
  WM_PRINT_SECTION_LABELS,
  WM_PRINT_SECTION_ORDER,
} from "@/lib/wm-print/job-phase-grouping";
import type { JobPhase } from "@/lib/job-list-status";
import type { WmPrintJobFilter } from "@/lib/wm-print/types";
import {
  addWmPrintJobDocument,
  deleteWmPrintJobDocumentLogical,
  getWmPrintJobDocumentsForJob,
} from "@/lib/wm-print/job-documents";
import { downloadWmPrintTemplateFileGenerated, downloadWmPrintZip } from "@/lib/wm-print/generate-zip";
import {
  addWmPrintTemplateFile,
  addWmPrintTemplateFiles,
  createWmPrintTemplate,
  countWmPrintTemplateFiles,
  deleteWmPrintTemplateLogical,
  getWmPrintTemplateFiles,
  isWmPrintPdfFileName,
  isWmPrintTemplateUploadFileAccepted,
  removeWmPrintTemplateFile,
  reorderWmPrintTemplates,
  updateWmPrintTemplate,
  wmPrintTemplateFileLabel,
  wmPrintTemplateGroupLabel,
} from "@/lib/wm-print/templates";
import { DEFAULT_WM_PRINT_SETTINGS, normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import type {
  WmPrintDateMode,
  WmPrintGenerateOptions,
  WmPrintJobDocument,
  WmPrintSettings,
  WmPrintTemplate,
  WmPrintTemplateFile,
  WmPrintTemplateType,
  WmPrintVariableKey,
} from "@/lib/wm-print/types";
import { WM_PRINT_VARIABLE_KEYS, WM_PRINT_VARIABLE_LABELS } from "@/lib/wm-print/types";
import { fetchWmPrintFileBytes, uploadWmPrintJobDocumentFile, uploadWmPrintTemplateFile } from "@/lib/wm-print/upload";
import { formatWmPrintDate } from "@/lib/wm-print/variables";
import {
  addDeletedWmPrintJobDocId,
  addDeletedWmPrintTemplateId,
} from "@/lib/wm-print/wm-print-sync";

type Tab = "odbiory" | "szablony" | "ustawienia";

export function WmPrintView({
  jobs,
  templates,
  jobDocs,
  settings,
  uploadedBy,
  onChangeTemplates,
  onChangeJobDocs,
  onChangeSettings,
  onCommit,
}: {
  jobs: Job[];
  templates: WmPrintTemplate[];
  jobDocs: WmPrintJobDocument[];
  settings: WmPrintSettings;
  uploadedBy: string;
  onChangeTemplates: (next: WmPrintTemplate[] | ((prev: WmPrintTemplate[]) => WmPrintTemplate[])) => void;
  onChangeJobDocs: (next: WmPrintJobDocument[] | ((prev: WmPrintJobDocument[]) => WmPrintJobDocument[])) => void;
  onChangeSettings: (next: WmPrintSettings | ((prev: WmPrintSettings) => WmPrintSettings)) => void;
  onCommit: (
    nextTemplates?: WmPrintTemplate[],
    nextJobDocs?: WmPrintJobDocument[],
    nextSettings?: WmPrintSettings,
    deletedTemplateId?: string,
    deletedJobDocId?: string,
  ) => void;
}) {
  const [tab, setTab] = useState<Tab>("odbiory");
  const [filter, setFilter] = useState<WmPrintJobFilter>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<JobPhase>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<WmPrintDateMode>("today");
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const templateFileRef = useRef<HTMLInputElement>(null);
  const jobDocFileRef = useRef<HTMLInputElement>(null);
  const [pendingTemplateUploadId, setPendingTemplateUploadId] = useState<string | null>(null);
  const [pendingJobDocTemplateId, setPendingJobDocTemplateId] = useState<string | null>(null);

  const normalizedSettings = useMemo(() => normalizeWmPrintSettings(settings), [settings]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => jobMatchesWmPrintFilter(j, filter))
      .filter((j) => {
        if (!q) return true;
        const label = jobDisplayTitle(j).toLowerCase();
        return label.includes(q) || (j.address || "").toLowerCase().includes(q);
      });
  }, [jobs, filter, search]);

  const groupedJobs = useMemo(() => groupWmPrintJobsByPhase(filteredJobs), [filteredJobs]);

  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) ?? null : null;
  const selectedJobDocs = selectedJob ? getWmPrintJobDocumentsForJob(jobDocs, selectedJob.id) : [];

  const genOpts = (): WmPrintGenerateOptions => ({
    dateMode,
    customDate: dateMode === "custom" ? new Date(customDate + "T12:00:00") : undefined,
  });

  const commitAll = (
    tpl = templates,
    docs = jobDocs,
    sett = normalizedSettings,
    delTpl?: string,
    delDoc?: string,
  ) => {
    onCommit(tpl, docs, sett, delTpl, delDoc);
  };

  const toggleSection = (phase: JobPhase) => {
    setCollapsedSections((prev) => {
      const n = new Set(prev);
      if (n.has(phase)) n.delete(phase);
      else n.add(phase);
      return n;
    });
  };

  const renderJobRow = (job: Job) => {
    const comp = computeWmPrintCompleteness(job, templates, jobDocs);
    const docCount = getWmPrintJobDocumentsForJob(jobDocs, job.id).length;
    const active = selectedJobId === job.id;
    return (
      <button
        key={job.id}
        type="button"
        onClick={() => setSelectedJobId(job.id)}
        className={`w-full text-left px-4 py-3 transition-colors ${active ? "bg-primary/8" : "hover:bg-secondary/60"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{jobDisplayTitle(job)}</p>
            <p className="text-xs text-primary/90 font-medium">{wmPrintJobStatusLabel(job)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-medium">{comp.percent}%</p>
            <p className="text-[10px] text-muted-foreground">{docCount} dok.</p>
          </div>
        </div>
        {comp.missing.length > 0 && (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1 truncate">
            Brakuje: {comp.missing.slice(0, 3).join(", ")}
            {comp.missing.length > 3 ? "…" : ""}
          </p>
        )}
      </button>
    );
  };

  const handleGenerateZip = async (job: Job, onlySelected = false) => {
    setBusy(true);
    const ids = onlySelected && selectedTemplateIds.size > 0 ? [...selectedTemplateIds] : undefined;
    const res = await downloadWmPrintZip(job, templates, jobDocs, normalizedSettings, genOpts(), ids);
    setBusy(false);
    if (res.ok) toast.success("Pobrano paczkę ZIP");
    else toast.error(res.error || "Błąd generowania ZIP");
  };

  const handleGenerateSingle = async (job: Job, template: WmPrintTemplate, templateFile: WmPrintTemplateFile) => {
    setBusy(true);
    const res = await downloadWmPrintTemplateFileGenerated(
      job,
      template,
      templateFile,
      jobDocs,
      normalizedSettings,
      genOpts(),
    );
    setBusy(false);
    if (res.ok) toast.success(`Pobrano: ${templateFile.originalFileName}`);
    else toast.error(res.error || "Błąd generowania");
  };

  const wmPrintFilesAddedLabel = (n: number): string => {
    if (n === 1) return "1 plik";
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} pliki`;
    return `${n} plików`;
  };

  const handleTemplateFilesPick = async (fileList: FileList | File[], templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const picked = [...fileList].filter((f) => f.size > 0);
    if (picked.length === 0) return;

    const rejected = picked.filter((f) => !isWmPrintTemplateUploadFileAccepted(f.name, template.type));
    if (rejected.length > 0) {
      toast.error(
        `Nieobsługiwany format (${template.type}): ${rejected.map((f) => f.name).join(", ")}`,
      );
      return;
    }

    setBusy(true);
    const uploaded: Array<{
      id: string;
      storagePath: string;
      storageUrl: string;
      originalFileName: string;
    }> = [];

    for (const file of picked) {
      const fileId = crypto.randomUUID();
      const up = await uploadWmPrintTemplateFile(templateId, file, fileId);
      if ("error" in up) {
        toast.error(`${file.name}: ${up.error}`);
        continue;
      }
      uploaded.push({
        id: fileId,
        storagePath: up.path,
        storageUrl: up.publicUrl,
        originalFileName: file.name,
      });
    }

    if (uploaded.length === 0) {
      setBusy(false);
      return;
    }

    let next: WmPrintTemplate[] | null = null;
    let added = 0;
    onChangeTemplates((prev) => {
      const result = addWmPrintTemplateFiles(prev, templateId, uploaded);
      added = result.added;
      next = result.templates;
      return next;
    });
    if (next) commitAll(next);
    setBusy(false);
    toast.success(`Dodano ${wmPrintFilesAddedLabel(added)} do grupy ${template.name}`);
  };

  const handleRemoveTemplateFile = (templateId: string, fileId: string) => {
    let next: WmPrintTemplate[] | null = null;
    onChangeTemplates((prev) => {
      next = removeWmPrintTemplateFile(prev, templateId, fileId);
      return next;
    });
    if (next) commitAll(next);
    toast.success("Usunięto plik z grupy");
  };

  const handleDownloadTemplateFileRaw = async (tf: WmPrintTemplateFile) => {
    try {
      setBusy(true);
      const bytes = await fetchWmPrintFileBytes(tf.storageUrl);
      const blob = new Blob([bytes], {
        type: tf.originalFileName.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = tf.originalFileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Nie udało się pobrać pliku");
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewTemplateFile = (tf: WmPrintTemplateFile) => {
    if (!isWmPrintPdfFileName(tf.originalFileName)) {
      toast.message("Podgląd dostępny tylko dla PDF");
      return;
    }
    window.open(tf.storageUrl, "_blank", "noopener,noreferrer");
  };

  const handleJobDocUpload = async (file: File, job: Job, templateId?: string, name?: string) => {
    setBusy(true);
    const up = await uploadWmPrintJobDocumentFile(job.id, file);
    if ("error" in up) {
      setBusy(false);
      toast.error(up.error);
      return;
    }
    const doc: WmPrintJobDocument = {
      id: crypto.randomUUID(),
      jobId: job.id,
      templateId,
      name: name || file.name.replace(/\.[^.]+$/, ""),
      storagePath: up.path,
      storageUrl: up.publicUrl,
      originalFileName: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    };
    const nextDocs = addWmPrintJobDocument(jobDocs, doc);
    onChangeJobDocs(nextDocs);
    commitAll(templates, nextDocs);
    setBusy(false);
    toast.success("Dodano dokument do roboty");
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const moveTemplate = (id: string, dir: -1 | 1) => {
    const ordered = [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = ordered.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= ordered.length) return;
    const ids = ordered.map((t) => t.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    const next = reorderWmPrintTemplates(templates, ids);
    onChangeTemplates(next);
    commitAll(next);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="shrink-0 border-b border-border px-4 py-3 space-y-3">
        <div>
          <h1 className="text-lg font-semibold">Odbiory WM Druk</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Szablony dokumentów, dokumenty per robota i generowanie paczek ZIP dla WM Wrocław.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { key: "odbiory" as const, label: "Odbiory", icon: ClipboardList },
              { key: "szablony" as const, label: "Szablony", icon: FileText },
              { key: "ustawienia" as const, label: "Ustawienia", icon: Settings },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
        {tab === "odbiory" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 min-h-0">
            <div className="space-y-3 min-h-0">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Szukaj adresu…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as WmPrintJobFilter)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
                  title="Filtr statusu robota"
                >
                  {(Object.keys(WM_PRINT_FILTER_LABELS) as WmPrintJobFilter[]).map((k) => (
                    <option key={k} value={k}>
                      {WM_PRINT_FILTER_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                {filteredJobs.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Brak robót dla wybranych filtrów.</p>
                ) : (
                  WM_PRINT_SECTION_ORDER.map((phase) => {
                    const sectionJobs = groupedJobs[phase];
                    if (sectionJobs.length === 0) return null;
                    const collapsed = collapsedSections.has(phase);
                    return (
                      <div key={phase} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleSection(phase)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-secondary/40 hover:bg-secondary/70 text-left text-sm font-semibold"
                        >
                          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          {WM_PRINT_SECTION_LABELS[phase]} ({sectionJobs.length})
                        </button>
                        {!collapsed && (
                          <div className="divide-y divide-border">{sectionJobs.map((job) => renderJobRow(job))}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-4 lg:sticky lg:top-0 self-start">
              {!selectedJob ? (
                <p className="text-sm text-muted-foreground">Wybierz robotę z listy.</p>
              ) : (
                <>
                  <div>
                    <h2 className="font-semibold text-sm">{jobDisplayTitle(selectedJob)}</h2>
                    <p className="text-xs text-muted-foreground">Status: {wmPrintJobStatusLabel(selectedJob)}</p>
                  </div>

                  {(() => {
                    const comp = computeWmPrintCompleteness(selectedJob, templates, jobDocs);
                    return (
                      <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                        <p className="text-sm font-medium">Kompletność {comp.percent}%</p>
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${comp.percent}%` }}
                          />
                        </div>
                        {comp.missing.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Brakuje: {comp.missing.join(", ")}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data na dokumentach</p>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          checked={dateMode === "today"}
                          onChange={() => setDateMode("today")}
                        />
                        Dzisiejsza ({formatWmPrintDate(new Date())})
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          checked={dateMode === "custom"}
                          onChange={() => setDateMode("custom")}
                        />
                        Własna
                      </label>
                    </div>
                    {dateMode === "custom" && (
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleGenerateZip(selectedJob, false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                      Generuj komplet (ZIP)
                    </button>
                    <button
                      type="button"
                      disabled={busy || selectedTemplateIds.size === 0}
                      onClick={() => handleGenerateZip(selectedJob, true)}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-border text-sm font-medium disabled:opacity-50"
                    >
                      <Download size={14} />
                      Generuj wybrane ({selectedTemplateIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingJobDocTemplateId(null);
                        jobDocFileRef.current?.click();
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Plus size={14} />
                      Dodaj dokument
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Dokumenty przypisane</p>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {templates
                        .filter((t) => t.enabled)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((t) => {
                          const checked = selectedTemplateIds.has(t.id);
                          const groupFiles = getWmPrintTemplateFiles(t);
                          const jobDocsForSlot = selectedJobDocs.filter((d) => d.templateId === t.id);
                          const fileCount =
                            t.kind === "job_upload" ? jobDocsForSlot.length : groupFiles.length;
                          return (
                            <li key={t.id} className="py-1 border-b border-border/50 last:border-0 space-y-0.5">
                              <div className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTemplateSelection(t.id)}
                                />
                                <span className="flex-1 truncate font-medium">
                                  {t.name} ({fileCount})
                                </span>
                                {t.kind === "job_upload" && (
                                  <button
                                    type="button"
                                    className="text-primary text-[10px]"
                                    onClick={() => {
                                      setPendingJobDocTemplateId(t.id);
                                      jobDocFileRef.current?.click();
                                    }}
                                  >
                                    + plik
                                  </button>
                                )}
                              </div>
                              {t.kind === "generated" &&
                                groupFiles.map((tf) => (
                                  <div key={tf.id} className="flex items-center gap-2 text-[10px] pl-5 text-muted-foreground">
                                    <span className="flex-1 truncate">{tf.originalFileName}</span>
                                    <button
                                      type="button"
                                      title="Generuj z danymi roboty"
                                      disabled={busy}
                                      onClick={() => handleGenerateSingle(selectedJob, t, tf)}
                                      className="p-0.5 rounded hover:bg-secondary"
                                    >
                                      <Download size={10} />
                                    </button>
                                  </div>
                                ))}
                              {t.kind === "job_upload" &&
                                jobDocsForSlot.map((d) => (
                                  <div key={d.id} className="flex items-center gap-2 text-[10px] pl-5 text-muted-foreground">
                                    <span className="flex-1 truncate">{d.originalFileName}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const { docs, deletedId } = deleteWmPrintJobDocumentLogical(jobDocs, d.id);
                                        addDeletedWmPrintJobDocId(deletedId);
                                        onChangeJobDocs(docs);
                                        commitAll(templates, docs, normalizedSettings, undefined, deletedId);
                                      }}
                                      className="p-0.5 text-destructive"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                ))}
                            </li>
                          );
                        })}
                      {selectedJobDocs
                        .filter((d) => !d.templateId)
                        .map((d) => (
                          <li key={d.id} className="flex items-center gap-2 text-xs py-1">
                            <span className="flex-1 truncate">{d.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const { docs, deletedId } = deleteWmPrintJobDocumentLogical(jobDocs, d.id);
                                addDeletedWmPrintJobDocId(deletedId);
                                onChangeJobDocs(docs);
                                commitAll(templates, docs, normalizedSettings, undefined, deletedId);
                              }}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "szablony" && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = createWmPrintTemplate(templates, { name: "Nowy szablon", kind: "generated", type: "docx" });
                  onChangeTemplates(next);
                  commitAll(next);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                <Plus size={14} />
                Szablon generowany
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = createWmPrintTemplate(templates, { name: "Nowy slot", kind: "job_upload" });
                  onChangeTemplates(next);
                  commitAll(next);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm"
              >
                <Plus size={14} />
                Slot wgrywany per robota
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Zmienne w szablonach: {WM_PRINT_VARIABLE_KEYS.map((k) => `{{${k}}}`).join(", ")}
            </p>

            <div className="rounded-xl border border-border divide-y divide-border">
              {[...templates].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => {
                const groupFiles = getWmPrintTemplateFiles(t);
                return (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveTemplate(t.id, -1)} className="p-0.5 hover:bg-secondary rounded">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveTemplate(t.id, 1)} className="p-0.5 hover:bg-secondary rounded">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          value={t.name}
                          onChange={(e) => onChangeTemplates(updateWmPrintTemplate(templates, t.id, { name: e.target.value }))}
                          onBlur={() => commitAll()}
                          className="flex-1 min-w-[160px] font-medium text-sm px-2 py-1 rounded border border-border bg-background"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {wmPrintTemplateGroupLabel(t)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = updateWmPrintTemplate(templates, t.id, { enabled: !t.enabled });
                            onChangeTemplates(next);
                            commitAll(next);
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          {t.enabled ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
                          {t.enabled ? "Włączony" : "Wyłączony"}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.kind === "job_upload" ? "Wgrywany per robota" : t.type.toUpperCase()} · {wmPrintTemplateFileLabel(t)}
                      </p>
                      {t.kind === "generated" && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={t.type}
                            onChange={(e) => {
                              const next = updateWmPrintTemplate(templates, t.id, {
                                type: e.target.value as WmPrintTemplateType,
                              });
                              onChangeTemplates(next);
                              commitAll(next);
                            }}
                            className="text-xs px-2 py-1 rounded border border-border"
                          >
                            <option value="docx">DOCX</option>
                            <option value="pdf">PDF</option>
                            <option value="pdf_form">PDF Formularz</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingTemplateUploadId(t.id);
                              templateFileRef.current?.click();
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary"
                          >
                            <Plus size={12} />
                            Dodaj pliki
                          </button>
                          <div
                            role="button"
                            tabIndex={0}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const dropped = [...e.dataTransfer.files];
                              if (dropped.length > 0) void handleTemplateFilesPick(dropped, t.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setPendingTemplateUploadId(t.id);
                                templateFileRef.current?.click();
                              }
                            }}
                            className="w-full text-xs px-2 py-2 rounded-lg border border-dashed border-border/80 text-muted-foreground hover:bg-secondary/40 text-center cursor-pointer"
                          >
                            Przeciągnij pliki tutaj lub wybierz „Dodaj pliki”
                          </div>
                        </div>
                      )}
                      {t.kind === "generated" && groupFiles.length > 0 && (
                        <ul className="space-y-1 rounded-lg border border-border/60 divide-y divide-border/40">
                          {groupFiles.map((tf) => (
                            <li key={tf.id} className="flex items-center gap-2 px-2 py-1.5 text-xs">
                              <span className="flex-1 truncate">{tf.originalFileName}</span>
                              {isWmPrintPdfFileName(tf.originalFileName) && (
                                <button
                                  type="button"
                                  title="Podgląd PDF"
                                  onClick={() => handlePreviewTemplateFile(tf)}
                                  className="p-1 rounded hover:bg-secondary text-muted-foreground"
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Pobierz"
                                onClick={() => void handleDownloadTemplateFileRaw(tf)}
                                className="p-1 rounded hover:bg-secondary"
                              >
                                <Download size={12} />
                              </button>
                              <button
                                type="button"
                                title="Usuń plik"
                                onClick={() => {
                                  if (!confirm(`Usunąć „${tf.originalFileName}" z grupy?`)) return;
                                  handleRemoveTemplateFile(t.id, tf.id);
                                }}
                                className="p-1 rounded hover:bg-destructive/10 text-destructive"
                              >
                                <Trash2 size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Usunąć całą grupę „${t.name}"?`)) return;
                        const { templates: next, deletedId } = deleteWmPrintTemplateLogical(templates, t.id);
                        addDeletedWmPrintTemplateId(deletedId);
                        onChangeTemplates(next);
                        commitAll(next, jobDocs, normalizedSettings, deletedId);
                      }}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {tab === "ustawienia" && (
          <div className="max-w-md space-y-4">
            <div>
              <label className="text-sm font-medium">Domyślne miasto ({"{{JOB_CITY}}"})</label>
              <input
                value={normalizedSettings.defaultCity}
                onChange={(e) => onChangeSettings({ ...normalizedSettings, defaultCity: e.target.value })}
                onBlur={() => commitAll(templates, jobDocs, normalizedSettings)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Przyrostek nazwy ZIP</label>
              <input
                value={normalizedSettings.zipNameSuffix}
                onChange={(e) => onChangeSettings({ ...normalizedSettings, zipNameSuffix: e.target.value })}
                onBlur={() => commitAll(templates, jobDocs, normalizedSettings)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border text-sm"
                placeholder="ODBIOR_WM"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Przykład: GORLICKA_26_6_ODBIOR_WM.zip
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-sm font-medium">Zmienne systemowe V1</p>
              {WM_PRINT_VARIABLE_KEYS.map((k: WmPrintVariableKey) => (
                <p key={k} className="text-xs text-muted-foreground">
                  <code className="text-foreground">{`{{${k}}}`}</code> — {WM_PRINT_VARIABLE_LABELS[k]}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onChangeSettings({ ...DEFAULT_WM_PRINT_SETTINGS });
                commitAll(templates, jobDocs, DEFAULT_WM_PRINT_SETTINGS);
                toast.success("Przywrócono ustawienia domyślne");
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Przywróć domyślne
            </button>
          </div>
        )}
      </div>

      <input
        ref={templateFileRef}
        type="file"
        multiple
        className="hidden"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          const files = e.target.files ? [...e.target.files] : [];
          e.target.value = "";
          if (files.length === 0 || !pendingTemplateUploadId) return;
          void handleTemplateFilesPick(files, pendingTemplateUploadId);
          setPendingTemplateUploadId(null);
        }}
      />
      <input
        ref={jobDocFileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !selectedJob) return;
          const tpl = pendingJobDocTemplateId
            ? templates.find((t) => t.id === pendingJobDocTemplateId)
            : undefined;
          void handleJobDocUpload(file, selectedJob, tpl?.id, tpl?.name);
          setPendingJobDocTemplateId(null);
        }}
      />
    </div>
  );
}

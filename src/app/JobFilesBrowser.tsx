import { useMemo, useState, type RefObject } from "react";
import {
  FolderOpen, Search, ChevronRight, ChevronDown, Download, Package, Eye, FileText,
} from "lucide-react";
import {
  collectJobBrowserFileGroups,
  countBrowserFiles,
  jobBrowserTitle,
  jobHasBrowserFiles,
  summarizeJobBrowserFiles,
  jobFileSummaryChips,
  type JobFilesBrowserSource,
  type JobBrowserFile,
  type JobFileSummaryChip,
} from "@/lib/job-files-browser";
import { downloadJobDocumentsPack, type JobPackSource } from "@/lib/job-documents-pack";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";

function toPreviewItem(file: JobBrowserFile): InspectorFileItem | null {
  if (file.id.startsWith("jf-")) {
    return {
      kind: "jobFile",
      file: {
        id: file.id.slice(3),
        kind: file.category === "Zlecenie" ? "zlecenie" : "kosztorys",
        filename: file.filename,
        publicUrl: file.url,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.dateIso,
      },
    };
  }
  if (file.id.startsWith("ip-")) {
    return {
      kind: "inspectorPhoto",
      file: {
        id: file.id.slice(3),
        publicUrl: file.url,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.dateIso,
        caption: file.filename,
        label: "before_handover",
        path: "",
      },
    };
  }
  if (file.canPreview && (file.id.startsWith("cp-") || file.id.startsWith("sk-"))) {
    return { kind: "imageUrl", url: file.url, filename: file.filename };
  }
  return null;
}

const CHIP_STYLE: Record<JobFileSummaryChip["key"], string> = {
  zlecenie: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  kosztorys: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

function JobFileSummaryBadges({ job }: { job: JobFilesBrowserSource }) {
  const summary = summarizeJobBrowserFiles(job);
  const chips = jobFileSummaryChips(summary);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
        {summary.total} {summary.total === 1 ? "plik" : summary.total < 5 ? "pliki" : "plików"}
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CHIP_STYLE[chip.key]}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function JobFilesBrowser({
  jobs,
  athPreviewEnabled,
  onOpenJob,
  layout = "inspector",
  embedded = false,
  scrollRef,
}: {
  jobs: JobFilesBrowserSource[];
  athPreviewEnabled: boolean;
  onOpenJob: (jobId: string) => void;
  layout?: "inspector" | "admin";
  /** Ukryj nagłówek h1 — np. w zakładce Media */
  embedded?: boolean;
  /** Jeden scroll-container — np. pull-to-refresh w panelu Inspektora */
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [packBusy, setPackBusy] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);

  const jobsWithFiles = useMemo(
    () => jobs.filter(jobHasBrowserFiles).sort((a, b) => jobBrowserTitle(a).localeCompare(jobBrowserTitle(b), "pl")),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobsWithFiles;
    return jobsWithFiles.filter((j) =>
      (j.address || "").toLowerCase().includes(q) ||
      (j.flatNumber || "").toLowerCase().includes(q) ||
      (j.client || "").toLowerCase().includes(q),
    );
  }, [jobsWithFiles, search]);

  const totalFiles = useMemo(
    () => jobsWithFiles.reduce((s, j) => s + countBrowserFiles(j), 0),
    [jobsWithFiles],
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadPack = async (job: JobFilesBrowserSource) => {
    setPackBusy(job.id);
    try {
      await downloadJobDocumentsPack(job as JobPackSource);
    } finally {
      setPackBusy(null);
    }
  };

  const maxW = layout === "admin" ? "max-w-4xl" : "max-w-2xl";
  const titleCls = layout === "admin" ? "text-xl font-bold" : "text-base font-semibold";
  const descCls = layout === "admin" ? "text-sm" : "text-[11px]";

  const scrollPad = scrollRef ? "" : "pb-20 sm:pb-6";

  return (
    <div className={`flex flex-col min-h-0 overflow-hidden ${scrollRef ? "flex-1 w-full" : "flex-1"}`}>
      <div ref={scrollRef} className={`flex-1 w-full overflow-y-auto overscroll-contain ${scrollPad}`}>
        <div className={`${maxW} mx-auto w-full px-4 sm:px-8 py-6 space-y-4`} style={{ paddingBottom: layout === "inspector" ? "max(1rem, env(safe-area-inset-bottom))" : undefined }}>
          {!embedded && (
            <div>
              <h1 className={`${titleCls} flex items-center gap-2`}>
                <FolderOpen size={layout === "admin" ? 22 : 18} className="text-primary"/>
                Pliki robot
              </h1>
              <p className={`${descCls} text-muted-foreground mt-1 leading-relaxed`}>
                Zlecenia i kosztorysy — pobierz pojedynczo lub pakiet Dokumenty ZIP (bez zdjęć).
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Roboty z plikami</p>
              <p className="text-lg font-bold text-primary mt-0.5">{jobsWithFiles.length}</p>
            </div>
            <div className="bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Łącznie dokumentów</p>
              <p className="text-lg font-bold mt-0.5">{totalFiles}</p>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              type="text"
              placeholder="Szukaj adresu, klienta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen size={40} className="mx-auto opacity-20 mb-3"/>
              <p className="text-sm">Brak wgranych plików na robotach.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => {
                const expanded = expandedIds.has(job.id);
                const groups = collectJobBrowserFileGroups(job);
                return (
                  <div key={job.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(job.id)}
                      className="w-full text-left px-4 sm:px-5 py-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{jobBrowserTitle(job)}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.client || "—"}</p>
                          <JobFileSummaryBadges job={job}/>
                        </div>
                        {expanded ? <ChevronDown size={16} className="shrink-0 mt-1"/> : <ChevronRight size={16} className="shrink-0 mt-1"/>}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 sm:px-5 pb-4 space-y-4 border-t border-border pt-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={packBusy === job.id}
                            onClick={() => downloadPack(job)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium min-h-[44px] disabled:opacity-50"
                          >
                            <Package size={13}/>
                            {packBusy === job.id ? "Pakowanie…" : "Dokumenty ZIP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenJob(job.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium min-h-[44px]"
                          >
                            Otwórz robotę
                          </button>
                        </div>

                        {groups.map((group) => (
                          <div key={group.category}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <FileText size={11}/>
                              {group.category}
                            </p>
                            <div className="space-y-1.5">
                              {group.files.map((file) => {
                                const preview = toPreviewItem(file);
                                const canPreview = file.canPreview && preview && (
                                  preview.kind === "imageUrl" ||
                                  isPdfFilename(file.filename) ||
                                  isKosztorysPreviewExt(file.filename)
                                );
                                return (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl px-3 py-2.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate">{file.filename}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {file.dateLabel} · {file.uploadedBy}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {canPreview && preview && (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewItem(preview)}
                                          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-secondary font-medium min-h-[36px]"
                                        >
                                          <Eye size={11}/> Podgląd
                                        </button>
                                      )}
                                      <a
                                        href={file.url}
                                        download={file.filename}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-primary/90 text-primary-foreground font-medium min-h-[36px]"
                                      >
                                        <Download size={11}/>
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

/** @deprecated Użyj JobFilesBrowser */
export const InspectorJobFilesBrowser = JobFilesBrowser;

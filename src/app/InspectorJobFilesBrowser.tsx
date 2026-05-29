import { useMemo, useState } from "react";
import {
  FolderOpen, Search, ChevronRight, ChevronDown, Download, Package, Eye, FileText, Camera,
} from "lucide-react";
import {
  collectJobBrowserFileGroups,
  countBrowserFiles,
  jobBrowserTitle,
  jobHasBrowserFiles,
  type JobFilesBrowserSource,
  type JobBrowserFile,
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

export function InspectorJobFilesBrowser({
  jobs,
  athPreviewEnabled,
  onOpenJob,
}: {
  jobs: JobFilesBrowserSource[];
  athPreviewEnabled: boolean;
  onOpenJob: (jobId: string) => void;
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FolderOpen size={18} className="text-primary"/>
              Pliki z robot
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Zlecenia, kosztorysy, zdjęcia ekipy i inspektora, rysunki z raportów — pobierz pojedynczo lub cały pakiet ZIP (foldery wg typu i daty).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card rounded-xl border border-border px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Roboty z plikami</p>
              <p className="text-lg font-bold text-primary mt-0.5">{jobsWithFiles.length}</p>
            </div>
            <div className="bg-card rounded-xl border border-border px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Łącznie plików</p>
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
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen size={36} className="mx-auto opacity-20 mb-2"/>
              <p className="text-xs">Brak wgranych plików na robotach.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => {
                const expanded = expandedIds.has(job.id);
                const groups = collectJobBrowserFileGroups(job);
                const fileCount = countBrowserFiles(job);
                return (
                  <div key={job.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(job.id)}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{jobBrowserTitle(job)}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{job.client || "—"}</p>
                          <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {fileCount} {fileCount === 1 ? "plik" : fileCount < 5 ? "pliki" : "plików"}
                          </span>
                        </div>
                        {expanded ? <ChevronDown size={16} className="shrink-0 mt-1"/> : <ChevronRight size={16} className="shrink-0 mt-1"/>}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={packBusy === job.id}
                            onClick={() => downloadPack(job)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium min-h-[44px] disabled:opacity-50 touch-manipulation"
                          >
                            <Package size={13}/>
                            {packBusy === job.id ? "Pakowanie…" : "Pobierz pakiet ZIP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenJob(job.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium min-h-[44px] touch-manipulation"
                          >
                            Otwórz robotę
                          </button>
                        </div>

                        {groups.map((group) => (
                          <div key={group.category}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              {group.category.startsWith("Zdjęcia") ? <Camera size={11}/> : <FileText size={11}/>}
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
                                          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-secondary font-medium min-h-[36px] touch-manipulation"
                                        >
                                          <Eye size={11}/> Podgląd
                                        </button>
                                      )}
                                      <a
                                        href={file.url}
                                        download={file.filename}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-primary/90 text-primary-foreground font-medium min-h-[36px] touch-manipulation"
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

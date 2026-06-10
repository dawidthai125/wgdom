import { useMemo, useState, type ReactNode } from "react";
import {
  Search, Download, Eye, FileText, ClipboardList, Ruler,
  MapPin, ChevronRight, ChevronDown, ArrowLeft, FolderOpen, ExternalLink,
  Paperclip, FileDown,
} from "lucide-react";
import type { Job } from "@/app/app-domain";
import { normalizeWorkerReport } from "@/app/app-domain";
import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import {
  canPreviewCatalogItem,
  collectAllJobFiles,
  fmtJobFileDate,
  jobDisplayTitle,
  JOB_FILE_CATEGORY_LABELS,
  type JobFileCatalogItem,
  type JobFileCategory,
  type JobFilesSource,
} from "@/lib/job-files-index";
import {
  countAllFilesHubItems,
  countAllHubAttachmentItems,
  countAllHubContractItems,
  countAllHubReportItems,
  filterHubGroupByContractCategory,
  filterHubGroupByLayer,
  groupHubContentByJob,
  hubGroupSearchHaystack,
  jobHasFilesHubContent,
  type FilesHubAttachmentItem,
  type FilesHubJobSource,
  type FilesHubReportItem,
  type HubLayerFilter,
  type JobHubAddressGroup,
} from "@/lib/files-hub-index";
import { downloadWorkerReportPdfForJob } from "@/lib/worker-report-pdf";
import { formatJobAttachmentSize } from "@/lib/job-attachments";
import { isPdfFilename } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename } from "@/lib/tenders-bzp-filename";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";

const CATEGORY_ICONS: Record<JobFileCategory, typeof FileText> = {
  zlecenie: FileText,
  kosztorys: ClipboardList,
  plan_techniczny: Ruler,
};

function categoryIcon(category: JobFileCategory): typeof FileText {
  return CATEGORY_ICONS[category] ?? FileText;
}

function canPreviewAttachment(filename: string): boolean {
  return isPdfFilename(filename) || isDocxFilename(filename) || isXlsxFilename(filename);
}

type HubFilter = HubLayerFilter | JobFileCategory;

const LAYER_FILTERS: HubLayerFilter[] = ["all", "contract", "reports", "attachments"];
const CONTRACT_FILTERS: JobFileCategory[] = ["zlecenie", "kosztorys", "plan_techniczny"];

const LAYER_FILTER_LABELS: Record<HubLayerFilter, string> = {
  all: "Wszystkie",
  contract: "Kontrakt",
  reports: "Dokumentacja",
  attachments: "Załączniki",
};

function hubGroupHasVisibleContent(group: JobHubAddressGroup): boolean {
  return group.contract.length + group.reports.length + group.attachments.length > 0;
}

function applyHubFilter(group: JobHubAddressGroup, filter: HubFilter): JobHubAddressGroup {
  if (filter === "all") return group;
  if (filter === "contract" || filter === "reports" || filter === "attachments") {
    return filterHubGroupByLayer(group, filter);
  }
  return filterHubGroupByContractCategory(group, filter);
}

export function JobAllFilesView({
  jobs,
  athPreviewEnabled,
  onOpenJob,
  onBack,
}: {
  jobs: JobFilesSource[];
  athPreviewEnabled: boolean;
  onOpenJob: (jobId: string, section?: JobDetailSection) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HubFilter>("all");
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const hubJobs = jobs as FilesHubJobSource[];
  const jobsById = useMemo(() => new Map(hubJobs.map((j) => [j.id, j])), [hubJobs]);

  const allGroups = useMemo(() => groupHubContentByJob(hubJobs), [hubJobs]);

  const hubJobsCount = useMemo(
    () => hubJobs.filter((j) => jobHasFilesHubContent(j)).length,
    [hubJobs],
  );

  const totalFiles = useMemo(() => countAllFilesHubItems(hubJobs), [hubJobs]);

  const filteredGroups = useMemo((): JobHubAddressGroup[] => {
    const q = search.trim().toLowerCase();
    return allGroups
      .map((group) => {
        const filtered = applyHubFilter(group, filter);
        if (!hubGroupHasVisibleContent(filtered)) return null;
        if (q) {
          const job = jobsById.get(group.jobId);
          if (!job || !hubGroupSearchHaystack(job, filtered).includes(q)) return null;
        }
        return filtered;
      })
      .filter((g): g is JobHubAddressGroup => g !== null);
  }, [allGroups, search, filter, jobsById]);

  const filterCounts = useMemo(() => {
    const contractByCat: Partial<Record<JobFileCategory, number>> = {};
    for (const item of collectAllJobFiles(jobs)) {
      contractByCat[item.category] = (contractByCat[item.category] || 0) + 1;
    }
    return {
      all: totalFiles,
      contract: countAllHubContractItems(hubJobs),
      reports: countAllHubReportItems(hubJobs),
      attachments: countAllHubAttachmentItems(hubJobs),
      zlecenie: contractByCat.zlecenie ?? 0,
      kosztorys: contractByCat.kosztorys ?? 0,
      plan_techniczny: contractByCat.plan_techniczny ?? 0,
    };
  }, [jobs, hubJobs, totalFiles]);

  const toggleExpanded = (jobId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const exportReportPdf = (jobId: string, reportId: string) => {
    const job = jobsById.get(jobId);
    if (!job) return;
    const raw = job.workerReports?.find((r) => r.id === reportId);
    if (!raw) return;
    setPdfBusyId(reportId);
    void downloadWorkerReportPdfForJob(job as Job, normalizeWorkerReport(raw))
      .catch((e) => {
        window.alert(e instanceof Error ? e.message : "Nie udało się wygenerować PDF");
      })
      .finally(() => setPdfBusyId(null));
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-background">
      <div className="px-4 sm:px-6 py-4 border-b border-border space-y-3 shrink-0 bg-card/50">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-primary shrink-0 mt-0.5 hover:underline"
          >
            <ArrowLeft size={16}/>
            Lista robót
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FolderOpen size={18} className="text-primary shrink-0"/>
              Pliki wg adresów
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hubJobsCount} {hubJobsCount === 1 ? "robota z plikami" : "robót z plikami"}
              {totalFiles > 0 ? ` · ${totalFiles} plików łącznie` : ""}
            </p>
          </div>
        </div>
        <div className="relative max-w-lg">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj adresu, klienta, pliku, autora, zakresu prac…"
            className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LAYER_FILTERS.map((layer) => {
            const n = filterCounts[layer] ?? 0;
            if (layer !== "all" && n === 0) return null;
            return (
              <FilterChip
                key={layer}
                active={filter === layer}
                label={LAYER_FILTER_LABELS[layer]}
                count={n}
                onClick={() => setFilter(layer)}
              />
            );
          })}
          {CONTRACT_FILTERS.map((cat) => {
            const n = filterCounts[cat] ?? 0;
            if (n === 0) return null;
            return (
              <FilterChip
                key={cat}
                active={filter === cat}
                label={JOB_FILE_CATEGORY_LABELS[cat]}
                count={n}
                onClick={() => setFilter(cat)}
              />
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        {filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <FolderOpen size={32} className="mx-auto opacity-25"/>
            <p className="text-sm">{totalFiles === 0 ? "Brak plików w robotach" : "Brak wyników — zmień filtr lub wyszukiwanie"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {filteredGroups.map((group) => (
              <JobAddressHubTile
                key={group.jobId}
                group={group}
                expanded={expanded.has(group.jobId)}
                pdfBusyId={pdfBusyId}
                onToggle={() => toggleExpanded(group.jobId)}
                onOpenJob={() => onOpenJob(group.jobId, "files")}
                onGoToReports={(reportId) => onOpenJob(group.jobId, "reports")}
                onPreviewContract={(item) => setPreviewItem(item.previewItem)}
                onPreviewAttachment={(attachment) => setPreviewItem({ kind: "jobAttachment", file: attachment })}
                onExportReportPdf={(reportId) => exportReportPdf(group.jobId, reportId)}
              />
            ))}
          </div>
        )}
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

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary text-muted-foreground border-border hover:border-primary/30"
      }`}
    >
      {label}{count > 0 ? ` (${count})` : ""}
    </button>
  );
}

function JobAddressHubTile({
  group,
  expanded,
  pdfBusyId,
  onToggle,
  onOpenJob,
  onGoToReports,
  onPreviewContract,
  onPreviewAttachment,
  onExportReportPdf,
}: {
  group: JobHubAddressGroup;
  expanded: boolean;
  pdfBusyId: string | null;
  onToggle: () => void;
  onOpenJob: () => void;
  onGoToReports: (reportId: string) => void;
  onPreviewContract: (item: JobFileCatalogItem) => void;
  onPreviewAttachment: (attachment: FilesHubAttachmentItem) => void;
  onExportReportPdf: (reportId: string) => void;
}) {
  const { summary } = group;

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 transition-colors flex flex-col">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-primary"/>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug truncate" title={jobDisplayTitle(group)}>
              {jobDisplayTitle(group)}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{group.jobClient}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {summary.total} {summary.total === 1 ? "plik" : summary.total < 5 ? "pliki" : "plików"}
              {group.latestAt ? ` · ostatnio ${fmtJobFileDate(group.latestAt)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <LayerCountChip
            icon={FileText}
            label="Dokumenty kontraktowe"
            count={summary.contract}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <LayerCountChip
            icon={ClipboardList}
            label="Dokumentacja robót"
            count={summary.reports}
            accent="text-violet-600 dark:text-violet-400"
          />
          <LayerCountChip
            icon={Paperclip}
            label="Załączniki"
            count={summary.attachments}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            {expanded ? "Zwiń pliki" : "Pokaż pliki"}
          </button>
          <button
            type="button"
            onClick={onOpenJob}
            className="flex items-center justify-center gap-1 text-xs font-medium px-3 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            title="Otwórz robotę"
          >
            <ExternalLink size={13}/>
            Robota
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-secondary/20 max-h-80 overflow-y-auto">
          {group.contract.length > 0 && (
            <HubExpandSection title="Dokumenty kontraktowe" count={group.contract.length} icon={FileText}>
              <JobFileCatalogList
                items={group.contract}
                onPreview={onPreviewContract}
                compact
              />
            </HubExpandSection>
          )}
          {group.reports.length > 0 && (
            <HubExpandSection title="Dokumentacja robót" count={group.reports.length} icon={ClipboardList}>
              <div className="divide-y divide-border/80">
                {group.reports.map((report) => (
                  <CompactReportRow
                    key={report.id}
                    report={report}
                    pdfBusy={pdfBusyId === report.id}
                    onExportPdf={() => onExportReportPdf(report.id)}
                    onGoToReports={() => onGoToReports(report.id)}
                  />
                ))}
              </div>
            </HubExpandSection>
          )}
          {group.attachments.length > 0 && (
            <HubExpandSection title="Załączniki ogólne" count={group.attachments.length} icon={Paperclip}>
              <div className="divide-y divide-border/80">
                {group.attachments.map((attachment) => (
                  <CompactAttachmentRow
                    key={attachment.id}
                    attachment={attachment}
                    onPreview={() => onPreviewAttachment(attachment)}
                  />
                ))}
              </div>
            </HubExpandSection>
          )}
        </div>
      )}
    </article>
  );
}

function LayerCountChip({
  icon: Icon,
  label,
  count,
  accent = "text-muted-foreground",
}: {
  icon: typeof FileText;
  label: string;
  count: number;
  accent?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground`}>
      <Icon size={10} className={accent}/>
      {label} ({count})
    </span>
  );
}

function HubExpandSection({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: typeof FileText;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border/80 last:border-b-0">
      <div className="px-3 py-2 bg-secondary/40 flex items-center gap-1.5">
        <Icon size={12} className="text-muted-foreground"/>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  );
}

function CompactReportRow({
  report,
  pdfBusy,
  onExportPdf,
  onGoToReports,
}: {
  report: FilesHubReportItem;
  pdfBusy: boolean;
  onExportPdf: () => void;
  onGoToReports: () => void;
}) {
  return (
    <div className="px-3 py-2.5 flex flex-col gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium truncate">{report.label}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {report.author} · {report.dateLabel}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={pdfBusy}
          onClick={onExportPdf}
          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-violet-600/90 text-white font-medium disabled:opacity-50"
        >
          <FileDown size={11}/>{pdfBusy ? "…" : "Eksportuj PDF"}
        </button>
        <button
          type="button"
          onClick={onGoToReports}
          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
        >
          Przejdź do dokumentacji<ChevronRight size={11}/>
        </button>
      </div>
    </div>
  );
}

function CompactAttachmentRow({
  attachment,
  onPreview,
}: {
  attachment: FilesHubAttachmentItem;
  onPreview: () => void;
}) {
  const previewOk = canPreviewAttachment(attachment.filename);
  return (
    <div className="px-3 py-2.5 flex items-center gap-2">
      <Paperclip size={14} className="shrink-0 text-muted-foreground"/>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium truncate">{attachment.filename}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {attachment.uploadedBy} · {fmtJobFileDate(attachment.uploadedAt)}
          {" · "}{formatJobAttachmentSize(attachment.sizeBytes)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {previewOk && (
          <button type="button" onClick={onPreview} className="p-1.5 rounded-lg hover:bg-secondary" title="Podgląd">
            <Eye size={13}/>
          </button>
        )}
        <a href={attachment.publicUrl} download={attachment.filename} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-secondary" title="Pobierz">
          <Download size={13}/>
        </a>
      </div>
    </div>
  );
}

function CompactFileRow({
  item,
  onPreview,
}: {
  item: JobFileCatalogItem;
  onPreview: () => void;
}) {
  const Icon = categoryIcon(item.category);
  const previewOk = canPreviewCatalogItem(item);

  return (
    <div className="px-3 py-2.5 flex items-center gap-2">
      <Icon size={14} className="shrink-0 text-muted-foreground"/>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium truncate">{item.filename}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {item.categoryLabel} · {item.uploadedBy} · {fmtJobFileDate(item.uploadedAt)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {previewOk && (
          <button type="button" onClick={onPreview} className="p-1.5 rounded-lg hover:bg-secondary" title="Podgląd">
            <Eye size={13}/>
          </button>
        )}
        <a href={item.publicUrl} download={item.filename} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-secondary" title="Pobierz">
          <Download size={13}/>
        </a>
      </div>
    </div>
  );
}

export function JobFileCatalogList({
  items,
  onPreview,
  onDelete,
  deleteBusyId,
  compact,
}: {
  items: JobFileCatalogItem[];
  onPreview: (item: JobFileCatalogItem) => void;
  onDelete?: (item: JobFileCatalogItem) => void;
  deleteBusyId?: string | null;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-6 text-xs text-muted-foreground text-center">
        Brak dokumentów — wgraj zlecenie lub kosztorys.
      </p>
    );
  }
  if (compact) {
    return (
      <div className="divide-y divide-border/80">
        {items.map((item) => (
          <CompactFileRow key={item.id} item={item} onPreview={() => onPreview(item)}/>
        ))}
      </div>
    );
  }
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <JobFileCatalogRow
          key={item.id}
          item={item}
          onPreview={() => onPreview(item)}
          onDelete={onDelete ? () => onDelete(item) : undefined}
          deleteBusy={deleteBusyId === item.id}
        />
      ))}
    </div>
  );
}

function JobFileCatalogRow({
  item,
  onPreview,
  onDelete,
  deleteBusy,
}: {
  item: JobFileCatalogItem;
  onPreview: () => void;
  onDelete?: () => void;
  deleteBusy?: boolean;
}) {
  const Icon = categoryIcon(item.category);
  const previewOk = canPreviewCatalogItem(item);

  return (
    <div className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`}>
          <Icon size={16}/>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            <span className="text-muted-foreground font-normal">{item.categoryLabel} · </span>
            {item.filename}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {item.uploadedBy} · {fmtJobFileDate(item.uploadedAt)}
            {item.subtitle ? ` · ${item.subtitle}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pl-12 sm:pl-0">
        {previewOk && (
          <button
            type="button"
            onClick={onPreview}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
          >
            <Eye size={12}/> Podgląd
          </button>
        )}
        <a
          href={item.publicUrl}
          download={item.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
        >
          <Download size={12}/> Pobierz
        </a>
        {onDelete && (
          <button
            type="button"
            disabled={deleteBusy}
            onClick={onDelete}
            className="text-[10px] px-2.5 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 font-medium disabled:opacity-50"
          >
            {deleteBusy ? "…" : "Usuń"}
          </button>
        )}
      </div>
    </div>
  );
}

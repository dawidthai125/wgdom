import { useMemo, useState } from "react";
import {
  Search, Download, Eye, FileText, ClipboardList, Ruler,
  MapPin, ChevronRight, ChevronDown, ArrowLeft, FolderOpen, ExternalLink,
} from "lucide-react";
import {
  collectAllJobFiles,
  canPreviewCatalogItem,
  fmtJobFileDate,
  groupFilesByJob,
  jobDisplayTitle,
  JOB_FILE_CATEGORY_LABELS,
  type JobFileCatalogItem,
  type JobFileCategory,
  type JobFileGroup,
  type JobFilesSource,
} from "@/lib/job-files-index";
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

type CategoryFilter = "all" | JobFileCategory;

export function JobAllFilesView({
  jobs,
  athPreviewEnabled,
  onOpenJob,
  onBack,
}: {
  jobs: JobFilesSource[];
  athPreviewEnabled: boolean;
  onOpenJob: (jobId: string) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const allGroups = useMemo(() => groupFilesByJob(jobs), [jobs]);

  const filteredGroups = useMemo((): JobFileGroup[] => {
    const q = search.trim().toLowerCase();
    return allGroups
      .map((group) => {
        let items = group.items;
        if (category !== "all") {
          items = items.filter((i) => i.category === category);
        }
        if (q) {
          items = items.filter((item) => {
            const hay = [
              group.jobAddress,
              group.jobFlat,
              group.jobClient,
              item.filename,
              item.uploadedBy,
              item.categoryLabel,
              item.subtitle,
            ].join(" ").toLowerCase();
            return hay.includes(q);
          });
        }
        if (items.length === 0) return null;
        return { ...group, items };
      })
      .filter((g): g is JobFileGroup => g !== null);
  }, [allGroups, search, category]);

  const totalFiles = useMemo(() => collectAllJobFiles(jobs).length, [jobs]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: totalFiles };
    for (const item of collectAllJobFiles(jobs)) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [jobs, totalFiles]);

  const toggleExpanded = (jobId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
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
              {allGroups.length} {allGroups.length === 1 ? "robota z plikami" : "robót z plikami"}
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
            placeholder="Szukaj adresu, klienta, nazwy pliku…"
            className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "zlecenie", "kosztorys"] as CategoryFilter[]).map((cat) => {
            const n = categoryCounts[cat] ?? 0;
            if (cat !== "all" && n === 0) return null;
            const label = cat === "all" ? "Wszystkie typy" : JOB_FILE_CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-[11px] px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
                  category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {label}{n > 0 ? ` (${n})` : ""}
              </button>
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
              <JobAddressFileTile
                key={group.jobId}
                group={group}
                expanded={expanded.has(group.jobId)}
                onToggle={() => toggleExpanded(group.jobId)}
                onOpenJob={() => onOpenJob(group.jobId)}
                onPreview={(item) => setPreviewItem(item.previewItem)}
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

function JobAddressFileTile({
  group,
  expanded,
  onToggle,
  onOpenJob,
  onPreview,
}: {
  group: JobFileGroup;
  expanded: boolean;
  onToggle: () => void;
  onOpenJob: () => void;
  onPreview: (item: JobFileCatalogItem) => void;
}) {
  const counts = useMemo(() => {
    const c: Partial<Record<JobFileCategory, number>> = {};
    for (const item of group.items) {
      c[item.category] = (c[item.category] || 0) + 1;
    }
    return c;
  }, [group.items]);

  const hasZlecenie = (counts.zlecenie ?? 0) > 0;
  const hasKosztorys = (counts.kosztorys ?? 0) > 0;

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
              {group.items.length} {group.items.length === 1 ? "plik" : group.items.length < 5 ? "pliki" : "plików"}
              {group.latestAt ? ` · ostatnio ${fmtJobFileDate(group.latestAt)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <TypeChip ok={hasZlecenie} label="Zlecenie" icon={FileText}/>
          <TypeChip ok={hasKosztorys} label="Kosztorys" icon={ClipboardList}/>
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
        <div className="border-t border-border bg-secondary/20 divide-y divide-border/80 max-h-64 overflow-y-auto">
          {group.items.map((item) => (
            <CompactFileRow key={item.id} item={item} onPreview={() => onPreview(item)}/>
          ))}
        </div>
      )}
    </article>
  );
}

function TypeChip({
  ok,
  label,
  icon: Icon,
}: {
  ok: boolean;
  label: string;
  icon: typeof FileText;
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
      ok
        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
        : "bg-red-500/8 text-red-500/70 dark:text-red-400/60"
    }`}>
      <Icon size={10}/>
      {ok ? label : `Brak ${label.toLowerCase()}`}
    </span>
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
}: {
  items: JobFileCatalogItem[];
  onPreview: (item: JobFileCatalogItem) => void;
  onDelete?: (item: JobFileCatalogItem) => void;
  deleteBusyId?: string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-6 text-xs text-muted-foreground text-center">
        Brak dokumentów — wgraj zlecenie lub kosztorys.
      </p>
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

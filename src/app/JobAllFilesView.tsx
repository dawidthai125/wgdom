import { useMemo, useState } from "react";
import {
  Search, Download, Eye, FileText, ClipboardList, Camera, Image as ImageIcon,
  Filter, MapPin, ChevronRight,
} from "lucide-react";
import {
  collectAllJobFiles,
  canPreviewCatalogItem,
  fmtJobFileDate,
  JOB_FILE_CATEGORY_LABELS,
  type JobFileCatalogItem,
  type JobFileCategory,
  type JobFilesSource,
} from "@/lib/job-files-index";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";

const CATEGORY_ICONS: Record<JobFileCategory, typeof FileText> = {
  zlecenie: FileText,
  kosztorys: ClipboardList,
  inspector_photo: Camera,
  crew_photo: ImageIcon,
  report_sketch: ImageIcon,
};

type CategoryFilter = "all" | JobFileCategory;

export function JobAllFilesView({
  jobs,
  athPreviewEnabled,
  onOpenJob,
}: {
  jobs: JobFilesSource[];
  athPreviewEnabled: boolean;
  onOpenJob: (jobId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);

  const allItems = useMemo(() => collectAllJobFiles(jobs), [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      const hay = [
        item.jobAddress,
        item.jobFlat,
        item.jobClient,
        item.filename,
        item.uploadedBy,
        item.categoryLabel,
        item.subtitle,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, search, category]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: allItems.length };
    for (const item of allItems) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [allItems]);

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-background">
      <div className="px-4 sm:px-6 py-4 border-b border-border space-y-3 shrink-0">
        <div>
          <h2 className="text-base font-semibold">Wszystkie pliki robót</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zlecenia, kosztorysy NORMA (.ath), zdjęcia i rysunki — przypisane do roboty z datą i autorem.
          </p>
        </div>
        <div className="relative max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj adresu, pliku, osoby…"
            className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "zlecenie", "kosztorys", "inspector_photo", "crew_photo", "report_sketch"] as CategoryFilter[]).map((cat) => {
            const n = counts[cat] ?? 0;
            if (cat !== "all" && n === 0) return null;
            const label = cat === "all" ? "Wszystkie" : JOB_FILE_CATEGORY_LABELS[cat];
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

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <Filter size={28} className="mx-auto opacity-30"/>
            <p className="text-sm">{allItems.length === 0 ? "Brak plików w robotach" : "Brak wyników dla filtra"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => (
              <JobFileCatalogRow
                key={item.id}
                item={item}
                showJob
                onPreview={() => setPreviewItem(item.previewItem)}
                onOpenJob={() => onOpenJob(item.jobId)}
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
        Brak plików — wgraj zlecenie, kosztorys lub dodaj zdjęcia.
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
  showJob,
  onPreview,
  onOpenJob,
  onDelete,
  deleteBusy,
}: {
  item: JobFileCatalogItem;
  showJob?: boolean;
  onPreview: () => void;
  onOpenJob?: () => void;
  onDelete?: () => void;
  deleteBusy?: boolean;
}) {
  const Icon = CATEGORY_ICONS[item.category];
  const previewOk = canPreviewCatalogItem(item);

  return (
    <div className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          item.category === "zlecenie" || item.category === "kosztorys"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        }`}>
          <Icon size={16}/>
        </div>
        <div className="min-w-0 flex-1">
          {showJob && (
            <button
              type="button"
              onClick={onOpenJob}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 mb-0.5 truncate"
            >
              <MapPin size={10} className="shrink-0"/>
              {item.jobAddress}{item.jobFlat ? ` m.${item.jobFlat}` : ""}{item.jobClient ? ` · ${item.jobClient}` : ""}
              <ChevronRight size={10} className="shrink-0 opacity-60"/>
            </button>
          )}
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

import { FileText, FolderOpen, Users, Camera, ClipboardList, LayoutList, MapPin, Plus, type LucideIcon } from "lucide-react";

export type JobDetailSection = "summary" | "documents" | "files" | "workers" | "photos" | "reports";

type JobDetailNavItem = { id: JobDetailSection; label: string; icon: LucideIcon };

let jobDetailSectionsCache: JobDetailNavItem[] | undefined;

function getJobDetailSections(): JobDetailNavItem[] {
  if (!jobDetailSectionsCache) {
    jobDetailSectionsCache = [
      { id: "summary", label: "Przegląd", icon: LayoutList },
      { id: "files", label: "Pliki", icon: FolderOpen },
      { id: "documents", label: "Dokumenty", icon: FileText },
      { id: "workers", label: "Pracownicy", icon: Users },
      { id: "photos", label: "Zdjęcia", icon: Camera },
      { id: "reports", label: "Raporty", icon: ClipboardList },
    ];
  }
  return jobDetailSectionsCache;
}

export function JobDetailSectionNav({
  active,
  onSelect,
  fileCount,
  missingDocCount,
  pendingPhotoCount,
  reportCount,
}: {
  active: JobDetailSection;
  onSelect: (section: JobDetailSection) => void;
  fileCount?: number;
  missingDocCount?: number;
  pendingPhotoCount?: number;
  reportCount?: number;
}) {
  const badge = (id: JobDetailSection) => {
    let n: number | undefined;
    let warn = false;
    if (id === "files") n = fileCount;
    else if (id === "documents") {
      n = missingDocCount;
      warn = (missingDocCount ?? 0) > 0;
    } else if (id === "photos") {
      n = pendingPhotoCount;
      warn = (pendingPhotoCount ?? 0) > 0;
    } else if (id === "reports") n = reportCount;
    if (typeof n !== "number" || n <= 0) return null;
    return (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
          active === id
            ? warn
              ? "bg-amber-400/30 text-amber-950"
              : "bg-primary-foreground/20"
            : warn
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-background text-muted-foreground"
        }`}
      >
        {n}
      </span>
    );
  };

  return (
    <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none -mx-1 px-1">
      {getJobDetailSections().map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`flex items-center gap-1.5 md:gap-1 px-3 md:px-2.5 py-2 md:py-1.5 rounded-lg text-xs md:text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
            active === id
              ? id === "files"
                ? "bg-emerald-600 text-white"
                : "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={12}/>
          {label}
          {badge(id)}
        </button>
      ))}
    </div>
  );
}

export function JobsDetailEmptyState({
  onNewJob,
  onAllFiles,
  fileCount,
  jobCount,
}: {
  onNewJob: () => void;
  onAllFiles: () => void;
  fileCount: number;
  jobCount: number;
}) {
  return (
    <div className="hidden sm:flex flex-col items-center gap-4 p-4 sm:p-5 text-center">
      <MapPin size={48} className="opacity-15 text-muted-foreground"/>
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-medium text-foreground">Wybierz robotę z listy po lewej</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {jobCount > 0
            ? "Każda robota ma zakładki: Pliki, Dokumenty, Pracownicy i więcej — bez długiego przewijania."
            : "Dodaj pierwszą robotę albo przejrzyj pliki ze wszystkich adresów."}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={onNewJob}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14}/>Nowa robota
        </button>
        <button
          type="button"
          onClick={onAllFiles}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 transition-colors"
        >
          <FolderOpen size={14}/>
          Pliki wg adresów{fileCount > 0 ? ` (${fileCount})` : ""}
        </button>
      </div>
    </div>
  );
}

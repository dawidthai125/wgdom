import {
  FileText,
  FolderOpen,
  Users,
  Camera,
  ClipboardList,
  LayoutList,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { WgButton, WgEmptyState } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_HOVER, WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

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
      { id: "reports", label: "Dokumentacja", icon: ClipboardList },
    ];
  }
  return jobDetailSectionsCache;
}

/**
 * WGDOM-UI-01D-C — detail section tabs (DC-DF-04 / DC-DF-13).
 * Chip language aligned with Toolbar 01D-B — not dominant vs header title.
 */
export function JobDetailSectionNav({
  active,
  onSelect,
  fileCount,
  imageCount,
  missingDocCount,
  pendingPhotoCount,
  reportCount,
}: {
  active: JobDetailSection;
  onSelect: (section: JobDetailSection) => void;
  fileCount?: number;
  imageCount?: number;
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
      if ((pendingPhotoCount ?? 0) > 0) {
        n = pendingPhotoCount;
        warn = true;
      } else {
        n = imageCount;
      }
    } else if (id === "reports") n = reportCount;
    if (typeof n !== "number" || n <= 0) return null;
    return (
      <span
        className={cn(
          "text-[11px] px-1.5 h-5 inline-flex items-center rounded-md font-semibold tabular-nums",
          warn
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : active === id
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-muted-foreground",
        )}
      >
        {n}
      </span>
    );
  };

  return (
    <div
      className="flex gap-1 overflow-x-auto overscroll-x-contain scrollbar-none -mx-1 px-1"
      role="tablist"
      aria-label="Sekcje roboty"
    >
      {getJobDetailSections().map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            onClick={() => onSelect(id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-8 md:h-7",
              "rounded-md text-xs font-medium whitespace-nowrap shrink-0 border",
              `transition-colors ${WG_DURATION_HOVER}`,
              "motion-reduce:transition-none touch-manipulation",
              isActive
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/40 text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <Icon size={14} className={cn("shrink-0 opacity-70", isActive && "opacity-100")} aria-hidden />
            {label}
            {badge(id)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * WGDOM-UI-01D-C — detail empty (DC-DF-03 / DC-DF-08).
 * 1 Primary + 1 Secondary — no emerald tile.
 */
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
    <div className="hidden sm:flex w-full justify-center">
      <WgEmptyState
        icon={MapPin}
        title="Wybierz robotę z listy po lewej"
        description={
          jobCount > 0
            ? "Każda robota ma zakładki: Pliki, Dokumenty, Pracownicy i więcej — bez długiego przewijania."
            : "Dodaj pierwszą robotę albo przejrzyj pliki ze wszystkich adresów."
        }
        action={
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-md">
            <WgButton
              type="button"
              variant="primary"
              onClick={onNewJob}
              className={cn(WG_TOUCH_MIN, "h-10 gap-2 px-4")}
            >
              Nowa robota
            </WgButton>
            <WgButton
              type="button"
              variant="secondary"
              onClick={onAllFiles}
              className={cn(WG_TOUCH_MIN, "h-10 gap-2 px-4")}
            >
              <FolderOpen size={14} />
              Pliki wg adresów{fileCount > 0 ? ` (${fileCount})` : ""}
            </WgButton>
          </div>
        }
      />
    </div>
  );
}

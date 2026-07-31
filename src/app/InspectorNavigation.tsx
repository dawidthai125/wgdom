import { useEffect, useState } from "react";
import {
  List, LayoutGrid, LayoutDashboard, BookOpen, MessageSquare, FileText, ClipboardList,
  Users, Ruler, ImagePlus, Calendar, Images, FolderOpen, type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { WgButton } from "@/app/ui";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_SM,
  WG_TOUCH_MIN,
} from "@/lib/wg-ui-tokens";

export type InspectorMainTab = "dashboard" | "jobs" | "gallery" | "files" | "portfolio";

export type InspectorMainTabDef = {
  id: InspectorMainTab;
  label: string;
  icon: LucideIcon;
};

/** SSOT — 5 tabów głównych (bottom nav + desktop sidebar). */
export const INSPECTOR_MAIN_TAB_DEFS: InspectorMainTabDef[] = [
  { id: "dashboard", label: "Pulpit", icon: LayoutDashboard },
  { id: "jobs", label: "Roboty", icon: List },
  { id: "gallery", label: "Galeria", icon: Images },
  { id: "files", label: "Pliki", icon: FolderOpen },
  { id: "portfolio", label: "Portfolio WM", icon: LayoutGrid },
];

export const INSPECTOR_MAIN_TAB_LABELS: Record<InspectorMainTab, string> = Object.fromEntries(
  INSPECTOR_MAIN_TAB_DEFS.map(({ id, label }) => [id, label]),
) as Record<InspectorMainTab, string>;

export type InspectorJobSection =
  | "wm"
  | "files"
  | "docs"
  | "team"
  | "reports"
  | "photos";

type InspectorJobSectionItem = {
  id: InspectorJobSection;
  label: string;
  short: string;
  icon: LucideIcon;
};

let jobSectionsCache: InspectorJobSectionItem[] | undefined;

export function getJobSections(): InspectorJobSectionItem[] {
  if (!jobSectionsCache) {
    jobSectionsCache = [
      { id: "wm", label: "Odbiór WM", short: "WM", icon: Calendar },
      { id: "files", label: "Pliki", short: "Pliki", icon: FileText },
      { id: "docs", label: "Dokumenty", short: "Dok.", icon: ClipboardList },
      { id: "team", label: "Pracownicy", short: "Ekipa", icon: Users },
      { id: "reports", label: "Dokumentacja", short: "Dok.", icon: Ruler },
      { id: "photos", label: "Galeria zdjęć", short: "Zdjęcia", icon: ImagePlus },
    ];
  }
  return jobSectionsCache;
}

export function InspectorBottomNav({
  active,
  onDashboard,
  onJobs,
  onGallery,
  onFiles,
  onPortfolio,
  alertCount = 0,
}: {
  active: InspectorMainTab;
  onDashboard: () => void;
  onJobs: () => void;
  onGallery: () => void;
  onFiles: () => void;
  onPortfolio: () => void;
  alertCount?: number;
}) {
  const handlers: Record<InspectorMainTab, () => void> = {
    dashboard: onDashboard,
    jobs: onJobs,
    gallery: onGallery,
    files: onFiles,
    portfolio: onPortfolio,
  };

  return (
    <nav
      className="inspector-bottom-nav shrink-0 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      aria-label="Nawigacja inspektora"
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {INSPECTOR_MAIN_TAB_DEFS.map(({ id, label, icon: Icon }) => {
          const on = active === id;
          return (
            <WgButton
              key={id}
              type="button"
              variant="ghost"
              onClick={handlers[id]}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1",
                "py-1.5 min-h-[48px] h-auto w-auto rounded-none",
                "text-[9px] font-medium touch-manipulation",
                `transition-colors ${WG_DURATION_HOVER}`,
                "motion-reduce:transition-none",
                WG_FOCUS_RING,
                "hover:bg-transparent",
                on ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={on ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={18} strokeWidth={on ? 2.25 : 2} aria-hidden />
                {id === "dashboard" && alertCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-md bg-red-600 text-white text-[8px] font-bold flex items-center justify-center">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </span>
              {label}
            </WgButton>
          );
        })}
      </div>
    </nav>
  );
}

export function InspectorJobSectionNav({
  active,
  onSelect,
  badges,
}: {
  active: InspectorJobSection;
  onSelect: (id: InspectorJobSection) => void;
  badges?: Partial<Record<InspectorJobSection, number>>;
}) {
  const sectionBadge = (id: InspectorJobSection) => {
    const n = badges?.[id];
    if (typeof n !== "number" || n <= 0) return null;
    const warn = id === "docs" || id === "photos";
    return (
      <span
        className={cn(
          "text-[10px] px-1.5 py-0.5 font-semibold",
          WG_RADIUS_SM,
          active === id
            ? warn
              ? "bg-amber-400/30 text-amber-950"
              : "bg-primary-foreground/20"
            : warn
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-background text-muted-foreground",
        )}
      >
        {n > 9 ? "9+" : n}
      </span>
    );
  };

  return (
    <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none -mx-1 px-1">
      {getJobSections().map(({ id, label, icon: Icon }) => {
        const on = active === id;
        return (
          <WgButton
            key={id}
            type="button"
            variant="secondary"
            onClick={() => onSelect(id)}
            className={cn(
              "items-center gap-1.5 md:gap-1 px-3 md:px-2.5 text-xs md:text-[11px] font-medium whitespace-nowrap shrink-0",
              WG_TOUCH_MIN,
              "h-11 md:h-auto md:min-h-0 md:py-1.5",
              `transition-colors ${WG_DURATION_HOVER}`,
              WG_FOCUS_RING,
              on
                ? id === "files"
                  ? "bg-emerald-600 text-white hover:bg-emerald-600/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={12} />
            {label}
            {sectionBadge(id)}
          </WgButton>
        );
      })}
    </div>
  );
}

/** Podświetla sekcję widoczną na ekranie podczas przewijania. */
export function useInspectorSectionSpy(
  sectionIds: InspectorJobSection[],
  scrollRoot: React.RefObject<HTMLElement | null>,
  enabled: boolean,
): InspectorJobSection {
  const [active, setActive] = useState<InspectorJobSection>(sectionIds[0]);

  useEffect(() => {
    if (!enabled || !scrollRoot.current) return;
    const root = scrollRoot.current;
    const elements = sectionIds
      .map((id) => document.getElementById(`inspector-section-${id}`))
      .filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          const id = visible[0].target.id.replace("inspector-section-", "") as InspectorJobSection;
          setActive(id);
        }
      },
      { root, rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled, scrollRoot, sectionIds.join(",")]);

  return active;
}

export function InspectorQuickActions({
  items,
  onSelect,
}: {
  items: { section: InspectorJobSection; label: string; icon: typeof MessageSquare }[];
  onSelect: (section: InspectorJobSection) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ section, label, icon: Icon }) => (
        <WgButton
          key={section + label}
          type="button"
          variant="secondary"
          onClick={() => onSelect(section)}
          className={cn(
            "gap-1.5 px-3 text-xs font-medium",
            WG_TOUCH_MIN,
            "h-11",
            "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15",
            `transition-colors ${WG_DURATION_HOVER}`,
            WG_FOCUS_RING,
          )}
        >
          <Icon size={13}/>
          {label}
        </WgButton>
      ))}
    </div>
  );
}

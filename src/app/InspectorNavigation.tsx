import { useEffect, useState } from "react";
import {
  List, LayoutGrid, LayoutDashboard, BookOpen, MessageSquare, FileText, ClipboardList,
  Users, Ruler, ImagePlus, Calendar,
} from "lucide-react";

export type InspectorMainTab = "dashboard" | "jobs" | "portfolio";

export type InspectorJobSection =
  | "wm"
  | "files"
  | "docs"
  | "team"
  | "reports"
  | "photos";

export const JOB_SECTIONS: {
  id: InspectorJobSection;
  label: string;
  short: string;
  icon: typeof List;
}[] = [
  { id: "wm", label: "Odbiór WM", short: "WM", icon: Calendar },
  { id: "files", label: "Zlecenie i kosztorys", short: "Pliki", icon: FileText },
  { id: "docs", label: "Dokumentacja", short: "Dok.", icon: ClipboardList },
  { id: "team", label: "Pracownicy", short: "Ekipa", icon: Users },
  { id: "reports", label: "Zakresy i wymiary", short: "Raporty", icon: Ruler },
  { id: "photos", label: "Galeria zdjęć", short: "Zdjęcia", icon: ImagePlus },
];

export function InspectorBottomNav({
  active,
  onDashboard,
  onJobs,
  onPortfolio,
  onHelp,
  alertCount = 0,
}: {
  active: InspectorMainTab;
  onDashboard: () => void;
  onJobs: () => void;
  onPortfolio: () => void;
  onHelp: () => void;
  alertCount?: number;
}) {
  const tabClass = (on: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[52px] text-[10px] font-medium transition-colors ${
      on ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav
      className="shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      aria-label="Nawigacja inspektora"
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        <button type="button" onClick={onDashboard} className={`${tabClass(active === "dashboard")} touch-manipulation`} aria-current={active === "dashboard" ? "page" : undefined}>
          <span className="relative">
            <LayoutDashboard size={20} strokeWidth={active === "dashboard" ? 2.25 : 2}/>
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </span>
          Pulpit
        </button>
        <button type="button" onClick={onJobs} className={`${tabClass(active === "jobs")} touch-manipulation`} aria-current={active === "jobs" ? "page" : undefined}>
          <List size={20} strokeWidth={active === "jobs" ? 2.25 : 2}/>
          Roboty
        </button>
        <button type="button" onClick={onPortfolio} className={`${tabClass(active === "portfolio")} touch-manipulation`} aria-current={active === "portfolio" ? "page" : undefined}>
          <LayoutGrid size={20} strokeWidth={active === "portfolio" ? 2.25 : 2}/>
          Portfolio
        </button>
        <button type="button" onClick={onHelp} className={`${tabClass(false)} touch-manipulation`}>
          <BookOpen size={20}/>
          Pomoc
        </button>
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
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border/80">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Przejdź do sekcji</p>
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
        {JOB_SECTIONS.map(({ id, short, icon: Icon }) => {
          const on = active === id;
          const badge = badges?.[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`relative shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-medium transition-colors min-h-[44px] touch-manipulation ${
                on
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={13}/>
              {short}
              {badge != null && badge > 0 && (
                <span className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                  on ? "bg-primary-foreground/20 text-primary-foreground" : "bg-violet-600 text-white"
                }`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
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
        <button
          key={section + label}
          type="button"
          onClick={() => onSelect(section)}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation"
        >
          <Icon size={13}/>
          {label}
        </button>
      ))}
    </div>
  );
}

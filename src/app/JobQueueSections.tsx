import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Scale,
  Users,
  FileWarning,
  CheckCircle2,
  Clock,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import type { JobQueueSection, JobQueueSectionId } from "@/lib/job-list-ops";

/** 20.5Z.4A — ukryte sekcje kolejek (logika buildJobQueueSections bez zmian). */
const HIDDEN_QUEUE_SECTION_IDS = new Set<JobQueueSectionId>(["wm_overdue", "no_team"]);

const SECTION_ICONS: Record<JobQueueSectionId, LucideIcon> = {
  wm_overdue: AlertTriangle,
  bzp_needs_start: Scale,
  no_team: Users,
  docs_pending: FileWarning,
  ready_handover: CheckCircle2,
  stale_docs: Clock,
};

export function JobQueueSections({
  sections,
  renderJob,
}: {
  sections: JobQueueSection[];
  renderJob: (job: JobQueueSection["jobs"][number]) => ReactNode;
}) {
  const [expandedOverrides, setExpandedOverrides] = useState<Partial<Record<JobQueueSectionId, boolean>>>({});

  const isExpanded = (section: JobQueueSection) => {
    if (expandedOverrides[section.id] !== undefined) return expandedOverrides[section.id]!;
    return section.jobs.length > 0;
  };

  const toggleSection = (id: JobQueueSectionId) => {
    setExpandedOverrides((prev) => {
      const section = sections.find((s) => s.id === id);
      const current = prev[id] ?? (section ? section.jobs.length > 0 : false);
      return { ...prev, [id]: !current };
    });
  };

  return (
    <div className="pb-2">
      {sections.filter((section) => !HIDDEN_QUEUE_SECTION_IDS.has(section.id)).map((section) => {
        const Icon = SECTION_ICONS[section.id];
        const expanded = isExpanded(section);
        const count = section.jobs.length;
        return (
          <div key={section.id} className="border-b border-border/80 last:border-b-0">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              aria-expanded={expanded}
              className={`w-full flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-left transition-colors touch-manipulation ${
                count > 0
                  ? "bg-background/95 text-foreground"
                  : "bg-background/80 text-muted-foreground"
              }`}
            >
              <Icon size={14} className="shrink-0 opacity-80" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider flex-1 min-w-0 truncate">
                {section.title}
              </span>
              <span className="text-xs font-bold tabular-nums shrink-0">({count})</span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {expanded && (
              <div className="pb-1">
                {count === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground leading-snug">{section.emptyText}</p>
                ) : (
                  section.jobs.map((job) => renderJob(job))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

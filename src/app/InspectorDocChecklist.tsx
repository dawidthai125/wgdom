import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { InspectorHint } from "@/app/InspectorHelp";
import {
  DOC_LABELS,
  RYSUNEK_PLAN_CHECKLIST_HELP,
  type DocType,
  REQUIRED_DOCS,
} from "@/lib/job-documents";
import {
  INSPECTOR_DOC_GROUP_DOCUMENTATION,
  INSPECTOR_DOC_GROUP_MEASUREMENTS,
  INSPECTOR_DOC_GROUP_PHOTOS,
  countRequiredDocsDone,
} from "@/lib/inspector-dashboard";
import type { JobWmJob } from "@/lib/job-wm";

const GROUPS: { id: string; label: string; docs: readonly DocType[] }[] = [
  { id: "documentation", label: "Dokumentacja", docs: INSPECTOR_DOC_GROUP_DOCUMENTATION },
  { id: "measurements", label: "Pomiary i odbiory", docs: INSPECTOR_DOC_GROUP_MEASUREMENTS },
  { id: "photos", label: "Zdjęcia", docs: INSPECTOR_DOC_GROUP_PHOTOS },
];

export function InspectorDocChecklist({
  job,
  onToggle,
}: {
  job: JobWmJob;
  onToggle: (doc: DocType) => void;
}) {
  const { done, total } = countRequiredDocsDone(job);
  const requiredSet = new Set<string>(REQUIRED_DOCS);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList size={15}/>
          Dokumentacja robót
          <InspectorHint text="Kliknij pole — zaznaczasz że mamy ten dokument. Admin widzi to samo w Robotach."/>
        </p>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${
            done === total
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {done}/{total}
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
            {group.label}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.docs.map((doc) => {
              const checked = job.documents[doc];
              const required = requiredSet.has(doc);
              return (
                <button
                  key={doc}
                  type="button"
                  onClick={() => onToggle(doc)}
                  className={`flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-xl border transition-colors min-h-[44px] touch-manipulation ${
                    checked
                      ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                      : required
                        ? "border-amber-500/20 bg-amber-500/5 text-muted-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground"
                  }`}
                >
                  {checked ? <CheckCircle2 size={14} className="shrink-0"/> : <Circle size={14} className="shrink-0"/>}
                  <span className="leading-tight min-w-0">
                    <span>{DOC_LABELS[doc]}</span>
                    {doc === "rysunek" && (
                      <span className="block text-[10px] text-muted-foreground/80 font-normal mt-0.5 leading-snug">
                        {RYSUNEK_PLAN_CHECKLIST_HELP}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {done < total && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
          Brakuje wymaganych: {REQUIRED_DOCS.filter((d) => !job.documents[d]).map((d) => DOC_LABELS[d]).join(", ")}
        </p>
      )}
    </div>
  );
}

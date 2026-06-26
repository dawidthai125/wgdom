import { useMemo, useState } from "react";
import {
  Check,
  Circle,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import {
  buildWorkspaceV2AutoChecklist,
  buildWorkspaceV2Checklist,
  buildWorkspaceV2Insights,
  buildWorkspaceV2Timeline,
  buildWorkspaceV2TimelineAutomation,
  computeWorkspaceV2AutoProgress,
  loadWorkspaceV2ChecklistPersist,
  resolveWorkspaceV2KeyDocuments,
  saveWorkspaceV2ChecklistPersist,
  workspaceV2AutoStatusGlyph,
  type WorkspaceV2AutoStatus,
  type WorkspaceV2InsightTone,
  type WorkspaceV2PillarStatus,
} from "@/lib/tender-workspace-v2-ux";

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function insightToneClass(tone: WorkspaceV2InsightTone): string {
  switch (tone) {
    case "warn":
      return "text-amber-800 dark:text-amber-300";
    case "positive":
      return "text-emerald-800 dark:text-emerald-300";
    default:
      return "text-muted-foreground";
  }
}

function autoStatusRowClass(status: WorkspaceV2AutoStatus): string {
  switch (status) {
    case "ready":
      return "text-emerald-700 dark:text-emerald-400";
    case "action":
      return "text-amber-700 dark:text-amber-400";
    default:
      return "text-red-700 dark:text-red-400";
  }
}
function pillarStatusClass(status: WorkspaceV2PillarStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/25";
    case "partial":
      return "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25";
    default:
      return "bg-secondary/60 text-muted-foreground border-border";
  }
}

function docIcon(slot: string) {
  if (slot === "zip") return FileArchive;
  if (slot === "ath" || slot === "kosztorys") return FileSpreadsheet;
  return FileText;
}

export function TenderWorkspaceV2Panel({
  item,
  swz,
  intelligenceCtx: _intelligenceCtx,
  onNavigateTab,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  /** SSOT z TenderWorkflowHubPanel — główna akcja wyłącznie w Sticky Primary CTA. */
  intelligenceCtx: TenderIntelligenceContext;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
}) {
  const [checklistPersist, setChecklistPersist] = useState(
    () => loadWorkspaceV2ChecklistPersist(item.id),
  );

  const autoChecklist = useMemo(() => buildWorkspaceV2AutoChecklist(item, swz), [item, swz]);
  const timelineAutomation = useMemo(
    () => buildWorkspaceV2TimelineAutomation(item, swz),
    [item, swz],
  );
  const progress = useMemo(() => computeWorkspaceV2AutoProgress(item, swz), [item, swz]);
  const insights = useMemo(
    () => buildWorkspaceV2Insights(item, swz, autoChecklist, timelineAutomation),
    [item, swz, autoChecklist, timelineAutomation],
  );
  const timeline = useMemo(() => buildWorkspaceV2Timeline(item, swz), [item, swz]);
  const keyDocs = useMemo(() => resolveWorkspaceV2KeyDocuments(item), [item]);
  const operationalChecklist = useMemo(
    () => buildWorkspaceV2Checklist(item, swz, checklistPersist).filter(
      (r) => r.manual || r.id === "submitted",
    ),
    [item, swz, checklistPersist],
  );

  const toggleSignature = () => {
    const next = saveWorkspaceV2ChecklistPersist(item.id, {
      signature: !checklistPersist.signature,
    });
    setChecklistPersist(next);
  };

  return (
    <div className="space-y-4" data-tender-workspace-v2>
      <SectionShell title="Status realizacji">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all rounded-full"
                style={{ width: `${progress.percent}%` }}
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-sm font-bold tabular-nums text-primary shrink-0">
              {progress.percent}%
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {progress.pillars.map((pillar) => (
              <span
                key={pillar.id}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${pillarStatusClass(pillar.status)}`}
              >
                {pillar.status === "done" ? <Check size={10} /> : <Circle size={8} />}
                {pillar.label}
              </span>
            ))}
          </div>
          {insights.length > 0 && (
            <ul className="space-y-1 pt-1 border-t border-border/50">
              {insights.map((insight) => (
                <li
                  key={insight.text}
                  className={`text-[11px] font-medium flex items-start gap-1.5 ${insightToneClass(insight.tone)}`}
                >
                  <Sparkles size={11} className="shrink-0 mt-0.5 opacity-70" />
                  {insight.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionShell>

      <SectionShell title="Oś czasu">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">{timelineAutomation.daysRemainingLabel}</p>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
              <dt className="text-muted-foreground uppercase tracking-wide">Start wyceny</dt>
              <dd className="font-semibold text-foreground mt-0.5">{timelineAutomation.suggestedValuationStart}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
              <dt className="text-muted-foreground uppercase tracking-wide">Koniec wyceny</dt>
              <dd className="font-semibold text-foreground mt-0.5">{timelineAutomation.suggestedValuationEnd}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
              <dt className="text-muted-foreground uppercase tracking-wide">Ostatni bezpieczny termin</dt>
              <dd className="font-semibold text-foreground mt-0.5">{timelineAutomation.lastSafeSubmit}</dd>
            </div>
          </dl>
          <div className="flex gap-0 overflow-x-auto pb-1 -mx-1 px-1">
          {timeline.map((node, i) => (
            <div key={node.id} className="flex items-center shrink-0 min-w-[5.5rem]">
              <div className="flex flex-col items-center text-center px-2 min-w-[5.5rem]">
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 ${
                    node.isActive
                      ? "bg-primary border-primary"
                      : node.isPast
                        ? "bg-muted border-muted-foreground/40"
                        : "bg-background border-border"
                  }`}
                />
                <p className="text-[10px] font-semibold text-foreground mt-2">{node.label}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight max-w-[6rem]">
                  {node.dateLabel}
                </p>
              </div>
              {i < timeline.length - 1 && (
                <div className="h-px w-6 bg-border shrink-0 mb-6" aria-hidden />
              )}
            </div>
          ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell title="Najważniejsze dokumenty">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {keyDocs.map((doc) => {
            const Icon = docIcon(doc.slot);
            return (
              <button
                key={doc.slot}
                type="button"
                disabled={!doc.available}
                onClick={() => onNavigateTab(doc.navigateTab)}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-center transition-colors min-h-[72px] ${
                  doc.available
                    ? "border-border bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30"
                    : "border-dashed border-border/60 opacity-50 cursor-not-allowed"
                }`}
                title={doc.filename ?? `Brak: ${doc.label}`}
              >
                <Icon size={18} className={doc.available ? "text-primary" : "text-muted-foreground"} />
                <span className="text-[11px] font-semibold">{doc.label}</span>
                {doc.filename && (
                  <span className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">
                    {doc.filename}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell title="Checklista ofertowa">
        <ul className="space-y-2">
          {autoChecklist.map((row) => (
            <li key={row.id} className={`flex items-start gap-2 text-sm ${autoStatusRowClass(row.status)}`}>
              <span className="shrink-0 w-4 text-center font-bold" aria-hidden>
                {workspaceV2AutoStatusGlyph(row.status)}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{row.label}</span>
                {row.hint && (
                  <span className="block text-[10px] text-muted-foreground mt-0.5">{row.hint}</span>
                )}
              </span>
            </li>
          ))}
          {operationalChecklist.map((row) => (
            <li key={row.id}>
              <label
                className={`flex items-center gap-2 text-sm ${
                  row.manual ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <input
                  type="checkbox"
                  checked={row.checked}
                  disabled={!row.manual}
                  onChange={row.manual ? toggleSignature : undefined}
                  className="rounded border-border text-primary focus:ring-primary/30"
                />
                <span className={row.checked ? "text-foreground" : "text-muted-foreground"}>
                  {row.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </SectionShell>
    </div>
  );
}

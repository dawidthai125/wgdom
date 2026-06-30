import type { ReactNode } from "react";
import {
  Briefcase, ExternalLink, Loader2, Trash2, Upload,
} from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { TenderMonitoringBanner } from "@/app/TenderMonitoringBanner";
import { TenderAnalysisStatusStrip } from "@/app/TenderAnalysisStatusStrip";
import { TenderBidPrepPanel } from "@/app/TenderBidPrepPanel";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";

export function TenderWorkflowOperatorSection({
  item,
  swz,
  bidProposal,
  kosztorysSession,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  analyzing,
  exportingPdf,
  uploading,
  onOpenStrategy,
  onUpload,
  onCreateJob,
  onOpenJob,
  onRemove,
  onAnalyze,
  onExportPdf,
  onUpdateOurEstimate,
  onNavigateWorkspace,
  hideAnalysisStrip = false,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  bidProposal: TenderBidProposal | null | undefined;
  kosztorysSession: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
  exportingPdf?: boolean;
  uploading?: boolean;
  onOpenStrategy?: () => void;
  onUpload: (file: File) => void;
  onCreateJob?: () => void;
  onOpenJob?: (jobId: string) => void;
  onRemove?: () => void;
  onAnalyze: () => void;
  onExportPdf?: () => void;
  onUpdateOurEstimate: (pln: number | null) => void;
  onNavigateWorkspace: (tab: TenderWorkspaceTabId) => void;
  /** NG-03.2 — Analysis Status w Status Ribbon. */
  hideAnalysisStrip?: boolean;
}) {
  return (
    <div className="space-y-3" data-tender-workflow-hub="operator">
      <TenderMonitoringBanner item={item} onOpenStrategy={onOpenStrategy} />

      {!hideAnalysisStrip && (
        <TenderAnalysisStatusStrip
          item={item}
          swz={swz}
          bidProposal={bidProposal}
          dossierBuilding={dossierBuilding}
          dossierSaving={dossierSaving}
          autoRunning={autoRunning}
          kosztorysSession={kosztorysSession}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {item.ezamowieniaUrl && (
          <a
            href={item.ezamowieniaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
            e-Zamówienia
          </a>
        )}
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium cursor-pointer hover:bg-secondary/80">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Wgraj SWZ
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ath,.nor,.xml,.xlsx,.xls,.zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
        {(item.status === "won" || item.status === "preparing") && onCreateJob && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (item.linkedJobId && onOpenJob) {
                onOpenJob(item.linkedJobId);
                return;
              }
              onCreateJob();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"
          >
            <Briefcase size={12} />
            {item.linkedJobId ? "Otwórz robotę" : "Utwórz robotę"}
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-500/20"
          >
            <Trash2 size={12} />
            Usuń
          </button>
        )}
      </div>

      <TenderBidPrepPanel
        item={item}
        swz={swz}
        fit={item.tenderFit}
        bidProposal={bidProposal}
        ourEstimatePln={item.ourEstimatePln}
        analyzing={analyzing}
        onAnalyze={onAnalyze}
        onExportPdf={onExportPdf}
        exportingPdf={exportingPdf}
        onUpdateOurEstimate={onUpdateOurEstimate}
        onNavigateWorkspace={onNavigateWorkspace}
        collapseTiles
      />
    </div>
  );
}

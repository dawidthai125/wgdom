import {
  ExternalLink, FileDown, Loader2, RefreshCw, Upload,
} from "lucide-react";
import type { ReactNode, MouseEvent } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  TENDER_OWNER_HINT_COPY,
  TENDER_OWNER_OPERATOR_COPY,
} from "@/lib/tender-owner-language-pl";

export function tenderOperatorCanAnalyze(item: TenderPipelineItem): boolean {
  return Boolean(
    item.noticeNumber || (item.tenderId && (item.bzpDocuments?.length ?? 0) > 0),
  );
}

export type TenderWorkflowOperatorActionBarProps = {
  item: TenderPipelineItem;
  uploading?: boolean;
  analyzing?: boolean;
  exportingPdf?: boolean;
  onUpload: (file: File) => void;
  onAnalyze: () => void;
  onExportPdf?: () => void;
  variant?: "desktop" | "mobile";
};

const ACCEPT_UPLOAD = ".pdf,.doc,.docx,.ath,.nor,.xml,.xlsx,.xls,.zip";

function ActionButton({
  children,
  className,
  disabled,
  onClick,
  title,
  as = "button",
  href,
}: {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
  title?: string;
  as?: "button" | "a";
  href?: string;
}) {
  if (as === "a" && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TenderWorkflowOperatorActionBar({
  item,
  uploading = false,
  analyzing = false,
  exportingPdf = false,
  onUpload,
  onAnalyze,
  onExportPdf,
  variant = "desktop",
}: TenderWorkflowOperatorActionBarProps) {
  const canAnalyze = tenderOperatorCanAnalyze(item);
  const compact = variant === "mobile";

  const btnBase = compact
    ? "flex-1 min-w-[calc(50%-0.25rem)] inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-lg text-[11px] font-medium min-h-[44px]"
    : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px]";

  return (
    <div
      data-tender-operator-action-bar={variant}
      className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap items-center gap-2"}
      role="toolbar"
      aria-label="Akcje operacyjne przetargu"
    >
      {item.ezamowieniaUrl && (
        <ActionButton
          as="a"
          href={item.ezamowieniaUrl}
          className={`${btnBase} bg-primary/10 text-primary hover:bg-primary/20`}
          title="Otwórz postępowanie w e-Zamówienia"
        >
          <ExternalLink size={compact ? 14 : 12} />
          e-Zamówienia
        </ActionButton>
      )}

      <label
        className={`${btnBase} bg-secondary text-foreground cursor-pointer hover:bg-secondary/80`}
        title="Wgraj plik SWZ lub kosztorys"
        onClick={(e) => e.stopPropagation()}
      >
        {uploading ? <Loader2 size={compact ? 14 : 12} className="animate-spin" /> : <Upload size={compact ? 14 : 12} />}
        {compact ? "Upload" : "Wgraj SWZ"}
        <input
          type="file"
          accept={ACCEPT_UPLOAD}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </label>

      <ActionButton
        className={`${btnBase} bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50`}
        disabled={analyzing || !canAnalyze}
        title={!canAnalyze ? "Brak numeru ogłoszenia i załączników" : TENDER_OWNER_HINT_COPY.analyzeDocumentsTitle}
        onClick={(e) => {
          e.stopPropagation();
          onAnalyze();
        }}
      >
        {analyzing ? <Loader2 size={compact ? 14 : 12} className="animate-spin" /> : <RefreshCw size={compact ? 14 : 12} />}
        {analyzing
          ? (compact ? "Analiza…" : TENDER_OWNER_OPERATOR_COPY.analyzingDocuments)
          : (compact ? "Analiza" : TENDER_OWNER_OPERATOR_COPY.analyzeDocuments)}
      </ActionButton>

      {onExportPdf && (
        <ActionButton
          className={`${btnBase} bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50`}
          disabled={exportingPdf}
          title={TENDER_OWNER_OPERATOR_COPY.exportSummaryPdf}
          onClick={(e) => {
            e.stopPropagation();
            onExportPdf();
          }}
        >
          {exportingPdf ? <Loader2 size={compact ? 14 : 12} className="animate-spin" /> : <FileDown size={compact ? 14 : 12} />}
          {compact ? "Eksport" : TENDER_OWNER_OPERATOR_COPY.exportSummaryPdf}
        </ActionButton>
      )}
    </div>
  );
}

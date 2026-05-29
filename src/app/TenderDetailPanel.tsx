import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExternalLink, FileText, Download, Loader2, Sparkles, Briefcase,
  Upload, AlertTriangle, CheckCircle2, HelpCircle, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  TENDER_STATUS_LABELS,
  fetchTenderDocuments,
  fetchTenderNoticeDetails,
  fetchTenderDocumentBytes,
  base64ToBytes,
  analyzeTenderSwz,
  uploadTenderFile,
  labelTenderState,
} from "@/lib/tenders-bzp";
import {
  PROFITABILITY_LABELS,
  type TenderProfitabilityHint,
} from "@/lib/tenders-bzp-swz";
import {
  learnKeywordsFromPipeline,
  suggestKeywordsFromPipeline,
} from "@/lib/tenders-bzp-learn";
import {
  parseNoticeHtmlBrief,
  athPreviewToSnapshot,
  pickBestKosztorysDocument,
  mergeBriefWithItemTitle,
} from "@/lib/tenders-bzp-brief";
import { parseKosztorysBytes, fetchAndParseKosztorys, isKosztorysPreviewExt, type AthPreviewResult } from "@/lib/ath-parser";
import { TenderDossierPanel } from "@/app/TenderDossierPanel";
import { TenderAttachmentsPanel } from "@/app/TenderAttachmentsPanel";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const HINT_STYLE: Record<TenderProfitabilityHint, string> = {
  good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  caution: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  risky: "bg-red-500/10 text-red-700 dark:text-red-400",
  unknown: "bg-secondary text-muted-foreground",
};

const HINT_ICON = {
  good: CheckCircle2,
  caution: AlertTriangle,
  risky: AlertTriangle,
  unknown: HelpCircle,
};

export function TenderDetailPanel({
  item,
  allItems,
  onUpdate,
  onCreateJob,
  onOpenJob,
  athPreviewEnabled,
}: {
  item: TenderPipelineItem;
  allItems: TenderPipelineItem[];
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  onCreateJob?: (item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
}) {
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [athPreview, setAthPreview] = useState<AthPreviewResult | null>(null);
  const [athLoading, setAthLoading] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const autoRanRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (autoRanRef.current.has(item.id)) return;
    autoRanRef.current.add(item.id);
    let cancelled = false;
    (async () => {
      setAutoRunning(true);
      const patch: Partial<TenderPipelineItem> = {};
      let html = item.noticeHtml ?? null;
      let docs = item.bzpDocuments ?? [];
      try {
        if (item.noticeNumber && !html) {
          const det = await fetchTenderNoticeDetails(item.noticeNumber);
          if (!cancelled) {
            patch.tenderState = det.tenderState;
            patch.noticeHtml = det.htmlBody;
            patch.noticeHtmlFetchedAt = new Date().toISOString();
            html = det.htmlBody;
          }
        }
        if (item.tenderId && !docs.length) {
          docs = await fetchTenderDocuments(item.tenderId);
          if (!cancelled) {
            patch.bzpDocuments = docs;
            patch.documentsFetchedAt = new Date().toISOString();
          }
        }
        if (Object.keys(patch).length > 0 && !cancelled) onUpdate(patch);

        let swz = item.swzAnalysis ?? null;
        if (item.noticeNumber && !swz && !cancelled) {
          swz = await analyzeTenderSwz({
            noticeNumber: item.noticeNumber,
            ourEstimatePln: item.ourEstimatePln ?? null,
          });
          onUpdate({ swzAnalysis: swz });
        }

        if (!item.tenderDossier && !cancelled) {
          const brief = mergeBriefWithItemTitle(
            html ? parseNoticeHtmlBrief(html) : parseNoticeHtmlBrief(""),
            item.title,
          );
          let kosztorysSnap = null;
          const bestDoc = pickBestKosztorysDocument(docs);
          if (bestDoc && item.tenderId) {
            try {
              if (/\.(ath|nor|xml)$/i.test(bestDoc.filename)) {
                const { base64, filename } = await fetchTenderDocumentBytes(item.tenderId, bestDoc.index);
                const preview = parseKosztorysBytes(base64ToBytes(base64), filename);
                kosztorysSnap = athPreviewToSnapshot(preview, filename);
              } else if (/\.pdf$/i.test(bestDoc.filename)) {
                const analysis = await analyzeTenderSwz({
                  tenderId: item.tenderId,
                  documentIndex: bestDoc.index,
                  ourEstimatePln: item.ourEstimatePln ?? null,
                });
                if (!swz) {
                  swz = analysis;
                  onUpdate({ swzAnalysis: analysis });
                }
              }
            } catch { /* brak kosztorysu */ }
          }
          if (item.uploadedFile && athPreviewEnabled && isKosztorysPreviewExt(item.uploadedFile.filename)) {
            try {
              const preview = await fetchAndParseKosztorys(
                item.uploadedFile.publicUrl,
                item.uploadedFile.filename,
                item.uploadedFile.path,
              );
              kosztorysSnap = athPreviewToSnapshot(preview, item.uploadedFile.filename);
            } catch { /* ignore */ }
          }
          onUpdate({
            tenderDossier: {
              brief,
              kosztorys: kosztorysSnap,
              builtAt: new Date().toISOString(),
            },
          });
        }
      } catch {
        /* auto-analiza best-effort */
      } finally {
        if (!cancelled) setAutoRunning(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per item id on expand
  }, [item.id]);

  const loadDocuments = useCallback(async () => {
    if (!item.tenderId) {
      toast.error("Brak tenderId — odśwież z BZP");
      return;
    }
    setLoadingDocs(true);
    try {
      const docs = await fetchTenderDocuments(item.tenderId);
      onUpdate({
        bzpDocuments: docs,
        documentsFetchedAt: new Date().toISOString(),
      });
      toast.success(docs.length ? `Znaleziono ${docs.length} załączników` : "Brak załączników");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd pobierania załączników");
    } finally {
      setLoadingDocs(false);
    }
  }, [item.tenderId, onUpdate]);

  const runAnalysis = useCallback(async (docIndex?: number) => {
    setAnalyzing(true);
    try {
      const analysis = await analyzeTenderSwz({
        noticeNumber: item.noticeNumber || undefined,
        tenderId: docIndex ? item.tenderId : undefined,
        documentIndex: docIndex,
        ourEstimatePln: item.ourEstimatePln ?? null,
      });
      onUpdate({ swzAnalysis: analysis });
      toast.success("Przeanalizowano dane SWZ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd analizy SWZ");
    } finally {
      setAnalyzing(false);
    }
  }, [item, onUpdate]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadTenderFile(item.id, file);
      onUpdate({ uploadedFile: uploaded });
      toast.success(`Wgrano: ${file.name}`);
      if (athPreviewEnabled && isKosztorysPreviewExt(file.name)) {
        setAthLoading(true);
        const preview = await fetchAndParseKosztorys(uploaded.publicUrl, file.name, uploaded.path);
        setAthPreview(preview);
        const kosztorysSnap = athPreviewToSnapshot(preview, file.name);
        const brief = item.tenderDossier?.brief
          ?? mergeBriefWithItemTitle(
            item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
            item.title,
          );
        onUpdate({
          tenderDossier: {
            brief,
            kosztorys: kosztorysSnap,
            builtAt: new Date().toISOString(),
          },
        });
        if (preview.totalValue) {
          const num = parseFloat(preview.totalValue.replace(/\s/g, "").replace(",", "."));
          if (Number.isFinite(num)) onUpdate({ ourEstimatePln: num });
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd uploadu");
    } finally {
      setUploading(false);
      setAthLoading(false);
    }
  }, [item.id, onUpdate, athPreviewEnabled]);

  const handleLearnKeywords = useCallback(async () => {
    setLearning(true);
    try {
      const { added } = await learnKeywordsFromPipeline(allItems);
      toast.success(added.length ? `Dodano ${added.length} słów kluczowych` : "Brak nowych propozycji");
    } catch {
      toast.error("Błąd zapisu słów kluczowych");
    } finally {
      setLearning(false);
    }
  }, [allItems]);

  const suggestions = suggestKeywordsFromPipeline(allItems);
  const swz = item.swzAnalysis;
  const HintIcon = swz ? HINT_ICON[swz.profitabilityHint] : HelpCircle;

  return (
    <div className="px-4 pb-4 pt-0 border-t border-border space-y-4">
      <p className="text-xs text-muted-foreground pt-3">
        CPV: {item.cpvCode || "—"}
        {item.tenderState && <> · Postępowanie: <strong>{labelTenderState(item.tenderState)}</strong></>}
        {item.matchedKeywords.length > 0 && <> · Słowa: {item.matchedKeywords.slice(0, 8).join(", ")}{item.matchedKeywords.length > 8 ? "…" : ""}</>}
      </p>
      <p className="text-xs text-muted-foreground">Publikacja: {fmtDate(item.publicationDate)}</p>
      {autoRunning && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Ładowanie karty przetargu (ogłoszenie, SWZ, kosztorys)…
        </p>
      )}

      <TenderDossierPanel item={item} dossier={item.tenderDossier} swz={swz} />

      {swz && (
        <div className={`rounded-xl px-3 py-2 text-xs ${HINT_STYLE[swz.profitabilityHint]}`}>
          <div className="flex items-center gap-2 font-semibold">
            <HintIcon size={14} />
            Ocena opłacalności: {PROFITABILITY_LABELS[swz.profitabilityHint]}
          </div>
          <p className="mt-1 opacity-90">{swz.profitabilityNote}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="text-xs text-muted-foreground flex items-center gap-2">
          Status
          <select
            value={item.status}
            onChange={(e) => onUpdate({ status: e.target.value as TenderPipelineStatus })}
            className="bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
              <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
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
        <button
          type="button"
          disabled={loadingDocs || !item.tenderId}
          onClick={(e) => { e.stopPropagation(); void loadDocuments(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:opacity-50"
        >
          {loadingDocs ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Załączniki BZP
        </button>
        <button
          type="button"
          disabled={analyzing || !item.noticeNumber}
          onClick={(e) => { e.stopPropagation(); void runAnalysis(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-medium hover:bg-violet-500/20 disabled:opacity-50"
        >
          {analyzing ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
          Analizuj ogłoszenie
        </button>
      </div>

      {item.noticeHtml && (
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowHtml((v) => !v); }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
          >
            <span className="flex items-center gap-1.5"><FileText size={12} /> Pełne ogłoszenie BZP (HTML)</span>
            <ChevronDown size={14} className={`transition-transform ${showHtml ? "rotate-180" : ""}`} />
          </button>
          {showHtml && (
            <iframe
              title="Ogłoszenie BZP"
              sandbox=""
              srcDoc={item.noticeHtml}
              className="w-full h-72 sm:h-96 bg-white text-black border-t border-border"
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">
          Nasz szacunek (PLN brutto)
          <input
            type="number"
            min="0"
            step="1000"
            value={item.ourEstimatePln ?? ""}
            onChange={(e) => onUpdate({ ourEstimatePln: e.target.value ? Number(e.target.value) : null })}
            className="ml-2 w-28 bg-secondary rounded-lg px-2 py-1 text-xs border border-border"
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      </div>

      <TenderAttachmentsPanel
        item={item}
        athPreviewEnabled={athPreviewEnabled}
        loadingDocs={loadingDocs || autoRunning}
        onRefresh={() => void loadDocuments()}
        onAnalyze={(idx) => void runAnalysis(idx)}
        analyzing={analyzing}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium cursor-pointer hover:bg-secondary/80">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Wgraj SWZ / kosztorys
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ath,.nor,.xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      </div>

      {athLoading && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Ładowanie podglądu kosztorysu…
        </p>
      )}
      {athPreview?.ok && athPreview.totalValue && (
        <p className="text-xs text-muted-foreground">
          Kosztorys: {athPreview.totalValue} {athPreview.currency || "PLN"}
          {athPreview.rows.length > 0 && ` · ${athPreview.rows.length} pozycji`}
        </p>
      )}

      {(item.status === "won" || item.status === "preparing") && onCreateJob && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (item.linkedJobId && onOpenJob) {
              onOpenJob(item.linkedJobId);
              return;
            }
            const jobId = onCreateJob(item);
            if (jobId) onUpdate({ linkedJobId: jobId, status: item.status === "won" ? "won" : item.status });
            toast.success("Utworzono robótę z przetargu");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"
        >
          <Briefcase size={12} />
          {item.linkedJobId ? "Otwórz powiązaną robotę" : "Utwórz robotę z przetargu"}
        </button>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-xl bg-secondary/50 px-3 py-2 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Sparkles size={11} /> Propozycje słów kluczowych
          </p>
          <div className="flex flex-wrap gap-1">
            {suggestions.slice(0, 8).map((s) => (
              <span key={s} className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">{s}</span>
            ))}
          </div>
          <button
            type="button"
            disabled={learning}
            onClick={(e) => { e.stopPropagation(); void handleLearnKeywords(); }}
            className="text-[10px] text-primary hover:underline"
          >
            {learning ? "Zapisywanie…" : "Ucz system z zaznaczonych przetargów"}
          </button>
        </div>
      )}

      <textarea
        value={item.notes}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        placeholder="Notatki wewnętrzne (kontakt, ryzyko, kosztorys…)"
        rows={2}
        className="w-full bg-secondary rounded-xl px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none resize-y min-h-[60px]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
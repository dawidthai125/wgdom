import { useCallback, useState } from "react";
import {
  ExternalLink, FileText, Download, Loader2, Sparkles, Briefcase,
  Upload, AlertTriangle, CheckCircle2, HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  type TenderBzpDocument,
  TENDER_STATUS_LABELS,
  fetchTenderDocuments,
  analyzeTenderSwz,
  uploadTenderFile,
} from "@/lib/tenders-bzp";
import {
  fmtPln,
  PROFITABILITY_LABELS,
  type TenderProfitabilityHint,
} from "@/lib/tenders-bzp-swz";
import {
  learnKeywordsFromPipeline,
  suggestKeywordsFromPipeline,
} from "@/lib/tenders-bzp-learn";
import { fetchAndParseKosztorys, isKosztorysPreviewExt, type AthPreviewResult } from "@/lib/ath-parser";

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
        {item.matchedKeywords.length > 0 && <> · Słowa: {item.matchedKeywords.slice(0, 8).join(", ")}{item.matchedKeywords.length > 8 ? "…" : ""}</>}
      </p>
      <p className="text-xs text-muted-foreground">Publikacja: {fmtDate(item.publicationDate)}</p>

      {swz && (
        <div className={`rounded-xl px-3 py-2.5 text-xs space-y-1.5 ${HINT_STYLE[swz.profitabilityHint]}`}>
          <div className="flex items-center gap-2 font-semibold">
            <HintIcon size={14} />
            Ocena: {PROFITABILITY_LABELS[swz.profitabilityHint]}
          </div>
          <p>{swz.profitabilityNote}</p>
          {swz.estimatedValuePln != null && (
            <p>Wartość zamówienia: ~{fmtPln(swz.estimatedValuePln)}</p>
          )}
          {swz.estimatedValueRaw && !swz.estimatedValuePln && (
            <p>Wartość: {swz.estimatedValueRaw}</p>
          )}
          {swz.wadiumRaw && <p>Wadium: {swz.wadiumRaw}</p>}
          {swz.referenceRequirement && (
            <p className="opacity-90">Referencje: {swz.referenceRequirement.slice(0, 200)}…</p>
          )}
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

      {item.bzpDocuments && item.bzpDocuments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Załączniki postępowania</p>
          <ul className="space-y-1">
            {item.bzpDocuments.map((doc: TenderBzpDocument) => (
              <li key={doc.documentId} className="flex flex-wrap items-center gap-2 text-xs">
                {doc.isSwzHint && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1 rounded">SWZ?</span>
                )}
                <a
                  href={doc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[240px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {doc.filename}
                </a>
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={(e) => { e.stopPropagation(); void runAnalysis(doc.index); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  analizuj
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        {item.uploadedFile && (
          <a
            href={item.uploadedFile.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.uploadedFile.filename}
          </a>
        )}
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
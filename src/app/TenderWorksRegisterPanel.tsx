import { useCallback, useMemo, useState } from "react";
import { ClipboardList, FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import { extractExperienceRequirements } from "@/lib/tender-experience-requirements";
import {
  buildWorksRegister,
  fmtRegisterValuePln,
  selectProjectsForTender,
  traceWorksRegister,
} from "@/lib/tender-works-register";
import { downloadWorksRegisterPdf } from "@/lib/tender-works-register-pdf";
import { downloadWorksRegisterDocx } from "@/lib/tender-works-register-docx";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";

export function TenderWorksRegisterPanel({
  tenderId,
  swz,
  combinedText,
}: {
  tenderId: string;
  swz: TenderSwzAnalysis | null | undefined;
  combinedText?: string;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);

  const experienceRequirements = useMemo(() => {
    if (swz?.experienceRequirements?.length) return swz.experienceRequirements;
    if (combinedText?.trim()) return extractExperienceRequirements(combinedText);
    return [];
  }, [swz?.experienceRequirements, combinedText]);

  const selection = useMemo(() => {
    if (experienceRequirements.length === 0) return null;
    const profile = loadCompanyQualificationProfileLocal();
    return selectProjectsForTender(experienceRequirements, profile);
  }, [experienceRequirements]);

  const handlePdf = useCallback(async () => {
    if (!selection || selection.recommended.length === 0) {
      toast.info("Brak realizacji do wykazu — uzupełnij profil wykonawcy");
      return;
    }
    setPdfBusy(true);
    try {
      const register = buildWorksRegister(tenderId, selection);
      const company = loadCompanyProfileLocal();
      await downloadWorksRegisterPdf(register, { companyName: company.companyName });
      traceWorksRegister({
        requiredProjects: selection.requiredCount,
        selectedProjects: selection.recommended.length,
        pdfGenerated: true,
      });
      toast.success("Pobrano wykaz robót (PDF)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd generowania PDF");
    } finally {
      setPdfBusy(false);
    }
  }, [selection, tenderId]);

  const handleDocx = useCallback(async () => {
    if (!selection || selection.recommended.length === 0) {
      toast.info("Brak realizacji do wykazu — uzupełnij profil wykonawcy");
      return;
    }
    setDocxBusy(true);
    try {
      const register = buildWorksRegister(tenderId, selection);
      const company = loadCompanyProfileLocal();
      await downloadWorksRegisterDocx(register, { companyName: company.companyName });
      traceWorksRegister({
        requiredProjects: selection.requiredCount,
        selectedProjects: selection.recommended.length,
        docxGenerated: true,
      });
      toast.success("Pobrano wykaz robót (DOCX)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd generowania DOCX");
    } finally {
      setDocxBusy(false);
    }
  }, [selection, tenderId]);

  if (!selection || experienceRequirements.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-500/25 bg-card overflow-hidden">
      <div className="px-3 py-2.5 bg-violet-500/5 border-b border-violet-500/15 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <ClipboardList size={14} className="text-violet-600 shrink-0" />
          Wykaz robót budowlanych
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pdfBusy || selection.recommended.length === 0}
            onClick={(e) => { e.stopPropagation(); void handlePdf(); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {pdfBusy ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
            Generuj PDF
          </button>
          <button
            type="button"
            disabled={docxBusy || selection.recommended.length === 0}
            onClick={(e) => { e.stopPropagation(); void handleDocx(); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-[10px] font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            {docxBusy ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
            Generuj DOCX
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Rekomendowane realizacje
        </p>

        {selection.recommended.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Brak realizacji spełniających wymóg doświadczenia w profilu wykonawcy.
            Uzupełnij listę w Przetargi → Profil wykonawcy.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {selection.recommended.map((rec) => (
              <li
                key={rec.project.title}
                className="flex flex-col sm:flex-row sm:items-center gap-1 p-2 rounded-lg bg-secondary/30 border border-border/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    ✓ {rec.project.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtRegisterValuePln(rec.project.valuePln)} · {rec.project.category}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                <span className="text-[10px] shrink-0">{rec.referenceLabel}</span>
              </li>
            ))}
          </ul>
        )}

        {selection.allMatching.length > selection.recommended.length && (
          <p className="text-[10px] text-muted-foreground">
            W profilu jest {selection.allMatching.length} pasujących realizacji —
            do wykazu wybrano {selection.recommended.length} (wymóg SWZ: {selection.requiredCount}).
          </p>
        )}
      </div>
    </div>
  );
}

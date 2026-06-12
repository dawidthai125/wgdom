import {
  AlertTriangle, CheckCircle2, HelpCircle, Target, TrendingUp, XCircle,
} from "lucide-react";
import type { TenderFitAssessment, TenderRequirementStatus } from "@/lib/tenders-bzp-fit";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";

const STATUS_ICON: Record<TenderRequirementStatus, typeof CheckCircle2> = {
  met: CheckCircle2,
  partial: HelpCircle,
  gap: XCircle,
  unknown: HelpCircle,
};

const STATUS_STYLE: Record<TenderRequirementStatus, string> = {
  met: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  gap: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
};

const FIT_STYLE: Record<TenderFitAssessment["fitLabel"], string> = {
  strong: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  possible: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  weak: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  unknown: "bg-secondary text-muted-foreground border-border",
};

const STATUS_LABEL: Record<TenderRequirementStatus, string> = {
  met: "OK",
  partial: "Częściowo",
  gap: "Luka",
  unknown: "?",
};

export function TenderFitPanel({
  fit,
  awardCriteria: awardCriteriaOverride,
}: {
  fit: TenderFitAssessment | null | undefined;
  /** P2-E.1B — SSOT kryteriów z swzAnalysis (nie tenderFit fallback HTML). */
  awardCriteria?: TenderFitAssessment["awardCriteria"];
}) {
  if (!fit) {
    return (
      <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border px-3 py-2">
        Dopasowanie i szacunek szans pojawi się po analizie SWZ / ogłoszenia.
      </p>
    );
  }

  const displayCriteria = awardCriteriaOverride ?? fit.awardCriteria;

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-3 py-2.5 ${FIT_STYLE[fit.fitLabel]}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Target size={16} />
            <div>
              <p className="text-xs font-semibold">
                Dopasowanie: {FIT_LABELS[fit.fitLabel]} · {fit.fitScore}/100
              </p>
              {fit.winChancePct != null && (
                <p className="text-[10px] opacity-90 flex items-center gap-1 mt-0.5">
                  <TrendingUp size={11} />
                  Szacowane szanse: <strong>{fit.winChancePct}%</strong> — {fit.winChanceNote}
                </p>
              )}
            </div>
          </div>
          {fit.priceWeightPct != null && (
            <span className="text-[10px] bg-background/60 px-2 py-0.5 rounded-full border border-border/60">
              Waga ceny: {fit.priceWeightPct}%
            </span>
          )}
        </div>
        {fit.blockingIssues.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[10px]">
            {fit.blockingIssues.map((b) => (
              <li key={b} className="flex items-start gap-1">
                <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      {displayCriteria.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 bg-secondary/50 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kryteria oceny ofert / punktacja
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/30 text-left">
                <th className="px-2 py-1.5 font-medium">Kryterium</th>
                <th className="px-2 py-1.5 font-medium text-right">Waga</th>
                <th className="px-2 py-1.5 font-medium text-right">Pkt max</th>
              </tr>
            </thead>
            <tbody>
              {displayCriteria.map((c, i) => (
                <tr key={`${c.name}-${i}`} className="border-t border-border/60">
                  <td className="px-2 py-1.5">
                    <span className="font-medium">{c.name}</span>
                    {c.description && c.description !== `${c.name} — waga ${c.weightPct}% w ocenie ofert.` && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {c.weightPct != null ? `${c.weightPct}%` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {c.maxPoints != null ? c.maxPoints : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fit.priceWeightPct != null && fit.priceWeightPct >= 80 && (
            <p className="text-[10px] text-muted-foreground px-3 py-2 border-t border-border">
              Przy dominacji ceny ({fit.priceWeightPct}%) kluczowa jest dokładna wycena — porównaj „Nasz szacunek” z wartością SWZ.
            </p>
          )}
        </div>
      )}

      {fit.requirementChecks.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 bg-secondary/50 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Wymagania przetargu vs profil firmy
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {fit.requirementChecks.map((c) => {
              const Icon = STATUS_ICON[c.status];
              return (
                <div key={c.id} className="px-3 py-2 space-y-1">
                  <div className="flex items-start gap-2">
                    <Icon size={13} className={`shrink-0 mt-0.5 ${STATUS_STYLE[c.status]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium">{c.label}</span>
                        <span className={`text-[10px] font-semibold ${STATUS_STYLE[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{c.category}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 text-[10px]">
                        <div>
                          <p className="text-muted-foreground mb-0.5">
                            {c.id === "qualifications" ? "Wymagane:" : "Wymaga:"}
                          </p>
                          <p className="whitespace-pre-wrap">{c.required}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">My:</p>
                          <p className="whitespace-pre-wrap">{c.companyHas}</p>
                        </div>
                      </div>
                      {c.tip && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">{c.tip}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fit.tips.length > 0 && (
        <div className="rounded-xl bg-secondary/30 px-3 py-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Podpowiedzi</p>
          <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4">
            {fit.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

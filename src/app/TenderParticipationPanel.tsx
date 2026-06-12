import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import {
  checkTenderParticipation,
  CATEGORY_EMOJI,
  type ParticipationCheckStatus,
} from "@/lib/tender-participation-check";
import { extractParticipationRequirements } from "@/lib/tender-participation-requirements";
import { extractExperienceRequirements } from "@/lib/tender-experience-requirements";

const STATUS_ICON = {
  MATCH: CheckCircle2,
  MISSING: XCircle,
  UNKNOWN: HelpCircle,
} as const;

const STATUS_STYLE: Record<ParticipationCheckStatus, string> = {
  MATCH: "text-emerald-600 dark:text-emerald-400",
  MISSING: "text-red-600 dark:text-red-400",
  UNKNOWN: "text-amber-600 dark:text-amber-400",
};

const STATUS_PREFIX: Record<ParticipationCheckStatus, string> = {
  MATCH: "✓",
  MISSING: "✗",
  UNKNOWN: "⚠",
};

export function TenderParticipationPanel({
  swz,
  combinedText,
}: {
  swz: TenderSwzAnalysis | null | undefined;
  /** Tekst SWZ/ogłoszenia gdy brak participationRequirements w analizie. */
  combinedText?: string;
}) {
  const result = useMemo(() => {
    const requirements = swz?.participationRequirements?.length
      ? swz.participationRequirements
      : combinedText?.trim()
        ? extractParticipationRequirements(combinedText)
        : [];
    const experienceRequirements = swz?.experienceRequirements?.length
      ? swz.experienceRequirements
      : combinedText?.trim()
        ? extractExperienceRequirements(combinedText)
        : [];
    if (requirements.length === 0 && experienceRequirements.length === 0) return null;
    const profile = loadCompanyQualificationProfileLocal();
    return checkTenderParticipation(requirements, profile, experienceRequirements);
  }, [swz?.participationRequirements, swz?.experienceRequirements, combinedText]);

  if (!result) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2.5 bg-secondary/40 border-b border-border">
        <p className="text-xs font-semibold">Warunki udziału w postępowaniu</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Możliwość startu:{" "}
          <span className="font-medium text-foreground">
            {result.summaryEmoji} {result.summaryLabel}
          </span>
        </p>
      </div>

      <div className="p-3 space-y-3">
        {result.categories.map((cat) => {
          const CatIcon = STATUS_ICON[cat.status];
          return (
            <div key={cat.type} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <span>{CATEGORY_EMOJI[cat.status]}</span>
                {cat.typeLabel}
                <CatIcon size={11} className={STATUS_STYLE[cat.status]} />
              </p>
              <ul className="space-y-0.5 pl-1">
                {cat.items.map((item) => (
                  <li
                    key={`${item.requirement.type}-${item.label}`}
                    className={`text-xs flex items-start gap-1.5 ${STATUS_STYLE[item.status]}`}
                  >
                    <span className="shrink-0 font-medium">{STATUS_PREFIX[item.status]}</span>
                    <span>
                      {item.label}
                      {item.status !== "MATCH" && (
                        <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                          {item.profileNote}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {result.missing.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-2">
            <p className="text-[10px] font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle size={11} /> Braki
            </p>
            <ul className="mt-1 space-y-0.5">
              {result.missing.map((m) => (
                <li key={`gap-${m.label}`} className="text-xs text-red-700 dark:text-red-400">
                  ✗ {m.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.unknown.length > 0 && result.missing.length === 0 && (
          <p className="text-[10px] text-muted-foreground flex items-start gap-1">
            <HelpCircle size={11} className="shrink-0 mt-0.5" />
            Uzupełnij profil wykonawcy (Przetargi → Profil firmy), aby zamienić „⚠” na twarde dopasowanie.
          </p>
        )}
      </div>
    </div>
  );
}

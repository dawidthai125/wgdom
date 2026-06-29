import type { TenderTrustAssessment, TenderTrustDimensionId } from "@/lib/tender-trust-layer";
import {
  collectFocusReasons,
  pickPrimaryTrustMessage,
  shouldShowTrustBanner,
  trustLevelShortLabelPl,
  trustLevelToIcon,
  trustLevelToTone,
  trustToneClass,
} from "@/lib/tender-trust-ui";
import { TrustReasonList } from "@/app/tenders/trust/TrustReasonList";

export function TrustBanner({
  assessment,
  focus,
  variant = "contextual",
  compact = false,
  hideWhenTrusted = true,
}: {
  assessment: TenderTrustAssessment;
  focus?: TenderTrustDimensionId[];
  variant?: "overall" | "contextual";
  compact?: boolean;
  hideWhenTrusted?: boolean;
}) {
  const level = variant === "overall" ? assessment.overall : (
    focus?.reduce<TenderTrustAssessment["overall"]>((worst, id) => {
      const dim = assessment.dimensions.find((d) => d.id === id);
      if (!dim) return worst;
      const rank = { trusted: 0, unknown: 1, partial: 2, blocked: 3 };
      return rank[dim.level] > rank[worst] ? dim.level : worst;
    }, "trusted") ?? assessment.overall
  );

  if (hideWhenTrusted && !shouldShowTrustBanner(assessment, variant === "overall" ? undefined : focus)) {
    if (variant === "overall" && level === "trusted") {
      return (
        <div
          className={`flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 ${
            compact ? "py-1.5" : "py-2"
          }`}
          data-tender-trust-banner
          data-tender-trust-level="trusted"
        >
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300" aria-hidden>
            {trustLevelToIcon("trusted")}
          </span>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            Jakość danych: {trustLevelShortLabelPl("trusted")}
          </p>
        </div>
      );
    }
    return null;
  }

  const tone = trustLevelToTone(level);
  const icon = trustLevelToIcon(level);
  const message = pickPrimaryTrustMessage(
    assessment,
    variant === "overall" ? undefined : focus,
  );
  const reasons = focus ? collectFocusReasons(assessment, focus) : (
    assessment.dimensions.flatMap((d) => d.reasons)
  );

  return (
    <div
      className={`rounded-xl border overflow-hidden ${trustToneClass(tone)} ${
        compact ? "px-3 py-2" : "px-3 py-2.5"
      }`}
      role="status"
      aria-live="polite"
      data-tender-trust-banner
      data-tender-trust-level={level}
    >
      <div className="flex items-start gap-2">
        <span className={`shrink-0 font-bold ${compact ? "text-sm" : "text-base"}`} aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={`font-semibold leading-snug ${compact ? "text-[11px]" : "text-xs"}`}>
            {variant === "overall" ? "Jakość danych przetargowych" : "Jakość danych w tym widoku"}
          </p>
          <p className={`text-muted-foreground leading-snug ${compact ? "text-[10px]" : "text-[11px]"}`}>
            {message}
          </p>
          {!compact && reasons.length > 0 && (
            <TrustReasonList reasons={reasons} levelIcon={icon} />
          )}
        </div>
      </div>
    </div>
  );
}

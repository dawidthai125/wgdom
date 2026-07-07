import type { TenderTrustDimension, TenderTrustLevel } from "@/lib/tender-trust-layer";
import {
  trustDimensionChipLabel,
  trustLevelToIcon,
  trustLevelToTone,
  trustToneClass,
} from "@/lib/tender-trust-ui";
import { TEUX_FONT_CAPTION, TEUX_TOUCH_TARGET } from "@/lib/tender-ux-tokens";

export function TrustChip({
  dimension,
  level,
  labelPl,
  onClick,
  title,
}: {
  dimension?: TenderTrustDimension;
  level?: TenderTrustLevel;
  labelPl?: string;
  onClick?: () => void;
  title?: string;
}) {
  const resolvedLevel = dimension?.level ?? level ?? "unknown";
  const resolvedLabel = dimension
    ? trustDimensionChipLabel(dimension)
    : labelPl ?? "";
  const tone = trustLevelToTone(resolvedLevel);
  const icon = trustLevelToIcon(resolvedLevel);
  const hint = title ?? dimension?.reasons[0]?.messagePl;
  const ariaLabel = hint ? `${resolvedLabel}. ${hint}` : resolvedLabel;
  const contrastBoost = onClick && tone === "neutral" ? "text-foreground/85" : "";

  const className = `inline-flex items-center gap-1 ${TEUX_FONT_CAPTION} font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
    trustToneClass(tone)
  } ${contrastBoost} ${
    onClick
      ? `hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px] sm:min-h-0 sm:py-1.5 ${TEUX_TOUCH_TARGET}`
      : "py-1"
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={hint}
        aria-label={ariaLabel}
        className={className}
        data-tender-trust-chip={dimension?.id ?? "overall"}
        data-tender-trust-level={resolvedLevel}
      >
        <span aria-hidden>{icon}</span>
        <span className="whitespace-nowrap">{resolvedLabel}</span>
      </button>
    );
  }

  return (
    <span
      className={className}
      title={hint}
      data-tender-trust-chip={dimension?.id ?? "overall"}
      data-tender-trust-level={resolvedLevel}
    >
      <span aria-hidden>{icon}</span>
      <span className="whitespace-nowrap">{resolvedLabel}</span>
    </span>
  );
}

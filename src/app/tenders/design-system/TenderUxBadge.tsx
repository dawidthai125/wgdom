import type { ReactNode } from "react";
import type { TenderTrustLevel } from "@/lib/tender-trust-layer";
import {
  trustLevelShortLabelPl,
  trustLevelToIcon,
  trustLevelToTone,
  trustToneClass,
} from "@/lib/tender-trust-ui";
import {
  TEUX_BADGE_FIT,
  TEUX_BADGE_QUEUE_ACTIVE,
  TEUX_BADGE_SCORE,
  TEUX_BADGE_STATUS,
  TEUX_BADGE_URGENT,
  TEUX_FONT_CAPTION,
} from "@/lib/tender-ux-tokens";

export type TenderUxBadgeVariant =
  | "status"
  | "score"
  | "fit"
  | "urgent"
  | "trust"
  | "queue";

const VARIANT_CLASS: Record<Exclude<TenderUxBadgeVariant, "trust">, string> = {
  status: TEUX_BADGE_STATUS,
  score: TEUX_BADGE_SCORE,
  fit: TEUX_BADGE_FIT,
  urgent: TEUX_BADGE_URGENT,
  queue: TEUX_BADGE_QUEUE_ACTIVE,
};

/** SSOT badge prezentacyjny modułu Przetargi (TEUX-2). Variant `trust` reuse `trustToneClass`. */
export function TenderUxBadge({
  variant = "status",
  children,
  className = "",
  title,
  trustLevel,
  trustLabelPl,
}: {
  variant?: TenderUxBadgeVariant;
  children?: ReactNode;
  className?: string;
  title?: string;
  /** Wymagane gdy variant=trust */
  trustLevel?: TenderTrustLevel;
  trustLabelPl?: string;
}) {
  if (variant === "trust") {
    const level = trustLevel ?? "unknown";
    const tone = trustLevelToTone(level);
    const icon = trustLevelToIcon(level);
    const label = trustLabelPl ?? `Jakość · ${trustLevelShortLabelPl(level)}`;
    return (
      <span
        className={`inline-flex items-center gap-1 ${TEUX_FONT_CAPTION} font-semibold px-2 py-0.5 rounded-md border ${trustToneClass(tone)} ${className}`}
        title={title}
        data-tender-ux-badge="trust"
        data-tender-trust-level={level}
      >
        <span aria-hidden>{icon}</span>
        <span className="whitespace-nowrap">{children ?? label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${VARIANT_CLASS[variant]} ${className}`}
      title={title}
      data-tender-ux-badge={variant}
    >
      {children}
    </span>
  );
}

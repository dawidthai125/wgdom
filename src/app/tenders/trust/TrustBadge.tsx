import type { TenderTrustLevel } from "@/lib/tender-trust-layer";
import {
  trustLevelShortLabelPl,
  trustLevelToIcon,
  trustLevelToTone,
  trustToneClass,
} from "@/lib/tender-trust-ui";

export function TrustBadge({
  level,
  labelPl,
  title,
}: {
  level: TenderTrustLevel;
  labelPl: string;
  title: string;
}) {
  const tone = trustLevelToTone(level);
  const icon = trustLevelToIcon(level);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${trustToneClass(tone)}`}
      title={title}
      data-tender-trust-badge
      data-tender-trust-level={level}
    >
      <span aria-hidden>{icon}</span>
      <span className="whitespace-nowrap">{labelPl || `Jakość · ${trustLevelShortLabelPl(level)}`}</span>
    </span>
  );
}

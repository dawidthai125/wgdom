import type { TenderTrustLevel } from "@/lib/tender-trust-layer";
import {
  trustLevelToIcon,
  trustLevelToTone,
  trustToneClass,
} from "@/lib/tender-trust-ui";

export function TrustInlineHint({
  message,
  level,
}: {
  message: string;
  level: TenderTrustLevel;
}) {
  const tone = trustLevelToTone(level);
  const icon = trustLevelToIcon(level);

  return (
    <p
      className={`flex items-start gap-1.5 text-xs leading-snug rounded-lg border px-2.5 py-1.5 ${trustToneClass(tone)}`}
      role="status"
      data-tender-trust-inline-hint
      data-tender-trust-level={level}
    >
      <span className="shrink-0 font-bold" aria-hidden>{icon}</span>
      <span>{message}</span>
    </p>
  );
}

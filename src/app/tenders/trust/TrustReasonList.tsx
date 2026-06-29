import type { TenderTrustReason } from "@/lib/tender-trust-layer";
import { trustLevelToIcon } from "@/lib/tender-trust-ui";

function severityClass(severity: TenderTrustReason["severity"]): string {
  switch (severity) {
    case "error":
      return "text-red-700 dark:text-red-300";
    case "warn":
      return "text-amber-800 dark:text-amber-300";
    default:
      return "text-muted-foreground";
  }
}

export function TrustReasonList({
  reasons,
  defaultExpanded = false,
  maxVisible = 5,
  levelIcon,
}: {
  reasons: TenderTrustReason[];
  defaultExpanded?: boolean;
  maxVisible?: number;
  /** Ikona poziomu trust (SSOT: trustLevelToIcon). */
  levelIcon?: string;
}) {
  if (reasons.length === 0) return null;

  const visible = reasons.slice(0, maxVisible);
  const hidden = reasons.length - visible.length;

  return (
    <details
      className="group text-xs"
      open={defaultExpanded}
      data-tender-trust-reasons
    >
      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-muted-foreground hover:text-foreground min-h-[44px] sm:min-h-0">
        {levelIcon != null && (
          <span className="font-bold shrink-0" aria-hidden>{levelIcon}</span>
        )}
        <span className="font-medium">
          Szczegóły jakości danych ({reasons.length})
        </span>
        <span className="text-[10px] opacity-70 group-open:hidden">rozwiń</span>
      </summary>
      <ul className="mt-1.5 space-y-1 pl-0.5">
        {visible.map((r) => (
          <li
            key={r.code}
            className={`flex gap-2 leading-snug ${severityClass(r.severity)}`}
          >
            <span className="shrink-0 font-bold" aria-hidden>
              {r.severity === "error" ? "×" : r.severity === "warn" ? "!" : "·"}
            </span>
            <span>{r.messagePl}</span>
          </li>
        ))}
        {hidden > 0 && (
          <li className="text-[10px] text-muted-foreground">+ {hidden} kolejnych powodów</li>
        )}
      </ul>
    </details>
  );
}

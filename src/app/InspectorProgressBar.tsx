import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_ENTER, WG_RADIUS_SM } from "@/lib/wg-ui-tokens";

export function InspectorProgressBar({
  percent,
  className = "",
  showLabel = true,
}: {
  percent: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barColor =
    clamped >= 100 ? "bg-emerald-500"
      : clamped >= 70 ? "bg-primary"
        : clamped >= 40 ? "bg-amber-500"
          : "bg-red-500/80";

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <div className={cn("flex-1 bg-border h-2 overflow-hidden min-w-0", WG_RADIUS_SM)}>
        <div
          className={cn("h-2 transition-all", WG_DURATION_ENTER, WG_RADIUS_SM, barColor)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span
          className="text-xs text-muted-foreground shrink-0 tabular-nums font-medium"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}

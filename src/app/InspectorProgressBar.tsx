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
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <div className="flex-1 bg-border rounded-full h-2 overflow-hidden min-w-0">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span
          className="text-[10px] text-muted-foreground shrink-0 tabular-nums font-medium"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}

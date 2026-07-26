import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { WgCard } from "@/app/ui/WgCard";
import { WG_DURATION_HOVER, WG_TYPE_LABEL } from "@/lib/wg-ui-tokens";

export type WgKpiStatus = "neutral" | "ok" | "warn" | "danger" | "info";

export type WgKpiTrend = {
  direction: "up" | "down" | "flat";
  label: string;
};

export type WgKpiProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  status?: WgKpiStatus;
  trend?: WgKpiTrend;
  onClick?: () => void;
  /** Extra chrome under hint (e.g. biweekly split) — presentation only */
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Surface paint — warn ≠ danger (DF-06). */
const statusSurface: Record<WgKpiStatus, string> = {
  neutral: "",
  ok: "border-emerald-500/25 hover:border-emerald-500/40",
  warn: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/45",
  danger: "border-destructive/35 bg-destructive/5 hover:border-destructive/50",
  info: "border-primary/25 hover:border-primary/40",
};

const statusValue: Record<WgKpiStatus, string> = {
  neutral: "text-foreground",
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
  info: "text-primary",
};

const trendClass: Record<WgKpiTrend["direction"], string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

/**
 * WGDOM-UI-01B — KPI visual polish (DF-06 / DF-10).
 * Equal-height tiles via h-full + flex column; value dominant; hint line-clamp-2.
 * API unchanged from UI-01A.
 */
export function WgKpi({
  label,
  value,
  hint,
  icon: Icon,
  status = "neutral",
  trend,
  onClick,
  children,
  className,
  "aria-label": ariaLabel,
}: WgKpiProps) {
  const clickable = typeof onClick === "function";
  const surface = cn(
    "relative text-left w-full h-full flex flex-col",
    `transition-colors ${WG_DURATION_HOVER}`,
    "motion-reduce:transition-none",
    clickable && "hover:border-primary/30 cursor-pointer",
    statusSurface[status],
    className,
  );

  const body = (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {Icon ? (
        <Icon
          size={16}
          className={cn(
            "absolute top-4 right-4 shrink-0 opacity-70",
            status === "ok"
              ? "text-emerald-500"
              : status === "info"
                ? "text-primary"
                : status === "danger"
                  ? "text-destructive"
                  : status === "warn"
                    ? "text-amber-500"
                    : "text-muted-foreground",
          )}
          aria-hidden
        />
      ) : null}

      <p className={cn(WG_TYPE_LABEL, "truncate opacity-90 pr-6")}>{label}</p>

      <p
        className={cn(
          "mt-2 text-2xl sm:text-[1.75rem] font-bold tracking-tight leading-none tabular-nums",
          statusValue[status],
        )}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>

      <div className="mt-auto pt-2 min-h-[2.5rem] flex flex-col justify-end gap-1">
        {hint ? (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{hint}</p>
        ) : null}
        {trend ? (
          <p className={cn("text-xs font-medium", trendClass[trend.direction])}>{trend.label}</p>
        ) : null}
        {children}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <WgCard
        as="button"
        type="button"
        elevation="soft"
        padding="sm"
        radius="md"
        onClick={onClick}
        className={surface}
        aria-label={ariaLabel ?? label}
      >
        {body}
      </WgCard>
    );
  }

  return (
    <WgCard elevation="soft" padding="sm" radius="md" className={surface} aria-label={ariaLabel}>
      {body}
    </WgCard>
  );
}

import { createElement, isValidElement, type ComponentType, type ReactNode, type SVGProps } from "react";
import { cn } from "@/app/components/ui/utils";
import { WG_RADIUS_LG, WG_TYPE_BODY, WG_TYPE_TITLE } from "@/lib/wg-ui-tokens";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;

export type WgEmptyStateProps = {
  /** Lucide component type (e.g. HardHat) or already-built ReactNode */
  icon?: IconComponent | ReactNode;
  title: string;
  description?: string;
  /** Primary CTA — typically one WgButton; omit for plain variant */
  action?: ReactNode;
  className?: string;
};

function renderIcon(icon: IconComponent | ReactNode) {
  if (isValidElement(icon)) return icon;
  // Lucide icons are forwardRef objects ({ $$typeof, render }) — not plain functions
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    return createElement(icon as IconComponent, {
      size: 28,
      strokeWidth: 1.75,
      "aria-hidden": true,
    });
  }
  return null;
}

/**
 * WGDOM-UI-01A/01B — shared empty state (DF-02 / DF-07 spacing).
 * Not TEUX — shell/app only (DS-02 / DS-13).
 */
export function WgEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: WgEmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4 py-12 sm:py-14 px-4",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "inline-flex items-center justify-center w-12 h-12",
            WG_RADIUS_LG,
            "bg-secondary/60 text-muted-foreground",
          )}
        >
          {renderIcon(icon)}
        </div>
      ) : null}
      <div className="space-y-1.5 max-w-sm">
        <p className={cn(WG_TYPE_TITLE, "text-sm")}>{title}</p>
        {description ? (
          <p className={cn(WG_TYPE_BODY, "text-muted-foreground leading-relaxed")}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

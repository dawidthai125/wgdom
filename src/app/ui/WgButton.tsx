import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";
import {
  WG_BTN_EMERALD_LG,
  WG_BTN_GHOST_LINK,
  WG_BTN_ICON,
  WG_BTN_PRIMARY_LG,
  WG_DURATION_ENTER,
  WG_FOCUS_RING,
  WG_RADIUS_LG,
  WG_RADIUS_MD,
  WG_TOUCH_MIN,
  WG_TYPE_INPUT,
} from "@/lib/wg-ui-tokens";

export type WgButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "outline"
  /** Login inspector CTA — extends WgButton (DS-09) */
  | "emerald";

export type WgButtonSize = "sm" | "md" | "lg" | "icon";

export type WgButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: WgButtonVariant;
  size?: WgButtonSize;
  loading?: boolean;
  children?: ReactNode;
};

/**
 * GLOBAL-DESIGN-SYSTEM-01 — WgButton (S0).
 * DS-07: focus via paint tokens · touch ≥44 on md+ · reduced-motion on scale.
 */
export const WgButton = forwardRef<HTMLButtonElement, WgButtonProps>(
  function WgButton(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const paint =
      size === "lg" && variant === "primary"
        ? cn(WG_BTN_PRIMARY_LG, "w-full")
        : size === "lg" && variant === "emerald"
          ? cn(WG_BTN_EMERALD_LG, "w-full")
          : size === "icon" || (variant === "ghost" && size === "icon")
            ? WG_BTN_ICON
            : variant === "ghost"
              ? WG_BTN_GHOST_LINK
              : variant === "secondary"
                ? cn(
                    "inline-flex items-center justify-center gap-2 h-11 px-4",
                    WG_RADIUS_LG,
                    WG_TYPE_INPUT,
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    `transition-all ${WG_DURATION_ENTER}`,
                    "disabled:opacity-55",
                    WG_TOUCH_MIN,
                  )
                : variant === "destructive"
                  ? cn(
                      "inline-flex items-center justify-center gap-2 h-11 px-4",
                      WG_RADIUS_LG,
                      WG_TYPE_INPUT,
                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                      `transition-all ${WG_DURATION_ENTER}`,
                      "disabled:opacity-55",
                      WG_TOUCH_MIN,
                    )
                  : variant === "outline"
                    ? cn(
                        "inline-flex items-center justify-center gap-2 h-11 px-4",
                        WG_RADIUS_LG,
                        WG_TYPE_INPUT,
                        "border border-border/60 bg-transparent hover:bg-secondary/60",
                        `transition-all ${WG_DURATION_ENTER}`,
                        "disabled:opacity-55",
                        WG_TOUCH_MIN,
                      )
                    : cn(
                        "inline-flex items-center justify-center gap-2 h-9 px-3 text-sm",
                        WG_RADIUS_MD,
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        `transition-all ${WG_DURATION_ENTER}`,
                        "disabled:opacity-55",
                      );

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(paint, WG_FOCUS_RING, size === "sm" && "h-9 px-3 text-sm", className)}
        {...rest}
      >
        {loading ? (
          <span
            className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin shrink-0"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    );
  },
);

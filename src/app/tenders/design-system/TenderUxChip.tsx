import type { ReactNode } from "react";
import {
  TEUX_CHIP_ACTIVE,
  TEUX_CHIP_BASE,
  TEUX_CHIP_INACTIVE,
  TEUX_CHIP_TOUCH,
  TEUX_COLOR_PRIMARY_ACTION,
  TEUX_COLOR_STRATEGIC,
  TEUX_COLOR_TEXT_SECONDARY,
  TEUX_DURATION_FAST,
} from "@/lib/tender-ux-tokens";

export type TenderUxChipVariant = "filter" | "queue" | "client" | "action" | "moduleTab";

function variantActiveClass(variant: TenderUxChipVariant): string {
  switch (variant) {
    case "moduleTab":
      return `${TEUX_COLOR_PRIMARY_ACTION} shadow-sm border-transparent ring-0`;
    case "client":
      return "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30 ring-2 ring-orange-500/25";
    case "action":
      return "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25 ring-2 ring-primary/35";
    default:
      return TEUX_CHIP_ACTIVE;
  }
}

function variantInactiveClass(variant: TenderUxChipVariant): string {
  switch (variant) {
    case "moduleTab":
      return "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40";
    case "client":
      return `${TEUX_COLOR_STRATEGIC} hover:bg-orange-500/20`;
    default:
      return TEUX_CHIP_INACTIVE;
  }
}

/** Interaktywny chip filtra / kolejki (TEUX-2) — min-h 44px mobile, aria-pressed. */
export function TenderUxChip({
  pressed = false,
  onClick,
  children,
  variant = "filter",
  className = "",
  title,
  disabled,
  role,
  ariaSelected,
}: {
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
  variant?: TenderUxChipVariant;
  className?: string;
  title?: string;
  disabled?: boolean;
  role?: string;
  ariaSelected?: boolean;
}) {
  const tone = pressed ? variantActiveClass(variant) : variantInactiveClass(variant);
  const classes = [
    TEUX_CHIP_BASE,
    tone,
    onClick ? TEUX_CHIP_TOUCH : "",
    `transition-colors ${TEUX_DURATION_FAST}`,
    "whitespace-nowrap",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        role={role}
        aria-pressed={role === "tab" ? undefined : pressed}
        aria-selected={role === "tab" ? ariaSelected : undefined}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={classes}
        data-tender-ux-chip={variant}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={classes}
      title={title}
      data-tender-ux-chip={variant}
      data-pressed={pressed ? "true" : "false"}
    >
      {children}
    </span>
  );
}

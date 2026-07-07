import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  TEUX_COLOR_PRIMARY_ACTION,
  TEUX_COLOR_SURFACE_DEFAULT,
  TEUX_FONT_BODY,
  TEUX_FONT_TITLE,
  TEUX_TOUCH_TARGET,
  TEUX_TRANSITION_FAST,
} from "@/lib/tender-ux-tokens";

export type TenderUxEmptyAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

/** SSOT empty state modułu Przetargi (TEUX-6). Tytuł = dlaczego; opis + CTA = co zrobić. */
export function TenderUxEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
  className = "",
  "data-teux6-empty": dataTeux6Empty,
}: {
  icon: LucideIcon;
  title: string;
  description: string | ReactNode;
  primaryAction?: TenderUxEmptyAction;
  secondaryAction?: TenderUxEmptyAction;
  /** Slot na linki platformowe (np. proceeding URL) — logika poza SSOT. */
  children?: ReactNode;
  className?: string;
  "data-teux6-empty"?: string;
}) {
  return (
    <div
      className={`text-center py-8 px-4 rounded-xl border ${TEUX_COLOR_SURFACE_DEFAULT} space-y-3 ${className}`}
      data-teux6-empty={dataTeux6Empty}
    >
      <Icon size={32} className="mx-auto text-muted-foreground/50" aria-hidden />
      <h3 className={`${TEUX_FONT_TITLE} text-foreground`}>{title}</h3>
      <div className={`${TEUX_FONT_BODY} text-muted-foreground max-w-md mx-auto`}>
        {typeof description === "string" ? (
          <p className="whitespace-pre-wrap">{description}</p>
        ) : (
          description
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${TEUX_COLOR_PRIMARY_ACTION} ${TEUX_TOUCH_TARGET} ${TEUX_TRANSITION_FAST} hover:bg-primary/90 disabled:opacity-50`}
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:underline ${TEUX_TOUCH_TARGET} disabled:opacity-50`}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
      {children ? <div className="pt-1 space-y-2">{children}</div> : null}
    </div>
  );
}

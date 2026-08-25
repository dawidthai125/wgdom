import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/app/components/ui/utils";
import { WgButton } from "@/app/ui/WgButton";
import {
  WG_DURATION_ENTER,
  WG_FOCUS_RING,
  WG_GLASS_MODAL,
  WG_MODAL_OVERLAY,
  WG_MOTION_ENTER_S,
  WG_MOTION_EXIT_S,
  WG_PAD_MODAL,
  WG_RADIUS_2XL,
  WG_TOUCH_MIN,
  WG_TYPE_TITLE,
} from "@/lib/wg-ui-tokens";

export type WgModalFrameProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  closeLabel?: string;
  children: ReactNode;
  /** dialog = centered; sheet = mobile bottom + desktop centered */
  variant?: "dialog" | "sheet";
  /** glass = Login; solid = admin allowlist parity (S1) */
  surface?: "glass" | "solid";
  size?: "sm" | "md" | "lg" | "xl";
  /** When false, content owns its header/close */
  showHeader?: boolean;
  className?: string;
  zIndex?: number;
};

const dialogSizeClass: Record<NonNullable<WgModalFrameProps["size"]>, string> = {
  sm: "w-[min(calc(100vw-2rem),380px)] max-w-sm",
  md: "w-[min(calc(100vw-2rem),28rem)] max-w-md",
  lg: "w-[min(calc(100vw-2rem),32rem)] max-w-lg",
  /** Near-viewport analysis / workspace surfaces */
  xl: "w-[min(calc(100vw-1.5rem),1200px)] max-h-[min(92dvh,920px)] h-[min(92dvh,920px)] flex flex-col",
};

/** Sheet: full-bleed on mobile; capped width when centered on md+ */
const sheetSizeClass: Record<NonNullable<WgModalFrameProps["size"]>, string> = {
  sm: "w-full max-w-sm md:w-[min(calc(100vw-2rem),380px)]",
  md: "w-full max-w-md md:w-[min(calc(100vw-2rem),28rem)]",
  lg: "w-full max-w-lg md:w-[min(calc(100vw-2rem),32rem)]",
  xl: "w-full max-w-none h-[92dvh] max-h-[92dvh] flex flex-col md:w-[min(calc(100vw-1.5rem),1200px)] md:h-[min(92dvh,920px)] md:max-h-[min(92dvh,920px)]",
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * GLOBAL-DESIGN-SYSTEM-01 — WgModalFrame (S0 + S1).
 * Soft overlay · Escape · focus trap · aria-modal · reduced-motion (DS-06/07).
 */
export function WgModalFrame({
  open,
  onClose,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  closeLabel = "Close",
  children,
  variant = "dialog",
  surface = "glass",
  size = "sm",
  showHeader = true,
  className,
  zIndex = 120,
}: WgModalFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const enterDur = reduceMotion ? 0 : WG_MOTION_ENTER_S;
  const exitDur = reduceMotion ? 0 : WG_MOTION_EXIT_S;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const nodes = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

    const focusFirst = () => {
      const list = nodes();
      (list[0] ?? panel).focus();
    };
    const t = window.setTimeout(focusFirst, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = nodes();
      if (list.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const label = ariaLabel ?? title;
  const solidPanel =
    "bg-card border border-border shadow-2xl rounded-t-2xl md:rounded-2xl";
  const sheetLayout =
    variant === "sheet"
      ? "fixed inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 max-h-[92dvh] flex flex-col modal-sheet"
      : "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={cn("fixed inset-0", WG_MODAL_OVERLAY)}
            style={{ zIndex }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: exitDur }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabelledBy ? undefined : label}
            aria-labelledby={ariaLabelledBy}
            tabIndex={-1}
            className={cn(
              sheetLayout,
              variant === "sheet" ? sheetSizeClass[size] : dialogSizeClass[size],
              surface === "glass"
                ? cn(WG_RADIUS_2XL, WG_GLASS_MODAL, showHeader && WG_PAD_MODAL)
                : solidPanel,
              surface === "solid" && "p-0 overflow-hidden",
              className,
              WG_FOCUS_RING,
            )}
            style={{ zIndex: zIndex + 1 }}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            transition={{ duration: enterDur }}
            onClick={(e) => e.stopPropagation()}
          >
            {showHeader && (title || closeLabel) ? (
              <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
                {title ? <h2 className={WG_TYPE_TITLE}>{title}</h2> : <span />}
                <WgButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className={cn(
                    WG_TOUCH_MIN,
                    "h-11 w-11 rounded-lg hover:bg-secondary",
                    `transition-colors ${WG_DURATION_ENTER}`,
                  )}
                >
                  <X size={16} />
                </WgButton>
              </div>
            ) : null}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

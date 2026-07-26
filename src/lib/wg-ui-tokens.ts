/**
 * GLOBAL-DESIGN-SYSTEM-01 — S0 Foundation
 * SSOT tokenów UI (DS-01…DS-09).
 *
 * Token First (DS-08): nie używaj magic numbers jeśli istnieje token.
 * TEUX / Payroll CORE / Cloud Sync — OUT.
 */

/** DS-05 Radius Ladder */
export const WG_RADIUS_XS = "rounded" as const; // 4px
export const WG_RADIUS_SM = "rounded-lg" as const; // 8px
export const WG_RADIUS_MD = "rounded-xl" as const; // 12px
export const WG_RADIUS_LG = "rounded-2xl" as const; // 16px
export const WG_RADIUS_XL = "rounded-[20px]" as const; // 20px
export const WG_RADIUS_2XL = "rounded-[24px]" as const; // 24px — modal/login/hero only

/** DS-06 Motion Budget (ms) */
export const WG_MOTION_HOVER_MS = 130 as const;
export const WG_MOTION_ENTER_MS = 200 as const;
export const WG_MOTION_EXIT_MS = 150 as const;

/** Tailwind duration classes aligned to budget */
export const WG_DURATION_HOVER = "duration-150" as const;
export const WG_DURATION_ENTER = "duration-200" as const;
export const WG_DURATION_EXIT = "duration-150" as const;

/** Framer/motion seconds — enter mid-budget */
export const WG_MOTION_ENTER_S = WG_MOTION_ENTER_MS / 1000;
export const WG_MOTION_EXIT_S = WG_MOTION_EXIT_MS / 1000;

/** DS-07 Focus — keyboard/focus-visible only (A11Y-01); paint unchanged */
export const WG_FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15" as const;

/** DS-07 Touch / type */
export const WG_TOUCH_MIN = "min-h-[44px] min-w-[44px]" as const;
export const WG_TYPE_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80" as const;
export const WG_TYPE_BODY = "text-sm" as const;
export const WG_TYPE_TITLE = "text-base font-semibold tracking-tight" as const;
export const WG_TYPE_INPUT = "text-base" as const;

/** DS-04 Glass allowlist surfaces (Login / Toolbar / Hero / Modal / Utility) */
export const WG_GLASS_CARD =
  "bg-card/75 dark:bg-card/60 border border-border/60 backdrop-blur-md " +
  "shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.25)]";

export const WG_GLASS_PICK =
  "bg-card/70 border border-border/50 backdrop-blur-md " +
  "shadow-[0_4px_24px_rgba(0,0,0,0.04)]";

export const WG_GLASS_TOOLBAR =
  "border border-border/50 bg-card/50 backdrop-blur-md " +
  "shadow-[0_4px_24px_rgba(0,0,0,0.06)]";

export const WG_GLASS_MODAL =
  "border border-border/60 bg-card/95 backdrop-blur-xl " +
  "shadow-[0_16px_48px_rgba(0,0,0,0.14)]";

export const WG_GLASS_UTILITY =
  "border border-border/70 bg-card/90 backdrop-blur-md " +
  "shadow-[0_12px_40px_rgba(0,0,0,0.12)]";

export const WG_MODAL_OVERLAY = "bg-black/30 backdrop-blur-[2px]" as const;

/** Spacing */
export const WG_SPACE_SECTION = "space-y-10" as const;
export const WG_SPACE_FIELD = "space-y-2.5" as const;
export const WG_SPACE_CARD = "space-y-6" as const;
export const WG_PAD_CARD_LG = "p-8 sm:p-10" as const;
export const WG_PAD_PICK = "px-5 py-5" as const;
export const WG_PAD_MODAL = "p-8" as const;

/** Control chrome — Login input parity */
export const WG_CONTROL_SURFACE =
  "w-full h-14 bg-secondary/50 px-4 border border-border/40 " +
  "placeholder:text-muted-foreground/45 focus:border-primary/50 focus:bg-secondary/70 " +
  `${WG_TYPE_INPUT} ${WG_RADIUS_LG} ${WG_FOCUS_RING} transition-all ${WG_DURATION_ENTER}`;

/** Primary CTA chrome — Login button parity */
export const WG_BTN_PRIMARY_LG =
  "h-14 px-6 bg-primary text-primary-foreground font-semibold " +
  `${WG_TYPE_INPUT} ${WG_RADIUS_LG} ${WG_FOCUS_RING} ` +
  "hover:bg-primary/92 hover:scale-[1.02] active:scale-[0.99] " +
  `transition-all ${WG_DURATION_ENTER} ` +
  "disabled:opacity-55 disabled:hover:scale-100 disabled:cursor-not-allowed " +
  "inline-flex items-center justify-center gap-2 " +
  "shadow-[0_4px_16px_rgba(0,0,0,0.08)] " +
  "motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

/** Inspector CTA — same geometry, emerald paint (Login pixel parity) */
export const WG_BTN_EMERALD_LG =
  "h-14 px-6 bg-emerald-600 text-white font-semibold " +
  `${WG_TYPE_INPUT} ${WG_RADIUS_LG} ${WG_FOCUS_RING} ` +
  "hover:bg-emerald-600/92 hover:scale-[1.02] active:scale-[0.99] " +
  `transition-all ${WG_DURATION_ENTER} ` +
  "disabled:opacity-55 disabled:hover:scale-100 disabled:cursor-not-allowed " +
  "inline-flex items-center justify-center gap-2 " +
  "shadow-[0_4px_16px_rgba(16,185,129,0.2)] " +
  "motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

/** Icon / ghost chrome */
export const WG_BTN_ICON =
  `inline-flex items-center justify-center ${WG_RADIUS_MD} ` +
  `text-muted-foreground hover:text-foreground hover:bg-secondary/70 ` +
  `transition-colors ${WG_DURATION_ENTER} ${WG_FOCUS_RING}`;

export const WG_BTN_GHOST_LINK =
  `w-full text-xs text-muted-foreground hover:text-foreground ` +
  `transition-colors ${WG_DURATION_ENTER} ${WG_FOCUS_RING}`;
/** Compose helpers used by WgCard */
export const WG_CARD_LOGIN = `${WG_GLASS_CARD} ${WG_RADIUS_2XL} ${WG_PAD_CARD_LG} ${WG_SPACE_CARD}`;

export const WG_PICK_SURFACE = `${WG_GLASS_PICK} ${WG_RADIUS_2XL} ${WG_PAD_PICK}`;

/** Enter/exit motion preset (Login mode panels) */
export const WG_MOTION_MODE = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: WG_MOTION_ENTER_S },
} as const;

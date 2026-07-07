/**
 * NG-06-TEUX-2 — Tender Design System tokens (SSOT modułu Przetargi).
 *
 * TOKEN FREEZE: nie rozszerzaj bez MID EPIC REVIEW (po TEUX-3) lub jawnego Owner GO.
 * SSOT epic: docs/architecture/NG-06-TEUX-DESIGN-FREEZE.md §2
 */

// —— Typography (§2.1) ——

/** 11px — etykiety KPI, meta chipów, daty */
export const TEUX_FONT_META =
  "text-[11px] leading-snug";

/** 12px — chipy interaktywne, secondary body, tab bar */
export const TEUX_FONT_CAPTION = "text-xs leading-normal";

/** 13px — paragrafy, opisy empty state */
export const TEUX_FONT_BODY = "text-[13px] leading-snug";

/** 15px — tytuły kart, sekcji */
export const TEUX_FONT_TITLE = "text-[15px] font-semibold leading-snug";

/** 18px — nagłówek modułu, Hero Strategia */
export const TEUX_FONT_HEADLINE = "text-lg font-semibold leading-snug";

/** 24px — KPI liczby (Pulpit, Strategia) */
export const TEUX_FONT_DISPLAY = "text-2xl font-bold leading-tight";

/** Kwoty PLN, terminy liczbowe, % */
export const TEUX_FONT_MONO = "font-mono tabular-nums";

/** Label KPI / metric — uppercase meta */
export const TEUX_KPI_LABEL =
  `${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`;

/** Wartość KPI display */
export const TEUX_KPI_VALUE =
  `${TEUX_FONT_DISPLAY} ${TEUX_FONT_MONO}`;

/** Sub-wartość KPI */
export const TEUX_KPI_SUBVALUE = `${TEUX_FONT_CAPTION} font-semibold text-primary`;

/** KPI compact — Command Layer (4 komórki) */
export const TEUX_KPI_COMPACT_LABEL = TEUX_KPI_LABEL;

export const TEUX_KPI_COMPACT_VALUE =
  `${TEUX_FONT_META} sm:text-xs font-medium text-foreground tabular-nums break-words leading-snug`;

export const TEUX_KPI_COMPACT_SUBVALUE =
  `${TEUX_FONT_META} font-semibold text-primary tabular-nums line-clamp-1`;

export const TEUX_KPI_COMPACT_CELL = "px-2.5 py-2 min-w-0";

export const TEUX_KPI_COMPACT_CONTAINER =
  "rounded-lg border border-border/70 bg-card/60 overflow-hidden";

// —— Spacing (§2.2) ——

export const TEUX_SPACE_XS = "gap-1 p-1";
export const TEUX_SPACE_SM = "gap-2 p-2";
export const TEUX_SPACE_MD = "gap-3 p-3";
export const TEUX_SPACE_LG = "gap-4 px-4";
export const TEUX_SPACE_XL = "gap-6 py-6";
export const TEUX_SPACE_SECTION = "space-y-4 sm:space-y-6";

/** Touch target mobile — min 44×44px (NG-03) */
export const TEUX_TOUCH_TARGET = "min-h-[44px] sm:min-h-0";

export const TEUX_MODULE_TAB_PADDING = "px-3 py-2";
export const TEUX_MODULE_TAB_MIN_H = "min-h-[36px]";

// —— Color roles (§2.3) — semantyczne, bez nowej palety brand ——

export const TEUX_COLOR_PRIMARY_ACTION =
  "bg-primary text-primary-foreground";

export const TEUX_COLOR_SURFACE_DEFAULT = "bg-card border-border";

export const TEUX_COLOR_SURFACE_MUTED = "bg-secondary/60 text-foreground/85 border-border";

export const TEUX_COLOR_TEXT_SECONDARY = "text-muted-foreground";

export const TEUX_COLOR_URGENT =
  "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";

export const TEUX_COLOR_SUCCESS =
  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";

export const TEUX_COLOR_BLOCKED =
  "bg-red-500/10 text-red-600 border-red-500/25";

export const TEUX_COLOR_STRATEGIC =
  "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30";

export const TEUX_COLOR_SCORE =
  "bg-primary/10 text-primary border-primary/25";

export const TEUX_COLOR_FIT =
  "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25";

// —— Chip (§2.4 + interactive) ——

export const TEUX_CHIP_BASE =
  `${TEUX_FONT_CAPTION} font-medium rounded-lg border transition-colors`;

export const TEUX_CHIP_ACTIVE =
  "bg-primary/12 text-primary border-primary/30 ring-2 ring-primary/25";

export const TEUX_CHIP_INACTIVE =
  "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground";

export const TEUX_CHIP_TOUCH = `${TEUX_TOUCH_TARGET} touch-manipulation`;

// —— Badge (§2.4) ——

export const TEUX_BADGE_BASE =
  `${TEUX_FONT_CAPTION} font-medium px-2 py-0.5 rounded-md border`;

export const TEUX_BADGE_STATUS = `${TEUX_BADGE_BASE} bg-secondary text-muted-foreground border-border`;

export const TEUX_BADGE_SCORE = `${TEUX_BADGE_BASE} ${TEUX_COLOR_SCORE}`;

export const TEUX_BADGE_FIT = `${TEUX_BADGE_BASE} ${TEUX_COLOR_FIT}`;

export const TEUX_BADGE_URGENT = `${TEUX_BADGE_BASE} ${TEUX_COLOR_URGENT}`;

export const TEUX_BADGE_QUEUE_ACTIVE =
  `${TEUX_BADGE_BASE} ${TEUX_CHIP_ACTIVE}`;

// —— Section title ——

export const TEUX_SECTION_TITLE =
  `${TEUX_FONT_CAPTION} font-semibold uppercase tracking-wide text-muted-foreground`;

// —— Motion (§2.10) ——

export const TEUX_DURATION_FAST = "duration-150";
export const TEUX_DURATION_NORMAL = "duration-200";

export const TEUX_TRANSITION_FAST = `transition-colors ${TEUX_DURATION_FAST}`;

/** Wersja tokenów — audyt / test gate */
export const TEUX_TOKENS_VERSION = "1.0.0-teux2";

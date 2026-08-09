/**
 * Branding block — Inteligentny Kosztorysant (Hub only).
 * Presentation-only · no store / flag.
 */

import {
  INTELIGENTNY_KOSZTORYSANT_AUTHOR_PL,
  INTELIGENTNY_KOSZTORYSANT_TITLE_PL,
} from "@/lib/expert-conversation-ui";
import { TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";

export function InteligentnyKosztorysantBrand({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <header
      className={
        compact
          ? "rounded-lg border border-border/60 bg-card/80 px-3 py-2"
          : "rounded-xl border border-border/70 bg-card px-4 py-3"
      }
      data-inteligentny-kosztorysant-brand
      aria-label={INTELIGENTNY_KOSZTORYSANT_TITLE_PL}
    >
      <p
        className={`${TEUX_SECTION_TITLE} text-foreground tracking-wide`}
        data-inteligentny-kosztorysant-title
      >
        {INTELIGENTNY_KOSZTORYSANT_TITLE_PL}
      </p>
      <p
        className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}
        data-inteligentny-kosztorysant-author
      >
        {INTELIGENTNY_KOSZTORYSANT_AUTHOR_PL}
      </p>
    </header>
  );
}

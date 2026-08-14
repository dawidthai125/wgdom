/**
 * Shared catalog pager chrome. Uses parent page state + paginateOurPriceCatalogRows.
 */

import type { ReactNode } from "react";
import { WgButton } from "@/app/ui";

type CatalogPagerProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  children?: ReactNode;
};

export function CatalogPager({
  page,
  totalPages,
  total,
  pageSize,
  onPrev,
  onNext,
  children,
}: CatalogPagerProps) {
  return (
    <div className="space-y-2 px-3 py-3 border-t border-border text-[11px] text-muted-foreground">
      {children}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span>
          Widok: {total} · strona {page} z {totalPages} · {pageSize} na stronę
        </span>
        <div className="flex gap-1">
          <WgButton
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={onPrev}
            aria-label="Poprzednia strona"
          >
            Poprzednia
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={onNext}
            aria-label="Następna strona"
          >
            Następna
          </WgButton>
        </div>
      </div>
    </div>
  );
}

import type { MouseEvent } from "react";
import { Building2, MapPin } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { TenderUxBadge } from "@/app/tenders/design-system/TenderUxBadge";
import {
  TEUX_FONT_CAPTION,
  TEUX_FONT_META,
  TEUX_FONT_TITLE,
  TEUX_SPACE_MD,
} from "@/lib/tender-ux-tokens";
import type { TenderListCardViewModel } from "@/app/tenders/list/tender-list-card-model";
import { TenderListBulkCheckbox } from "@/app/tenders/list/TenderListBulkCheckbox";

export function TenderListMobileCard({
  item,
  vm,
  bulkMode,
  bulkSelected,
  onToggleBulk,
  onClick,
}: {
  item: TenderPipelineItem;
  vm: TenderListCardViewModel;
  bulkMode?: boolean;
  bulkSelected?: boolean;
  onToggleBulk?: (e: MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full text-left ${TEUX_SPACE_MD} py-3 hover:bg-secondary/40 transition-colors flex gap-2 min-h-[44px] touch-manipulation`}
      onClick={onClick}
      data-tender-list-card="mobile"
      data-tender-id={item.id}
      data-tender-severity={vm.severity}
    >
      {bulkMode && onToggleBulk && (
        <TenderListBulkCheckbox
          selected={!!bulkSelected}
          onToggle={onToggleBulk}
          ariaLabel={`${bulkSelected ? "Odznacz" : "Zaznacz"} przetarg: ${item.title}`}
        />
      )}
      <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {vm.mobileBadges.map((b) => (
            <TenderUxBadge
              key={b.key}
              variant={b.variant}
              className={b.className}
            >
              {b.label}
            </TenderUxBadge>
          ))}
          {vm.mobileBadgeOverflow > 0 && (
            <TenderUxBadge variant="status" className="text-muted-foreground">
              +{vm.mobileBadgeOverflow}
            </TenderUxBadge>
          )}
        </div>

        <p className={`${TEUX_FONT_TITLE} line-clamp-2`}>{item.title}</p>

        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground flex items-center gap-1.5 min-w-0`}>
          <Building2 size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{item.organizationName}</span>
          <span aria-hidden>·</span>
          <MapPin size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{item.organizationCity || "—"}</span>
        </p>

        {vm.bidLine && (
          <p className={`${TEUX_FONT_META} font-medium text-foreground/85 tabular-nums truncate`}>
            {vm.bidLine}
          </p>
        )}

        <dl
          className={`grid grid-cols-3 gap-2 ${TEUX_FONT_META} text-muted-foreground`}
          data-tender-list-kpi-row
        >
          <div className="min-w-0">
            <dt className="uppercase tracking-wide font-semibold">Termin</dt>
            <dd className={`font-medium text-foreground tabular-nums truncate ${vm.urgent ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {vm.kpiTermin}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="uppercase tracking-wide font-semibold">Trafność</dt>
            <dd className="font-medium text-foreground tabular-nums">{vm.kpiTrafność}</dd>
          </div>
          <div className="min-w-0">
            <dt className="uppercase tracking-wide font-semibold">Wadium</dt>
            <dd className={`font-medium tabular-nums truncate ${vm.kpiWadium === "Blokada" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
              {vm.kpiWadium}
            </dd>
          </div>
        </dl>
      </div>
    </button>
  );
}

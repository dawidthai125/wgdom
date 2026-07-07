import type { MouseEvent } from "react";
import { Building2, Calendar, MapPin } from "lucide-react";
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

export function TenderListDesktopCard({
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
      className={`w-full text-left ${TEUX_SPACE_MD} py-2.5 hover:bg-secondary/40 transition-colors flex gap-2`}
      onClick={onClick}
      data-tender-list-card="desktop"
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
      <div className="flex flex-wrap items-start justify-between gap-2 flex-1 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {vm.desktopBadges.map((b) => (
              <TenderUxBadge
                key={b.key}
                variant={b.variant}
                className={b.className}
              >
                {b.label}
              </TenderUxBadge>
            ))}
          </div>

          <p className={`${TEUX_FONT_TITLE} leading-snug line-clamp-2`}>{item.title}</p>

          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground flex items-center gap-1.5 flex-wrap`}>
            <Building2 size={12} aria-hidden />
            {item.organizationName}
            <span aria-hidden>·</span>
            <MapPin size={12} aria-hidden />
            {item.organizationCity || "—"}
          </p>

          {vm.bidLine && (
            <p className={`${TEUX_FONT_META} font-medium text-foreground/85 tabular-nums`}>
              {vm.bidLine}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0 max-w-[40%]">
          <TenderUxBadge variant="status" className={vm.statusBadgeClass}>
            {vm.statusLabel}
          </TenderUxBadge>
          {vm.deadlineText && (
            <span className={`${TEUX_FONT_META} flex items-center gap-1 ${vm.deadlineClass}`}>
              <Calendar size={11} aria-hidden />
              {vm.deadlineText}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

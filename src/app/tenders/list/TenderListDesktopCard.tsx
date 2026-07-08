import type { MouseEvent } from "react";
import { Building2, Calendar } from "lucide-react";
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
  const orgLine = [item.organizationName, item.organizationCity || "—"].filter(Boolean).join(" · ");
  const showCompactMeta = vm.kpiTrafność !== "—" || vm.kpiWadium !== "—";

  return (
    <button
      type="button"
      className={`w-full text-left ${TEUX_SPACE_MD} py-1.5 hover:bg-secondary/40 transition-colors flex gap-2`}
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
        <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
          {vm.desktopBadges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 min-w-0">
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
          ) : null}

          <p className={`${TEUX_FONT_TITLE} leading-snug line-clamp-2`}>{item.title}</p>

          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground flex items-center gap-1 min-w-0`}>
            <Building2 size={12} className="shrink-0" aria-hidden />
            <span className="truncate">{orgLine}</span>
          </p>

          {vm.bidLine && (
            <p className={`${TEUX_FONT_META} font-medium text-foreground/85 tabular-nums truncate`}>
              {vm.bidLine}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0 max-w-[42%] min-w-0">
          <TenderUxBadge variant="status" className={vm.statusBadgeClass}>
            {vm.statusLabel}
          </TenderUxBadge>
          {vm.deadlineText && (
            <span className={`${TEUX_FONT_META} flex items-center gap-1 text-right ${vm.deadlineClass}`}>
              <Calendar size={11} className="shrink-0" aria-hidden />
              <span className="truncate">{vm.deadlineText}</span>
            </span>
          )}
          {showCompactMeta && (
            <span className={`${TEUX_FONT_META} text-muted-foreground tabular-nums text-right truncate max-w-full`}>
              {vm.kpiTrafność !== "—" && `Traf. ${vm.kpiTrafność}`}
              {vm.kpiTrafność !== "—" && vm.kpiWadium !== "—" && " · "}
              {vm.kpiWadium !== "—" && `Wad. ${vm.kpiWadium}`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

import type { TenderPipelineItem, TenderPipelineStatus } from "@/lib/tenders-bzp";
import { TENDER_STATUS_LABELS } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import {
  buildTenderSummarySnapshot,
  TENDER_SUMMARY_BAR_ID,
} from "@/lib/tender-workspace-ux";

export function TenderSummaryBar({
  item,
  swz,
  readyCount,
  readyTotal,
  onStatusChange,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  readyCount?: number;
  readyTotal?: number;
  onStatusChange?: (status: TenderPipelineStatus) => void;
}) {
  const snap = buildTenderSummarySnapshot(item, swz, readyCount, readyTotal);

  return (
    <div
      id={TENDER_SUMMARY_BAR_ID}
      className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-card/95 backdrop-blur border-b border-border space-y-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Przetarg
      </p>
      <p className="text-xs font-semibold leading-snug line-clamp-2">{item.title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 text-[10px]">
        <div>
          <span className="text-muted-foreground">Status</span>
          {onStatusChange ? (
            <select
              value={item.status}
              onChange={(e) => onStatusChange(e.target.value as TenderPipelineStatus)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 block w-full bg-secondary rounded-md px-1.5 py-1 text-[10px] border border-border"
            >
              {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
          ) : (
            <p className="font-medium mt-0.5">{snap.statusLabel}</p>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Termin</span>
          <p className={`font-medium mt-0.5 ${!snap.offerOpen && item.submittingOffersDate ? "text-amber-700 dark:text-amber-300" : ""}`}>
            {snap.deadlineDisplay}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Wartość</span>
          <p className="font-medium mt-0.5 truncate" title={snap.valueDisplay}>{snap.valueDisplay}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Pilne</span>
          <p className="font-medium mt-0.5">
            {snap.monitoring.total > 0 ? (
              <span className="text-amber-700 dark:text-amber-300">
                {snap.monitoring.changes > 0 && `${snap.monitoring.changes} zm.`}
                {snap.monitoring.changes > 0 && snap.monitoring.qa > 0 && " · "}
                {snap.monitoring.qa > 0 && `${snap.monitoring.qa} Q&A`}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </div>
      </div>
      {snap.readyLabel && (
        <p className="text-[10px] text-muted-foreground">
          Gotowość oferty: <strong className="text-foreground">{snap.readyLabel}</strong>
        </p>
      )}
    </div>
  );
}

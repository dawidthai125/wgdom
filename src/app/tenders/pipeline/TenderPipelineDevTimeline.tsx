/**
 * NG-02 — dev-only timeline (nie renderować w prod UI dla użytkownika).
 */

import type { PipelineTimelineEntry } from "@/lib/tender-pipeline/tender-pipeline-types";
import type { UnifiedGateReason, UnifiedGateStatus } from "@/lib/tender-pipeline/unified-attachment-gate";
import { isPipelineTimelineEnabled } from "@/lib/tender-pipeline/tender-pipeline-timeline";

export function TenderPipelineDevTimeline({
  timeline,
  pipelineState,
  gateStatus,
  gateReason,
}: {
  timeline: PipelineTimelineEntry[];
  pipelineState: string;
  gateStatus?: UnifiedGateStatus;
  gateReason?: UnifiedGateReason;
}) {
  if (!isPipelineTimelineEnabled()) return null;
  if (timeline.length === 0 && !gateStatus) return null;

  return (
    <details
      className="rounded-lg border border-dashed border-violet-500/40 bg-violet-500/5 px-3 py-2 text-[10px] font-mono text-muted-foreground"
      data-dev-pipeline-timeline
    >
      <summary className="cursor-pointer select-none text-violet-700 dark:text-violet-300 font-semibold">
        [dev] Pipeline · {pipelineState}
        {gateStatus && (
          <span className="ml-2 font-normal opacity-80">
            Gate: {gateStatus} · {gateReason}
          </span>
        )}
      </summary>
      <ol className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
        {timeline.map((row, i) => (
          <li key={`${row.at}-${i}`}>
            <span className="text-violet-600 dark:text-violet-400">{row.state}</span>
            {" · "}
            <span>{new Date(row.at).toLocaleTimeString("pl-PL")}</span>
            {row.gateStatus && (
              <span className="text-amber-600 dark:text-amber-400">
                {" · Gate "}
                {row.gateStatus}
                {row.gateReason ? `/${row.gateReason}` : ""}
              </span>
            )}
            {row.detail && <span className="opacity-70"> — {row.detail}</span>}
          </li>
        ))}
      </ol>
    </details>
  );
}

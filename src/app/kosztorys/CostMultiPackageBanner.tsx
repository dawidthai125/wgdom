/**
 * COST-MULTI-01 M3 + COST-MULTI-02 B3 — banner wielobranżowy / Aggregate Bid.
 */
import { shouldShowCostMultiUi, resolveCostMultiUiCopy, type CostPackage } from "@/lib/cost-multi-01";
import {
  resolveCostBidInput,
  resolveCostMulti02UiOverlay,
} from "@/lib/cost-multi-02";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export function CostMultiPackageBanner({
  pkg,
  item,
}: {
  pkg: CostPackage;
  item?: TenderPipelineItem | null;
}) {
  if (!shouldShowCostMultiUi(pkg)) return null;
  const copy = resolveCostMultiUiCopy(pkg);
  const bidDecision = item ? resolveCostBidInput(item) : null;
  const overlay = bidDecision ? resolveCostMulti02UiOverlay(bidDecision) : null;

  const tone = overlay?.tone ?? copy.tone;
  const title = overlay?.title ?? copy.title;
  const body = overlay?.body ?? copy.body;

  const border =
    tone === "warn"
      ? "border-amber-500/40 bg-amber-500/10"
      : tone === "success"
        ? "border-emerald-500/40 bg-emerald-500/10"
        : "border-sky-500/40 bg-sky-500/10";

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 space-y-2 ${border}`}
      data-cost-multi-01="1"
      data-cost-multi-02={overlay?.mode ?? ""}
      data-cost-multi-status={pkg.status}
      data-cost-multi-policy={pkg.aggregate?.policy ?? ""}
      data-cost-bid-mode={bidDecision?.mode ?? ""}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
        {copy.policyLabel && (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{copy.policyLabel}</p>
        )}
      </div>
      <ul className="space-y-1">
        {copy.members.map((m) => (
          <li
            key={`${m.filename}-${m.role}`}
            className="text-[11px] text-foreground/90 flex flex-wrap gap-x-2 gap-y-0.5"
            data-cost-multi-member={m.role}
          >
            <span className="font-medium truncate max-w-[min(100%,28rem)]">{m.filename}</span>
            <span className="text-muted-foreground">· {m.role}</span>
            <span className="text-muted-foreground">· {m.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

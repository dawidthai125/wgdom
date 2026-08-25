/**
 * W5-1 / W6-2 / OWNER-ACTION-NAV-01 — Navigate to existing Owner action panels.
 * Presentation honesty: NAVIGABLE | CHIEF_OFF | GAP (derive from resolve only).
 * ZERO writes · ZERO resolver/queue SSOT changes · ZERO Chief bypass.
 */

import type { IkOwnerActionQueueReport } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import type { IkOwnerActionItem } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import type {
  IkOwnerActionDeepLinkContext,
  IkOwnerActionDeepLinkResolution,
  IkOwnerActionNavigateHandlers,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";
import {
  focusIkOwnerActionTarget,
  navigateIkOwnerActionTarget,
  resolveIkOwnerActionDeepLink,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";
import { TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { cn } from "@/app/components/ui/utils";

/** Presentation-only — mirrors resolve.ok / reason (OWNER-ACTION-NAV-01). */
export type IkOwnerActionNavStatus = "navigable" | "chief_off" | "gap";

export function deriveIkOwnerActionNavStatus(
  resolution: IkOwnerActionDeepLinkResolution,
): IkOwnerActionNavStatus {
  if (resolution.ok) return "navigable";
  if (resolution.reason === "CHIEF_OFF") return "chief_off";
  return "gap";
}

const STATUS_BADGE_PL: Record<Exclude<IkOwnerActionNavStatus, "navigable">, string> = {
  chief_off: "Chief OFF",
  gap: "GAP",
};

export function IkOwnerActionQueueNavigate({
  queue,
  deepLinkContext,
  navigateHandlers,
}: {
  queue: IkOwnerActionQueueReport | null;
  deepLinkContext?: IkOwnerActionDeepLinkContext;
  /** W6-2 — when set, uses cross-tab navigation + deferred focus. */
  navigateHandlers?: IkOwnerActionNavigateHandlers;
}) {
  if (!queue || queue.itemCount === 0) return null;

  const top = queue.items.slice(0, 6);

  const runNavigate = (item: IkOwnerActionItem) => {
    if (navigateHandlers) {
      navigateIkOwnerActionTarget(item, deepLinkContext, navigateHandlers);
      return;
    }
    focusIkOwnerActionTarget(item, deepLinkContext);
  };

  return (
    <section
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-2"
      data-ik-owner-action-queue-nav
      data-ik-owner-action-nav-honesty="1"
    >
      <p className={`${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-100`}>
        Kolejka Owner — otwórz dostępne panele ({queue.packageGateBlockingCount} blokuje
        gate). Niedostępne: Chief OFF / GAP.
      </p>
      <ul className="flex flex-wrap gap-2">
        {top.map((item) => {
          const resolution = resolveIkOwnerActionDeepLink(item, deepLinkContext);
          const status = deriveIkOwnerActionNavStatus(resolution);
          const disabled = !resolution.ok;
          const badge =
            status === "navigable" ? null : STATUS_BADGE_PL[status];
          return (
            <li key={`${item.domain}|${item.lineRef}|${item.blockerCode}`}>
              <button
                type="button"
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md border border-border bg-background hover:bg-secondary/80 disabled:opacity-50 disabled:hover:bg-background",
                  status === "chief_off" && "border-amber-500/40",
                  status === "gap" && "border-muted-foreground/30",
                )}
                data-ik-owner-action-nav
                data-ik-owner-action-domain={item.domain}
                data-ik-owner-action-line-ref={item.lineRef}
                data-ik-owner-action-status={status}
                data-ik-owner-action-resolved={resolution.ok ? "1" : "0"}
                data-ik-owner-action-chief-off={
                  status === "chief_off" ? "1" : "0"
                }
                data-ik-owner-action-gap={status === "gap" ? "1" : "0"}
                title={
                  resolution.ok
                    ? resolution.selector
                    : resolution.gapNotePl
                }
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  runNavigate(item);
                }}
              >
                {item.labelPl}
                {badge ? (
                  <span
                    className="ml-1 font-semibold text-[10px] opacity-90"
                    data-ik-owner-action-status-badge={status}
                  >
                    · {badge}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

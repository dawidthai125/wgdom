/**
 * W5-1 / W6-2 — Navigate to existing Owner action panels (scroll/focus only · no writes).
 */

import type { IkOwnerActionQueueReport } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import type { IkOwnerActionItem } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import type { IkOwnerActionDeepLinkContext } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";
import {
  focusIkOwnerActionTarget,
  navigateIkOwnerActionTarget,
  resolveIkOwnerActionDeepLink,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";
import type { IkOwnerActionNavigateHandlers } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";
import { TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";

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
    >
      <p className={`${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-100`}>
        Kolejka Owner — przejdź do panelu ({queue.packageGateBlockingCount} blokuje gate)
      </p>
      <ul className="flex flex-wrap gap-2">
        {top.map((item) => {
          const resolution = resolveIkOwnerActionDeepLink(item, deepLinkContext);
          const disabled = !resolution.ok;
          return (
            <li key={`${item.domain}|${item.lineRef}|${item.blockerCode}`}>
              <button
                type="button"
                className="text-[11px] px-2 py-1 rounded-md border border-border bg-background hover:bg-secondary/80 disabled:opacity-50"
                data-ik-owner-action-nav
                data-ik-owner-action-domain={item.domain}
                data-ik-owner-action-line-ref={item.lineRef}
                data-ik-owner-action-resolved={resolution.ok ? "1" : "0"}
                data-ik-owner-action-chief-off={
                  !resolution.ok && resolution.reason === "CHIEF_OFF" ? "1" : "0"
                }
                title={resolution.ok ? resolution.selector : resolution.gapNotePl}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  runNavigate(item);
                }}
              >
                {item.labelPl}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

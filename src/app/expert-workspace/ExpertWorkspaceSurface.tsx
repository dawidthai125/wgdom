/**
 * WIRE-EXPERTS-UI-01 — READ ONLY surface.
 * Jedyny input render: ExpertWorkspaceViewModel.
 * Kolejność LOCKED: EE → ME → PE → Cost → Offer.
 * Zero CTA — brak akcji decyzyjnych / ponownego uruchomienia.
 */

import { TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { ExpertWorkspaceViewModel } from "@/lib/expert-workspace-ui";
import { CostDetailsPanel } from "./CostDetailsPanel";
import { ExecutionDetailsPanel } from "./ExecutionDetailsPanel";
import { MaterialsDetailsPanel } from "./MaterialsDetailsPanel";
import { OfferDetailsPanel } from "./OfferDetailsPanel";
import { PricingDetailsPanel } from "./PricingDetailsPanel";

export function ExpertWorkspaceSurface({
  vm,
}: {
  vm: ExpertWorkspaceViewModel;
}) {
  if (vm.uiPhase === "hidden") return null;

  return (
    <section
      id="expert-workspace-surface"
      data-expert-workspace-surface
      data-expert-ui-phase={vm.uiPhase}
      className="rounded-lg border border-border/60 bg-secondary/10 overflow-hidden"
    >
      <details className="group" data-expert-workspace-root>
        <summary className="px-3 py-2.5 min-h-[44px] cursor-pointer list-none flex items-center justify-between gap-2 touch-manipulation">
          <div>
            <p className={`${TEUX_SECTION_TITLE} text-foreground`}>{vm.titlePl}</p>
            <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
              {vm.subtitlePl}
            </p>
          </div>
          <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>rozwiń</span>
        </summary>
        <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
          <ExecutionDetailsPanel view={vm.execution} />
          <MaterialsDetailsPanel view={vm.materials} />
          <PricingDetailsPanel view={vm.pricing} />
          <CostDetailsPanel view={vm.cost} />
          <OfferDetailsPanel view={vm.offer} />
        </div>
      </details>
    </section>
  );
}

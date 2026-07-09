/**
 * NG-08-05 — Most nawigacji Kosztorys ↔ Ceny (WF-05a).
 */

import { TEUX_FONT_META } from "@/lib/tender-ux-tokens";

export function TenderCostWorkspaceBridge({
  targetTab,
  onNavigate,
}: {
  tenderId: string;
  targetTab: "kosztorys" | "ceny";
  onNavigate: () => void;
}) {
  const copy =
    targetTab === "ceny" ? (
      <>
        Przejdź do <strong>wyceny oferty</strong>
      </>
    ) : (
      <>
        Zobacz <strong>kosztorys ATH</strong>
      </>
    );

  return (
    <button
      type="button"
      onClick={onNavigate}
      data-tender-cost-workspace-bridge
      data-tender-cost-bridge-target={targetTab}
      className={`${TEUX_FONT_META} w-full text-left border border-border/60 rounded-lg px-3 py-2 min-h-[32px] touch-manipulation hover:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
    >
      {copy}
    </button>
  );
}

import {
  DELIVERY_PACKAGE_STATUS_BADGE_CLASS,
  DELIVERY_PACKAGE_STATUS_LABELS,
} from "@/lib/inspector-handover-ux";

/** SSOT badge pakietu odbiorowego — admin + inspektor (INSPECTOR-DESIGN-002). */
export function DeliveryPackageStatusBadge({
  ready,
  className = "",
}: {
  ready: boolean;
  className?: string;
}) {
  const label = ready ? DELIVERY_PACKAGE_STATUS_LABELS.ready : DELIVERY_PACKAGE_STATUS_LABELS.missing;
  const badgeClass = ready
    ? DELIVERY_PACKAGE_STATUS_BADGE_CLASS.ready
    : DELIVERY_PACKAGE_STATUS_BADGE_CLASS.missing;

  return (
    <span
      title={ready ? "Pakiet odbiorowy opublikowany przez administratora" : "Brak opublikowanego pakietu odbiorowego"}
      className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold border shrink-0 ${badgeClass} ${className}`}
    >
      {label}
    </span>
  );
}

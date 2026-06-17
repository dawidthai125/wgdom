import { inspectorDeliveryPackageForJob } from "@/lib/delivery-package-publications/inspector-access";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";

/** Kolejność bloków ekranu roboty — INSPECTOR-UX-002 (pakiet przed treścią sekcji). */
export const INSPECTOR_JOB_DETAIL_LAYOUT_ORDER = [
  "sticky_header",
  "delivery_package",
  "section_content",
] as const;

export type InspectorHandoverQuickActionId = "download_package" | "checklist" | "photos";

export const INSPECTOR_HANDOVER_QUICK_ACTIONS: {
  id: InspectorHandoverQuickActionId;
  label: string;
  targetSection?: "docs" | "photos";
}[] = [
  { id: "download_package", label: "Pobierz pakiet" },
  { id: "checklist", label: "Checklista", targetSection: "docs" },
  { id: "photos", label: "Zdjęcia", targetSection: "photos" },
];

export const INSPECTOR_DELIVERY_PACKAGE_PANEL_ID = "inspector-delivery-package";

/** Klasy badge pakietu — spójne z JOB_LIST_STATUS_CONFIG (border + semantic colors). */
export const DELIVERY_PACKAGE_STATUS_BADGE_CLASS = {
  ready: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  missing: "bg-red-500/12 text-red-700 dark:text-red-400 border-red-500/25",
} as const;

export const DELIVERY_PACKAGE_STATUS_LABELS = {
  ready: "PAKIET GOTOWY",
  missing: "BRAK PAKIETU",
} as const;

export function inspectorDeliveryPackageStatusDisplay(
  publications: DeliveryPackagePublication[],
  jobId: string,
): { ready: boolean; label: string; badgeClass: string } {
  const publication = inspectorDeliveryPackageForJob(publications, jobId);
  if (publication) {
    return {
      ready: true,
      label: DELIVERY_PACKAGE_STATUS_LABELS.ready,
      badgeClass: DELIVERY_PACKAGE_STATUS_BADGE_CLASS.ready,
    };
  }
  return {
    ready: false,
    label: DELIVERY_PACKAGE_STATUS_LABELS.missing,
    badgeClass: DELIVERY_PACKAGE_STATUS_BADGE_CLASS.missing,
  };
}

/** Pakiet ma pierwszeństwo w scrollu — przed treścią aktywnej sekcji. */
export function inspectorJobDetailContentOrder(activeSection: string): string[] {
  return [INSPECTOR_DELIVERY_PACKAGE_PANEL_ID, `section:${activeSection}`];
}

export function inspectorHandoverQuickActionsForRender(): typeof INSPECTOR_HANDOVER_QUICK_ACTIONS {
  return INSPECTOR_HANDOVER_QUICK_ACTIONS;
}

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

export function inspectorDeliveryPackageStatusDisplay(
  publications: DeliveryPackagePublication[],
  jobId: string,
): { ready: boolean; emoji: string; label: string } {
  const publication = inspectorDeliveryPackageForJob(publications, jobId);
  if (publication) {
    return { ready: true, emoji: "🟢", label: "PAKIET GOTOWY" };
  }
  return { ready: false, emoji: "🔴", label: "BRAK PAKIETU" };
}

/** Pakiet ma pierwszeństwo w scrollu — przed treścią aktywnej sekcji. */
export function inspectorJobDetailContentOrder(activeSection: string): string[] {
  return [INSPECTOR_DELIVERY_PACKAGE_PANEL_ID, `section:${activeSection}`];
}

export function inspectorHandoverQuickActionsForRender(): typeof INSPECTOR_HANDOVER_QUICK_ACTIONS {
  return INSPECTOR_HANDOVER_QUICK_ACTIONS;
}

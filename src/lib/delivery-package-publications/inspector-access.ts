import { downloadUrlAsFile } from "@/lib/photo-download";
import { getActiveDeliveryPackagePublication } from "@/lib/delivery-package-publications/publication";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";

/** Uprawnienia inspektora względem pakietu odbiorowego (P1B). */
export const INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS = {
  canReadPublication: true,
  canDownloadZip: true,
  canViewManifest: true,
  canPublish: false,
  canRevoke: false,
  canDelete: false,
  canGenerateZip: false,
  canAccessWmPrint: false,
} as const;

/** Aktywna publikacja gotowa do pobrania — null gdy brak lub REVOKED. */
export function inspectorDeliveryPackageForJob(
  publications: DeliveryPackagePublication[],
  jobId: string,
): DeliveryPackagePublication | null {
  const active = getActiveDeliveryPackagePublication(publications, jobId);
  if (!active || active.status === "REVOKED") return null;
  return active;
}

export async function downloadPublishedDeliveryPackageZip(
  publication: DeliveryPackagePublication,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (publication.status !== "ACTIVE") {
    return { ok: false, error: "Pakiet nie jest aktywny" };
  }
  if (!publication.zipPublicUrl) {
    return { ok: false, error: "Brak adresu pliku pakietu" };
  }
  try {
    await downloadUrlAsFile(publication.zipPublicUrl, publication.fileName);
    return { ok: true };
  } catch {
    return { ok: false, error: "Nie udało się pobrać pakietu odbiorowego" };
  }
}

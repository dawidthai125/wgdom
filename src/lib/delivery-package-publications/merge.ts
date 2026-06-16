import { normalizeDeliveryPackagePublications } from "@/lib/delivery-package-publications/normalize";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";
import { DELIVERY_PACKAGE_PUBLICATIONS_CAP } from "@/lib/delivery-package-publications/types";

function sortPublicationsDesc(entries: DeliveryPackagePublication[]): DeliveryPackagePublication[] {
  return [...entries].sort((a, b) => {
    const t = b.publishedAt.localeCompare(a.publishedAt);
    if (t !== 0) return t;
    return b.zipVersion - a.zipVersion;
  });
}

export function mergeDeliveryPackagePublications(
  local: unknown,
  cloud: unknown,
): DeliveryPackagePublication[] {
  const byId = new Map<string, DeliveryPackagePublication>();
  for (const item of normalizeDeliveryPackagePublications(local)) byId.set(item.id, item);
  for (const item of normalizeDeliveryPackagePublications(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) byId.set(item.id, item);
  }
  return sortPublicationsDesc([...byId.values()]).slice(0, DELIVERY_PACKAGE_PUBLICATIONS_CAP);
}

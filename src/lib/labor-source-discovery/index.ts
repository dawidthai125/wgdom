/**
 * Labor source discovery — DISCOVERED ≠ TRUSTED · promote → Evidence route extension.
 */

export {
  LABOR_SOURCE_DISCOVERY_STORAGE_KEY,
  LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION,
  type DiscoveredSourceStatus,
  type DiscoveredSourceProvenance,
  type DiscoveredSourceRecord,
  type PromotedTrustedEvidenceRoute,
  type LaborSourceDiscoveryStore,
} from "@/lib/labor-source-discovery/types";

export {
  assertDiscoveryUrlSafe,
  isDiscoveryContentTypeAllowed,
  DISCOVERY_REDIRECT_CAP,
} from "@/lib/labor-source-discovery/ssrf";

export {
  emptyLaborSourceDiscoveryStore,
  normalizeLaborSourceDiscoveryStore,
  loadLaborSourceDiscoveryStoreLocal,
  saveLaborSourceDiscoveryStoreLocal,
  clearLaborSourceDiscoveryStoreForTests,
  mergeLaborSourceDiscoveryStore,
  mergeLaborSourceDiscoveryDataKey,
  enqueueDiscoveredSource,
  markDiscoveredFetchValidated,
  enqueueLinksFromTrustedKeep5Html,
  listPromotedTrustedEvidenceRoutes,
  resolvePromotedTrustedEvidenceRoute,
  resolvePromotedTrustedEvidenceRouteByUrl,
  isPromotedTrustedEvidenceSourceId,
} from "@/lib/labor-source-discovery/store";

export {
  promoteDiscoveredSourceToTrustedEvidenceRoute,
  type PromoteDiscoveredSourceInput,
} from "@/lib/labor-source-discovery/promote";

/** Audit Hub — view model (feed + filtry + KPI + paginacja). */

import { buildAuditFeed, countAuditFeedBySource } from "@/lib/audit-hub/adapters";
import {
  collectAuditHubFilterOptions,
  filterAuditFeed,
  paginateAuditFeed,
  type AuditHubFilters,
} from "@/lib/audit-hub/filters";
import type { AuditFeedItem, AuditFeedSource, AuditHubInput } from "@/lib/audit-hub/types";

export interface AuditHubKpi {
  total: number;
  filteredTotal: number;
  bySource: Record<AuditFeedSource, number>;
}

export interface AuditHubViewModel {
  feed: AuditFeedItem[];
  filtered: AuditFeedItem[];
  paged: ReturnType<typeof paginateAuditFeed<AuditFeedItem>>;
  kpi: AuditHubKpi;
  filterOptions: ReturnType<typeof collectAuditHubFilterOptions>;
}

export function buildAuditHubViewModel(
  input: AuditHubInput,
  filters: AuditHubFilters,
  page: number,
): AuditHubViewModel {
  const feed = buildAuditFeed(input);
  const filtered = filterAuditFeed(feed, filters);
  const paged = paginateAuditFeed(filtered, page);
  return {
    feed,
    filtered,
    paged,
    kpi: {
      total: feed.length,
      filteredTotal: filtered.length,
      bySource: countAuditFeedBySource(feed),
    },
    filterOptions: collectAuditHubFilterOptions(feed),
  };
}

export function buildAuditHubViewModelFromFeed(
  feed: AuditFeedItem[],
  filters: AuditHubFilters,
  page: number,
): AuditHubViewModel {
  const filtered = filterAuditFeed(feed, filters);
  const paged = paginateAuditFeed(filtered, page);
  return {
    feed,
    filtered,
    paged,
    kpi: {
      total: feed.length,
      filteredTotal: filtered.length,
      bySource: countAuditFeedBySource(feed),
    },
    filterOptions: collectAuditHubFilterOptions(feed),
  };
}

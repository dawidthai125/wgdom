/** Audit Hub MVP-0 — filtry i paginacja unified feed. */

import type { AuditFeedItem, AuditFeedSource } from "@/lib/audit-hub/types";
import { AUDIT_FEED_SOURCES } from "@/lib/audit-hub/types";

export const AUDIT_HUB_PAGE_SIZE = 50;

export type AuditHubFilters = {
  source: AuditFeedSource | "all";
  actor: string | "all";
  search: string;
};

export const EMPTY_AUDIT_HUB_FILTERS: AuditHubFilters = {
  source: "all",
  actor: "all",
  search: "",
};

function actorKey(item: AuditFeedItem): string {
  return item.actorUserId ?? item.actor;
}

function matchesActor(item: AuditFeedItem, actorFilter: string): boolean {
  if (item.actorUserId === actorFilter) return true;
  if (item.actor === actorFilter) return true;
  return actorKey(item) === actorFilter;
}

export function filterAuditFeed(
  items: AuditFeedItem[],
  filters: AuditHubFilters,
): AuditFeedItem[] {
  const q = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.source !== "all" && item.source !== filters.source) return false;
    if (filters.actor !== "all" && !matchesActor(item, filters.actor)) return false;
    if (!q) return true;
    const hay = [
      item.summary,
      item.detail ?? "",
      item.actionLabel,
      item.actor,
      item.jobLabel ?? "",
      item.noteId ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function paginateAuditFeed<T>(
  items: T[],
  page: number,
  pageSize: number = AUDIT_HUB_PAGE_SIZE,
): { items: T[]; page: number; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}

export function collectAuditHubFilterOptions(items: AuditFeedItem[]): {
  actors: { key: string; label: string }[];
  sources: AuditFeedSource[];
} {
  const actorsByKey = new Map<string, string>();
  for (const item of items) {
    const key = actorKey(item);
    actorsByKey.set(key, item.actor);
  }
  const actors = [...actorsByKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pl"));
  return { actors, sources: [...AUDIT_FEED_SOURCES] };
}

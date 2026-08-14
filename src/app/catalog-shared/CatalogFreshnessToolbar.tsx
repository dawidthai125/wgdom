/**
 * Shared freshness chips + search. Resets page via onQueryChange.
 */

import { Search } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

export type CatalogFreshnessFilterOption<Id extends string = string> = {
  id: Id;
  label: string;
};

type CatalogFreshnessToolbarProps<Id extends string> = {
  filters: readonly CatalogFreshnessFilterOption<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
  search: string;
  onSearch: (raw: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
};

export function CatalogFreshnessToolbar<Id extends string>({
  filters,
  selected,
  onSelect,
  search,
  onSearch,
  searchPlaceholder,
  searchAriaLabel,
}: CatalogFreshnessToolbarProps<Id>) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end flex-wrap">
      <div className="flex flex-wrap gap-1.5 order-2 sm:order-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            aria-pressed={selected === f.id}
            aria-label={`Filtr: ${f.label}`}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border min-h-[40px]",
              selected === f.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary/30 text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="flex-1 min-w-[12rem] space-y-1 order-1 sm:order-2">
        <span className="text-[11px] text-muted-foreground">Wyszukiwarka</span>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(
              "w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm",
              WG_TOUCH_MIN,
            )}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
          />
        </div>
      </label>
    </div>
  );
}

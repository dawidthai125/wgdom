import { Search, MapPin, X } from "lucide-react";
import type { DirectoryEmployee, Job } from "@/app/app-domain";
import type { View } from "@/app/admin/admin-nav";

export type GlobalSearchResults = {
  employees: DirectoryEmployee[];
  jobs: Job[];
};

export type GlobalSearchPanelProps = {
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  searchResults: GlobalSearchResults;
  onNavigate: (view: View) => void;
  onClose: () => void;
};

export function GlobalSearchPanel({
  globalSearch,
  onGlobalSearchChange,
  searchResults,
  onNavigate,
  onClose,
}: GlobalSearchPanelProps) {
  const close = () => {
    onClose();
    onGlobalSearchChange("");
  };

  return (
    <div className="border-b border-border bg-card px-4 py-3 space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          placeholder="Szukaj pracownika, adresu, klienta..."
          value={globalSearch}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="w-full bg-secondary rounded-lg pl-8 pr-10 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
        />
        <button
          onClick={close}
          className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground touch-manipulation"
        >
          <X size={14} />
        </button>
      </div>
      {globalSearch.trim() && (
        <div className="bg-background rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
          {searchResults.employees.length === 0 && searchResults.jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Brak wyników</p>
          ) : (
            <>
              {searchResults.employees.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border bg-card">
                    Pracownicy
                  </p>
                  {searchResults.employees.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        onNavigate("directory");
                        close();
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors border-b border-border/50"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {e.name ? e.name[0].toUpperCase() : "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.position || "—"} · {e.phone || "—"}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {searchResults.jobs.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border bg-card">
                    Roboty
                  </p>
                  {searchResults.jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => {
                        onNavigate("jobs");
                        close();
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors border-b border-border/50"
                    >
                      <MapPin size={14} className="text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {j.address || "Bez adresu"}
                          {j.flatNumber && ` m.${j.flatNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {j.client || "—"} · {j.status === "completed" ? "Zdane" : "W trakcie"}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

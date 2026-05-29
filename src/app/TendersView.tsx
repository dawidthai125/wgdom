import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw, ExternalLink, Search, Scale, MapPin, Calendar, Building2,
  Filter, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  TENDER_STATUS_LABELS,
  fetchBzpTendersFromServer,
  loadTendersPipeline,
  saveTendersPipeline,
  mergeTenderPipeline,
  mapBzpToPipelineItem,
} from "@/lib/tenders-bzp";

type LocalFilter = "all" | "wroclaw" | "high";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function TendersView() {
  const [items, setItems] = useState<TenderPipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<LocalFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TenderPipelineStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTendersPipeline()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: TenderPipelineItem[]) => {
    setItems(next);
    try {
      await saveTendersPipeline(next);
    } catch {
      toast.error("Nie udało się zapisać pipeline do chmury");
    }
  }, []);

  const refreshFromBzp = useCallback(async () => {
    setSyncing(true);
    setError("");
    try {
      const raw = await fetchBzpTendersFromServer({ days: 30, pages: 5, province: "PL02" });
      const mapped = raw.map((n) => {
        const prev = items.find((i) => i.id === String(n.objectId || n.moIdentifier || n.bzpNumber));
        return mapBzpToPipelineItem(n, prev);
      });
      const merged = mergeTenderPipeline(items, mapped);
      await persist(merged);
      toast.success(`Pobrano z BZP — ${mapped.length} pasujących ogłoszeń (dolnośląskie)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd pobierania przetargów";
      setError(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }, [items, persist]);

  const updateItem = useCallback((id: string, patch: Partial<TenderPipelineItem>) => {
    const next = items.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
    );
    void persist(next);
  }, [items, persist]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (localFilter === "wroclaw" && !i.isWroclaw) return false;
      if (localFilter === "high" && i.relevanceScore < 15) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q)
        || i.organizationName.toLowerCase().includes(q)
        || i.organizationCity.toLowerCase().includes(q)
        || i.bzpNumber.toLowerCase().includes(q)
      );
    });
  }, [items, search, localFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    new: items.filter((i) => i.status === "new").length,
    wroclaw: items.filter((i) => i.isWroclaw).length,
    interested: items.filter((i) => i.status === "interested" || i.status === "preparing").length,
  }), [items]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Ładowanie pipeline przetargów…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-card shrink-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-primary" />
              <h1 className="text-lg font-semibold">Przetargi BZP</h1>
              <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">Super Admin · test</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Ogłoszenia z BZP — woj. dolnośląskie (PL02), roboty budowlane, filtr remont / modernizacja / wykończenia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshFromBzp()}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Pobieranie…" : "Odśwież z BZP"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-secondary">{stats.total} w pipeline</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">{stats.new} nowych</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{stats.wroclaw} Wrocław</span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">{stats.interested} w analizie</span>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj tytułu, zamawiającego, miasta, numeru BZP…"
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value as LocalFilter)}
              className="bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
            >
              <option value="all">Wszystkie (DŚ)</option>
              <option value="wroclaw">Tylko Wrocław</option>
              <option value="high">Wysoka trafność</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenderPipelineStatus | "all")}
              className="bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
            >
              <option value="all">Wszystkie statusy</option>
              {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Filter size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Brak przetargów — kliknij „Odśwież z BZP”</p>
          </div>
        ) : filtered.map((item) => {
          const days = daysUntil(item.submittingOffersDate);
          const urgent = days !== null && days >= 0 && days <= 7;
          const open = expandedId === item.id;
          return (
            <article
              key={item.id}
              className={`rounded-xl border bg-card overflow-hidden ${item.isWroclaw ? "border-primary/30" : "border-border"}`}
            >
              <button
                type="button"
                className="w-full text-left px-4 py-3.5 hover:bg-secondary/40 transition-colors"
                onClick={() => setExpandedId(open ? null : item.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isWroclaw && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">Wrocław</span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">{item.bzpNumber}</span>
                      {item.relevanceScore >= 20 && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">Trafność {item.relevanceScore}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug">{item.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <Building2 size={12} />
                      {item.organizationName}
                      <span>·</span>
                      <MapPin size={12} />
                      {item.organizationCity || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      item.status === "new" ? "bg-blue-500/15 text-blue-600" :
                      item.status === "interested" || item.status === "preparing" ? "bg-violet-500/15 text-violet-600" :
                      item.status === "won" ? "bg-emerald-500/15 text-emerald-600" :
                      item.status === "ignored" || item.status === "lost" ? "bg-muted text-muted-foreground" :
                      "bg-secondary text-foreground"
                    }`}>
                      {TENDER_STATUS_LABELS[item.status]}
                    </span>
                    {item.submittingOffersDate && (
                      <span className={`text-[10px] flex items-center gap-1 ${urgent ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                        <Calendar size={11} />
                        Oferty: {fmtDate(item.submittingOffersDate)}
                        {days !== null && days >= 0 && ` (${days} d.)`}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-0 border-t border-border space-y-3">
                  <p className="text-xs text-muted-foreground pt-3">
                    CPV: {item.cpvCode || "—"}
                    {item.matchedKeywords.length > 0 && (
                      <> · Słowa: {item.matchedKeywords.join(", ")}</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Publikacja: {fmtDate(item.publicationDate)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      Status
                      <select
                        value={item.status}
                        onChange={(e) => updateItem(item.id, { status: e.target.value as TenderPipelineStatus })}
                        className="bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                          <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </label>
                    <a
                      href={item.ezamowieniaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                      e-Zamówienia
                    </a>
                  </div>

                  <textarea
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                    placeholder="Notatki wewnętrzne (kosztorys ATH, kontakt, ryzyko…)"
                    rows={2}
                    className="w-full bg-secondary rounded-xl px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none resize-y min-h-[60px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

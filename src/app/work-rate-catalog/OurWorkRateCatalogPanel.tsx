/**
 * WORK-CATALOG-REBUILD-01 P1 — Firma → Nasz Katalog Robót.
 * OUR RATE + commercialPricing.marginPct (REUSE material engine) · ZERO HTTP on open ·
 * companyPricePln never as rate / margin.
 */

import { useMemo, useState } from "react";
import { Hammer, History, Pencil, RefreshCw, Search, X } from "lucide-react";
import { useWorkCatalog } from "@/app/hooks/useWorkCatalog";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import {
  OUR_WORK_RATE_CATALOG_FRESHNESS_FILTERS,
  buildOurWorkRateCatalogRows,
  formatOurWorkRateObservedAtPl,
  formatOurWorkRatePln,
  listLaborWorkIdsForCommercialMarginFloor,
  parseOwnerCommercialMarginPctInput,
  summarizeOurWorkRateCatalogRows,
  workRateSourceTypeLabelPl,
  type OurWorkRateCatalogFreshnessFilter,
  type OurWorkRateCatalogRow,
} from "@/lib/work-catalog/our-work-rate-catalog";
import {
  WORK_RATE_REGION_SCOPE_LABELS_PL,
  type WorkRateRegionScope,
} from "@/lib/work-catalog/work-rate-types";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import { WORK_RATE_AUTHORIZED_SOURCES } from "@/lib/work-catalog/work-rate-legal";
import { WgButton, WgField } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

function freshnessToneClass(freshness: OurWorkRateCatalogRow["freshness"]): string {
  switch (freshness) {
    case "CURRENT":
      return "text-emerald-700 dark:text-emerald-400";
    case "STALE":
      return "text-orange-700 dark:text-orange-400";
    case "MISSING":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function changeToneClass(label: string, status: "KNOWN" | "UNKNOWN"): string {
  if (status === "UNKNOWN") return "text-muted-foreground";
  if (label.startsWith("+")) return "text-emerald-700 dark:text-emerald-400";
  if (label.startsWith("-")) return "text-destructive";
  return "text-muted-foreground";
}

export function OurWorkRateCatalogPanel() {
  const { session } = useAdminAccess();
  const isSuperAdmin = session ? adminIsSuperAdmin(session.role) : false;
  const {
    store,
    reload,
    updateOurWorkRate,
    updateCommercialMargin,
    applyGlobalCommercialMarginFloor,
    researchOurWorkRate,
    acceptOurWorkRateResearch,
  } = useWorkCatalog();
  const [search, setSearch] = useState("");
  const [freshnessFilter, setFreshnessFilter] =
    useState<OurWorkRateCatalogFreshnessFilter>("ALL");
  const [editing, setEditing] = useState<OurWorkRateCatalogRow | null>(null);
  const [draftRate, setDraftRate] = useState("");
  const [draftRegion, setDraftRegion] = useState<WorkRateRegionScope>("WROCLAW");
  const [historyRow, setHistoryRow] = useState<OurWorkRateCatalogRow | null>(null);
  const [pendingAccept, setPendingAccept] = useState<{
    row: OurWorkRateCatalogRow;
    candidate: WorkRateResearchCandidate;
  } | null>(null);
  const [marginDraft, setMarginDraft] = useState<Record<string, string>>({});
  const [globalLaborMargin, setGlobalLaborMargin] = useState("");
  const [errorPl, setErrorPl] = useState<string | null>(null);
  const [infoPl, setInfoPl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ZERO HTTP — tylko lokalny store (reload bez sieci).
  const allRows = useMemo(
    () =>
      buildOurWorkRateCatalogRows({
        store,
        search: "",
        freshnessFilter: "ALL",
        activeOnly: true,
      }),
    [store],
  );

  const summary = useMemo(() => summarizeOurWorkRateCatalogRows(allRows), [allRows]);

  const rows = useMemo(
    () =>
      buildOurWorkRateCatalogRows({
        store,
        search,
        freshnessFilter,
        activeOnly: true,
      }),
    [store, search, freshnessFilter],
  );

  function openEdit(row: OurWorkRateCatalogRow): void {
    setErrorPl(null);
    setEditing(row);
    setDraftRate(
      row.ourRatePln != null && row.ourRatePln > 0
        ? String(row.ourRatePln).replace(".", ",")
        : "",
    );
    setDraftRegion(row.regionScope ?? "WROCLAW");
  }

  /** REUSE material commercial margin validation + updateCommercialMargin — no seed/default. */
  async function onSaveMargin(row: OurWorkRateCatalogRow): Promise<void> {
    if (busyId) return;
    const raw = marginDraft[row.workId] ?? (row.marginUnset ? "" : String(row.marginPct ?? ""));
    const n = parseOwnerCommercialMarginPctInput(raw);
    if (n == null) {
      setErrorPl("Nieprawidłowa marża.");
      return;
    }
    setBusyId(row.workId);
    setErrorPl(null);
    setInfoPl(null);
    try {
      const res = await updateCommercialMargin(row.workId, n);
      if (!res.ok) {
        setErrorPl(res.message);
        return;
      }
      setMarginDraft((d) => {
        const next = { ...d };
        delete next[row.workId];
        return next;
      });
      setInfoPl(`Zapisano marżę WGDOM ${n}% dla: ${row.namePl}.`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  /** REUSE applyGlobalCommercialMarginFloor — labor IDs only · MAX · no seed. */
  async function onApplyGlobalLaborMargin(): Promise<void> {
    if (busyId) return;
    const n = parseOwnerCommercialMarginPctInput(globalLaborMargin);
    if (n == null) {
      setErrorPl("Podaj poprawną minimalną marżę %.");
      return;
    }
    const ids = listLaborWorkIdsForCommercialMarginFloor(store);
    setBusyId("__global_labor_margin__");
    setErrorPl(null);
    setInfoPl(null);
    try {
      const res = await applyGlobalCommercialMarginFloor(ids, n);
      if (!res.ok) {
        setErrorPl(res.message);
        return;
      }
      setInfoPl(`Zastosowano minimalną marżę ${n}% dla ${ids.length} robót (MAX z istniejącą).`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  function MarginControl({ row }: { row: OurWorkRateCatalogRow }) {
    if (!isSuperAdmin) {
      return row.marginUnset ? (
        <span className="text-muted-foreground" data-work-rate-margin-unset>
          Brak marży
        </span>
      ) : (
        <span data-work-rate-margin-value={`${row.marginPct}`}>
          {row.marginPct}%
        </span>
      );
    }
    return (
      <div
        className="flex flex-wrap items-center gap-1"
        data-work-rate-margin-editor
        data-work-id={row.workId}
      >
        <input
          className="w-14 rounded border border-border bg-background px-1 py-1 text-xs min-h-[36px]"
          value={
            marginDraft[row.workId] ?? (row.marginUnset ? "" : String(row.marginPct))
          }
          placeholder="—"
          onChange={(e) =>
            setMarginDraft((d) => ({
              ...d,
              [row.workId]: e.target.value,
            }))
          }
          inputMode="decimal"
          aria-label={`Marża WGDOM ${row.namePl}`}
          data-work-rate-margin-input
        />
        <span className="text-muted-foreground">%</span>
        <button
          type="button"
          className="text-[10px] text-primary underline min-h-[36px] px-1"
          onClick={() => void onSaveMargin(row)}
          disabled={busyId === row.workId}
          aria-label={`Zapisz marżę WGDOM: ${row.namePl}`}
          data-work-rate-margin-save
        >
          Zapisz
        </button>
      </div>
    );
  }

  async function onSaveEdit(): Promise<void> {
    if (!editing || busyId) return;
    const normalized = draftRate.trim().replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value) || !(value > 0)) {
      setErrorPl("Podaj stawkę większą od zera (np. 55,00).");
      return;
    }
    setBusyId(editing.workId);
    setErrorPl(null);
    try {
      const res = await updateOurWorkRate({
        workId: editing.workId,
        unit: editing.unit,
        ourRatePln: Math.round(value * 100) / 100,
        regionScope: draftRegion,
      });
      if (!res.ok) {
        setErrorPl(res.message);
        return;
      }
      setEditing(null);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function onResearchMarket(row: OurWorkRateCatalogRow): Promise<void> {
    if (busyId) return;
    setBusyId(row.workId);
    setErrorPl(null);
    setInfoPl(null);
    try {
      const res = await researchOurWorkRate({
        workId: row.workId,
        unit: row.unit,
        namePl: row.namePl,
        forceRefresh: true,
        bypassCooldown: true,
      });
      if (res.status === "BLOCKED") {
        setErrorPl("Research zablokowany (Legal Gate).");
        return;
      }
      if (res.status === "REUSE") {
        setInfoPl(res.messagePl);
        return;
      }
      if (res.status === "COOLDOWN") {
        setInfoPl(res.messagePl);
        return;
      }
      if (res.status === "GAP") {
        setErrorPl(res.messagePl);
        setPendingAccept(null);
        return;
      }
      if (res.status === "CANDIDATE") {
        setPendingAccept({ row, candidate: res.candidate });
        setInfoPl(
          `Propozycja rynkowa (mediana z ${res.candidate.sampleSize} obserwacji): ${formatOurWorkRatePln(res.candidate.suggestedRatePln)}. Potwierdź Accept.`,
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onAcceptResearch(): Promise<void> {
    if (!pendingAccept || busyId) return;
    setBusyId(pendingAccept.row.workId);
    setErrorPl(null);
    try {
      const res = await acceptOurWorkRateResearch(pendingAccept.candidate);
      if (!res.ok) {
        setErrorPl(res.message);
        return;
      }
      setPendingAccept(null);
      setInfoPl("Zapisano OUR RATE po Owner Accept.");
      reload();
    } finally {
      setBusyId(null);
    }
  }

  function sourceNamePl(sourceId: string): string {
    return WORK_RATE_AUTHORIZED_SOURCES.find((s) => s.id === sourceId)?.namePl ?? sourceId;
  }

  function RowActions({ row }: { row: OurWorkRateCatalogRow }) {
    return (
      <div className="flex flex-wrap gap-1">
        <WgButton
          type="button"
          variant="secondary"
          className="!min-h-[36px] !px-2 !text-[11px]"
          onClick={() => openEdit(row)}
        >
          <Pencil size={12} aria-hidden />
          Edytuj stawkę
        </WgButton>
        <WgButton
          type="button"
          variant="secondary"
          className="!min-h-[36px] !px-2 !text-[11px]"
          onClick={() => void onResearchMarket(row)}
          disabled={busyId === row.workId}
          aria-label={`Aktualizuj stawkę rynkową: ${row.namePl}`}
          data-work-rate-research-one
        >
          <RefreshCw size={12} aria-hidden />
          Aktualizuj stawkę rynkową
        </WgButton>
        <WgButton
          type="button"
          variant="ghost"
          className="!min-h-[36px] !px-2 !text-[11px]"
          onClick={() => setHistoryRow(row)}
          disabled={row.history.length === 0}
        >
          <History size={12} aria-hidden />
          Historia
        </WgButton>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-our-work-rate-catalog>
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Hammer size={16} className="text-primary mt-0.5 shrink-0" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold">Nasz Katalog Robót</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Aktualne stawki robocizny (OUR RATE) dla robót z Biblioteki. Status: AKTUALNA /
              PRZETERMINOWANA / BRAK STAWKI. Marża WGDOM (%) — ta sama warstwa handlowa co w
              katalogu materiałów; wymagana przed Candidate z research. Research rynkowy: jedna
              robota na raz (po potwierdzeniu Ownera). Nie miesza się z cenami materiałów ani
              starą ceną firmy.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]"
          data-work-rate-catalog-summary
        >
          <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
            <div className="text-muted-foreground">Wszystkie roboty</div>
            <div className="text-sm font-semibold tabular-nums">{summary.total}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
            <div className="text-muted-foreground">Aktualne</div>
            <div className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {summary.current}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
            <div className="text-muted-foreground">Przeterminowane</div>
            <div className="text-sm font-semibold tabular-nums text-orange-700 dark:text-orange-400">
              {summary.stale}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
            <div className="text-muted-foreground">Brak stawki</div>
            <div className="text-sm font-semibold tabular-nums text-destructive">
              {summary.missing}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end flex-wrap">
          <div className="flex flex-wrap gap-1.5 order-2 sm:order-1">
            {OUR_WORK_RATE_CATALOG_FRESHNESS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFreshnessFilter(f.id)}
                aria-pressed={freshnessFilter === f.id}
                aria-label={`Filtr: ${f.label}`}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border min-h-[40px]",
                  freshnessFilter === f.id
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Wpisz nazwę roboty…"
                aria-label="Wyszukaj robotę"
              />
            </div>
          </label>
        </div>

        {isSuperAdmin && (
          <div
            className="flex flex-col sm:flex-row gap-2 sm:items-end border-t border-border/60 pt-3"
            data-work-rate-global-margin
          >
            <WgField
              label="Minimalna marża dla wszystkich robót (%)"
              value={globalLaborMargin}
              onChange={(e) => setGlobalLaborMargin(e.target.value)}
              inputMode="decimal"
              className="sm:max-w-[18rem]"
            />
            <WgButton
              type="button"
              variant="secondary"
              onClick={() => void onApplyGlobalLaborMargin()}
              disabled={busyId === "__global_labor_margin__"}
              data-work-rate-global-margin-apply
            >
              Zastosuj
            </WgButton>
          </div>
        )}

        {errorPl && (
          <p className="text-xs text-destructive" role="alert">
            {errorPl}
          </p>
        )}
        {infoPl && !errorPl && (
          <p className="text-xs text-muted-foreground" role="status">
            {infoPl}
          </p>
        )}
        {pendingAccept && (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2"
            data-work-rate-pending-accept
          >
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Potwierdź stawkę rynkową — {pendingAccept.row.namePl}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Jednostka: {pendingAccept.row.unitLabelPl} · Region:{" "}
              {WORK_RATE_REGION_SCOPE_LABELS_PL[pendingAccept.candidate.regionScope]} · Mediana:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatOurWorkRatePln(pendingAccept.candidate.suggestedRatePln)}
              </span>
              {pendingAccept.candidate.previousOurRatePln != null && (
                <>
                  {" "}
                  · Poprzednia OUR RATE:{" "}
                  {formatOurWorkRatePln(pendingAccept.candidate.previousOurRatePln)}
                </>
              )}
            </p>
            <ul className="text-[11px] space-y-1">
              {pendingAccept.candidate.observations.map((o, i) => (
                <li key={`${o.sourceId}-${i}`}>
                  {sourceNamePl(o.sourceId)}: {formatOurWorkRatePln(o.ratePln)} ·{" "}
                  {WORK_RATE_REGION_SCOPE_LABELS_PL[o.regionScope]} · labor-only
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <WgButton
                type="button"
                onClick={() => void onAcceptResearch()}
                disabled={busyId === pendingAccept.row.workId}
              >
                Zapisz OUR RATE (Accept)
              </WgButton>
              <WgButton
                type="button"
                variant="secondary"
                onClick={() => setPendingAccept(null)}
              >
                Odrzuć
              </WgButton>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[820px]">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Robota</th>
                <th className="px-2 py-2 font-medium">Jednostka</th>
                <th className="px-2 py-2 font-medium">Nasza stawka</th>
                <th className="px-2 py-2 font-medium">Marża WGDOM</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Ostatnia aktualizacja</th>
                <th className="px-2 py-2 font-medium">Źródło</th>
                <th className="px-2 py-2 font-medium">Region</th>
                <th className="px-2 py-2 font-medium">Zmiana</th>
                <th className="px-2 py-2 font-medium">Akcja</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.identityKey}
                  className="border-t border-border/60 align-top hover:bg-secondary/20"
                  data-work-rate-row={row.workId}
                  data-freshness={row.freshness}
                  data-our-rate={row.ourRatePln ?? ""}
                  data-margin-unset={row.marginUnset ? "1" : "0"}
                  data-margin-pct={row.marginPct ?? ""}
                >
                  <td className="px-2 py-2 font-medium text-foreground">{row.namePl}</td>
                  <td className="px-2 py-2 tabular-nums">{row.unitLabelPl}</td>
                  <td className="px-2 py-2 tabular-nums font-semibold">
                    {formatOurWorkRatePln(row.ourRatePln)}
                  </td>
                  <td className="px-2 py-2">
                    <MarginControl row={row} />
                  </td>
                  <td className={cn("px-2 py-2 font-medium", freshnessToneClass(row.freshness))}>
                    {row.freshnessLabelPl}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">{row.observedAtLabelPl}</td>
                  <td className="px-2 py-2">{row.sourceLabelPl}</td>
                  <td className="px-2 py-2">{row.regionLabelPl}</td>
                  <td
                    className={cn(
                      "px-2 py-2",
                      changeToneClass(row.priceChange.labelPl, row.priceChange.status),
                    )}
                  >
                    {row.priceChange.labelPl}
                  </td>
                  <td className="px-2 py-2">
                    <RowActions row={row} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                    Brak robót spełniających kryteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards — bez poziomego scrolla */}
      <div className="md:hidden space-y-2" data-work-rate-catalog-mobile>
        {rows.map((row) => (
          <article
            key={row.identityKey}
            className="rounded-xl border border-border bg-card p-3 space-y-2"
            data-work-rate-row={row.workId}
            data-freshness={row.freshness}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-snug">{row.namePl}</h4>
              <span className={cn("text-[11px] font-medium shrink-0", freshnessToneClass(row.freshness))}>
                {row.freshnessLabelPl}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div>
                <span className="text-muted-foreground">Jednostka</span>
                <div className="font-medium">{row.unitLabelPl}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Nasza stawka</span>
                <div className="font-semibold tabular-nums text-sm">
                  {formatOurWorkRatePln(row.ourRatePln)}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Marża WGDOM (%)</span>
                <div className="pt-0.5">
                  <MarginControl row={row} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Data</span>
                <div>{row.observedAtLabelPl}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Źródło</span>
                <div>{row.sourceLabelPl}</div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Zmiana</span>
                <div className={changeToneClass(row.priceChange.labelPl, row.priceChange.status)}>
                  {row.priceChange.labelPl}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <RowActions row={row} />
            </div>
          </article>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            Brak robót spełniających kryteria.
          </p>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Edytuj stawkę"
          data-work-rate-edit-modal
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 space-y-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">Edytuj stawkę</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {editing.namePl} · {editing.unitLabelPl}
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-secondary/60"
                aria-label="Zamknij"
                onClick={() => setEditing(null)}
              >
                <X size={16} />
              </button>
            </div>
            <WgField
              label={`Nasza stawka (zł / ${editing.unitLabelPl})`}
              value={draftRate}
              onChange={(e) => setDraftRate(e.target.value)}
              inputMode="decimal"
              autoFocus
            />
            <label className="block space-y-1 text-[11px]">
              <span className="text-muted-foreground">Region obserwacji</span>
              <select
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3 text-sm",
                  WG_TOUCH_MIN,
                )}
                value={draftRegion}
                onChange={(e) => setDraftRegion(e.target.value as WorkRateRegionScope)}
              >
                {(Object.keys(WORK_RATE_REGION_SCOPE_LABELS_PL) as WorkRateRegionScope[]).map(
                  (code) => (
                    <option key={code} value={code}>
                      {WORK_RATE_REGION_SCOPE_LABELS_PL[code]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <p className="text-[11px] text-muted-foreground">
              Zapis trafia wyłącznie do Nasz Katalog Robót (OUR RATE). Stara cena firmy nie jest
              zmieniana.
            </p>
            <div className="flex flex-wrap gap-2">
              <WgButton
                type="button"
                onClick={() => void onSaveEdit()}
                disabled={busyId === editing.workId}
              >
                Zapisz stawkę
              </WgButton>
              <WgButton type="button" variant="secondary" onClick={() => setEditing(null)}>
                Anuluj
              </WgButton>
            </div>
          </div>
        </div>
      )}

      {historyRow && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Historia stawek"
          data-work-rate-history-modal
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4 space-y-3 shadow-lg max-h-[80vh] flex flex-col">
            <div className="flex items-start justify-between gap-2 shrink-0">
              <div>
                <h4 className="text-sm font-semibold">Historia</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {historyRow.namePl} · {historyRow.unitLabelPl} · max 24 wpisy
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-secondary/60"
                aria-label="Zamknij"
                onClick={() => setHistoryRow(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto min-h-0 space-y-1.5 text-xs">
              {[...historyRow.history].reverse().map((h, idx) => (
                <div
                  key={`${h.observedAt}-${idx}`}
                  className="rounded-lg border border-border/60 px-2.5 py-2 flex flex-wrap gap-x-3 gap-y-1"
                >
                  <span className="font-semibold tabular-nums">
                    {formatOurWorkRatePln(h.ratePln)}
                  </span>
                  <span>{workRateSourceTypeLabelPl(h.sourceType)}</span>
                  <span>{WORK_RATE_REGION_SCOPE_LABELS_PL[h.regionScope]}</span>
                  <span className="text-muted-foreground">
                    {formatOurWorkRateObservedAtPl(h.observedAt)}
                  </span>
                  {h.changePln != null && Number.isFinite(h.changePln) && (
                    <span
                      className={changeToneClass(
                        `${h.changePln > 0 ? "+" : ""}${h.changePln}`,
                        "KNOWN",
                      )}
                    >
                      {h.changePln > 0 ? "+" : ""}
                      {h.changePln.toLocaleString("pl-PL", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      zł
                    </span>
                  )}
                </div>
              ))}
              {historyRow.history.length === 0 && (
                <p className="text-muted-foreground text-center py-6">Brak historii stawek.</p>
              )}
            </div>
            <WgButton type="button" variant="secondary" onClick={() => setHistoryRow(null)}>
              Zamknij
            </WgButton>
          </div>
        </div>
      )}
    </div>
  );
}

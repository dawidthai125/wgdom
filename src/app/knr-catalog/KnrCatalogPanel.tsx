/**
 * KL-7-P1 — Firma → Katalog KNR details / history / offline proposed update.
 * REUSE catalog-shared chrome · ZERO PLN / OUR RATE / HTTP / auto-VERIFIED.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookMarked, History, RefreshCw } from "lucide-react";
import {
  CatalogFreshnessToolbar,
  CatalogPager,
  catalogFreshnessDot,
  catalogFreshnessToneClass,
  formatCatalogDateTimePl,
} from "@/app/catalog-shared";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";
import {
  KNR_CATALOG_UI_FRESHNESS_FILTERS,
  KNR_CATALOG_UI_PAGE_SIZE,
  KNR_CATALOG_UI_VERIFICATION_FILTERS,
  buildKnrCatalogUiRows,
  loadKnrCatalogEntriesForUi,
  paginateKnrCatalogUiRows,
  type KnrCatalogUiFreshnessFilter,
  type KnrCatalogUiRow,
  type KnrCatalogUiVerificationFilter,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui";
import {
  KNR_DISCOVERY_UI_FRESHNESS_FILTERS,
  KNR_DISCOVERY_UI_STATUS_FILTERS,
  buildKnrDiscoveryUiRows,
  loadKnrDiscoveryEntriesForUi,
  type KnrDiscoveryUiFreshnessFilter,
  type KnrDiscoveryUiRow,
  type KnrDiscoveryUiStatusFilter,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-ui";
import type {
  KnrCatalogEntry,
  KnrNormLine,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-entry-types";
import type { KnrDiscoveryEvidenceRecord } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import { knrDiscoveryStatusLabelPl } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import {
  knrHistoryKindLabelPl,
  type KnrCatalogHistoryEntry,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-history";
import {
  applyKnrCatalogProposedUpdateOffline,
  buildOfflineProposedFixtureFromCurrent,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-proposed-update";
import {
  compareKnrCatalogUpdate,
  type KnrCatalogCompareResult,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-update-compare";

function SourcesPanel({ record }: { record: KnrDiscoveryEvidenceRecord }) {
  if (!record.sources.length) {
    return (
      <p className="text-[11px] text-muted-foreground" data-knr-discovery-sources-empty>
        Brak źródeł discovery (offline memory).
      </p>
    );
  }
  return (
    <div className="space-y-2" data-knr-discovery-sources>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
        Źródła
      </div>
      <ul className="space-y-2">
        {record.sources.map((s) => (
          <li
            key={`${s.sourceId}-${s.urlHash}`}
            className="rounded-lg border border-border/60 bg-secondary/20 p-2 text-[11px] space-y-0.5"
            data-knr-discovery-source={s.sourceId}
          >
            <div className="font-medium text-foreground">
              {s.priority} · {s.sourceId}
            </div>
            {s.title ? <div>{s.title}</div> : null}
            {s.fragment ? <div className="line-clamp-2">{s.fragment}</div> : null}
            <div className="break-all text-muted-foreground">urlHash: {s.urlHash}</div>
            <div className="break-all text-muted-foreground">
              contentHash: {s.contentHash}
            </div>
            <div>{formatCatalogDateTimePl(s.fetchedAt)}</div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Status discovery: {knrDiscoveryStatusLabelPl(record.discoveryStatus)} · nie jest
        VERIFIED · bez HTTP.
      </p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1" data-knr-detail-section={title}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
        {title}
      </div>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span>{" "}
      <span className="break-all">{value ?? "—"}</span>
    </div>
  );
}

function NormList({ title, lines }: { title: string; lines: readonly KnrNormLine[] }) {
  if (!lines.length) {
    return (
      <div>
        <span className="font-medium text-foreground">{title}:</span> (puste)
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-medium text-foreground">{title}</div>
      <ul className="space-y-1 pl-2 border-l border-border/60">
        {lines.map((l, i) => (
          <li key={`${l.code}-${i}`} className="space-y-0.5">
            <div>
              {l.code} · {l.quantity} {l.unit}
            </div>
            <div className="line-clamp-2">{l.description}</div>
            {l.sourceRef ? <div>sourceRef: {l.sourceRef}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KnrEntryDetails({ entry }: { entry: KnrCatalogEntry }) {
  const id = entry.identity ?? {};
  const sourceCount = entry.provenance.sourceIdentifier?.trim() ? 1 : 0;
  return (
    <div className="space-y-3" data-knr-catalog-details>
      <DetailSection title="IDENTYFIKACJA">
        <Field label="family" value={id.family} />
        <Field label="catalog" value={id.catalog} />
        <Field label="publisher" value={id.publisher} />
        <Field label="edition" value={id.edition} />
        <Field label="chapter" value={id.chapter} />
        <Field label="table" value={id.table} />
        <Field label="column" value={id.column} />
        <Field label="item" value={id.item} />
        <Field label="displayCode" value={entry.displayCode} />
        <Field label="originalSourceCode" value={entry.originalSourceCode} />
        <Field label="evidenceKeyV1" value={entry.evidenceKeyV1} />
        <Field label="identityKeyV2" value={entry.identityKeyV2} />
      </DetailSection>
      <DetailSection title="OPIS">
        <Field label="description" value={entry.description} />
        <Field label="unit" value={entry.unit} />
      </DetailSection>
      <DetailSection title="NORMY">
        <NormList title="R" lines={entry.norms.laborNorms} />
        <NormList title="M" lines={entry.norms.materialNorms} />
        <NormList title="S" lines={entry.norms.equipmentNorms} />
      </DetailSection>
      <DetailSection title="WERYFIKACJA">
        <Field label="verificationStatus" value={entry.verificationStatus} />
        <Field label="lifecycleState" value={entry.lifecycleState} />
        <Field label="validatedState" value={entry.validationState} />
        <Field label="verifiedAt" value={formatCatalogDateTimePl(entry.verifiedAt)} />
        <Field label="verifiedBy" value={entry.verifiedBy} />
      </DetailSection>
      <DetailSection title="PROVENANCE">
        <Field label="sourceType" value={entry.provenance.sourceType} />
        <Field label="sourceIdentifier" value={entry.provenance.sourceIdentifier} />
        <Field label="acquisitionMethod" value={entry.provenance.acquisitionMethod} />
        <Field
          label="rawEvidenceRef"
          value={entry.provenance.rawEvidenceRef?.refId ?? "—"}
        />
        <Field label="contentHash" value={entry.contentHash} />
        <Field label="parserVersion" value={entry.provenance.parserVersion} />
        <Field
          label="capturedAt"
          value={formatCatalogDateTimePl(entry.provenance.capturedAt)}
        />
        <Field
          label="retrievedAt"
          value={formatCatalogDateTimePl(entry.provenance.retrievedAt)}
        />
        <Field label="revision" value={entry.provenance.revision} />
      </DetailSection>
      <DetailSection title="OPS">
        <Field label="createdAt" value={formatCatalogDateTimePl(entry.createdAt)} />
        <Field label="updatedAt" value={formatCatalogDateTimePl(entry.updatedAt)} />
        <Field label="catalogRevision" value={entry.catalogRevision ?? "—"} />
        <Field
          label="lastResearchAt"
          value={formatCatalogDateTimePl(entry.lastResearchAt)}
        />
        <Field label="sourceCount" value={sourceCount} />
      </DetailSection>
    </div>
  );
}

function HistoryList({ entries }: { entries: readonly KnrCatalogHistoryEntry[] }) {
  if (!entries.length) {
    return (
      <p className="text-[11px] text-muted-foreground" data-knr-history-empty>
        Brak wpisów historii (append-only pojawi się po VERIFY / propozycji).
      </p>
    );
  }
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <ul className="min-w-[28rem] space-y-2 text-[11px]" data-knr-history-list>
        {[...entries].reverse().map((h, i) => (
          <li
            key={`${h.at}-${h.kind}-${h.contentHash}-${i}`}
            className="rounded-lg border border-border/60 bg-secondary/20 p-2 space-y-0.5"
            data-knr-history-item={h.kind}
          >
            <div className="font-medium text-foreground">
              v{h.version} · {knrHistoryKindLabelPl(h.kind)}
            </div>
            <div>{formatCatalogDateTimePl(h.at)}</div>
            <div>
              Actor: {h.actorDisplayName || h.actorId || "—"}
            </div>
            <div>
              Status: {h.verificationStatusBefore ?? "—"} →{" "}
              {h.verificationStatusAfter ?? "—"}
            </div>
            <div className="break-all">hash: {h.contentHash}</div>
            <div className="break-all">prev: {h.previousContentHash ?? "—"}</div>
            {h.diffFlags && Object.keys(h.diffFlags).length > 0 ? (
              <div>
                diff:{" "}
                {Object.entries(h.diffFlags)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ") || "—"}
              </div>
            ) : null}
            {h.sourceRefs?.evidenceRefId || h.sourceRefs?.sourceIdentifier ? (
              <div className="break-all">
                źródło: {h.sourceRefs.evidenceRefId || h.sourceRefs.sourceIdentifier}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareSummary({ result }: { result: KnrCatalogCompareResult }) {
  return (
    <div className="space-y-1 text-[11px]" data-knr-compare-status={result.status}>
      <div className="font-medium text-foreground">Status: {result.status}</div>
      <div className="break-all">current: {result.currentContentHash}</div>
      <div className="break-all">proposed: {result.proposedContentHash}</div>
      <ul className="list-disc pl-4 text-muted-foreground">
        {result.reasonsPl.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        Propozycja NIE tworzy VERIFIED — tylko istniejąca ścieżka KL-6 Owner VERIFY.
      </p>
    </div>
  );
}

export function KnrCatalogPanel() {
  const [search, setSearch] = useState("");
  const [freshnessFilter, setFreshnessFilter] =
    useState<KnrCatalogUiFreshnessFilter>("ALL");
  const [verificationFilter, setVerificationFilter] =
    useState<KnrCatalogUiVerificationFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyRow, setHistoryRow] = useState<KnrCatalogUiRow | null>(null);
  const [updateRow, setUpdateRow] = useState<KnrCatalogUiRow | null>(null);
  const [comparePreview, setComparePreview] = useState<KnrCatalogCompareResult | null>(
    null,
  );
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [discoveryStatusFilter, setDiscoveryStatusFilter] =
    useState<KnrDiscoveryUiStatusFilter>("ALL");
  const [discoveryFreshnessFilter, setDiscoveryFreshnessFilter] =
    useState<KnrDiscoveryUiFreshnessFilter>("ALL");
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [sourcesRowId, setSourcesRowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      import("@/lib/intelligent-estimator/knr-knowledge/knr-catalog-sync").then(
        ({ loadKnrCatalogStore }) => loadKnrCatalogStore(),
      ),
      import("@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-sync").then(
        ({ loadKnrDiscoveryEvidenceStore }) => loadKnrDiscoveryEvidenceStore(),
      ),
    ])
      .then(() => {
        if (!cancelled) {
          setCloudHydrated(true);
          setTick((n) => n + 1);
        }
      })
      .catch(() => {
        if (!cancelled) setCloudHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loaded = useMemo(() => {
    void tick;
    return loadKnrCatalogEntriesForUi({ useDemoWhenEmpty: true });
  }, [tick]);

  const discoveryLoaded = useMemo(() => {
    void tick;
    return loadKnrDiscoveryEntriesForUi({ useFixtureWhenEmpty: true });
  }, [tick]);

  const allRows = useMemo(
    () =>
      buildKnrCatalogUiRows({
        entries: loaded.entries,
        search: "",
        freshnessFilter: "ALL",
        verificationFilter: "ALL",
        isUxFixture: loaded.source === "ux1_demo",
      }),
    [loaded],
  );

  const discoveryRows = useMemo(
    () =>
      buildKnrDiscoveryUiRows({
        records: discoveryLoaded.records,
        search: discoverySearch,
        statusFilter: discoveryStatusFilter,
        freshnessFilter: discoveryFreshnessFilter,
        isOfflineFixture: discoveryLoaded.source === "p2a_fixture",
      }),
    [
      discoveryLoaded,
      discoverySearch,
      discoveryStatusFilter,
      discoveryFreshnessFilter,
    ],
  );

  const discoveryPageData = useMemo(
    () => paginateKnrCatalogUiRows(discoveryRows, discoveryPage, KNR_CATALOG_UI_PAGE_SIZE),
    [discoveryRows, discoveryPage],
  );

  const summary = useMemo(() => {
    let fresh = 0;
    let stale = 0;
    let verified = 0;
    for (const r of allRows) {
      if (r.opsFreshness === "FRESH") fresh += 1;
      else stale += 1;
      if (r.verificationStatus === "VERIFIED") verified += 1;
    }
    return { total: allRows.length, fresh, stale, verified };
  }, [allRows]);

  const rows = useMemo(
    () =>
      buildKnrCatalogUiRows({
        entries: loaded.entries,
        search,
        freshnessFilter,
        verificationFilter,
        isUxFixture: loaded.source === "ux1_demo",
      }),
    [loaded, search, freshnessFilter, verificationFilter],
  );

  const pageData = useMemo(
    () => paginateKnrCatalogUiRows(rows, page, KNR_CATALOG_UI_PAGE_SIZE),
    [rows, page],
  );

  function onQueryChange(
    next: Partial<{
      search: string;
      freshness: KnrCatalogUiFreshnessFilter;
      verification: KnrCatalogUiVerificationFilter;
    }>,
  ): void {
    if (next.search != null) setSearch(next.search);
    if (next.freshness != null) setFreshnessFilter(next.freshness);
    if (next.verification != null) setVerificationFilter(next.verification);
    setPage(1);
  }

  function onDiscoveryQueryChange(
    next: Partial<{
      search: string;
      status: KnrDiscoveryUiStatusFilter;
      freshness: KnrDiscoveryUiFreshnessFilter;
    }>,
  ): void {
    if (next.search != null) setDiscoverySearch(next.search);
    if (next.status != null) setDiscoveryStatusFilter(next.status);
    if (next.freshness != null) setDiscoveryFreshnessFilter(next.freshness);
    setDiscoveryPage(1);
  }

  function openUpdate(row: KnrCatalogUiRow): void {
    setUpdateRow(row);
    setUpdateMsg(null);
    const existingBag = row.entry.proposedUpdate;
    if (existingBag && typeof existingBag === "object" && "proposedEntry" in existingBag) {
      const bag = existingBag as {
        proposedEntry: KnrCatalogEntry;
        compareStatus?: string;
      };
      if (bag.proposedEntry) {
        setComparePreview(compareKnrCatalogUpdate(row.entry, bag.proposedEntry));
        return;
      }
    }
    const fixture = buildOfflineProposedFixtureFromCurrent(
      row.entry,
      new Date().toISOString(),
    );
    setComparePreview(compareKnrCatalogUpdate(row.entry, fixture));
  }

  function runOfflinePropose(row: KnrCatalogUiRow): void {
    if (row.isUxFixture) {
      setUpdateMsg("Fixture UX-1 jest tylko do podglądu — nie zapisuje propozycji.");
      return;
    }
    const nowIso = new Date().toISOString();
    const fixture = buildOfflineProposedFixtureFromCurrent(row.entry, nowIso);
    const result = applyKnrCatalogProposedUpdateOffline({
      identityKeyV2: row.identityKeyV2,
      proposed: fixture,
      nowIso,
      actorDisplayName: "Owner (offline)",
    });
    if (!result.ok) {
      setUpdateMsg(result.messagePl);
      return;
    }
    setComparePreview(
      compareKnrCatalogUpdate(row.entry, fixture),
    );
    setUpdateMsg(
      `Zapisano PROPOSED_UPDATE (${result.compareStatus}) — VERIFIED bez zmian.`,
    );
    setTick((n) => n + 1);
    setUpdateRow({
      ...row,
      entry: result.entry,
      updatedAt: result.entry.updatedAt,
    });
  }

  return (
    <div
      className="space-y-3"
      data-knr-catalog-panel
      data-knr-source={loaded.source}
      data-knr-cloud-hydrated={cloudHydrated ? "1" : "0"}
    >
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="flex items-start gap-2">
          <BookMarked size={16} className="text-primary mt-0.5 shrink-0" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold">Katalog KNR</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Normy KNR (R/M/S), tożsamość, historia i propozycja aktualizacji offline —
              osobno od Naszego Katalogu Robót i cen. Tylko VERIFIED + ACTIVE zasila Host
              (poza tym panelem). Bez PLN · bez discovery HTTP · Update nie nadpisuje VERIFIED.
            </p>
          </div>
        </div>

        {loaded.source === "ux1_demo" && (
          <p
            className="text-[11px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200"
            role="status"
            data-knr-ux1-demo-banner
          >
            Lokalny katalog pusty — pokazano fixture UX-1 (klucz Owner evidence, puste R/M/S,
            status STRUCTURAL). To nie jest VERIFIED i nie zasila wyceny.
          </p>
        )}

        <CatalogFreshnessToolbar
          filters={KNR_CATALOG_UI_FRESHNESS_FILTERS}
          selected={freshnessFilter}
          onSelect={(id) => onQueryChange({ freshness: id })}
          search={search}
          onSearch={(raw) => onQueryChange({ search: raw })}
          searchPlaceholder="Kod KNR, opis, family…"
          searchAriaLabel="Wyszukaj w katalogu KNR"
        />

        <div className="flex flex-wrap gap-1.5">
          {KNR_CATALOG_UI_VERIFICATION_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onQueryChange({ verification: f.id })}
              aria-pressed={verificationFilter === f.id}
              aria-label={`Filtr weryfikacji: ${f.label}`}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border min-h-[40px]",
                WG_TOUCH_MIN,
                verificationFilter === f.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {summary.total} · świeże {summary.fresh} · stale {summary.stale} · VERIFIED{" "}
            {summary.verified}
          </span>
          <WgButton
            type="button"
            variant="secondary"
            className={cn(WG_TOUCH_MIN, "!text-[11px]")}
            onClick={() => {
              void Promise.all([
                import("@/lib/intelligent-estimator/knr-knowledge/knr-catalog-sync").then(
                  ({ loadKnrCatalogStore }) => loadKnrCatalogStore(),
                ),
                import(
                  "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-sync"
                ).then(({ loadKnrDiscoveryEvidenceStore }) =>
                  loadKnrDiscoveryEvidenceStore(),
                ),
              ]).finally(() => setTick((n) => n + 1));
            }}
            aria-label="Odśwież katalog lokalny / cloud"
          >
            Odśwież lokalnie
          </WgButton>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[960px]">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Lp.</th>
                <th className="px-2 py-2 font-medium">Kod KNR</th>
                <th className="px-2 py-2 font-medium">Opis</th>
                <th className="px-2 py-2 font-medium">j.m.</th>
                <th className="px-2 py-2 font-medium">R/M/S</th>
                <th className="px-2 py-2 font-medium">Family</th>
                <th className="px-2 py-2 font-medium">Weryfikacja</th>
                <th className="px-2 py-2 font-medium">Freshness</th>
                <th className="px-2 py-2 font-medium">Źródło</th>
                <th className="px-2 py-2 font-medium">Aktualizacja</th>
                <th className="px-2 py-2 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-muted-foreground"
                    data-knr-catalog-empty
                  >
                    Brak rekordów KNR w lokalnym katalogu.
                  </td>
                </tr>
              )}
              {pageData.items.map((row, i) => {
                const absIndex = (pageData.page - 1) * pageData.pageSize + i + 1;
                const open = expandedId === row.rowId;
                return (
                  <tr
                    key={row.rowId}
                    className="border-t border-border/60 align-top hover:bg-secondary/20"
                    data-knr-catalog-row={row.evidenceKeyV1}
                    data-verification={row.verificationStatus}
                    data-ops-freshness={row.opsFreshness}
                    data-ux-fixture={row.isUxFixture ? "1" : "0"}
                  >
                    <td className="px-2 py-2 text-muted-foreground">{absIndex}</td>
                    <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">
                      {row.displayCode}
                    </td>
                    <td className="px-2 py-2 max-w-[14rem]">
                      <span className="line-clamp-2">{row.description}</span>
                    </td>
                    <td className="px-2 py-2 tabular-nums">{row.unit}</td>
                    <td className="px-2 py-2 tabular-nums whitespace-nowrap">
                      {row.normsSummaryPl}
                    </td>
                    <td className="px-2 py-2">{row.family}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{row.verificationLabelPl}</td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium whitespace-nowrap",
                          catalogFreshnessToneClass(row.freshnessChrome),
                        )}
                      >
                        <span aria-hidden>{catalogFreshnessDot(row.freshnessChrome)}</span>
                        {row.freshnessLabelPl}
                      </span>
                    </td>
                    <td className="px-2 py-2 max-w-[10rem]">
                      <span className="line-clamp-2">{row.sourceLabelPl}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatCatalogDateTimePl(row.updatedAt)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1 min-w-[7.5rem]">
                        <WgButton
                          type="button"
                          variant="secondary"
                          className={cn(WG_TOUCH_MIN, "!px-2 !text-[11px]")}
                          onClick={() => setExpandedId(open ? null : row.rowId)}
                          aria-expanded={open}
                          aria-label={`Szczegóły: ${row.displayCode}`}
                        >
                          {open ? "Ukryj" : "Szczegóły"}
                        </WgButton>
                        <WgButton
                          type="button"
                          variant="ghost"
                          className={cn(WG_TOUCH_MIN, "!px-2 !text-[11px]")}
                          onClick={() => setHistoryRow(row)}
                          aria-label={`Historia: ${row.displayCode}`}
                        >
                          <History size={12} aria-hidden />
                          Historia
                        </WgButton>
                        <WgButton
                          type="button"
                          variant="ghost"
                          className={cn(WG_TOUCH_MIN, "!px-2 !text-[11px]")}
                          onClick={() => openUpdate(row)}
                          aria-label={`Aktualizuj: ${row.displayCode}`}
                          data-knr-catalog-update-btn
                        >
                          <RefreshCw size={12} aria-hidden />
                          Aktualizuj
                        </WgButton>
                      </div>
                      {open && (
                        <div className="mt-2 rounded-lg border border-border/70 bg-secondary/20 p-2 max-w-[22rem]">
                          <KnrEntryDetails entry={row.entry} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <CatalogPager
          page={pageData.page}
          totalPages={pageData.totalPages}
          total={pageData.total}
          pageSize={pageData.pageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      <div
        className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3"
        data-knr-discovery-evidence-panel
        data-knr-discovery-source={discoveryLoaded.source}
      >
        <div>
          <h3 className="text-sm font-semibold">Discovery Evidence (P2A)</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Pamięć discovery · osobny store od katalogu authority · HTTP OFF · nie jest
            VERIFIED · nie zasila wyceny.
          </p>
        </div>

        {discoveryLoaded.source === "p2a_fixture" && (
          <p
            className="text-[11px] rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2"
            role="status"
            data-knr-discovery-fixture-banner
          >
            Lokalny discovery evidence pusty — pokazano offline fixture P2A (CORROBORATED +
            DISCOVERED). Bez fetch · bez PLN.
          </p>
        )}

        <CatalogFreshnessToolbar
          filters={KNR_DISCOVERY_UI_FRESHNESS_FILTERS}
          selected={discoveryFreshnessFilter}
          onSelect={(id) => onDiscoveryQueryChange({ freshness: id })}
          search={discoverySearch}
          onSearch={(raw) => onDiscoveryQueryChange({ search: raw })}
          searchPlaceholder="Evidence key, family, opis…"
          searchAriaLabel="Wyszukaj w discovery evidence"
        />

        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {KNR_DISCOVERY_UI_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onDiscoveryQueryChange({ status: f.id })}
              aria-pressed={discoveryStatusFilter === f.id}
              aria-label={`Filtr evidence: ${f.label}`}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border min-h-[40px] shrink-0",
                WG_TOUCH_MIN,
                discoveryStatusFilter === f.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Kod</th>
                <th className="px-2 py-2 font-medium">Family</th>
                <th className="px-2 py-2 font-medium">Discovery</th>
                <th className="px-2 py-2 font-medium">Źródła</th>
                <th className="px-2 py-2 font-medium">Freshness</th>
                <th className="px-2 py-2 font-medium">R/M/S</th>
                <th className="px-2 py-2 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {discoveryPageData.items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-muted-foreground"
                    data-knr-discovery-empty
                  >
                    Brak rekordów discovery evidence.
                  </td>
                </tr>
              )}
              {discoveryPageData.items.map((row: KnrDiscoveryUiRow) => {
                const open = sourcesRowId === row.rowId;
                return (
                  <tr
                    key={row.rowId}
                    className="border-t border-border/60 align-top hover:bg-secondary/20"
                    data-knr-discovery-row={row.evidenceKeyV1}
                    data-discovery-status={row.discoveryStatus}
                    data-ops-freshness={row.freshness}
                  >
                    <td className="px-2 py-2 font-medium whitespace-nowrap">
                      {row.displayCode}
                    </td>
                    <td className="px-2 py-2">{row.family}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{row.discoveryLabelPl}</td>
                    <td className="px-2 py-2">
                      {row.sourceCount} · {row.sourcesSummaryPl}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium whitespace-nowrap",
                          catalogFreshnessToneClass(row.freshnessChrome),
                        )}
                      >
                        <span aria-hidden>{catalogFreshnessDot(row.freshnessChrome)}</span>
                        {row.freshnessLabelPl}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{row.normsSummaryPl}</td>
                    <td className="px-2 py-2">
                      <WgButton
                        type="button"
                        variant="secondary"
                        className={cn(WG_TOUCH_MIN, "!px-2 !text-[11px]")}
                        onClick={() => setSourcesRowId(open ? null : row.rowId)}
                        aria-expanded={open}
                        aria-label={`Źródła: ${row.displayCode}`}
                        data-knr-discovery-sources-btn
                      >
                        {open ? "Ukryj źródła" : "Źródła"}
                      </WgButton>
                      {open && (
                        <div className="mt-2 rounded-lg border border-border/70 bg-secondary/20 p-2 max-w-[22rem]">
                          <SourcesPanel record={row.record} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <CatalogPager
          page={discoveryPageData.page}
          totalPages={discoveryPageData.totalPages}
          total={discoveryPageData.total}
          pageSize={discoveryPageData.pageSize}
          onPrev={() => setDiscoveryPage((p) => Math.max(1, p - 1))}
          onNext={() => setDiscoveryPage((p) => p + 1)}
        />
      </div>

      {historyRow && (
        <div
          className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-2"
          data-knr-catalog-history
          role="dialog"
          aria-label="Historia KNR"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Historia — {historyRow.displayCode}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Append-only · cap 50 · bez kasowania z UI · bez PLN.
              </p>
            </div>
            <WgButton
              type="button"
              variant="secondary"
              className={cn(WG_TOUCH_MIN)}
              onClick={() => setHistoryRow(null)}
            >
              Zamknij
            </WgButton>
          </div>
          <HistoryList entries={historyRow.entry.history ?? []} />
        </div>
      )}

      {updateRow && (
        <div
          className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3"
          data-knr-catalog-update
          role="dialog"
          aria-label="Aktualizacja KNR offline"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">
                Aktualizuj (offline) — {updateRow.displayCode}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Fixture / lokalny kandydat · porównanie · PROPOSED · bez HTTP · bez
                nadpisania VERIFIED.
              </p>
            </div>
            <WgButton
              type="button"
              variant="secondary"
              className={cn(WG_TOUCH_MIN)}
              onClick={() => {
                setUpdateRow(null);
                setComparePreview(null);
                setUpdateMsg(null);
              }}
            >
              Zamknij
            </WgButton>
          </div>
          {comparePreview && <CompareSummary result={comparePreview} />}
          {updateMsg && (
            <p className="text-[11px] text-foreground" data-knr-update-msg>
              {updateMsg}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <WgButton
              type="button"
              variant="default"
              className={cn(WG_TOUCH_MIN, "!text-[11px]")}
              onClick={() => runOfflinePropose(updateRow)}
              data-knr-save-proposed
            >
              Zapisz propozycję offline
            </WgButton>
            <WgButton
              type="button"
              variant="secondary"
              className={cn(WG_TOUCH_MIN, "!text-[11px]")}
              onClick={() => openUpdate(updateRow)}
            >
              Przelicz diff fixture
            </WgButton>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MULTI-DWELLING-01 — minimal Hub package panel (opt-in multi · local-only).
 */

import { useCallback, useMemo, useState } from "react";
import {
  attachOfferBoqToDwelling,
  confirmDwelling,
  enableMultiDwellingMode,
  evaluateTenderPackage,
  getTenderPackage,
  hintDwellingCountFromDocumentIds,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
  stampDwellingLineIdsOnOfferBoq,
  type TenderPackage,
} from "@/lib/multi-dwelling";
import { buildOfferBoqFromSnapshot } from "@/lib/tender-offer-boq";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { normalizeWorkCatalogStore } from "@/lib/work-catalog";
import { resolveKosztorysSnapshotForPricing } from "@/lib/cost-multi-02";

function formatPln(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("pl-PL")} PLN`;
}

function dwellingStatusLabel(pkg: TenderPackage, dwellingId: string): string {
  const d = pkg.dwellings.find((x) => x.dwellingId === dwellingId);
  if (!d) return "MISSING";
  if (!d.offerBoq?.lines?.length) return "BRAK BOQ";
  if (!d.f5Gate) return "NIEOCENIONE";
  if (d.f5Gate.pass) return "COMPLETE";
  if (d.f5Gate.equipmentGapCount > 0) return "EQUIPMENT GAP";
  if (d.f5Gate.transportGapCount > 0) return "TRANSPORT GAP";
  return "GAP";
}

export function MultiDwellingPackagePanel({
  item,
  costDocumentIds = [],
}: {
  item: TenderPipelineItem;
  /** Optional HINT document ids (never SSOT dwelling). */
  costDocumentIds?: string[];
}) {
  const tenderId = item.id;
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const pkg = useMemo(() => {
    void tick;
    return getTenderPackage(tenderId);
  }, [tenderId, tick]);

  const [expectedInput, setExpectedInput] = useState("20");
  const [newDwellingId, setNewDwellingId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [docId, setDocId] = useState("");
  const [mapDwellingId, setMapDwellingId] = useState("");
  const [selectedDwellingId, setSelectedDwellingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const hintCount = hintDwellingCountFromDocumentIds(costDocumentIds);

  const evaluation = useMemo(() => {
    if (!pkg || pkg.mode !== "multi") return null;
    try {
      const now = new Date().toISOString();
      const store = normalizeWorkCatalogStore({
        schemaVersion: 4,
        activeRegion: "wroclaw",
        updatedAt: now,
        catalogs: {
          wroclaw: { region: "wroclaw", works: [], updatedAt: now },
          dolnyslask: { region: "dolnyslask", works: [], updatedAt: now },
        },
      });
      return evaluateTenderPackage(pkg, {
        store,
        nowMs: Date.now(),
        ensureOwnerQuestions: false,
      });
    } catch {
      return null;
    }
  }, [pkg, tick]);

  const displayPkg = evaluation?.package ?? pkg;

  if (!pkg || pkg.mode !== "multi") {
    return (
      <section
        className="rounded-lg border border-border/70 bg-card px-3 py-2 space-y-2"
        data-multi-dwelling-panel
        data-mode="legacy_single"
      >
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Paczka mieszkań
        </p>
        <p className="text-xs text-muted-foreground">
          Tryb domyślny: jeden przedmiar (legacy). Włącz multi tylko dla paczki mieszkań.
        </p>
        {hintCount > 1 && (
          <p
            className="text-[11px] text-amber-700 dark:text-amber-400"
            data-multi-dwelling-hint
          >
            HINT: wykryto {hintCount} dokumentów kosztowych — nie tworzy SSOT mieszkań.
          </p>
        )}
        <button
          type="button"
          className="text-xs font-medium px-2.5 py-1.5 rounded border border-border hover:bg-secondary/40"
          data-multi-dwelling-enable
          onClick={() => {
            const next = enableMultiDwellingMode(tenderId, {
              labelPl: item.title?.slice(0, 80) || tenderId,
              expectedDwellingCount: hintCount > 1 ? hintCount : undefined,
            });
            if (next) {
              setMsg("Włączono tryb multi — potwierdź liczbę mieszkań i mapowanie.");
              if (hintCount > 1) setExpectedInput(String(hintCount));
              refresh();
            } else {
              setMsg("Nie udało się włączyć multi (storage).");
            }
          }}
        >
          Włącz paczkę mieszkań (multi)
        </button>
        {msg && <p className="text-[11px] text-muted-foreground">{msg}</p>}
      </section>
    );
  }

  const gate = evaluation?.packageGate;
  const k = gate?.completeDwellingCount ?? 0;
  const n = pkg.expectedDwellingCount || 0;

  return (
    <section
      className="rounded-lg border border-border/70 bg-card px-3 py-2 space-y-3"
      data-multi-dwelling-panel
      data-mode="multi"
      data-package-gate={gate?.pass ? "pass" : "blocked"}
    >
      <div className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          PACZKA
        </p>
        <p className="text-sm font-semibold">
          {pkg.labelPl || "Paczka mieszkań"} — {n || "?"} mieszkań
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] space-y-0.5">
          <span className="text-muted-foreground">expectedDwellingCount (Owner)</span>
          <input
            className="block w-20 rounded border border-border bg-background px-2 py-1 text-xs"
            value={expectedInput}
            onChange={(e) => setExpectedInput(e.target.value)}
            data-multi-dwelling-expected-input
          />
        </label>
        <button
          type="button"
          className="text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary/40"
          data-multi-dwelling-set-expected
          onClick={() => {
            const c = Number.parseInt(expectedInput, 10);
            if (!Number.isFinite(c) || c <= 0) {
              setMsg("Podaj dodatnią liczbę mieszkań.");
              return;
            }
            setExpectedDwellingCount(tenderId, c);
            setMsg(`Ustawiono expectedDwellingCount = ${c}`);
            refresh();
          }}
        >
          Potwierdź liczbę
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] space-y-0.5">
          <span className="text-muted-foreground">dwellingId</span>
          <input
            className="block w-28 rounded border border-border bg-background px-2 py-1 text-xs"
            value={newDwellingId}
            onChange={(e) => setNewDwellingId(e.target.value)}
            placeholder="D01"
            data-multi-dwelling-new-id
          />
        </label>
        <label className="text-[11px] space-y-0.5">
          <span className="text-muted-foreground">label</span>
          <input
            className="block w-40 rounded border border-border bg-background px-2 py-1 text-xs"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Mieszkanie 01"
            data-multi-dwelling-new-label
          />
        </label>
        <button
          type="button"
          className="text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary/40"
          data-multi-dwelling-confirm
          onClick={() => {
            const r = confirmDwelling({
              tenderId,
              dwellingId: newDwellingId,
              labelPl: newLabel || newDwellingId,
            });
            if (!r.ok) {
              setMsg(`Confirm dwelling FAIL: ${r.reason}`);
              return;
            }
            setNewDwellingId("");
            setNewLabel("");
            setMsg(`Dodano mieszkanie ${r.package.dwellings.at(-1)?.dwellingId}`);
            refresh();
          }}
        >
          Potwierdź mieszkanie
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] space-y-0.5">
          <span className="text-muted-foreground">documentId → dwelling</span>
          <input
            className="block w-36 rounded border border-border bg-background px-2 py-1 text-xs"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            placeholder="doc-id"
            data-multi-dwelling-doc-id
          />
        </label>
        <input
          className="w-24 rounded border border-border bg-background px-2 py-1 text-xs"
          value={mapDwellingId}
          onChange={(e) => setMapDwellingId(e.target.value)}
          placeholder="D01"
          data-multi-dwelling-map-dwelling
        />
        <button
          type="button"
          className="text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary/40"
          data-multi-dwelling-map
          onClick={() => {
            const r = mapDocumentToDwelling({
              tenderId,
              documentId: docId,
              dwellingId: mapDwellingId,
            });
            if (!r.ok) {
              setMsg(`Map FAIL: ${r.reason}`);
              return;
            }
            setMsg(`Zmapowano ${docId} → ${mapDwellingId}`);
            refresh();
          }}
        >
          Przypisz dokument
        </button>
      </div>

      <ul className="space-y-1 text-xs" data-multi-dwelling-list>
        {(displayPkg?.dwellings ?? []).map((d) => {
          const status = dwellingStatusLabel(displayPkg!, d.dwellingId);
          const sub = d.subtotals?.directPln ?? null;
          const active = selectedDwellingId === d.dwellingId;
          return (
            <li
              key={d.dwellingId}
              className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                active ? "bg-secondary/50" : "bg-secondary/20"
              }`}
            >
              <button
                type="button"
                className="text-left flex-1 min-w-0"
                onClick={() =>
                  setSelectedDwellingId((cur) =>
                    cur === d.dwellingId ? null : d.dwellingId,
                  )
                }
                data-multi-dwelling-row={d.dwellingId}
              >
                <span className="font-medium">{d.dwellingId}</span>{" "}
                <span className="text-muted-foreground">{d.labelPl}</span>{" "}
                <span
                  className={
                    status === "COMPLETE"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {status}
                </span>
              </button>
              <span className="tabular-nums shrink-0">{formatPln(sub)}</span>
            </li>
          );
        })}
      </ul>

      {selectedDwellingId && (
        <div
          className="space-y-1 border-t border-border/60 pt-2"
          data-multi-dwelling-drill
        >
          <p className="text-[11px] text-muted-foreground">
            Wybrane: {selectedDwellingId}
          </p>
          <button
            type="button"
            className="text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary/40"
            data-multi-dwelling-attach-boq
            onClick={() => {
              const snap = resolveKosztorysSnapshotForPricing(item);
              const baseDoc = buildOfferBoqFromSnapshot({
                tenderId,
                snapshot: snap,
              });
              if (!(baseDoc.lines?.length > 0)) {
                setMsg("Brak OfferBoq do przypisania (snapshot pusty) — MISSING ≠ 0.");
                return;
              }
              const multiDoc = stampDwellingLineIdsOnOfferBoq(
                baseDoc,
                selectedDwellingId,
              );
              const r = attachOfferBoqToDwelling({
                tenderId,
                dwellingId: selectedDwellingId,
                offerBoq: multiDoc,
              });
              if (!r.ok) {
                setMsg(`Attach BOQ FAIL: ${r.reason}`);
                return;
              }
              setMsg(`Przypisano OfferBoq do ${selectedDwellingId}`);
              refresh();
            }}
          >
            Przypisz bieżący przedmiar do mieszkania
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary/40 ml-2"
            onClick={() => setSelectedDwellingId(null)}
          >
            Wróć do paczki
          </button>
        </div>
      )}

      <div
        className="border-t border-border/60 pt-2 space-y-1"
        data-multi-dwelling-summary
      >
        <p className="text-xs font-medium">
          {k}/{n || "?"} COMPLETE
        </p>
        <p
          className={`text-sm font-semibold ${
            gate?.pass
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-800 dark:text-amber-300"
          }`}
          data-multi-dwelling-package-bid
        >
          PACKAGE BID: {gate?.pass ? "ALLOWED" : "BLOCKED"}
        </p>
        {gate && !gate.pass && gate.reasonsPl[0] && (
          <p className="text-[11px] text-muted-foreground">{gate.reasonsPl[0]}</p>
        )}
      </div>

      {msg && <p className="text-[11px] text-muted-foreground">{msg}</p>}
    </section>
  );
}

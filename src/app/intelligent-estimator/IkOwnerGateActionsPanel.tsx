/**
 * A08-P3 — Owner Gate G1/G2 action panel (Hybrid D).
 * SSOT queue items + existing acceptance engines via orchestra.ownerGate.
 *
 * P0 Identity Coverage Option D:
 * evidence prefill (SUGGESTION) → explicit Owner G1 → existing persist.
 * Prefill ≠ trusted · competing ≠ auto-select · no bulk.
 *
 * P0.1 Competing Execution:
 * full queue access · line/candidate evidence · explicit selection ·
 * stale guard · persist fail-closed (session override ≠ durable) · no bulk.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IkOrchestraSnapshot } from "@/lib/intelligent-estimator/orchestra/orchestra-types";
import type { IkOwnerActionItem } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import {
  findPackageLineCatalogWorkId,
  isG1PersistRetryRequired,
  isSelectedCatalogWorkIdFresh,
  listCandidateEvidence,
  resolveG1DurableIdentityState,
  resolveG1IdentityPrefill,
  type G1MappedLineForPrefill,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-gate-actions";
import { TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { cn } from "@/app/components/ui/utils";

/** Presentation window only — Owner can page through ALL queue items (no hidden truncation). */
const GATE_PAGE_SIZE = 25;

type GateRowProps = {
  item: IkOwnerActionItem;
  orchestra: IkOrchestraSnapshot;
};

function findMappedLineForG1(
  orchestra: IkOrchestraSnapshot,
  dwellingId: string,
  lineId: string,
): G1MappedLineForPrefill | null {
  const ref = orchestra.postIdentityExpert?.masterBoqLines?.find(
    (r) => r.dwellingId === dwellingId && r.line.lineId === lineId,
  );
  return ref?.line ?? null;
}

function G1IdentityRow({ item, orchestra }: GateRowProps) {
  const { ownerGate, identityCoverage, identityPersistOutcome, pkg } = orchestra;
  const mappedLine = useMemo(
    () => findMappedLineForG1(orchestra, item.dwellingId, item.lineRef),
    [orchestra, item.dwellingId, item.lineRef],
  );
  const prefill = useMemo(
    () =>
      resolveG1IdentityPrefill({
        identityCoverage,
        dwellingId: item.dwellingId,
        lineId: item.lineRef,
        mappedLine,
      }),
    [identityCoverage, item.dwellingId, item.lineRef, mappedLine],
  );
  const candidates = useMemo(() => listCandidateEvidence(mappedLine), [mappedLine]);
  const suggested =
    prefill.kind === "unique_suggestion" ? prefill.suggestedCatalogWorkId : null;
  const [catalogWorkId, setCatalogWorkId] = useState(suggested ?? "");
  const [staleNotice, setStaleNotice] = useState(false);

  const packageLineCatalogWorkId = useMemo(
    () => findPackageLineCatalogWorkId(pkg, item.dwellingId, item.lineRef),
    [pkg, item.dwellingId, item.lineRef],
  );
  const durableState = useMemo(
    () =>
      resolveG1DurableIdentityState({
        dwellingId: item.dwellingId,
        lineId: item.lineRef,
        manualOverrides: ownerGate.manualOverrides,
        packageLineCatalogWorkId,
        identityPersistOutcome,
      }),
    [
      item.dwellingId,
      item.lineRef,
      ownerGate.manualOverrides,
      packageLineCatalogWorkId,
      identityPersistOutcome,
    ],
  );
  const persistRetry = isG1PersistRetryRequired(durableState);

  const rejected = ownerGate.isG1Rejected(item.dwellingId, item.lineRef);
  const qtyBlocked = prefill.kind === "qty_blocked";
  /** Trusted only when durable (or trusted without session override). Session override alone ≠ trusted. */
  const alreadyTrusted =
    !persistRetry
    && (
      durableState.kind === "durable_match"
      || (prefill.kind === "trusted" && durableState.kind === "no_session_override")
    );

  const selectionFresh = isSelectedCatalogWorkIdFresh(catalogWorkId, mappedLine);
  const canAccept =
    !qtyBlocked
    && !alreadyTrusted
    && catalogWorkId.trim().length > 0
    && selectionFresh
    && !staleNotice;

  // If candidate set changes and selection becomes stale — clear + block (no fallback).
  useEffect(() => {
    const selected = catalogWorkId.trim();
    if (!selected || qtyBlocked || alreadyTrusted) {
      setStaleNotice(false);
      return;
    }
    if (!isSelectedCatalogWorkIdFresh(selected, mappedLine)) {
      setCatalogWorkId("");
      setStaleNotice(true);
    }
  }, [mappedLine, catalogWorkId, qtyBlocked, alreadyTrusted]);

  const selectCandidate = useCallback((cid: string) => {
    setStaleNotice(false);
    setCatalogWorkId(cid);
  }, []);

  const runAccept = useCallback(() => {
    const id = catalogWorkId.trim();
    if (!id || qtyBlocked || alreadyTrusted) return;
    if (!isSelectedCatalogWorkIdFresh(id, mappedLine)) {
      setCatalogWorkId("");
      setStaleNotice(true);
      return;
    }
    ownerGate.g1Accept({
      dwellingId: item.dwellingId,
      lineId: item.lineRef,
      catalogWorkId: id,
    });
  }, [ownerGate, item, catalogWorkId, qtyBlocked, alreadyTrusted, mappedLine]);

  const runEdit = useCallback(() => {
    const id = catalogWorkId.trim();
    if (!id || qtyBlocked || alreadyTrusted) return;
    if (!isSelectedCatalogWorkIdFresh(id, mappedLine)) {
      setCatalogWorkId("");
      setStaleNotice(true);
      return;
    }
    ownerGate.g1Edit({
      dwellingId: item.dwellingId,
      lineId: item.lineRef,
      catalogWorkId: id,
    });
  }, [ownerGate, item, catalogWorkId, qtyBlocked, alreadyTrusted, mappedLine]);

  const lineLp = mappedLine?.lp ?? "";
  const lineDescription = mappedLine?.description ?? "";
  const lineUnit = mappedLine?.unit ?? "";
  const lineQty = mappedLine?.quantity;

  return (
    <li
      className="rounded-lg border border-border bg-background px-2 py-2 space-y-1.5"
      data-ik-owner-gate-row
      data-ik-owner-gate-domain="identity"
      data-ik-owner-gate-line-ref={item.lineRef}
      data-ik-g1-prefill-kind={prefill.kind}
      data-ik-g1-prefill-source={prefill.source}
      data-ik-g1-persist-state={durableState.kind}
      data-ik-g1-stale={staleNotice ? "1" : "0"}
    >
      <p className={`${TEUX_FONT_CAPTION} font-medium`}>{item.labelPl}</p>
      <div
        className={`${TEUX_FONT_CAPTION} text-muted-foreground space-y-0.5`}
        data-ik-g1-line-evidence="1"
      >
        <p>
          lineId: <code className="text-[10px]">{item.lineRef}</code>
          {lineLp ? (
            <>
              {" "}
              · LP: <span data-ik-g1-line-lp={lineLp}>{lineLp}</span>
            </>
          ) : null}
        </p>
        {lineDescription ? (
          <p data-ik-g1-line-description="1" className="line-clamp-3">
            {lineDescription}
          </p>
        ) : null}
        <p>
          unit: <span data-ik-g1-line-unit={lineUnit || ""}>{lineUnit || "—"}</span>
          {" · "}
          qty:{" "}
          <span data-ik-g1-line-quantity={String(lineQty ?? "")}>
            {lineQty == null ? "—" : String(lineQty)}
          </span>
        </p>
      </div>
      {prefill.prefillLabelPl ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-muted-foreground`}
          data-ik-g1-prefill-label="1"
        >
          {prefill.prefillLabelPl}
        </p>
      ) : null}
      {suggested ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-violet-800 dark:text-violet-200`}
          data-ik-g1-suggestion={suggested}
        >
          SUGGESTION / PREFILL: <code className="text-[10px]">{suggested}</code>
        </p>
      ) : null}
      {prefill.kind === "none" ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-amber-900 dark:text-amber-100`}
          data-ik-g1-none="1"
        >
          unresolved — brak kandydata (manual / Reject). Bez auto-select.
        </p>
      ) : null}
      {candidates.length > 0 ? (
        <ul
          className="space-y-1"
          data-ik-g1-competing-candidates={candidates.length}
        >
          {candidates.map((c) => {
            const cid = String(c.catalogWorkId ?? "").trim();
            const selected = catalogWorkId.trim() === cid;
            return (
              <li key={cid}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left text-[10px] px-1.5 py-1 rounded border border-border space-y-0.5",
                    selected
                      ? "bg-primary/15 border-primary/40"
                      : "bg-secondary/20 hover:bg-secondary/50",
                  )}
                  data-ik-g1-candidate={cid}
                  data-ik-g1-candidate-selected={selected ? "1" : "0"}
                  onClick={() => selectCandidate(cid)}
                >
                  <div>
                    <code>{cid}</code>
                    {c.role ? ` · role=${c.role}` : ""}
                    {typeof c.score === "number" ? ` · score=${c.score}` : ""}
                  </div>
                  {c.workNamePl ? (
                    <div data-ik-g1-candidate-name="1">{c.workNamePl}</div>
                  ) : null}
                  <div className="text-muted-foreground">
                    {c.workCategory ? `cat=${c.workCategory}` : null}
                    {c.tradeId ? ` · trade=${c.tradeId}` : null}
                    {c.matchedBy ? ` · matchedBy=${c.matchedBy}` : null}
                    {c.matchConfidence ? ` · conf=${c.matchConfidence}` : null}
                  </div>
                  {c.rationale ? (
                    <div
                      className="text-muted-foreground line-clamp-2"
                      data-ik-g1-candidate-rationale="1"
                    >
                      {c.rationale}
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {staleNotice ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-amber-900 dark:text-amber-100`}
          data-ik-g1-stale-notice="1"
        >
          STALE CANDIDATE — wybór wyczyszczony · Accept zablokowany · brak fallback.
        </p>
      ) : null}
      {durableState.kind === "persist_failed" ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-red-800 dark:text-red-200`}
          data-ik-g1-persist-failed="1"
        >
          PERSISTENCE FAILED / RETRY REQUIRED
          {durableState.reason ? ` (${durableState.reason})` : ""} — linia pozostaje
          actionable.
        </p>
      ) : null}
      {durableState.kind === "persist_pending" ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-amber-900 dark:text-amber-100`}
          data-ik-g1-persist-pending="1"
        >
          PERSISTENCE PENDING — durable identity jeszcze nie potwierdzona · retry G1
          dostępny.
        </p>
      ) : null}
      <input
        type="text"
        className="w-full text-[11px] px-2 py-1 rounded border border-border bg-background"
        placeholder={
          prefill.kind === "competing"
            ? "wybierz kandydata lub wpisz catalogWorkId z evidence"
            : "catalogWorkId"
        }
        value={catalogWorkId}
        onChange={(e) => {
          setStaleNotice(false);
          setCatalogWorkId(e.target.value);
        }}
        disabled={qtyBlocked || alreadyTrusted}
        data-ik-owner-gate-catalog-work-id
      />
      <div className="flex flex-wrap gap-1">
        <GateBtn
          label="Accept"
          onClick={runAccept}
          dataAction="g1-accept"
          disabled={!canAccept}
        />
        <GateBtn
          label="Edit→Confirm"
          onClick={runEdit}
          dataAction="g1-edit"
          disabled={!canAccept}
        />
        <GateBtn
          label="Reject"
          variant="muted"
          disabled={alreadyTrusted}
          onClick={() => ownerGate.g1Reject({ dwellingId: item.dwellingId, lineId: item.lineRef })}
          dataAction="g1-reject"
        />
        <GateBtn
          label="Research Again"
          variant="muted"
          disabled={qtyBlocked}
          onClick={() =>
            ownerGate.g1ResearchAgain({ dwellingId: item.dwellingId, lineId: item.lineRef })
          }
          dataAction="g1-research-again"
        />
      </div>
      {alreadyTrusted ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-muted-foreground`}
          data-ik-g1-trusted="1"
        >
          Trusted (durable) — bez ponownego G1.
        </p>
      ) : null}
      {rejected ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-ik-owner-gate-rejected="1">
          Odrzucono (sesja) — linia pozostaje GAP.
        </p>
      ) : null}
    </li>
  );
}

function G2LaborRow({ item, orchestra }: GateRowProps) {
  const { ownerGate } = orchestra;
  const [status, setStatus] = useState<string | null>(null);
  const rejected = ownerGate.isG2LaborRejected(item.dwellingId, item.lineRef);

  const accept = async () => {
    setStatus(null);
    const res = await ownerGate.g2LaborAccept({
      dwellingId: item.dwellingId,
      lineId: item.lineRef,
    });
    if (!res.ok) setStatus(res.reason ?? "FAIL");
    else if (res.noop) setStatus("NOOP (już zaakceptowano)");
    else setStatus("OK");
  };

  return (
    <li
      className="rounded-lg border border-border bg-background px-2 py-2 space-y-1.5"
      data-ik-owner-gate-row
      data-ik-owner-gate-domain="labor_accept"
      data-ik-owner-gate-line-ref={item.lineRef}
    >
      <p className={`${TEUX_FONT_CAPTION} font-medium`}>{item.labelPl}</p>
      <div className="flex flex-wrap gap-1">
        <GateBtn label="Accept" onClick={() => void accept()} dataAction="g2-labor-accept" />
        <GateBtn
          label="Reject"
          variant="muted"
          onClick={() =>
            ownerGate.g2LaborReject({ dwellingId: item.dwellingId, lineId: item.lineRef })
          }
          dataAction="g2-labor-reject"
        />
        <GateBtn
          label="Recalculate"
          variant="muted"
          onClick={() =>
            ownerGate.g2LaborRecalculate({ dwellingId: item.dwellingId, lineId: item.lineRef })
          }
          dataAction="g2-labor-recalculate"
        />
      </div>
      {status ? <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{status}</p> : null}
      {rejected ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-ik-owner-gate-rejected="1">
          Odrzucono kandydata (sesja).
        </p>
      ) : null}
    </li>
  );
}

function G2MaterialRow({ item, orchestra }: GateRowProps) {
  const { ownerGate } = orchestra;
  const [status, setStatus] = useState<string | null>(null);
  const rejected = ownerGate.isG2MaterialRejected(item.dwellingId, item.lineRef);
  const chiefOff = !ownerGate.chiefMaterialAvailable;

  const accept = async () => {
    setStatus(null);
    const res = await ownerGate.g2MaterialAccept({
      dwellingId: item.dwellingId,
      lineId: item.lineRef,
    });
    if (!res.ok) setStatus(res.reason ?? "FAIL");
    else setStatus("OK");
  };

  return (
    <li
      className="rounded-lg border border-border bg-background px-2 py-2 space-y-1.5"
      data-ik-owner-gate-row
      data-ik-owner-gate-domain="material_accept"
      data-ik-owner-gate-line-ref={item.lineRef}
    >
      <p className={`${TEUX_FONT_CAPTION} font-medium`}>{item.labelPl}</p>
      <div className="flex flex-wrap gap-1">
        <GateBtn
          label="Accept"
          disabled={chiefOff}
          onClick={() => void accept()}
          dataAction="g2-material-accept"
        />
        <GateBtn
          label="Reject"
          variant="muted"
          onClick={() =>
            ownerGate.g2MaterialReject({ dwellingId: item.dwellingId, lineId: item.lineRef })
          }
          dataAction="g2-material-reject"
        />
        <GateBtn
          label="Recalculate"
          variant="muted"
          disabled={chiefOff}
          onClick={() =>
            ownerGate.g2MaterialRecalculate({ dwellingId: item.dwellingId, lineId: item.lineRef })
          }
          dataAction="g2-material-recalculate"
        />
      </div>
      {chiefOff ? (
        <p className={`${TEUX_FONT_CAPTION} text-amber-800`} data-ik-owner-gate-chief-off="1">
          Chief OFF — material Accept niedostępny (fail-closed).
        </p>
      ) : null}
      {status ? <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{status}</p> : null}
      {rejected ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-ik-owner-gate-rejected="1">
          Odrzucono kandydata (sesja).
        </p>
      ) : null}
    </li>
  );
}

function GateBtn({
  label,
  onClick,
  variant = "primary",
  disabled = false,
  dataAction,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "muted";
  disabled?: boolean;
  dataAction: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "text-[10px] px-2 py-0.5 rounded border disabled:opacity-50",
        variant === "primary"
          ? "border-primary/40 bg-primary/10 hover:bg-primary/20"
          : "border-border bg-secondary/30 hover:bg-secondary/60",
      )}
      data-ik-owner-gate-action={dataAction}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function buildPersistRetryItems(
  orchestra: IkOrchestraSnapshot,
  existingKeys: Set<string>,
): IkOwnerActionItem[] {
  const out: IkOwnerActionItem[] = [];
  for (const ov of orchestra.ownerGate.manualOverrides) {
    const key = `identity|${ov.dwellingId}|${ov.lineId}`;
    if (existingKeys.has(key)) continue;
    const packageLineCatalogWorkId = findPackageLineCatalogWorkId(
      orchestra.pkg,
      ov.dwellingId,
      ov.lineId,
    );
    const durable = resolveG1DurableIdentityState({
      dwellingId: ov.dwellingId,
      lineId: ov.lineId,
      manualOverrides: orchestra.ownerGate.manualOverrides,
      packageLineCatalogWorkId,
      identityPersistOutcome: orchestra.identityPersistOutcome,
    });
    if (!isG1PersistRetryRequired(durable)) continue;
    out.push({
      domain: "identity",
      lineRef: ov.lineId,
      dwellingId: ov.dwellingId,
      blockerCode: "PERSISTENCE_FAILED_RETRY",
      priority: 10,
      deepLink: `ik:identity:persist-retry:${ov.dwellingId}:${ov.lineId}`,
      labelPl: `Identity PERSIST RETRY · ${ov.lineId}`,
      suggestedActionPl: "PERSISTENCE FAILED / RETRY REQUIRED — ponów G1 Accept.",
      blocksPackageGate: true,
    });
  }
  return out;
}

export function IkOwnerGateActionsPanel({ orchestra }: { orchestra: IkOrchestraSnapshot }) {
  const gateItems = useMemo(() => {
    const q = orchestra.ownerActionQueue;
    const base =
      q?.items.filter(
        (i) =>
          i.domain === "identity"
          || i.domain === "labor_accept"
          || i.domain === "material_accept",
      ) ?? [];
    const keys = new Set(
      base.map((i) => `${i.domain}|${i.dwellingId}|${i.lineRef}`),
    );
    const retryItems = buildPersistRetryItems(orchestra, keys);
    return [...base, ...retryItems];
  }, [orchestra]);

  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(gateItems.length / GATE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const windowStart = safePage * GATE_PAGE_SIZE;
  const windowItems = gateItems.slice(windowStart, windowStart + GATE_PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  if (gateItems.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-2.5 space-y-2"
      data-ik-owner-gate-panel="1"
      data-ik-owner-gate-queue-total={gateItems.length}
      data-ik-owner-gate-page={safePage}
      data-ik-owner-gate-page-size={GATE_PAGE_SIZE}
    >
      <p className={`${TEUX_FONT_CAPTION} font-semibold text-violet-900 dark:text-violet-100`}>
        Owner Gates P3 — G1 Identity · G2 Price (Accept wymaga Owner)
      </p>
      <p
        className={`${TEUX_FONT_CAPTION} text-muted-foreground`}
        data-ik-owner-gate-queue-nav="1"
      >
        Kolejka: {gateItems.length} · widok {windowStart + 1}–
        {Math.min(windowStart + GATE_PAGE_SIZE, gateItems.length)} (nawigacja · bez ukrytej
        truncacji)
      </p>
      {pageCount > 1 ? (
        <div className="flex flex-wrap gap-1 items-center">
          <GateBtn
            label="← Poprzednie"
            variant="muted"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            dataAction="queue-page-prev"
          />
          <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
            strona {safePage + 1}/{pageCount}
          </span>
          <GateBtn
            label="Następne →"
            variant="muted"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            dataAction="queue-page-next"
          />
        </div>
      ) : null}
      <ul className="space-y-2 max-h-96 overflow-y-auto" data-ik-owner-gate-queue-list="1">
        {windowItems.map((item) => {
          if (item.domain === "identity") {
            return (
              <G1IdentityRow
                key={`${item.domain}|${item.dwellingId}|${item.lineRef}|${item.blockerCode}`}
                item={item}
                orchestra={orchestra}
              />
            );
          }
          if (item.domain === "labor_accept") {
            return (
              <G2LaborRow
                key={`${item.domain}|${item.dwellingId}|${item.lineRef}|${item.blockerCode}`}
                item={item}
                orchestra={orchestra}
              />
            );
          }
          return (
            <G2MaterialRow
              key={`${item.domain}|${item.dwellingId}|${item.lineRef}|${item.blockerCode}`}
              item={item}
              orchestra={orchestra}
            />
          );
        })}
      </ul>
    </section>
  );
}

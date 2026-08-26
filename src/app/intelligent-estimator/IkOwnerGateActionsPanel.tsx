/**
 * A08-P3 — Owner Gate G1/G2 action panel (Hybrid D).
 * SSOT queue items + existing acceptance engines via orchestra.ownerGate.
 */

import { useCallback, useMemo, useState } from "react";
import type { IkOrchestraSnapshot } from "@/lib/intelligent-estimator/orchestra/orchestra-types";
import type { IkOwnerActionItem } from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import { resolveSuggestedCatalogWorkIdForG1 } from "@/lib/intelligent-estimator/orchestra/ik-owner-gate-actions";
import { TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { cn } from "@/app/components/ui/utils";

type GateRowProps = {
  item: IkOwnerActionItem;
  orchestra: IkOrchestraSnapshot;
};

function G1IdentityRow({ item, orchestra }: GateRowProps) {
  const { ownerGate, identityCoverage } = orchestra;
  const suggested = resolveSuggestedCatalogWorkIdForG1(
    identityCoverage,
    item.dwellingId,
    item.lineRef,
  );
  const [catalogWorkId, setCatalogWorkId] = useState(suggested ?? "");
  const rejected = ownerGate.isG1Rejected(item.dwellingId, item.lineRef);

  const runAccept = useCallback(() => {
    ownerGate.g1Accept({
      dwellingId: item.dwellingId,
      lineId: item.lineRef,
      catalogWorkId: catalogWorkId.trim() || suggested || "",
    });
  }, [ownerGate, item, catalogWorkId, suggested]);

  const runEdit = useCallback(() => {
    ownerGate.g1Edit({
      dwellingId: item.dwellingId,
      lineId: item.lineRef,
      catalogWorkId,
    });
  }, [ownerGate, item, catalogWorkId]);

  return (
    <li
      className="rounded-lg border border-border bg-background px-2 py-2 space-y-1.5"
      data-ik-owner-gate-row
      data-ik-owner-gate-domain="identity"
      data-ik-owner-gate-line-ref={item.lineRef}
    >
      <p className={`${TEUX_FONT_CAPTION} font-medium`}>{item.labelPl}</p>
      <input
        type="text"
        className="w-full text-[11px] px-2 py-1 rounded border border-border bg-background"
        placeholder="catalogWorkId"
        value={catalogWorkId}
        onChange={(e) => setCatalogWorkId(e.target.value)}
        data-ik-owner-gate-catalog-work-id
      />
      <div className="flex flex-wrap gap-1">
        <GateBtn label="Accept" onClick={runAccept} dataAction="g1-accept" />
        <GateBtn label="Edit→Confirm" onClick={runEdit} dataAction="g1-edit" />
        <GateBtn
          label="Reject"
          variant="muted"
          onClick={() => ownerGate.g1Reject({ dwellingId: item.dwellingId, lineId: item.lineRef })}
          dataAction="g1-reject"
        />
        <GateBtn
          label="Research Again"
          variant="muted"
          onClick={() =>
            ownerGate.g1ResearchAgain({ dwellingId: item.dwellingId, lineId: item.lineRef })
          }
          dataAction="g1-research-again"
        />
      </div>
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

export function IkOwnerGateActionsPanel({ orchestra }: { orchestra: IkOrchestraSnapshot }) {
  const gateItems = useMemo(() => {
    const q = orchestra.ownerActionQueue;
    if (!q) return [];
    return q.items.filter(
      (i) =>
        i.domain === "identity"
        || i.domain === "labor_accept"
        || i.domain === "material_accept",
    );
  }, [orchestra.ownerActionQueue]);

  if (gateItems.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-2.5 space-y-2"
      data-ik-owner-gate-panel="1"
    >
      <p className={`${TEUX_FONT_CAPTION} font-semibold text-violet-900 dark:text-violet-100`}>
        Owner Gates P3 — G1 Identity · G2 Price (Accept wymaga Owner)
      </p>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {gateItems.slice(0, 8).map((item) => {
          if (item.domain === "identity") {
            return (
              <G1IdentityRow
                key={`${item.domain}|${item.lineRef}|${item.blockerCode}`}
                item={item}
                orchestra={orchestra}
              />
            );
          }
          if (item.domain === "labor_accept") {
            return (
              <G2LaborRow
                key={`${item.domain}|${item.lineRef}|${item.blockerCode}`}
                item={item}
                orchestra={orchestra}
              />
            );
          }
          return (
            <G2MaterialRow
              key={`${item.domain}|${item.lineRef}|${item.blockerCode}`}
              item={item}
              orchestra={orchestra}
            />
          );
        })}
      </ul>
    </section>
  );
}

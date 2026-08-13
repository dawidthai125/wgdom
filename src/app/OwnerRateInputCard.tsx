/**
 * OWNER-INPUT-BID GO-1 — minimal Owner Rate card (Hub/DW).
 * Submit → submitOwnerRateAnswer · refresh via onAccepted callback.
 */

import { useMemo, useState } from "react";
import {
  listOwnerInputsForTender,
  submitOwnerRateAnswer,
  type OwnerRateInputListItem,
} from "@/lib/owner-rate-input";
import { loadAdminSessionFromStorage } from "@/lib/admin-auth";

function qtyUnitLabel(item: OwnerRateInputListItem): string {
  const p = item.question.payload;
  if (p.domain === "equipment") {
    const q = p.equipment.quantity;
    const u = p.equipment.unit?.trim() || "";
    if (q != null && Number.isFinite(q)) return u ? `${q} ${u}` : String(q);
    return u || "—";
  }
  const q = p.transport.quantity;
  const u = p.transport.unit?.trim() || "";
  if (q != null && Number.isFinite(q)) return u ? `${q} ${u}` : String(q);
  return u || "—";
}

function positionName(item: OwnerRateInputListItem): string {
  const p = item.question.payload;
  return p.domain === "equipment" ? p.equipment.namePl : p.transport.namePl;
}

function answerUnit(item: OwnerRateInputListItem): string {
  const p = item.question.payload;
  if (p.domain === "equipment") return p.equipment.unit?.trim() || "j.m.";
  return p.transport.unit?.trim() || "j.m.";
}

export function OwnerRateInputCard({
  tenderId,
  onAccepted,
}: {
  tenderId: string;
  /** REUSE chiefRefreshNonce / onPriceResearchAccepted */
  onAccepted?: () => void;
}) {
  const tid = String(tenderId ?? "").trim();
  const [draftByQ, setDraftByQ] = useState<Record<string, string>>({});
  const [errorByQ, setErrorByQ] = useState<Record<string, string>>({});
  const [bump, setBump] = useState(0);

  const openItems = useMemo(() => {
    void bump;
    if (!tid) return [] as OwnerRateInputListItem[];
    return listOwnerInputsForTender({ tenderId: tid, domain: "equipment" }).filter(
      (i) => i.question.status !== "cancelled",
    );
  }, [tid, bump]);

  if (!tid || openItems.length === 0) return null;

  return (
    <div className="space-y-3" data-owner-rate-input-cards>
      {openItems.map((item) => {
        const qid = item.question.questionId;
        const unit = answerUnit(item);
        return (
          <section
            key={qid}
            className="rounded-xl border border-amber-500/40 bg-card overflow-hidden"
            data-owner-rate-input-card
            data-owner-rate-domain={item.question.domain}
            data-owner-rate-question-id={qid}
          >
            <div className="px-4 py-2.5 border-b border-border/60 bg-amber-500/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                Owner Rate Required
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Domain: Equipment · potrzebujemy aktualnej stawki właściciela
              </p>
            </div>
            <div className="px-4 py-3 space-y-2 text-[12px]">
              <p>
                <span className="text-muted-foreground">Pozycja:</span>{" "}
                <span className="font-medium">{positionName(item)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Ilość / jednostka:</span>{" "}
                <span className="tabular-nums">{qtyUnitLabel(item)}</span>
              </p>
              <p className="text-muted-foreground text-[11px]">
                {item.question.evidenceSummaryPl}
              </p>
              <p className="text-[11px]">{item.question.promptPl}</p>
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <label className="flex flex-col gap-1 min-w-[8rem]">
                  <span className="text-[10px] uppercase text-muted-foreground">
                    Stawka PLN / {unit}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-9 rounded-md border border-border bg-background px-2 tabular-nums"
                    value={draftByQ[qid] ?? ""}
                    onChange={(e) =>
                      setDraftByQ((prev) => ({ ...prev, [qid]: e.target.value }))
                    }
                    data-owner-rate-amount
                  />
                </label>
                <button
                  type="button"
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold"
                  data-owner-rate-submit
                  onClick={() => {
                    const session = loadAdminSessionFromStorage();
                    const amount = Number(String(draftByQ[qid] ?? "").replace(",", "."));
                    const result = submitOwnerRateAnswer({
                      tenderId: tid,
                      questionId: qid,
                      amountPlnNet: amount,
                      unit,
                      currency: "PLN",
                      approvedBy: {
                        userId: session?.id ?? "owner",
                        displayName: session?.displayName ?? session?.login,
                      },
                    });
                    if (!result.ok) {
                      setErrorByQ((prev) => ({
                        ...prev,
                        [qid]: result.reason,
                      }));
                      return;
                    }
                    setErrorByQ((prev) => {
                      const next = { ...prev };
                      delete next[qid];
                      return next;
                    });
                    setBump((n) => n + 1);
                    onAccepted?.();
                  }}
                >
                  Zatwierdź
                </button>
              </div>
              {errorByQ[qid] && (
                <p className="text-[11px] text-destructive" data-owner-rate-error>
                  {errorByQ[qid]}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

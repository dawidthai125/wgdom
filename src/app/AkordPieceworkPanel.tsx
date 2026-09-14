/**
 * PAYROLL AKORD — Job / Allocation / Advance editor (WeekEmployeeDetail).
 * All writes go through Phase 4A CAS (commitPieceworkOp).
 * Weekly payout = current-week advances only; remaining is informational.
 */

import { useMemo, useState } from "react";
import type { Job } from "@/app/app-domain";
import {
  createAdvance,
  remainingForAllocation,
  softDeleteAdvance,
  softDeleteAllocation,
  sumActiveAdvances,
  updateAdvance,
  updateAllocation,
  createAllocation,
} from "@/lib/payroll-piecework";
import { commitPieceworkOp } from "@/lib/payroll-piecework-commit";
import { ensurePieceworkJobForJobId } from "@/lib/payroll-piecework-ensure-job";
import {
  isPieceworkAdvanceInPayrollWeek,
  resolveAkordAllocationBreakdown,
  resolveAkordWeekAdvances,
} from "@/lib/payroll-piecework-payable";
import {
  isActivePieceworkAdvance,
  isPieceworkDeleted,
  type PayrollPieceworkState,
} from "@/lib/payroll-piecework-types";

function fmt(n: number) {
  return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function jobLabel(job: Job): string {
  const a = (job.address ?? "").trim() || "—";
  const flat = (job.flatNumber ?? "").trim();
  return flat ? `${a} m.${flat}` : a;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AkordPieceworkPanel({
  directoryId,
  jobs,
  piecework,
  weekFrom,
  weekTo,
  readOnly,
  onPieceworkCommitted,
}: {
  directoryId: string;
  jobs: Job[];
  piecework: PayrollPieceworkState;
  weekFrom: string;
  weekTo: string;
  readOnly?: boolean;
  onPieceworkCommitted: (next: PayrollPieceworkState) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const [agreedStr, setAgreedStr] = useState("");
  const [advAllocId, setAdvAllocId] = useState("");
  const [advAmount, setAdvAmount] = useState("");
  const [advNote, setAdvNote] = useState("");
  const [advPaidAt, setAdvPaidAt] = useState(todayIsoDate);
  const [editAgreedId, setEditAgreedId] = useState<string | null>(null);
  const [editAgreedStr, setEditAgreedStr] = useState("");

  const breakdown = useMemo(
    () => resolveAkordAllocationBreakdown(directoryId, piecework),
    [directoryId, piecework],
  );

  const weekAdvances = useMemo(
    () => resolveAkordWeekAdvances(directoryId, piecework, weekFrom, weekTo),
    [directoryId, piecework, weekFrom, weekTo],
  );

  const totalAgreed = useMemo(
    () => +breakdown.allocations.reduce((s, a) => s + a.agreedAmount, 0).toFixed(2),
    [breakdown.allocations],
  );
  const totalAdvancesAll = useMemo(
    () => +breakdown.allocations.reduce((s, a) => s + a.activeAdvancesSum, 0).toFixed(2),
    [breakdown.allocations],
  );

  /** Tylko roboty w trakcie (Job.status === in_progress). */
  const jobOptions = useMemo(() => {
    return [...jobs]
      .filter((j) => j.status === "in_progress")
      .sort((a, b) => jobLabel(a).localeCompare(jobLabel(b), "pl"));
  }, [jobs]);

  const run = async (apply: Parameters<typeof commitPieceworkOp>[1]): Promise<boolean> => {
    if (readOnly || busy) return false;
    setBusy(true);
    setError("");
    try {
      const result = await commitPieceworkOp(piecework, apply);
      if (!result.ok) {
        setError(result.message);
        return false;
      }
      onPieceworkCommitted(result.state);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const addAllocation = async () => {
    const agreed = parseFloat(agreedStr.replace(",", "."));
    if (!(agreed >= 0) || Number.isNaN(agreed)) {
      setError("Podaj prawidłową uzgodnioną kwotę.");
      return;
    }
    if (!jobId.trim()) {
      setError("Wybierz robotę.");
      return;
    }
    const job = jobs.find((j) => j.id === jobId);
    const ok = await run((state) => {
      const ensured = ensurePieceworkJobForJobId(state, jobId, job ? jobLabel(job) : undefined);
      if (!ensured.ok || !ensured.pieceworkJobId) return ensured;
      return createAllocation(ensured.state, {
        pieceworkJobId: ensured.pieceworkJobId,
        directoryId,
        agreedAmount: agreed,
      });
    });
    if (ok) setAgreedStr("");
  };

  const saveAgreed = async (allocationId: string) => {
    const agreed = parseFloat(editAgreedStr.replace(",", "."));
    if (!(agreed >= 0) || Number.isNaN(agreed)) {
      setError("Podaj prawidłową uzgodnioną kwotę.");
      return;
    }
    const ok = await run((state) => updateAllocation(state, { id: allocationId, agreedAmount: agreed }));
    if (ok) setEditAgreedId(null);
  };

  const addAdvanceRow = async () => {
    const amount = parseFloat(advAmount.replace(",", "."));
    if (!(amount > 0) || Number.isNaN(amount)) {
      setError("Podaj kwotę zaliczki większą od 0.");
      return;
    }
    if (!advAllocId) {
      setError("Wybierz robotę akordu.");
      return;
    }
    const alloc = piecework.allocations.find((a) => a.id === advAllocId);
    if (!alloc || isPieceworkDeleted(alloc)) {
      setError("Nie znaleziono uzgodnienia akordu.");
      return;
    }
    const used = sumActiveAdvances(piecework.advances, advAllocId);
    if (+(used + amount).toFixed(2) > alloc.agreedAmount) {
      setError(
        `Zaliczka przekracza limit: ${fmt(used)} + ${fmt(amount)} > ${fmt(alloc.agreedAmount)} PLN.`,
      );
      return;
    }
    const paidAt = advPaidAt.trim() || todayIsoDate();
    const ok = await run((state) =>
      createAdvance(state, {
        allocationId: advAllocId,
        amount,
        paidAt: new Date(paidAt).toISOString(),
        note: advNote.trim() || undefined,
        weekFrom,
        weekTo,
      }),
    );
    if (ok) {
      setAdvAmount("");
      setAdvNote("");
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-sky-200">Akord — roboty i zaliczki</p>
      </div>

      <div className="rounded-lg border border-sky-500/35 bg-sky-950/40 px-3 py-2.5 space-y-1.5 text-[12px] leading-relaxed text-sky-50">
        <p>
          Uzgodniona kwota akordu nie jest automatycznie doliczana do wypłaty tygodniowej ani sobotniej.
        </p>
        <p>
          Do wypłaty w tym tygodniu z akordu wchodzą tylko zaliczki dodane w tym tygodniu.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-xs rounded-lg border border-border/50 bg-card/50 p-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Robota / akord</p>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Uzgodniona kwota</span>
            <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalAgreed)} PLN</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Zaliczki łącznie</span>
            <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalAdvancesAll)} PLN</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Pozostało z akordu</span>
            <span className="font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(breakdown.payable)} PLN</span>
          </div>
        </div>
        <div className="space-y-1 sm:border-l sm:border-border/40 sm:pl-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Wypłata w tym tygodniu</p>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Zaliczki dodane w tym tygodniu</span>
            <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(weekAdvances)} PLN</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Do wypłaty z akordu w tym tygodniu</span>
            <span className="font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(weekAdvances)} PLN</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {breakdown.allocations.length === 0 && (
          <p className="text-xs text-muted-foreground">Brak uzgodnień — dodaj robotę i uzgodnioną kwotę akordu.</p>
        )}
        {breakdown.allocations.map((row) => {
          const advances = piecework.advances.filter(
            (a) => a.allocationId === row.allocationId && isActivePieceworkAdvance(a),
          );
          const job = jobs.find((j) => j.id === row.jobId);
          const title = job ? jobLabel(job) : row.jobId ?? row.allocationId;
          return (
            <div key={row.allocationId} className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  {row.jobStatus === "closed" && (
                    <span className="text-[10px] text-muted-foreground">Robota zakończona (pozostało nadal w saldzie akordu)</span>
                  )}
                  {row.jobStatus === "active" && (
                    <span className="text-[10px] text-muted-foreground">W trakcie</span>
                  )}
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-[11px] text-destructive hover:underline shrink-0"
                    onClick={() => {
                      if (!confirm("Usunąć uzgodnienie akordu (miękkie usunięcie)?")) return;
                      void run((state) => softDeleteAllocation(state, row.allocationId));
                    }}
                  >
                    Usuń
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <div>
                  <p className="text-muted-foreground">Uzgodniona kwota</p>
                  {editAgreedId === row.allocationId ? (
                    <div className="flex gap-1 mt-1">
                      <input
                        className="w-full bg-secondary rounded px-2 py-1 text-xs"
                        value={editAgreedStr}
                        onChange={(e) => setEditAgreedStr(e.target.value)}
                      />
                      <button type="button" className="text-primary text-[11px]" disabled={busy} onClick={() => void saveAgreed(row.allocationId)}>
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="font-semibold text-left hover:underline"
                      disabled={readOnly || busy}
                      onClick={() => {
                        setEditAgreedId(row.allocationId);
                        setEditAgreedStr(String(row.agreedAmount));
                      }}
                    >
                      {fmt(row.agreedAmount)}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Zaliczki łącznie</p>
                  <p className="font-semibold">{fmt(row.activeAdvancesSum)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pozostało z akordu</p>
                  <p className="font-semibold text-primary">{fmt(row.remaining)}</p>
                </div>
              </div>
              {advances.length > 0 && (
                <ul className="space-y-1.5 border-t border-border/40 pt-2">
                  {advances.map((a) => {
                    const inWeek = isPieceworkAdvanceInPayrollWeek(a, weekFrom, weekTo);
                    return (
                      <li key={a.id} className="space-y-0.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground truncate">
                            {fmt(a.amount)} PLN · {a.paidAt.slice(0, 10)}
                            {a.note ? ` · ${a.note}` : ""}
                          </span>
                          {!readOnly && (
                            <span className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                className="text-primary hover:underline"
                                disabled={busy}
                                onClick={() => {
                                  const next = prompt("Nowa kwota zaliczki", String(a.amount));
                                  if (next == null) return;
                                  const amount = parseFloat(next.replace(",", "."));
                                  if (!(amount > 0)) {
                                    setError("Nieprawidłowa kwota.");
                                    return;
                                  }
                                  void run((state) => updateAdvance(state, { id: a.id, amount }));
                                }}
                              >
                                Edytuj
                              </button>
                              <button
                                type="button"
                                className="text-destructive hover:underline"
                                disabled={busy}
                                onClick={() => {
                                  if (!confirm("Usunąć zaliczkę?")) return;
                                  void run((state) => softDeleteAdvance(state, a.id));
                                }}
                              >
                                Usuń
                              </button>
                            </span>
                          )}
                        </div>
                        <p className={inWeek ? "text-sky-300/90" : "text-muted-foreground/80"}>
                          {inWeek
                            ? "Zaliczka z akordu — wpływa na wypłatę w tym tygodniu"
                            : "Zaliczka z poprzedniego tygodnia — nie wpływa na bieżącą wypłatę"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="space-y-3 border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Dodaj robotę</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select
              className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={busy}
            >
              <option value="">{jobOptions.length === 0 ? "Brak robót w trakcie." : "Wybierz robotę…"}</option>
              {jobOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {jobLabel(j)}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Uzgodniona kwota akordu"
              className="bg-secondary rounded-lg px-3 py-2 text-sm w-full sm:w-40"
              value={agreedStr}
              onChange={(e) => setAgreedStr(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy || jobOptions.length === 0}
              onClick={() => void addAllocation()}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Dodaj robotę
            </button>
          </div>
          {jobOptions.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Brak robót w trakcie.</p>
          )}

          <p className="text-xs font-medium text-muted-foreground">Dodaj zaliczkę</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="bg-secondary rounded-lg px-3 py-2 text-sm"
              value={advAllocId}
              onChange={(e) => setAdvAllocId(e.target.value)}
              disabled={busy}
            >
              <option value="">Wybierz robotę akordu…</option>
              {breakdown.allocations.map((row) => {
                const job = jobs.find((j) => j.id === row.jobId);
                return (
                  <option key={row.allocationId} value={row.allocationId}>
                    {(job ? jobLabel(job) : row.jobId) + ` · max ${fmt(remainingForAllocation(
                      piecework.allocations.find((a) => a.id === row.allocationId),
                      piecework.advances,
                    ))} PLN`}
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Kwota zaliczki"
              className="bg-secondary rounded-lg px-3 py-2 text-sm"
              value={advAmount}
              onChange={(e) => setAdvAmount(e.target.value)}
              disabled={busy}
            />
            <input
              type="date"
              aria-label="Data zaliczki"
              className="bg-secondary rounded-lg px-3 py-2 text-sm"
              value={advPaidAt}
              onChange={(e) => setAdvPaidAt(e.target.value)}
              disabled={busy}
            />
            <input
              type="text"
              placeholder="Notatka (opcjonalnie)"
              className="bg-secondary rounded-lg px-3 py-2 text-sm"
              value={advNote}
              onChange={(e) => setAdvNote(e.target.value)}
              disabled={busy}
            />
          </div>
          <p className="text-[11px] text-sky-200/90">
            Zaliczka z akordu — wpływa na wypłatę w tym tygodniu (gdy data należy do bieżącego tygodnia listy płac).
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void addAdvanceRow()}
            className="rounded-lg border border-sky-500/40 text-sky-100 px-3 py-2 text-sm font-medium hover:bg-sky-500/10 disabled:opacity-50"
          >
            Zapisz zaliczkę
          </button>
        </div>
      )}
    </div>
  );
}

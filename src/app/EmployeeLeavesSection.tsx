import { useMemo, useState } from "react";
import { Plus, Trash2, Edit2, Check, X, Palmtree } from "lucide-react";
import { LabelWithHint } from "@/app/app-ui";
import type { WeekSnapshot } from "@/app/app-domain";
import { fmtDate } from "@/app/app-domain";
import {
  LEAVE_TYPE_OPTIONS,
  leaveTypeDisplayLabel,
  leaveTypeShortLabel,
  listSelectablePayrollWeeks,
  validateEmployeeLeaveRecord,
  type EmployeeLeave,
  type LeaveType,
} from "@/lib/employee-leaves";

const emptyForm = () => ({
  leaveType: "vacation" as LeaveType,
  weekStart: "",
  weekEnd: "",
  notes: "",
});

export function EmployeeLeavesSection({
  employeeId,
  employeeName,
  leaves,
  savedWeeks,
  onChange,
  onCommit,
}: {
  employeeId: string;
  employeeName: string;
  leaves: EmployeeLeave[];
  savedWeeks: WeekSnapshot[];
  onChange: (next: EmployeeLeave[]) => void;
  onCommit: (next: EmployeeLeave[], deletedId?: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const empLeaves = useMemo(
    () => leaves.filter((l) => l.employeeId === employeeId).sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    [leaves, employeeId],
  );

  const weekOptions = useMemo(() => listSelectablePayrollWeeks(savedWeeks), [savedWeeks]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (leave: EmployeeLeave) => {
    setEditId(leave.id);
    setForm({
      leaveType: leave.leaveType,
      weekStart: leave.weekStart,
      weekEnd: leave.weekEnd,
      notes: leave.notes ?? "",
    });
    setFormError("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
  };

  const saveForm = () => {
    const startOpt = weekOptions.find((w) => w.weekFrom === form.weekStart);
    const endOpt = weekOptions.find((w) => w.weekFrom === form.weekEnd);
    const weekStart = startOpt?.weekFrom ?? form.weekStart;
    const weekEnd = endOpt?.weekTo ?? form.weekEnd;

    const draft: EmployeeLeave = {
      id: editId ?? crypto.randomUUID(),
      employeeId,
      leaveType: form.leaveType,
      weekStart,
      weekEnd,
      notes: form.notes.trim(),
      createdAt: editId ? (empLeaves.find((l) => l.id === editId)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const others = leaves.filter((l) => l.id !== draft.id);
    const validation = validateEmployeeLeaveRecord(draft, others, savedWeeks);
    if (!validation.ok) {
      setFormError(validation.message ?? "Nie można zapisać nieobecności.");
      return;
    }

    const next = editId
      ? leaves.map((l) => (l.id === editId ? draft : l))
      : [...leaves, draft];
    onChange(next);
    onCommit(next);
    cancelForm();
  };

  const removeLeave = (id: string) => {
    if (!window.confirm("Usunąć wpis nieobecności?")) return;
    const next = leaves.filter((l) => l.id !== id);
    onChange(next);
    onCommit(next, id);
  };

  const weekLabel = (from: string, to: string) => {
    const opt = weekOptions.find((w) => w.weekFrom === from && w.weekTo === to);
    if (opt) return opt.label;
    return `${fmtDate(from)} – ${fmtDate(to)}`;
  };

  return (
    <div className="bg-secondary/40 rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between gap-2">
        <LabelWithHint
          label="Nieobecności"
          hint="Urlop, chorobowe lub bezpłatny — tygodnie rozliczeniowe jak na liście płac. Nie można dodać dla tygodni już zamkniętych w archiwum."
        />
        {!showForm && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors shrink-0"
          >
            <Plus size={13}/> Dodaj nieobecność
          </button>
        )}
      </div>

      {empLeaves.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">Brak wpisów dla {employeeName || "pracownika"}.</p>
      )}

      {empLeaves.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/80 text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Typ</th>
                <th className="px-3 py-2 text-left font-medium">Od</th>
                <th className="px-3 py-2 text-left font-medium">Do</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 w-16"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {empLeaves.map((leave) => (
                <tr key={leave.id} className="bg-card/50">
                  <td className="px-3 py-2">{leaveTypeShortLabel(leave.leaveType)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(leave.weekStart)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(leave.weekEnd)}</td>
                  <td className="px-3 py-2">{leaveTypeDisplayLabel(leave.leaveType)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button type="button" onClick={() => openEdit(leave)} className="p-1 text-muted-foreground hover:text-primary rounded" title="Edytuj"><Edit2 size={12}/></button>
                      <button type="button" onClick={() => removeLeave(leave.id)} className="p-1 text-muted-foreground hover:text-destructive rounded" title="Usuń"><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-primary/25 bg-card p-4 space-y-3">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Palmtree size={13} className="text-primary"/>
            {editId ? "Edytuj nieobecność" : "Nowa nieobecność"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Typ</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value as LeaveType }))}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              >
                {LEAVE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Notatka</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcjonalnie…"
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Od tygodnia</label>
              <select
                value={form.weekStart}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    weekStart: v,
                    weekEnd: !f.weekEnd || f.weekEnd < v ? v : f.weekEnd,
                  }));
                }}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              >
                <option value="">— wybierz —</option>
                {weekOptions.map((w) => (
                  <option key={w.weekFrom} value={w.weekFrom}>{w.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Do tygodnia</label>
              <select
                value={form.weekEnd}
                onChange={(e) => setForm((f) => ({ ...f, weekEnd: e.target.value }))}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              >
                <option value="">— wybierz —</option>
                {weekOptions
                  .filter((w) => !form.weekStart || w.weekFrom >= form.weekStart)
                  .map((w) => (
                    <option key={w.weekFrom} value={w.weekFrom}>{w.label}</option>
                  ))}
              </select>
            </div>
          </div>
          {formError && <p className="text-[11px] text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={saveForm} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
              <Check size={13}/> Zapisz
            </button>
            <button type="button" onClick={cancelForm} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground">
              <X size={13}/> Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

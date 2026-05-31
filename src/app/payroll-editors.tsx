import { Plus, Trash2, Clock, FileText } from "lucide-react";
import { Checkbox } from "@/app/app-ui";
import {
  type DayData,
  type DayExtraHour,
  type DayNote,
  fmtH,
  hoursWorked,
  dayExtraHoursOnly,
  dayTotalHours,
} from "@/app/app-domain";

export function PayrollDayEditor({
  day,
  title,
  hint,
  titleClass = "",
  variant = "day",
  onUpdate,
}: {
  day: DayData;
  title: string;
  hint?: string;
  titleClass?: string;
  variant?: "day" | "prevSaturday";
  onUpdate: (next: DayData) => void;
}) {
  const updateField = (field: keyof DayData, value: string | boolean) => {
    onUpdate({ ...day, [field]: value });
  };
  const extraList = day.extraHours ?? [];
  const notesList = day.notes ?? [];
  const updateExtra = (next: DayExtraHour[]) => onUpdate({ ...day, extraHours: next });
  const updateNotes = (next: DayNote[]) => onUpdate({ ...day, notes: next, extraHours: variant === "prevSaturday" ? undefined : day.extraHours });
  const baseH = day.active ? hoursWorked(day.from, day.to) : 0;
  const extraH = variant === "prevSaturday" ? 0 : dayExtraHoursOnly(day);
  const totalDayH = variant === "prevSaturday" ? baseH : dayTotalHours(day);
  const hasContent = variant === "prevSaturday" ? day.active || notesList.length > 0 : day.active || extraList.length > 0;

  return (
    <div className={`transition-opacity ${hasContent ? "" : "opacity-50"}`}>
      <div className={`px-4 py-3 ${(variant === "prevSaturday" ? notesList.length : extraList.length) > 0 ? "pb-2" : ""}`}>
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Checkbox checked={day.active} onChange={(v) => updateField("active", v)}/>
              <div className="min-w-0">
                <span className={`text-sm font-medium block truncate ${titleClass}`}>{title}</span>
                {hint && <span className="text-[10px] text-muted-foreground block truncate">{hint}</span>}
              </div>
            </div>
            {totalDayH > 0 && (
              <span className="text-xs font-semibold text-primary shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtH(totalDayH)}{extraH > 0 && baseH > 0 ? ` (+${fmtH(extraH)})` : ""}
              </span>
            )}
          </div>
          {day.active && (
            <div className="grid grid-cols-3 gap-2 pl-8">
              <div><label className="text-xs text-muted-foreground block mb-1">Od</label><input type="time" value={day.from} onChange={(e) => updateField("from", e.target.value)} className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Do</label><input type="time" value={day.to} onChange={(e) => updateField("to", e.target.value)} className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Zaliczka</label><input type="number" min="0" step="10" placeholder="0" value={day.zaliczka} onChange={(e) => updateField("zaliczka", e.target.value)} className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}/></div>
            </div>
          )}
        </div>
        <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.95fr)] items-center gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Checkbox checked={day.active} onChange={(v) => updateField("active", v)}/>
            <div className="min-w-0">
              <span className={`text-sm font-medium block truncate ${titleClass}`}>{title}</span>
              {hint && <span className="text-[10px] text-muted-foreground block truncate">{hint}</span>}
            </div>
          </div>
          <input type="time" value={day.from} disabled={!day.active} onChange={(e) => updateField("from", e.target.value)} className="w-full min-w-0 bg-secondary rounded-lg px-1.5 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
          <input type="time" value={day.to} disabled={!day.active} onChange={(e) => updateField("to", e.target.value)} className="w-full min-w-0 bg-secondary rounded-lg px-1.5 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
          <div className="text-center">
            <span className={`text-xs font-semibold ${totalDayH > 0 ? "text-primary" : "text-muted-foreground/25"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }} title={extraH > 0 ? `w tym ${fmtH(extraH)} dodatkowych` : undefined}>
              {totalDayH > 0 ? fmtH(totalDayH) : "—"}
            </span>
          </div>
          <input type="number" min="0" step="10" placeholder="0" value={day.zaliczka} disabled={!day.active} onChange={(e) => updateField("zaliczka", e.target.value)} className="w-full min-w-0 bg-secondary rounded-lg px-1.5 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed placeholder:text-muted-foreground/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
        </div>
      </div>
      {variant === "prevSaturday" ? (
        <div className="px-4 pb-3 sm:pl-10 space-y-2">
          {notesList.map((note) => (
            <div key={note.id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 flex items-start gap-2">
              <FileText size={12} className="text-amber-500 shrink-0 mt-1"/>
              <textarea
                rows={2}
                placeholder="Opis (np. co robiono, ilu pracowników wypożyczono, kwota do rozliczenia)"
                value={note.text}
                onChange={(e) => updateNotes(notesList.map((item) => item.id === note.id ? { ...item, text: e.target.value } : item))}
                className="flex-1 min-w-0 bg-background rounded-lg px-2.5 py-1.5 text-xs border border-transparent focus:border-amber-500/40 focus:outline-none resize-y min-h-[2.5rem]"
              />
              <button type="button" onClick={() => updateNotes(notesList.filter((item) => item.id !== note.id))} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 size={13}/></button>
            </div>
          ))}
          <button type="button" onClick={() => updateNotes([...notesList, { id: crypto.randomUUID(), text: "" }])} className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors">
            <Plus size={12}/> Opis
          </button>
        </div>
      ) : (
        <div className="px-4 pb-3 sm:pl-10 space-y-2">
          {extraList.map((ex) => {
            const exH = hoursWorked(ex.from, ex.to);
            return (
              <div key={ex.id} className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-primary shrink-0"/>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Dodatkowe godziny</span>
                  {exH > 0 && <span className="ml-auto text-xs font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtH(exH)}</span>}
                </div>
                <input type="text" placeholder="Opis (np. dogrywka, transport)" value={ex.description} onChange={(e) => updateExtra(extraList.map((item) => item.id === ex.id ? { ...item, description: e.target.value } : item))} className="w-full bg-background rounded-lg px-2.5 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none"/>
                <div className="flex items-center gap-2">
                  <input type="time" value={ex.from} onChange={(e) => updateExtra(extraList.map((item) => item.id === ex.id ? { ...item, from: e.target.value } : item))} className="flex-1 bg-background rounded-lg px-2 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
                  <span className="text-xs text-muted-foreground">–</span>
                  <input type="time" value={ex.to} onChange={(e) => updateExtra(extraList.map((item) => item.id === ex.id ? { ...item, to: e.target.value } : item))} className="flex-1 bg-background rounded-lg px-2 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
                  <button type="button" onClick={() => updateExtra(extraList.filter((item) => item.id !== ex.id))} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 size={13}/></button>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => updateExtra([...extraList, { id: crypto.randomUUID(), description: "", from: "16:00", to: "18:00" }])} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            <Plus size={12}/> Dodatkowe godziny — {title}
          </button>
        </div>
      )}
    </div>
  );
}


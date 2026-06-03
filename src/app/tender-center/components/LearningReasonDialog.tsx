import { useState } from "react";
import type { TenderDecision } from "@/lib/tender-center-decision";
import {
  LEARNING_REASON_OPTIONS,
  type LearningReasonId,
} from "@/lib/tender-center-learning";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

export function LearningReasonDialog({
  open,
  decision,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  decision: TenderDecision | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: LearningReasonId, customReason: string) => void;
}) {
  const [selected, setSelected] = useState<LearningReasonId | null>(null);
  const [customReason, setCustomReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setCustomReason("");
    }
    onOpenChange(next);
  };

  const canConfirm =
    selected != null && (selected !== "inne" || customReason.trim().length > 0);

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected, customReason.trim());
    setSelected(null);
    setCustomReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dlaczego podjąłeś tę decyzję?</DialogTitle>
          <DialogDescription>
            {decision
              ? `Twoja decyzja: ${decision} — wybierz powód, aby COMMAND CENTER AI uczył się Twojego stylu.`
              : "Wybierz powód decyzji."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto py-1">
          {LEARNING_REASON_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors min-h-[44px] ${
                selected === opt.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/20 hover:bg-secondary/40"
              }`}
            >
              <input
                type="radio"
                name="learning-reason"
                value={opt.id}
                checked={selected === opt.id}
                onChange={() => setSelected(opt.id)}
                className="shrink-0"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        {selected === "inne" && (
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Opisz powód decyzji…"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary/60 min-h-[44px]"
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
          >
            Zapisz decyzję
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

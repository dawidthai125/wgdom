import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";
import { markCommandCenterOnboardingSeen } from "@/app/tender-center/command-center-onboarding";

export function CommandCenterWelcomeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleDismiss = () => {
    markCommandCenterOnboardingSeen();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleDismiss())}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-3">
          <DialogTitle className="text-lg leading-snug">{COMMAND_CENTER_BRAND.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 text-sm text-foreground/90">
              <p className="text-base font-medium text-foreground">{COMMAND_CENTER_BRAND.tagline}</p>
              <div className="text-muted-foreground">
                <p>{COMMAND_CENTER_BRAND.authorLine}</p>
                <p className="font-medium italic text-foreground/80">{COMMAND_CENTER_BRAND.authorName}</p>
              </div>
              <p>
                System został stworzony na podstawie realnych doświadczeń w prowadzeniu firmy budowlanej
                W&G DOM.
              </p>
              <p>
                Jego celem jest wspieranie właściciela w podejmowaniu trafniejszych decyzji:
              </p>
              <ul className="space-y-1 pl-1">
                <li className="flex gap-2">
                  <span className="text-primary shrink-0">✓</span>
                  <span>przetargowych</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary shrink-0">✓</span>
                  <span>finansowych</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary shrink-0">✓</span>
                  <span>kadrowych</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary shrink-0">✓</span>
                  <span>strategicznych</span>
                </li>
              </ul>
              <p className="font-medium text-foreground border-l-2 border-primary/40 pl-3">
                System wspiera decyzje, ale nigdy nie zastępuje właściciela firmy.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 min-h-[44px]"
          >
            Rozumiem
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

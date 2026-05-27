import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { usePwaInstall } from "@/lib/pwa-install";

export function PwaInstallBanner({
  compact = false,
  dismissKey = "wg-pwa-dismiss",
  persist = "session",
  className = "",
}: {
  compact?: boolean;
  /** Klucz localStorage / sessionStorage po zamknięciu */
  dismissKey?: string;
  persist?: "session" | "local";
  className?: string;
}) {
  const { canInstall, installed, promptInstall, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const store = persist === "local" ? localStorage : sessionStorage;
      return store.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });

  if (installed || dismissed) return null;
  if (!canInstall && !isIos) return null;

  const dismiss = () => {
    try {
      const store = persist === "local" ? localStorage : sessionStorage;
      store.setItem(dismissKey, "1");
    } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className={`${compact ? "mb-3" : "mt-3"} bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 flex items-start gap-3 ${className}`}>
      <Smartphone size={16} className="text-primary shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">Dodaj na ekran główny</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {isIos && !canInstall
            ? "Safari → Udostępnij → „Dodaj do ekranu początkowego” — pełny ekran, szybszy dostęp na budowie."
            : "Zainstaluj skrót na telefonie — uruchamia się jak aplikacja, bez paska przeglądarki."}
        </p>
        {canInstall && (
          <button type="button" onClick={() => promptInstall()} className="mt-2 text-xs font-medium text-primary hover:underline min-h-[44px] inline-flex items-center">
            Zainstaluj teraz
          </button>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Zamknij" className="text-muted-foreground hover:text-foreground shrink-0 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1">
        <X size={16}/>
      </button>
    </div>
  );
}

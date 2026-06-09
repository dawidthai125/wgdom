import { RefreshCw, X } from "lucide-react";
import { useAppVersionCheck } from "@/lib/app-version-check";

export function AppUpdateBanner() {
  const { updateAvailable, serverVersion, reload, dismiss } = useAppVersionCheck();

  if (!updateAvailable || !serverVersion) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9998] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto max-w-xl bg-emerald-500/15 border border-emerald-500/35 rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg backdrop-blur-sm">
        <RefreshCw size={16} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-300">
            Dostępna nowa wersja WGDOM ({serverVersion})
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            Kliknij „Odśwież teraz”, aby załadować najnowsze funkcje. Twoje dane w chmurze pozostają bezpieczne.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              onClick={reload}
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 min-h-[44px] px-3 inline-flex items-center rounded-lg bg-emerald-500/20 border border-emerald-500/30"
            >
              Odśwież teraz
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-medium text-muted-foreground hover:text-foreground min-h-[44px] px-3 inline-flex items-center"
            >
              Później
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Zamknij"
          className="text-muted-foreground hover:text-foreground shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

import { MapPin } from "lucide-react";
import { TendersMapPanel } from "@/app/TendersMapPanel";
import { useTendersContext } from "@/app/tenders/context/TendersContext";

export function TendersMapTab() {
  const { snapshot, openTenderInList } = useTendersContext();
  const { pipeline } = snapshot;

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">Mapa przetargów — Wrocław</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Kliknij marker, aby otworzyć szczegóły przetargu na liście.
      </p>
      <TendersMapPanel
        items={pipeline.items}
        selectedId={null}
        onSelect={openTenderInList}
      />
    </div>
  );
}

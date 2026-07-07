import { MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { TendersMapPanel } from "@/app/TendersMapPanel";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { openTenderDetailV4 } from "@/lib/tender-detail-nav";
import { TENDERS_V4_ROUTING } from "@/lib/tenders-v4-config";

export function TendersMapTab() {
  const navigate = useNavigate();
  const { snapshot, openTenderInList, setActiveTab } = useTendersContext();
  const { pipeline } = snapshot;

  const handleSelect = (tenderId: string) => {
    if (TENDERS_V4_ROUTING) {
      openTenderDetailV4(navigate, tenderId, "przetarg");
      return;
    }
    openTenderInList(tenderId);
  };

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
        Kliknij marker, aby otworzyć szczegóły przetargu.
      </p>
      <TendersMapPanel
        items={pipeline.items}
        selectedId={null}
        onSelect={handleSelect}
        onGoToList={() => setActiveTab("list")}
      />
    </div>
  );
}

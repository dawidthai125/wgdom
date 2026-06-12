import { Building2 } from "lucide-react";
import { TenderCompanyProfilePanel } from "@/app/TenderCompanyProfilePanel";
import { useTendersContext } from "@/app/tenders/context/TendersContext";

export function TendersProfileTab() {
  const { bumpProfileVersion } = useTendersContext();

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2">
        <Building2 size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">Profil firmy</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Limity wadium, równoległe roboty i dane ofertowe — wpływają na scoring i prognozę.
      </p>
      <TenderCompanyProfilePanel onSaved={() => bumpProfileVersion()} />
    </div>
  );
}

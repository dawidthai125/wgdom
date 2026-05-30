import { useMemo, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { buildStaticMapUrl, osmLink, tenderMapPoint } from "@/lib/tenders-map-coords";

export function TendersMapPanel({
  items,
  selectedId,
  onSelect,
}: {
  items: TenderPipelineItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const activeId = selectedId ?? localSelected;
  const profile = loadCompanyProfileLocal();

  const points = useMemo(() => {
    return items
      .filter((i) => isTenderOpenForOffers(i.submittingOffersDate))
      .map((item) => {
        const wadium = computeWadiumInfo(item, item.swzAnalysis, profile.maxWadiumPln);
        return tenderMapPoint(item, {
          blocked: wadium.blocked,
          daysLeft: daysUntilTenderDeadline(item.submittingOffersDate),
        });
      })
      .filter((p): p is NonNullable<typeof p> => p != null);
  }, [items, profile.maxWadiumPln]);

  const mapUrl = useMemo(
    () => buildStaticMapUrl(points, activeId),
    [points, activeId],
  );

  if (points.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-1 py-2">
        Brak aktywnych przetargów we Wrocławiu do pokazania na mapie.
      </p>
    );
  }

  const activePoint = points.find((p) => p.id === activeId) ?? points[0];

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <MapPin size={14} className="text-primary shrink-0" />
        <p className="text-xs font-semibold">Mapa przetargów — Wrocław ({points.length})</p>
      </div>
      {mapUrl && (
        <a
          href={osmLink(activePoint.lat, activePoint.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-secondary/30"
        >
          <img
            src={mapUrl}
            alt="Mapa przetargów Wrocław"
            className="w-full h-40 sm:h-48 object-cover"
            loading="lazy"
          />
        </a>
      )}
      <ul className="max-h-36 overflow-y-auto divide-y divide-border/60">
        {points.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                setLocalSelected(p.id);
                onSelect?.(p.id);
              }}
              className={`w-full text-left px-3 py-2 text-[10px] hover:bg-secondary/50 ${p.id === activeId ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${p.blocked ? "bg-red-500" : "bg-emerald-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.label} · {p.organizationName}</p>
                  <p className="text-muted-foreground truncate">{p.title}</p>
                  {p.daysLeft != null && p.daysLeft >= 0 && (
                    <p className="text-muted-foreground">Oferty za {p.daysLeft} d.</p>
                  )}
                </div>
                <ExternalLink size={10} className="shrink-0 text-muted-foreground mt-0.5" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

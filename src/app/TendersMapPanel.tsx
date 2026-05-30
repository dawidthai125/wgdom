import { useMemo, useState } from "react";
import { MapPin, ExternalLink, ChevronDown } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import {
  isWroclawTenderItem,
  mapPointToSvg,
  osmLink,
  tenderMapPoint,
  type TenderMapPoint,
} from "@/lib/tenders-map-coords";

const SVG_W = 640;
const SVG_H = 280;

function TenderMapSvg({
  points,
  activeId,
  onSelect,
}: {
  points: TenderMapPoint[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-40 sm:h-48 bg-[#e8eef4] dark:bg-[#1a2332]"
      role="img"
      aria-label="Mapa przetargów Wrocław"
    >
      <defs>
        <pattern id="tender-map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-border/40" />
        </pattern>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="url(#tender-map-grid)" />
      <text x={SVG_W / 2} y={22} textAnchor="middle" className="fill-muted-foreground" fontSize="11" fontWeight="600">
        Wrocław — aktywne przetargi
      </text>
      {points.map((p) => {
        const { x, y } = mapPointToSvg(p.lat, p.lng, SVG_W, SVG_H);
        const active = p.id === activeId;
        const fill = p.blocked ? "#dc2626" : active ? "#2563eb" : "#16a34a";
        const r = active ? 9 : 7;
        return (
          <g
            key={p.id}
            className="cursor-pointer"
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(p.id); }}
            role="button"
            tabIndex={0}
            aria-label={`${p.label}, ${p.organizationName}`}
          >
            {active && (
              <circle cx={x} cy={y} r={14} fill={fill} opacity={0.2} />
            )}
            <circle cx={x} cy={y} r={r} fill={fill} stroke="#fff" strokeWidth={2} />
            <title>{`${p.label} · ${p.organizationName}\n${p.title}`}</title>
          </g>
        );
      })}
      <text x={12} y={SVG_H - 10} className="fill-muted-foreground" fontSize="9">
        ● zielony — OK · ● czerwony — wadium blokuje · kliknij punkt
      </text>
    </svg>
  );
}

export function TendersMapPanel({
  items,
  selectedId,
  onSelect,
}: {
  items: TenderPipelineItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const activeId = selectedId ?? localSelected;
  const profile = loadCompanyProfileLocal();

  const wroclawItems = useMemo(
    () => items.filter(isWroclawTenderItem),
    [items],
  );

  const points = useMemo(() => {
    return wroclawItems
      .filter((i) => isTenderOpenForOffers(i.submittingOffersDate))
      .map((item) => {
        const wadium = computeWadiumInfo(item, item.swzAnalysis, profile.maxWadiumPln);
        return tenderMapPoint(item, {
          blocked: wadium.blocked,
          daysLeft: daysUntilTenderDeadline(item.submittingOffersDate),
        });
      })
      .filter((p): p is NonNullable<typeof p> => p != null);
  }, [wroclawItems, profile.maxWadiumPln]);

  const activePoint = points.find((p) => p.id === activeId) ?? points[0];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
      >
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-primary" />
          Mapa przetargów — Wrocław
          <span className="text-[10px] font-normal text-muted-foreground">
            {points.length > 0 ? `${points.length} aktywnych` : "brak aktywnych"}
          </span>
        </span>
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border bg-card/50">
          {points.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-3">
              Brak aktywnych przetargów we Wrocławiu do pokazania na mapie.
            </p>
          ) : (
            <>
              <div className="relative">
                <TenderMapSvg
                  points={points}
                  activeId={activeId}
                  onSelect={(id) => {
                    setLocalSelected(id);
                    onSelect?.(id);
                  }}
                />
                {activePoint && (
                  <a
                    href={osmLink(activePoint.lat, activePoint.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 border border-border text-[10px] text-primary hover:bg-background shadow-sm"
                  >
                    <ExternalLink size={10} />
                    OSM
                  </a>
                )}
              </div>
              <ul className="max-h-36 overflow-y-auto divide-y divide-border/60 border-t border-border/60">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

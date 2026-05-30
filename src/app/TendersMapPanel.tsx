import { useMemo, useState } from "react";
import { MapPin, ExternalLink, ChevronDown } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import {
  isWroclawTenderItem,
  buildOsmTileGrid,
  mapPointToPercent,
  osmLink,
  osmTileUrl,
  tenderMapPoint,
  type TenderMapPoint,
  type OsmTileGrid,
} from "@/lib/tenders-map-coords";

const WROCLAW_CENTER = { lat: 51.1079, lng: 17.0385 };
const MAP_ZOOM = 12;
const TILE_RADIUS = 2;

function OsmMapWithMarkers({
  grid,
  points,
  activeId,
  onSelect,
}: {
  grid: OsmTileGrid;
  points: TenderMapPoint[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="relative w-full h-44 sm:h-52 overflow-hidden bg-[#f2efe9] dark:bg-[#1a2332]"
      role="img"
      aria-label="Mapa przetargów Wrocław — OpenStreetMap"
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
          gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        }}
      >
        {grid.tiles.map((t) => (
          <img
            key={`${t.x}-${t.y}`}
            src={osmTileUrl(t.x, t.y, grid.zoom)}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full block"
            style={{ gridColumn: t.col + 1, gridRow: t.row + 1 }}
          />
        ))}
      </div>
      {points.map((p) => {
        const { left, top } = mapPointToPercent(p.lat, p.lng, grid.bounds);
        const active = p.id === activeId;
        const color = p.blocked ? "#dc2626" : active ? "#2563eb" : "#16a34a";
        const size = active ? 14 : 11;
        return (
          <button
            key={p.id}
            type="button"
            title={`${p.label} · ${p.organizationName}\n${p.title}`}
            onClick={() => onSelect(p.id)}
            className="absolute z-10 p-0 border-0 bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-50%, -50%)",
            }}
            aria-label={`${p.label}, ${p.organizationName}`}
          >
            {active && (
              <span
                className="absolute rounded-full opacity-25"
                style={{
                  width: size + 12,
                  height: size + 12,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: color,
                }}
              />
            )}
            <span
              className="block rounded-full border-2 border-white shadow-md"
              style={{ width: size, height: size, backgroundColor: color }}
            />
          </button>
        );
      })}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        <p className="text-[9px] text-white/90">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline pointer-events-auto"
          >
            OpenStreetMap
          </a>
          {" · "}● zielony OK · ● czerwony wadium blokuje
        </p>
      </div>
    </div>
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
  const [open, setOpen] = useState(true);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const activeId = selectedId ?? localSelected;
  const profile = loadCompanyProfileLocal();

  const tileGrid = useMemo(
    () => buildOsmTileGrid(WROCLAW_CENTER.lat, WROCLAW_CENTER.lng, MAP_ZOOM, TILE_RADIUS),
    [],
  );

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
                <OsmMapWithMarkers
                  grid={tileGrid}
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
                    className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 border border-border text-[10px] text-primary hover:bg-background shadow-sm"
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

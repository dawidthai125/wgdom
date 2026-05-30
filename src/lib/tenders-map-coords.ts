import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export interface TenderMapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  organizationName: string;
  daysLeft: number | null;
  blocked: boolean;
}

const WROCLAW = { lat: 51.1079, lng: 17.0385 };

const KNOWN: { re: RegExp; lat: number; lng: number; label: string }[] = [
  { re: /mops|strzegomsk/i, lat: 51.1098, lng: 17.0175, label: "MOPS" },
  { re: /kamieńskiego\s*190/i, lat: 51.1092, lng: 16.9498, label: "Kamieńskiego" },
  { re: /owsian/i, lat: 51.1285, lng: 17.0452, label: "Owsiana" },
  { re: /pretficza|zus/i, lat: 51.0985, lng: 17.0345, label: "Pretficza/ZUS" },
  { re: /oławsk/i, lat: 51.0955, lng: 17.0325, label: "Oławska" },
  { re: /ziębick|gazow|dożg|dozg/i, lat: 51.085, lng: 17.055, label: "DOZG" },
  { re: /wańkowicz/i, lat: 51.085, lng: 17.02, label: "Wańkowicza" },
  { re: /jutrzenk/i, lat: 51.075, lng: 17.0, label: "Jutrzenki" },
  { re: /mpwik/i, lat: 51.102, lng: 17.045, label: "MPWiK" },
  { re: /poświęck/i, lat: 51.1185, lng: 17.062, label: "Poświęcka" },
];

function hashJitter(id: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = (h % 1000) / 1000 - 0.5;
  const b = ((h >> 10) % 1000) / 1000 - 0.5;
  return { lat: a * 0.04, lng: b * 0.06 };
}

function extractStreet(title: string): string | null {
  const m = title.match(/ul\.?\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s.-]{3,40}\d*)/i);
  return m?.[0] ?? null;
}

export function tenderMapPoint(
  item: TenderPipelineItem,
  opts?: { blocked?: boolean; daysLeft?: number | null },
): TenderMapPoint | null {
  if (!item.isWroclaw && !/wrocław|wroclaw/i.test(item.organizationCity)) return null;

  const hay = `${item.title} ${item.organizationName} ${item.organizationCity}`;
  for (const k of KNOWN) {
    if (k.re.test(hay)) {
      const j = hashJitter(item.id);
      return {
        id: item.id,
        lat: k.lat + j.lat * 0.3,
        lng: k.lng + j.lng * 0.3,
        label: k.label,
        title: item.title,
        organizationName: item.organizationName,
        daysLeft: opts?.daysLeft ?? null,
        blocked: opts?.blocked ?? false,
      };
    }
  }

  const street = extractStreet(item.title);
  const j = hashJitter(item.id);
  return {
    id: item.id,
    lat: WROCLAW.lat + j.lat,
    lng: WROCLAW.lng + j.lng,
    label: street ?? item.organizationCity ?? "Wrocław",
    title: item.title,
    organizationName: item.organizationName,
    daysLeft: opts?.daysLeft ?? null,
    blocked: opts?.blocked ?? false,
  };
}

export function buildStaticMapUrl(points: TenderMapPoint[], selectedId?: string | null): string {
  if (points.length === 0) return "";
  const markers = points.slice(0, 18).map((p) => {
    const color = p.id === selectedId ? "blue" : p.blocked ? "red" : "green";
    return `${p.lat},${p.lng},${color}`;
  }).join("|");
  const center = points[0];
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${center.lat},${center.lng}&zoom=11&size=640x320&markers=${encodeURIComponent(markers)}`;
}

export function osmLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}

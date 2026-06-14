/** Parsowanie adresu roboty na zmienne szablonów WM. */

export interface WmPrintAddressParts {
  street: string;
  building: string;
  apartment: string;
  fullAddress: string;
}

export function parseJobAddressParts(address: string, flatNumber: string): WmPrintAddressParts {
  const apt = (flatNumber ?? "").trim();
  const raw = (address ?? "").trim();

  if (!raw) {
    return { street: "", building: "", apartment: apt, fullAddress: apt ? `/${apt}` : "" };
  }

  const tokens = raw.split(/\s+/);
  let building = "";
  let street = raw;

  const last = tokens[tokens.length - 1];
  if (/^\d+[a-zA-Z]?$/.test(last) && tokens.length > 1) {
    building = last;
    street = tokens.slice(0, -1).join(" ");
  }

  const fullAddress = apt
    ? building
      ? `${street} ${building}/${apt}`
      : `${street}/${apt}`
    : building
      ? `${street} ${building}`
      : street;

  return { street, building, apartment: apt, fullAddress };
}

export function wmPrintZipBaseName(address: string, flatNumber: string): string {
  const { street, building, apartment } = parseJobAddressParts(address, flatNumber);
  const parts = [street, building, apartment]
    .map((p) =>
      p
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .toUpperCase(),
    )
    .filter(Boolean);
  return parts.join("_") || "ROBOTA";
}

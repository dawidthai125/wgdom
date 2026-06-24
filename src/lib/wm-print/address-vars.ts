/** Parsowanie adresu roboty na zmienne szablonów WM. */

export interface WmPrintAddressParts {
  street: string;
  building: string;
  apartment: string;
  fullAddress: string;
}

const BUILDING_NUM = String.raw`\d+[a-zA-Z]?`;

/** building/apartment: „Wyszyńskiego 12A/7” */
const RE_BUILDING_SLASH_APT = new RegExp(
  String.raw`^(.+?)\s+(${BUILDING_NUM})\s*/\s*(\S+)$`,
);

/** building + lokator: „26 m.3”, „26 lok 3”, „26 mieszkanie 3” … */
const RE_BUILDING_WITH_APT = new RegExp(
  String.raw`^(.+?)\s+(${BUILDING_NUM})\s+(?:m\.?\s*|lok\.?\s*|mieszkanie\s+|mieszk\.?\s*)(${BUILDING_NUM})$`,
  "i",
);

/** sam numer budynku na końcu: „Gorlicka 26”, „Wrocławska 5B” */
const RE_BUILDING_ONLY = new RegExp(String.raw`^(.+?)\s+(${BUILDING_NUM})$`);

function buildFullAddress(street: string, building: string, apartment: string): string {
  if (apartment) {
    return building ? `${street} ${building}/${apartment}` : `${street}/${apartment}`;
  }
  return building ? `${street} ${building}` : street;
}

function finalizeParts(
  street: string,
  building: string,
  apartmentFromAddress: string,
  flatNumber: string,
): WmPrintAddressParts {
  const streetTrim = street.trim();
  const buildingTrim = building.trim();
  const aptFromAddr = apartmentFromAddress.trim();
  const aptFromParam = (flatNumber ?? "").trim();
  const apartment = aptFromAddr || aptFromParam;

  return {
    street: streetTrim,
    building: buildingTrim,
    apartment,
    fullAddress: buildFullAddress(streetTrim, buildingTrim, apartment),
  };
}

export function parseJobAddressParts(address: string, flatNumber: string): WmPrintAddressParts {
  const aptFromParam = (flatNumber ?? "").trim();
  const raw = (address ?? "").trim().replace(/\s+/g, " ");

  if (!raw) {
    return {
      street: "",
      building: "",
      apartment: aptFromParam,
      fullAddress: aptFromParam ? `/${aptFromParam}` : "",
    };
  }

  const slash = raw.match(RE_BUILDING_SLASH_APT);
  if (slash) {
    return finalizeParts(slash[1], slash[2], slash[3], flatNumber);
  }

  const withApt = raw.match(RE_BUILDING_WITH_APT);
  if (withApt) {
    return finalizeParts(withApt[1], withApt[2], withApt[3], flatNumber);
  }

  const buildingOnly = raw.match(RE_BUILDING_ONLY);
  if (buildingOnly) {
    return finalizeParts(buildingOnly[1], buildingOnly[2], "", flatNumber);
  }

  return finalizeParts(raw, "", "", flatNumber);
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

export const HOUSING_TYPES = ["zamienny", "komunalny", "repatrianci"] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  zamienny: "Zamienny",
  komunalny: "Socjalny",
  repatrianci: "Repatrianci",
};

export const STOVE_TYPES = ["gazowa", "elektryczna", "dwupalnik"] as const;
export type StoveType = (typeof STOVE_TYPES)[number];

/** Krótkie etykiety na przyciski w formularzu */
export const STOVE_TYPE_LABELS: Record<StoveType, string> = {
  gazowa: "Gaz",
  elektryczna: "Elektr.",
  dwupalnik: "2 paln.",
};

export const STOVE_TYPE_LABELS_FULL: Record<StoveType, string> = {
  gazowa: "Kuchenka gazowa",
  elektryczna: "Kuchenka elektryczna",
  dwupalnik: "Dwupalnik",
};

export const GAS_FURNACE_STATUSES = ["zostaje", "wymiana", "brak"] as const;
export type GasFurnaceStatus = (typeof GAS_FURNACE_STATUSES)[number];

export const GAS_FURNACE_STATUS_LABELS: Record<GasFurnaceStatus, string> = {
  zostaje: "Zostaje",
  wymiana: "Wymiana",
  brak: "Brak",
};

export type JobMetaFields = {
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
  gasFurnaceStatus?: GasFurnaceStatus | "";
};

export function isJobHousingSet(job: JobMetaFields): job is JobMetaFields & { housingType: HousingType } {
  return HOUSING_TYPES.includes(job.housingType as HousingType);
}

export function normalizeJobMetaFields<T extends JobMetaFields>(job: T): T {
  const housingType = HOUSING_TYPES.includes(job.housingType as HousingType) ? job.housingType : "";
  const stoveType = STOVE_TYPES.includes(job.stoveType as StoveType) ? job.stoveType : "";
  const gasFurnaceStatus = GAS_FURNACE_STATUSES.includes(job.gasFurnaceStatus as GasFurnaceStatus)
    ? job.gasFurnaceStatus
    : "";
  if (
    housingType === job.housingType
    && stoveType === job.stoveType
    && gasFurnaceStatus === job.gasFurnaceStatus
  ) {
    return job;
  }
  return { ...job, housingType, stoveType, gasFurnaceStatus };
}

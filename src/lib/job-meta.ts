export const HOUSING_TYPES = ["zamienny", "komunalny", "repatrianci"] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  zamienny: "Zamienny",
  komunalny: "Komunalny",
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

export type JobMetaFields = {
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
};

export function isJobHousingSet(job: JobMetaFields): job is JobMetaFields & { housingType: HousingType } {
  return HOUSING_TYPES.includes(job.housingType as HousingType);
}

export function normalizeJobMetaFields<T extends JobMetaFields>(job: T): T {
  const housingType = HOUSING_TYPES.includes(job.housingType as HousingType) ? job.housingType : "";
  const stoveType = STOVE_TYPES.includes(job.stoveType as StoveType) ? job.stoveType : "";
  if (housingType === job.housingType && stoveType === job.stoveType) return job;
  return { ...job, housingType, stoveType };
}

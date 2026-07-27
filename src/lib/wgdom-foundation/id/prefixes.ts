import type { IdType } from "./types";

/**
 * SSOT prefiksów ID (FOUNDATION-03 / FND-01).
 * PublicId = `${PREFIX[type]}${ulid}` — prefiks zawiera trailing `_`.
 */
export const PREFIX: Record<IdType, string> = {
  snapshot: "snap_",
  recipe: "rec_",
  variant: "var_",
  productKey: "pk_",
  observation: "obs_",
  aggregate: "agg_",
  analysis: "an_",
  offerBoq: "obq_",
  bid: "bid_",
  decision: "dec_",
  start: "str_",
  projectCase: "case_",
  event: "evt_",
  foundation: "fnd_",
};

export const ID_TYPES = Object.keys(PREFIX) as IdType[];

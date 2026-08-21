/**
 * IK-HISTORICAL-EXECUTED-ATH — public exports.
 *
 * Authority isolation: this package must never call Owner VERIFY approve/reject,
 * Catalog persist helpers, or write-router modules.
 */

export * from "./historical-executed-types";
export * from "./historical-executed-normalize";
export * from "./historical-executed-index";
export * from "./historical-executed-lookup";
export * from "./historical-executed-discover";
export * from "./historical-executed-host-hydrate";
export * from "./use-historical-executed-host-index";

export const HISTORICAL_EXECUTED_IMPLEMENTED = true as const;
export const HISTORICAL_EXECUTED_AUTHORITY = false as const;
export const HISTORICAL_EXECUTED_HOST_HYDRATE = true as const;

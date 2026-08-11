/**
 * DEMAND-RESEARCH-01 S0 — PriceCandidate staging (pre-ACCEPT).
 * NIE jest SSOT · in-memory przed ACCEPT.
 */

export type ManualResearchProviderId = "leroy" | "castorama" | "obi" | "other";

export type PriceCandidateSourceType = "market_reference";

export interface PriceCandidate {
  candidateId: string;
  demandId: string;
  provider: ManualResearchProviderId;
  sourceType: PriceCandidateSourceType;
  name: string;
  unit: string;
  priceNet: number;
  currency: "PLN";
  priceDate: string;
  sourceUrl?: string;
  ean?: string;
  providerSku?: string;
  retrievedAt: string;
  /** manual_owner = Owner-entered · mock_test = Stage B TEST/MOCK (never prod seed). */
  provenance: "manual_owner" | "mock_test";
  notes?: string;
  materialKey: string;
  catalogWorkId: string;
  region: string;
}

export interface ManualPriceResearchFormInput {
  demandId: string;
  materialKey: string;
  catalogWorkId: string | null | undefined;
  region: string;
  provider: ManualResearchProviderId;
  name: string;
  unit: string;
  priceNet: number | string;
  priceDate: string;
  sourceUrl?: string;
  ean?: string;
  providerSku?: string;
  notes?: string;
  retrievedAt?: string;
}

export type ManualPriceResearchValidationError =
  | "missing_name"
  | "missing_unit"
  | "invalid_price"
  | "missing_price_date"
  | "missing_demand_id"
  | "missing_material_key"
  | "missing_catalog_work_id";

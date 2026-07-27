/**
 * Typy ID Foundation (FND-01a).
 * Branded helpers — walidacja + brand; bez generatora ULID.
 */

export type IdType =
  | "snapshot"
  | "recipe"
  | "variant"
  | "productKey"
  | "observation"
  | "aggregate"
  | "analysis"
  | "offerBoq"
  | "bid"
  | "decision"
  | "start"
  | "projectCase"
  | "event"
  | "foundation";

export type SnapshotId = string & { readonly __brand: "SnapshotId" };
export type RecipeId = string & { readonly __brand: "RecipeId" };
export type VariantId = string & { readonly __brand: "VariantId" };
export type ProductKeyId = string & { readonly __brand: "ProductKeyId" };
export type ObservationId = string & { readonly __brand: "ObservationId" };
export type AggregateId = string & { readonly __brand: "AggregateId" };
export type AnalysisId = string & { readonly __brand: "AnalysisId" };
export type OfferBoqId = string & { readonly __brand: "OfferBoqId" };
export type BidId = string & { readonly __brand: "BidId" };
export type DecisionId = string & { readonly __brand: "DecisionId" };
export type StartId = string & { readonly __brand: "StartId" };
export type ProjectCaseId = string & { readonly __brand: "ProjectCaseId" };
export type EventId = string & { readonly __brand: "EventId" };
export type FoundationId = string & { readonly __brand: "FoundationId" };

export type BrandedId =
  | SnapshotId
  | RecipeId
  | VariantId
  | ProductKeyId
  | ObservationId
  | AggregateId
  | AnalysisId
  | OfferBoqId
  | BidId
  | DecisionId
  | StartId
  | ProjectCaseId
  | EventId
  | FoundationId;

export const FND_ID_INVALID = "FND_ID_INVALID";

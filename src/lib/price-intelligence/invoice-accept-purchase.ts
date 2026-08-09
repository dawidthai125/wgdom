/**
 * P0 — Owner ACCEPT → COMPANY PURCHASE (kw-offer-boq-company-knowledge).
 * REUSE recordCompanyKnowledgeDecision · NIE marketQuotes · NIE nowe KV.
 */

import {
  loadCompanyKnowledgeStoreLocal,
  recordCompanyKnowledgeDecision,
  saveCompanyKnowledgeStoreLocal,
  type CompanyKnowledgeStore,
} from "@/lib/tender-offer-boq-company-knowledge";
import type { OfferBoqPricedComponent } from "@/lib/tender-offer-boq";
import type { MappedInvoicePurchaseCandidate } from "./invoice-types";

export const COMPANY_PURCHASE_INVOICE_ORIGIN_LABEL = "COMPANY PURCHASE · faktura W&G DOM";

function provenanceLabel(c: MappedInvoicePurchaseCandidate): string {
  const p = c.observation.provenance;
  const code = p.productCode ? ` · kod ${p.productCode}` : "";
  const disc =
    typeof p.discountPct === "number" && p.discountPct > 0 ? ` · upust ${p.discountPct}%` : "";
  return (
    `${COMPANY_PURCHASE_INVOICE_ORIGIN_LABEL} · ${p.invoiceRef} · ${p.supplier}` +
    ` · ${p.invoiceDate}${code}${disc} · ${c.parsed.productName}`
  );
}

function toPricedComponent(c: MappedInvoicePurchaseCandidate): OfferBoqPricedComponent | null {
  const m = c.mapping;
  if (m.status !== "mapped" || !m.purchaseNamePl || !m.purchaseUnit) return null;
  if (!(typeof m.purchaseUnitPricePln === "number" && m.purchaseUnitPricePln > 0)) return null;
  const qty = m.purchaseQuantity ?? c.observation.quantity;
  return {
    componentId: c.observation.observationId,
    namePl: m.purchaseNamePl,
    category: "material",
    quantity: qty > 0 ? qty : 1,
    unit: m.purchaseUnit,
    unitPricePln: m.purchaseUnitPricePln,
    totalPln: Math.round(m.purchaseUnitPricePln * (qty > 0 ? qty : 1) * 100) / 100,
    priceOrigin: {
      kind: "company_knowledge",
      refId: c.product.productIdentityKey,
      labelPl: provenanceLabel(c),
      externalProviderId: "wgdom_invoice",
      asOf: c.observation.provenance.invoiceDate,
    },
    confidence: "high",
    aiRationale: "Owner ACCEPT · COMPANY PURCHASE z faktury W&G DOM (nie marketQuotes).",
    requiresUserReview: false,
    editStatus: "user_approved",
  };
}

export interface AcceptInvoicePurchaseResult {
  store: CompanyKnowledgeStore;
  accepted: number;
  skipped: number;
  skippedReasons: string[];
  changed: boolean;
}

/**
 * Zapisuje TYLKO kandydatów status=mapped (Owner ACCEPT).
 * UNMATCHED / NEEDS_REVIEW — pomijane (bez auto-write).
 */
export function acceptInvoicePurchaseCandidates(
  store: CompanyKnowledgeStore,
  candidates: readonly MappedInvoicePurchaseCandidate[],
  opts?: { observedAtOverride?: string },
): AcceptInvoicePurchaseResult {
  let next = store;
  let accepted = 0;
  let skipped = 0;
  const skippedReasons: string[] = [];
  let changed = false;

  for (const c of candidates) {
    if (c.mapping.status !== "mapped") {
      skipped += 1;
      skippedReasons.push(
        `${c.parsed.productName}: ${c.mapping.status} — ${c.mapping.reasonPl}`,
      );
      continue;
    }
    const component = toPricedComponent(c);
    if (!component) {
      skipped += 1;
      skippedReasons.push(`${c.parsed.productName}: brak kompletnego mapowania Purchase`);
      continue;
    }
    const fieldsChanged = [
      `invoiceRef:${c.observation.provenance.invoiceRef}`,
      `supplier:${c.observation.provenance.supplier}`,
      `productIdentityKey:${c.product.productIdentityKey}`,
      `materialKey:${c.mapping.materialKey ?? ""}`,
      `unit:${c.mapping.purchaseUnit ?? ""}`,
      `qty:${c.mapping.purchaseQuantity ?? c.observation.quantity}`,
      `netUnitPrice:${c.mapping.purchaseUnitPricePln}`,
      ...(c.observation.provenance.productCode
        ? [`productCode:${c.observation.provenance.productCode}`]
        : []),
      ...(c.observation.provenance.discountPct
        ? [`discountPct:${c.observation.provenance.discountPct}`]
        : []),
      ...(c.observation.provenance.ksefId ? [`ksefId:${c.observation.provenance.ksefId}`] : []),
      ...(c.product.manufacturer ? [`manufacturer:${c.product.manufacturer}`] : []),
    ];
    next = recordCompanyKnowledgeDecision(next, {
      component,
      decision: "approved",
      fromAi: false,
      fieldsChanged,
      observedAt: opts?.observedAtOverride ?? c.observation.observedAt,
    });
    accepted += 1;
    changed = true;
  }

  return { store: next, accepted, skipped, skippedReasons, changed };
}

/** Local I/O — jeden zapis store po batch ACCEPT (nie per linia do chmury). */
export function acceptInvoicePurchaseCandidatesLocal(
  candidates: readonly MappedInvoicePurchaseCandidate[],
  opts?: { observedAtOverride?: string; persist?: boolean },
): AcceptInvoicePurchaseResult {
  const result = acceptInvoicePurchaseCandidates(
    loadCompanyKnowledgeStoreLocal(),
    candidates,
    opts,
  );
  if (opts?.persist !== false && result.changed) {
    saveCompanyKnowledgeStoreLocal(result.store);
  }
  return result;
}

/**
 * Potwierdzenie semantyki: ten tor NIE zapisuje marketQuotes.
 * (Guard dokumentacyjny + testowy — brak API write Quotes.)
 */
export function invoiceAcceptWritesMarketQuotes(): false {
  return false;
}

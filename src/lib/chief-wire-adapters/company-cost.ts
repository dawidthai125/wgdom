/**
 * CompanyCostRo — projekcja pól z profilu firmy + company knowledge.
 * READ ONLY · bez kalkulatora Real Cost / Bid.
 */

import type { CompanyCostRo } from "@/lib/cost-expert";
import { loadCompanyKnowledgeStoreLocal } from "@/lib/tender-offer-boq-company-knowledge";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import type { BuildChiefCompanyCostRoResult, ChiefWireAdapterGap } from "./types";

function projectPurchaseByMaterialKey(): CompanyCostRo["purchaseByMaterialKey"] {
  const store = loadCompanyKnowledgeStoreLocal();
  const out: Record<string, { unitPricePln: number; labelPl?: string }> = {};
  for (const entry of store.entries) {
    const price = entry.lastUnitPricePln ?? entry.avgUnitPricePln;
    if (typeof price !== "number" || !Number.isFinite(price)) continue;
    out[entry.entryId] = {
      unitPricePln: price,
      labelPl: entry.namePl,
    };
  }
  return Object.freeze(out);
}

export function buildChiefCompanyCostRo(): BuildChiefCompanyCostRoResult {
  const gaps: ChiefWireAdapterGap[] = [];
  const profile = loadCompanyProfileLocal();
  const cm = profile.costModel;

  let defaultLaborPlnPerHour = cm.avgGrossHourlyPln;
  if (!Number.isFinite(defaultLaborPlnPerHour) || defaultLaborPlnPerHour <= 0) {
    defaultLaborPlnPerHour = 0;
    gaps.push({
      code: "COMPANY_LABOR_MISSING",
      field: "company.defaultLaborPlnPerHour",
      messagePl: "avgGrossHourlyPln brakujący lub ≤ 0 — użyto 0.",
      severity: "warn",
    });
  }

  const kpPct = Number.isFinite(cm.kpPct) ? cm.kpPct : 0;
  const auxiliaryPctOfDirect = kpPct / 100;

  gaps.push({
    code: "COMPANY_INTERNAL_OVERHEAD_UNMAPPED",
    field: "company.internalOverheadPct",
    messagePl:
      "internalOverheadPct = 0 — fixedOverheadMonthlyPln nie mapujemy na % w tym EPIC.",
    severity: "info",
  });

  gaps.push({
    code: "COMPANY_EQUIPMENT_RATES_UNMAPPED",
    field: "company.equipmentRateByKey",
    messagePl: "Brak źródła stawek sprzętu — equipmentRateByKey = {}.",
    severity: "info",
  });

  const purchaseByMaterialKey = projectPurchaseByMaterialKey();
  if (Object.keys(purchaseByMaterialKey).length === 0) {
    gaps.push({
      code: "COMPANY_PURCHASE_EMPTY",
      field: "company.purchaseByMaterialKey",
      messagePl: "Brak cen purchase w company knowledge (pusta mapa).",
      severity: "warn",
    });
  }

  const company: CompanyCostRo = Object.freeze({
    purchaseByMaterialKey,
    defaultLaborPlnPerHour,
    auxiliaryPctOfDirect,
    internalOverheadPct: 0,
    equipmentRateByKey: Object.freeze({}),
  });

  return {
    company,
    gaps,
    companyKnowledge: "kw-offer-boq-company-knowledge",
  };
}

/** Dopasowanie przetargu do profilu firmy, kryteria punktacji, szacunek szans. */

import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { profileKnownBuyerKeywords } from "@/lib/tenders-bzp-company";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln, stripHtmlToText } from "@/lib/tenders-bzp-swz";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-doc-parse";

export type TenderRequirementStatus = "met" | "partial" | "gap" | "unknown";

export interface TenderRequirementCheck {
  id: string;
  category: string;
  label: string;
  required: string;
  companyHas: string;
  status: TenderRequirementStatus;
  impact: "high" | "medium" | "low";
  tip?: string;
}

export interface TenderAwardCriterion {
  name: string;
  weightPct: number | null;
  maxPoints: number | null;
  description: string;
}

export type TenderFitLabel = "strong" | "possible" | "weak" | "unknown";

export interface TenderFitAssessment {
  fitScore: number;
  fitLabel: TenderFitLabel;
  winChancePct: number | null;
  winChanceNote: string;
  requirementChecks: TenderRequirementCheck[];
  awardCriteria: TenderAwardCriterion[];
  priceWeightPct: number | null;
  tips: string[];
  blockingIssues: string[];
  assessedAt: string;
}

export const FIT_LABELS: Record<TenderFitLabel, string> = {
  strong: "Dobry profil",
  possible: "Do rozważenia",
  weak: "Słabe dopasowanie",
  unknown: "Brak danych",
};

function fold(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function parsePlnFromFragment(raw: string): number | null {
  const m = raw.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*(?:zł|PLN|pln)/i)
    || raw.match(/([\d\s]{2,12})/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Wyciąga wymaganą wartość referencji z tekstu SWZ. */
export function extractRequiredReferencePln(text: string): number | null {
  const folded = fold(text);
  const patterns = [
    /co najmniej\s+([\d\s.,]+)\s*(?:zł|pln)/i,
    /warto[sś][ćc]\s+(?:co najmniej\s+)?([\d\s.,]+)\s*(?:zł|pln)/i,
    /referencj[^.]{0,80}([\d\s.,]+)\s*(?:zł|pln)/i,
    /do[sś]wiadczen[^.]{0,80}([\d\s.,]+)\s*(?:zł|pln)/i,
    /wykonan[^.]{0,60}robot[^.]{0,60}([\d\s.,]+)\s*(?:zł|pln)/i,
  ];
  let best: number | null = null;
  for (const p of patterns) {
    const m = folded.match(p);
    if (m?.[1]) {
      const v = parsePlnFromFragment(m[1]);
      if (v != null && (best == null || v > best)) best = v;
    }
  }
  return best;
}

/** Wyciąga wymaganą sumę ubezpieczenia OC z tekstu. */
export function extractRequiredOcPln(text: string): number | null {
  const m = text.match(/polisa[^.]{0,80}(?:OC|o\.c\.)[^.]{0,80}([\d\s.,]+)\s*(?:zł|PLN|pln|tys)/i)
    || text.match(/ubezpieczen[^.]{0,60}([\d\s.,]+)\s*(?:zł|PLN|pln|tys)/i);
  if (!m?.[1]) return null;
  let v = parsePlnFromFragment(m[1]);
  if (v != null && /tys/i.test(m[0])) v *= 1000;
  return v;
}

/** Kryteria oceny ofert / punktacja z SWZ lub ogłoszenia. */
export function extractAwardCriteria(text: string): TenderAwardCriterion[] {
  const folded = text.replace(/\s+/g, " ");
  const criteria: TenderAwardCriterion[] = [];
  const seen = new Set<string>();

  const add = (name: string, weightPct: number | null, maxPoints: number | null, description: string) => {
    const key = `${fold(name)}|${weightPct}`;
    if (seen.has(key)) return;
    seen.add(key);
    criteria.push({ name, weightPct, maxPoints, description: description.slice(0, 280) });
  };

  if (/najniższ[aą]\s+cen[aą]/i.test(folded) && criteria.length === 0) {
    add("Cena oferty (najniższa cena)", 100, null, "Wyłącznie cena — najtańsza oferta wygrywa.");
  }

  const weightPairs = [
    ...folded.matchAll(/([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s/\-–—]{3,60}?)\s*[-–—:]\s*(\d{1,3})\s*%/g),
    ...folded.matchAll(/(\d{1,3})\s*%\s*[-–—]\s*([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s/\-–—]{3,60})/g),
  ];
  for (const m of weightPairs) {
    const a = m[1].trim();
    const b = m[2].trim();
    const isFirstNum = /^\d{1,3}$/.test(a);
    const weight = parseInt(isFirstNum ? a : b, 10);
    const label = isFirstNum ? b : a;
    if (weight < 1 || weight > 100) continue;
    if (label.length < 3) continue;
    if (/^(pkt|punkt|waga|udział)$/i.test(label)) continue;
    add(label.replace(/\s+/g, " "), weight, null, `${label} — waga ${weight}% w ocenie ofert.`);
  }

  const pointBlocks = [
    ...folded.matchAll(/([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s]{4,50}?)\s*[-–—:]\s*(\d{1,3})\s*punkt/gi),
    ...folded.matchAll(/(\d{1,3})\s*punkt(?:ów|y)?\s*[-–—:]\s*([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s]{4,50})/gi),
  ];
  for (const m of pointBlocks) {
    const pts = parseInt(/\d+/.exec(m[1])?.[0] || /\d+/.exec(m[2])?.[0] || "0", 10);
    const label = m[1].replace(/\d+\s*punkt.*/i, "").trim() || m[2].trim();
    if (pts < 1 || pts > 100 || label.length < 4) continue;
    add(label.replace(/\s+/g, " "), null, pts, `${label} — do ${pts} punktów.`);
  }

  if (/cena[^.]{0,40}(\d{1,3})\s*%/i.test(folded)) {
    const cm = folded.match(/cena[^.]{0,40}(\d{1,3})\s*%/i);
    if (cm) add("Cena oferty", parseInt(cm[1], 10), null, `Cena — ${cm[1]}% w kryteriach oceny.`);
  }

  return criteria.slice(0, 8);
}

export function derivePriceWeightPct(criteria: TenderAwardCriterion[]): number | null {
  const price = criteria.find((c) => /cen/i.test(c.name));
  if (price?.weightPct != null) return price.weightPct;
  if (criteria.length === 1 && criteria[0].weightPct != null) return criteria[0].weightPct;
  const total = criteria.reduce((s, c) => s + (c.weightPct ?? 0), 0);
  if (total >= 95 && total <= 105) {
    const p = criteria.find((c) => /cen/i.test(c.name));
    return p?.weightPct ?? null;
  }
  return null;
}

function regionMatch(item: TenderPipelineItem, profile: TenderCompanyProfile): boolean {
  if (item.isWroclaw) return true;
  const hay = fold(`${item.organizationCity} ${item.title} ${item.organizationProvince}`);
  return profile.regions.some((r) => hay.includes(fold(r)));
}

function knownClientMatch(item: TenderPipelineItem, profile: TenderCompanyProfile): {
  matched: boolean;
  label: string | null;
} {
  const hay = fold(`${item.organizationName} ${item.title} ${item.priorityBuyerLabel ?? ""}`);
  const keywords = profileKnownBuyerKeywords(profile);
  for (const kw of keywords) {
    const k = fold(kw);
    if (k.length >= 4 && hay.includes(k)) {
      return { matched: true, label: kw };
    }
  }
  return { matched: false, label: null };
}

function cpvMatch(item: TenderPipelineItem, profile: TenderCompanyProfile): "met" | "partial" | "unknown" {
  const cpv = (item.cpvCode || "").replace(/\D/g, "").slice(0, 6);
  if (!cpv) return "unknown";
  const prefix = cpv.slice(0, 3);
  if (profile.preferredCpvPrefixes.some((p) => cpv.startsWith(p.replace(/\D/g, "")))) return "met";
  if (["454", "452", "453", "507", "451"].includes(prefix)) return "partial";
  return "partial";
}

function strengthMatch(title: string, profile: TenderCompanyProfile): number {
  const t = fold(title);
  let hits = 0;
  for (const s of profile.strengths) {
    const parts = fold(s).split(/\s+/).filter((w) => w.length >= 4);
    if (parts.some((w) => t.includes(w))) hits += 1;
  }
  return hits;
}

function fitLabelFromScore(score: number, blocking: string[]): TenderFitLabel {
  if (blocking.length >= 2) return "weak";
  if (score >= 70) return "strong";
  if (score >= 45) return "possible";
  if (score >= 20) return "weak";
  return "unknown";
}

function buildCombinedText(item: TenderPipelineItem, swz: TenderSwzAnalysis | null | undefined): string {
  const parts: string[] = [];
  if (item.noticeHtml) parts.push(stripHtmlToText(item.noticeHtml));
  if (swz?.referenceRequirement) parts.push(swz.referenceRequirement);
  if (swz?.qualificationHints?.length) parts.push(swz.qualificationHints.join(" "));
  if (swz?.technicalRequirements?.length) parts.push(swz.technicalRequirements.join(" "));
  if (item.tenderDossier?.brief?.scopeDescription) parts.push(item.tenderDossier.brief.scopeDescription);
  for (const f of item.tenderDossier?.brief?.fields ?? []) {
    if (/kryter|punkt|ocen|wadium|referenc|ubezpiec|kwalifik/i.test(f.label)) {
      parts.push(`${f.label} ${f.value}`);
    }
  }
  const k = item.tenderDossier?.kosztorys;
  if (k?.ok) {
    if (k.title) parts.push(k.title);
    if (k.totalValue) parts.push(`Wartość kosztorysu ${k.totalValue} ${k.currency || "PLN"}`);
    for (const row of k.rows.slice(0, 80)) {
      if (row.description) parts.push(row.description);
    }
  }
  return parts.join("\n");
}

export function estimatedValuePlnFromItem(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): number | null {
  if (swz?.estimatedValuePln != null) return swz.estimatedValuePln;
  const k = item.tenderDossier?.kosztorys;
  if (k?.ok && k.totalValue) {
    return parsePlnFromKosztorysTotal(k.totalValue, k.currency);
  }
  return null;
}

export function assessTenderFit(
  item: TenderPipelineItem,
  profile: TenderCompanyProfile,
  opts?: { pipelineWinRate?: number | null },
): TenderFitAssessment {
  const swz = item.swzAnalysis;
  const combinedText = buildCombinedText(item, swz);
  const awardCriteria = extractAwardCriteria(combinedText);
  const priceWeightPct = derivePriceWeightPct(awardCriteria);
  const requiredRefPln = extractRequiredReferencePln(combinedText);
  const requiredOcPln = extractRequiredOcPln(combinedText);

  const checks: TenderRequirementCheck[] = [];
  const tips: string[] = [];
  const blockingIssues: string[] = [];
  let score = 40;

  // Trafność słów kluczowych
  score += Math.min(20, Math.round(item.relevanceScore * 0.5));
  if (item.priorityBuyerId) score += 5;
  if (item.isWroclaw) score += 8;

  const clientHit = knownClientMatch(item, profile);
  if (clientHit.matched) {
    score += 10;
    tips.push(`Znany zamawiający / referencja (${clientHit.label}) — macie doświadczenie we Wrocławiu.`);
  }

  // Doświadczenie marki (1989)
  const yearsOnMarket = new Date().getFullYear() - (profile.brandSinceYear || 1989);
  if (yearsOnMarket >= 30) score += 4;

  // Region
  const inRegion = regionMatch(item, profile);
  checks.push({
    id: "region",
    category: "Lokalizacja",
    label: "Region / miasto",
    required: item.organizationCity || item.organizationProvince || "—",
    companyHas: profile.regions.slice(0, 3).join(", "),
    status: inRegion ? "met" : "partial",
    impact: inRegion ? "low" : "medium",
    tip: inRegion ? undefined : "Sprawdź koszty dojazdu i logistyki poza głównym regionem.",
  });
  if (inRegion) score += 8;
  else score -= 5;

  // CPV
  const cpvSt = cpvMatch(item, profile);
  checks.push({
    id: "cpv",
    category: "CPV",
    label: "Kod CPV",
    required: item.cpvCode || "brak w ogłoszeniu",
    companyHas: profile.preferredCpvPrefixes.map((p) => `${p}xxx`).join(", "),
    status: cpvSt,
    impact: cpvSt === "met" ? "low" : "medium",
  });
  if (cpvSt === "met") score += 6;

  // Wartość zamówienia
  const estVal = estimatedValuePlnFromItem(item, swz);
  const estValSource = swz?.estimatedValuePln != null
    ? "SWZ"
    : (item.tenderDossier?.kosztorys?.ok && estVal != null ? "kosztorys ATH" : null);
  if (estVal != null) {
    let st: TenderRequirementStatus = "met";
    let tip: string | undefined;
    if (estVal < profile.minOrderValuePln) {
      st = "partial";
      tip = "Małe zamówienie — oceń opłacalność mobilizacji zespołu.";
      score -= 4;
    } else if (estVal > profile.maxOrderValuePln) {
      st = "gap";
      tip = "Wartość powyżej waszego limitu — rozważ konsorcjum lub podwykonawców.";
      blockingIssues.push(`Wartość ${fmtPln(estVal)} > limit ${fmtPln(profile.maxOrderValuePln)}`);
      score -= 15;
    } else score += 6;
    checks.push({
      id: "value",
      category: "Wartość",
      label: "Wartość zamówienia",
      required: fmtPln(estVal),
      companyHas: `${fmtPln(profile.minOrderValuePln)} – ${fmtPln(profile.maxOrderValuePln)}`,
      status: st,
      impact: st === "gap" ? "high" : "medium",
      tip: tip ?? (estValSource === "kosztorys ATH" ? "Wartość z sumy kosztorysu — zweryfikuj z SWZ." : undefined),
    });
  } else {
    checks.push({
      id: "value",
      category: "Wartość",
      label: "Wartość zamówienia",
      required: "Nie odczytano z SWZ",
      companyHas: `${fmtPln(profile.minOrderValuePln)} – ${fmtPln(profile.maxOrderValuePln)}`,
      status: "unknown",
      impact: "medium",
      tip: "Pobierz SWZ, kosztorys ATH lub uzupełnij szacunek ręcznie.",
    });
  }

  // Wadium
  const wadium = swz?.wadiumPln ?? null;
  if (wadium != null) {
    const ok = wadium <= profile.maxWadiumPln;
    checks.push({
      id: "wadium",
      category: "Wadium",
      label: "Wadium",
      required: fmtPln(wadium),
      companyHas: `do ${fmtPln(profile.maxWadiumPln)}`,
      status: ok ? "met" : "gap",
      impact: "high",
      tip: ok ? undefined : "Wadium przekracza wasz limit płynności — negocjuj lub rezygnuj.",
    });
    if (ok) score += 5;
    else {
      score -= 18;
      blockingIssues.push(`Wadium ${fmtPln(wadium)} > limit ${fmtPln(profile.maxWadiumPln)}`);
    }
  } else {
    checks.push({
      id: "wadium",
      category: "Wadium",
      label: "Wadium",
      required: swz?.wadiumRaw || "Nie odczytano",
      companyHas: `do ${fmtPln(profile.maxWadiumPln)}`,
      status: "unknown",
      impact: "high",
    });
  }

  // Referencje
  if (requiredRefPln != null) {
    const okSingle = requiredRefPln <= profile.referenceExperiencePln;
    const okTotal = requiredRefPln <= profile.totalReferencesPln;
    const st: TenderRequirementStatus = okSingle ? "met" : okTotal ? "partial" : "gap";
    checks.push({
      id: "references",
      category: "Referencje",
      label: "Wymagane doświadczenie",
      required: fmtPln(requiredRefPln),
      companyHas: `ref. ${fmtPln(profile.referenceExperiencePln)} · łącznie ${fmtPln(profile.totalReferencesPln)} (${profile.referenceCount} ref.)`,
      status: st,
      impact: "high",
      tip: st === "met" ? undefined : st === "partial"
        ? "Możecie łączyć kilka referencji — przygotuj zestawienie."
        : "Brakuje referencji o wymaganej wartości — ryzyko odrzucenia na etapie formalnym.",
    });
    if (st === "met") score += 10;
    else if (st === "partial") score -= 6;
    else {
      score -= 20;
      blockingIssues.push(`Referencje: wymagane ${fmtPln(requiredRefPln)}`);
    }
  } else if (swz?.referenceRequirement) {
    checks.push({
      id: "references",
      category: "Referencje",
      label: "Wymagane doświadczenie",
      required: swz.referenceRequirement.slice(0, 160),
      companyHas: `${profile.referenceCount} ref. · max ${fmtPln(profile.referenceExperiencePln)}`,
      status: "unknown",
      impact: "high",
      tip: "Porównaj ręcznie z waszymi referencjami w profilu firmy.",
    });
  }

  // Termin realizacji
  const implDays = swz?.implementationDays ?? null;
  if (implDays != null) {
    const ok = implDays >= profile.minProjectDays;
    checks.push({
      id: "deadline",
      category: "Termin",
      label: "Czas realizacji",
      required: `${implDays} dni`,
      companyHas: `min. ${profile.minProjectDays} dni · max ${profile.maxConcurrentProjects} robót równolegle`,
      status: ok ? "met" : "partial",
      impact: ok ? "low" : "high",
      tip: ok ? undefined : "Krótki termin — sprawdź dostępność ekip i harmonogram.",
    });
    if (ok) score += 4;
    else score -= 10;
  }

  // Ubezpieczenie OC
  if (requiredOcPln != null) {
    const ok = profile.ocInsuranceMinPln >= requiredOcPln;
    checks.push({
      id: "insurance",
      category: "Ubezpieczenie",
      label: "Polisa OC",
      required: fmtPln(requiredOcPln),
      companyHas: fmtPln(profile.ocInsuranceMinPln),
      status: ok ? "met" : "gap",
      impact: "high",
      tip: ok ? undefined : "Podnieś sumę ubezpieczenia lub uzupełnij polisę przed ofertą.",
    });
    if (ok) score += 4;
    else {
      score -= 12;
      blockingIssues.push(`OC: wymagane ${fmtPln(requiredOcPln)}`);
    }
  }

  // Kwalifikacje / licencje (heurystyka)
  const qualText = (swz?.qualificationHints ?? []).join(" ");
  if (qualText) {
    const matched = profile.licenses.filter((l) => qualText.toLowerCase().includes(l.slice(0, 8).toLowerCase()));
    checks.push({
      id: "qualifications",
      category: "Kwalifikacje",
      label: "Wymagania formalne",
      required: qualText.slice(0, 180),
      companyHas: profile.licenses.join("; "),
      status: matched.length > 0 ? "partial" : "unknown",
      impact: "medium",
      tip: "Zweryfikuj wpisy i uprawnienia w pełnej SWZ.",
    });
  }

  // Nasz szacunek vs wartość
  if (estVal != null && item.ourEstimatePln != null) {
    const ratio = item.ourEstimatePln / estVal;
    let st: TenderRequirementStatus = "met";
    let tip: string | undefined;
    if (ratio > 1.12) {
      st = "gap";
      tip = "Szacunek wyższy niż wartość zamówienia — ryzyko nieopłacalności.";
      score -= 8;
    } else if (ratio <= 0.92) {
      st = "met";
      tip = "Szacunek poniżej wartości SWZ — margines na star (przy kryterium ceny).";
      score += 8;
    } else {
      st = "partial";
      tip = "Szacunek blisko wartości SWZ — mały margines.";
    }
    checks.push({
      id: "estimate",
      category: "Wycena",
      label: "Nasz szacunek vs SWZ",
      required: fmtPln(estVal),
      companyHas: fmtPln(item.ourEstimatePln),
      status: st,
      impact: "high",
      tip,
    });
  }

  // Opłacalność SWZ
  if (swz?.profitabilityHint === "good") score += 6;
  else if (swz?.profitabilityHint === "risky") score -= 10;

  // Specjalizacja vs tytuł
  const strHits = strengthMatch(item.title, profile);
  if (strHits >= 2) score += 8;
  else if (strHits === 1) score += 4;

  // Kryterium ceny — podpowiedź
  if (priceWeightPct != null && priceWeightPct >= 80) {
    tips.push(`Kryterium ceny: ${priceWeightPct}% — kluczowa konkurencyjna wycena. Przygotuj dokładny kosztorys.`);
    if (item.ourEstimatePln == null) tips.push("Uzupełnij „Nasz szacunek” — system oceni margines na star.");
  } else if (priceWeightPct != null && priceWeightPct < 60) {
    tips.push(`Cena to tylko ${priceWeightPct}% — ważne referencje, termin i parametry jakościowe.`);
  }

  if (awardCriteria.length === 0) {
    tips.push("Nie wykryto tabeli punktacji w ogłoszeniu — sprawdź SWZ sekcję „Kryteria oceny ofert”.");
  }

  if (blockingIssues.length === 0 && score >= 55 && !item.ourEstimatePln) {
    tips.push("Uzupełnij profil firmy (zakładka u góry) i „Nasz szacunek” dla dokładniejszej oceny szans.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const hasAnalysisBasis = swz != null || estVal != null || item.tenderDossier?.kosztorys?.ok;
  const fitLabel = hasAnalysisBasis ? fitLabelFromScore(score, blockingIssues) : "unknown";

  // Szacunek szans
  let winChance: number | null = null;
  let winChanceNote = "Rozwiń przetarg i poczekaj na analizę SWZ lub kosztorysu.";
  if (hasAnalysisBasis) {
    let wc = score * 0.75;
    if (priceWeightPct != null && priceWeightPct >= 85 && item.ourEstimatePln != null && estVal != null) {
      if (item.ourEstimatePln <= estVal * 0.95) wc += 12;
      else if (item.ourEstimatePln > estVal * 1.08) wc -= 15;
    }
    if (opts?.pipelineWinRate != null) {
      wc = wc * 0.82 + opts.pipelineWinRate * 0.18;
    }
    if (blockingIssues.length > 0) wc -= blockingIssues.length * 12;
    if (item.priorityBuyerId && inRegion) wc += 5;
    winChance = Math.max(5, Math.min(85, Math.round(wc)));
    if (blockingIssues.length >= 2) {
      winChanceNote = "Niskie szanse — kilka wymagań poza profilem firmy.";
    } else if (!swz?.estimatedValuePln && estVal != null) {
      winChanceNote = "Szacunek na podstawie kosztorysu — zweryfikuj wartość w SWZ.";
    } else if (winChance >= 60) {
      winChanceNote = "Dobre dopasowanie — warto przygotować ofertę i kosztorys.";
    } else if (winChance >= 40) {
      winChanceNote = "Średnie szanse — przeanalizuj luki w tabeli poniżej.";
    } else {
      winChanceNote = "Niskie szanse — rozważ rezygnację lub konsorcjum.";
    }
  }

  return {
    fitScore: score,
    fitLabel,
    winChancePct: winChance,
    winChanceNote,
    requirementChecks: checks,
    awardCriteria,
    priceWeightPct,
    tips,
    blockingIssues,
    assessedAt: new Date().toISOString(),
  };
}

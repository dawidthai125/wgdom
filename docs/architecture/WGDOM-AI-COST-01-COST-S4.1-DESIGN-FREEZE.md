# WGDOM — AI-COST-01 / COST-S4.1 DESIGN FREEZE (Explainability + RO UI)

> **ID:** COST-S4.1  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-27)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S4 `2.65.55` / `b321867`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: panel RO Explainability — zaufanie do AI bez edycji i bez przebudowy silników
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S4.1)
```

---

## 1. Cel

Użytkownik widzi **dlaczego** AI wyceniło pozycję, z czego składa się koszt i co wymaga weryfikacji. Budowa zaufania — nie edycja.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-explainability.ts` | **NOWY** — ViewModel RO (orkiestracja call-only S1–S4) |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | **NOWY** — panel RO |
| `src/app/TenderKosztorysWorkspace.tsx` | mount sekcji przed BOQ Explorer |
| `scripts/test-cost-s4.1-explainability.mjs` | **NOWY** |
| changelog **2.65.56** · DF/RR · `09` · `CURRENT-TASK` | tip PL |

**CALL ONLY (bez edycji silników):** `buildOfferBoqFromSnapshot` · `mapOfferBoqDocument` · `applyOfferBoqCostIntelligence` · `applyOfferBoqPricing` · Work Catalog local · company profile.

---

## 3. OUT

- Edycja komponentów / cen / źródeł  
- Przebudowa Cost Intelligence / Pricing Engine  
- Kp · marża · cena ofertowa  
- Nowe parsery · AP2 · Bid Proposal  
- Rozbudowa kolumn `KosztorysBoqExplorerSection`  

---

## 4. Kontrakt UI

### Panel zbiorczy (góra)
- liczba pozycji · rozpoznane · do weryfikacji · zdekomponowane  
- średni poziom pewności (z istniejących counts)  
- koszt bezpośredni (`totals.directPln` / `costPricePln`)  

### Pozycja (accordion RO)
- typ · strategia · dekompozycja · #komponentów · pewność (🟢🟡🔴) · źródła · review  
- sekcja „Dlaczego AI…” (`aiRationale` CI + pricing)  
- szczegóły komponentów (nazwa, kategoria, qty, jm, ceny, źródło, confidence, rationale, review)  

### Status pewności (mapowanie istniejącego confidence)
| confidence | UI |
|------------|-----|
| high | 🟢 Wysoka pewność |
| medium | 🟡 Wymaga weryfikacji |
| low | 🔴 Niska pewność |

(+ wymuszenie 🟡 gdy `requiresUserReview` na komponencie)

### Prep pod S5+
Atrybuty `data-offer-boq-*` · brak handlerów zapisu · komentarz w DF: edycja w kolejnym Slice.

---

## 5. AC

1. Panel zbiorczy widoczny gdy jest snapshot przedmiaru.  
2. Każda pozycja ma explainability RO.  
3. Komponenty + źródła + confidence + rationale widoczne po rozwinięciu.  
4. Zero edycji / zero zmian silników.  
5. Testy · build · RR PL · commit · push · tip.

---

**FROZEN** · IMPLEMENT dozwolony

# WGDOM — AI-COST-01 / COST-S5.1 DESIGN FREEZE (AI Learning & Company Knowledge)

> **ID:** COST-S5.1  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **CLOSED** · **Owner GO YES** (2026-07-27) · UI **2.65.58**  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S5 `2.65.57` / `351f534`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: lokalna baza wiedzy kosztorysowej firmy + uczenie z decyzji użytkownika
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S5.1)
```

---

## 1. Cel

Każda decyzja użytkownika (zatwierdzenie / korekta) buduje **firmową** bazę wiedzy. Kolejne wyceny AI korzystają z niej jako dodatkowego źródła — bez globalnego modelu AI i bez scrapingu.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-company-knowledge.ts` | **NOWY** — store · learn · match · provider · stats |
| `src/lib/tender-offer-boq.ts` | `company_knowledge` w origin · hint na komponencie |
| `src/lib/tender-offer-boq-pricing-engine.ts` | `leadingProviders` (bez przebudowy logiki wyceny) |
| `src/lib/tender-offer-boq-component-edit.ts` | zapis wiedzy przy patch/approve |
| `src/lib/tender-offer-boq-explainability.ts` | explain + leading provider |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | hint wiedzy + panel statystyk RO |
| `scripts/test-cost-s5.1-company-knowledge.mjs` | **NOWY** |
| changelog **2.65.58** · DF/RR · `09` · `CURRENT-TASK` | tip PL |

**Persist:** `localStorage` key `kw-offer-boq-company-knowledge` (jak decyzje właściciela — bez cloud/KV w S5.1).

---

## 3. OUT

- Przebudowa Pricing Engine / Cost Intelligence  
- Kp · marża · oferta · zewnętrzne integracje · parsery · AP2  

---

## 4. Kontrakt

### Store (przyrostowy)
- Entry: klucz `nameKey|category|unit` · occurrenceCount · approved/changed · last/avg price · observations[] (append, cap)  
- Observation: snapshot decyzji + fromAi + fieldsChanged  

### Uczenie
Przy `user_changed` / `user_approved` → `recordCompanyKnowledgeDecision` (nie nadpisuje historii).

### Wykorzystanie
`leadingProviders: [companyKnowledgeProvider]` — przed katalogiem/heurystyką.  
Trafienie → origin `company_knowledge` · wyższa confidence · hint (occurrenceCount, lastUsedAt).

### Explainability
„Wykorzystano wiedzę firmy” · liczba przypadków · ostatnia data · wpływ na pewność.

### Panel stats (RO)
#wpisów · #potwierdzonych · top materiały · zgodność AI↔user (approved / (approved+changed)).

### Prep S6
Store dostępny pod Bid Proposal — bez wyliczeń Kp/marży teraz.

---

## 5. AC

1. Store istnieje i persystuje lokalnie.  
2. Decyzje użytkownika zapisują się przyrostowo.  
3. Nowa wycena może użyć wiedzy firmy.  
4. Explainability pokazuje wpływ.  
5. Panel statystyk RO.  
6. Testy · build · RR PL · commit · push · tip.

---

**FROZEN** · IMPLEMENT dozwolony

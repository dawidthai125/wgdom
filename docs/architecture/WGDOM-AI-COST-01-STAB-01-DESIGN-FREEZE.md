# WGDOM — AI-COST-01-STAB-01 DESIGN FREEZE (Field Ready Stabilization)

> **ID:** AI-COST-01-STAB-01  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **CLOSED** · **Owner GO YES** (2026-07-27) · implementacja **2.65.61**  
> **Klasa:** FEATURE / stabilizacja · Gate G1–G9 **ALL-NIE**  
> **Prior:** RWAT-01 COMPLETE · NOT FIELD READY · tip **2.65.60** / `f5ba5ac`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: naprawa P1 z RWAT-01 → gotowość do drugiego RWAT / FIELD READY
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt STAB-01)
```

---

## 1. Cel

Doprowadzić AI-COST-01 do poziomu **FIELD READY** poprzez usunięcie problemów **P1** z [`WGDOM-AI-COST-01-RWAT-01-REPORT.md`](WGDOM-AI-COST-01-RWAT-01-REPORT.md).

Bez nowych funkcji biznesowych. Bez przebudowy parserów / Bid Proposal / architektury Company Knowledge.

---

## 2. Mapowanie P1 → STAB

| P1 RWAT | STAB | Cel |
|---------|------|-----|
| RWAT-P1-04 reprice kasuje edycje | **STAB-1** | `user_approved` / `user_changed` nienaruszone; AI tylko sugestia |
| RWAT-P1-03 ~2000 rekomendacji | **STAB-2** | grupowanie + liczność + rozwinięcie |
| RWAT-P1-02 zła klasyfikacja | **STAB-3** | rozszerzenie reguł istniejącego klasyfikatora |
| RWAT-P1-01 ~30% unpriced | **STAB-4** | heurystyki / mapowanie / CK / providery (bez zewnętrznych feedów) |
| (jakość UX) | **STAB-5** | explainability braku wyceny |
| (diagnostyka) | **STAB-6** | lokalna telemetria jakości AI |

---

## 3. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq.ts` | opcjonalne pole sugestii AI na komponencie |
| `src/lib/tender-offer-boq-pricing-engine.ts` | preservacja decyzji użytkownika · rozszerzenie heurystyk |
| `src/lib/tender-offer-boq-cost-intelligence.ts` | reguły klasyfikacji (sprzątanie, odbiory, dokumentacja…) |
| `src/lib/tender-offer-boq-validation.ts` | agregacja rekomendacji / redukcja szumu |
| `src/lib/tender-offer-boq-explainability.ts` | uzasadnienie braku wyceny |
| `src/lib/tender-offer-boq-ai-quality-telemetry.ts` | **NOWY** — telemetria lokalna |
| `src/lib/tender-offer-boq-company-knowledge.ts` | zawężenie matchingu nazw generycznych (bez zmiany architektury) |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | UI grup rekomendacji + expand |
| `scripts/test-cost-stab-01-*.mjs` | testy STAB |
| regresja `test-cost-s5`…`s7` | PASS |
| changelog · DF · RR · RWAT porównawczy · CURRENT-TASK · 09 | docs |

---

## 4. OUT

- Nowe funkcje biznesowe AI-COST-02  
- Przebudowa parserów / Bid Proposal / Pricing Engine (rdzeń kontraktu)  
- Zmiana architektury Company Knowledge (store schema)  
- Zewnętrzne źródła cen  
- Cloud sync / Edge / Payroll  

---

## 5. AC

1. Reprice nie nadpisuje `user_approved` / `user_changed`.  
2. Rekomendacje zagregowane z licznością (nie 1:1 na każdy komponent).  
3. Sprzątanie / porządki / odbiory / próby / dokumentacja powykonawcza — poprawiona klasyfikacja.  
4. Pokrycie wyceny (priced/unpriced) lepsze niż RWAT-01 baseline na tym samym ATH.  
5. Explainability wskazuje dlaczego brak ceny + co zrobić.  
6. Telemetria lokalna (bez wysyłki).  
7. Re-RWAT + raport przed/po.  
8. typecheck · lint · build · testy PASS · commit · push · tip.

---

## 6. Werdykt DF

**DESIGN FREEZE GO** — implementacja STAB-01.

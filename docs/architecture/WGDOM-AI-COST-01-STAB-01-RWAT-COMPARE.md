# WGDOM — AI-COST-01-STAB-01 — Raport porównawczy RWAT (przed / po)

> **ID:** AI-COST-01-STAB-01 / RWAT-COMPARE  
> **Data:** 2026-07-27  
> **Dokument:** ATH TP113 — Sępa Szarzyńskiego 65A (302 poz.) · live KV  
> **Język:** polski

---

## 1. Metryki

| Metryka | Przed (RWAT-01) | Po (STAB-01) | Δ |
|---------|-----------------|--------------|---|
| Komponenty bez ceny | **252** | **0** | **−252** |
| Pokrycie wyceny (priced) | 598 | **835** | +237 |
| Rekomendacje (UI) | **~2009** | **4 grupy** | **−2005** |
| AI Quality Score | **8** | **41** | **+33** |
| Critical issues | 252 | **0** | −252 |
| Sprzątanie — kind | MaterialInstallation | **Demolition** | naprawione |
| Sprawdzenie/próba — kind | IndividualAnalysis | **Measurement** | naprawione |
| Edycja użytkownika po reprice | **kasowana** | **zachowana** | naprawione |
| Status gotowości | `not_ready` | `review_required` | poprawa |

---

## 2. P1 RWAT → status

| P1 | Status po STAB-01 |
|----|-------------------|
| RWAT-P1-01 unpriced ~30% | **CLOSED** (0 unpriced na TP113) |
| RWAT-P1-02 klasyfikacja sprzątania | **CLOSED** |
| RWAT-P1-03 szum rekomendacji | **CLOSED** (4 grupy z licznością) |
| RWAT-P1-04 reprice kasuje edycje | **CLOSED** |

**P0:** brak  
**P1 pozostałe (ten przebieg):** brak  

---

## 3. Uwagi jakościowe (nie P1)

- Nadal ~512 komponentów z niską pewnością (heurystyki) — status `review_required` jest **poprawny**.
- Mapowanie katalogowe bez zmian (~57,6%) — rozszerzenie Biblioteki Robót to backlog (nie STAB-01).
- Direct / Bid wzrosły po pełniejszym pokryciu (więcej propozycji heurystycznych) — wymaga weryfikacji kosztorysanta.

---

## 4. Werdykt terenowy

```text
RWAT po STAB-01: brak P0 / P1 na kryteriach STAB
→ kandydat: AI-COST-01 — FIELD READY
```

Ostateczne oznaczenie FIELD READY — w Release Report po deploy / Owner confirm.

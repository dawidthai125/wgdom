# WGDOM — AP2-S1 DESIGN FREEZE (Documentation Completeness)

> **ID:** AP2-S1  
> **Parent:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** AP2-S0 **LIVE** `2.65.47` @ `2c1ef53`

```text
One Bundle = One Goal: klasyfikacja docs + kompletność + gotowość wyceny (UX summary)
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-document-role.ts` | Rozszerzony `DocumentRole` + heurystyki nazwy |
| `src/lib/tender-documentation-completeness.ts` | **NOWY** SSOT kompletności + gotowość + stats |
| `src/lib/tender-documents-tab-summary.ts` | Integracja completeness w summary |
| `src/app/TenderDocumentsSummaryHeader.tsx` | UI: Kompletność · Gotowość · stats · highlights |
| `src/app/changelog-data.ts` | **2.65.48** |
| `scripts/test-ap2-s1-documentation-completeness.mjs` | **NOWY** |
| `scripts/test-tender-dossier-pipeline.mjs` | asercje nowych ról (minimal) |
| docs AP2-S1 DF/RELEASE · `09` · `CURRENT-TASK` | tip + status |

**Content signals (REUSE, bez nowego parsera):** `resolvedCostStatus` · `canPrepareValuation` · `costDiscovery` · `kosztorys.categories` / `rowCount` · `scanSummary` · `swzAnalysis` · istniejące filename/tier.

---

## 2. OUT

- Pricing Gate · Autonomous Gate · multi-agent pipeline  
- Duży dolny panel / fullscreen (S7/S8)  
- OCR / LLM / nowe Edge  
- Rename „Przeanalizuj…” (S2)  
- cloud-sync / Payroll  

---

## 3. Kontrakt

### Presence

`found` | `not_found` | `not_applicable` | `unknown`

### Valuation readiness

| Level | Label PL | Reguła (skrót) |
|-------|----------|----------------|
| `ready` | Gotowy do wyceny | `canPrepareValuation` + wiersze/pozycje + SWZ\|OPZ |
| `risk` | Możliwa wycena z ryzykiem | przedmiar/kosztorys słaby lub brak SWZ/OPZ |
| `insufficient` | Dokumentacja niewystarczająca | brak materiału ilościowego |

### Sloty checklisty (UI)

SWZ · OPZ · STWiOR · Przedmiar · Kosztorys inwestorski · Projekt · Rysunki · Umowa · Formularz · Oświadczenia · Załączniki formalne · Odpowiedzi na pytania · Zmiany SWZ · Aneksy

---

## 4. AC

1. ≥14 typów/slotów rozpoznawanych (role + completeness).  
2. Sekcja „Kompletność dokumentacji” widoczna bez extra klików na Dokumentach.  
3. Wskaźnik gotowości wyceny (3 stany).  
4. Stats z istniejących danych (docs · branże · pozycje · …); pages tylko gdy dostępne.  
5. Pricing/Autonomous nienaruszone.  
6. build + testy PASS · RR · commit · push · PV.

---

**FROZEN** · IMPLEMENT dozwolony

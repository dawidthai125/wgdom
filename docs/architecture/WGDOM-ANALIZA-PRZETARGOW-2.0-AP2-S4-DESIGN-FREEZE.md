# WGDOM — AP2-S4 DESIGN FREEZE (Business Risk Engine)

> **ID:** AP2-S4  
> **Parent:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** AP2-S3 **LIVE** `2.65.50` @ `3e23631`

```text
One Bundle = One Goal: fakty S3 → ryzyka/mocne strony + uzasadniona rekomendacja + Business Fit
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt AP2-S4)
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-business-risk-engine.ts` | **NOWY** — Risk Engine (pure) |
| `src/lib/tender-documents-tab-summary.ts` | pole `businessRisk` |
| `src/app/TenderDocumentsSummaryHeader.tsx` | UI: rekomendacja · fit · ryzyka · mocne strony |
| `src/app/changelog-data.ts` | **2.65.51** |
| `scripts/test-ap2-s4-business-risk-engine.mjs` | **NOWY** |
| docs DF/RELEASE · `09` · `CURRENT-TASK` | tip + status |

**Input:** `buildDeepIntelligenceView` + completeness (AP2-S3/S1).  
**Zakaz:** zmiana `overlay.displayDecision` / Autonomous Gate / Pricing Gate.

---

## 2. OUT

- BundleV2 pełny kontrakt 8 stages (PLAN) — **odroczone** (S4 Owner = Risk Engine)  
- Profil firmy w Business Fit  
- Nowe AI / PDF parsers / Edge  
- Pełny panel S7  

---

## 3. Kontrakt

### Werdykt biznesowy (S4, dokumentacja)

`STARTUJ` | `STARTUJ WARUNKOWO` | `ODPUŚĆ`

### Kategorie ryzyka

`formal` · `financial` · `technical` · `contractual` · `organizational`

### Assessment item

opis · wpływ · poziom · waga · źródło · factId · ruleId · polarity (risk|strength)

### Business Fit

`high` | `medium` | `low` — **tylko z dokumentacji** (+ uzasadnienie)

---

## 4. AC

1. Risk Engine na faktach S3.  
2. Ryzyka pogrupowane tematycznie.  
3. Rekomendacja z uzasadnieniem (powody).  
4. Mocne strony widoczne.  
5. Business Fit + uzasadnienie.  
6. Transparentność (dokument · fakt · reguła).  
7. build + testy · RR · commit · push · PV.

---

**FROZEN** · IMPLEMENT dozwolony

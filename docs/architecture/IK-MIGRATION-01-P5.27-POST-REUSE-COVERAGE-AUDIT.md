# IK-MIGRATION-01 — P5.27 POST-REUSE COVERAGE AUDIT

> **Date:** 2026-08-15  
> **Status:** **COMPLETE** (READ-ONLY)  
> **Mode:** AUDIT ONLY · **HTTP = 0 · Code = 0 · Commit = 0 · Push = 0**  
> **Baseline:** P5.27-FIX COMPLETE  
> **Artifacts:** `.tmp/p527-post-reuse-coverage.json` · `.tmp/p527-post-reuse-coverage-FULL.md`

---

## Owner summary

**75 remaining groups** (97 CKM − 22 SAFE)

| Bucket | Groups | Lines | Znaczenie |
|--------|-------:|------:|-----------|
| **A** SAFE EXISTING REUSE candidates | **0** | 0 | Brak pominiętego bezpiecznego reuse w residual |
| **B** OWNER RULE candidates | **0** | 0 | Brak „prawie SAFE” bez nowego URL |
| **C** TRUE NEW CATEGORY KEY | **65** | 105 | Wymaga nowego family/URL lub Owner family rule |
| **D** OUT OF RESEARCH | **10** | 22 | Gruz + pomiary — nie mapować do zwykłego LABOR |
| **E** CORRECT REJECT (w residual) | **0** | 0 | — |

**Semantic families (residual):** **59**

**Nie:** 75 ≠ 75 nowych keys.  
C = 65, z czego dużo `FAMILY_UNKNOWN` + `demolition→repairs` (bez URL).

### Porównanie

| | |
|--|--:|
| P5.27 BEFORE CKM | **97** |
| P5.27-FIX SAFE reuse | **22** grup / **52** linie |
| Residual bez SAFE | **75** |
| Recovered plumbing | 8 / 29 |
| Recovered plaster | 5 / 10 |
| Recovered electrical | 7 / 13 |
| „Recovered” painting | 2 — **patrz finding** |

### Audit finding (bez implementacji)

| Finding | Groups | |
|---------|--------|--|
| **FALSE SAFE painting** | **G109, G140** | FIX oznaczył `painting` SAFE, ale to **wapno/olej** (correct reject vs emulsja). **Nie luzować gate.** Owner: traktować jako **E** / revoke SAFE przy następnym GO. |

**Honest SAFE (po korekcie audytowej):** **20** (8+5+7) · nie 22.

---

## Reconciliation

| Check | Result |
|-------|--------|
| 97 − SAFE(reuse=SAFE_EXISTING_REUSE) | **75** |
| Analyzed | **75** |
| PASS | **true** |
| Gates poluzowane? | **NIE** |
| HTTP / research / Accept / code | **0** |

---

## Answers A–G (residual)

| Pytanie | Werdykt |
|---------|---------|
| **A** Brak bezpiecznego istniejącego mappingu? | **Tak dla 65×C + 10×D** — A candidates = 0 |
| **B** Mapping istnieje, za szeroka/zła klasyfikacja? | **Nie w residual** (B=0). Finding: 2× false SAFE poza residual |
| **C** Problem domain? | **10** z proponowaną zmianą raportową (transport/pomiar) — **domain nie zmieniane** |
| **D** Problem unit? | **4× UNIT_POMIAR** (w D) · **14× UNIT_KPL_REVIEW** (nie auto-map) |
| **E** Problem semantic family? | **51× unknown** + **13× demolition** w C |
| **F** Potrzeba nowego categoryKey? | **65×C** (w tym `repairs`/`flooring` bez URL) |
| **G** Poza research? | **10×D** (+ 2×E finding w SAFE set) |

INTERNAL-FIRST: residual z kolejki F = **NO_INTERNAL_MATCH** (konstrukcja queue).

---

## C breakdown (65) — nie invent teraz

| `resolvedFamilyNow` | Groups | Near key | Allowlisted? |
|---------------------|-------:|----------|:------------:|
| `unknown` | **51** | — | nie |
| `demolition` | **13** | `repairs` | **NIE** (brak URL) |
| `flooring` | **1** | `flooring` | **NIE** |

**Zakaz:** nie podmieniać `repairs`/`demolition` na plaster / zaprawianie / wykucie host.

---

## D — OUT OF RESEARCH (10)

| Rodzaj | Groups | Unit |
|--------|--------|------|
| Wywiezienie gruzu | G021, G022, G053, G054, G085, G086 | m3 |
| Pomiary / zerowanie | G038, G041, G047, G048 | pomiar |

G047/G048 = już **REJECTED_REUSE** w FIX.  
**Nie** mapować do zwykłego LABOR / electrical research.

---

## Domain audit (raport only)

| CURRENT → proposed (nie wdrażać) | Count | Confidence |
|----------------------------------|------:|------------|
| LABOR → NON_COST_OR_TRANSPORT | 6 | HIGH |
| LABOR → LABOR_MEASUREMENT_SERVICE | 4 | HIGH |

PACKAGE / MATERIAL gates **nie** naruszane w rekomendacjach.

---

## Unit audit

| Flag | Groups | Action |
|------|-------:|--------|
| UNIT_POMIAR | 4 | OUT OF RESEARCH |
| UNIT_KPL_REVIEW | 14 | Owner rule — **bez** auto `kpl=szt` |
| msc | (w SAFE plumbing) | kontrakt ATH · `msc↔szt` research-only |

---

## Special cases (zachowane)

| Reguła | Status |
|--------|--------|
| głowica ≠ grzejnik | bez zmian |
| emulsja ≠ wapno / olej | finding G109/G140 |
| stolarka ≠ ogólne malowanie | zachowane |
| wykucie ≠ zaprawianie | zachowane · demolition ≠ plaster |
| pomiary ≠ przypadkowa robocizna | D |

---

## ROI A/B/C (bez implementacji)

**A:** brak  
**B:** brak  

**C — TOP według linii / ryzyko (wszystkie HIGH risk = nowy URL/family):**

| Family (queue key) | Groups | Lines | Near |
|--------------------|-------:|------:|------|
| podłączenie przewodów kabelkowych… | 3 | 6 | — |
| malowanie-wapienne (etykieta queue; opisy ≠ malowanie)* | 2 | 5 | — |
| demontaż (szt) | 2+ | 3+ | repairs |
| wykucie (szt) | 2 | 3 | repairs |
| izolacja otuliny | 2 | 3 | — |
| sanitaria kpl (ustęp/brodzik/kabina…) | wiele ×1 | 3–4 | — |
| flooring panele | 1 | 2 | flooring |

\* Queue `familyKey` bywa zgrubny (np. „malowanie-wapienne” vs opis przebicia/rozebrania) — weryfikować **opis**, nie etykietę.

Pełne ROI: `.tmp/p527-post-reuse-coverage-FULL.md`.

---

## TOP 20 rodzin (linie)

| # | Lines | n | Bucket | Family NOW | FAMILY |
|--:|------:|--:|--------|------------|--------|
| 1 | 14 | 6 | **D** | unknown | wywiezienie gruzu (m3) |
| 2 | 8 | 4 | **D** | unknown | pomiary |
| 3 | 6 | 3 | **C** | unknown | podłączenie przewodów kabelkowych |
| 4 | 5 | 2 | **C** | unknown | queue: malowanie-wapienne (szt)* |
| 5 | 4 | 1 | **C** | unknown | obsadzenie drzwiczek PCV |
| 6 | 4 | 1 | **C** | unknown | wymiana ustępu (kpl) |
| 7 | 4 | 1 | **C** | unknown | queue: malowanie-wapienne (m3)* |
| 8 | 3 | 2 | **C** | demolition | demontaż (szt) |
| 9 | 3 | 2 | **C** | demolition | wykucie (szt) |
| 10 | 3 | 2 | **C** | unknown | izolacja otuliny |
| 11 | 3 | 1 | **C** | unknown | montaż brodzików |
| 12 | 3 | 1 | **C** | unknown | montaż kabiny prysznicowej |
| 13 | 2 | 2 | **C** | demolition | queue: malowanie-wapienne (m2)* |
| 14 | 2 | 2 | **C** | unknown | spuszczanie wody / grzejnik |
| 15 | 2 | 1 | **C** | demolition | demontaż (PACKAGE szt) |
| 16 | 2 | 1 | **C** | demolition | demontaż kuchni gazowej |
| 17 | 2 | 1 | **C** | unknown | obsadzenie podokienników PCV |
| 18 | 2 | 1 | **C** | unknown | przygotowanie podłoża pod oprawy |
| 19 | 2 | 1 | **C** | unknown | rozebranie wykładziny ściennej |
| 20 | 2 | 1 | **C** | unknown | posadzki płytkowe |

---

## Co dalej (tylko Owner — bez auto)

1. **Nie** research / **nie** `repairs` URL bez GO.  
2. Rozważyć revoke SAFE **G109/G140** (E).  
3. C HIGH-ROI: demontaż/wykucie → **Owner-curated `repairs`** (osobny etap).  
4. D: gruz + pomiary — leave OUT OF RESEARCH.  
5. Nie obniżać domain/matcher gates.

---

## STOP

**P5.27 POST-REUSE COVERAGE AUDIT = COMPLETE**

- NIE research · NIE nowe categoryKey · NIE repairs · NIE Accept · NIE CREATE  
- NIE commit · NIE push · NIE implementacja A/B/C  

Czekaj na **Owner review**.

**ABSOLUTE STOP.**

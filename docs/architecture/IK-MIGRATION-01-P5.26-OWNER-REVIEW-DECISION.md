# IK-MIGRATION-01 — P5.26 OWNER REVIEW / DECISION ONLY

**Status:** `OWNER_DECISION_PENDING`  
**Data pakietu:** 2026-08-16  
**Źródło researchu:** Manual Research BATCH-01…05 · closeout `IK-MIGRATION-01-P5.26-MANUAL-RESEARCH-CLOSEOUT.md`  
**JSON:** `.tmp/p526-owner-review-decision.json`

## ABSOLUTE STOP (ten dokument)

| Zakaz | Stan |
|-------|------|
| Research HTTP | **0** |
| Accept / auto-accept | **0** |
| CatalogWork CREATE | **0** |
| BIND | **0** |
| KV write | **0** |
| Zmiany kodu / matcherów | **0** |
| Commit / push | **0** |
| Invent ceny | **0** |
| Rozszerzanie Owner Knowledge | **0** |
| Candidate → Accept (automat) | **0** |

Ten plik to **tylko formularz decyzji Ownera**. Agent **nie** wypełnia DECISION.

---

## Jak decydować

| Status research | Dozwolone DECISION |
|-----------------|--------------------|
| CANDIDATE | `ACCEPT` · `REJECT` · `REVIEW` |
| REVIEW_REQUIRED | `ACCEPT` · `REJECT` · `REVIEW` (+ opcjonalnie reguła Owner) |
| RESEARCH_GAP | `RESEARCH_LATER` · `REJECT` · `REVIEW` |

**ACCEPT** = Owner świadomie zatwierdza **tylko evidence researchu** (nie uruchamia Accept w systemie w tym kroku).  
**REJECT** = odrzuć candidate / nie używaj tej ceny.  
**REVIEW** = zostaw otwarte / potrzeba doprecyzowania.  
**RESEARCH_LATER** = GAP OK — wróć później (nie inventuj teraz).

---

## 1. CANDIDATES (6)

### G093 — Otulina Ø20

| Pole | Wartość |
|------|---------|
| Domain | PACKAGE (labor+materiał) |
| Unit BOQ | m (mb) |
| Interpretacja | Otulina Thermaflex FRZ, Owner: **Ø20**; zakres BOQ 12–22 mm OK |
| MATERIAL | **~8,56 PLN netto/mb** · hurt.aka.pl Thermaflex FRZ 22/20 |
| LABOR | **GAP** |
| R+M | brak (bez labor) |
| Confidence | MEDIUM |
| Evidence | WEB_HURT_AKA · Owner `otulina_od20` |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

**Uwaga:** ACCEPT materiału ≠ komplet PACKAGE; labor nadal GAP.

---

### G082 — Wykucie działowa (otwory drzwiowe/okienne)

| Pole | Wartość |
|------|---------|
| Domain | LABOR |
| Unit BOQ | m² |
| Interpretacja | Wykucie otworu w ścianie działowej 1/2 cegły; Owner: drzwi 70/80/90/100 cm; ≠ bruzdy ≠ zaprawianie |
| LABOR | **350–500 PLN/m²** · mid **~425** · kb.pl · wiersz „Wykucie otworu w ścianie działowej” · 2026-01-07 |
| MATERIAL | n/a (LABOR) |
| Confidence | MEDIUM |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

---

### G091 — Montaż rurociągów PCW Ø50

| Pole | Wartość |
|------|---------|
| Domain | PACKAGE |
| Unit BOQ | m (mb) |
| Interpretacja | Owner: **Ø50** = zlew / umywalka / pralka |
| LABOR | **60–100 PLN/mb** · mid **~80** · oferteo.pl (kanalizacja wewnętrzna) |
| MATERIAL | **GAP** |
| R+M | brak (bez materiału) |
| Confidence | MEDIUM |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

**Uwaga:** ACCEPT labor ≠ komplet PACKAGE.

---

### G121 — Panele podłogowe (z.VIII)

| Pole | Wartość |
|------|---------|
| Domain | PACKAGE |
| Unit BOQ | m² |
| Interpretacja | Montaż/układanie paneli · ≠ demontaż · ≠ G120/G128 |
| LABOR | **~43,83 PLN/m²** (średnia PL) · Wrocław ~43,10 · Murator Apr 2026 |
| MATERIAL | **GAP** |
| Confidence | MEDIUM |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

---

### G075 — Wyburzenie ścianek (prefab lekkie)

| Pole | Wartość |
|------|---------|
| Domain | LABOR |
| Unit BOQ | m² |
| Interpretacja | Rozebranie ścianek z prefabrykatów lekkich |
| LABOR | **120–180 PLN/m²** · mid ~150 · kb.pl „Wyburzenie ściany działowej z cegły” |
| Confidence | **LOW** (prefab ≠ cegła) |
| Risk | mismatch materiału ściany |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

---

### G078 — Wyburzenie ścianki 1/2 cegły

| Pole | Wartość |
|------|---------|
| Domain | LABOR |
| Unit BOQ | m² |
| Interpretacja | Rozebranie ścianki 1/2 cegły — bliżej wiersza KB |
| LABOR | **120–180 PLN/m²** · mid ~150 · kb.pl |
| Confidence | MEDIUM |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

---

## 2. REVIEW_REQUIRED (5)

### G004 / G008 / G009 — Skrzydła drzwiowe

| Pole | Wartość |
|------|---------|
| Domain | MATERIAL |
| Unit BOQ | **m²** |
| Owner Knowledge | **300 PLN/szt** (`OWNER_KNOWLEDGE`, HIGH) |
| Konflikt | BOQ rozlicza **m²** · research **nie** przeliczał automatycznie |
| Labor / R+M | n/a w tym wierszu |

**DECISION (łącznie lub per grupa):** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

**Opcjonalna reguła Owner (wypełnić tylko jeśli DECISION ≠ REJECT):**

- [ ] zostaw rozliczenie **PLN/szt** (nadpisz jednostkę w wycenie)  
- [ ] reguła przeliczenia m² → szt: ________________  
- [ ] inne: ________________  

**G004 DECISION:** `PENDING`  
**G008 DECISION:** `PENDING`  
**G009 DECISION:** `PENDING`  

---

### G083 — Wykucie kratek wentylacyjnych / drzwiczek

| Pole | Wartość |
|------|---------|
| Domain | LABOR |
| Unit BOQ | **szt** |
| Źródło | kb.pl „Wykucie otworów wentylacyjnych” **1000–1300 PLN/m²** |
| Konflikt | źródło **m²** · BOQ **szt** · brak bezpiecznego przeliczenia |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

---

### G165 — Montaż PCW Ø110

| Pole | Wartość |
|------|---------|
| Domain | PACKAGE |
| Unit BOQ | m (mb) |
| BOQ | **Ø110** |
| Owner Knowledge | tylko **Ø50** (zlew/umywalka/pralka) i **Ø100** (WC) |
| Konflikt | Ø110 **poza** Owner Knowledge · nie utożsamiać z Ø100 |
| Research note | artykuł Oferteo podaje pion Ø110 50–80 PLN/mb labor — **LOW**, nie BIND bez polityki średnic |

**DECISION:** `PENDING` — Owner: ACCEPT / REJECT / REVIEW  

**Opcja Owner (tylko jeśli rozszerza wiedzę świadomie):**  
- [ ] traktuj Ø110 jak WC / jak Ø100  
- [ ] osobna stawka / osobna reguła: ________________  
- [ ] odrzuć do RESEARCH_LATER  

---

## 3. RESEARCH_GAP (7)

| Group | Temat | Dlaczego GAP | DECISION |
|-------|--------|--------------|----------|
| **G007** | Skraplacz kondensatu (kocioł gazowy) | Tożsamość OK · **brak wiarygodnej PLN** | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |
| **G052** | Wykucie ościeżnic z muru | ≠ otwór drzwiowy 70–100 · brak stawki szt | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |
| **G084** | Wykucie podokienników | ≠ drzwi · ≠ bruzdy · brak mb | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |
| **G120** | Posadzki płytkowe kamień szt. | ≠ panele (P5.32-G identity) | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |
| **G128** | Warstwy wyrównawcze / wylewka | ≠ panele | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |
| **G063** | Dopasowanie skrzydeł drzwiowych | stolarka fit · brak stawki szt | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |
| **G064** | Dopasowanie skrzydeł okiennych | ≠ drzwi · brak stawki | `PENDING` — RESEARCH_LATER / REJECT / REVIEW |

---

## 4. Checklist Owner (po wypełnieniu)

- [ ] Wszystkie 6 CANDIDATES mają DECISION ≠ PENDING  
- [ ] G004/G008/G009 + reguła jednostek (lub REJECT)  
- [ ] G083 jednostka szt vs m²  
- [ ] G165 polityka Ø110  
- [ ] Wszystkie 7 GAP mają RESEARCH_LATER / REJECT / REVIEW  
- [ ] Żadne DECISION nie oznacza „wymyśl cenę”  

Po wypełnieniu Ownerem: status → `OWNER_DECISIONS_RECORDED` (osobny krok, dopiero na GO).

---

## 5. Status końcowy

```text
OWNER_DECISION_PENDING
```

**STOP.** Brak dalszych akcji agenta do czasu decyzji Ownera.

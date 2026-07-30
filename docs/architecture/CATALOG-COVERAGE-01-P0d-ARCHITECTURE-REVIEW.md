# CATALOG-COVERAGE-01 — P0d ARCHITECTURE REVIEW (Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REVIEW  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0d — Library Seed** (+ Alias precision)  
> **Etap:** **ARCHITECTURE REVIEW** · **DOCS ONLY**  
> **Data:** 2026-07-30  
> **DF:** [`CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md) · **FROZEN** · Owner zatwierdził DF  
> **PLAN UPDATE:** [`CATALOG-COVERAGE-01-P0d-PLAN-UPDATE.md`](CATALOG-COVERAGE-01-P0d-PLAN-UPDATE.md) · zaakceptowany  
> **AUDIT:** [`CATALOG-COVERAGE-01-P0d-AUDIT.md`](CATALOG-COVERAGE-01-P0d-AUDIT.md)  
> **Zakaz:** IMPLEMENT · kod · commit · push · SMART · MS · Cloud CORE · Payroll

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0d ARCHITECTURE REVIEW
Decyzja: CHANGES REQUIRED
Kontrole Owner 1–10: PASS = 8 · FAIL = 2 · BINDING = 1
FAIL: §5 zakres FULL vs DF · §3 ścieżka Core omijająca Negation
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF P0d FROZEN vs kontrole Ownera **1–10** |
| Kod IMPLEMENT | **brak** |
| Dowód runtime | P0d AUDIT probes (TV-01) · tor `mapOfferBoqLine` (P0c) |
| Kryterium PASS | Brak sprzeczności blokującej bezpieczny IMPLEMENT A→B→C |
| Kryterium FAIL | Sprzeczność DF / Owner **lub** luka umożliwiająca ominięcie Negation |

---

## 0.1 Werdykt

| | |
|--|--|
| **STATUS** | **CHANGES REQUIRED** |
| **READY FOR OWNER GO?** | **NIE** — do DF amend (lub jawnej decyzji Ownera zamykającej FAIL) |
| **FAIL blokujące** | **CR-1** (zakres FULL) · **CR-2** (Core bypass Negation) |
| **Po amend** | Ponowny mini-AR lub Owner GO „DF amend zaakceptowany” → **READY FOR OWNER GO** |
| **IMPLEMENT** | **ZAKAZ** do PASS / Owner GO IMPLEMENT |

---

## 1. Kontrole Ownera (PASS / FAIL)

### 1. Etapowanie: Precision → SAFE Seed → FULL Seed

| Dowód DF | Ocena |
|----------|--------|
| §2 | Fale **A → B → C** zamrożone · Gate A / Gate B / Gate C |
| Kolejność | Precision (bez Library) → SAFE seed → FULL seed |
| Zakaz | Łączenie B+C bez Gate B + Owner GO C |

**Werdykt: PASS**

---

### 2. Negation Filter ma pierwszeństwo przed Alias Match

| Dowód DF | Ocena |
|----------|--------|
| **D-P0d-1…5** | Negation precedes Alias Match · kanon *„bez zaprawiania bruzd”* |
| §3.3 | Pseudokod: negacja ⇒ NO MATCH mimo substringu pozytywnego |
| Multiswitch | Precision tokenowa (D-P0d-6/7) — osobna od negacji, spójna z Audytem |

**Werdykt: PASS**

---

### 3. Nie istnieje alternatywna ścieżka omijająca Negation Filter

| Ścieżka | Stan AS-IS (kod P0c) | Ryzyko |
|---------|----------------------|--------|
| Alias Resolver | Negation ma być w `test` reguły `zaprawianie_bruzd` (P0d-A) | **OK** gdy P0d-A PASS |
| **Product Mapper Core** (`mapOfferBoqLineCore` → `scoreWorkAgainstLine` + `keywords`) | Po **NO MATCH** Alias idzie Core | **LUKA** |
| Inny Resolver / SMART / Edge | Brak drugiego Resolvera (P0c AR) | OK |

**Analiza luki:**

1. Po P0d-A: Alias poprawnie **odrzuca** *„bez zaprawiania bruzd”*.  
2. Po P0d-C: w Library pojawia się work `cc-p0c-w1-zaprawianie-bruzd` z keywords m.in. „zaprawianie bruzd”.  
3. Core score może zbindować ten ID na linii znegowanej (**omija Negation w Alias**).  
4. DF §4 opisuje Negation **wewnątrz** Alias Resolver — **nie** zamyka toru Core.

**Wniosek:** Warunek Ownera „brak alternatywnej ścieżki” — **niespełniony** względem DF FROZEN.

**Wymagany DF amend (CR-2):** zamrozić jedną z opcji (REUSE FIRST · ZERO DUP):

| Opcja | Opis | Preferencja AR |
|-------|------|----------------|
| **A** | **Negation Guard na Product ID** — przed akceptacją `catalogWorkId === cc-p0c-w1-zaprawianie-bruzd` (Alias **lub** Core) sprawdź negację; jeśli TAK ⇒ odrzuć ten ID | **Preferowana** |
| **B** | Seed zaprawiania = **alias-only bind** (Core nie może wybrać tego ID; denylist w Core) | Akceptowalna |
| **C** | Keywords bez frazy łapiącej negację + test TN po seedzie udowadniający 0 Core bind | **Niewystarczająca sama** (kruche) |

**Werdykt: FAIL** → **CR-2**

---

### 4. SAFE Wave obejmuje wyłącznie zawór + stop_ptakow

| Dowód DF | Ocena |
|----------|--------|
| §2 · **D-P0d-10** | SAFE = `cc-p0c-w1-zawor-odpowietrzajacy` + `cc-p0c-w1-stop-ptakow` only |
| Karty §6 | Status **APPROVED SAFE** tylko dla tych dwóch |

**Werdykt: PASS**

---

### 5. FULL Wave pozostaje poza zakresem P0d

| Źródło | Treść |
|--------|--------|
| **Owner kontrola 5** | FULL Wave **poza zakresem P0d** |
| **Owner kontrola 1** | Etapowanie zawiera FULL Seed po SAFE |
| **DF §1–§2 · D-P0d-9** | FULL = **fala C w P0d**, za Gate B + Owner GO C |

**Konflikt:** DF **włącza** FULL do P0d; kontrola Ownera 5 **wyłącza** FULL z P0d. Kontrola 1 jednocześnie **wymaga** weryfikacji łańcucha z FULL.

| Opcja uzgodnienia | Skutek |
|-------------------|--------|
| **U1** | DF amend: P0d = **tylko A+B**; FULL → osobny slice (**P0e** / P0d-FULL) poza P0d | Zgodne z literalną kontrolą 5 |
| **U2** | Owner potwierdza: „poza P0d” = poza **pierwszym pakietem GO** (SAFE); FULL zostaje P0d-C za Gate B | Zgodne z DF; wymaga **jawnego** potwierdzenia (kontrola 5 inaczej FAIL) |

Bez U1 lub U2 — **nie** wolno startować IMPLEMENT C; nie wolno też traktować DF jako zgodnego z checklistą Ownera.

**Werdykt: FAIL** → **CR-1**

---

### 6. Każdy Seed: Product ID · Work ID · ROI · ryzyko · BIZ · status

| Dowód DF §6 | Ocena |
|-------------|--------|
| 5 reserved kart + `legacy-rozbiorki-m2` OUT | Kolumny: Product ID (= Work ID), Fala, ROI, Ryzyko, BIZ, Status |
| SAFE / FULL / OUT SEED | Statusy FROZEN |

**Werdykt: PASS**

---

### 7. Pipeline: Noise → Normalizer → Negation → Alias → Mapper

| Owner (oczekiwane) | DF §4 (FROZEN) |
|--------------------|----------------|
| Noise → Normalizer → **Negation** → Alias → Mapper | Noise → Normalizer → **Alias (z Negation inside)** → Mapper |

**Ocena architektoniczna:**

- Semantyka Ownera = **kolejność logiczna**: Negation **przed** pozytywnym Alias Match.  
- DF realizuje to jako **D-P0d-1 wewnątrz** Alias Resolver (`test` / pre-check reguły) — **dopuszczalne**, o ile Negation **nie** jest pomijalne (patrz §3 FAIL).  
- Osobny plik/moduł „Negation Filter” **nie** jest wymagany (ZERO DUPLICATE / REUSE) — wymagany jest **jawny etap logiczny** w kontrakcie.

**Wiązanie AR (po CR-2):** diagram IMPLEMENT / DF amend:

```text
Noise → Normalizer → [Negation Guard] → Alias Match → Mapper (Alias bind | Core)
```

gdzie `[Negation Guard]` blokuje kandydatów Product ID wrażliwych na negację **przed** finalnym bindem (nie tylko w Pack `test`).

**Werdykt: PASS** *(logiczna zgodność)* · **warunek twardy = CR-2**

---

### 8. SSOT / REUSE / ZERO DUP / DATA FIRST / FEATURE-DATA

| Zasada | Dowód DF | Werdykt |
|--------|----------|---------|
| **SSOT FIRST** | Pack Wave 1 · Library works · TV-01 KPI · reserved ID bez forków | **PASS** |
| **REUSE FIRST** | Resolver · `mapOfferBoqLine` · Quotes P3.3 path (D-CC-16) | **PASS** |
| **ZERO DUPLICATE LOGIC** | Jeden Pack · jeden Resolver · jeden Mapper · brak fuzzy | **PASS** |
| **DATA FIRST** | Bind Alias tylko gdy work aktywny; A bez seedu | **PASS** |
| **FEATURE-DATA** | Seed WC + Quotes · Gate ALL-NIE · bez CORE | **PASS** |

**Werdykt: PASS** (5/5)

---

### 9. Brak zmian SMART / MARKET-SYNC / Quotes ownership / Library poza Seedami

| Obszar | DF | Werdykt |
|--------|-----|---------|
| **SMART** | Detect/Evidence/Save OUT · AS-IS | **PASS** |
| **MARKET-SYNC** | Accept/Publish OUT | **PASS** |
| **Product Quotes** | Tylko REUSE commit dla zatwierdzonych ID · bez new write path | **PASS** |
| **Product Library** | Tylko karty §6 · fale B/(C) · zakaz top grup | **PASS** |

**Uwaga:** „brak zmian Quotes” ≠ „zero wpisów Quotes” — FROZEN = REUSE toru FEATURE-DATA (D-P0d-14), nie rewrite ownership.

**Werdykt: PASS**

---

### 10. Kompletność testów TN / TP / TR / P0c suite

| Zestaw | DF §8 | Gate |
|--------|-------|------|
| **TN** | TN-Z* (*bez zaprawiania*) · TN-M* (RTV/SAT) · TN-X* | A + RELEASE |
| **TP** | TP-Z* · TP-M1 · TP-V1 · TP-S1 · TP-F1 | A / B / C |
| **TR** | TR-P0c · TR-OV · TR-REMAP · TR-IDEM · TR-NOISE · TR-DATA | A + RELEASE |
| **P0c regression** | `scripts/test-catalog-coverage-01-p0c.mjs` = **TR-P0c** | **PASS** wymagany |

**Luka względem CR-2:** brak jawnego testu **TN-CORE-Z1**: po istnieniu work zaprawianie, Core **nie** binduje *„bez zaprawiania bruzd”* → ten ID.  
→ Dodać do DF amend (część CR-2).

**Werdykt: PASS** *(kompletność względem DF)* · **uzupełnienie obowiązkowe w CR-2**

---

## 2. Podsumowanie kontroli

| # | Kontrola | Werdykt |
|---|----------|---------|
| 1 | Etapowanie A→B→C | **PASS** |
| 2 | Negation precedes Alias Match | **PASS** |
| 3 | Brak ścieżki omijającej Negation | **FAIL** |
| 4 | SAFE = zawór + stop only | **PASS** |
| 5 | FULL poza zakresem P0d | **FAIL** (vs DF) |
| 6 | Karty Seed kompletne | **PASS** |
| 7 | Pipeline Noise→…→Mapper | **PASS*** |
| 8 | SSOT / REUSE / ZERO DUP / DATA / FEATURE-DATA | **PASS** |
| 9 | Brak SMART / MS / Quotes rewrite / Library poza seed | **PASS** |
| 10 | Testy TN/TP/TR/P0c | **PASS*** |

\* Warunkowe wobec domknięcia **CR-2**.

**Score:** **8 PASS · 2 FAIL**

---

## 3. CHANGES REQUIRED (obowiązkowe przed READY FOR OWNER GO)

### CR-1 — Zakres FULL vs P0d

**Problem:** Owner kontrola 5 ≠ DF (FULL = P0d-C).

**Wymagane (wybrać jedną):**

1. **DF amend U1:** P0d IN = tylko **A + B**; FULL Seed = **poza P0d** (nowy ID slice, np. P0e).  
2. **Owner decision U2 (pisemna):** „poza zakresem P0d” w checklistcie = poza pakietem SAFE / pierwszym GO; FULL zostaje P0d-C za Gate B.

Bez wyboru — **zakaz** Owner GO IMPLEMENT (w tym C).

---

### CR-2 — Domknięcie Negation (brak bypass Core)

**Problem:** Po seedzie `cc-p0c-w1-zaprawianie-bruzd` Core może ominąć Negation Alias.

**Wymagane DF amend:**

| ID | Treść |
|----|--------|
| **D-P0d-16** | Negation Guard obowiązuje przy **każdym** bindzie Product ID wrażliwego na negację (min. zaprawianie) — Alias **i** Core |
| **AC-P0d-9** | TN-CORE-Z1: przy istniejącym work zaprawianie, linia *bez zaprawiania bruzd* ⇒ `catalogWorkId ≠ cc-p0c-w1-zaprawianie-bruzd` |
| **Diagram** | Noise → Normalizer → Negation Guard → Alias Match → Mapper |

**Preferencja AR:** opcja **A** (§1.3) — shared guard na ID, REUSE fold/normalizer hay, ZERO drugiego matchera.

**Skutek zakresu:**  
- **IMPLEMENT A** (precision Pack) — może startować **dopiero po** CR-1+CR-2 *lub* Owner GO ograniczone do A z zobowiązaniem CR-2 przed B/C.  
- **AR rekomenduje:** zamknąć CR-1+CR-2 w DF **przed** jakimkolwiek Owner GO IMPLEMENT.

---

## 4. Co jest już gotowe (nie wymaga CHANGES)

| Element | Status |
|---------|--------|
| Fale A→B→C / Gate'y | FROZEN OK |
| SAFE = zawór + stop | FROZEN OK |
| D-P0d-1 semantyka *bez zaprawiania* | FROZEN OK |
| Multiswitch tylko `multiswitch` | FROZEN OK |
| Karty Seed §6 | FROZEN OK |
| Zakaz SMART / MS / Cloud CORE / Payroll | FROZEN OK |
| REUSE Quotes path | FROZEN OK |
| Suite TN/TP/TR + P0c (poza TN-CORE-Z1) | FROZEN OK |
| Mikro-ROI ≠ cel EPIC 88–92% | FROZEN OK |

---

## 5. Wiązania AR (obowiązują po amend / przy IMPLEMENT)

| ID | Wiązanie |
|----|----------|
| **AR-P0d-1** | Pierwszy Owner GO IMPLEMENT = **tylko fala A**, potem osobne GO **B**; **C** tylko po Gate B + GO C **oraz** po CR-2 |
| **AR-P0d-2** | Negation Guard = etap logiczny przed Match/bind — nie osobny silnik mapowania |
| **AR-P0d-3** | Jeden call site Resolvera w `mapOfferBoqLine` (P0c) — bez drugiego wire |
| **AR-P0d-4** | Seed bez Quotes = FAIL AC (D-P0d-14) |
| **AR-P0d-5** | Keywords seed nie mogą być jedyną ochroną przed negacją |

---

## 6. Architecture Checklist (powtórna)

| Zasada | Po DF AS-IS | Po CR-1+CR-2 (oczekiwane) |
|--------|-------------|---------------------------|
| SSOT FIRST | PASS | PASS |
| REUSE FIRST | PASS | PASS |
| ZERO DUPLICATE LOGIC | PASS | PASS (guard shared, nie drugi matcher) |
| DATA FIRST | PASS | PASS |
| FEATURE-DATA | PASS | PASS |
| Brak SMART / MS | PASS | PASS |
| Quotes REUSE only | PASS | PASS |
| Library tylko zatwierdzone Seedy | PASS | PASS |
| Negation bez bypass | **FAIL** | **PASS** (CR-2) |
| Zakres P0d zgodny z Owner | **FAIL** (§5) | **PASS** (CR-1) |

---

## 7. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: CHANGES REQUIRED
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR OWNER GO** | **NIE** |
| **CHANGES REQUIRED** | **TAK** — **CR-1** · **CR-2** |
| **Następny krok** | DF amend (U1 lub U2 + D-P0d-16 + TN-CORE-Z1) → krótki re-AR / Owner akceptacja amend → **READY FOR OWNER GO** |
| **IMPLEMENT / commit / push** | **NIE** — nie rozpoczęto |

**Ścieżka:** DF (zatwierdzony) → **ten AR (CHANGES REQUIRED)** → DF amend → READY FOR OWNER GO → IMPLEMENT A → B → (C wg CR-1).

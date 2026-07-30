# CATALOG-COVERAGE-01 — P0d PLAN UPDATE (Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0d-PLAN-UPDATE  
> **EPIC:** CATALOG-COVERAGE-01 · **Etap:** **P0d PLAN UPDATE**  
> **STATUS:** **PLAN UPDATE COMPLETE** · **DOCS ONLY**  
> **Data:** 2026-07-30  
> **Owner GO:** P0d PLAN UPDATE — **bez IMPLEMENT** · **bez commit** · **bez push**  
> **Wejście:** [`CATALOG-COVERAGE-01-P0d-AUDIT.md`](CATALOG-COVERAGE-01-P0d-AUDIT.md) · P0c CLOSED · Pack [`alias-pack-wave1.ts`](../../src/lib/catalog-coverage/alias-pack-wave1.ts)  
> **SSOT kontraktu (po AR):** [`CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md) · [`CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REREVIEW.md`](CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REREVIEW.md)  
> **Zastępuje:** naiwny „seed 5× reserved” · wcześniejszy PLAN z FULL wewnątrz P0d

```text
════════════════════════════════════════════════════════
P0d PLAN UPDATE — Precision + SAFE Seed ONLY
FULL Wave = P0e (POZA P0d)
Negation Guard → Bind Decision → Alias | Core
Zakaz: IMPLEMENT · commit · push
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Status** | **READY FOR DESIGN FREEZE** |
| **PLAN UPDATE REQUIRED?** | **NIE** |
| **Zakres P0d** | **A Precision** (Alias + Negation Guard) → **B SAFE Seed** (`zawor` + `stop_ptakow`) |
| **OUT P0d** | **FULL / P0e** · top grupy WC · Wave 2 Alias · SMART/MS · Fuzzy · Cloud CORE · Payroll |
| **DF** | Już **FROZEN + DF-AMEND** — ten PLAN jest **zsynchronizowany** z DF; kolejny Owner GO = **IMPLEMENT A** (nie ponowny DF, chyba że Owner wymaga) |
| **RE-REVIEW** | **READY FOR OWNER GO** — CR-1/CR-2 CLOSED |

**Uzasadnienie biznesowe:** Odblokować Alias Pack bez regresji (*bez zaprawiania bruzd*, RTV/SAT) i bezpiecznie zasiać **tylko** 2 niskoryzykowe Product ID (+Quotes); mikro-lift ~**+0.3 pp**; FULL i cel EPIC 88–92% = poza P0d.

---

## 1. Fałszywy match: *„bez zaprawiania bruzd”*

### 1.1 Reguła AS-IS (P0c Pack)

```ts
test: (h) => /zaprawiani\w*\s+bruzd|zamurowan\w*\s+bruzd/.test(h)
```

(`h` = fold PL po Normalizer)

### 1.2 Dlaczego false positive

1. Regex szuka **podciągu** `zaprawiani…` + `bruzd` **gdziekolwiek** w opisie.  
2. ATH kabli zawiera wyłączenie: *„…w gotowych bruzdach **bez zaprawiania bruzd**…”*.  
3. Po fold nadal istnieje fragment **`zaprawiania bruzd`** — spełnia regex.  
4. Negacja **„bez”** nie jest obsługiwana → traktowane jak zamówienie zaprawy.  
5. Dziś: `missingWork` ⇒ no-op (Core ≈ `legacy-elektryka-mb`).  
6. Po naiwnym seedzie ID: Alias **override** ⇒ **regresja ~10 linii** TV-01.

### 1.3 Propozycja precyzji (PLAN → DF)

| Element | Plan |
|---------|------|
| Pozytyw | Zachować `zaprawiani\w*\s+bruzd` oraz `zamurowan\w*\s+bruzd` |
| Negacja | **Negation Guard** — pierwszeństwo przed bindem |
| Kanon | *bez* (+ synonimy) + fraza zaprawiania ⇒ **zakaz** Product ID zaprawianie |
| Zakaz | AI · fuzzy · zmiana reserved ID |

**Pseudokod:**

```text
IF zamurowanie_bruzd → positive OK
ELSE IF negation_bez_zaprawiania → NO BIND (Guard)
ELSE IF zaprawianie_bruzd → positive OK
ELSE → no match
```

### 1.4 Przykłady

| Opis | Oczekiwane |
|------|------------|
| „Zaprawianie bruzd” | MATCH / dozwolony bind (gdy work — **P0e**) |
| „Zamurowanie bruzd…” | MATCH |
| „…**bez zaprawiania bruzd**…” | **NO** Alias · **NO** Core bind ID zaprawianie |

---

## 2. Multiswitch vs RTV/SAT

### 2.1 Reguła AS-IS

```ts
test: (h) => /multiswitch|rtv.?sat|instalacj\w*\s+antenow/.test(h)
```

### 2.2 Problem

| Alternatywa | Ocena |
|-------------|--------|
| `multiswitch` | **OK** — urządzenie |
| `rtv.?sat` | **FALSE** — gniazda/wypusty/okablowanie |
| `instalacj\w*\s+antenow` | **FALSE/MED** — zbyt szerokie |

**Dowód TV-01:** *„…gniazdo antenowe RTV/SAT”* → text-hit · Core `legacy-elektryka-mb`.

### 2.3 Propozycja

| | Plan |
|--|------|
| **IN** | Tylko token `multiswitch` |
| **OUT** | Gołe `rtv.?sat` · szeroka instalacja antenowa bez multiswitch |
| Seed ID | `cc-p0c-w1-multiswitch-antenowy` — **P0e** (nie P0d) |

### 2.4 Przykłady

| Opis | AS-IS | Po fix |
|------|-------|--------|
| „Instalowanie **multiswitcha** 9/20…” | MATCH | **MATCH** (OK) |
| „…gniazdo antenowe **RTV/SAT**” | MATCH | **NO MATCH** |
| „instalacja antenowa” bez multiswitch | MATCH | **NO MATCH** |

---

## 3. Fale wdrożeniowe (zaktualizowany zakres)

```text
[A] PRECISION + NEGATION GUARD
    · Pack: zaprawianie (negacja) · multiswitch (token)
    · Guard: Alias | Core (cały bind)
    · Testy TN/TP/TR + TN-CORE-Z1 + P0c
    · BEZ Library seed
         ↓ Gate A
[B] SAFE SEED + Quotes
    · cc-p0c-w1-zawor-odpowietrzajacy
    · cc-p0c-w1-stop-ptakow
         ↓ Gate B / RELEASE P0d

[P0e] FULL SEED                 ★ POZA P0d
    · zaprawianie-bruzd · zabezpieczenie-folia · multiswitch-antenowy
```

| Fala | Slice | IN | OUT |
|------|-------|----|-----|
| **A** | **P0d** | Precision + Negation Guard | Seed · P0e |
| **B SAFE** | **P0d** | **tylko** zawór + stop | Pozostałe reserved · P0e |
| **FULL** | **P0e** | 3 remaining reserved | — |

**Invariant:** Pozostałe wpisy (FULL) **dopiero** po poprawkach Alias/Guard **oraz** poza P0d (osobny slice P0e). W P0d SAFE startuje dopiero po Gate A.

---

## 4. Prognoza ROI / Coverage

**Baseline TV-01:** Quotes **76.4%** (1703/2228) · cel EPIC **88–92%**.

| Scenariusz | Δ linii | Δ pp | Coverage | Slice |
|------------|--------:|-----:|----------|-------|
| **A only** (precision + Guard) | 0 | 0.0 | **76.4%** | P0d |
| **SAFE Wave (B)** | **+6** | **+0.3** | **~76.7%** | P0d |
| **„Pełny P0d” po poprawkach** | **+6** | **+0.3** | **~76.7%** | = A+B (**bez** FULL) |
| **+ P0e FULL** *(orient.)* | +19 skumulowane | +0.9 | ~77.3% | **P0e — OUT** |
| **EPIC + top grupy** | +5–8 pp | — | ~88–92% | poza P0d/P0e reserved |

### Wpływ na cały EPIC

| Etap | Coverage |
|------|----------|
| Po P0a–P0c | **76.4%** |
| Po P0d (SAFE) | **~76.7%** |
| Po P0e FULL | **~77.3%** |
| Po seedzie top grup | **~88–92%** |

**Korekta oczekiwań:** P0d ≠ realizacja PLAN epic rank 4 (+5–8 pp). P0d = bezpieczeństwo Pack + mikro-lift SAFE.

---

## 5. Kryteria przejścia fal

### Gate A → B (SAFE)

| ID | Kryterium |
|----|-----------|
| G-A1 | **0** hit *bez zaprawiania bruzd* (TN-Z*) |
| G-A2 | MATCH „Zaprawianie/Zamurowanie bruzd” (TP-Z*) |
| G-A3 | **0** RTV/SAT-only (TN-M*) |
| G-A4 | MATCH multiswitcha (TP-M1) |
| G-A5 | P0c suite + TN/TP/TR subset A **PASS** |
| G-A6 | Quotes ≥ **76.4%** |
| G-A7 | Brak seedów `cc-p0c-w1-*` w A |
| G-A8 | **TN-CORE-Z1 PASS** (Guard vs Core) |

### Gate B → RELEASE P0d *(nie do FULL)*

| ID | Kryterium |
|----|-----------|
| G-B1 | SAFE works + Quotes aktywne |
| G-B2 | Lift ≥ **+6** (lub OV) |
| G-B3 | Quotes ≥ **76.6%** (stretch 76.7%) |
| G-B4 | Remap SAFE: **0** false |
| G-B5 | **0** seedów P0e w P0d |
| G-B6 | Pełne TN/TP/TR P0d + TR-P0c |

**Przejście do FULL:** **nie** Gate P0d — wymaga **Owner GO P0e** + osobny DF.

---

## 6. Karty Library Seed

> Product ID = reserved Work ID.

### 6.1 P0d SAFE (planowane w P0d)

| Product / Work ID | Est. nowych mapowań | Ryzyko | BIZ? | Status |
|-------------------|--------------------:|--------|------|--------|
| `cc-p0c-w1-zawor-odpowietrzajacy` | **+4** | **LOW** | **NIE** | **P0d SAFE** |
| `cc-p0c-w1-stop-ptakow` | **+2** | **LOW** | **NIE** | **P0d SAFE** |

### 6.2 P0e FULL (poza P0d — po poprawkach Alias/Guard)

| Product / Work ID | Est. nowych mapowań | Ryzyko | BIZ? | Status |
|-------------------|--------------------:|--------|------|--------|
| `cc-p0c-w1-zaprawianie-bruzd` | **+8** (+5 remap zamurowanie) | **LOW po Guard** (było HIGH) | **NIE** | **P0e** |
| `cc-p0c-w1-zabezpieczenie-folia` | **+4** (+5 remap stolarka/podłogi) | **MEDIUM** | **TAK (lekki)** | **P0e** |
| `cc-p0c-w1-multiswitch-antenowy` | **+1** | **LOW po precision** | **NIE** | **P0e** |
| `legacy-rozbiorki-m2` | 0 | — | — | Już w Library |

**Quotes:** obowiązkowe REUSE path przy każdym seedzie.  
**Zakaz P0d:** seed §6.2.

---

## 7. Analiza ryzyka

| ID | Ryzyko | Poziom | Mitygacja |
|----|--------|--------|-----------|
| R1 | Seed przed precision/Guard | **CRITICAL** | Fale A→B · Gate A |
| R2 | Negacja tylko w Alias | **HIGH** | Negation Guard na Alias **i** Core · TN-CORE-Z1 |
| R3 | RTV/SAT → multiswitch | **HIGH** | Token tylko `multiswitch` |
| R4 | Seed FULL w P0d | **HIGH** | FULL = P0e · G-B5 |
| R5 | Oczekiwanie 88% po P0d | **MEDIUM** | Jawny OUT top grup |
| R6 | Seed bez Quotes | **HIGH** | AC Quotes REUSE |
| R7 | SMART/MS/Cloud/Payroll | **N/A** | Zakaz scope |

---

## 8. Wymagane zmiany Alias Resolver / bind (lista)

| # | Zmiana | Fala |
|--:|--------|------|
| 1 | `zaprawianie_bruzd`: exclude / Guard negacji *bez zaprawiania bruzd* | **A** |
| 2 | `multiswitch_antenowy`: tylko `multiswitch` | **A** |
| 3 | **Negation Guard** → Bind Decision → Alias \| Core (shared SSOT) | **A** |
| 4 | Testy TN/TP/TR + **TN-CORE-Z1** + TR-P0c | **A** |
| 5 | Library seed SAFE + Quotes (2 ID) | **B** |
| 6 | FULL 3 ID | **P0e only** |

**Bez zmian:** kolejność Pack #1→#6 · reserved ID · pipeline Noise→Norm→… · fuzzy OFF · jeden Mapper.

---

## 9. Obowiązkowe testy regresyjne (przed RELEASE P0d)

### TN — negatywne

| ID | Case | Oczekiwane |
|----|------|------------|
| **TN-Z1** | *„…bez zaprawiania bruzd…”* | Alias NO · Guard zabrania ID zaprawianie |
| **TN-Z2** | `bez zaprawiania bruzd` | NO |
| **TN-Z3** | `z wyłączeniem zaprawiania bruzd` | NO |
| **TN-Z4** | Batch TV-01 ×10 | 0 bind zaprawianie |
| **TN-CORE-Z1** | Fixture work zaprawianie + opis znegowany · tor **Core** | `catalogWorkId ≠ cc-p0c-w1-zaprawianie-bruzd` |
| **TN-M1** | gniazdo RTV/SAT | Alias NO |
| **TN-M2** | instalacja antenowa bez multiswitch | NO |
| **TN-M3** | okablowanie RTV-SAT | NO |
| **TN-X1** | gołe `piece` | piece_demontaz NO |
| **TN-X2** | odpowietrzenie instalacji bez zaworu | nie forsować zaworu |

### TP — pozytywne

| ID | Case | Oczekiwane |
|----|------|------------|
| TP-Z1…Z3 | Zaprawianie / zamurowanie | MATCH (bind ID = P0e) |
| TP-M1 | Instalowanie multiswitcha | MATCH (seed = P0e) |
| TP-V1 | Zawór odpowietrzający | → seed SAFE po B |
| TP-S1 | Montaż stop ptaków | → seed SAFE po B |
| TP-F1 | Zabezpieczenie okien folią | MATCH (seed = P0e) |

### TR — regresja

| ID | Check |
|----|-------|
| **TR-P0c** | `scripts/test-catalog-coverage-01-p0c.mjs` **PASS** |
| TR-OV | Quotes ≥ baseline; po B ≥ 76.6% |
| TR-REMAP | SAFE 0 false |
| TR-IDEM / TR-NOISE / TR-DATA / TR-GUARD | PASS |

---

## 10. Architecture principles (PLAN binding)

| Zasada | |
|--------|--|
| SSOT FIRST | Pack · Guard · Library · TV-01 |
| REUSE FIRST | `mapOfferBoqLine` · Quotes P3.3 · Guard shared z Pack |
| ZERO DUPLICATE LOGIC | Jeden Guard · jeden Mapper |
| DATA FIRST | Bind gdy work; A bez seedu prod |
| FEATURE-DATA | SAFE seed · ALL-NIE |
| Brak SMART / MS / alt Quotes / Library poza SAFE | OUT |

---

## 11. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR DESIGN FREEZE** | **TAK** |
| **PLAN UPDATE REQUIRED** | **NIE** |
| **Uwaga procesu** | DF P0d **już FROZEN** (DF-AMEND) · RE-REVIEW **READY FOR OWNER GO** — praktyczny NEXT = **IMPLEMENT P0d-A** |
| **Commit / push / IMPLEMENT** | **NIE** w tej sesji |

**Ścieżka:** AUDIT → **ten PLAN UPDATE** → DF (done) → AR/RE-REVIEW (done) → Owner GO **IMPLEMENT A → B**.

# CATALOG-COVERAGE-01 — P0c ARCHITECTURE REVIEW (Alias Resolver)

> **ID:** CATALOG-COVERAGE-01-P0c-ARCHITECTURE-REVIEW  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0c — Alias Resolver**  
> **Etap:** **ARCHITECTURE REVIEW** · **DOCS ONLY**  
> **Data:** 2026-07-30  
> **DF:** [`CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE.md) · **FROZEN** · Owner zatwierdził  
> **Audit:** [`CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT.md`](CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT.md) · zaakceptowany  
> **Zakaz:** IMPLEMENT · kod · commit · push · Wave 2 · BIZ · P0d seed · SMART · MS

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0c ARCHITECTURE REVIEW
Decyzja: READY FOR OWNER GO
Kontrole Owner 1–12: ALL PASS · FAIL = 0
CHANGES REQUIRED: NIE
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF P0c FROZEN vs kontrole Ownera 1–12 + konflikt Alias Pack Wave 1 |
| Kod IMPLEMENT | **brak** |
| Dowód overlap | Probe RO na eligible unmapped TV-01 (`.tmp/catalog-coverage-01-classify.json`) — semantyka Wave 1 |
| Kryterium PASS | Brak sprzeczności blokującej IMPLEMENT; bindingi AR tylko wzmacniają DF |
| Kryterium FAIL | Sprzeczność DF / konflikt pack uniemożliwiający bezpieczny IMPLEMENT |

---

## 1. Kontrole Ownera (PASS/FAIL)

### 1. Alias Resolver jest deterministyczny

| Dowód DF | Ocena |
|----------|--------|
| §3.1 | Alias → Product ID · first match · zakaz heurystyk / AI / rankingów / fuzzy |
| Idempotencja | `resolve(resolve(x)) === resolve(x)` |

**Wiązanie AR (IMPLEMENT):** pure function; brak losowości; stała kolejność pack; test golden double-resolve.

**Werdykt: PASS**

---

### 2. Alias → Product ID wykorzystuje wyłącznie Alias Pack

| Dowód DF | Ocena |
|----------|--------|
| §3 · §4 | Wyjście ID tylko z Pack Wave 1 |
| §4.1 | Konkretne ID wiązane 1:1 do `aliasRuleId` przy IMPLEMENT (po odczycie Library) |
| §4.2 / denylist | Brak ad-hoc aliasów poza packiem |

**Wiązanie AR:** jedna stała SSOT Pack; zakaz drugiej listy w UI/SMART/Edge; zakaz „domyślania” ID poza packiem.

**Werdykt: PASS**

---

### 3. Resolver działa tylko dla pozycji eligible

| Dowód DF | Ocena |
|----------|--------|
| §2 | Noise → SKIP · Resolver nie działa |
| AC-P0c-2 | Eligible only |

**Wiązanie AR:** wire po `prepareOfferBoqLineForMapping` / `isNoise`; noise → `resolvedProductId = null` bez ewaluacji pack (lub early return).

**Werdykt: PASS**

---

### 4. Resolver działa po Normalizer i przed Product Mapper

| Dowód DF | Ocena |
|----------|--------|
| §2 pipeline | Noise → Normalizer → **Alias** → Mapper |
| Wejście | `normalizedDescription` (fold) |

**Wiązanie AR:** kolejność w `mapOfferBoqLine` identyczna jak P0a/P0b wire; Alias **przed** `mapOfferBoqLineCore`.

**Werdykt: PASS**

---

### 5. Brak zapisu do Product Library

| Dowód DF | Ocena |
|----------|--------|
| §3.3 · §6 | NIE zapisuje · NIE tworzy work · brak seed P0c |
| Brak work | no-op (`null`) |

**Werdykt: PASS**

---

### 6. Brak zapisu do Product Quotes

| Dowód DF | Ocena |
|----------|--------|
| §3.3 · §8 | Quotes / marketQuotes **NIE** |
| controlled_market | AS-IS tylko gdy mapped + Quotes (bez nowego write path) |

**Werdykt: PASS**

---

### 7. Wave 1 LOW jest jedynym zakresem P0c

| Dowód DF | Ocena |
|----------|--------|
| §4 | Dokładnie **6** reguł Wave 1 |
| §4.2 | Wave 2 / BIZ / HIGH explicit OUT |

**Werdykt: PASS**

---

### 8. Business Decisions pozostają poza implementacją

| Dowód DF | Ocena |
|----------|--------|
| §5 | D1–D5 (bruzdy, Winidur, gzyms, pomiary, KRS) = **POZA** |
| Denylist | Zakaz rozwiązywania BIZ „przy okazji” |

**Werdykt: PASS**

---

### 9. HIGH / P0d pozostaje poza zakresem

| Dowód DF | Ocena |
|----------|--------|
| §6 | Seed Library · HIGH ROI Audit → **P0d / OUT** |
| Cel 88–92% | Nie oczekiwany po samym P0c |

**Werdykt: PASS**

---

### 10. Jeden call site Resolvera

| Dowód DF | Ocena |
|----------|--------|
| §7 | Tor coverage: wyłącznie `mapOfferBoqLine` (Noise → Normalize → Alias → Core) |
| Moduł | Thin `catalog-coverage/alias-resolver.ts` — wołany z jednego miejsca wire |

**Wiązanie AR:** static check — brak drugiego wywołania Resolvera z UI / SMART / Edge / osobnego matchera.

**Werdykt: PASS**

---

### 11. SSOT / REUSE / ZERO DUP / FEATURE-DATA / DATA FIRST

| Zasada | Dowód DF | Werdykt |
|--------|----------|---------|
| **SSOT FIRST** | Pack Wave 1 SSOT · Library SSOT odczytu ID · opis UI oryginał | **PASS** |
| **REUSE FIRST** | `mapOfferBoqLine` · `foldPolishText` · wzorzec pure Noise/Normalizer · odczyt works AS-IS | **PASS** |
| **ZERO DUPLICATE LOGIC** | Brak forka Core · brak drugiego writers `catalogWorkId` · brak duplikatu Pack | **PASS** |
| **FEATURE-DATA ONLY** | Brak nowych DATA_KEYS / cloud / migracji | **PASS** |
| **DATA FIRST** | Bind tylko gdy work istnieje i aktywny; inaczej null | **PASS** |

**Uwaga REUSE vs CM-01 boost:** P0c Wave 1 = **direct Product ID bind**, **nie** rozszerzenie score-boost CM-01. Zgodne z DF §3.4 · §11 — brak dublowania rankingu. Stolarka/oddym/SSP CM-01 pozostaje nienaruszona i **poza** Pack P0c.

---

### 12. Konflikty Alias Pack Wave 1

#### 12.1 Duplikaty aliasów (`aliasRuleId`)

| Check | Wynik |
|-------|--------|
| Unikalność 6 `aliasRuleId` | **PASS** — brak duplikatów ID |
| Unikalność targetów logicznych | **PASS** — 6 różnych produktów referencyjnych |

#### 12.2 Alias → wiele Product ID

| Check | Wynik |
|-------|--------|
| Model DF | **1 ruleId → 1 target logiczny → 1 `catalogWorkId`** (bind przy IMPLEMENT) |
| Zakaz | Wiele ID na jedną regułę · „najlepszy z N” |

**Wiązanie AR:** przy IMPLEMENT każda reguła ma **dokładnie jeden** zweryfikowany `catalogWorkId`; brak ID → no-op całej reguły (nie fallback na listę kandydatów).

**Werdykt: PASS**

#### 12.3 Reguły nachodzące / first match

Analiza semantyczna Pack (#1→#6):

| Para | Ryzyko overlap | Ocena |
|------|----------------|--------|
| `zaprawianie_bruzd` × pozostałe | Brak wspólnych fraz | **OK** |
| `zawor_odpowietrzajacy` × pozostałe | Brak | **OK** |
| `zabezpieczenie_folia` × `stop_ptakow` | Oba „zabezpieczeni*” — **różne kontynuacje** (okien+folia vs przed ptakami / stop ptak) | **Niskie**; first match: folia (#3) przed stop (#4) |
| `multiswitch_antenowy` × pozostałe | Brak | **OK** |
| `piece_demontaz` × pozostałe | Brak na TV-01 | **OK** |

**Probe RO (eligible unmapped TV-01, semantyka Wave 1):**

| `aliasRuleId` | Trafienia | Multi-hit (≥2 reguły na 1 linię) |
|---------------|----------:|----------------------------------:|
| `zaprawianie_bruzd` | 8 | — |
| `zawor_odpowietrzajacy` | 4 | — |
| `zabezpieczenie_folia` | 4 | — |
| `stop_ptakow` | 2 | — |
| `multiswitch_antenowy` | 1 | — |
| `piece_demontaz` | 1 | — |
| **Suma multi-hit** | — | **0** |

**Zasada first match:** kolejność #1→#6 FROZEN; przy teoretycznym overlap wygrywa wcześniejsza reguła — **deterministycznie**. Na próbie TV-01 overlap **nie występuje**.

**Wiązanie AR (IMPLEMENT) — zacieśnienie match do semantyki DF (bez zmiany Pack):**

| Reguła | Wymóg match |
|--------|-------------|
| `zaprawianie_bruzd` | zaprawianie/zamurowanie **+** bruzd |
| `zawor_odpowietrzajacy` | zawór odpowietrzający / odpowietrznik |
| `zabezpieczenie_folia` | zabezpieczenie **okien** (lub powierzchni) **fol** |
| `stop_ptakow` | stop ptak* / kolce przeciw* / zabezpieczenie przed ptak* |
| `multiswitch_antenowy` | multiswitch / RTV-SAT / instalacja antenowa |
| `piece_demontaz` | (rozebranie\|demontaż) **+** (piec*\|trzon* kuchen*) — **nie** gołe „piece” bez kontekstu demontażu |

**Werdykt kontroli 12: PASS** (brak konfliktów blokujących; binding zacieśnia `piece_demontaz`)

---

## 2. Binding AR — override Core (doprecyzowanie DF §11)

| Decyzja AR | FROZEN dla IMPLEMENT |
|------------|----------------------|
| Gdy Pack hit + work aktywny | Mapper **binduje** `resolvedProductId` (**override** Core na tej linii) |
| Uzasadnienie | Owner: brak rankingów — Alias deterministyczny wygrywa nad score competition |
| Gdy miss / brak work | Core AS-IS |

Zgodność z epic AR („Mapper jedyny właściciel `catalogWorkId`”): **TAK** — aplikacja ID nadal wyłącznie w `mapOfferBoqLine`; Alias tylko dostarcza ID.

---

## 3. Zgodność z epic DF / P0a / P0b

| Warstwa | Konflikt z P0c? |
|---------|-----------------|
| P0a Noise | **NIE** — eligible gate |
| P0b Normalizer | **NIE** — wejście = tekst po normalizacji |
| Epic pipeline Alias slot | **NIE** — ten sam slot §3 |
| CM-01 boost stolarka | **NIE** — poza Pack; P0c nie rozszerza boost |

---

## 4. Ryzyka pozostałe (nie blokują GO)

| Ryzyko | Status | Mitygacja IMPLEMENT |
|--------|--------|---------------------|
| Brak work w Library → 0 lift | Akceptowalne | no-op · AC regresji Quotes ≥ 76.4% |
| False map Wave 1 | Niskie | OV sample · zacieśnienie §12 |
| Scope creep Wave 2 | Kontrolowane | Denylist DF |

---

## 5. Podsumowanie kontroli

| # | Kontrola | Werdykt |
|---|----------|---------|
| 1 | Determinizm | **PASS** |
| 2 | Wyłącznie Alias Pack → Product ID | **PASS** |
| 3 | Eligible only | **PASS** |
| 4 | Po Normalizer · przed Mapper | **PASS** |
| 5 | Brak zapisu Library | **PASS** |
| 6 | Brak zapisu Quotes | **PASS** |
| 7 | Wave 1 ONLY | **PASS** |
| 8 | BIZ poza | **PASS** |
| 9 | HIGH/P0d poza | **PASS** |
| 10 | Jeden call site | **PASS** |
| 11 | SSOT / REUSE / ZERO DUP / FEATURE-DATA / DATA FIRST | **PASS** |
| 12 | Konflikty Pack (duplikaty / 1:1 ID / overlap / first match) | **PASS** |

**FAIL = 0**

---

## 6. WERDYKT

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0c ARCHITECTURE REVIEW
Status: READY FOR OWNER GO
CHANGES REQUIRED: NIE
FAIL: 0
NEXT: Owner GO IMPLEMENT P0c (Wave 1 ONLY)
Zakaz auto-start IMPLEMENT / commit / push
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **Decyzja** | **READY FOR OWNER GO** |
| **CHANGES REQUIRED** | **NIE** |
| **DF amend wymagany?** | **NIE** |

**Artefakt DF:** [`CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE.md)  
**Ten plik:** SSOT Architecture Review P0c

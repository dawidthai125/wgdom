# CATALOG-COVERAGE-01 — P0c DESIGN FREEZE (Alias Resolver)

> **ID:** CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0c — Alias Resolver**  
> **Etap:** **DESIGN FREEZE** · **DOCS ONLY**  
> **STATUS:** **DESIGN FREEZE · FROZEN (P0c)**  
> **Data:** 2026-07-30  
> **Owner GO:** DESIGN FREEZE P0c — **zaakceptowany Alias Audit**  
> **Wejście:** [`CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT.md`](CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT.md) · epic DF [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) §2.3 · §3  
> **Zakaz:** IMPLEMENT · commit · push · Wave 2 · BIZ · HIGH/P0d · SMART · MS · seed Library

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0c DESIGN FREEZE · FROZEN
Zakres: Wave 1 (LOW) Alias Pack ONLY
Alias (deterministyczny) → Product ID
Pipeline: Noise → Normalizer → Alias → Mapper
Zakaz: IMPLEMENT / commit / push
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Rekomendacja** | **READY FOR ARCHITECTURE REVIEW** |
| **CHANGES REQUIRED?** | **NIE** |
| **Zakres P0c** | **Wyłącznie Wave 1 (LOW)** |
| **Est. lift Quotes (Audit)** | **~+0.7 pp** (Wave 1) — nie cel EPIC 88–92% |
| **NEXT** | Architecture Review P0c → Owner GO **IMPLEMENT P0c** (nie auto-start) |

---

## 1. Cel zamrożony

| | FROZEN |
|--|--------|
| **IN** | Deterministyczne rozwiązanie równoważnych fraz ATH → **istniejący** `catalogWorkId` (Product ID) |
| **OUT** | Heurystyki · AI · rankingi score · fuzzy · tworzenie work · zapis Library/Quotes · Wave 2 / BIZ / HIGH |
| **KPI slice** | TV-01: Quotes ≥ **76.4%** (brak regresji) · opc. lift Wave 1 ~**+0.7 pp** gdy target work + Quotes istnieją |
| **Klasa** | **FEATURE-DATA** · Gate ALL-NIE |

---

## 2. Pipeline FROZEN (P0c)

```text
[0] OfferBoq line
      ↓
[1] NOISE FILTER          ★ P0a CLOSED — noise → SKIP (Resolver NIE działa)
      ↓ (eligible only)
[2] NORMALIZER            ★ P0b CLOSED — forma only
      ↓
[3] ALIAS RESOLVER        ★ P0c — TEN DOKUMENT
      · wejście: normalizedDescription (fold)
      · Alias Pack Wave 1 ONLY
      · wyjście: resolvedProductId | null (+ aliasRuleId ephemeral)
      ↓
[4] PRODUCT MAPPER        ★ jedyny zapis catalogWorkId na linii
      · gdy resolvedProductId ≠ null i work aktywny → bind ID (bez rankingu)
      · gdy null → mapOfferBoqLineCore AS-IS
      ↓
[5] Product Library (READ) · Quotes · AI-COST · SMART — AS-IS
```

**Invariant kolejności:** Alias **po** Normalizer · **przed** Product Mapper.  
**Invariant eligible:** Resolver **nie** uruchamia się dla `isNoise === true`.

---

## 3. Alias Resolver — kontrakt FROZEN

### 3.1 Determinizm

| Reguła | FROZEN |
|--------|--------|
| Model | **Alias → Product ID** (1:1 przy trafieniu reguły) |
| Heurystyki | **ZAKAZ** |
| AI / LLM | **ZAKAZ** |
| Rankingi / score competition między aliasami | **ZAKAZ** |
| Fuzzy / partial token rank | **ZAKAZ** |
| Kolejność reguł | **Stała kolejność w Alias Pack** — **first match wins** |
| Idempotencja | `resolve(resolve(x)) === resolve(x)` · ten sam input → ten sam `resolvedProductId` |

### 3.2 Wejście / wyjście

| | FROZEN |
|--|--------|
| **Wejście** | Tekst po Normalizer (`normalizedDescription` lub równoważny hay fold PL) · **tylko eligible** |
| **Wyjście** | `resolvedProductId: string \| null` · `aliasRuleId: string \| null` · opc. `aliasLabel` |
| **Persystencja** | **Ephemeral** (tag na linii / wynik mapowania) — **bez** nowego KV · **bez** zapisu Library |
| **UI description** | **Bez zmian** (SSOT opis = oryginał; jak P0b) |

### 3.3 Zapis / side-effects

| Cel | P0c |
|-----|-----|
| Product Library (`kw-wgdom-work-catalog`) | **NIE zapisuje** · **NIE tworzy** work |
| Quotes / marketQuotes | **NIE** |
| SMART / MARKET-SYNC / Cloud CORE / Payroll | **NIE** |
| Drugi matcher / fork Core scoring | **NIE** |

**Warunek bind:** `resolvedProductId` wolno ustawić tylko gdy work o tym ID **istnieje i jest aktywny** w Library (odczyt). Brak work → traktuj jak **miss** (`null`) — **nie** wymyślaj ID.

### 3.4 Relacja do Product Mapper (SSOT decyzji)

| | FROZEN |
|--|--------|
| **Właściciel `catalogWorkId` na linii** | Nadal **Product Mapper** (`mapOfferBoqLine`) — jeden call site |
| **Rola Alias** | Dostarcza **deterministyczny Product ID** (lub null) |
| **Gdy ID ≠ null + work OK** | Mapper **binduje** to ID (matchedBy / sygnał alias) — **bez** rankingu alternatyw |
| **Gdy null** | Core scoring **AS-IS** (P0a/P0b bez zmian reguł Core) |
| **CM-01 score boost** | **Poza zakresem P0c Wave 1** — P0c **nie** rozszerza rankingu boost; Wave 1 = **direct ID bind** |

Uściślenie względem epic AR §3: „mapuje nazwy” = Resolver rozwiązuje równoważność do ID; Mapper pozostaje jedynym miejscem **aplikacji** `catalogWorkId` na `OfferBoqLine`.

---

## 4. Alias Pack Wave 1 — JEDYNY zakres P0c

Źródło: Alias Audit §6 Wave 1 (LOW).  
**Wave 2 · Wave 2-BIZ · HIGH · P0d ROI — OUT.**

| # | `aliasRuleId` | Match (semantyka FROZEN) | Target referencyjny (logiczny) | Est. n (Audit) |
|--:|---------------|--------------------------|--------------------------------|---------------:|
| 1 | `zaprawianie_bruzd` | Zaprawianie / zamurowanie bruzd | Work: zaprawianie bruzd | 8 |
| 2 | `zawor_odpowietrzajacy` | Zawór odpowietrzający / odpowietrznik | Work: zawór odpowietrzający | 4 |
| 3 | `zabezpieczenie_folia` | Zabezpieczenie okien (powierzchni) folią | Work: zabezpieczenie folią | 4 |
| 4 | `stop_ptakow` | Stop ptaków / kolce przeciw ptakom (elewacja) | Work: stop ptaków | 2 |
| 5 | `multiswitch_antenowy` | Multiswitch / instalacja antenowa RTV-SAT | Work: multiswitch / RTV-SAT | 1 |
| 6 | `piece_demontaz` | Demontaż pieców / trzonów kuchennych | Work: demontaż pieców | 1 |

**Kolejność pack (#1→#6) = kolejność ewaluacji (first match wins).**

### 4.1 Binding Product ID (IMPLEMENT gate — nie teraz)

| Zasada | FROZEN |
|--------|--------|
| DF zamraża **ruleId + semantykę match + target logiczny** | **TAK** |
| Konkretne `catalogWorkId` | Wiązane przy IMPLEMENT **po** weryfikacji odczytu Library |
| Brak work dla reguły | Reguła = **no-op** (null) · **zakaz** seed Library w P0c |
| Zmiana składu Wave 1 | Tylko **DF amend** + Owner GO |

### 4.2 Explicit OUT (nie w Pack P0c)

| OUT | Powód |
|-----|--------|
| `bruzdy_instalacyjne` (szerokie) | BIZ — poza implementacją |
| `rury_winidur` · `gzyms_elewacja` | BIZ |
| Wave 2 MED (przebicia, mocowanie, GK, …) | Poza Wave 1 |
| `rozbiorka_ogolna` · `gruntowanie_*` · ETICS · styropian | HIGH / P0d |
| Pomiary RCD · opinie · KRS URL | Nie alias materiałowy / Noise |
| Stolarka CM-01 (drzwi/okna/oddym/SSP) | Już CM-01 · **nie dublować** w P0c |

---

## 5. Decyzje biznesowe — FROZEN OUT

| Decyzja (Audit D1–D5) | Status w P0c |
|------------------------|--------------|
| Bruzdy hydr. vs elektr. | **POZA** implementacją |
| Winidur vs PCV | **POZA** |
| Gzyms — typ wykończenia | **POZA** |
| Pomiary / opinie → WC? | **POZA** |
| KRS URL → Noise+ | **POZA** (nie Alias) |

**Zakaz:** nie rozwiązywać BIZ „przy okazji” P0c.

---

## 6. HIGH ROI / P0d — FROZEN OUT

| | FROZEN |
|--|--------|
| Seed Product Library | **P0d** — nie P0c |
| HIGH ROI z Audit (rozbiórki, gruntowanie, podokienniki, izolacje…) | **Nie część P0c** |
| Cel EPIC 88–92% | **Nie** oczekiwany po samym P0c |

---

## 7. Call site / REUSE / ZERO DUPLICATE

| Zasada | FROZEN |
|--------|--------|
| **Jeden call site** toru coverage | `mapOfferBoqLine` (wire: Noise → Normalize → **Alias** → Core) |
| **Moduł Resolver** | Nowy thin: np. `src/lib/catalog-coverage/alias-resolver.ts` (+ export `index`) — **pure function** |
| **SSOT Pack** | Jedna tablica / stała Wave 1 w module catalog-coverage (lub sąsiedni plik pack) — **ZERO** drugiej listy w UI / SMART / Edge |
| **REUSE** | `foldPolishText` · wzorzec pure jak Noise/Normalizer · odczyt works jak AS-IS Mapper |
| **ZERO DUPLICATE** | Nie kopiować logiki Noise/Normalizer · nie forkować `mapOfferBoqLineCore` scoring · nie drugi `catalogWorkId` writer |
| **DATA FIRST** | Target = istniejące ID w Library; brak ID → null (dane decydują, nie kod „na siłę”) |
| **FEATURE-DATA ONLY** | Brak nowych `DATA_KEYS` / cloud sync / migracji |

---

## 8. AI-COST / SMART / MARKET-SYNC

| Obszar | P0c |
|--------|-----|
| AI-COST | **Bez zmian** poza wejściem przez istniejący tor `mapOfferBoqLine` (więcej linii może dostać ID → controlled_market AS-IS) |
| SMART Detect | **Bez zmian** logiki / Evidence / One-shot |
| MARKET-SYNC | **Bez zmian** Accept/Publish |
| controlled_market | AS-IS gdy mapped + Quotes |

---

## 9. Acceptance Criteria (szkic pod IMPLEMENT — nie teraz)

| ID | Kryterium |
|----|-----------|
| **AC-P0c-1** | Pack = wyłącznie 6 reguł Wave 1 z §4 |
| **AC-P0c-2** | Eligible only · noise → Resolver nie ustawia ID |
| **AC-P0c-3** | Kolejność: po Normalizer · przed Core |
| **AC-P0c-4** | Deterministyczny first-match · idempotentny |
| **AC-P0c-5** | Zero zapisu Library / Quotes / cloud |
| **AC-P0c-6** | TV-01 Quotes ≥ 76.4% · brak wzrostu mapped+missing Quotes |
| **AC-P0c-7** | OV: false-map Wave 1 = **0** na sample reguł |
| **AC-P0c-8** | Brak work dla reguły → null (no-op), bez crash |
| **AC-P0c-9** | Static: jeden call site decyzji `catalogWorkId` |

---

## 10. Architecture Review Checklist (P0c)

| # | Kontrola | Status DF | Dowód |
|---|----------|-----------|--------|
| 1 | **Determinizm** | **PASS** | Alias → Product ID · first match · zakaz heurystyk/AI/rankingów (§3.1) |
| 2 | **Idempotencja** | **PASS** | Pure resolve · ten sam hay → ten sam ID (§3.1) |
| 3 | **Brak zmian Product Library** | **PASS** | §3.3 · §6 — read-only; brak seed |
| 4 | **Brak zmian SMART** | **PASS** | §8 |
| 5 | **Brak zmian MARKET-SYNC** | **PASS** | §8 |
| 6 | **Brak zmian AI-COST poza wywołaniem Resolvera** | **PASS** | §8 — tylko tor mapOfferBoqLine |
| 7 | **Jeden call site** | **PASS** | §7 — `mapOfferBoqLine` |
| 8 | **SSOT FIRST** | **PASS** | Pack Wave 1 SSOT · Library SSOT odczytu ID · opis UI oryginał |
| 9 | **REUSE FIRST** | **PASS** | catalog-coverage + mapOfferBoqLine + fold · bez drugiego matchera |
| 10 | **ZERO DUPLICATE LOGIC** | **PASS** | §7 |
| 11 | **FEATURE-DATA ONLY** | **PASS** | §1 · §7 — bez nowych DATA_KEYS |
| 12 | **DATA FIRST** | **PASS** | Bind tylko gdy work istnieje · inaczej null |

**FAIL = 0** → **READY FOR ARCHITECTURE REVIEW**.

---

## 11. Ryzyka zamrożone / mitygacje

| Ryzyko | Mitygacja FROZEN |
|--------|------------------|
| False map Wave 1 | Wąskie frazy LOW · OV sample · first match stały |
| 0 lift (brak work) | No-op · lift nieobowiązkowy do AC regresji · seed = P0d |
| Scope creep Wave 2/BIZ | Explicit OUT §4.2 · §5 |
| Kolizja z CM-01 boost | P0c Wave 1 = direct ID · nie rozszerzać boost rankingu |
| Nadpisanie poprawnego Core match | IMPLEMENT: alias bind tylko gdy Core unmatched **lub** reguła pack + zgodność — **AR może doprecyzować**; DF preferuje: **eligible + pack hit + work OK → bind** (determinizm > konkurencja score) |

**Binding proponowany dla AR (nie IMPLEMENT):**  
Gdy pack hit i work OK → **zawsze bind** Product ID z Alias (deterministyczny override Core na tej linii).  
Uzasadnienie Owner: brak rankingów — Alias wygrywa jednoznacznie nad score competition.

---

## 12. Denylist P0c (FROZEN)

- IMPLEMENT / commit / push bez Owner GO IMPLEMENT  
- Wave 2 / BIZ / HIGH / P0d seed  
- Fuzzy · AI · heurystyki · ranking aliasów  
- Zapis Library / Quotes / nowe KV  
- Drugi matcher · obniżenie globalnego progu Core  
- SMART P1 FULL · MS Publish · Cloud CORE · Payroll  
- Rozwiązywanie decyzji biznesowych w kodzie P0c  

---

## 13. Artefakty / powiązania

| Dokument | Rola |
|----------|------|
| **Ten plik** | **SSOT DESIGN FREEZE P0c** |
| [`CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT.md`](CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT.md) | Audit · Wave 1 źródło pack |
| [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) | Epic DF · pipeline |
| [`CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md`](CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md) | AR epic (P0a–d) |
| P0a / P0b CLOSEOUT | Warstwy przed Alias — CLOSED |

---

## 14. WERDYKT DESIGN FREEZE P0c

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0c DESIGN FREEZE · FROZEN
Zakres: Wave 1 LOW Alias Pack (6 reguł)
Model: Alias → Product ID (deterministyczny, first match)
Eligible only · po Normalizer · przed Mapper
Library write: NIE · BIZ/HIGH/P0d: OUT
Checklist AR: ALL PASS
Rekomendacja: READY FOR ARCHITECTURE REVIEW
CHANGES REQUIRED: NIE
════════════════════════════════════════════════════════
```

**NEXT:** Architecture Review P0c → Owner GO IMPLEMENT P0c.  
**NIE** auto-start IMPLEMENT · commit · push.

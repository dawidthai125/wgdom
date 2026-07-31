# CATALOG-COVERAGE-01 — P0e DESIGN FREEZE (FULL Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0e-DESIGN-FREEZE  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0e — FULL Library Seed**  
> **Etap:** **DESIGN FREEZE** · **DOCS ONLY**  
> **STATUS:** **DESIGN FREEZE · FROZEN**  
> **Data:** 2026-07-31  
> **Owner GO:** DESIGN FREEZE P0e · **BIZ-P0e-1 = Wariant A** (jedno Product ID folia)  
> **Wejście:** PLAN zaakceptowany [`CATALOG-COVERAGE-01-P0e-PLAN.md`](CATALOG-COVERAGE-01-P0e-PLAN.md) · AUDIT [`CATALOG-COVERAGE-01-P0e-AUDIT.md`](CATALOG-COVERAGE-01-P0e-AUDIT.md) · P0d-A CLOSED · tip UI **2.65.90** / **`b9da6bff`**  
> **Zakaz:** IMPLEMENT · commit · push · zmiana Guard / Alias Pack · SMART · MS · rewrite Quotes · Wave 2 · Wariant B

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0e DESIGN FREEZE · FROZEN
IN:  3 reserved seeds + Quotes REUSE (FEATURE-DATA)
     zaprawianie-bruzd · zabezpieczenie-folia · multiswitch
BIZ-P0e-1 = WARIANT A (1 ID folia) · Alias Pack = ZERO zmian
OUT: Guard/Pack/SMART/MS/Quotes engine · Wariant B · Wave 2
KPI: 76.7% → ~77.3% (+0.6 pp)
Zakaz: IMPLEMENT / commit / push
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Status** | **READY FOR ARCHITECTURE REVIEW** |
| **CHANGES REQUIRED?** | **NIE** |
| **BIZ-P0e-1** | **FROZEN = Wariant A** |
| **Zakres** | **Dokładnie 3** Product ID — zero rozszerzeń |
| **Kod runtime** | **ZERO zmian** Guard · Alias Precision · SMART · MS · Quotes engine |
| **Klasa** | **FEATURE-DATA** · Gate G1–G9 **ALL-NIE** |
| **NEXT** | Architecture Review → Owner GO **IMPLEMENT** — **nie** auto-start |

**Jednozdaniowo:** P0e zamraża seed Library+Quotes trzech reserved ID Pack Wave 1; folia = jeden Product ID; pipeline Guard/Pack AS-IS; Coverage **76.7% → ~77.3%**.

---

## 1. Cel zamrożony

| | FROZEN |
|--|--------|
| **IN** | Seed Product Library + Quotes dla **3** reserved Work ID (REUSE OPS path) |
| **OUT** | Zmiana Negation Guard · Alias Pack · SMART · MARKET-SYNC · rewrite Product Quotes · Wave 2 · Fuzzy · Cloud CORE · Payroll · Wariant B · top grupy WC · SAFE re-seed |
| **KPI Coverage** | Baseline **76.7%** → target **≥ 77.2%** (prognoza **~77.3%**, **+0.6 pp**) |
| **KPI jakości** | **0** FP *bez zaprawiania bruzd* · **0** FP RTV/SAT→multiswitch · H-1…H-5 |
| **Klasa** | **FEATURE-DATA** |
| **SSOT Product ID** | Pack [`alias-pack-wave1.ts`](../../src/lib/catalog-coverage/alias-pack-wave1.ts) — **bez zmiany** reserved ID / `test` |

---

## 2. BIZ-P0e-1 — FROZEN (Owner)

| | |
|--|--|
| **Decyzja** | **Wariant A** |
| **Model** | **Jedno** Product ID `cc-p0c-w1-zabezpieczenie-folia` = ochrona folią (okna · drzwi · podłogi · stolarka) |
| **Alias Pack** | **Brak zmian** — reguła `zabezpieczenie_folia` AS-IS |
| **Wariant B** | **OUT P0e** — osobne ID okna/drzwi/podłogi = poza zakresem (wymagałoby Pack) · ewentualny P1/Wave 2 |
| **Remap świadomy** | 5 linii (3× stolarka · 2× podłogi) → ten ID = **AKCEPTOWANE** (precyzja vs legacy bucket) |

**Invariant:** Żadne nowe Product ID folii poza `cc-p0c-w1-zabezpieczenie-folia`.

---

## 3. Karty Seed FROZEN (dokładnie 3)

> Product ID = reserved Work ID (1:1). Quotes **OBOWIĄZKOWE**. Tor = **REUSE** P0d-A OPS / `commitMarketQuotesImport` (bez nowego write path).

### 3.1 `cc-p0c-w1-zaprawianie-bruzd`

| Pole | FROZEN |
|------|--------|
| **Product ID** | `cc-p0c-w1-zaprawianie-bruzd` |
| **Alias rule** | `zaprawianie_bruzd` — Pack **AS-IS** |
| **namePl** | Zaprawianie / zamurowanie bruzd |
| **unit** | `m` |
| **keywords** | `zaprawianie bruzd`, `zamurowanie bruzd` |
| **Zakaz keywords** | bare `bruzd`, bare `zaprawianie` |
| **legacyCategoryId** | **absencja** (`undefined` / nie ustawiać) |
| **Quotes** | **OBOWIĄZKOWE** (REUSE) |
| **Lift unmapped** | **+8** |
| **ROI** | **~+0.36 pp** |
| **Remap** | +5 zamurowanie → ten ID (**OK**) |
| **Guard** | REUSE AS-IS — *bez zaprawiania bruzd* ⇒ **zakaz bindu** tego ID |

### 3.2 `cc-p0c-w1-zabezpieczenie-folia` (Wariant A)

| Pole | FROZEN |
|------|--------|
| **Product ID** | `cc-p0c-w1-zabezpieczenie-folia` |
| **Alias rule** | `zabezpieczenie_folia` — Pack **AS-IS** (**0** zmian) |
| **namePl** | Zabezpieczenie powierzchni folią |
| **unit** | `m2` |
| **keywords** | `zabezpieczenie okien folią`, `zabezpieczenie podłóg folią`, `zabezpieczenie stolarki folią` *(frazy — nie bare)* |
| **Zakaz keywords** | bare `folia`, bare `foli` |
| **legacyCategoryId** | **absencja** |
| **Quotes** | **OBOWIĄZKOWE** (REUSE) |
| **Lift unmapped** | **+4** |
| **ROI** | **~+0.18 pp** |
| **Remap** | +5 stolarka/podłogi → ten ID (**OK · BIZ A**) |
| **Zakres BIZ** | okna + drzwi + podłogi + stolarka w **jednym** ID |

### 3.3 `cc-p0c-w1-multiswitch-antenowy`

| Pole | FROZEN |
|------|--------|
| **Product ID** | `cc-p0c-w1-multiswitch-antenowy` |
| **Alias rule** | `multiswitch_antenowy` — Pack **AS-IS** (tylko token `multiswitch`) |
| **namePl** | Multiswitch antenowy |
| **unit** | `szt` |
| **keywords** | `multiswitch`, `multiswitch antenowy` |
| **Zakaz keywords** | `rtv`, `sat`, `instalacja antenowa` |
| **legacyCategoryId** | **absencja** |
| **Quotes** | **OBOWIĄZKOWE** (REUSE) |
| **Lift unmapped** | **+1** |
| **ROI** | **~+0.04 pp** |
| **Remap** | **0** |

### 3.4 Zakaz seedów poza listą

```text
ZAKAZ seed:
  · cc-p0c-w1-* spoza §3.1–§3.3
  · ponowny SAFE (zawór / stop)
  · Wariant B (osobne ID folii)
  · top grupy WC / Wave 2
  · seed bez Quotes
```

---

## 4. Coverage FROZEN

| Etap | Quotes TV-01 | Δ pp |
|------|-------------:|-----:|
| Baseline (po P0d-A) | **76.7%** (1709/2228) | — |
| **Cel P0e (Wariant A)** | **~77.3%** (1722/2228) | **+0.6** |
| Minimum ACCEPT | **≥ 77.2%** | ≥ +0.5 |
| Floor (brak regresji) | **≥ 76.7%** | ≥ 0 |
| Cel EPIC 88–92% | — | **OUT P0e** |

```text
76.7%  →  ~77.3%
```

Lift = **+13** unmapped z Quotes na 3 nowych works. Remap 10 linii **nie** liczy się do Δ% Quotes.

---

## 5. Architektura — zasady (weryfikacja DF)

### 5.1 SSOT FIRST

| SSOT | Rola P0e |
|------|----------|
| Pack Wave 1 | Jedyna lista Alias rule → Product ID — **bez edycji** |
| Negation Guard | Jedyna detekcja negacji zaprawiania — **bez edycji** |
| Product Library work `id` | Jedyny właściciel Product ID po seed |
| Ten dokument | Kontrakt seed / BIZ / AC / OUT |

**PASS** — brak drugiego Pack / drugiej listy FULL ID.

### 5.2 REUSE FIRST

| Element | REUSE |
|---------|-------|
| Negation Guard | AS-IS P0d-A |
| Alias Pack + Resolver | AS-IS P0d-A |
| `mapOfferBoqLine` / Bind Decision | AS-IS |
| OPS seed + Quotes | Wzorzec [`catalog-coverage-01-p0d-a-ops.mjs`](../../scripts/catalog-coverage-01-p0d-a-ops.mjs) · `commitMarketQuotesImport` |
| Testy TN-Z / TN-M / TN-CORE-Z1 | REUSE suite P0d-A + rozszerzenie OV P0e |

**PASS** — zero nowego matchera / write path Quotes.

### 5.3 ZERO DUPLICATE LOGIC

| Zakaz | FROZEN |
|-------|--------|
| Drugi regex negacji poza Guard | **ZAKAZ** |
| Druga lista Product ID FULL poza §3 | **ZAKAZ** |
| Alt bind omijający Guard | **ZAKAZ** (już chronione P0d-A) |
| Duplikat OPS Quotes engine | **ZAKAZ** — tylko REUSE |

**PASS**

### 5.4 DATA FIRST

```text
Alias Pack już wskazuje reserved Product ID
  → work BRAK w Library ⇒ no-op (stan AS-IS przed P0e)
  → work OBECNY + Quotes ⇒ bind Alias (P0e efekt)
```

P0e **nie** zmienia Resolver — odblokowuje DATA.  
**PASS**

### 5.5 FEATURE-DATA

| | |
|--|--|
| Gate G1–G9 | **ALL-NIE** (brak Payroll / Cloud CORE rewrite) |
| Zmiana | Wyłącznie works + Quotes w katalogu (KV istniejący) |
| Nowe DATA_KEYS | **ZAKAZ** |
| Diff `negation-guard.ts` / `alias-pack-wave1.ts` | **ZAKAZ** (= 0 w PR IMPLEMENT) |

**PASS**

### 5.6 Brak rozszerzenia zakresu

| Check | Wynik |
|-------|--------|
| Liczba seedów APPROVED | **3** |
| BIZ-P0e-1 A | **FROZEN** |
| BIZ-P0e-1 B | **OUT** |
| Dodatkowe ID / Wave 2 | **OUT** |
| Zmiana Pack pod folię | **OUT** |

**PASS**

---

## 6. Pipeline FROZEN (bez zmian vs P0d-A)

```text
[0] OfferBoq line
      ↓
[1] NOISE FILTER                 ★ P0a CLOSED
      ↓
[2] NORMALIZER                   ★ P0b CLOSED
      ↓
[3] NEGATION GUARD               ★ P0d-A AS-IS — ZERO zmian P0e
      ↓
[4] BIND DECISION                ★ AS-IS
      ↓
[5] ALIAS RESOLVER               ★ Pack Wave 1 AS-IS — ZERO zmian P0e
      · DATA FIRST: work aktywny (P0e odblokowuje 3 ID)
      ↓
[6] PRODUCT MAPPER CORE          ★ AS-IS + higiena keywords seed
      ↓
[7] catalogWorkId
[8] Product Library / Quotes     ★ P0e: +3 works + Quotes (REUSE)
    SMART / MS                   ★ AS-IS — ZERO zmian
```

**Invariant P0e:** jedyny zapis = FEATURE-DATA 3 kart §3.  
**Invariant kodu:** `git diff` IMPLEMENT **nie** zawiera Guard/Pack/SMART/MS/Quotes-engine.

---

## 7. Higiena seedu FROZEN (H-*)

| ID | Reguła |
|----|--------|
| **H-1** | Brak `legacyCategoryId` na 3 FULL seeds |
| **H-2** | Keywords = frazy; zakaz bare `folia`/`foli`/`bruzd`/`zaprawianie`/`rtv`/`sat` |
| **H-3** | `namePl` bez krótkich tokenów kolizyjnych Core (lekcja SAFE) |
| **H-4** | Quotes zawsze z work (D-CC-16) |
| **H-5** | OV Core FP scan po seed (przed RELEASE) |

---

## 8. Decyzje FROZEN (D-P0e-*)

| ID | Decyzja | Status |
|----|---------|--------|
| **D-P0e-1** | P0e = wyłącznie 3 reserved ID §3 | **FROZEN** |
| **D-P0e-2** | BIZ-P0e-1 = **Wariant A** (1 ID folia) | **FROZEN** |
| **D-P0e-3** | Wariant B = **OUT** P0e | **FROZEN** |
| **D-P0e-4** | Alias Pack = **0** zmian | **FROZEN** |
| **D-P0e-5** | Negation Guard = **0** zmian | **FROZEN** |
| **D-P0e-6** | SMART / MARKET-SYNC / Quotes engine = **0** zmian | **FROZEN** |
| **D-P0e-7** | Quotes append = **REUSE** only | **FROZEN** |
| **D-P0e-8** | Remap zamurowanie + folia stolarka/podłogi = **AKCEPT** | **FROZEN** |
| **D-P0e-9** | KPI Coverage **76.7% → ~77.3%**; EPIC 88–92% = OUT | **FROZEN** |
| **D-P0e-10** | FEATURE-DATA · ALL-NIE · bez nowych DATA_KEYS | **FROZEN** |

---

## 9. Gate'y FROZEN

### Gate DATA (przed OV)

| ID | Kryterium |
|----|-----------|
| **G-D1** | 3 works §3 aktywne w Library |
| **G-D2** | 3× Quotes obecne |
| **G-D3** | H-1…H-4 PASS |
| **G-D4** | **0** dodatkowych `cc-p0c-w1-*` poza SAFE+FULL (tylko zawór·stop·3 FULL) |
| **G-D5** | Diff Guard/Pack = **puste** |

### Gate OV / RELEASE

| ID | Kryterium |
|----|-----------|
| **G-O1** | TV-01 Quotes ≥ **76.7%** · target **≥ 77.2%** (~77.3%) |
| **G-O2** | AC-P0e-3…5 PASS (negacja · RTV · TP binds) |
| **G-O3** | H-5 Core FP PASS |
| **G-O4** | Regresja P0c/P0d-A / SMART / MS — **PASS** (smoke bez zmian kodu tych modułów) |
| **G-O5** | BIZ A: folia remap 5 linii świadomy — **nie** traktować jako FAIL |

---

## 10. Acceptance Criteria FROZEN

| ID | Kryterium |
|----|-----------|
| **AC-P0e-1** | 3 FULL works + Quotes aktywne |
| **AC-P0e-2** | Coverage **≥ 77.2%** (prognoza **~77.3%**); floor **≥ 76.7%** |
| **AC-P0e-3** | **0** *bez zaprawiania bruzd* → `cc-p0c-w1-zaprawianie-bruzd` |
| **AC-P0e-4** | **0** RTV/SAT bez `multiswitch` → multiswitch ID |
| **AC-P0e-5** | TP: Zaprawianie bruzd / Zabezpieczenie okien folią / Instalowanie multiswitcha → reserved IDs |
| **AC-P0e-6** | H-1…H-5 PASS |
| **AC-P0e-7** | **0** diff Negation Guard · **0** diff Alias Pack |
| **AC-P0e-8** | **0** zmian SMART / MARKET-SYNC / Quotes engine |
| **AC-P0e-9** | Dokładnie 3 FULL seeds — brak Wariantu B / Wave 2 |
| **AC-P0e-10** | P0e ≠ cel EPIC 88–92% (dokumentacja tip/CLOSEOUT) |

---

## 11. Testy obowiązkowe (kontrakt)

| ID | Case | Oczekiwane |
|----|------|------------|
| **TN-Z*** | *bez zaprawiania bruzd* | Guard + Alias NO bind zaprawianie ID |
| **TN-CORE-Z1** | work zaprawianie w fixture + negacja | Core **nie** binduje zaprawianie ID |
| **TN-M*** | RTV/SAT bez multiswitch | **nie** multiswitch ID |
| **TP-Z1/Z2** | Zaprawianie / Zamurowanie bruzd | → `cc-p0c-w1-zaprawianie-bruzd` |
| **TP-F1** | Zabezpieczenie okien folią | → `cc-p0c-w1-zabezpieczenie-folia` |
| **TP-M1** | Instalowanie multiswitcha… | → `cc-p0c-w1-multiswitch-antenowy` |
| **TR-P0d-A** | Suite P0d-A | **PASS** (regresja) |
| **TR-P0c** | Suite P0c | **PASS** |

---

## 12. OUT / zakazy FROZEN

- IMPLEMENT bez Owner GO po AR  
- commit / push w sesji DF  
- Edycja `negation-guard.ts` / `alias-pack-wave1.ts`  
- SMART P1 · MARKET-SYNC P2 · rewrite Quotes  
- Wariant B (osobne ID folii)  
- Seed spoza §3 · Wave 2 · Fuzzy · nowe DATA_KEYS  
- Cloud Sync CORE · Payroll  
- Oczekiwanie Coverage 88–92% z P0e  

---

## 13. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR ARCHITECTURE REVIEW
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR ARCHITECTURE REVIEW** | **TAK** |
| **CHANGES REQUIRED** | **NIE** |
| **BIZ-P0e-1** | **Wariant A FROZEN** |
| **Zasady (SSOT/REUSE/ZERO DUP/DATA/FEATURE)** | **PASS** |
| **Zakres = 3 seedy** | **PASS** |
| **IMPLEMENT** | **ZAKAZ** do GO po AR |
| **Commit / push** | **NIE wykonano** |

**Ścieżka:** ten DF → **Architecture Review** → Owner GO IMPLEMENT (FEATURE-DATA 3 seeds) → OV → RELEASE.

---

## 14. Zakazy (sesja DESIGN FREEZE)

- IMPLEMENT Library / Quotes  
- commit · push  
- Zmiana Guard / Alias / SMART / MS / Quotes engine  
- Odwrócenie BIZ-P0e-1 na Wariant B bez nowego Owner GO  
- Auto-start AR / IMPLEMENT

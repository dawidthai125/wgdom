# CATALOG-COVERAGE-01 — P0e PLAN (FULL Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0e-PLAN  
> **EPIC:** CATALOG-COVERAGE-01 · **Etap:** **PLAN P0e** (FULL Library Seed)  
> **STATUS:** **PLAN COMPLETE** · **DOCS ONLY**  
> **Data:** 2026-07-31  
> **Owner GO:** PLAN P0e — **bez IMPLEMENT** · **bez commit** · **bez push**  
> **Wejście (zaakceptowane):** [`CATALOG-COVERAGE-01-P0e-AUDIT.md`](CATALOG-COVERAGE-01-P0e-AUDIT.md) · P0d-A CLOSED · tip UI **2.65.90** / **`b9da6bff`** · [`P0d-A-CLOSEOUT`](CATALOG-COVERAGE-01-P0d-A-CLOSEOUT.md) · DF P0d [`CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md) §6.2  
> **Artefakt ROI (RO):** `.tmp/catalog-coverage-01-p0e-audit-probe.json`

```text
════════════════════════════════════════════════════════
P0e PLAN — FULL Library Seed ONLY (3 Product ID)
IN:  zaprawianie-bruzd · zabezpieczenie-folia · multiswitch
OUT: Negation Guard change · Alias Precision change · SMART · MS
     · rewrite Product Quotes · Wave 2 · Fuzzy · Cloud CORE · Payroll
BIZ-P0e-1: warianty A/B opisane — decyzja Owner w DF (nie w tym PLAN)
Zakaz: IMPLEMENT · commit · push
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Status** | **READY FOR DESIGN FREEZE** |
| **PLAN UPDATE REQUIRED?** | **NIE** |
| **Zakres P0e** | **FEATURE-DATA ONLY** — seed 3 reserved Product ID + Quotes (REUSE path) |
| **OUT kodu runtime** | Negation Guard · Alias Pack Precision · SMART · MARKET-SYNC · rewrite Quotes · Fuzzy · Cloud CORE · Payroll |
| **BIZ-P0e-1** | **OPEN** — warianty A/B opisane poniżej; **Owner zamyka w DF** (PLAN nie wybiera) |
| **Prognoza Coverage** | **76.7% → ~77.3%** (+0.6 pp) przy wariancie A (1 ID folia) |
| **NEXT** | Owner GO → **DESIGN FREEZE P0e** → (AR jeśli wymagane) → IMPLEMENT — **nie** auto-start |

**Jednozdaniowo:** P0e odblokowuje 3 reserved ID Alias Pack Wave 1 przez seed Library+Quotes; bez zmian Guard/Precision/SMART/MS; mikro-lift Quotes **+0.6 pp**; decyzja zakresu folii = DF.

---

## 1. Zakres IN / OUT

### 1.1 IN (wyłącznie)

| # | Alias rule | Product ID (reserved) |
|--:|------------|------------------------|
| 1 | `zaprawianie_bruzd` | `cc-p0c-w1-zaprawianie-bruzd` |
| 2 | `zabezpieczenie_folia` | `cc-p0c-w1-zabezpieczenie-folia` *(wariant A — 1 ID)* |
| 3 | `multiswitch_antenowy` | `cc-p0c-w1-multiswitch-antenowy` |

Dodatkowo (kontrakt danych, nie nowy matcher):

- Seed **higiena** (frazy keywords · `namePl` · unit · **bez** `legacyCategoryId`) — lekcja P0d-A  
- Quotes per work — **REUSE** istniejącego toru seed/commit (P3.3 / OPS P0d-A)  
- Testy / OV AC (negacja · RTV/SAT · Core FP · coverage)

### 1.2 OUT (zakaz zmian)

| Obszar | Zakaz P0e |
|--------|-----------|
| **Negation Guard** | **Nie zmieniać** kodu / kanonu (`negation-guard.ts`) |
| **Alias Precision** | **Nie zmieniać** Pack Wave 1 (`alias-pack-wave1.ts`) — w tym zaprawianie / multiswitch |
| **SMART-PRICING** | **Nie zmieniać** · nie start P1 |
| **MARKET-SYNC** | **Nie zmieniać** · nie start P2 |
| **Product Quotes** | **Nie rewrite** silnika / alt write path / merge CORE — tylko **REUSE** append Quotes dla 3 nowych works |
| Wave 2 / BIZ families / HIGH Alias | OUT |
| Fuzzy ON · drugi matcher · nowe DATA_KEYS | OUT |
| Cloud Sync CORE · Payroll | OUT |
| SAFE ponowny seed (zawór / stop) | OUT — już CLOSED P0d-A |
| Cel EPIC 88–92% jako KPI P0e | OUT — mikro-lift only |

### 1.3 Pipeline (bez zmian architektury)

```text
Noise → Normalizer → Negation Guard → Bind Decision → Alias | Core → Library
         (REUSE AS-IS P0d-A — ZERO zmian Guard / Pack)
```

P0e = **odblokowanie DATA FIRST**: gdy work istnieje w Library, istniejący Alias binduje reserved ID.

---

## 2. Baseline i prognoza Coverage

| Metryka | Wartość |
|---------|--------:|
| TV-01 linie | **2228** |
| Baseline Quotes (po P0d-A) | **76.7%** (**1709** / 2228) |
| Unmapped | **519** |
| Lift unmapped FULL (Σ 3 seed) | **+13** linii |
| **Prognoza po P0e (wariant A)** | **~77.3%** (**1722** / 2228) |
| **Δ pp** | **+0.6** |

```text
76.7%  →  ~77.3%
(+0.6 pp)   ★ potwierdzone sondą AUDIT 2026-07-31
```

**Uwaga:** Remap 10 linii już cytowanych (zamurowanie / folia stolarka·podłogi) **nie** zwiększa % Quotes — zmienia Product ID (jakość). Lift Coverage = wyłącznie wcześniej unmapped + Quotes na nowych works.

**Cel EPIC 88–92%:** **poza P0e** — PLAN jawnie nie obiecuje domknięcia.

---

## 3. Karty Seed (per Product ID)

### 3.1 `cc-p0c-w1-zaprawianie-bruzd`

| Pole | Wartość |
|------|---------|
| **Product ID** | `cc-p0c-w1-zaprawianie-bruzd` |
| **Alias rule** | `zaprawianie_bruzd` (Pack AS-IS — **bez zmian**) |
| **namePl (propozycja DF)** | Zaprawianie / zamurowanie bruzd |
| **unit** | `m` (ATH: m/mb) |
| **keywords** | frazy: `zaprawianie bruzd`, `zamurowanie bruzd` — **zakaz** bare `bruzd` / `zaprawianie` |
| **legacyCategoryId** | **null** (zakaz) |
| **Quotes** | **TAK** (REUSE) |
| **Expected lift (unmapped)** | **+8** linii |
| **ROI (Quotes pp)** | **~+0.36 pp** (8/2228) |
| **Remap świadomy** | **+5** (*Zamurowanie bruzd…* → dziś `legacy-roboty_ogolnobudowlane-mb`) — poprawa precyzji, **0** pp Quotes |
| **Ryzyko** | **LOW** przy Guard AS-IS · **HIGH** jeśli keywords bare / bez Guard (OUT — Guard nie ruszamy) |
| **Wpływ Coverage** | Główny wkład FULL (+8 z +13) |
| **OV obowiązkowe** | **0** bind *bez zaprawiania bruzd* → ten ID (Alias\|Core) · TN-CORE-Z1 REUSE |

### 3.2 `cc-p0c-w1-zabezpieczenie-folia` *(karta bazowa — wariant A)*

| Pole | Wartość |
|------|---------|
| **Product ID** | `cc-p0c-w1-zabezpieczenie-folia` |
| **Alias rule** | `zabezpieczenie_folia` (Pack AS-IS — **bez zmian** w wariancie A) |
| **namePl (propozycja DF)** | Zabezpieczenie powierzchni folią |
| **unit** | `m2` |
| **keywords** | frazy: `zabezpieczenie okien folią`, `zabezpieczenie … folią` — **zakaz** bare `folia` / `foli` |
| **legacyCategoryId** | **null** (zakaz) |
| **Quotes** | **TAK** (REUSE) |
| **Expected lift (unmapped)** | **+4** linii |
| **ROI (Quotes pp)** | **~+0.18 pp** (4/2228) |
| **Remap świadomy** | **+5** (3× stolarka · 2× podłogi) — zależne od BIZ-P0e-1 |
| **Ryzyko** | **MEDIUM** (zakres powierzchni) · **HIGH** przy bare keyword `folia` (22 broad hitów TV-01) |
| **Wpływ Coverage** | +4 unmapped; remap bez Δ% Quotes |
| **OV obowiązkowe** | Bind unmapped „Zabezpieczenie okien folią” · **0** FP Core z bare `folia` |

*Wariant B (osobne ID) — patrz §4; karta powyżej dotyczy ścieżki zgodnej z reserved Pack.*

### 3.3 `cc-p0c-w1-multiswitch-antenowy`

| Pole | Wartość |
|------|---------|
| **Product ID** | `cc-p0c-w1-multiswitch-antenowy` |
| **Alias rule** | `multiswitch_antenowy` (Pack AS-IS — tylko token `multiswitch`) |
| **namePl (propozycja DF)** | Multiswitch antenowy |
| **unit** | `szt` |
| **keywords** | `multiswitch`, `multiswitch antenowy` — **zakaz** `rtv` / `sat` / `instalacja antenowa` |
| **legacyCategoryId** | **null** (zakaz) |
| **Quotes** | **TAK** (REUSE) |
| **Expected lift (unmapped)** | **+1** linia |
| **ROI (Quotes pp)** | **~+0.04 pp** (1/2228) |
| **Remap świadomy** | **0** |
| **Ryzyko** | **LOW** (Precision CLOSED P0d-A) |
| **Wpływ Coverage** | Minimalny (+1) |
| **OV obowiązkowe** | Bind „Instalowanie multiswitcha…” · **0** RTV/SAT → ten ID |

### 3.4 Sumaryczna tabela ROI

| Product ID | Lift unmapped | ROI Δ pp | Remap | Ryzyko | Coverage |
|------------|--------------:|---------:|------:|--------|----------|
| zaprawianie-bruzd | **+8** | **~+0.36** | +5 OK | LOW* | główny |
| zabezpieczenie-folia | **+4** | **~+0.18** | +5 BIZ | MED | średni |
| multiswitch | **+1** | **~+0.04** | 0 | LOW | mały |
| **Σ P0e (wariant A)** | **+13** | **+0.6** | +10 | — | **76.7% → ~77.3%** |

\* LOW przy Guard + frazy keywords AS-IS.

---

## 4. BIZ-P0e-1 — zakres „folia” (bez decyzji w PLAN)

> **Cel:** opisać warianty i wpływ. **PLAN nie wybiera** A ani B. Decyzja = **Owner w DESIGN FREEZE**.

### 4.1 Kontekst TV-01 (po Precision Pack)

| Sygnał | n |
|--------|--:|
| Pack `zabezpieczenie_folia` hit | **9** |
| z tego unmapped | **4** (głównie „Zabezpieczenie okien folią”) |
| z tego mapped | **5** (3× okna/drzwi/stolarka · 2× podłogi) |
| Broad token `foli` (ryzyko Core) | **22** |

### 4.2 Wariant A — jedno Product ID „folia”

| | |
|--|--|
| **Model** | Jeden work: `cc-p0c-w1-zabezpieczenie-folia` obejmuje okna · drzwi · podłogi · stolarkę (ochrona folią) |
| **Alias Pack** | **Bez zmian** — reguła AS-IS pokrywa 9 hitów |
| **Negation Guard** | Bez zmian |
| **Seed** | 1 work + Quotes |
| **Lift Quotes** | **+4** unmapped → wkład **~+0.18 pp**; skumulowane P0e nadal **~77.3%** |
| **Remap** | 5 linii legacy → ten ID (świadoma precyzja vs bucket stolarka/podłogi) |
| **Ryzyko** | MEDIUM semantyka (jeden ID na różne powierzchnie) · LOW techniczne przy frazach keywords |
| **Zgodność z OUT P0e** | **TAK** — zero zmian Guard / Alias Precision |
| **Koszt DF/IMPLEMENT** | Najniższy |

### 4.3 Wariant B — osobne Product ID (okna · drzwi · podłogi)

| | |
|--|--|
| **Model** | Osobne works np. okna / drzwi / podłogi (3 ID; drzwi mogą być scalone z oknami — DF precyzuje) |
| **Reserved Pack dziś** | **1** ID (`cc-p0c-w1-zabezpieczenie-folia`) — **brak** reserved ID per powierzchnia |
| **Alias Pack** | **Wymagałby zmian** (nowe reguły / rozszczepienie `test` / nowe Product ID) — **kolizja z OUT „Nie zmieniać Alias Precision”** |
| **Negation Guard** | Bez zmian (nie dotyczy) |
| **Seed** | 3 works + Quotes (+ ewentualnie nowe ID poza Wave 1 reserved) |
| **Lift Quotes** | Unmapped nadal **~+4** łącznie (te same linie) — **ROI Coverage ≈ ten sam** co A (~+0.18 pp z folii); **nie** zwiększa 77.3% vs A |
| **Remap** | Precyzyjniejszy Product ID per powierzchnia (lepsza jakość niż A) |
| **Ryzyko** | Wyższy koszt · ryzyko rozjazdu Pack↔Library · scope creep poza „3 reserved” |
| **Zgodność z OUT P0e** | **NIE bez DF-AMEND** — wymaga wyjątku Ownera na zmianę Alias / nowe ID |
| **Koszt DF/IMPLEMENT** | Wyższy (Pack + 3 seed + testy) |

### 4.4 Porównanie wpływu (A vs B)

| Kryterium | Wariant A | Wariant B |
|-----------|-----------|-----------|
| Coverage TV-01 | **~77.3%** (+0.6 pp FULL) | **~77.3%** (ten sam rząd liftu Quotes) |
| Jakość Product ID | 1 bucket „folia ochronna” | Wyższa granulacja |
| Zmiana Alias Precision | **0** | **Wymagana** |
| Zmiana Negation Guard | **0** | **0** |
| Zgodność z zakazami Owner GO PLAN | **Pełna** | **Konflikt** z „nie zmieniać Alias Precision” |
| Rekomendacja audytu (historyczna) | Preferowana na Wave FULL | P1 / Wave 2 |

### 4.5 Co DF musi zamrozić (Owner)

1. **Wybór A albo B** (lub hybrydę jawnie opisaną).  
2. Jeśli **A:** kartę seed §3.2 + AC remap OK.  
3. Jeśli **B:** DF-AMEND zakresu P0e (wyjątek Alias / nowe ID) — **osobna ścieżka**; ten PLAN domyślnie przygotowuje DF pod **A** jako ścieżkę zgodną z OUT, bez narzucania wyboru.

---

## 5. Higiena seedu (obowiązkowa — lekcja P0d-A)

| Reguła | Wymaganie |
|--------|-----------|
| H-1 | **Bez** `legacyCategoryId` na FULL seeds |
| H-2 | Keywords = **frazy** (≥2 tokeny sensowne) — nie bare `folia` / `bruzd` / `zaprawianie` / `rtv` |
| H-3 | `namePl` bez tokenów kolizyjnych typu krótkie „Montaż…” generujące Core FP |
| H-4 | Quotes REUSE zawsze z work (D-CC-16) |
| H-5 | OV: Core FP scan po seed (analog SAFE hardening) |

**Nie** jest to zmiana Negation Guard ani Alias Precision — tylko kontrakt FEATURE-DATA.

---

## 6. Acceptance Criteria (szkic → DF)

| ID | Kryterium |
|----|-----------|
| **AC-P0e-1** | 3 works FULL aktywne + Quotes (przy wariancie A; przy B — DF definiuje liczbę ID) |
| **AC-P0e-2** | TV-01 Quotes ≥ **76.7%** · target **≥ 77.2%** (prognoza **~77.3%**) |
| **AC-P0e-3** | **0** *bez zaprawiania bruzd* → `cc-p0c-w1-zaprawianie-bruzd` |
| **AC-P0e-4** | **0** RTV/SAT bez `multiswitch` → `cc-p0c-w1-multiswitch-antenowy` |
| **AC-P0e-5** | Unmapped pozytywne → reserved IDs (TP zaprawianie / okna folią / multiswitch) |
| **AC-P0e-6** | H-1…H-5 PASS |
| **AC-P0e-7** | **0** diff Negation Guard · **0** diff Alias Pack (chyba że Owner wybierze B + DF-AMEND) |
| **AC-P0e-8** | **0** zmian SMART / MARKET-SYNC / Quotes engine |
| **AC-P0e-9** | PLAN/DF jawnie: P0e ≠ cel EPIC 88–92% |

---

## 7. Fale IMPLEMENT (po DF — nie teraz)

| Fala | Zakres | Gate |
|------|--------|------|
| **P0e-DATA** | Seed 3 ID (+Quotes) wg DF · OPS REUSE | H-1…H-5 · dry-run |
| **P0e-OV** | Owner Verification TV-01 · AC-P0e-* | PASS |
| **P0e-RELEASE** | Changelog · tip · PV | Owner GO RELEASE |

**Zakaz:** łączyć z Wave 2 / SMART P1 / MS P2 / zmianą Guard/Pack (bez DF-AMEND B).

---

## 8. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR DESIGN FREEZE** | **TAK** |
| **PLAN UPDATE REQUIRED** | **NIE** |
| **Otwarte do DF** | **BIZ-P0e-1** (A vs B) — opisane, **nie** rozstrzygnięte |
| **IMPLEMENT** | **ZAKAZ** do Owner GO po DF |
| **Commit / push** | **NIE wykonano** |

**Rekomendacja Ownerowi:** uruchomić **DESIGN FREEZE P0e** (FEATURE-DATA 3 ID · higiena seedu · AC · wybór BIZ-P0e-1).  
Ścieżka zgodna z zakazami kodowymi = **wariant A**; wariant B tylko z jawnym DF-AMEND Alias.

---

## 9. Zakazy (sesja PLAN)

- IMPLEMENT Library / Quotes seed  
- commit · push  
- Zmiana Negation Guard · Alias Precision · SMART · MARKET-SYNC · rewrite Product Quotes  
- Decyzja biznesowa BIZ-P0e-1 w imieniu Ownera  
- Auto-start DF / IMPLEMENT

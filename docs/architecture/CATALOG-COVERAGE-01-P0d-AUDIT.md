# CATALOG-COVERAGE-01 — P0d AUDIT (Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0d-AUDIT  
> **EPIC:** CATALOG-COVERAGE-01 · **Etap:** **P0d AUDIT** (Product Library Seed)  
> **STATUS:** **AUDIT COMPLETE** · **DOCS ONLY**  
> **Data:** 2026-07-30  
> **Owner GO:** P0d AUDIT — **bez IMPLEMENT** · **bez commit** · **bez push**  
> **Wejście:** P0c CLOSED · PV tip UI **2.65.89** / feature **`aebf9d09`** · [`P0c-CLOSEOUT`](CATALOG-COVERAGE-01-P0c-CLOSEOUT.md) · Pack [`alias-pack-wave1.ts`](../../src/lib/catalog-coverage/alias-pack-wave1.ts) · TV-01 (18 / 2228)  
> **Artefakty RO (lokalne, nie commit):** `.tmp/catalog-coverage-01-p0d-audit-probe.json` · `.tmp/catalog-coverage-01-p0d-samples.json` · `.tmp/catalog-coverage-01-p0d-zapraw-elek.json`

```text
════════════════════════════════════════════════════════
P0d AUDIT = Library Seed PREPARATION ONLY
Cel: które reserved ID seedować · ROI · BIZ · kolizje · ryzyko
Zakaz: IMPLEMENT seed · commit · push · Wave 2 / SMART / MS
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Status** | **PLAN UPDATE REQUIRED** |
| **READY FOR PLAN?** | **NIE** — nie startować PLAN/DF/IMPLEMENT P0d na samym „seed 5× `cc-p0c-w1-*`” |
| **Powód główny** | Seed bez naprawy Alias Wave 1 spowoduje **regresję mapowań** (Alias override Core) — szczególnie **10 linii elektryki** z frazą *„bez zaprawiania bruzd”* |
| **Powód wtórny** | ROI samego seedu reserved Wave 1 ≈ **+0.9 pp** Quotes — **daleko** od PLAN §2 rank 4 (**+5–8 pp**) i celu EPIC 88–92% |
| **Następny krok** | Owner GO: **PLAN UPDATE** (P0d + obowiązkowy Alias precision / bind policy) → potem DF → IMPLEMENT |

**Jednozdaniowo:** P0d ma sens (5 reserved ID + Quotes), ale **najpierw** trzeba zamrożyć poprawkę Alias + politykę bindu; sam seed „na ślepo” jest **niebezpieczny** i **niewystarczający** wobec celu EPIC.

---

## 1. Baseline (po P0c · FROZEN TV-01)

| Metryka | Wartość |
|---------|--------:|
| Próba | **18** przetargów · **2228** linii |
| Quotes coverage | **76.4%** (**1703** / 2228) |
| Unmapped (eligible mapper) | **525** |
| Active works (Library) | **72** |
| Istniejące ID `cc-p0c-w1-*` | **0** |
| P0c bind live | **1** (`piece_demontaz` → `legacy-rozbiorki-m2`) |
| Cel EPIC | **88–92%** |

Pipeline FROZEN: **Noise → Normalizer → Alias → Mapper → Library**. Fuzzy OFF. Alias **override** Core gdy `resolvedProductId` ≠ null.

---

## 2. Reserved work IDs po P0c — czy wymagają seedu?

| # | Alias rule | Reserved Product ID | Work w Library? | Seed wymagany? | Uzasadnienie |
|--:|------------|---------------------|-----------------|----------------|--------------|
| 1 | `zaprawianie_bruzd` | `cc-p0c-w1-zaprawianie-bruzd` | **NIE** | **TAK** | 8 unmapped „Zaprawianie bruzd…”; dziś no-op |
| 2 | `zawor_odpowietrzajacy` | `cc-p0c-w1-zawor-odpowietrzajacy` | **NIE** | **TAK** | 4 unmapped „Zawór odpowietrzający…”; dziś no-op |
| 3 | `zabezpieczenie_folia` | `cc-p0c-w1-zabezpieczenie-folia` | **NIE** | **TAK*** | 4 unmapped „Zabezpieczenie okien folią”; *BIZ o zakresie* |
| 4 | `stop_ptakow` | `cc-p0c-w1-stop-ptakow` | **NIE** | **TAK** | 2 unmapped „Montaż stop ptaków”; dziś no-op |
| 5 | `multiswitch_antenowy` | `cc-p0c-w1-multiswitch-antenowy` | **NIE** | **TAK*** | 1 unmapped multiswitch; *wymaga zacieśnienia Alias* |
| 6 | `piece_demontaz` | `legacy-rozbiorki-m2` | **TAK** | **NIE** | Już w Library · P0c bind działa |

\* Seed merytorycznie OK, ale **nie** jako pierwszy krok bez PLAN UPDATE (patrz §5–§6).

---

## 3. Proponowane seed'y (szkic FEATURE-DATA)

> **Nie implementować** — tylko propozycja pod PLAN. Quotes **obowiązkowo** razem z work (DF D-CC-16 / R-CC-03).  
> ID = reserved z Pack (bez zmiany ID). Tor zapisu = REUSE istniejącego seed/commit Quotes (P3.3) — **bez** nowego DATA_KEY.

| Product ID | namePl (propozycja) | unit | trade / kategoria (orient.) | keywords (min.) | Quotes |
|------------|---------------------|------|-----------------------------|-----------------|--------|
| `cc-p0c-w1-zaprawianie-bruzd` | Zaprawianie / zamurowanie bruzd | `m` *(ATH: m/mb)* | OGÓLNOBUDOWLANE / PRZYGOTOWANIE | zaprawianie bruzd, zamurowanie bruzd | **TAK** |
| `cc-p0c-w1-zawor-odpowietrzajacy` | Zawór odpowietrzający | `szt` | HYDRAULIKA / C.O. | zawór odpowietrzający, odpowietrznik | **TAK** |
| `cc-p0c-w1-zabezpieczenie-folia` | Zabezpieczenie powierzchni folią | `m2` | PRZYGOTOWANIE | zabezpieczenie okien folią, folia malarska | **TAK** |
| `cc-p0c-w1-stop-ptakow` | Montaż stop ptaków | `m` | ELEWACJA | stop ptaków, kolce przeciw ptakom | **TAK** |
| `cc-p0c-w1-multiswitch-antenowy` | Multiswitch antenowy | `szt` | ELEKTRYKA / TELETECH | multiswitch, multiswitch antenowy | **TAK** |

**Poza pierwszą falą P0d (nie z reserved Wave 1):** `bruzdy_instalacyjne`, `rozbiorka_ogolna`, `gruntowanie_*`, Winidur, gzyms, podokienniki, INNE — to nadal backlog **większego** seedu / Wave 2-BIZ / P1 (zgodnie z Alias Audit).

---

## 4. Wpływ na Coverage (ROI)

### 4.1 Statystyki text-hit Alias (eligible · reserved only)

| Rule | textAll | textUnmapped (= pot. lift) | textMappedAlready (= remap risk) |
|------|--------:|---------------------------:|---------------------------------:|
| `zaprawianie_bruzd` | 23 | **8** | **15** |
| `zawor_odpowietrzajacy` | 4 | **4** | **0** |
| `zabezpieczenie_folia` | 9 | **4** | **5** |
| `stop_ptakow` | 2 | **2** | **0** |
| `multiswitch_antenowy` | 2 | **1** | **1** |
| **Σ** | **40** | **19** | **21** |

### 4.2 Scenariusze Quotes (TV-01)

| Scenariusz | Δ linii Quotes | Δ pp | Coverage po |
|------------|---------------:|-----:|------------:|
| **A. Naive seed all 5 + Quotes** (bez fix Alias) | **+19** unmapped | **+0.9** | **~77.3%** |
| **B. Safe seed only** (`zawor` + `stop_ptakow`) | **+6** | **+0.3** | **~76.7%** |
| **C. Po Alias precision + seed 5** (unmapped-only lift) | **+19** | **+0.9** | **~77.3%** |
| **D. + świadomy remap** (folia stolarka/podłogi · zamurowanie→seed) | +19 + do ~10 remap jakości | **~+0.9 pp Quotes** *(remap nie podnosi Quotes jeśli już cytowane)* | ~77.3% Quotes · **zmiana Product ID** |
| Cel EPIC 88–92% | — | **+11.6 … +15.6** potrzeba | **niemożliwe samym Wave 1 seed** |

**Wniosek ROI:** Reserved P0d Wave 1 = **mikro-lift** (~1 pp). Nie wypełnia PLAN rank 4 (+5–8 pp). PLAN musi albo:

1. zawęzić P0d Wave 1 = „odblokowanie Pack” (mikro), **oraz**  
2. zdefiniować **P0d Wave 2** (top grupy WC z Alias Audit / PLAN),  

albo zaktualizować oczekiwania slice’u P0d w Continuity/PLAN.

---

## 5. Decyzje biznesowe vs prosty seed

| ID | Typ | Pytanie | Rekomendacja audytu |
|----|-----|---------|---------------------|
| **BIZ-P0d-1** | **BLOKER** | Czy Alias może bindować linie z negacją *„bez zaprawiania bruzd”*? | **NIE** — to kabel w bruzdach **bez** zaprawy; dziś Core → `legacy-elektryka-mb` (**10** linii). Seed bez fix = **regresja**. |
| **BIZ-P0d-2** | **BLOKER** | Czy `rtv.?sat` / „instalacja antenowa” = multiswitch? | **NIE** dla gniazd/wypustów RTV/SAT — 1 linia dziś `legacy-elektryka-mb`. Zacieśnić do `multiswitch`. |
| **BIZ-P0d-3** | **POLITYKA** | Alias override Core zawsze, czy tylko gdy Core unmapped? | Po P0c DF = **override**. Do P0d rozważyć **„bind only if Core unmatched”** *albo* precision Alias — inaczej 21 remaps. |
| **BIZ-P0d-4** | **OPCJONALNE** | Jedna robota „folia” na okna + drzwi + podłogi + stolarkę? | **TAK na Wave 1** (jeden reserved ID) — akceptowalny kompromis; rozdział powierzchni = P1. Remap 3× stolarka + 2× podłogi = **poprawa precyzji** vs legacy bucket. |
| **BIZ-P0d-5** | **PROSTY** | Zaprawianie vs zamurowanie bruzd = jeden Product ID? | **TAK** — Pack już łączy; 5× zamurowanie dziś w `legacy-roboty_ogolnobudowlane-mb` → świadomy remap OK. |
| **BIZ-P0d-6** | **PROSTY** | Zawór odpowietrzający vs ogólne `legacy-instalacje_co-*`? | **Osobny seed** — soft-collision keyword „odpowietrzenie instalacji” ≠ zawór; **nie reuse** CO generic. |
| **BIZ-P0d-7** | **PROSTY** | Jednostki m vs mb (bruzdy / stop ptaków)? | Seed z dominant ATH (`m` / `m2` / `szt`); keywords bez hard unit gate w Alias. |

**Podsumowanie BIZ:** 2 blokerów techniczno-semantycznych (negacja, RTV/SAT) + 1 polityka bindu muszą wejść do PLAN **przed** seedem. Reszta = prosty seed FEATURE-DATA.

---

## 6. Duplikaty / kolizje z obecnym katalogiem

| Check | Wynik |
|-------|-------|
| Duplikat ID `cc-p0c-w1-*` w Library | **0** — brak kolizji ID |
| Soft-collision `zawor` ↔ `legacy-instalacje_co-{mb,rbh,szt}` | Keyword CO „odpowietrzenie” — **nie** mapować zaworu na CO; osobny seed OK |
| Soft-collision `zaprawianie` ↔ elektryka / ogólnobudowlane | **Tak (tekst)** — patrz remap §7 |
| Soft-collision `folia` ↔ stolarka / podłogi | **Tak** — świadomy remap po seed (BIZ-P0d-4) |
| Soft-collision `multiswitch` ↔ elektryka | **Tak** — fałszywy hit RTV/SAT |
| Kolizja z `piece_demontaz` / `legacy-rozbiorki-m2` | **Brak** — poza zakresem seedu |

**Brak** potrzeby zmiany reserved ID. Kolizje = **semantyka Alias + override**, nie duplikaty katalogu.

---

## 7. Ryzyko regresji / wpływ na istniejące mapowania

### 7.1 Remap probe (już zmapowane linie z text-hit Alias)

| Alias → current Core ID | n | Ocena |
|-------------------------|--:|-------|
| `zaprawianie_bruzd` → `legacy-elektryka-mb` | **10** | **CRITICAL FALSE** — opis: *„…w gotowych bruzdach **bez zaprawiania bruzd**…”* |
| `zaprawianie_bruzd` → `legacy-roboty_ogolnobudowlane-mb` | **5** | **OK / improvement** — *„Zamurowanie bruzd…”* |
| `zabezpieczenie_folia` → `legacy-stolarka-mb` | **3** | **OK / improvement** (okna/drzwi / stolarka) |
| `zabezpieczenie_folia` → `legacy-podlogi-m2` | **2** | **OK / improvement** (podłogi folią) |
| `multiswitch_antenowy` → `legacy-elektryka-mb` | **1** | **FALSE** — wypusty Winidur *na gniazdo antenowe RTV/SAT* ≠ multiswitch |

**Po naive seed + Quotes:** Alias bind override zabrałby **11 linii** z poprawnego (lub akceptowalnego) Core ID na nowy Product ID (**10+1 false**). Quotes % może nawet **nie spaść** (jeśli stare ID też miały Quotes), ale **jakość mapowania / AI-COST / Detect** degraduje.

### 7.2 Root cause (dowód)

Regex Pack:

```text
/zaprawiani\w*\s+bruzd|zamurowan\w*\s+bruzd/
```

Trafia w podciąg **„zaprawiania bruzd”** wewnątrz **„bez zaprawiania bruzd”**.  
Regex multiswitch:

```text
/multiswitch|rtv.?sat|instalacj\w*\s+antenow/
```

Trafia w **„rtv/sat”** przy gnieździe antenowym.

### 7.3 Macierz ryzyka seedu

| Ryzyko | Poziom | Mitygacja (PLAN) |
|--------|--------|------------------|
| False remap elektryka (negacja) | **CRITICAL** | Alias: exclude `(bez|z wyłączeniem)\s+zaprawiani…` **lub** require start-anchored / positive-only |
| False remap RTV/SAT → multiswitch | **HIGH** | Alias: tylko `multiswitch` (+ opc. „instalowanie multiswitcha”) |
| Remap folia stolarka/podłogi | **LOW** | Akceptuj jako precyzja **lub** bind-if-unmapped |
| Remap zamurowanie → seed | **LOW** | Akceptuj |
| Seed bez Quotes | **HIGH** (DF) | Quotes REUSE zawsze z work |
| Oczekiwanie +5–8 pp z Wave 1 seed | **MED (plan)** | PLAN UPDATE scope / Wave 2 |
| Zmiana Cloud CORE / Payroll | **N/A** | OUT |

---

## 8. Rekomendowany zakres pierwszej fali (po PLAN UPDATE)

### Fala 0 — **wymagana przed seedem** (kod Alias / polityka · nie Library)

1. **Fix `zaprawianie_bruzd`:** nie matchuj negacji *bez zaprawiania bruzd*.  
2. **Fix `multiswitch_antenowy`:** usuń goły `rtv.?sat` / szerokie „instalacja antenowa”; zostaw `multiswitch`.  
3. **Decyzja bind:**  
   - **Opcja A (preferowana audytem):** precision Alias + zachowanie override (zgodne z P0c DF), **lub**  
   - **Opcja B:** `resolvedProductId` tylko gdy Core nie zmapował (mniejsze ryzyko remap).

### Fala 1a — **SAFE seed** (po Fali 0 lub równolegle jeśli Alias jeszcze no-op dla tych ID)

| ID | Lift unmapped | Remap risk po fix |
|----|--------------:|-------------------|
| `cc-p0c-w1-zawor-odpowietrzajacy` | +4 | **0** |
| `cc-p0c-w1-stop-ptakow` | +2 | **0** |

Est. Quotes: **~76.7%** (+0.3 pp).

### Fala 1b — **seed po precision**

| ID | Lift unmapped | Remap świadomy |
|----|--------------:|----------------|
| `cc-p0c-w1-zaprawianie-bruzd` | +8 | +5 zamurowanie (OK); **0** elektryka po fix |
| `cc-p0c-w1-zabezpieczenie-folia` | +4 | +5 stolarka/podłogi (OK przy BIZ-P0d-4) |
| `cc-p0c-w1-multiswitch-antenowy` | +1 | **0** po fix |

Est. skumulowane z 1a+1b: **~77.3%** (+0.9 pp) + poprawa jakości remap.

### Poza P0d Wave 1 (osobny PLAN / Wave 2 seed)

Top grupy z Alias Audit / PLAN rank 4: bruzdy (BIZ), gruntowanie, rozbiórki szerokie, Winidur, gzyms, podokienniki, INNE — **nie** w pierwszej fali reserved.

---

## 9. Acceptance Criteria (szkic pod PLAN UPDATE)

| ID | Kryterium |
|----|-----------|
| **AC-P0d-1** | 5 reserved works aktywne w Library + Quotes (REUSE path) |
| **AC-P0d-2** | TV-01 Quotes ≥ **76.4%** (brak regresji) · target mikro **≥ 77.0%** po pełnym Wave 1 seed |
| **AC-P0d-3** | **0** linii z *„bez zaprawiania bruzd”* zbindowanych do `cc-p0c-w1-zaprawianie-bruzd` |
| **AC-P0d-4** | **0** wypustów/gniazd RTV-SAT (bez słowa multiswitch) → `cc-p0c-w1-multiswitch-antenowy` |
| **AC-P0d-5** | OV: unmapped „Zaprawianie bruzd” / „Zawór…” / „stop ptaków” / „multiswitcha” / „okien folią” → reserved IDs |
| **AC-P0d-6** | Zero SMART P1 / MS P2 / cloud-sync CORE / Payroll w scope |
| **AC-P0d-7** | PLAN jawnie: P0d Wave 1 ≠ cel EPIC 88–92%; dalszy seed = osobny slice |

---

## 10. Zgodność z PLAN / DF (dlaczego UPDATE)

| Źródło | Oczekiwanie | Audyt P0d |
|--------|-------------|-----------|
| PLAN §2 rank 4 | Seed WC **+5–8 pp** | Reserved Wave 1 ≈ **+0.9 pp** |
| PLAN §3 | Po seed ~88–92% | Wave 1 seed → **~77%** |
| DF D-CC-16 | Seed + Quotes REUSE | OK — zachować |
| P0c DF | Alias override · reserved no-op do seed | Seed odblokuje override → **ujawnia false positives Pack** |
| Alias Audit | P0d kolejka LIBRARY_GAP | Potwierdzone; **+** wymagany precision pass |

---

## 11. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: PLAN UPDATE REQUIRED
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR PLAN** | **NIE** |
| **PLAN UPDATE REQUIRED** | **TAK** |
| **Blokery do wpisania w PLAN** | (1) Alias negation zaprawianie · (2) Alias multiswitch/RTV-SAT · (3) polityka bind/override · (4) realny scope ROI Wave 1 vs Wave 2 seed |
| **IMPLEMENT P0d** | **ZAKAZ** do Owner GO po zaktualizowanym PLAN + DF |
| **Commit / push** | **NIE wykonano** (audyt docs-only) |

**Rekomendacja Ownerowi:** zatwierdzić **PLAN UPDATE P0d** (Alias precision + SAFE seed 1a → 1b), **nie** „sam seed 5 ID”.

---

## 12. Zakazy (sesja AUDIT)

- IMPLEMENT Library / Quotes seed  
- commit · push  
- Wave 2 Alias / BIZ families / HIGH  
- SMART P1 · MARKET-SYNC P2 · Cloud Sync CORE · Payroll  
- Fuzzy ON · drugi matcher

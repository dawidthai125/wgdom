# CATALOG-COVERAGE-01 — P0e AUDIT (FULL Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0e-AUDIT  
> **EPIC:** CATALOG-COVERAGE-01 · **Etap:** **P0e AUDIT** (FULL Library Seed)  
> **STATUS:** **AUDIT COMPLETE** · **DOCS ONLY**  
> **Data:** 2026-07-31  
> **Owner GO:** P0e AUDIT — **bez IMPLEMENT** · **bez commit** · **bez push**  
> **Wejście:** P0d-A **CLOSED** · tip UI **2.65.90** / feature **`b9da6bff`** · [`P0d-A-CLOSEOUT`](CATALOG-COVERAGE-01-P0d-A-CLOSEOUT.md) · DF P0d [`CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md) §6.2 · Pack [`alias-pack-wave1.ts`](../../src/lib/catalog-coverage/alias-pack-wave1.ts) · Guard [`negation-guard.ts`](../../src/lib/catalog-coverage/negation-guard.ts)  
> **Artefakt RO (lokalny, nie commit):** `.tmp/catalog-coverage-01-p0e-audit-probe.json` · sonda `.tmp/catalog-coverage-01-p0e-audit-probe.mjs`

```text
════════════════════════════════════════════════════════
P0e AUDIT = FULL Library Seed PREPARATION ONLY
Cel: 3 remaining reserved ID · ROI · ryzyko · Guard · Precision · BIZ
Zakaz: IMPLEMENT seed · commit · push · Wave 2 / SMART / MS
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Status** | **READY FOR PLAN** |
| **PLAN UPDATE REQUIRED?** | **NIE** — nie ma blokerów precision/Alias wymagających osobnego PLAN UPDATE przed PLAN P0e |
| **Powód** | Precision Alias (zaprawianie + multiswitch) i Negation Guard (Alias\|Core) **już CLOSED w P0d-A**; pozostałe 3 reserved ID są merytorycznie gotowe do FULL seed + Quotes |
| **Warunek PLAN** | PLAN **musi** zamrozić: (1) higienę seedu (lekcja P0d-A), (2) decyzję BIZ folia, (3) AC OV (negacja / RTV / Core) |
| **Następny krok** | Owner GO → **PLAN P0e** → DF → IMPLEMENT — **nie** auto-start |

**Jednozdaniowo:** P0e = odblokowanie 3 reserved Product ID (zaprawianie · folia · multiswitch) z mikro-liftem **+0.6 pp** Quotes (76.7% → **~77.3%**); ryzyko FP Alias jest **mitygowane**; ryzyko Core = **higiena keywords/namePl**, nie nowy Pack.

---

## 1. Baseline (po P0d-A · TV-01)

| Metryka | Wartość |
|---------|--------:|
| Próba | **18** przetargów · **2228** linii |
| Quotes coverage | **76.7%** (**1709** / 2228) |
| Unmapped (eligible mapper) | **519** |
| Active works (Library) | **74** |
| SAFE w Library (`cc-p0c-w1-*`) | **2** — zawór · stop (Quotes **TAK**, `legacyCategoryId` **null**) |
| FULL reserved w Library | **0** |
| Cel EPIC | **88–92%** |

Pipeline FROZEN: **Noise → Normalizer → Negation Guard → Bind Decision → Alias \| Core → Library**. Fuzzy OFF.

---

## 2. Które reserved Work ID kwalifikują się do FULL Seed?

| # | Alias rule | Product ID | W Library? | Kwalifikacja P0e | Uzasadnienie |
|--:|------------|------------|------------|------------------|--------------|
| 1 | `zaprawianie_bruzd` | `cc-p0c-w1-zaprawianie-bruzd` | **NIE** | **TAK — FULL** | 8 unmapped pozytywnych; Guard chroni 10× negację; Precision Pack CLOSED |
| 2 | `zabezpieczenie_folia` | `cc-p0c-w1-zabezpieczenie-folia` | **NIE** | **TAK — FULL** *(z BIZ)* | 4 unmapped; 5 świadomych remapów stolarka/podłogi — wymaga decyzji zakresu |
| 3 | `multiswitch_antenowy` | `cc-p0c-w1-multiswitch-antenowy` | **NIE** | **TAK — FULL** | 1 unmapped; Precision = tylko token `multiswitch`; RTV/SAT FP = **0** |
| — | `zawor_odpowietrzajacy` | `cc-p0c-w1-zawor-odpowietrzajacy` | **TAK** | **NIE** | Już SAFE P0d-A |
| — | `stop_ptakow` | `cc-p0c-w1-stop-ptakow` | **TAK** | **NIE** | Już SAFE P0d-A |
| — | `piece_demontaz` | `legacy-rozbiorki-m2` | **TAK** | **NIE** | Poza reserved seed |

**Σ kandydatów FULL:** **3** Product ID (zgodnie z DF-AMEND CR-1 / §6.2 P0d).

**Poza P0e (nadal OUT):** top grupy WC · Wave 2 Alias · bruzdy BIZ szerokie · gruntowanie · Winidur · gzyms · podokienniki · INNE — osobny slice / epic.

---

## 3. Lista kandydatów FULL Seed (szkic FEATURE-DATA)

> **Nie implementować.** Quotes **obowiązkowo** z work (DF D-CC-16). Tor zapisu = REUSE P3.3 / OPS P0d-A. **Bez** nowego DATA_KEY.

| Product ID | namePl (propozycja) | unit | keywords (min. — **frazy**) | Quotes | Uwagi seed |
|------------|---------------------|------|-----------------------------|--------|------------|
| `cc-p0c-w1-zaprawianie-bruzd` | Zaprawianie / zamurowanie bruzd | `m` *(ATH: m/mb)* | `zaprawianie bruzd`, `zamurowanie bruzd` | **TAK** | **Zakaz** bare `bruzd` / `zaprawianie` · **bez** `legacyCategoryId` |
| `cc-p0c-w1-zabezpieczenie-folia` | Zabezpieczenie powierzchni folią | `m2` | `zabezpieczenie okien folią`, `zabezpieczenie … folią`, `folia malarska` *(tylko jeśli BIZ)* | **TAK** | **Zakaz** bare `folia` / `foli` · **bez** `legacyCategoryId` |
| `cc-p0c-w1-multiswitch-antenowy` | Multiswitch antenowy | `szt` | `multiswitch`, `multiswitch antenowy` | **TAK** | **Zakaz** `rtv` / `sat` / `instalacja antenowa` · **bez** `legacyCategoryId` |

**Lekcja P0d-A (obowiązkowa w PLAN):** tokeny Core `namePl`/`description` (≥4/≥5) + `legacyCategoryId` powodowały FP SAFE (`stop`⊂stopnie, `zawor`⊂zawory). FULL **musi** powtórzyć hardening: wąskie frazy · brak legacy category · OV Core FP.

---

## 4. Analiza ROI / prognoza Coverage

### 4.1 Text-hit Pack po Precision (eligible · FULL only · 2026-07-31)

| Rule | textAll | textUnmapped (= pot. lift Quotes) | textMappedAlready (= remap) |
|------|--------:|----------------------------------:|----------------------------:|
| `zaprawianie_bruzd` | **13** | **8** | **5** (zamurowanie → ogólnobudowlane) |
| `zabezpieczenie_folia` | **9** | **4** | **5** (3× stolarka · 2× podłogi) |
| `multiswitch_antenowy` | **1** | **1** | **0** |
| **Σ FULL** | **23** | **13** | **10** |

*Uwaga vs P0d AUDIT:* po Precision `zaprawianie` textAll spadło **23→13** (wycięte **10** negacji); `multiswitch` **2→1** (wycięty FP RTV/SAT).

### 4.2 Scenariusze Quotes (TV-01)

| Scenariusz | Δ linii Quotes | Δ pp | Coverage po |
|------------|---------------:|-----:|------------:|
| **Baseline P0d-A** | — | — | **76.7%** |
| **P0e FULL 3 ID + Quotes** (unmapped-only) | **+13** | **+0.6** | **~77.3%** |
| Tylko zaprawianie + multiswitch | **+9** | **+0.4** | **~77.1%** |
| Tylko folia | **+4** | **+0.2** | **~76.9%** |
| Cel EPIC 88–92% | — | **+11.3 … +15.3** potrzeba | **niemożliwe samym P0e FULL** |

**Wniosek ROI:** P0e = **mikro-lift** (+0.6 pp) + **jakość remap** (zamurowanie / folia ochronna zamiast legacy bucket). Nie wypełnia celu EPIC. PLAN musi jawnie: P0e ≠ 88–92%.

Remap **nie** podnosi Quotes %, jeśli stare Core ID już miały Quotes — zmienia **Product ID** (jakość mapowania / Detect / wycena).

---

## 5. Analiza ryzyka (false positive / regresja)

### 5.1 Macierz ryzyka

| Ryzyko | Poziom | Stan po P0d-A | Mitygacja P0e |
|--------|--------|---------------|---------------|
| *„bez zaprawiania bruzd”* → zaprawianie ID | **CRITICAL→LOW** | Guard + Pack positive · OV **0**/10 | Zachować Guard · TN-CORE-Z1 · OV batch |
| RTV/SAT → multiswitch | **HIGH→LOW** | Pack = tylko `multiswitch` · OV **0** | Zakaz keywords RTV/SAT w seed |
| Core keywords zaprawianie na linii z negacją | **HIGH→LOW** | Guard na Bind Decision (Alias\|Core) | Keywords tylko frazy · OV TN-CORE |
| Core bare `folia` / `foli` (22 hitów broad token) | **HIGH** | Pack Alias OK (9) | **Zakaz** bare keyword · frazy tylko |
| Remap zamurowanie → zaprawianie | **LOW** | 5 linii | Świadomy remap (poprawa precyzji) |
| Remap stolarka/podłogi → folia | **MEDIUM** | 5 linii | **BIZ-P0e-1** — akceptuj jeden ID **lub** zawęź Pack |
| Seed bez Quotes | **HIGH** (DF) | — | Quotes REUSE zawsze |
| `legacyCategoryId` + categoryHit | **HIGH** (lekcja SAFE) | SAFE naprawione | **Zakaz** legacy category na FULL |
| Oczekiwanie dużego liftu Coverage | **MED (plan)** | — | PLAN: mikro-scope |

### 5.2 Remap probe (już zmapowane · Pack FULL hit)

| Alias → current Core ID | n | Ocena |
|-------------------------|--:|-------|
| `zaprawianie_bruzd` → `legacy-roboty_ogolnobudowlane-mb` | **5** | **OK / improvement** — *Zamurowanie bruzd…* |
| `zabezpieczenie_folia` → `legacy-stolarka-mb` | **3** | **OK przy BIZ jednego ID** — okna/drzwi/stolarka |
| `zabezpieczenie_folia` → `legacy-podlogi-m2` | **2** | **OK przy BIZ** — podłogi folią |
| `multiswitch` → *any* | **0** | Brak remap risk |

**Brak** remapów elektryka←zaprawianie oraz RTV←multiswitch po Precision (w przeciwieństwie do naiwnego P0d AUDIT).

### 5.3 Folia: Pack vs broad token

| Sygnał | n |
|--------|--:|
| Broad token `foli` w eligible | **22** |
| Pack `zabezpieczenie_folia` hit | **9** |

⇒ Alias Pack jest względnie precyzyjny; **główne ryzyko P0e folia = Core seed keywords**, nie Pack.

---

## 6. Czy Negation Guard zabezpiecza wszystkie planowane seedy?

| Product ID | Guard chroni? | Wystarczające? | Komentarz |
|------------|---------------|----------------|-----------|
| `cc-p0c-w1-zaprawianie-bruzd` | **TAK** (kanon P0d) | **TAK** | `hasZaprawianieBruzdNegation` · Bind Decision · TN-CORE-Z1 · 10/10 neg linii TV-01 |
| `cc-p0c-w1-zabezpieczenie-folia` | **NIE** (brak reguły negacji) | **TAK / N/A** | Brak znanego wzorca *„bez zabezpieczenia folią”* w TV-01; ryzyko = Core bare `folia`, nie negacja |
| `cc-p0c-w1-multiswitch-antenowy` | **NIE** | **TAK / N/A** | FP był goły RTV/SAT — naprawione w Pack; Guard nie jest wektorem |

**Wniosek:** Guard **wystarcza** dla zaplanowanych FULL seedów w zakresie znanego ryzyka TV-01.  
**Nie** wymaga rozszerzenia Guard o folia/multiswitch **przed** P0e — o ile PLAN zamrozi higienę keywords.

**Opcjonalny backlog (nie bloker AUDIT):** Guard „bez zabezpieczenia …” — tylko jeśli Owner/PLAN znajdzie produkcyjne negacje.

---

## 7. Czy wymagane są nowe reguły Precision przed rozszerzeniem katalogu?

| Warstwa | Nowe reguły Alias Pack? | Wymagane przed seed? |
|---------|-------------------------|----------------------|
| Alias `zaprawianie_bruzd` | **NIE** — Precision CLOSED P0d-A | — |
| Alias `multiswitch_antenowy` | **NIE** — Precision CLOSED P0d-A | — |
| Alias `zabezpieczenie_folia` | **NIE** *(domyślnie)* | Opcja PLAN: zawęzić 3. gałąź regex jeśli BIZ = tylko okna |
| **Seed / Core hygiene** | **TAK — kontrakt danych** | **OBOWIĄZKOWE** (nie Pack) |
| Negation Guard nowe ID | **NIE** (nie bloker) | — |
| Fuzzy / Wave 2 | **ZAKAZ** | — |

**Wniosek:** Brak wymogu **nowego Precision Pack** przed P0e.  
Wymóg = **Precision seed contract** (namePl · keywords frazy · unit · zero `legacyCategoryId` · OV Core FP) — wpisać do PLAN/DF, nie do osobnego PLAN UPDATE Alias.

Jeśli Owner wybierze BIZ „folia = tylko okna”, wtedy **tak** — jedna zmiana Pack (zawężenie) **w tym samym** PLAN/DF P0e, nie osobny epic.

---

## 8. Decyzje biznesowe

| ID | Typ | Pytanie | Rekomendacja audytu |
|----|-----|---------|---------------------|
| **BIZ-P0e-1** | **POLITYKA / LEKKI BLOKER PLAN** | Jeden Product ID folia na okna + drzwi + podłogi + stolarkę? | **TAK na Wave FULL** (jeden reserved) — świadomy remap 5 linii = precyzja vs legacy; rozdział powierzchni = P1 / Wave 2 |
| **BIZ-P0e-2** | **PROSTY** | Zamurowanie bruzd = ten sam ID co zaprawianie? | **TAK** — Pack już łączy; 5× remap OK |
| **BIZ-P0e-3** | **PROSTY** | Unit zaprawianie `m` vs `mb`? | Seed dominant ATH (`m`); Alias bez hard unit gate |
| **BIZ-P0e-4** | **PROSTY** | Multiswitch trade ELEKTRYKA vs TELETECH? | Orient. ELEKTRYKA/TELETECH; bez wpływu na Pack |
| **BIZ-P0e-5** | **OPCJONALNE** | Fala: najpierw zaprawianie+multiswitch, potem folia? | **Opcja** jeśli Owner chce rozdzielić BIZ-P0e-1; ROI i tak mikro |
| **BIZ-P0e-6** | **PROSTY** | Czy P0e ma cel Coverage 88–92%? | **NIE** — jawny mikro-lift +0.6 pp |

**Podsumowanie BIZ:** jedyna decyzja wymagająca świadomego Ownera w PLAN = **zakres folii (BIZ-P0e-1)**. Reszta = prosty FEATURE-DATA + higiena seedu.

---

## 9. Acceptance Criteria (szkic pod PLAN)

| ID | Kryterium |
|----|-----------|
| **AC-P0e-1** | 3 FULL works aktywne w Library + Quotes (REUSE path) |
| **AC-P0e-2** | TV-01 Quotes ≥ **76.7%** (brak regresji) · target **≥ 77.2%** (~77.3%) po FULL |
| **AC-P0e-3** | **0** linii *„bez zaprawiania bruzd”* → `cc-p0c-w1-zaprawianie-bruzd` (Alias\|Core) |
| **AC-P0e-4** | **0** wypustów/gniazd RTV-SAT (bez `multiswitch`) → `cc-p0c-w1-multiswitch-antenowy` |
| **AC-P0e-5** | OV: unmapped „Zaprawianie bruzd” / „okien folią” / „multiswitcha” → reserved IDs |
| **AC-P0e-6** | **0** `legacyCategoryId` na FULL seeds · keywords bez bare `folia`/`bruzd`/`rtv` |
| **AC-P0e-7** | Zero SMART P1 / MS P2 / cloud-sync CORE / Payroll / Fuzzy / Wave 2 w scope |
| **AC-P0e-8** | PLAN jawnie: P0e ≠ cel EPIC 88–92% |

---

## 10. Zgodność z DF / Continuity

| Źródło | Oczekiwanie | Audyt P0e |
|--------|-------------|-----------|
| P0d DF-AMEND CR-1 | FULL = P0e | **Potwierdzone** — 3 ID |
| P0d DF §6.2 | P0e PLANNED | **Gotowe do PLAN** |
| P0d-A CLOSEOUT | NEXT = P0e Owner GO | **Wejście spełnione** |
| Guard D-P0d-16 | Alias\|Core | **Wystarcza na zaprawianie** |
| Epic 88–92% | — | P0e **nie** domyka — dalszy seed / Wave 2 |

---

## 11. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR PLAN
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR PLAN** | **TAK** |
| **PLAN UPDATE REQUIRED** | **NIE** |
| **Blokery implementacji** | Brak precision/Alias; PLAN musi zamknąć **BIZ-P0e-1** + **seed hygiene** |
| **IMPLEMENT P0e** | **ZAKAZ** do Owner GO po PLAN + DF |
| **Commit / push** | **NIE wykonano** (audyt docs-only) |

**Rekomendacja Ownerowi:** zatwierdzić **PLAN P0e** (FULL 3 ID + Quotes + higiena seedu + BIZ folia + AC OV).  
**Nie** startować IMPLEMENT. **Nie** oczekiwać skoku Coverage do 88–92% z samego P0e.

---

## 12. Zakazy (sesja AUDIT)

- IMPLEMENT Library / Quotes seed FULL  
- commit · push  
- Wave 2 Alias / BIZ families / HIGH / top grupy WC  
- SMART P1 · MARKET-SYNC P2 · Cloud Sync CORE · Payroll  
- Fuzzy ON · drugi matcher · nowe DATA_KEYS  
- Auto-start PLAN/DF/IMPLEMENT bez Owner GO

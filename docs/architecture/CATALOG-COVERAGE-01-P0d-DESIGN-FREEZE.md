# CATALOG-COVERAGE-01 — P0d DESIGN FREEZE (Library Seed)

> **ID:** CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0d — Precision + SAFE Seed**  
> **Etap:** **DESIGN FREEZE · AMENDED** · **DOCS ONLY**  
> **STATUS:** **DESIGN FREEZE · FROZEN (P0d) · DF-AMEND CR-1 + CR-2**  
> **Data:** 2026-07-30  
> **Owner GO:** DESIGN FREEZE AMEND P0d — zamyka FAIL z [`CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REVIEW.md`](CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REVIEW.md)  
> **Wejście:** PLAN UPDATE · AUDIT · epic DF D-CC-16 · P0c DF · AR P0d (**CHANGES REQUIRED** → ten amend)  
> **Zakaz:** IMPLEMENT · commit · push · **P0e FULL** · top grupy WC · Wave 2 Alias · SMART · MS · Fuzzy · Cloud CORE · Payroll

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0d DESIGN FREEZE · FROZEN + DF-AMEND
P0d = A Precision + B SAFE Seed ONLY
FULL Wave = P0e (POZA P0d)
Negation Guard → Bind Decision → Alias | Core
KPI P0d: ~76.7% (SAFE) · ≠ cel EPIC 88–92%
Zakaz: IMPLEMENT / commit / push
════════════════════════════════════════════════════════
```

---

## DF-AMEND (CR-1 · CR-2)

> **Amend ID:** P0d-DF-AMEND-2026-07-30  
> **Powód:** Architecture Review — **2 FAIL** (CR-1 zakres FULL · CR-2 bypass Negation przez Core)  
> **Charakter:** **tylko kontrakt / zakres dokumentacji** — **brak zmian funkcjonalnych** w kodzie (IMPLEMENT nadal zakazany)

### A. CR-1 — Zakres P0d vs P0e

| | Przed amend (DF v1) | Po amend (FROZEN) |
|--|---------------------|-------------------|
| **P0d** | A Precision → B SAFE → **C FULL** | **A Precision → B SAFE** only |
| **FULL Seed** | Fala C **w P0d** (za Gate B) | Slice **P0e** — **POZA P0d** |
| **ID reserved FULL** | W kartach P0d jako APPROVED FULL | Status **P0e PLANNED** — seed **zakazany** w P0d |

**Owner rekomendacja (przyjęta):** FULL Wave ↓ **P0e**.

**P0d obejmuje wyłącznie:**

1. **Precision** (Alias Pack + Negation Guard kontrakt)  
2. **SAFE Wave** (`zawor` + `stop_ptakow` + Quotes)

**P0e (poza tym DF / poza P0d):**  
`cc-p0c-w1-zaprawianie-bruzd` · `cc-p0c-w1-zabezpieczenie-folia` · `cc-p0c-w1-multiswitch-antenowy` — osobny DF/PLAN po Owner GO P0e.

### B. CR-2 — Negation Guard (cały bind)

| | Przed amend | Po amend (FROZEN) |
|--|-------------|-------------------|
| Ochrona negacji | Głównie w Alias `test` (D-P0d-1) | **Negation Guard** przed **Bind Decision** |
| Core keywords | Możliwy bypass po seedzie zaprawiania | Guard obowiązuje **Alias i Core** |
| Test | TN-Z* (Alias) | + **TN-CORE-Z1** (Core bind) |

**Kontrakt FROZEN (kolejność logiczna):**

```text
Noise → Normalizer
         ↓
   Negation Guard          ★ D-P0d-16 — etap przed decyzją bindu
         ↓
   Bind Decision           ★ czy kandydat Product ID jest dozwolony
         ↓
      ┌──┴──┐
   Alias   Core            ★ oba tory podlegają Guard
      └──┬──┘
         ↓
   catalogWorkId           ★ jedyny zapis w Product Mapper
```

**Invariant:** Negation **nie** chroni wyłącznie Alias Resolver.  
Jeśli Guard wykrywa negację dla Product ID wrażliwego (kanon: zaprawianie) ⇒ **zakaz bindu** tego ID — niezależnie od tego, czy kandydat pochodzi z Alias Match, czy z Core keywords/score.

### C. Wpływ na architekturę

| Obszar | Wpływ amend |
|--------|-------------|
| Pipeline | Jawny etap **Negation Guard** przed Bind Decision (logiczny; ZERO nowego matchera) |
| Zakres slice | P0d węższy; FULL = **P0e** |
| Alias Pack | Precision A nadal w P0d (negacja w regule + Guard shared) |
| Mapper | REUSE `mapOfferBoqLine` — Guard w torze bindu (Alias **i** Core) |
| Library / Quotes | P0d: tylko 2 SAFE seeds; FULL seeds **nie** w P0d |
| SMART / MS / Cloud / Payroll | **Bez zmian** (nadal OUT) |
| Funkcjonalność runtime | **Brak** — docs-only do IMPLEMENT |

### D. Brak zmian funkcjonalnych

```text
DF-AMEND = dokumentacja + kontrakt FROZEN
≠ IMPLEMENT Negation Guard
≠ IMPLEMENT seed SAFE
≠ commit / push
≠ zmiana Pack w repo (do Owner GO IMPLEMENT A)
≠ start P0e
```

### E. Status po amend

```text
READY FOR ARCHITECTURE RE-REVIEW
```

---

## 0. Werdykt (po DF-AMEND)

| | |
|--|--|
| **Rekomendacja** | **READY FOR ARCHITECTURE RE-REVIEW** |
| **CHANGES REQUIRED (AR CR-1/CR-2)?** | **ZAMKNIĘTE w tym amend** — do potwierdzenia re-AR |
| **Zakres P0d** | **A Precision → B SAFE** only |
| **FULL / P0e** | **OUT P0d** |
| **Est. lift Quotes (P0d)** | SAFE **+0.3 pp** → **~76.7%** |
| **Est. FULL (P0e, poza P0d)** | +~0.6 pp → ~77.3% skumulowane — **nie KPI P0d** |
| **NEXT** | Architecture **RE-REVIEW** → Owner GO **IMPLEMENT** A, potem B — **nie** auto-start · **nie** P0e |

---

## 1. Cel zamrożony

| | FROZEN (po amend) |
|--|-------------------|
| **IN** | (A) Precision Alias Pack + **Negation Guard** kontrakt · (B) SAFE Library seed + Quotes (**tylko** zawór + stop) |
| **OUT** | **P0e FULL** · top grupy WC · Wave 2 / BIZ / HIGH Alias · Fuzzy · SMART · MS · alt Quotes write · Cloud CORE · Payroll · seed spoza kart SAFE |
| **KPI slice P0d** | TV-01: Quotes ≥ **76.4%** · po SAFE ≥ **76.6%** (stretch **76.7%**) |
| **Klasa** | **FEATURE-DATA** · Gate G1–G9 **ALL-NIE** |
| **SSOT Product ID** | Pack [`alias-pack-wave1.ts`](../../src/lib/catalog-coverage/alias-pack-wave1.ts) — **bez zmiany** reserved ID |

---

## 2. Etapy wdrożenia FROZEN (P0d = A → B)

```text
[A] PRECISION ALIAS + NEGATION GUARD (kontrakt)
    · zaprawianie_bruzd: Negation Guard (D-P0d-16)
    · multiswitch_antenowy: tylko token multiswitch
    · testy TN / TP / TR (+ TN-CORE-Z1 w kontrakcie / fixture)
    · BEZ zapisu Library / Quotes
         ↓ Gate A PASS
[B] SAFE SEED
    · wyłącznie:
        cc-p0c-w1-zawor-odpowietrzajacy
        cc-p0c-w1-stop-ptakow
    · works + Quotes (REUSE path)
         ↓ Gate B / RELEASE P0d

[P0e] FULL SEED                    ★ POZA P0d — osobny Owner GO / DF
    · cc-p0c-w1-zaprawianie-bruzd
    · cc-p0c-w1-zabezpieczenie-folia
    · cc-p0c-w1-multiswitch-antenowy
```

| Fala | Slice | IN (FROZEN) | OUT (FROZEN) |
|------|-------|-------------|--------------|
| **A** | **P0d** | Precision Pack + Negation Guard + testy | Seed Library · P0e · Wave 2 |
| **B** | **P0d** | **tylko** zawór + stop + Quotes | Pozostałe reserved · P0e · top grupy |
| **FULL** | **P0e** | 3 reserved (poza P0d) | — |

**Invariant:** Zakaz seedu P0e w ramach IMPLEMENT P0d. Zakaz łączenia SAFE + FULL w jednym GO P0d.

---

## 3. Negation Guard — kontrakt FROZEN (CR-2)

### 3.1 Decyzje

| ID | Decyzja | Status |
|----|---------|--------|
| **D-P0d-1** | Negacja ma pierwszeństwo przed pozytywnym match frazy | **FROZEN** |
| **D-P0d-16** | **Negation Guard** obowiązuje **cały proces bindu** (nie tylko Alias Resolver) | **FROZEN (AMEND)** |
| **D-P0d-17** | Kolejność: **Negation Guard → Bind Decision → Alias \| Core** | **FROZEN (AMEND)** |
| **D-P0d-18** | Guard stosuje się do kandydatów z **Alias** oraz z **Core keywords/score** | **FROZEN (AMEND)** |
| **D-P0d-2…5** | Kanon *„bez zaprawiania bruzd”* · synonimy · bez AI/fuzzy | **FROZEN** |
| **D-P0d-6…8** | Multiswitch = tylko `multiswitch` | **FROZEN** |

### 3.2 Semantyka (kanon)

```text
ATH: „…w gotowych bruzdach bez zaprawiania bruzd…”

1) Positive substring „zaprawiania bruzd” ISTNIEJE
2) Negacja „bez” + ta sama fraza ISTNIEJE
3) Negation Guard ⇒ Product ID cc-p0c-w1-zaprawianie-bruzd = ZAKAZANY
4) Bind Decision odrzuca ten ID z Alias i z Core
5) Mapper może zbindować inny ID (typowo legacy-elektryka-mb)
```

**Biznesowo:** linia = **wyłączenie** zaprawy, nie zamówienie zaprawy.

### 3.3 Guard vs Alias Pack `test`

| Warstwa | Rola |
|---------|------|
| Pack `test` (precision A) | Wczesne NO MATCH Alias dla znegowanej frazy (UX/diagnostyka `aliasRuleId`) |
| **Negation Guard (D-P0d-16)** | **Ostateczna** blokada bindu Product ID — **także gdy Core** zaproponuje ten ID przez keywords |

**ZERO DUPLICATE LOGIC:** jedna funkcja/guard SSOT (shared); Pack `test` **REUSE** tej samej detekcji negacji — **nie** dwa rozbieżne regexy.

### 3.4 Multiswitch (bez zmiany CR)

Precision tokenowa — nie Negation Guard. D-P0d-6/7 FROZEN.

---

## 4. Pipeline FROZEN (po amend)

```text
[0] OfferBoq line
      ↓
[1] NOISE FILTER                 ★ P0a CLOSED
      ↓ (eligible only)
[2] NORMALIZER                   ★ P0b CLOSED
      ↓
[3] NEGATION GUARD               ★ P0d · D-P0d-16
      · wejście: hay po Normalizer (fold)
      · wyjście: zbiór Product ID zabronionych dla tej linii
      ↓
[4] BIND DECISION                ★ stosuje Guard do kandydatów
      ↓
[5] ALIAS RESOLVER               ★ P0c + P0d-A precision
      · Pack Wave 1 SSOT
      · DATA FIRST: work aktywny
      · kandydat Alias odpada, jeśli Guard zabrania ID
      ↓ (gdy brak Alias bind)
[6] PRODUCT MAPPER CORE          ★ score / keywords
      · kandydat Core odpada, jeśli Guard zabrania ID
      ↓
[7] catalogWorkId                ★ jedyny właściciel = Mapper
[8] Product Library / Quotes     ★ P0d-B: tylko SAFE karty
    SMART / MS / AI-COST         ★ AS-IS
```

**Invariant P0d-A:** precision + Guard kontrakt **bez** zapisu Library/Quotes.  
**Invariant P0d-B:** zapis Library/Quotes **tylko** REUSE FEATURE-DATA · **tylko** 2 ID SAFE.  
**Invariant Guard:** brak ścieżki Alias/Core omijającej Guard dla ID wrażliwych.

---

## 5. Gate'y FROZEN (P0d)

### Gate A → B

| ID | Kryterium |
|----|-----------|
| **G-A1** | **0** Alias hit na *„bez zaprawiania bruzd”* (TN-Z*) |
| **G-A2** | MATCH na „Zaprawianie bruzd” / „Zamurowanie bruzd…” (TP-Z*) |
| **G-A3** | **0** hit RTV/SAT-only (TN-M*) |
| **G-A4** | MATCH na „Instalowanie multiswitcha…” (TP-M1) |
| **G-A5** | Suite P0c + TN/TP/TR subset A — **PASS** |
| **G-A6** | TV-01 Quotes ≥ **76.4%** |
| **G-A7** | Brak nowych `cc-p0c-w1-*` w Library w fali A |
| **G-A8** | **TN-CORE-Z1** PASS (fixture: work zaprawianie obecny w teście ⇒ Core **nie** binduje znegowanej linii) |

### Gate B / RELEASE P0d

| ID | Kryterium |
|----|-----------|
| **G-B1** | SAFE works + Quotes aktywne (zawór, stop) |
| **G-B2** | Lift SAFE ≥ **+6** linii (lub OV równoważny) |
| **G-B3** | Quotes ≥ **76.4%**; target **≥ 76.6%** |
| **G-B4** | Remap probe SAFE: **0** false |
| **G-B5** | **0** seedów P0e w Library w ramach P0d |
| **G-B6** | TN/TP/TR P0d + TR-P0c — **PASS** |

**Usunięte z P0d:** Gate C / RELEASE FULL (przeniesione do przyszłego DF **P0e**).

---

## 6. Karty Seed FROZEN

> **Product ID = reserved Work ID** (1:1).

### 6.1 W zakresie P0d (SAFE)

| Product ID (= Work ID) | Fala | ROI (Δ linii) | Ryzyko | BIZ | Status |
|------------------------|------|--------------:|--------|-----|--------|
| `cc-p0c-w1-zawor-odpowietrzajacy` | **B SAFE** | **+4** | **LOW** | **NIE** | **APPROVED P0d SAFE** |
| `cc-p0c-w1-stop-ptakow` | **B SAFE** | **+2** | **LOW** | **NIE** | **APPROVED P0d SAFE** |

### 6.2 Poza P0d (P0e — nie seedować w P0d)

| Product ID (= Work ID) | Slice | ROI (Δ linii) | Ryzyko | BIZ | Status |
|------------------------|-------|--------------:|--------|-----|--------|
| `cc-p0c-w1-zaprawianie-bruzd` | **P0e** | **+8** (+5 remap zamurowanie) | **LOW po Guard** | **NIE** | **P0e PLANNED** — OUT P0d |
| `cc-p0c-w1-zabezpieczenie-folia` | **P0e** | **+4** (+5 remap stolarka/podłogi) | **MEDIUM** | **TAK (lekki)** | **P0e PLANNED** — OUT P0d |
| `cc-p0c-w1-multiswitch-antenowy` | **P0e** | **+1** | **LOW po precision** | **NIE** | **P0e PLANNED** — OUT P0d |
| `legacy-rozbiorki-m2` | — | 0 | — | — | **OUT SEED** — już w Library |

### Atrybuty seed P0d SAFE

| Work ID | namePl | unit | Quotes |
|---------|--------|------|--------|
| zawór | Zawór odpowietrzający | `szt` | **OBOWIĄZKOWE** (REUSE) |
| stop | Montaż stop ptaków | `m` | **OBOWIĄZKOWE** |

**Zakaz P0d:** seed ID spoza §6.1 · seed bez Quotes · seed P0e „na przyczepkę”.

---

## 7. Prognoza Coverage FROZEN

| Etap | Coverage Quotes (TV-01) | Slice |
|------|------------------------:|-------|
| Baseline (po P0c) | **76.4%** | — |
| Po A (precision + Guard) | **76.4%** (=) | **P0d** |
| Po B SAFE | **~76.7%** (+0.3 pp) | **P0d** |
| Po P0e FULL *(orient.)* | **~77.3%** (+0.9 pp skumulowane) | **P0e — OUT** |
| Cel EPIC | **88–92%** | top grupy — OUT |

---

## 8. Obowiązkowe testy regresji FROZEN

### 8.1 TN — negatywne

| ID | Case | Oczekiwane |
|----|------|------------|
| **TN-Z1** | ATH kabel *„…bez zaprawiania bruzd…”* | Alias **NO** · Guard zabrania ID zaprawianie |
| **TN-Z2** | Minimal: `bez zaprawiania bruzd` | Alias **NO** · Guard |
| **TN-Z3** | `z wyłączeniem zaprawiania bruzd` *(synonim)* | Alias **NO** · Guard |
| **TN-Z4** | Batch TV-01 ×10 | **0** bind zaprawianie-ID |
| **TN-CORE-Z1** | Fixture: work `cc-p0c-w1-zaprawianie-bruzd` **obecny** w `works` + opis znegowany; mapowanie przez tor **Core** (Alias no-match) | `catalogWorkId ≠ cc-p0c-w1-zaprawianie-bruzd` — **Guard blokuje Core keywords** |
| **TN-M1** | `…gniazdo antenowe RTV/SAT` | Alias **NO** |
| **TN-M2** | `instalacja antenowa` bez multiswitch | Alias **NO** |
| **TN-M3** | `okablowanie RTV-SAT` | Alias **NO** |
| **TN-X1** | Gołe `piece` bez demontażu | `piece_demontaz` **NO** |
| **TN-X2** | `odpowietrzenie instalacji` bez zaworu | nie forsować seed zaworu |

**TN-CORE-Z1 (obowiązkowy — CR-2):** udowadnia, że Negation Guard chroni **nie tylko** Alias, lecz **cały bind** (w tym Core). W P0d work zaprawianie może być **tylko w fixture teście** (nie w prod seed P0d).

### 8.2 TP — pozytywne

| ID | Case | Oczekiwane |
|----|------|------------|
| **TP-Z1** | `Zaprawianie bruzd` | Alias MATCH (precision); bind ID dopiero w **P0e** gdy work istnieje |
| **TP-Z2** | `Zaprawianie bruzd o szer. do 50 mm` | MATCH |
| **TP-Z3** | `Zamurowanie bruzd…` | MATCH |
| **TP-M1** | `Instalowanie multiswitcha 9/20…` | MATCH (precision); seed = **P0e** |
| **TP-V1** | `Zawór odpowietrzający o śr. 6 mm` | MATCH → po B: seed zawór |
| **TP-S1** | `Montaż stop ptaków` | MATCH → po B: seed stop |
| **TP-F1** | `Zabezpieczenie okien folią` | MATCH; seed = **P0e** |

### 8.3 TR — regresja pipeline

| ID | Check | Oczekiwane |
|----|-------|------------|
| **TR-P0c** | `scripts/test-catalog-coverage-01-p0c.mjs` | **PASS** |
| **TR-OV** | Owner verification TV-01 Quotes | ≥ baseline; po B ≥ **76.6%** |
| **TR-REMAP** | Remap probe SAFE | 0 false |
| **TR-IDEM** | Alias resolve stable | idempotentny |
| **TR-NOISE** | `isNoise` ⇒ no-op Resolver/Guard | PASS |
| **TR-DATA** | Brak work ⇒ null bind | PASS |
| **TR-GUARD** | Shared Negation Guard: Alias i Core ten sam werdykt dla kanonu | PASS |

**RELEASE P0d blocker:** TN (w tym **TN-CORE-Z1**) + TP SAFE + TR + TR-P0c.  
**Gate A blocker:** TN-Z* · TN-M* · **TN-CORE-Z1** · TP-Z* · TP-M1 · TR-P0c.

---

## 9. Architecture Checklist

| Zasada | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **SSOT FIRST** | **PASS** | Pack · Library · Guard SSOT · TV-01 |
| **REUSE FIRST** | **PASS** | Mapper / Resolver / Quotes P3.3 · Guard shared z Pack |
| **ZERO DUPLICATE LOGIC** | **PASS** | Jeden Guard · jeden Mapper · zero drugiego matchera |
| **DATA FIRST** | **PASS** | Bind gdy work aktywny; A bez seedu prod |
| **FEATURE-DATA** | **PASS** | SAFE seed + Quotes · ALL-NIE |
| **Brak SMART / MS** | **PASS** | OUT |
| **Quotes REUSE only** | **PASS** | D-P0d-14 · tylko SAFE w P0d |
| **Library tylko zatwierdzone Seedy P0d** | **PASS** | §6.1 only · P0e OUT |
| **Negation bez bypass Core** | **PASS** | D-P0d-16/17/18 + TN-CORE-Z1 |
| **Zakres P0d ≠ FULL** | **PASS** | CR-1 · FULL = P0e |

---

## 10. PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE (oczekiwane)
Cloud Sync CORE: NIE
Nowy DATA_KEY: NIE
Payroll / Week / Bootstrap: NIE
Owner GO CORE: NIE
```

---

## 11. Acceptance Criteria FROZEN (P0d)

| ID | Kryterium |
|----|-----------|
| **AC-P0d-1** | Fala A PASS przed seedem SAFE |
| **AC-P0d-2** | SAFE = wyłącznie zawór + stop · lift +6 |
| **AC-P0d-3** | **USUNIĘTE z P0d** — FULL/5-reserved = **P0e** |
| **AC-P0d-4** | Guard: **0** false *bez zaprawiania bruzd* → ID zaprawianie |
| **AC-P0d-5** | Multiswitch precision: **0** false RTV/SAT |
| **AC-P0d-6** | SAFE mapped + Quotes ≈ 0 missing |
| **AC-P0d-7** | Zero SMART / MS / Payroll / Library poza §6.1 |
| **AC-P0d-8** | P0d ≠ cel EPIC 88–92% |
| **AC-P0d-9** | **TN-CORE-Z1 PASS** — Guard blokuje Core keywords (CR-2) |
| **AC-P0d-10** | **0** seedów P0e w RELEASE P0d |

---

## 12. Decyzje — rejestr FROZEN

| ID | Decyzja | Status |
|----|---------|--------|
| **D-P0d-1…5** | Negacja / kanon zaprawiania | **FROZEN** |
| **D-P0d-6…8** | Multiswitch token | **FROZEN** |
| **D-P0d-9** | ~~A→B→C w P0d~~ → **A→B w P0d**; FULL = **P0e** | **FROZEN (AMEND CR-1)** |
| **D-P0d-10** | SAFE = zawór + stop only | **FROZEN** |
| **D-P0d-11** | Alias override Core (P0c) zachowany — **pod Guard** | **FROZEN** |
| **D-P0d-12** | Folia BIZ — **P0e** | **FROZEN (AMEND)** |
| **D-P0d-13** | Top grupy OUT | **FROZEN** |
| **D-P0d-14** | Quotes REUSE z każdym seedem P0d | **FROZEN** |
| **D-P0d-15** | TN/TP/TR + P0c = blocker RELEASE P0d | **FROZEN** |
| **D-P0d-16** | Negation Guard na cały bind | **FROZEN (AMEND CR-2)** |
| **D-P0d-17** | Guard → Bind Decision → Alias \| Core | **FROZEN (AMEND CR-2)** |
| **D-P0d-18** | Guard = Alias **i** Core keywords | **FROZEN (AMEND CR-2)** |
| **D-P0d-19** | TN-CORE-Z1 obowiązkowy | **FROZEN (AMEND CR-2)** |

---

## 13. Zakazy

- IMPLEMENT / commit / push w tej sesji  
- Seed B przed PASS Gate A  
- **Jakikolwiek seed P0e w P0d**  
- Seed ID spoza §6.1  
- Wave 2 Alias · Fuzzy ON · drugi matcher  
- SMART P1 · MARKET-SYNC · Cloud CORE · Payroll  
- Negation **tylko** w Alias bez Guard na Core  
- Zmiana reserved Product ID / kolejności Pack #1→#6 (poza precision `test` + Guard shared + `labelPl`)  

---

## 14. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR ARCHITECTURE RE-REVIEW
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR ARCHITECTURE RE-REVIEW** | **TAK** |
| **CR-1 / CR-2** | **Zaadresowane w DF-AMEND** |
| **Następny krok** | Owner GO **Architecture RE-REVIEW P0d** → potem IMPLEMENT **A**, potem **B** |
| **P0e** | Osobny start — **nie** część P0d |
| **IMPLEMENT / commit / push** | **NIE** — nie wykonano |

**Ścieżka:** AR (CHANGES REQUIRED) → **ten DF-AMEND** → **RE-REVIEW** → Owner GO IMPLEMENT A → B → RELEASE P0d → (później) P0e.

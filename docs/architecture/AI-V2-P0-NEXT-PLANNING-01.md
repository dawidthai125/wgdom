# AI-V2-P0-NEXT-PLANNING-01

> **ID:** AI-V2-P0-NEXT-PLANNING-01  
> **STATUS:** PLANNING · DOCUMENTATION ONLY  
> **MODE:** NO CODE · NO COMMIT · NO PUSH · NO IMPLEMENT  
> **Data:** 2026-07-31  
> **Po:** [`CONFIDENCE-MVP-CLOSE-01.md`](CONFIDENCE-MVP-CLOSE-01.md) · **FULLY CLOSED**  
> **Autorytet roadmapy:** [`AI-ARCHITECTURE-V2-DESIGN-FREEZE.md`](AI-ARCHITECTURE-V2-DESIGN-FREEZE.md) · [`AI-V2-P0-SELECTION-01.md`](AI-V2-P0-SELECTION-01.md)

```text
════════════════════════════════════════════════════════
NEXT P0 (shippable feature) = Scope Gap Engine MVP (RO)

Równolegle (docs-only, nie pierwszy IMPL UI):
  RCA Bid Anomaly (P0.1 DF) — bez zmian kalkulatora Bid

Confidence MVP = zamknięty wzorzec RO · nie ruszać.
════════════════════════════════════════════════════════
```

---

## 1. Baseline projektu (po Confidence MVP)

| Pole | Wartość |
|------|---------|
| **Live tip** | **2.65.92** · commit **`00a5d873`** · https://www.wgdom.fun/version.json |
| **Confidence MVP** | **FULLY CLOSED** · flaga `kw-confidence-mvp` **default OFF** |
| **AI v2 Discovery** | **CLOSED** ([`AI-V2-DISCOVERY-CLOSE-01`](AI-V2-DISCOVERY-CLOSE-01.md)) |
| **AI v2 Architecture DF** | **FROZEN** |
| **Tryb ogólny tipu** | UTRZYMANIE + opt-in Confidence · CATALOG-COVERAGE-01 nadal FULLY CLOSED |
| **Residual CI** | TEUX6 · jobs-mobile — **Open** · **UNRELATED** · osobny workflow · nieblokujący AI v2 |
| **Docs tip SSOT (`09_PRODUCTION_BASELINE`)** | Może jeszcze wskazywać **2.65.91** / P0e — **zaktualizować w osobnym docs tip sync** (poza tym planningiem) |

**Invariant tip:** AI-COST FREEZE · Bid SSOT · SMART Detect P0 · CC-01 Fuzzy OFF — bez zmian w następnym P0 Scope Gap.

---

## 2. Kolejność P0 (zamrożona — bez nowych decyzji)

### Z Design Freeze § roadmap P0

| ID DF | Moduł | Stan po Confidence CLOSE |
|-------|--------|---------------------------|
| **P0.1** | RCA Bid anomaly | **OPEN (docs)** — nie pierwszy shippable UI |
| **P0.2** | Scope Gap Engine RO | **NEXT IMPLEMENT** (po Thin DF + Owner GO) |
| **P0.3** | Confidence Engine MVP | **FULLY CLOSED** |

### Z P0 Selection (kolejność GO)

```text
1) Confidence MVP     ← DONE (CLOSED)
2) Scope Gap MVP      ← NEXT feature GO  ★
3) RCA Bid            ← docs RCA ASAP / równolegle;
                        IMPL Bid dopiero po osobnym Thin DF + GO
```

**Werdykt kolejności:** następny **modułem do Discovery→Thin DF→IMPLEMENT** jest **Scope Gap Engine MVP (RO)**.  
**Bid RCA** = tor dokumentowy równoległy, **nie** konkurujący o pierwszy slot kodu UI.

---

## 3. Zakres następnego modułu — Scope Gap MVP (plan, bez IMPL)

### 3.1 Cel (jedno zdanie)

Użytkownik widzi **ostrzeżenia „czego brakuje w zakresie”** (RO) przy analizie przetargu — **bez** dodawania pozycji i **bez** wpływu na wycenę/ofertę.

### 3.2 IN (proponowany Thin Slice — do zamrożenia w Thin DF)

| # | Element |
|---|---------|
| 1 | Pure lib: `buildScopeGapReport(input) → ScopeGapReport` |
| 2 | Ostrzeżenia z reguł szablonowych (OD-03/04 / Work Scope present vs expected) — tip-first |
| 3 | UI lista ostrzeżeń (panel Kosztorys / Przegląd) — flaga LS **default OFF** |
| 4 | Opcjonalnie: cytat Confidence drivers (read-only) — **nie** wymagane w MVP1 |
| 5 | Unit + fail-soft (brak szablonu / brak ATH = empty / soft) |
| 6 | Changelog + OV checklist |

### 3.3 OUT (zakaz — z Architecture DF)

| Zakaz |
|-------|
| Auto-insert pozycji przedmiaru / OfferBoq |
| Mutacja Bid / AI-COST / Quotes / SMART Detect / mapping |
| Wymaganie History Engine (MVP = reguły bez peers; History = P1) |
| Fuzzy matching |
| Persist KV Scope jako SSOT wyceny |
| Blokada CTA oferty przy ostrzeżeniach |

### 3.4 Pipeline slot (bez zmiany architektury)

```text
… → AI-COST → Bid → S7 → SMART → [History absent]
         → Scope Gap MVP (NOWY slice)
         → Confidence (już tip, fail-soft bez Scope)
         → UI
```

History **przed** Scope w DF — w MVP Scope **bez** History = legalne (reguły szablonowe).

---

## 4. Zależności · ryzyka · wymagane dokumenty

### 4.1 Zależności (REUSE tip)

| Zależność | Rola |
|-----------|------|
| [`SCOPE-GAP-ENGINE-AUDIT-01.md`](SCOPE-GAP-ENGINE-AUDIT-01.md) | AUDIT wejściowy (już istnieje) |
| Work Scope Inference / dossier signals | present scope |
| SMART Detect | **≠** Scope (Quotes vs zakres) — tylko rozróżnienie w UI |
| Confidence MVP (CLOSED) | Wzorzec RO · flaga · panel; Scope **nie** merguje się w Confidence w MVP |
| OD-03 / OD-04 / słowniki | Szablony expected gaps (do weryfikacji w Discovery) |

### 4.2 Ryzyka

| Ryzyko | Mitigacja planowania |
|--------|----------------------|
| False positives (FP) ostrzeżeń | Thin DF: mały allowlist reguł; fail-soft; flaga OFF |
| Mywanie ze SMART | Copy + osobny panel / sekcja „Zakres” ≠ „Brak Quotes” |
| Scope creep → History | History = P1; MVP bez peers |
| Residual CI TEUX6 / jobs-mobile | Nie mieszać z Scope Gap IMPL; osobny workflow |
| Docs tip 09 stale vs 2.65.92 | Tip sync docs przed/przy release Scope |

### 4.3 Wymagane dokumenty (kolejność)

| Krok | Dokument | Status |
|------|----------|--------|
| 0 | Architecture DF + Discovery Close + Selection | **DONE** |
| 1 | Scope Gap AUDIT | **DONE** (SCOPE-GAP-ENGINE-AUDIT-01) |
| 2 | **SCOPE-GAP-MVP-DISCOVERY** / odświeżenie luk tip (opcjonalnie short) | **TODO** Owner GO |
| 3 | **SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01** | **TODO** — jedyna podstawa IMPL |
| 4 | Owner GO IMPLEMENT | **TODO** |
| 5 | IMPLEMENT → OV → COMMIT → PUSH → PV → CLOSE | Po GO |

**Równolegle (docs):**  
`AI-COST-BID-ANOMALY-RCA-01` (lub równoważny) — hipoteza narzut×SWZ · **bez** zmiany `tenders-bid-calculator` aż Thin DF Bid.

---

## 5. Gotowość do Discovery / RCA

### 5.1 Scope Gap — Discovery readiness

| Check | Stan |
|-------|------|
| Architektura FROZEN | TAK |
| AUDIT Scope Gap | TAK |
| Wzorzec RO (Confidence) na tipie | TAK |
| Thin DF Scope | **BRAK** — blocker IMPL |
| Owner GO na Scope | **BRAK** |
| Dane tip (ATH / Work Scope) | Dostępne — weryfikacja w Discovery |

**Następny krok operacyjny:** Owner GO na **SCOPE-GAP-MVP Discovery / Thin DF** (nie IMPLEMENT).

### 5.2 Bid anomaly — RCA readiness

| Check | Stan |
|-------|------|
| REAL-BID AUDIT (anomalia) | TAK ([`AI-COST-REAL-BID-AUDIT-01`](AI-COST-REAL-BID-AUDIT-01.md)) |
| Formalny RCA Bid | **TODO** (docs-only) |
| Thin DF zmiany Bid | **TODO** dopiero po RCA |
| Ryzyko | Wysokie (Bid CORE-adjacent) — nie mieszać ze Scope IMPL |

### 5.3 Checklist przed startem Scope Discovery

```text
[ ] Owner potwierdza NEXT = Scope Gap MVP (ten planning)
[ ] Nie startować History / Explain MACRO / Fuzzy
[ ] Nie „naprawiać” TEUX6/jobs-mobile w tym torze
[ ] Nie ruszać Confidence (CLOSED) poza ewentualnym cytatem RO
[ ] Payroll Gate G1–G9 ALL-NIE dla Scope RO
[ ] Po Discovery → tylko Thin DF; IMPL dopiero po GO
```

---

## 6. Proponowany tor (bez auto-startu)

```text
NOW  → Owner czyta ten planning
  ↓
A    → SCOPE-GAP-MVP Discovery / Thin DF drafting
B∥   → Bid Anomaly RCA (docs)   [opcjonalnie równolegle]
  ↓
Owner GO Thin DF Scope
  ↓
IMPLEMENT Scope Gap MVP (wzór Confidence: flag OFF, RO, unit, OV…)
  ↓
CLOSE Scope Gap → dopiero potem P1 Explain / History (DF)
```

---

## 7. Werdykt planning

| Pytanie | Odpowiedź |
|---------|-----------|
| Co jest CLOSED? | **Confidence MVP** |
| Co jest NEXT (feature)? | **Scope Gap Engine MVP (RO)** |
| Co jest równolegle (docs)? | **RCA Bid Anomaly** |
| Czy wolno IMPL teraz? | **NIE** — brak Thin DF Scope + brak Owner GO |
| Czy zmieniać Architecture DF? | **NIE** |

```text
AI-V2-P0-NEXT-PLANNING-01 = COMPLETE (docs)
IMPLEMENT = BLOCKED do Thin DF Scope Gap + Owner GO
```

**DOCUMENTATION ONLY · NO CODE · NO COMMIT · NO PUSH · 2026-07-31**

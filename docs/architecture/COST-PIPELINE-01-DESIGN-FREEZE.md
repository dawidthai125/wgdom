# COST-PIPELINE-01 — DESIGN FREEZE (Wire OfferBoq → Bid · CTA · L0/L1/L2)

> **ID:** COST-PIPELINE-01-DESIGN-FREEZE-01  
> **PROGRAM:** COST-PIPELINE-01 — Kosztorys ofertowy WGDOM (jeden łańcuch)  
> **STATUS:** **DESIGN FREEZE · Owner GO (architektura)** · **IMPLEMENT COMPLETE** (UI 2.65.66) · patrz [`COST-PIPELINE-01-CLOSEOUT.md`](COST-PIPELINE-01-CLOSEOUT.md)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **#CORE-013** — zero Payroll write-path · zero cloud-sync merge · zero Edge  
> **Architecture Review:** [`COST-PIPELINE-01-ARCHITECTURE-REVIEW.md`](COST-PIPELINE-01-ARCHITECTURE-REVIEW.md) · **PASS · Owner zaakceptował**  
> **RCA wejściowe:** [`COST-ESTIMATE-01-RCA.md`](COST-ESTIMATE-01-RCA.md)  
> **Nadrzędne:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) · [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md) · [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **NIE jest:** TRE-03 · PDF/eksport · rewrite AI-COST/parserów · Foundation FND-06

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (DF-1):
  Wire: OfferBoq (L1) → Bid Proposal (L2) → Outcome
  CTA „Pokaż pełny kosztorys” → OfferBoq (nie ATH-first)
  Warstwy L0 Evidence · L1 OfferBoq · L2 Bid zamrożone

ZAMROŻONE:
  Bid NIE liczy ponownie kosztorysu — korzysta z OfferBoq (S6).
  Outcome korzysta z Bid (L2).
  Kosztorysy pokazują OfferBoq (L1).
  ATH = wyłącznie Evidence (L0).

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*opcjonalna flaga R0 DF — NIE kw-week-* / payroll)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: TAK*  (*useTenderPricingAuto / pipeline runtime — Boundary Check)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      TAK*  (*tab kosztorys + deep-link sekcji OfferBoq — bez nowego modelu URL poza V4)

Wynik: Gate Boundary G2/G6/G9 przy IMPLEMENT (#CORE-014).
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
STABILIZATION WINDOW: ACTIVE.
```

\*Bez nowych kluczy LS poza opcjonalnym R0 opisanym w §7 — bez ACR.

---

## 1. Cel DF-1

Domknąć **jeden łańcuch kosztorysu ofertowego** dla Outcome + zakładki Kosztorysy:

```text
Przedmiar/ATH (L0)
  → OfferBoq / AI COST (L1)     ← główny kosztorys ofertowy
  → Bid Proposal S6 (L2)        ← jedyna cena oferty
  → Recommendation Result / Outcome
  → CTA „Pokaż pełny kosztorys” → drill-down OfferBoq (L1+L2)
```

**Nie** budujemy PDF/eksportu. **Nie** przepisujemy silników AI-COST / Bid Kp/marża / parserów.  
**REUSE** zamrożonego AI-COST-01 (S1–S7) + adapter S6.

---

## 2. Zamrożone warstwy SSOT

| Warstwa | SSOT | Rola zamrożona | NIE jest |
|---------|------|----------------|----------|
| **L0 Evidence** | `TenderKosztorysSnapshot` + `tender-data-ssot` (`FOUND_*`, `resolveTenderValue`) | Wejście pozycji + klasyfikacja dokumentu inwestorskiego + podgląd ATH | „Pełny kosztorys” / cena oferty |
| **L1 Offer cost** | **`OfferBoqDocument`** (+ S2–S5.1 REUSE) | **Główny kosztorys ofertowy WGDOM** (linie, komponenty, direct) | Generator `recommendedBidPln` / Kp / marża |
| **L2 Offer price** | **`TenderBidProposal`** via `computeTenderBidProposal` | **Jedyna rekomendowana cena oferty (PLN)** | Ponowne liczenie pozycji kosztorysu |

### 2.1 Reguły twarde (ZAMROŻONE)

1. **Bid NIE liczy ponownie kosztorysu** (nie re-aggregate katalogu jako źródło Outcome, gdy OfferBoq ready).  
2. **Bid korzysta z OfferBoq** — wejście `offerBoqDirect` / S6 `integrateOfferBoqWithBidProposal` (REUSE).  
3. **Outcome korzysta z Bid (L2)** — Recommendation Result bez lokalnej ceny.  
4. **Kosztorysy pokazują OfferBoq (L1)** jako treść główną „pełnego kosztorysu”.  
5. **ATH pozostaje wyłącznie Evidence (L0)** — secondary / dowód, nie hero CTA.

### 2.2 Fallback catalog (zamrożona polityka)

| Warunek | Zachowanie |
|---------|------------|
| OfferBoq **ready** (linie + direct > 0 po S4 / S6) | Outcome + tab: **wyłącznie** ścieżka OfferBoq → Bid |
| OfferBoq **niedostępny** / empty / direct ≤ 0 | Uczciwy status Outcome **lub** jawny fallback `catalog` **tylko** jeśli DF IMPLEMENT utrzyma flagę fallback — **domyślnie preferuj status**, nie milczącą drugą cenę |
| `FOUND_NO_VALUE` (L0) | **NIE** oznacza braku kosztorysu ofertowego — copy UX oddziela L0 od L1/L2 |

**Zakaz:** równoległe dwie ceny (catalog Outcome ≠ OfferBoq tab) bez oznaczenia — AC regresji.

---

## 3. Diagram zamrożony (DF-1)

```text
┌─────────────────────────────────────────┐
│ L0 EVIDENCE                             │
│ Przedmiar / ATH → Snapshot → FOUND_*    │
│ Podgląd ATH (RO)                        │
└──────────────────┬──────────────────────┘
                   │ REUSE parsers (bez rewrite)
                   ▼
┌─────────────────────────────────────────┐
│ L1 OFFER COST — OfferBoqDocument        │
│ S1 build → S2 map → S3 CI → S4 pricing  │
│ (+ S5/S5.1 gdy user edytuje — REUSE)    │
└──────────────────┬──────────────────────┘
                   │ S6 adapter (offerBoqDirect)
                   │ Bid NIE przelicza pozycji
                   ▼
┌─────────────────────────────────────────┐
│ L2 OFFER PRICE — TenderBidProposal      │
│ computeTenderBidProposal (Kp/marża)     │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐   ┌──────────────────────┐
│ Outcome /       │   │ Tab Kosztorysy       │
│ Recommendation  │   │ OfferBoq = primary   │
│ Result (L2 PLN) │   │ ATH = Evidence only  │
└────────┬────────┘   └──────────────────────┘
         │
         │ CTA „Pokaż pełny kosztorys”
         └──────────► focus OfferBoq (L1), NIE ATH-first
```

---

## 4. Zakres IMPLEMENT (zamrożony — po Owner GO IMPLEMENTATION)

### 4.1 IN SCOPE (DF-1)

| # | IN |
|---|-----|
| **I1** | Wire runtime: zbuduj/reuse OfferBoq → S6 → `computeTenderBidProposal` → `bidProposal` dla Outcome / Offer Run |
| **I2** | Jedno źródło Bid dla Outcome i tabu Kosztorysy (ta sama ścieżka L1→L2) |
| **I3** | CTA „Pokaż pełny kosztorys” → tab `kosztorys` z **primary OfferBoq** (scroll/focus sekcji OfferBoq), **nie** ATH-first hero |
| **I4** | Layout tabu: OfferBoq primary · ATH / FOUND_* / Kosztorys Pro ATH = Evidence (secondary) |
| **I5** | Copy UX: oddziel „brak cen inwestora (L0)” od „kosztorys ofertowy (L1/L2)” |
| **I6** | Testy: Outcome PLN ≡ Bid z OfferBoq · CTA ląduje na OfferBoq · brak dual-price bez statusu |
| **I7** | Changelog + tip docs przy release |
| **I8** | Boundary #CORE-014 · jawny `git add` |
| **I9** | VERIFY FAST po push |

### 4.2 OUT OF SCOPE (ZAKAZ bez ACR + nowego DF)

| OUT | Powód |
|-----|--------|
| PDF · eksport · XLS | Osobny DF |
| AI-COST rewrite (S1–S5.1 rdzeń) | Freeze AI-COST-01 — REUSE only |
| Parser rewrite / dossier merge rewrite | L0 REUSE |
| Roboty | Poza programem |
| TRE-03 (explain / Decision / Offer Run V2) | Osobny program |
| Foundation FND-06 / nowe FND w UI | BLOCKED / poza DF-1 |
| Edge · cloud-sync merge · DATA_KEYS | #CORE-013 |
| Decision / Autonomous rewrite | OUT |
| Usunięcie ATH / Evidence | Zakaz — L0 zostaje |
| Nowy kalkulator marży w UI | Bid = L2 only |
| Persist OfferBoq w KV (nowy klucz) | DF-1 = compute on read (jak panel dziś), bez sync |

**Naruszenie OUT = STOP IMPLEMENT · ACR + Owner GO.**

---

## 5. Allowlist plików (kontrakt IMPLEMENT)

> Po Owner GO IMPLEMENTATION wolno zmieniać **tylko** pliki z listy (lub ACR).

| Plik | Rola DF-1 |
|------|-----------|
| `src/app/hooks/useTenderPricingAuto.ts` | Wire OfferBoq → Bid (zamiast/obok catalog jako SSOT Outcome) |
| `src/app/hooks/useTenderPipelineRuntime.ts` | Tylko jeśli konieczne podłączenie wspólnego Bid (minimalny diff) |
| `src/lib/tender-offer-boq-bid-adapter.ts` | REUSE S6 — ewentualnie thin export helper **bez** zmiany semantyki Kp |
| `src/lib/tender-offer-boq-explainability.ts` | Współdziel budowę OfferBoq+Bid z runtime (thin extract) — **bez** rewrite S4 |
| `src/app/TenderDetailPage.tsx` | CTA → focus OfferBoq |
| `src/app/TenderKosztorysWorkspace.tsx` | Primary OfferBoq · Evidence ATH secondary |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Tylko jeśli kotwica `id` / deep-link / kolejność UI |
| `src/lib/tender-recommendation-result.ts` | Opcjonalnie: meta/copy (bez nowej ceny) |
| `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | Opcjonalnie: copy CTA (bez nowego ekranu) |
| `src/lib/tenders-v4-config.ts` **lub** cienki flag module | Opcjonalny R0 feature flag DF-1 |
| `scripts/test-cost-pipeline-01-*.mjs` (nowy) | Testy wire + CTA semantics |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wersja UI |
| `docs/AI/09_PRODUCTION_BASELINE.md` · `CURRENT-TASK.md` | Tip / status po release |
| `docs/architecture/COST-PIPELINE-01-*` | Raport / closeout (docs) |

**Poza allowlist bez ACR:** `tenders-bid-calculator.ts` (rdzeń Kp — tylko wywołanie z `offerBoqDirect`), parsery, `cloud-sync.ts`, Edge, Payroll, Roboty.

> Uwaga: **wywołanie** `computeTenderBidProposal({ offerBoqDirect })` jest IN; **przepisanie** logiki Kp/marży jest OUT.

---

## 6. Plan migracji (DF-1)

```text
M0  Owner GO IMPLEMENTATION (osobne od tego DF)
M1  Extract / reuse: jedna funkcja „buildOfferBoqForTender(item) → doc”
    + integrateOfferBoqWithBidProposal → bidProposal
M2  useTenderPricingAuto: gdy OfferBoq ready → Bid z S6;
    inaczej status / fallback wg §2.2
M3  CTA + TenderKosztorysWorkspace: OfferBoq primary, ATH Evidence
M4  Testy AC · build · changelog
M5  Push · VERIFY FAST · Owner QA (Outcome PLN = tab)
```

**Zasada:** najpierw **jedna cena**, potem (osobny DF) PDF/eksport.

---

## 7. Rollback

| Poziom | Akcja | Skutek |
|--------|-------|--------|
| **R0 — flaga OFF** (jeśli wprowadzona w IMPLEMENT) | LS / default tip OFF | Powrót do catalog Bid + ATH-first (stan pre-DF-1 wire) **bez** redeployu silników |
| **R1 — revert tip** | Revert commitów allowlist DF-1 | Tip jak przed wire |
| **R2 — revert bundle** | Revert całego release DF-1 | Pełny rollback UX |
| **Nigdy w rollbacku** | Zmiana Kp/marży Bid · sync · Edge · kasowanie ATH evidence | Silniki nietknięte |

**Warunek release:** R0 lub R1 opisany w CHANGELOG · Owner zna ścieżkę.

---

## 8. Kryteria akceptacji (AC)

### Produkt

| ID | Kryterium |
|----|-----------|
| **AC-P1** | Outcome pokazuje `recommendedBidPln` z Bid zasilonego OfferBoq (gdy L1 ready) |
| **AC-P2** | CTA „Pokaż pełny kosztorys” otwiera tab kosztorys z **widocznym OfferBoq** jako treścią główną |
| **AC-P3** | ATH nie jest hero „pełnego kosztorysu” — Evidence / secondary |
| **AC-P4** | Ta sama kwota Bid (L2) na Outcome i w kontekście tabu (w granicach zaokrągleń Bid) |
| **AC-P5** | `FOUND_NO_VALUE` nie blokuje ani nie myli komunikatu „brak kosztorysu ofertowego”, gdy L1/L2 ready |

### Architektura

| ID | Kryterium |
|----|-----------|
| **AC-A1** | Diff ⊆ allowlist §5 lub ACR |
| **AC-A2** | Zero OUT z §4.2 |
| **AC-A3** | Bid nie re-aggregate pozycji gdy używa `offerBoqDirect` |
| **AC-A4** | REUSE S1–S7 / adapter S6 — brak drugiego kalkulatora oferty |
| **AC-A5** | Gate G1–G9 + Boundary #CORE-014 PASS |

### Jakość

| ID | Kryterium |
|----|-----------|
| **AC-Q1** | `npm run build` PASS |
| **AC-Q2** | Testy DF-1 PASS |
| **AC-Q3** | Changelog + tip docs |
| **AC-Q4** | VERIFY FAST (`version.json`) PASS lub DEPLOY PROPAGATING wg workflow |

---

## 9. Ryzyka (zamrożone świadomie)

| Ryzyko | Poziom | Mitigacja DF |
|--------|--------|--------------|
| Zmiana kwoty Outcome vs catalog legacy | **Wysokie** | Owner QA · changelog · R0 |
| OfferBoq wolny / incomplete przy otwarciu Outcome | **Średnie** | Status uczciwy · nie spinner wieczny (REUSE TRE HOTFIX semantics) |
| Dual compute (panel + runtime) | **Średnie** | Jedna shared build path (M1) |
| Scope creep PDF/XLS/TRE-03 | **Wysokie** | OUT twarde §4.2 |
| Payroll / sync | **Niskie** | Gate + allowlist |
| Utrata Evidence ATH | **Niskie** | L0 obowiązkowe secondary |

---

## 10. Relacja do AI-COST Freeze / TRE

| Dokument | Relacja |
|----------|---------|
| AI-COST-01 Freeze | **REUSE** łańcucha S1→S6→Bid — DF-1 **domyka runtime**, nie zmienia Freeze |
| TRE-01/02 | Outcome First zostaje; **zmienia się źródło Bid + semantyka CTA** (ten DF) |
| TRE-03 | **OUT** — nie startować z tego DF |
| PDF / eksport | **OUT** — osobny DF po stabilizacji wire |

---

## 11. DoD Design Freeze (ten dokument)

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | AR PASS + Owner GO | **PASS** |
| D2 | L0/L1/L2 zamrożone | **PASS** (ten plik) |
| D3 | Wire + CTA + OUT zamrożone | **PASS** |
| D4 | Allowlist · migracja · rollback · AC · ryzyka | **PASS** |
| D5 | IMPLEMENT | **BLOCKED** — czekaj Owner GO IMPLEMENTATION |

---

## 12. STOP

```text
DESIGN FREEZE COMPLETE
IMPLEMENTATION: BLOCKED

Czekaj na Owner GO do IMPLEMENTATION.
Bez GO: zero kodu · zero commit · zero push.
```

**Koniec COST-PIPELINE-01-DESIGN-FREEZE.**

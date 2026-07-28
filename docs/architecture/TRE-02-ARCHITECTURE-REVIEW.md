# TRE-02 — Architecture Review (Outcome First Experience)

> **ID:** TRE-02-ARCHITECTURE-REVIEW  
> **EPIC / NAME:** TENDER RECOMMENDATION ENGINE · **OUTCOME FIRST EXPERIENCE**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **OWNER STATUS:** **GO** (start procesu TRE-02 — Review)  
> **IMPLEMENT:** **BLOCKED** do Design Freeze + Owner GO na DF  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Tryb:** READ ONLY — **bez** implementacji · nowych funkcji · commit · push  
> **Baseline:** [`TRE-PROGRAM-BASELINE.md`](TRE-PROGRAM-BASELINE.md) · tip feature **2.65.63** / **`74ac6a0`** · **PRODUCTION VERIFIED**  
> **Priorytet:** [`TRE-NEXT-PRIORITY.md`](TRE-NEXT-PRIORITY.md) — kandydat **P1**  
> **Nadrzędne:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) · [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md)  
> **Prior CLOSED:** [`TRE-01-CLOSEOUT.md`](TRE-01-CLOSEOUT.md) · [`TRE-01-DESIGN-FREEZE.md`](TRE-01-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
TRE-02 ≠ nowe możliwości silników.
TRE-02 = uczynić Outcome DOMYŚLNYM doświadczeniem tipu
         zgodnie z Product SSOT (1 klik → cena).

IN:  zmiana defaultu UX + zachowanie R0 + Hub recovery
OUT: explain · orchestrator · Hub delete · Bid/AI-COST ·
     Autonomous rewrite · FND-06 · e-składanie · decyzja GO/HOLD
════════════════════════════════════════════════════════
```

---

## 0. Cel TRE-02 (wiązanie)

Po **TRE-01** Outcome MVP istnieje na produkcji, ale tip ma **default OFF** (`TRE_01_SLICE_A_DEFAULT = false`) — użytkownicy nadal lądują w Hub / dotychczasowym detalu.

**Cel TRE-02:** domknąć lukę Product SSOT — po otwarciu przetargu **domyślne** doświadczenie = **Outcome** (rekomendowana cena lub uczciwy status + CTA kosztorys + recovery Hub).

**Cel NIE jest:** budowa nowych możliwości wyceny, orkiestracji, explainability, decyzji biznesowej ani Foundation.

---

## 1. Gate procesu (stan)

| Warunek Baseline | Status względem tego Review |
|------------------|------------------------------|
| W1 Decyzja kierunku | **PASS** — Owner GO TRE-02 Outcome First |
| W2 Owner GO start procesu | **PASS** (ten brief) |
| W3 Baseline TRE-01 | **PASS** — PV **2.65.63** / **`74ac6a0`** |
| W4 Payroll Gate | **Wymagany przed IMPLEMENT** (wypełnić w DF) |
| W5 Stabilization / Core | **Wymagany check przed IMPLEMENT** |
| W6 Design Freeze TRE-02 | **NIE** — następny krok po tym Review |
| W7 Owner GO na DF | **NIE** — po DF |

```text
Teraz: Architecture Review COMPLETE (ten dokument)
Dalej: Design Freeze TRE-02 → Owner GO → IMPLEMENT
Zakaz: kod przed W6∧W7
```

---

## 2. Stan wyjściowy (po TRE-01) — co już jest

| Element | Stan tipu | Implikacja dla TRE-02 |
|---------|-----------|------------------------|
| Outcome UI MVP | LIVE | **Reuse** — nie budować nowego ekranu |
| Offer Run + Recommendation Result | LIVE | **Reuse** — nie zmieniać mapowania Bid |
| Foundation FND-01…05 spine | LIVE · niewidoczna | **Reuse** — zero UI Foundation |
| Flaga `isTre01SliceAEnabled()` | Default **OFF** · LS override `kw-tre-01-slice-a` | **Punkt zmiany defaultu** |
| Hub / V4 detal | Recovery przez CTA + `tre01ForceWorkspace` | **Zachować** |
| Autonomous Gate | Pomijany gdy Outcome aktywny | **Nie rozbudowywać** |
| Bid `recommendedBidPln` | Jedyna cena Outcome | **Nienaruszalne** |

**Wniosek architektoniczny:** TRE-02 to przede wszystkim **przełączenie domyślnej ścieżki prezentacji**, nie nowa warstwa domenowa.

---

## 3. Zakres zmian UX (weryfikacja 1)

### 3.1 Co się zmienia dla użytkownika

| Moment | Dziś (baseline tip) | Po TRE-02 (docelowo) |
|--------|---------------------|----------------------|
| Lista → otwarcie przetargu (tab `przetarg`) | Hub / detal V4 (+ ewentualnie Autonomous) | **Outcome** (cena lub status) |
| CTA „Pokaż pełny kosztorys” | (gdy flaga ON) → tab kosztorys | **Bez zmiany semantyki** |
| CTA „Szczegóły / Hub” | (gdy flaga ON) → workspace Hub | **Bez zmiany — recovery** |
| Deep-link / inny tab V4 (`kosztorys`, `decyzja`, …) | Workspace | **Bez zmiany** (Outcome tylko default `przetarg`) |
| Flaga OFF (R0) | Hub-first | **Nadal możliwe** (rollback) |

### 3.2 Co się **nie** zmienia w UX (IN tego Review)

- Layout / copy Outcome MVP poza koniecznym minimum pod default ON (np. brak nowych sekcji explain).  
- Lista przetargów, Strategia, Mapa, Ustawienia.  
- Treść Hub / 5 tabów V4 / Process Strip (gdy recovery).  
- Panel AI Cost / Bid calculator UI poza ścieżką Outcome.

### 3.3 Minimalny mechanizm (kierunek DF — nie implementacja)

Architektura dopuszcza **jedną** z dróg równoważnych produktowo (wybór w DF, nie obie naraz bez potrzeby):

| Opcja | Opis | Preferencja Review |
|-------|------|-------------------|
| **A** | `TRE_01_SLICE_A_DEFAULT = true` (+ LS `0` = R0 OFF) | **Preferowana** — najmniejszy diff, reuse istniejącej flagi |
| **B** | Nowa nazwa flagi TRE-02 z default ON, alias do tej samej ścieżki | Tylko jeśli DF wymaga czytelniejszej semantyki wersji |

**Zakaz UX w TRE-02:** nowy ekran wyniku · drugi CTA ceny · Hub delete · wymuszanie Autonomous przed Outcome.

---

## 4. Wpływ na istniejący moduł (weryfikacja 2)

### 4.1 Powierzchnie dotknięte (oczekiwany allowlist DF)

| Obszar | Wpływ | Charakter |
|--------|-------|-----------|
| `tenders-v4-config.ts` (lub równoważna flaga) | Default ON | **Główna zmiana** |
| `TenderDetailPage.tsx` | Ewentualnie tylko jeśli DF wymaga polish default/landing | **Minimalny** — ścieżka Outcome już istnieje |
| Changelog / tip docs | Wersja UI | Proces release |
| Testy flagi / regresja R0 | Aktualizacja asercji default | Test-only |

### 4.2 Powierzchnie **nietknięte** (twarde)

| Obszar | Powód |
|--------|--------|
| `useTenderPipelineRuntime` / NG-02 | Offer Run nadal tylko obserwuje |
| Bid calculator / AI-COST S1–S7 | REUSE · Freeze |
| Trust engine (logika) | Tylko odczyt jak w TRE-01 |
| Discovery / dossier / parsers | REUSE |
| `cloud-sync` / `DATA_KEYS` / Edge | Zero |
| Foundation API / FND-06 | Spine bez zmian · FND-06 OUT |
| Lista / Strategia / Mapa | Satelity |
| Autonomous Gate implementacja | Brak rewrite; zachować ominięcie przy Outcome |

### 4.3 Wpływ behawioralny

- **Więcej użytkowników** zobaczy Outcome (w tym stany `running` / `insufficient_data` / `review_required`) — to zamierzone vs Product SSOT (uczciwy status > Hub-first).  
- Recovery Hub pozostaje jednym kliknięciem.  
- Deep-linki do innych tabów nie powinny być „przejęte” przez Outcome (obecna logika `activeTab === "przetarg"`).

---

## 5. Rollback (weryfikacja 3)

| Poziom | Mechanizm | Werdykt |
|--------|-----------|---------|
| **R0 — natychmiastowy** | LS `kw-tre-01-slice-a=0` lub `removeItem` (przy default ON: LS `0` wymusza OFF) | **PASS** — bez redeployu silników |
| **R1 — tip** | Przywrócenie `DEFAULT=false` w release hotfix | **PASS** — mały diff config |
| **R2 — revert commit** | Revert allowlist TRE-02 | **PASS** — brak zmian Bid/sync = prosty revert |
| **Nigdy w rollbacku** | Zmiana Bid / AI-COST / merge „w drugą stronę” | Nienaruszone |

**Warunek DF:** R0 musi pozostać **udokumentowany** i przetestowany (AC poniżej).  
**Zgodność z TRE-01 Closeout:** rollback flagą = kluczowa właściwość programu — TRE-02 **nie** może jej usunąć.

---

## 6. Hub jako recovery (weryfikacja 4)

| Wymóg | Stan TRE-01 | TRE-02 |
|-------|-------------|--------|
| Hub nieusunięty | TAK | **Zachować** |
| CTA „Szczegóły / Hub” | TAK | **Zachować** |
| `tre01ForceWorkspace` / równoważne | TAK | **Zachować** |
| Tab V4 / Process Strip po recovery | TAK | **Zachować** |
| Hub soft-hide / delete | OUT Closeout / Priority | **OUT OF SCOPE TRE-02** |

**Werdykt:** Hub **nadal działa jako recovery**. TRE-02 zmienia tylko **default landing**, nie rolę Hub.

---

## 7. Bid Proposal = jedyne źródło ceny (weryfikacja 5)

| Wymóg Product SSOT / Blueprint | TRE-02 |
|--------------------------------|--------|
| Jedna rekomendowana cena oferty | **Bez zmian** — Outcome nadal z Recommendation Result |
| `recommendedOfferPln` ← Bid `recommendedBidPln` | **Bez zmian** |
| Zakaz drugiego kalkulatora / sumy „na skróty” | **OUT** |
| AI-COST tylko pośrednio przez istniejący łańcuch | **Bez zmian** |

**Werdykt:** Bid Proposal **pozostaje** jedynym źródłem rekomendowanej ceny. TRE-02 **nie** dotyka silnika oferty.

---

## 8. Foundation niewidoczna (weryfikacja 6)

| Wymóg | TRE-02 |
|-------|--------|
| Spine FND-01…05 bez zmian odpowiedzialności | **Reuse as-is** |
| Zero feedu eventów/audytu/digest w Outcome UI | **Zachować** |
| FND-06 | **OUT** (BLOCKED Foundation) |
| Nowe typy eventów „dla default ON” | **OUT** — niepotrzebne do zmiany defaultu |

**Werdykt:** Foundation **pozostaje niewidoczna**. Brak nowego UI Foundation w TRE-02.

---

## 9. Ryzyka wdrożenia (weryfikacja 7)

Ponowna ocena względem Baseline §7 (BR*) pod kątem **wyłącznie** default Outcome:

| ID | Ryzyko | Sev | Ocena w TRE-02 | Kontrola w DF |
|----|--------|-----|----------------|---------------|
| **BR1** | Outcome default ON zmienia tip dla wszystkich | **H** (produktowo) | **Akceptowane** jako cel TRE-02 | R0 · Owner QA przed/po · AC Hub recovery |
| **BR2** | Dual UX Hub vs Outcome | M | Nadal obecne | CTA recovery · brak Hub delete |
| **BR3** | Scope creep → rewrite silników | H | **Mitigowane** twardym OUT | Allowlist tylko flaga/landing/docs/test |
| **BR4** | Autonomous vs Outcome | M | Ścieżka ominięcia Gate już w TRE-01 | **OUT** rewrite Autonomous; obserwacja po ON |
| **BR5** | Fat Run / Sync Storm | H | **Brak zmian persist** | Zakaz pipeline fat Run (jak TRE-01) |
| **BR6** | Fałszywa pewność ceny | M | Bez zmian bramek jakości | REUSE trust/Bid; **OUT** nowa logika ready |
| **BR7** | Brak interaktywnego QA | M | **Zalecane przed GO DF** | Owner QA LS ON→OFF w Closeout TRE-01 §8 |
| **BR8** | Payroll / Stabilization | H | Zakres FE UX-only | Gate G1–G9 w DF · zero payroll/sync |
| **BR9** | FND-06 / Foundation UI | M | **OUT** | Explicit OUT w DF |
| **BR10** | Mixed bundle / Shared | M | Mały allowlist | Jawny `git add` · zakaz WIP |

**Ryzyka nowe specyficzne dla default ON:**

| ID | Ryzyko | Sev | Kontrola |
|----|--------|-----|----------|
| **T2-R1** | Shock użytkowników przyzwyczajonych do Hub | M | Recovery CTA · R0 · komunikat w Zmianach |
| **T2-R2** | Więcej sesji w stanie `running` na pierwszym ekranie | M | Już w Outcome MVP — uczciwy status SSOT |
| **T2-R3** | LS `1` z QA Ownera „przyklejony” mylący testy | L | Dokumentacja: po QA ustawić `0` lub clear przed oceną defaultu tipu |

**Minimalny próg przed GO na DF:** BR3/BR5/BR8/BR9 = **OUT lub świadomy accept**; BR7 = Owner QA wykonany lub świadomie odroczony w DF.

---

## 10. Kryteria akceptacji (weryfikacja 8)

### Produkt (Product SSOT)

| ID | Kryterium |
|----|-----------|
| **AC-P1** | Po otwarciu przetargu (tab `przetarg`, bez force workspace) użytkownik tipu widzi **Outcome** bez konieczności ręcznego LS=`1` |
| **AC-P2** | Gdy Bid ma rekomendację — Outcome pokazuje **tę** kwotę PLN |
| **AC-P3** | Przy braku ceny — uczciwy status (`running` / `review_required` / `insufficient_data` / …) — bez fałszywej ceny |
| **AC-P4** | CTA „Pokaż pełny kosztorys” działa jak w TRE-01 |
| **AC-P5** | CTA „Szczegóły / Hub” otwiera Hub / detal V4 (recovery) |
| **AC-P6** | Brak UI Foundation |

### Rollback / bezpieczeństwo

| ID | Kryterium |
|----|-----------|
| **AC-R1** | R0: LS=`0` (lub równoważne) przywraca Hub-first **bez** redeployu silników |
| **AC-R2** | Zero zmian semantyki Bid / AI-COST / cloud-sync merge / Edge |
| **AC-R3** | Hub nieusunięty |

### Architektura / zakres

| ID | Kryterium |
|----|-----------|
| **AC-A1** | Diff ⊆ allowlist DF TRE-02 (flaga/default · ewentualnie minimalny landing · changelog · testy · docs tip) |
| **AC-A2** | Brak nowych funkcji poza default Outcome (patrz §11 OUT) |
| **AC-A3** | Deep-link do nie-`przetarg` nie jest wymuszany na Outcome |

### Jakość

| ID | Kryterium |
|----|-----------|
| **AC-Q1** | Build PASS · testy flagi/R0 PASS |
| **AC-Q2** | Production Verify po release (version.json) |
| **AC-Q3** | Owner QA Outcome default + R0 (zalecane przed GO DF; wymagane przed uznaniem PV UX) |

---

## 11. IN SCOPE / OUT OF SCOPE

### IN (TRE-02)

| # | IN |
|---|-----|
| I1 | Outcome jako **domyślne** lądowanie po otwarciu detalu (`przetarg`) |
| I2 | Zachowanie R0 rollback (flaga / LS) |
| I3 | Zachowanie Hub recovery (CTA + workspace) |
| I4 | REUSE Outcome / Offer Run / Bid / Foundation spine bez przebudowy |
| I5 | Changelog + tip docs + testy default/R0 |
| I6 | (Zalecane) Owner QA przed GO DF |

### OUT (nie rozszerzać tego Review ani DF TRE-02)

| # | OUT | Powód |
|---|-----|--------|
| O1 | Explainability Outcome (P4) | NEXT-PRIORITY — później |
| O2 | Offer Run „średni” / pełny orchestrator (P3/P5) | Creep · ryzyko runtime |
| O3 | Rewrite Autonomous (P6 pełne) | Poza celem defaultu |
| O4 | Decyzja GO/HOLD na Outcome (P7) | Po cenie · osobny etap |
| O5 | Most do Robotów (P8) | Poza ekranem ceny |
| O6 | Hub soft-hide / delete (P9) | Baseline zakaz bez osobnego GO |
| O7 | Satelity Strategia/Mapa (P10) | Poza torze 1-kliku |
| O8 | FND-06 (P11) | BLOCKED Foundation |
| O9 | E-składanie (P12) | Poza SSOT |
| O10 | Zmiany Bid / AI-COST / parserów / sync / Edge | REUSE · Freeze |
| O11 | Nowe ekrany / drugi kalkulator ceny | Łamie SSOT |
| O12 | Fat persist Offer Run do pipeline KV | Sync Storm |

**Jeżeli IMPLEMENT ujawni konieczność O1–O12 → STOP + ACR / osobny DF — nie rozszerzać TRE-02.**

---

## 12. Zgodność z Product SSOT i Blueprint

| Wymóg | TRE-02 |
|-------|--------|
| Default = ekran wyniku (cena), nie Hub | **TAK — to jest cel** |
| Kosztorys na żądanie | REUSE CTA |
| Hub = recovery / ekspert | REUSE |
| Jedna prawda ceny (Bid) | Nienaruszone |
| Pipeline niewidoczny jako obowiązkowa trasa | Outcome default; Hub opcjonalny |
| Foundation niewidoczna | Nienaruszone |
| Blueprint §3: zastąpienie default Hub → Outcome | **Właśnie ten etap** |

---

## 13. Payroll Safety Gate (szkic przed DF / IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*istniejący klucz flagi / runId — bez kw-week-*)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE (bez zmian TendersProvider poza reuse)
G8 Shell:        NIE
G9 Routing:      TAK*  (*default landing Outcome — bez nowego modelu URL V4)

Wypełnić formalnie w Design Freeze przed IMPLEMENT.
```

---

## 14. Werdykt Architecture Review

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy TRE-02 jest bezpiecznie wykonalny jako thin change? | **TAK** |
| Czy wymaga nowych możliwości silników? | **NIE** |
| Czy rollback pozostaje możliwy? | **TAK** (R0/R1/R2) |
| Czy Hub pozostaje recovery? | **TAK** |
| Czy Bid pozostaje SSOT ceny? | **TAK** |
| Czy Foundation pozostaje niewidoczna? | **TAK** |
| Czy wolno IMPLEMENT teraz? | **NIE** — najpierw **Design Freeze TRE-02** + Owner GO na DF |
| Czy wolno rozszerzać zakres o OUT? | **NIE** |

```text
══════════════════════════════════════
TRE-02 ARCHITECTURE REVIEW — PASS

Kierunek: Outcome First default tip
Mechanizm: flip default flagi (preferowany) + R0
Reuse:    Outcome · Offer Run · Bid · Hub recovery · FND spine
Next:     TRE-02-DESIGN-FREEZE.md (osobny dokument)
IMPLEMENT: BLOCKED
══════════════════════════════════════
```

---

## 15. Następny krok (proces)

1. **Owner** potwierdza ten Review (lub GO WITH CHANGES → ACR).  
2. Przygotować **`TRE-02-DESIGN-FREEZE.md`** (allowlist · IN/OUT · AC · Gate · R0).  
3. Zalecane: **Owner QA** Outcome (LS) przed GO na DF.  
4. Owner **GO na DF** → dopiero IMPLEMENT.  
5. **Nie** startować P3–P12 w tym samym bundle.

---

**Koniec TRE-02-ARCHITECTURE-REVIEW.**  
Oczekiwanie: akceptacja Review → Design Freeze (bez implementacji w tej fazie).

# TRE-02 — DESIGN FREEZE (Outcome First Experience)

> **ID:** TRE-02-DESIGN-FREEZE-01  
> **EPIC:** TENDER RECOMMENDATION ENGINE (TRE-02)  
> **NAME:** **Outcome First Experience**  
> **STATUS:** **DESIGN FREEZE · Owner GO** · IMPLEMENT według allowlist  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **#CORE-013** — zero Payroll write-path / zero zmiany semantyki cloud-sync merge / zero Edge  
> **Architecture Review:** [`TRE-02-ARCHITECTURE-REVIEW.md`](TRE-02-ARCHITECTURE-REVIEW.md) · **PASS**  
> **Baseline:** [`TRE-PROGRAM-BASELINE.md`](TRE-PROGRAM-BASELINE.md) · tip feature **2.65.63** / **`74ac6a0`** (TRE-01)  
> **Priorytet:** [`TRE-NEXT-PRIORITY.md`](TRE-NEXT-PRIORITY.md) — **P1**  
> **Nadrzędne:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) · [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md)  
> **Prior CLOSED:** [`TRE-01-CLOSEOUT.md`](TRE-01-CLOSEOUT.md) · [`TRE-01-DESIGN-FREEZE.md`](TRE-01-DESIGN-FREEZE.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal:
  Outcome jako DOMYŚLNE doświadczenie tipu (Hub-first → Outcome-first)
  + R0 rollback + Hub recovery
  + REUSE: Outcome MVP · Offer Run · Bid · Foundation spine
Zakaz: explain · Decision · Offer Run V2 · Hub delete · Autonomous rewrite ·
       FND-06 · AI-COST · Bid · parsery · sync · Edge · e-składanie · Roboty
IMPLEMENT odblokowany — Owner GO (2026-07-28).
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*istniejący klucz flagi kw-tre-01-slice-a · runId TRE-01 — NIE kw-week-*)
G3 Cloud Sync:   NIE   (brak zmiany merge / DATA_KEYS / Edge batch)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE   (TendersProvider bez zmian)
G8 Shell:        NIE
G9 Routing:      TAK*  (*default landing Outcome na tab przetarg — bez nowego modelu URL V4)

Wynik Gate: Boundary Check G2/G9 przy IMPLEMENT (#CORE-014).
Owner GO na TEN DF: WYMAGANE przed kodem.
STABILIZATION WINDOW: ACTIVE.
```

\*Nie dodawać nowych kluczy LS poza istniejącym kontraktem flagi TRE-01 bez ACR.

---

## 1. Cel TRE-02

Uczynić **Outcome MVP** (z TRE-01) **domyślnym** doświadczeniem po otwarciu przetargu na tipie — zgodnie z Product SSOT:

```text
Lista → 1 klik → Outcome (rekomendowana cena LUB uczciwy status)
                 → [Pokaż pełny kosztorys] · [Szczegóły / Hub]
```

**Nie** budujemy nowych możliwości. **Nie** przepisujemy silników.  
Zmieniamy **default konfiguracji UX** + weryfikujemy R0 / Hub recovery / regresje.

---

## 2. Finalny zakres implementacji (zamrożony)

### 2.1 IN SCOPE

| # | IN |
|---|-----|
| I1 | Outcome jako **domyślne** lądowanie po otwarciu detalu (tab `przetarg`, bez force workspace) |
| I2 | Flaga konfiguracyjna: **default ON** w tipie (`TRE_01_SLICE_A_DEFAULT = true`) — opcja A z Architecture Review |
| I3 | Zachowanie override LS `kw-tre-01-slice-a`: `1`=ON · `0`=OFF (R0 Hub-first) |
| I4 | Zachowanie Hub jako **recovery** (CTA „Szczegóły / Hub” · `tre01ForceWorkspace` / równoważne) |
| I5 | REUSE bez przebudowy: Outcome UI · Offer Run · Recommendation Result · Bid · Foundation spine · pipeline runtime |
| I6 | Aktualizacja testów: default ON + R0 OFF (LS=`0`) |
| I7 | Changelog UI + `CHANGELOG.md` + tip docs (`09` · `CURRENT-TASK`) przy release |
| I8 | Boundary Check #CORE-014 · jawny `git add` (zakaz `git add -A`) |
| I9 | Production Verify po push (VERIFY FAST) |

### 2.2 Mechanizm flagi (zamrożony)

| Element | Wartość zamrożona |
|---------|-------------------|
| Stała default | `TRE_01_SLICE_A_DEFAULT = **true**` |
| Klucz LS | `kw-tre-01-slice-a` (bez zmiany nazwy — R0 kompatybilny z TRE-01) |
| Semantyka LS | `1` → Outcome ON · `0` → Hub-first OFF · brak klucza → default tip |
| Helper | `isTre01SliceAEnabled()` — bez zmiany kontraktu (tylko default) |
| Alternatywa B (nowa nazwa flagi) | **OUT** tego DF — unikamy dual-flag bez potrzeby |

### 2.3 Allowlist plików (kontrakt — jawny `git add`)

> Implementacja **może** tylko pliki z tej listy (lub ACR + Owner GO).

| Plik | Rola |
|------|------|
| `src/lib/tenders-v4-config.ts` | `TRE_01_SLICE_A_DEFAULT = true` · komentarz DF TRE-02 |
| `scripts/test-tre-01-offer-run.mjs` **lub** `scripts/test-tre-02-outcome-default.mjs` | Asercje: default ON · R0 OFF przez LS=`0` (jedno miejsce testów flagi) |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wersja UI TRE-02 |
| `docs/architecture/TRE-02-DESIGN-FREEZE.md` | Ten DF |
| `docs/AI/09_PRODUCTION_BASELINE.md` · `CURRENT-TASK.md` | Tip / status po release |

**Opcjonalnie (tylko jeśli konieczne — ACR w RR):**

| Plik | Warunek |
|------|---------|
| `src/app/TenderDetailPage.tsx` | **Tylko** jeśli wykryta regresja landing przy default ON wymagająca 1-linijkowej korekty ścieżki już istniejącej — **bez** nowych UI / bez Autonomous rewrite |
| `docs/architecture/TRE-02-ARCHITECTURE-REVIEW.md` | Status link po CLOSE (docs) |

**Zakaz allowlist creep:** Outcome View · Offer Run libs · Bid · AI-COST · cloud-sync · Autonomous · Hub soft-hide.

### 2.4 OUT OF SCOPE (twarde)

| # | OUT |
|---|-----|
| O1 | Explain Outcome |
| O2 | Decision Engine / GO-HOLD na Outcome |
| O3 | Offer Run V2 / średni orchestrator / zastąpienie `useTenderPipelineRuntime` |
| O4 | Hub delete / soft-hide |
| O5 | Most do Robotów |
| O6 | Autonomous rewrite / rozbudowa teatru |
| O7 | FND-06 |
| O8 | Zmiany AI-COST / Bid Proposal / parserów / discovery / dossier / trust engine |
| O9 | Cloud Sync merge / `DATA_KEYS` / Edge |
| O10 | E-składanie |
| O11 | Nowy ekran Outcome / drugi kalkulator ceny |
| O12 | Fat persist Offer Run do `kw-tenders-pipeline` |
| O13 | Nowa nazwa flagi równoległa bez ACR |
| O14 | Payroll / Domain Push / PWRB |

**Naruszenie OUT = STOP IMPLEMENT · ACR + Owner GO.**  
Potrzeba rozszerzenia zakresu → **OUT OF SCOPE** — **nie** dodawać do TRE-02.

---

## 3. Punkty integracji

| Punkt | Zachowanie TRE-02 |
|-------|-------------------|
| **Lista → detal** | Bez zmiany wyszukiwania; po wejściu na `przetarg` default = Outcome (flaga default ON) |
| **`TenderDetailPage`** | REUSE ścieżki `showTre01Outcome` · `useTenderOfferRun` · Outcome View — **bez** nowej orkiestracji |
| **`isTre01SliceAEnabled()`** | Jedyny gate Outcome vs Hub-first |
| **Tab `przetarg`** | Outcome default |
| **Inne taby V4** (`kosztorys`, `decyzja`, …) | Workspace jak dziś — **nie** wymuszać Outcome |
| **CTA kosztorys** | REUSE → `kosztorys` + force workspace |
| **CTA Hub** | REUSE → Hub / detal V4 recovery |
| **Autonomous Gate** | REUSE ominięcia gdy Outcome aktywny — **nie** rewrite |
| **Bid / Recommendation Result** | Nienaruszone — jedyna cena |
| **Foundation spine** | Nienaruszone — niewidoczne |
| **Strategia / Mapa / Ustawienia** | Nietknięte |

---

## 4. Rollback plan

| Poziom | Akcja | Skutek |
|--------|-------|--------|
| **R0 — flaga OFF (LS)** | `localStorage.setItem('kw-tre-01-slice-a','0')` lub równoważne | Natychmiastowy Hub-first **bez** redeployu silników |
| **R0b — clear override** | `removeItem('kw-tre-01-slice-a')` | Wraca do **default tipu** (po TRE-02 = Outcome ON) — **nie** mylić z R0 OFF |
| **R1 — hotfix tip** | `TRE_01_SLICE_A_DEFAULT = false` + push | Tip z powrotem Hub-first |
| **R2 — revert commit TRE-02** | Revert allowlist | Usunięcie default ON z tipu |
| **Nigdy w rollbacku** | Zmiana Bid / AI-COST / sync / Edge | Silniki nietknięte = rollback prosty |

**Warunek release:** R0 (LS=`0`) zweryfikowany w testach + Owner QA.  
**Dokumentacja Zmian:** krótka wzmianka o Outcome default + recovery Hub + rollback LS=`0`.

---

## 5. Kryteria akceptacji (AC)

### Produkt (Product SSOT)

| ID | Kryterium |
|----|-----------|
| AC-P1 | Tip (bez LS): otwarcie przetargu na `przetarg` → **Outcome** (nie Hub-first) |
| AC-P2 | Bid z rekomendacją → Outcome pokazuje **tę** kwotę PLN |
| AC-P3 | Brak ceny → uczciwy status — bez fałszywej ceny |
| AC-P4 | CTA „Pokaż pełny kosztorys” → istniejący kosztorys |
| AC-P5 | CTA „Szczegóły / Hub” → Hub / detal V4 |
| AC-P6 | Brak UI Foundation |

### Rollback / bezpieczeństwo

| ID | Kryterium |
|----|-----------|
| AC-R1 | LS=`0` → Hub-first bez redeployu silników |
| AC-R2 | Zero zmian Bid / AI-COST / cloud-sync merge / Edge |
| AC-R3 | Hub nieusunięty |

### Architektura

| ID | Kryterium |
|----|-----------|
| AC-A1 | Diff ⊆ allowlist DF (§2.3) lub ACR |
| AC-A2 | Brak funkcji z OUT (§2.4) |
| AC-A3 | Deep-link nie-`przetarg` nie wymusza Outcome |
| AC-A4 | REUSE Outcome/Offer Run — brak nowego ekranu wyniku |

### Jakość

| ID | Kryterium |
|----|-----------|
| AC-Q1 | `npm run build` PASS |
| AC-Q2 | Testy default ON + R0 PASS |
| AC-Q3 | Boundary #CORE-013/#014 PASS |
| AC-Q4 | Changelog + tip docs przy release |
| AC-Q5 | Production Verify (`version.json`) PASS lub DEPLOY PROPAGATING wg workflow |

---

## 6. Definition of Done

TRE-02 = **COMPLETE** tylko gdy **wszystkie**:

```text
□ Owner GO na TEN Design Freeze
□ IMPLEMENT ⊆ allowlist
□ AC-P1…P6 PASS
□ AC-R1…R3 PASS
□ AC-A1…A4 PASS
□ AC-Q1…Q4 PASS
□ R0 (LS=0) zweryfikowany
□ Brak OUT (O1–O14) w diff
□ Owner QA Outcome default + R0 (wymagane przed uznaniem PV UX)
□ Release: commit (jawny add) · push · VERIFY FAST
□ Docs tip (09 · CURRENT-TASK) + Release/Closeout wg procesu
□ TRE-03 / P3–P12 NIE rozpoczęte w tym bundle
```

**TRE-02 ≠ cały program TRE.** Kolejne obszary = nowy DF + Owner GO.

---

## 7. Potencjalne regresje UX

| ID | Regresja | Sev | Kontrola DF |
|----|----------|-----|-------------|
| UX1 | Użytkownicy „gubią” Hub | M | CTA recovery · copy w Zmianach · R0 |
| UX2 | Pierwszy ekran = `running` / loading dłużej widoczny | M | Już w Outcome MVP — uczciwy status SSOT; **nie** dodawać teatru |
| UX3 | Autonomous niespodziewanie wraca | M | Outcome aktywny omija Gate (TRE-01); nie rewrite Autonomous |
| UX4 | Deep-link `kosztorys` przypadkiem pokazuje Outcome | H (jeśli wystąpi) | AC-A3 · logika `activeTab === "przetarg"` |
| UX5 | LS=`1` z QA „przyklejony” myli ocenę tipu | L | Clear LS przed PV Owner; dokumentacja R0b |
| UX6 | Force workspace nie resetuje się przy zmianie tenderId | M | REUSE `useEffect` reset z TRE-01 — nie psuć |
| UX7 | Podwójne CTA / nowy chrome „przy okazji” | M | Zakaz nowych powierzchni UI |
| UX8 | Regresja ceny (inna kwota niż Bid) | H | OUT zmian Bid/Recommendation — tylko default flagi |

**Zasada:** regresja wymagająca O1–O14 → **STOP** + ACR, nie „szybki fix” w TRE-02.

---

## 8. Plan Production Verify

### 8.1 VERIFY FAST (obowiązkowy po push)

```text
1. Jedno: curl -s https://www.wgdom.fun/version.json
2. PASS = oczekiwana wersja changelog TRE-02
3. STALE = DEPLOY PROPAGATING (RELEASE GO nadal OK — bez retry/polling)
4. Koniec raportu VERIFY
```

### 8.2 PV UX (wymagane przed CLOSE / PV UX)

| # | Krok | Oczekiwane |
|---|------|------------|
| V1 | Czysty profil / LS bez `kw-tre-01-slice-a` | Outcome default po otwarciu przetargu |
| V2 | Przetarg z Bid | Cena = Bid · CTA kosztorys · CTA Hub |
| V3 | CTA Hub | Detal V4 / Hub recovery |
| V4 | `localStorage.setItem('kw-tre-01-slice-a','0')` + odśwież | Hub-first (R0) |
| V5 | `removeItem` + odśwież | Z powrotem Outcome default (R0b) |
| V6 | Deep-link / tab `kosztorys` (jeśli dostępny) | Workspace kosztorys — nie Outcome fullscreen |

### 8.3 PV negatywny (silniki)

| # | Sprawdzenie |
|---|-------------|
| N1 | Brak zmian w `tenders-bid-calculator` / AI-COST / `cloud-sync` w diff release |
| N2 | Brak UI Foundation / FND-06 |

---

## 9. Ryzyka DF (kontrola)

| ID | Ryzyko | Kontrola |
|----|--------|----------|
| BR3 | Scope creep | Allowlist · OUT O1–O14 |
| BR5 | Sync Storm | Zero persist zmian |
| BR8 | Payroll / Core | Gate §0 |
| BR9 | Foundation UI / FND-06 | OUT |
| BR1 / T2-R1 | Shock Hub→Outcome | R0 · recovery · Zmiany |
| BR7 | QA | Owner QA w DoD |

---

## 10. Zgodność dokumentów nadrzędnych

| Dokument | TRE-02 DF |
|----------|-----------|
| Product SSOT | Default Outcome — PASS cel |
| Blueprint §3 | Zastąpienie default Hub → Outcome — PASS |
| Architecture Review TRE-02 | Ten DF zamraża Review PASS |
| Baseline §6 W6 | Ten dokument = W6 |
| TRE-01 Closeout | REUSE · R0 · Hub recovery zachowane |
| AI-COST Freeze | Zero zmian silników |

---

## 11. Decyzja Ownera

| Werdykt | Skutek |
|---------|--------|
| **GO** | Odblokowanie IMPLEMENT TRE-02 według tego DF |
| **GO WITH CHANGES** | ACR do DF → ponowny Freeze → GO |
| **NO GO** | Brak kodu; tip pozostaje Hub-first (default OFF) |

```text
Owner decision: GO
Data: 2026-07-28
Podpis/ACK: Owner GO (TRE-02-IMPLEMENTATION)
```

> Brief fazy DESIGN FREEZE (Owner GO na przygotowanie DF) **≠** GO na IMPLEMENT.  
> IMPLEMENT dopiero po wypełnieniu powyższej decyzji na **TEN** dokument.

---

## 12. Status dokumentu

| Pole | Wartość |
|------|---------|
| **Kontrakt implementacyjny TRE-02** | **TEN PLIK** |
| **IMPLEMENT** | **Owner GO** — według allowlist |
| **Commit / push** | na polecenie Ownera (ten brief: commit + push + PV + CLOSE) |

---

**Koniec TRE-02-DESIGN-FREEZE.**  
Oczekiwanie na decyzję Ownera: **GO / GO WITH CHANGES / NO GO** → potem IMPLEMENT według allowlist.

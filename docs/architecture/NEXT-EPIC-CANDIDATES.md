# NEXT EPIC CANDIDATES — po COST-BID-GAP-01 / GAP-A

> **ID:** NEXT-EPIC-CANDIDATES  
> **MODE:** DOCS ONLY · analiza kandydatów · **bez implementacji / commit / push**  
> **Data:** 2026-07-29  
> **Kontekst:** **COST-BID-GAP-01 / GAP-A CLOSED** · **PV** ([`COST-BID-GAP-01-CLOSEOUT.md`](COST-BID-GAP-01-CLOSEOUT.md)) · wcześniej **COST-MULTI CLOSED**  
> **Tip UI:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.65.77** · feature **`e88d689f`** · deploy **`77a2f0f`**  
> **Handoff:** [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](SESSION-HANDOFF-POST-COST-BID-GAP-01.md)  
> **Stabilization Window:** **ACTIVE** — każdy kandydat wymaga **Owner GO** (+ AUDIT → DF przed IMPLEMENT)

```text
════════════════════════════════════════════════════════
C0 AI-COST-PARSER-01 P0-RETRY = CLOSED (e88d689f · PV)
C1 COST-BID-GAP-01 / GAP-A = CLOSED (2.65.77)
Rekomendacja NEXT = C2 AI-COST-02-B
NIE start IMPLEMENT. NIE wybór za Ownera.
════════════════════════════════════════════════════════
```

---

## 0. Źródła przeglądu backlogu

| Źródło | Sygnał |
|--------|--------|
| [`COST-MULTI-CLOSEOUT.md`](COST-MULTI-CLOSEOUT.md) §7 | Bid Aggregate ≪ Owner ~1,6M · persist race MONITOR |
| [`WGDOM-AI-COST-02-STARTING-POINT.md`](WGDOM-AI-COST-02-STARTING-POINT.md) | AI-COST-02 dalsze slice (konkurencyjność / UX / CK) |
| [`MASTER_HANDOFF.md`](../AI/MASTER_HANDOFF.md) §5 | AI-COST-02 · BODY-S5/S6 · GDS-02 · HARDENING · FND-06 BLOCKED |
| [`ROADMAP.md`](../../ROADMAP.md) | Work Catalog P3.3 · NG-05 BLOCKED · TP200B · TI-B* |
| [`COSTORYS-UX-01-WAVE-2-BACKLOG.md`](COSTORYS-UX-01-WAVE-2-BACKLOG.md) | UX kosztorysanta (częściowo shipped W2 — reszta thin) |
| [`CURRENT-TASK.md`](../../CURRENT-TASK.md) | HARDENING B1/C/E · payroll NONE |

**Świadomie niżej w tej rundzie (niższy wpływ biznesowy „oferta teraz”):** BODY-S5/S6, GDS-02, CI-C-2, FND-06 (BLOCKED), Payroll nowe prace (NONE), NG-05 (BLOCKED legal).

---

## 1. Kandydaci (Top 5)

### C0 — AI-COST-PARSER-01 P0-RETRY · F2 soft-invalidate — **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · tip UI **2.65.77** · feature **`e88d689f`** |
| **Zakres shipped** | Soft-invalidate F2 Ponów przy terminalnym ZIP unpack fail → Force Heavy path |
| **Residual** | Brak — unpack na świeżym Heavy OK; osobny DF unpack **nie** potrzebny |
| **SSOT** | [`AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md`](AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) · [`AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md`](AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md) |

**Nie wznawiać** bez nowego RCA. **Usunięty z aktywnych kandydatów NEXT.**

---

### C1 — COST-BID-GAP-01 · Domknięcie luki Aggregate → wycena Ownera — **CLOSED (GAP-A)**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · tip **2.65.77** / **`a061bbd`** |
| **Zakres shipped** | GAP-A: catalog rates · UNKNOWN classifier · marketQuotes REUSE · flaga default OFF |
| **Residual** | Bid ON ~1,21M vs Owner ~1,6M — **GAP-B/C** tylko po nowym DF · nie hardcode |
| **SSOT** | [`COST-BID-GAP-01-CLOSEOUT.md`](COST-BID-GAP-01-CLOSEOUT.md) · [`COST-BID-GAP-01-PRODUCTION-VERIFY.md`](COST-BID-GAP-01-PRODUCTION-VERIFY.md) |

**Nie wznawiać GAP-A** bez nowego Owner briefu.

---

### C2 — AI-COST-02-B · Konkurencyjność / jakość wyceny (thin slice) — **NEXT**

| Pole | Wartość |
|------|---------|
| **Priorytet** | **P1** |
| **Zakres** | **M** |
| **Problem** | COST-02-A (controlled market) CLOSED; brak kolejnego slice: pozycjonowanie vs rynek, inteligentna kolejka weryfikacji krytycznych pozycji, explainability „dlaczego daleko od 1,6M”. |
| **Wpływ na użytkowników** | Kosztorysant szybciej widzi dziury w ofercie; mniej ręcznego „przeklikiwania” OfferBoq. |
| **Zależności** | AI-COST-01 Freeze · COST-02-A · ideally C1 lub równoległy AUDIT gap |
| **Ryzyko** | Średnie — musi iść **obok** freeze (provider / S7 rekomendacje), nie przez przebudowę Bid. |
| **SSOT start** | [`WGDOM-AI-COST-02-STARTING-POINT.md`](WGDOM-AI-COST-02-STARTING-POINT.md) |

**Uzasadnienie P1:** naturalny tor wyceny po MULTI; mniejszy niż pełne C1, ale mocny UX+jakość.

---

### C3 — WORK-CATALOG-P3.3 · Market Pricing UX

| Pole | Wartość |
|------|---------|
| **Priorytet** | **P1** |
| **Zakres** | **M–L** |
| **Problem** | Silnik market average / import (P3.1–P3.2) istnieje; brak domkniętego UX Biblioteki Robót do stosowania i zaufania cen rynkowych w ofercie. |
| **Wpływ na użytkowników** | Lepsze ceny wejściowe do AI Cost / Bid → mniejsza luka vs Owner; trwała baza wiedzy firmy. |
| **Zależności** | Design freeze D-A…D-D **pending** · Work Catalog P3.1/P3.2 CLOSED · COST-02-A czyta `marketQuotes` |
| **Ryzyko** | Średnie–wysokie (UI + persist katalogu); nie mieszać z Payroll. NG-05 MPI nadal **BLOCKED** (legal) — nie zastępować. |
| **SSOT** | [`docs/work-catalog/`](../work-catalog/) · ROADMAP Planned |

**Uzasadnienie P1:** zasila C1/C2 danymi; wpływ długoterminowy na wszystkie przetargi.

---

### C4 — TP200B · Kosztorys fidelity (`rows` cap / kompletność pozycji)

| Pole | Wartość |
|------|---------|
| **Priorytet** | **P1** (jakość) / **P2** jeśli Owner woli najpierw pieniądz C1 |
| **Zakres** | **M** |
| **Problem** | Historyczny handoff TP200B: fidelity kosztorysu (cap `rows`, kompletność pozycji) — Aggregate sumuje to, co Heavy wyciągnął; braki pozycji = zaniżony Bid nawet przy AGGREGATE. |
| **Wpływ na użytkowników** | Mniej „dziur” w przedmiarze; wiarygodniejsza suma branż i OfferBoq. |
| **Zależności** | Parser/heavy ścieżka (ostrożnie OOS vs COST-MULTI zakaz parsers — wymaga **wąskiego** DF fidelity, nie rewrite turnieju) · Trust layer |
| **Ryzyko** | Wysokie jeśli rozleje się na wszystkie parsery; musi być allowlist + fixture. |
| **SSOT historyczny** | [`SESSION-HANDOFF-TP200-PLANNED.md`](../SESSION-HANDOFF-TP200-PLANNED.md) · ROADMAP |

**Uzasadnienie:** jakość wejścia do Aggregate; komplementarne do C1 (cena) vs C4 (ilość/pozycje).

---

### C5 — HEAVY-PERSIST-01 · Cloud settle / Force Rescan unload race

| Pole | Wartość |
|------|---------|
| **Priorytet** | **P2** (ops) · **P1** jeśli Owner widzi powtarzalne „LS OK / KV puste” w polu |
| **Zakres** | **S–M** |
| **Problem** | FINAL PV pokazał: wczesne zamknięcie karty może zostawić AGGREGATE w LS bez KV; produkcja „przeszła” po settle, ale race jest realny. |
| **Wpływ na użytkowników** | Inne urządzenie / odświeżenie bez Force = z powrotem ONE / brak artifacts — utrata zaufania do MULTI-02. |
| **Zależności** | Force Rescan CLOSED · tender item persist coalesce · **bez** edycji `cloud-sync.ts` Payroll path jeśli da się w pipeline persist |
| **Ryzyko** | Sync Storm / coalesce — wymaga AUDIT + CORE-013; nie „hotfix na czuja”. |
| **Dowód** | [`../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md`](../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md) · COST-MULTI §7 MONITOR |

**Uzasadnienie:** chroni wartość COST-MULTI cross-device; niższy wpływ „oferty złotówkowej” niż C1–C3.

---

## 2. Kandydaci odrzuceni / odłożeni w tej rundzie

| Kandydat | Powód odłożenia |
|----------|-----------------|
| **NG-05 MPI-0** | **BLOCKED** (legal AD-01) — wysoki wpływ, ale nie startowalny |
| **FND-06 Observability** | **BLOCKED** (brak Impl Spec) |
| **HARDENING B1/C/E** | Ważne ops, ale nie kontynuacja toru wyceny; Owner GO osobno |
| **BODY-S5/S6 · GDS-02** | Thin UI / chrome — niższy wpływ biznesowy oferty |
| **Payroll nowe** | **NONE** bez nowego GO + Safety Gate |
| **Re-open COST-MULTI / P0-RETRY** | **ZAKAZ** bez nowego AUDIT/RCA |

---

## 3. Rekomendowana kolejność

| Kolejność | Kandydat | Dlaczego teraz |
|-----------|----------|----------------|
| **✓** | **C0 AI-COST-PARSER-01 P0-RETRY** | **CLOSED** `e88d689f` |
| **✓** | **C1 COST-BID-GAP-01 / GAP-A** | **CLOSED** 2.65.77 |
| **1** | **C2 AI-COST-02-B** | **Rekomendowany NEXT** — jakość/explain obok freeze |
| **2** | **C3 Work Catalog P3.3** *lub* residual **GAP-B** | Dane vs stack — wybór Ownera |
| **3** | **C4 TP200B** | Jakość pozycji → lepszy Aggregate |
| **4** | **C5 HEAVY-PERSIST-01** | Hardening operacyjny |

```text
Rekomendacja domyślna (biznes):
  C2 → (C3 ‖ GAP-B) → C4 → C5

Alternatywa (dane najpierw):
  C3 → C2 → C4 → C5

Alternatywa (stabilność najpierw):
  C5 (S) → C2 → …
```

---

## 4. Macierz skrót

| ID | Nazwa | Prio | Size | Blast | Startowalność |
|----|-------|------|------|-------|---------------|
| C0 | AI-COST-PARSER-01 P0-RETRY | — | — | — | **CLOSED · PV** |
| C1 | COST-BID-GAP-01 / GAP-A | — | — | — | **CLOSED · PV** |
| C2 | AI-COST-02-B | **P1** | M | Średni | **NEXT** · GO + DF · Freeze AI-COST-01 |
| C3 | Work Catalog P3.3 | **P1** | M–L | Średni–wysoki | DF D-A…D-D + GO |
| C4 | TP200B fidelity | **P1/P2** | M | Wysoki (parsery) | Wąski DF + GO |
| C5 | HEAVY-PERSIST-01 | **P2** | S–M | Sync/coalesce | AUDIT + GO |

---

## 5. Następny krok (Owner)

1. Wybrać **jeden** kandydat (lub kolejność).  
2. Wydać **Owner GO** na AUDIT (nie od razu IMPLEMENT).  
3. Dopiero potem DESIGN FREEZE → Arch Review → IMPLEMENT.

**Zakaz:** automatyczny start EPIC · re-open COST-MULTI · Payroll / Discovery rewrite „przy okazji”.

---

**DOCS ONLY COMPLETE** · rekomendacja **AI-COST-02-B** · czekam na wybór Ownera.

**Handoff (nowe sesje AI):** [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](SESSION-HANDOFF-POST-COST-BID-GAP-01.md) · Master [`../AI/MASTER_HANDOFF.md`](../AI/MASTER_HANDOFF.md).

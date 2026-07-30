# NEXT EPIC CANDIDATES — po COST-BID-GAP-01 / GAP-A

> **ID:** NEXT-EPIC-CANDIDATES  
> **MODE:** DOCS ONLY · analiza kandydatów · **bez implementacji / commit / push**  
> **Data:** 2026-07-30  
> **Kontekst:** **MARKET-SYNC-01 P0 CLOSED** · **COST-BID-GAP-01 / GAP-A CLOSED** · **PV** ([`COST-BID-GAP-01-CLOSEOUT.md`](COST-BID-GAP-01-CLOSEOUT.md)) · wcześniej **COST-MULTI CLOSED**  
> **Tip UI:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.65.84** · MARKET-SYNC-01 **P0 CLOSED** · CENY-MATERIAŁÓW-04 **P2 COMPLETE**  
> **Handoff:** [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](SESSION-HANDOFF-POST-COST-BID-GAP-01.md)  
> **MS P0 SSOT:** [`MARKET-SYNC-01-P0-CLOSEOUT.md`](MARKET-SYNC-01-P0-CLOSEOUT.md)  
> **P2 SSOT:** [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md)  
> **P1 SSOT:** [`CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md)  
> **Stabilization Window:** **ACTIVE** — każdy kandydat wymaga **Owner GO** (+ AUDIT → DF przed IMPLEMENT)

```text
════════════════════════════════════════════════════════
C0 AI-COST-PARSER-01 P0-RETRY = CLOSED (e88d689f · PV)
C1 COST-BID-GAP-01 / GAP-A = CLOSED (2.65.77)
C2 AI-COST-02-B = CLOSED (9dc113e7 · 2.65.78 · PV)
C3 WORK-CATALOG-P3.3 = CLOSED (e10a1511 · 2.65.79 · PV)
C3b CENY-MATERIAŁÓW-01 = CLOSED (d4d05706 · 2.65.80 · PV)
C3c–e CENY-MATERIAŁÓW-04 P1-A/B/C = CLOSED (2.65.81–83)
C3f CENY-MATERIAŁÓW-04 P1 = COMPLETE
C3g CENY-MATERIAŁÓW-04 P2 = COMPLETE (K-P2-1/2/3 PASS)
C3h MARKET-SYNC-01 P0 = CLOSED (2.65.84 · 273fb3e0)
Rekomendacja NEXT (aktywny epic):
  · MARKET-SYNC-01 P1 DF — Owner GO (Accept+Publish via commit)
  · CENY-MATERIAŁÓW-04 P3 (INNE) AUDIT — Owner GO
  · alternatywy: GAP-B / I3 / TP200B
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

### C2 — AI-COST-02-B · Explain + Queue — **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · tip UI **2.65.78** · feature **`9dc113e7`** |
| **Zakres shipped** | Explain RO · impact Queue · flaga `kw-ai-cost-02-b-explain-queue` default OFF |
| **Residual** | I3 Competitiveness RO = osobny thin slice / Phase 2 |
| **SSOT** | [`AI-COST-02-B-CLOSEOUT.md`](AI-COST-02-B-CLOSEOUT.md) · [`AI-COST-02-B-PRODUCTION-VERIFY.md`](AI-COST-02-B-PRODUCTION-VERIFY.md) |

**Nie wznawiać Phase 1** bez nowego Owner briefu.

---

### C3 — WORK-CATALOG-P3.3 · Market Pricing UX — **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · tip UI **2.65.79** · feature **`e10a1511`** |
| **Zakres shipped** | S4 CSV commit/rollback · S5 coverage Engine · S6 mobile · flaga `kw-wc-p33-market-pricing-ux` default OFF |
| **Residual** | D-C rynek→companyPrice = osobny DF · MPI nadal BLOCKED |
| **SSOT** | [`WORK-CATALOG-P3.3-CLOSEOUT.md`](WORK-CATALOG-P3.3-CLOSEOUT.md) · [`WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md`](WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md) |

**Nie wznawiać Phase 1** bez nowego Owner briefu.

---

### C3b — CENY-MATERIAŁÓW-01 · mapping uplift / KPI / quotes gaps — **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · tip UI **2.65.80** · feature **`d4d05706`** |
| **Zakres shipped** | CM-0 KPI · CM-1 mapping · CM-2 quotes gaps · CM-3 memo · flaga `kw-ceny-materialow-01` default OFF |
| **Residual** | KPI controlled_market zależy od Quotes (P3.3 ops) · GAP-B/1,6M = OUT |
| **SSOT** | [`CENY-MATERIAŁÓW-01-CLOSEOUT.md`](CENY-MATERIAŁÓW-01-CLOSEOUT.md) · [`CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md`](CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md) |

**Nie wznawiać Phase 1** bez nowego Owner briefu.

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
| **✓** | **C2 AI-COST-02-B** | **CLOSED** 2.65.78 / `9dc113e7` |
| **✓** | **C3 WORK-CATALOG-P3.3** | **CLOSED** 2.65.79 / `e10a1511` |
| **1** | residual **GAP-B** *lub* **I3 Competitiveness** | stack vs explain market — wybór Ownera |
| **2** | **C4 TP200B** | Jakość pozycji → lepszy Aggregate |
| **3** | **C5 HEAVY-PERSIST-01** | Hardening operacyjny |

```text
Rekomendacja domyślna (biznes):
  (GAP-B ‖ I3) → C4 → C5

Alternatywa (jakość pozycji):
  C4 → GAP-B → C5

Alternatywa (stabilność najpierw):
  C5 (S) → …
```

---

## 4. Macierz skrót

| ID | Nazwa | Prio | Size | Blast | Startowalność |
|----|-------|------|------|-------|---------------|
| C0 | AI-COST-PARSER-01 P0-RETRY | — | — | — | **CLOSED · PV** |
| C1 | COST-BID-GAP-01 / GAP-A | — | — | — | **CLOSED · PV** |
| C2 | AI-COST-02-B | — | — | — | **CLOSED · PV** · 2.65.78 |
| C3 | WORK-CATALOG-P3.3 | — | — | — | **CLOSED · PV** · 2.65.79 |
| C4 | TP200B fidelity | **P1/P2** | M | Wysoki (parsery) | Wąski DF + GO |
| C5 | HEAVY-PERSIST-01 | **P2** | S–M | Sync/coalesce | AUDIT + GO |

---

## 5. Następny krok (Owner)

1. Wybrać **jeden** kandydat (lub kolejność).  
2. Wydać **Owner GO** na AUDIT (nie od razu IMPLEMENT).  
3. Dopiero potem DESIGN FREEZE → Arch Review → IMPLEMENT.

**Zakaz:** automatyczny start EPIC · re-open COST-MULTI · Payroll / Discovery rewrite „przy okazji”.

---

**DOCS ONLY COMPLETE** · C3 P3.3 **CLOSED** · rekomendacja **GAP-B / I3 / TP200B** · czekam na wybór Ownera.

**Handoff (nowe sesje AI):** [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](SESSION-HANDOFF-POST-COST-BID-GAP-01.md) · Master [`../AI/MASTER_HANDOFF.md`](../AI/MASTER_HANDOFF.md).

# NG-08 — Tender Workspace · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0 — PENDING ARCH REVIEW + OWNER GO**  
> **Data freeze:** 2026-07-08  
> **Bundle ID:** **NG-08**  
> **Class:** **FEATURE UI** (#CORE-013 · #CORE-014)  
> **Baseline prod:** UI **2.63.72** · commit **`08a6649`**  
> **Audyt:** [`NG-08-TEUX-UX-AUDIT.md`](./NG-08-TEUX-UX-AUDIT.md) — **AUDIT COMPLETE**  
> **PLAN:** [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md) — **APPROVED**  
> **UX LOCK:** **APPROVED**  
> **Parent DS:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) · **TOKEN FREEZE ACTIVE**  
> **IMPLEMENT:** **BLOCKED** do jawnego **FEATURE Owner GO**

```text
NORTH STAR (P0):
Jeden ciągły Tender Workspace — nie pięć niezależnych modułów.

WORKFLOW: AUDIT ✅ → UX LOCK ✅ → PLAN ✅ → DESIGN FREEZE ✅ (ten plik)
          → ARCH REVIEW ⏸ → OWNER GO ⛔ → IMPLEMENT ⛔
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | UX/UI detalu `/przetargi/:tenderId/*` — **Tender Workspace** V4 |
| **Poza zakresem** | Payroll · Cloud Sync · PWRB · pipeline runtime · parser · Edge · scoring algorithms · nowe KV |
| **Nowe pole KV** | **Brak** |
| **Nowe tokeny** | **Brak** (import-only `tender-ux-tokens.ts`) |
| **Slice’y IMPLEMENT** | **NG-08-01 → 02 → 03 → 04 → 05** (kolejność obowiązkowa) |
| **Principles** | **#NG08-001–#NG08-012** (§1) |
| **UX KPI** | **KPI-UX-01** · **KPI-UX-02** (§2) |

### Final Decision

**PENDING ARCH REVIEW + OWNER GO** — specyfikacja kompletna. **IMPLEMENT pozostaje BLOCKED**.

---

## 1. Principles (#NG08)

| ID | Zasada |
|----|--------|
| **#NG08-001** | **UI-only** — zero zmian merge, scoringu, pipeline bootstrap, `cloud-sync.ts`, Edge. |
| **#NG08-002** | **One continuous workspace** — wspólny frame, kontekst workflow i intelligence na wszystkich tabach; użytkownik nie powinien odczuwać „pięciu aplikacji”. |
| **#NG08-003** | **Tab SSOT frozen** — `parseTenderDetailPath`, `pendingTab`, `?ws=` Decyzja — semantyka bez regresji. |
| **#NG08-004** | **Intelligence surfacing only** — jeden `buildTenderIntelligenceContext()` w `TenderDetailPanel`; UI reorganizuje layout, nie algorytmy. |
| **#NG08-005** | **Strong next-action** — każdy tab ma kontekstowy primary CTA w Command Layer (lub jawny empty). |
| **#NG08-006** | **Persistent workflow context** — Process Strip + postęp V2 jako jedna hierarchia; „you are here” zsynchronizowane z tabem. |
| **#NG08-007** | **Unified intelligence surface** — kanoniczny hub insights w detalu; **KPI-UX-01 ≤1** z Dokumentów. |
| **#NG08-008** | **Cost workspace cohesion** — Kosztorys + Ceny połączone mostem UX; lazy mount **zachowany**; **KPI-UX-02 ≤1** do pierwszego tabu kosztowego. |
| **#NG08-009** | **Workspace memory UI-only** — scroll / expanded groups w session LS per `tenderId`; **bez** sync KV. |
| **#NG08-010** | **TOKEN FREEZE** — reuse `TEUX_*`, `TenderUxSectionTitle`, `TenderUxBadge`; zero nowych exportów tokenów. |
| **#NG08-011** | **Protected Core** — #CORE-013 / #CORE-014; allowlist per slice w PLAN §2. |
| **#NG08-012** | **One slice = one commit** — pięć releasów lub pięć commitów sekwencyjnych; zero mixed bundle. |

---

## 2. UX KPI — Acceptance Criteria (frozen)

| ID | KPI | Target | Metoda weryfikacji | Slice owner |
|----|-----|--------|-------------------|-------------|
| **KPI-UX-01** | Documents → Workspace Intelligence | **≤1** interakcja | Owner smoke: tab `dokumenty` → intelligence surface (strip / panel / shortcut) | **NG-08-03** |
| **KPI-UX-02** | Workspace Intelligence → Cost Estimation (pierwszy tab) | **≤1** interakcja | Owner smoke: intelligence → `kosztorys` **lub** `ceny` jednym klikiem | **NG-08-03** + **NG-08-05** |

**Definicje (frozen):**

- **Interakcja** = klik tab · sub-tab · Process Strip stage · primary CTA · accordion summary — **nie** scroll.
- **Workspace Intelligence** = kanoniczny surface z `TenderWorkspaceV2Panel` / pinned insights / strip shortcut — **nie** moduł Strategia.
- **Cost Estimation (pierwszy tab)** = `kosztorys` lub `ceny` — pełna wycena obu tabów = **≤2** kliki z widocznym mostem (NG-08-05).

**Baseline as-is (audyt):** KPI-UX-01 **FAIL** (2) · KPI-UX-02 **FAIL** dla pełnej wyceny · **PASS** dla pierwszego tabu kosztowego.

---

## 3. Key UX goals → slice map

| Goal | Realizacja | Slice |
|------|------------|-------|
| **Continuous workspace identity** | Command Layer, breadcrumb, KPI compact, trust ribbon, `max-w-7xl` align | NG-08-01 |
| **Persistent workflow context** | Unified Process Strip hierarchy, V2 visibility, strip ↔ tab sync | NG-08-02 |
| **Strong next-action guidance** | Per-tab primary CTA w chrome; operator bar bez duplikacji | NG-08-01 |
| **Unified intelligence surface** | Intelligence hub; KPI-UX-01; strategy return path | NG-08-03 |

---

## 4. Slice specifications (frozen)

### NG-08-01 — Workspace Frame

| AC | Opis |
|----|------|
| **AC-01-01** | Command Layer identyczna **rola** na wszystkich tabach: tytuł tendera, aktywny tab label, KPI compact (gdy tab ≠ przetarg). |
| **AC-01-02** | Primary CTA widoczny w chrome na: `przetarg`, `dokumenty`, `kosztorys`, `ceny`, `decyzja` — copy kontekstowe (reuse `TenderWorkflowPrimaryAction` props). |
| **AC-01-03** | Decyzja: breadcrumb `Decyzja › {Kwalifikacja\|Oferta\|Przegląd}` gdy `?ws=` ustawione. |
| **AC-01-04** | `pendingTab` optimistic UI — bez regresji (test nav TEUX-1). |
| **AC-01-05** | Module nav / strategy bridge: widoczny hint powrotu do bieżącego tendera (copy lub button). |

**Nie wolno:** zmieniać liczby tabów URL · scalać `TenderKosztorysWorkspace` mount · dodawać KV.

---

### NG-08-02 — Workspace Progress

**SSOT slice:** [`NG-08-02-TEUX-DESIGN-FREEZE.md`](./NG-08-02-TEUX-DESIGN-FREEZE.md) · **WF-02**

| AC | Opis |
|----|------|
| **AC-02-01** | Process Strip widoczny w Command Layer na **każdym** tabie workspace (WF-02). |
| **AC-02-02** | Aktywny strip stage = aktywny tab (lub sub-tab Decyzja) — `resolveActiveProcessStripStageId`. |
| **AC-02-03** | Gdy `blockersCount > 0` — postęp V2 **nie** domyślnie ukryty; BlockersChip w chrome. |
| **AC-02-04** | Trust ribbon + analysis strip — hierarchia primary/secondary (strip primary). |
| **AC-02-05** | Kosztorys — minimal bridge copy/link do strip (bez merge phase engine). |
| **AC-02-06** | Chrome budget mobile ≤50vh (strip + CTA). |

**Nie wolno:** zmieniać logiki `deriveKosztorysProcessPhase` · merge trust engines · mount strip tylko na tab `przetarg`.

---

### NG-08-03 — Workspace Intelligence

| AC | Opis |
|----|------|
| **AC-03-01** | **KPI-UX-01 PASS** — z `dokumenty` ≤1 interakcja do intelligence surface. |
| **AC-03-02** | Intelligence surface zawsze **odkrywalny** na tab `przetarg` bez otwierania domkniętego accordionu (gdy brak blockerów). |
| **AC-03-03** | Reuse `intelligenceCtx` — zero nowych wywołań scoring API. |
| **AC-03-04** | Executive summary na Decyzji — layout spójny z intelligence hub (typografia TEUX). |

**Nie wolno:** nowe pola tender · zmiana `buildTenderIntelligenceContext()` · moduł Strategia w detalu URL.

---

### NG-08-04 — Documents Workspace

| AC | Opis |
|----|------|
| **AC-04-01** | `TenderUxEmptyState` (TEUX-6) dla pustych dokumentów / brak SWZ. |
| **AC-04-02** | Section chrome `TenderUxSectionTitle` na głównych sekcjach dokumentów. |
| **AC-04-03** | Expanded document groups — persist session LS key `wg-tender-doc-groups-{tenderId}` (UI-only). |
| **AC-04-04** | Akcje dokumentów nie duplikują primary CTA z frame (jedna ścieżka preferowana). |

**Nie wolno:** zmiana `tender-grouped-documents.ts` reguł grupowania · pipeline discovery.

---

### NG-08-05 — Cost Workspace

| AC | Opis |
|----|------|
| **AC-05-01** | **KPI-UX-02 PASS** — intelligence → pierwszy tab kosztowy ≤1 interakcja. |
| **AC-05-02** | Widoczny most Kosztorys ↔ Ceny (link / strip / shared status row). |
| **AC-05-03** | `TenderBidProposalPanel` — redukcja `text-[9px]`/`text-[10px]` do TEUX scale (min `text-xs` / `TEUX_FONT_*`). |
| **AC-05-04** | Scroll position per tab — opcjonalny session restore `wg-tender-scroll-{tenderId}-{tab}` (UI-only). |
| **AC-05-05** | Mobile: touch targets operator actions ≥44px zachowane. |

**Nie wolno:** scalać mountów kosztorys/panel · zmiana kalkulatora wyceny · ATH parser.

---

## 5. Visual validation (frozen werdykty)

| ID | Werdykt | SS |
|----|---------|-----|
| V-1 IA | **COMPLETE** — owner SS-01,02,06,08 | PASS |
| V-2 Progress | **COMPLETE** — SS-01,02,04 | PASS |
| V-3 Action Bar | **COMPLETE** — SS-01,07 | PASS |
| V-4 Intelligence | **COMPLETE** — SS-01,02,06 | PASS |
| V-5 Documents | **COMPLETE** — SS-03,09 | PASS |
| V-6 Cost | **COMPLETE** — SS-04,05 | PASS |
| V-7 Responsive | **COMPLETE** — SS-01,03,06,07,08 | PASS |
| V-8 Hierarchy | **COMPLETE** — SS-10 + cross | PASS |
| V-9 Memory | **COMPLETE** — round-trip SS-03,01/04 | PASS (baseline gaps → AC-04-03, AC-05-04) |
| V-10 Context switching | **COMPLETE** — SS-01…06 trace | PASS (KPI gaps → slices 03/05) |
| V-11 Continuity | **COMPLETE** — SS-08,10 | PASS |

**Screenshot gate SS-01…10:** **OWNER PASS** (2026-07-08).

---

## 6. Protected boundaries (frozen)

| Plik / obszar | Dozwolone | Zakazane |
|---------------|-----------|----------|
| `tender-detail-routes-v4.ts` | copy labels | zmiana semantyki parse/redirect |
| `cloud-sync.ts` | — | **any diff** |
| `useTenderPipelineRuntime` | read props | behavior change |
| `buildTenderIntelligenceContext` | import | zmiana output shape bez ADR |
| `tender-ux-tokens.ts` | import | **nowe exporty** |
| `supabase/functions/**` | — | **any diff** |

---

## 7. Release model

| Slice | Wersja (propozycja) | Klasa release |
|-------|---------------------|---------------|
| **NG-08-01** Workspace Frame | **2.63.73** | `84b1491` | **CLOSED** · PRODUCTION VERIFIED |
| **NG-08-02** Workspace Progress | **2.63.74** | — | PLAN + FREEZE ✅ · IMPLEMENT BLOCKED |
| NG-08-03 | 2.63.75 | B |
| NG-08-04 | 2.63.76 | B |
| NG-08-05 | 2.63.77 | B |

Jeden commit per slice · changelog per slice · `npm run build` + Gate B tenders + payroll 16/16.

---

## 8. Dokumentacja (post-IMPLEMENT)

| Plik | Kiedy |
|------|-------|
| `CHANGELOG` + `CHANGELOG.md` | Każdy slice |
| `HelpView` | Slice 01, 03 (CTA / intelligence) |
| `docs/ARCHITECTURE.md` § 12.1.x | Po NG-08-05 lub epic closeout |
| `WORKFLOW-ARCHITECTURE-v2.63.md` addendum | Po NG-08-01 (Command Layer SSOT) |
| `NG-08-TEUX-CLOSEOUT.md` | Po slice 05 PRODUCTION VERIFIED |

---

## 9. Workflow status

```text
AUDIT (CODE)     ✅ ACCEPTED
AUDIT (VISUAL)   ✅ COMPLETE
UX LOCK          ✅ APPROVED
PLAN             ✅ APPROVED
DESIGN FREEZE    ✅ v1.0 (ten plik) — PENDING ARCH REVIEW
ARCH REVIEW      ⏸ PENDING ← CURRENT
OWNER GO         ⛔ BLOCKED
IMPLEMENT        ⛔ BLOCKED
```

---

## 10. Następny krok

1. **ARCH REVIEW** — allowlist + boundary + KPI AC sign-off  
2. **OWNER GO** — jawne „IMPLEMENT NG-08-01”  
3. **Slice NG-08-01** — Workspace Frame  

**Zero implementacji** bez OWNER GO.

---

*SSOT freeze — implementacja wyłącznie wg [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md). Baseline: **2.63.72** @ **08a6649**.*

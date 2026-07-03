# PAYROLL — Plan uporządkowania dokumentacji (PLAN ONLY · BACKLOG)

> **Typ:** Plan przyszłej reorganizacji dokumentów Payroll. **NIE wykonywać teraz.**
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54`
> **Status:** 📋 **BACKLOG · NOT STARTED**
> **Gate uruchomienia (wszystkie):** (1) zamknięcie **Payroll Certification 2026** · (2) utworzenie **`docs/PAYROLL-ARCHITECTURE-v3.md`**.
> **Zasady twarde:** ❌ nie usuwać żadnych plików · ❌ nie przenosić żadnych plików teraz · ✅ wyłącznie plan mapowania.
> **Workflow:** PLAN → BACKLOG → STOP.

---

## 1. Inwentaryzacja — wszystkie dokumenty Payroll (33)

### 1.1 Rdzeń Payroll (`docs/PAYROLL-*` — 26)

| # | Dokument | Kategoria docelowa | Status treści |
|---|----------|--------------------|---------------|
| 1 | `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` | **ACTIVE SSOT** → *superseded przez v3* | architektura (do zastąpienia) |
| 2 | `PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md` | **ACTIVE SSOT** (merge SSOT, ref. w regułach) | CLOSED |
| 3 | `PAYROLL-GUARD-PHASE-CLOSEOUT.md` | **ACTIVE SSOT** (guard SSOT, ref. w regułach) | CLOSED |
| 4 | `PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md` | **ACTIVE SSOT** (P0 aktywny) | OPEN P0 |
| 5 | `PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md` | **ACTIVE SSOT** (P0 wspierający) | OPEN (contributing) |
| 6 | `PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md` | **ACTIVE SSOT** (S7-4A observation) | IMPLEMENTED · OBSERVATION |
| 7 | `PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md` | **ACTIVE SSOT** (APPROVED, waiting) | OPEN P0 |
| 8 | `PAYROLL-CERTIFICATION-2026-AUDIT.md` | **ACTIVE SSOT** (certyfikacja) | IN PROGRESS |
| 9 | `PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md` | **ACTIVE SSOT** (F1) | OPEN HIGH |
| 10 | `PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md` | **ACTIVE SSOT** (F1 REPRO) | OPEN HIGH |
| 11 | `PAYROLL-CLOUD-RECOVERY-B5-AUDIT.md` | **HISTORY (Audit)** | CLOSED |
| 12 | `PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md` | **HISTORY (Audit)** | CLOSED |
| 13 | `PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md` | **HISTORY (Audit)** | CLOSED |
| 14 | `PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md` | **HISTORY (Audit)** | CLOSED |
| 15 | `PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED (2.63.15) |
| 16 | `PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED |
| 17 | `PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED |
| 18 | `PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED |
| 19 | `PAYROLL-CLOUD-RECOVERY-B6-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED |
| 20 | `PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED (2.63.16) |
| 21 | `PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md` | **HISTORY (Design Freeze)** | CLOSED |
| 22 | `PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md` | **Archive** (closeout sub-bundle) | CLOSED |
| 23 | `PAYROLL-CLOUD-RECOVERY-B6-RELEASE-REPORT.md` | **Archive** (release report) | CLOSED |
| 24 | `PAYROLL-RESTORE-BANNER-RELEASE-REPORT.md` | **Archive** (release report) | CLOSED |
| 25 | `PAYROLL-DOCS-REORG-PLAN.md` *(ten plik)* | **ACTIVE SSOT** (plan) | BACKLOG |
| 26 | `PAYROLL-ARCHITECTURE-v3.md` *(planowany)* | **ACTIVE SSOT** (główny) | NOT CREATED |

### 1.2 Powiązane handoffy Payroll (poza konwencją `PAYROLL-*` — 4)

| # | Dokument | Kategoria docelowa | Status |
|---|----------|--------------------|--------|
| 27 | `SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md` | **Archive** (historyczny handoff) | CLOSED |
| 28 | `SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md` | **Archive** (historyczny handoff) | CLOSED |
| 29 | `SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md` | **Archive** (historyczny handoff) | CLOSED |
| 30 | `SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md` | **HISTORY (Audit)** *(feature CLOSED)* | CLOSED (2.59.49) |

### 1.3 Styczne — „Do rozliczenia” / Settlement (poza rdzeniem Payroll — 3)

> **Uwaga:** domena billing/recoverable-charges, **nie** rdzeń Payroll. Ujęte dla kompletności — **poza** zakresem `docs/payroll/`.

| # | Dokument | Rekomendacja |
|---|----------|--------------|
| 31 | `SETTLEMENT-WORKFLOW-AUDIT-20.4A.md` | pozostaw poza `payroll/` (ew. `docs/billing/`) |
| 32 | `SETTLEMENT-REPORTING-AUDIT-20.4C.md` | jw. |
| 33 | `SETTLEMENT-REPORTING-AUDIT-20.4C.2.md` | jw. |

---

## 2. Podział na kategorie (podsumowanie)

### 2.1 ACTIVE SSOT (11 — rządzą bieżącą pracą / autorytatywne)
`PAYROLL-ARCHITECTURE-v3.md` *(planowany, główny)* · `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` *(do superseded przez v3)* · `PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md` · `PAYROLL-GUARD-PHASE-CLOSEOUT.md` · `PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md` · `PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md` · `PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md` · `PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md` · `PAYROLL-CERTIFICATION-2026-AUDIT.md` · `PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md` · `PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md` · `PAYROLL-DOCS-REORG-PLAN.md`

### 2.2 HISTORY (Audit) (5)
B5-AUDIT · B6-AUDIT · S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT · RESTORE-BANNER-FALSE-POSITIVE-AUDIT · SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1

### 2.3 HISTORY (Design Freeze) (7)
CLOUD-RECOVERY-P0-DF · ETAP2-DF · ETAP2-B3-GUARD-PHASE2-DF · B5-DF · B6-DF · JOBS-ASSIGNMENT-SYNC-GUARD-P0-DF · RESTORE-BANNER-DF

### 2.4 Archive (6)
B5-CLOSEOUT · B6-RELEASE-REPORT · RESTORE-BANNER-RELEASE-REPORT · SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES · SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL · SESSION-HANDOFF-20.1B-CARRY-WORKFLOW

> **Uwaga zasada:** przy wykonaniu **żaden** dokument nie znika — „Archive” = przeniesienie do podkatalogu archiwum, **nie** usunięcie (§4).

---

## 3. Proponowana docelowa struktura `docs/payroll/`

```
docs/payroll/
├── README.md                       ← indeks + nawigacja (nowy, przy wykonaniu)
├── PAYROLL-ARCHITECTURE-v3.md      ← ★ główny SSOT (po utworzeniu)
├── active/                         ← ACTIVE SSOT (bieżące/otwarte)
│   ├── PAYROLL-CERTIFICATION-2026-AUDIT.md
│   ├── PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md
│   ├── PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md
│   ├── PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md
│   ├── PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md
│   ├── PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md
│   ├── PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md
│   ├── PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md      (merge SSOT)
│   ├── PAYROLL-GUARD-PHASE-CLOSEOUT.md            (guard SSOT)
│   └── PAYROLL-DOCS-REORG-PLAN.md
├── history/
│   ├── audit/                      ← HISTORY (Audit)
│   │   ├── PAYROLL-CLOUD-RECOVERY-B5-AUDIT.md
│   │   ├── PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md
│   │   ├── PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md
│   │   ├── PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md
│   │   └── SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md
│   └── design-freeze/              ← HISTORY (Design Freeze)
│       ├── PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md
│       ├── PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md
│       ├── PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md
│       ├── PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md
│       ├── PAYROLL-CLOUD-RECOVERY-B6-DESIGN-FREEZE.md
│       ├── PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md
│       └── PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md
└── archive/                        ← Archive (closeouts, release reports, stare handoffy)
    ├── PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md
    ├── PAYROLL-CLOUD-RECOVERY-B6-RELEASE-REPORT.md
    ├── PAYROLL-RESTORE-BANNER-RELEASE-REPORT.md
    ├── PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md   (po superseded przez v3)
    ├── SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md
    ├── SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md
    └── SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md
```

> `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` pozostaje **ACTIVE** dopóki v3 go nie zastąpi; po zastąpieniu → `archive/`.

---

## 4. Ograniczenia i ryzyka wykonania (do uwzględnienia PRZY reorg — nie teraz)

| # | Ryzyko | Mitigacja przy wykonaniu |
|---|--------|--------------------------|
| C1 | **Zerwane linki** — dziesiątki odwołań `docs/PAYROLL-*.md` w `.cursor/rules/*.mdc`, `AGENTS.md`, `PROJECT-STATUS.md`, `CURRENT-TASK.md`, `docs/ARCHITECTURE.md` | Aktualizacja **wszystkich** odnośników w jednym commicie **lub** pozostawienie stubów-przekierowań w starych ścieżkach |
| C2 | **Utrata historii Git** przy `mv` | `git mv` (zachowuje historię), nie delete+add |
| C3 | **Reguły `.cursor/rules`** wskazują konkretne ścieżki | zsynchronizować reguły w tym samym kroku |
| C4 | **Zakaz usuwania** | Archive = przeniesienie, nigdy `rm`; „nie usuwaj żadnych dokumentów” (pkt 4 zlecenia) |
| C5 | Trwający P0 (S7-5 / F1 OPEN) | reorg **dopiero po** gate (§ nagłówek) — nie ruszać aktywnych plików w trakcie incydentu |

---

## 5. Kroki wykonania (dla przyszłego zadania — po gate)

1. Utworzyć `docs/payroll/` + podkatalogi (`active/`, `history/audit/`, `history/design-freeze/`, `archive/`).
2. `git mv` każdego pliku wg mapy §3 (zachowanie historii).
3. Utworzyć `docs/payroll/README.md` — indeks z linkami i statusami (ACTIVE/HISTORY/ARCHIVE).
4. Zaktualizować **wszystkie** odnośniki (`.cursor/rules/**`, `AGENTS.md`, `PROJECT-STATUS.md`, `CURRENT-TASK.md`, `docs/ARCHITECTURE.md`, wzajemne linki między dokumentami).
5. Weryfikacja: brak martwych linków (grep po starych ścieżkach) · `git status` czysty poza reorg.
6. Commit **tylko** reorg dokumentacji (osobny od zmian kodu).

---

## 6. Poza zakresem
- Przenoszenie/usuwanie plików **teraz** (to plan).
- Settlement/billing (`SETTLEMENT-*`) — inna domena; ewentualny `docs/billing/` osobno.
- Zmiana treści dokumentów (reorg = tylko lokalizacja + linki, bez edycji merytorycznej).

---

*SSOT planu reorg: ten plik. PLAN ONLY — bez przenoszenia, bez usuwania, bez zmian kodu, bez BUILD, bez COMMIT. Workflow: PLAN → BACKLOG → STOP.*

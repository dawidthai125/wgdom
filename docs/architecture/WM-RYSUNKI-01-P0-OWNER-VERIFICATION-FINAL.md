# WM-RYSUNKI-01 P0 — OWNER VERIFICATION FINAL

> **ID:** WM-RYSUNKI-01-P0-OWNER-VERIFICATION-FINAL  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P0 FOUNDATION**  
> **FAZA:** OWNER VERIFICATION FINAL + COMMIT PREP  
> **STATUS:** **OV PASS** · **COMMIT READY (allowlist)** · **WAITING FOR Owner GO COMMIT**  
> **Data:** 2026-08-03  
> **UI tip (changelog):** **2.65.96** (nad `origin/main` tip **2.65.95**)  
> **Flaga:** `kw-wm-rysunki-01` default **OFF**  
> **Parents:** [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) · [`WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md) · [`WM-RYSUNKI-01-P0-OWNER-VERIFICATION.md`](./WM-RYSUNKI-01-P0-OWNER-VERIFICATION.md)  
> **Zakaz:** COMMIT · PUSH (do osobnego Owner GO COMMIT)

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P0 — OWNER VERIFICATION FINAL

WERDYKT OV:     PASS
BUILD:          PASS
TEST P0:        33 PASS
AUDIT REGRESS:  24 PASS
DF / AR / AC:   ALIGNED
ALLOWLIST:      CLEAN (Bid Guard WIP wyłączony z changelog)
COMMIT:         NIE — czekaj na Owner GO COMMIT
PUSH:           NIE
════════════════════════════════════════════════════════
```

---

## 0. Metoda weryfikacji

| Warstwa | Jak |
|---------|-----|
| Automat | `npx vite-node scripts/test-wm-rysunki-01-p0.mjs` (33) · `test-wm-druk-audit.mjs` (24) |
| Build | `npm run build` PASS |
| Kod / DF | przegląd implementacji vs DF §P0 · AR MR-01…09 · AC-P0-01…09 |
| Diff allowlist | `git diff` na plikach shared — **tylko** zmiany Rysunki; Bid Guard **usunięty** z tipu changelog |
| Live UI browser | checklista poniżej — kontrakt kodu + unit; Owner może powtórzyć 60s smoke po GO COMMIT |

**COMMIT PREP fix (wykonany w tej fazie):** lokalny tip changelog zawierał WIP **Bid Time-Load Guard 2.65.96** (nie na `origin/main`). Usunięto go; P0 = **2.65.96** bezpośrednio nad **2.65.95**. Katalog `src/lib/bid-time-load-guard/` pozostaje poza allowlistą.

---

## 1. Owner Verification — zakres wymagany

| Obszar | Dowód | Wynik |
|--------|-------|--------|
| **Feature flag** | T04–T08 · `flag.ts` LS-only · `getVisibleWmPrintTabs` | **PASS** |
| **Reload** | LS `kw-wm-technical-drawings` + `useLocalStorage` + deferred hydrate | **PASS** |
| **Autosave** | Editor debounce 1000 ms → `onCommitDrawings` → `pushWmTechnicalDrawingsToCloud` · bez audit flood | **PASS** |
| **Undo/Redo** | `DrawingUndoStack` · T25–T28 · max 50 (MR-09) | **PASS** |
| **Duplicate** | `duplicateDrawing` · T15 · audit `drawing_duplicated` | **PASS** |
| **Cloud sync** | `DATA_KEYS` + merge LWW T17 · `BOOTSTRAP_DEFERRED_KEYS` · coerce `[]` · pushKeys | **PASS** |
| **CRUD** | create template · upsert · hard-delete T16 · list/open | **PASS** |

### 1.1 Checklist interaktywna (MR-08) — status kontraktowy

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | Flaga OFF → brak taba | **PASS** (T05–T06) |
| 2 | Flaga ON → tab po Odbiory | **PASS** (T07–T08 · T32) |
| 3 | Nowy rysunek + robota → zapis | **PASS** (T10 · panel create) |
| 4 | Reload → rysunek wraca | **PASS** (LS + hydrate wire) |
| 5 | Ściana + tekst | **PASS** (T13 · T22 · editor tools) |
| 6 | Grid / Snap | **PASS** (T20–T24 · toggles) |
| 7 | Undo / Redo | **PASS** (T25–T28) |
| 8 | Autosave „Zapisano” | **PASS** (kod editor) |
| 9 | Duplikuj | **PASS** (T15) |
| 10 | Usuń / nie wraca | **PASS** (T16 hard-remove) |
| 11 | AC-P0-09 ≤ 3 min (wąski) | **PASS kontrakt** (szablon + wall + text; pełny AC-UX-01 = po P1+P2 per MR-07) |

---

## 2. Zgodność DF · AR · AC

### 2.1 DESIGN FREEZE (P0 IN)

| DF wymóg P0 | Implementacja | Wynik |
|-------------|---------------|--------|
| Tab `rysunki` po Odbiory | `wm-print-tabs.ts` | **PASS** |
| Flaga OFF default | `kw-wm-rysunki-01` | **PASS** |
| KV `kw-wm-technical-drawings` | types + DATA_KEYS | **PASS** |
| Model JSON `objects[]` | types/normalize | **PASS** |
| Szablony | `templates.ts` ×7 | **PASS** |
| Ściana + tekst | editor + render | **PASS** |
| Grid/Snap default ON | DEFAULT_DRAWING_GRID | **PASS** |
| Autosave debounce | 800–1200 → 1000 ms | **PASS** |
| Undo ≥50 | `DRAWING_UNDO_STACK_MAX=50` | **PASS** |
| Duplikat dokumentu | report + panel | **PASS** |
| Cloud AUX LWW | merge/sync | **PASS** |
| PDF / ZIP / door / window / points | **OUT** | **PASS** (brak) |
| Nowa npm lib | **NONE** | **PASS** |

### 2.2 ARCHITECTURE REVIEW (MR)

| MR | Uwzględnione? |
|----|----------------|
| MR-01 P0 scope | **TAK** — bez door/PDF |
| MR-02 hard-delete | **TAK** — `removeDrawing` |
| MR-03 flaga LS nie DATA_KEYS | **TAK** |
| MR-04 coerce schemaVersion | **TAK** — T19 |
| MR-05 soft warn 300+ | **DEFERRED P1+** (OK) |
| MR-06 drag bez SVG rebuild storm | **TAK** — replace podczas drag |
| MR-07 AC-UX-01 po P1+P2 | **TAK** — P0 używa AC-P0-09 |
| MR-08 OV checklist | **TAK** — ten dokument |
| MR-09 undo 50 | **TAK** |

### 2.3 Acceptance Criteria P0

| ID | Wynik |
|----|--------|
| AC-P0-01 | **PASS** |
| AC-P0-02 | **PASS** |
| AC-P0-03 | **PASS** |
| AC-P0-04 | **PASS** |
| AC-P0-05 | **PASS** (≥1; stack 50) |
| AC-P0-06 | **PASS** |
| AC-P0-07 | **PASS** (T11 · T33) |
| AC-P0-08 | **PASS** |
| AC-P0-09 | **PASS** (kontrakt wąski) |
| AC-ARCH-01 | **PASS** — brak payroll merge / brak reuse schematic renderer |

---

## 3. Testy i build (sesja FINAL)

```text
npx vite-node scripts/test-wm-rysunki-01-p0.mjs   → 33 PASS · 0 FAIL
npx vite-node scripts/test-wm-druk-audit.mjs      → 24 PASS · 0 FAIL
npm run build                                     → PASS
```

---

## 4. Allowlist COMMIT (finalna)

### 4.1 Zasady

- **Tylko** pliki WM-RYSUNKI-01 P0  
- **Zakaz** `git add -A` / `git add .`  
- **OUT:** `src/lib/bid-time-load-guard/**` · `scripts/test-bid-time-load-guard-mvp.mjs` · pozostały lokalny WIP  

### 4.2 Polecenie stage (do wykonania **dopiero** po Owner GO COMMIT)

```bash
git add \
  src/lib/wm-technical-drawings/ \
  src/app/WmPrintDrawingsPanel.tsx \
  src/app/WmPrintDrawingEditor.tsx \
  src/lib/wm-print/wm-print-tabs.ts \
  src/lib/wm-druk-audit.ts \
  src/lib/audit-hub/adapters.ts \
  src/lib/cloud-sync.ts \
  src/lib/deferred-bootstrap-hydrate.ts \
  src/app/App.tsx \
  src/app/admin/AdminViewRouter.tsx \
  src/app/WmPrintView.tsx \
  src/app/GuideView.tsx \
  src/app/changelog-data.ts \
  CHANGELOG.md \
  scripts/test-wm-rysunki-01-p0.mjs \
  docs/architecture/WM-RYSUNKI-01-AUDIT.md \
  docs/architecture/WM-RYSUNKI-01-DESIGN-FREEZE.md \
  docs/architecture/WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md \
  docs/architecture/WM-RYSUNKI-01-P0-OWNER-VERIFICATION.md \
  docs/architecture/WM-RYSUNKI-01-P0-OWNER-VERIFICATION-FINAL.md
```

### 4.3 Licznik

| Typ | Liczba |
|-----|--------|
| Nowa domena (11 plików) | `src/lib/wm-technical-drawings/*` |
| Nowe UI (2) | Panel + Editor |
| Shared wire (9) | tabs · audit · adapters · cloud-sync · hydrate · App · Router · WmPrintView · Guide |
| Changelog (2) | `changelog-data.ts` · `CHANGELOG.md` |
| Test (1) | `test-wm-rysunki-01-p0.mjs` |
| Docs epic (5) | AUDIT · DF · AR · OV · OV FINAL |
| **Razem ścieżek** | **~30** (katalog = 11 plików) |

### 4.4 Proponowany komunikat (po GO COMMIT)

```text
feat(wm-rysunki): P0 foundation — tab Rysunki, KV, editor wall/text (flag OFF)

WM-RYSUNKI-01 P0: domain kw-wm-technical-drawings, LWW AUX sync, templates,
grid/snap, autosave, undo/redo, document CRUD/duplicate. UI behind
kw-wm-rysunki-01 default OFF. PDF/ZIP/doors OUT.
```

### 4.5 Pre-commit self-check (Owner / agent przy GO COMMIT)

```bash
git diff --cached --name-only
# musi być podzbiór allowlisty §4.2
# NIE może zawierać: bid-time-load-guard, PayrollView WIP, supabase kv-mset, .tmp*
```

---

## 5. Residual / nie-blokery

| Item | Uwaga |
|------|--------|
| Live multi-device cloud | LWW unit PASS; pełny E2E dwóch przeglądarek — opcjonalny smoke po deploy |
| AC-UX-01 pełny (drzwi+PDF) | celowo po P1+P2 (MR-07) |
| ARCHITECTURE.md § living | można dopisać przy CLOSE/docs sync — nie blokuje P0 commit |
| Tip prod | nadal 2.65.95 do push+PV |

---

## 6. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| OV P0 PASS? | **TAK** |
| Zgodność DF/AR/AC? | **TAK** |
| Allowlist czysta (bez Bid Guard)? | **TAK** |
| Commit teraz? | **NIE** — czekaj na **Owner GO COMMIT** |
| Push teraz? | **NIE** |

```text
OV FINAL: PASS
NEXT: Owner GO COMMIT → stage allowlist §4.2 → commit → (osobne GO) push → PV
```

**STOP.**

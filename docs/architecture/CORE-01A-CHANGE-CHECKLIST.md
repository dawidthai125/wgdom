# CORE-01A — Change Checklist (Protected Core + FEATURE Boundary)

> **Status:** **ACTIVE** (procedura)  
> **Design Freeze:** [CORE-01A-DESIGN-FREEZE.md](./CORE-01A-DESIGN-FREEZE.md) · §4C FEATURE Boundary Check · #CORE-014  
> **Użycie CORE:** przed merge dotykającym Protected Core (`cloud-sync.ts`, PWRB, merge, CloudLoader payroll, Edge payroll)  
> **Użycie FEATURE:** przed **każdym** COMMIT bundle klasy FEATURE — sekcja **FEATURE Boundary Check** (obowiązkowa)

---

## FEATURE Boundary Check (przed COMMIT — obowiązkowe dla bundle FEATURE)

> **#CORE-014** — wykonaj **przed rozpoczęciem** implementacji (plan) i **ponownie przed COMMIT** (staged files).

### Metadane bundle

```text
BUNDLE: <np. NG-03 M-03 mobile>
EPIC / MODUŁ: <np. NG-03 Przetargi>
DOMINANT CLASS: FEATURE
DATE: <YYYY-MM-DD>
AUTHOR: <agent / owner>
```

### Krok 1 — Klasyfikacja (każdy plik w diff)

Wypisz `git diff --cached --name-only` (przed COMMIT) lub planowaną listę plików (przed IMPLEMENT):

| Plik | Klasa (CORE / PLATFORM / FEATURE / UI) |
|------|----------------------------------------|
| | |
| | |

Klasyfikacja wg [CORE-01A-DESIGN-FREEZE.md](./CORE-01A-DESIGN-FREEZE.md) §4B.  
Pliki graniczne (`App.tsx`): klasa = **intencja diffu** w tym bundle.

- [ ] Każdy plik w bundle ma przypisaną klasę
- [ ] Klasa dominująca bundle = **FEATURE** (lub UI/PLATFORM w release FEATURE)

### Krok 2 — Boundary Check (Protected Core)

**Pytanie:** Czy staged diff dotyka Protected Core?

Sprawdź obecność lub edycję:

- [ ] `src/lib/payroll-week-roster-bundle.ts`
- [ ] `src/lib/payroll-week-employee-merge.ts`
- [ ] `src/lib/cloud-sync.ts`
- [ ] `src/lib/cloud-sync-mutation-guard.ts` (zmiana logiki — nie sam import)
- [ ] `src/app/CloudLoader.tsx` (ścieżki payroll bootstrap)
- [ ] `supabase/functions/make-server-0afb8820/index.tsx` (batch-get/set payroll)
- [ ] `src/app/App.tsx` — handlery LP / `runCloudSync` / PWRB / rollover / restore payroll

```bash
git diff --cached --name-only
```

- [ ] Porównano listę ze ścieżkami Protected Core (DF §4C.3)
- [ ] Brak `setItem(kw-week-employees*)` / `pwr*` / `pushWeekEmployeesToCloud` w nowym kodzie FEATURE (poza allowlist)

### Krok 3 — Werdykt Boundary Check

```text
□ FEATURE PASS   — Protected Core NIE dotknięty → kontynuuj do COMMIT
□ STOP           — Protected Core dotknięty → CORE REVIEW REQUIRED → osobny CORE bundle
□ MIXED BUNDLE   — CORE + FEATURE w jednym commicie → BLOCKED (#CORE-013) → split
```

| Werdykt | Akcja |
|---------|-------|
| **FEATURE PASS** | Przejdź do sekcji F (build) i COMMIT |
| **STOP** | Nie commituj. Rozdziel diff. Użyj sekcji A–F (Protected Core checklist) w osobnym CORE bundle |
| **MIXED BUNDLE** | Nie commituj. Rozdziel na dwa commity minimum |

- [ ] Werdykt zapisany: FEATURE PASS / STOP / MIXED BUNDLE

### Krok 4 — Przed COMMIT (powtórzenie)

- [ ] Boundary Check **ponownie** na `git diff --cached --name-only`
- [ ] #CORE-013: brak plików klasy CORE w tym samym commicie co FEATURE
- [ ] Gate B scope modułu PASS (jeśli dotyczy — np. `scope:tenders`)
- [ ] `npm run build` PASS

**COMMIT dozwolony wyłącznie przy werdykcie FEATURE PASS.**

### Krok 5 — Owner GO (IMPLEMENT gate)

> **SSOT:** [`WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) · **#WORKFLOW-OWNER-GO-001**

Po **FEATURE PASS** i fazach AUDIT → DESIGN FREEZE → ARCHITECTURE REVIEW:

| Ścieżka | Warunek | Owner GO |
|---------|---------|----------|
| **A — FEATURE/UI** | Bundle nie dotyka Protected Core (§Krok 2) · #CORE-013/014 PASS | Asystent **może** wydać GO → `IMPLEMENT <bundle>` |
| **B — CORE** | Dotyk Payroll · PWRB · Sync · CloudLoader · Edge · Bootstrap · App.tsx CORE | GO **BLOCKED** — checklist A–F · analiza architektoniczna · Owner (człowiek) |

- [ ] Fazy wstępne COMPLETE (AUDIT · PLAN/DF · ARCH REVIEW)
- [ ] Werdykt Owner GO zapisany przed pierwszą linią kodu IMPLEMENT

---

## Metadane zmiany (Protected Core / CORE bundle)

```text
CHANGE: <krótki opis>
AUTHOR: <agent / owner>
DATE: <YYYY-MM-DD>
HEAD (przed): <commit>
TOUCHES PROTECTED CORE: TAK / NIE
BUNDLE CLASS: CORE | FEATURE | PLATFORM | UI
```

### Protected Core paths (jeśli TAK — wymagany Gate CORE)

- [ ] `src/lib/payroll-week-roster-bundle.ts`
- [ ] `src/lib/payroll-week-employee-merge.ts`
- [ ] `src/lib/cloud-sync.ts`
- [ ] `src/app/CloudLoader.tsx` (payroll bootstrap)
- [ ] `supabase/functions/make-server-0afb8820/index.tsx` (batch-get/set payroll)

---

## A. CORE-01A SAFE MODE (obowiązkowe — bundle CORE)

- [ ] Przeczytano [CORE-PROTECTED-ARCHITECTURE.md](./CORE-PROTECTED-ARCHITECTURE.md)
- [ ] **CORE-01A:** zmiana **nie modyfikuje logiki** modułów Protected Core (jeśli TAK → **STOP** → CORE-01B DF)
- [ ] Jeśli fix bypass z [Bypass Registry](./CORE-01-BYPASS-REGISTRY.md) → item w [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md), nie w 01A

---

## B. Dokumentacja i SSOT

- [ ] Przeczytano [PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) (jeśli payroll/sync)
- [ ] Bypass Registry zaktualizowany (jeśli nowa lub zamknięta luka)
- [ ] ARCHITECTURE.md zaktualizowany (jeśli zmiana architektury)

---

## C. Guard statyczny (jeśli dotyczy `src/` lub `scripts/audit-*`)

```bash
npm run audit:pwrb
npm run audit:core-ls    # po IMPLEMENT CORE-01A Faza 2
```

- [ ] `audit:pwrb` PASS
- [ ] `audit:core-ls` PASS lub **documented waiver** (manifest) do CORE-01B

---

## D. TEST-INFRA / Gate CORE

```bash
npm run test:infra:validate
npm run test:infra -- --gate CORE --scope core    # po IMPLEMENT Faza 2
npm run test:infra -- --gate B --scope payroll  # jeśli dotyczy sync
```

- [ ] Manifest validate PASS
- [ ] Gate CORE PASS (lub N/A — tylko docs / FEATURE PASS bundle)
- [ ] Gate B payroll PASS (jeśli dotyczy Protected Core)

---

## E. PAYROLL-QUALITY-GATE (jeśli dotyczy runtime Protected Core)

| Typ zmiany | Wymagany poziom |
|------------|-----------------|
| Docs / audit scripts only | L1 lub N/A |
| `cloud-sync.ts` / Edge payroll | L3 minimum |
| Epic close / major | L4 |

- [ ] Smoke L1 PASS (jeśli wymagane)
- [ ] Regression L2 PASS (jeśli wymagane)
- [ ] Multi-device L3 PASS (jeśli wymagane)
- [ ] Production Observation L4 (jeśli release prod)

Szczegóły: [PAYROLL-QUALITY-GATE.md](../PAYROLL-QUALITY-GATE.md)

---

## F. Build i release

```bash
npm run build
```

- [ ] Build PASS
- [ ] CHANGELOG (jeśli widoczna zmiana UI)
- [ ] Owner review (obowiązkowe przy Protected Core path diff)
- [ ] **FEATURE bundle:** FEATURE Boundary Check PASS (sekcja górna) — **przed COMMIT**

---

## Werdykt

```text
□ ALLOWED — merge/deploy możliwy
□ BLOCKED — powód: <…>
```

| Pole | Wartość |
|------|---------|
| **Boundary Check** | FEATURE PASS / STOP / MIXED BUNDLE / N/A (CORE-only) |
| **Reviewer** | |
| **Data werdyktu** | |

---

*Checklist proceduralny · CORE-01A v1.3 · #CORE-013 + #CORE-014 · Owner GO: [`WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md)*

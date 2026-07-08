# CORE-01B — Protected Core Runtime Fixes · BACKLOG

> **Status:** **OPEN** · **READY** · **Owner GO Required**  
> **Następny obowiązkowy epic:** **NIE** — uruchamiany on-demand (patrz §0)  
> **IMPLEMENT:** **BLOCKED** do RC-B-POST-RELEASE-01 + CORE-01A CLOSED (Gate CORE w CI)  
> **Data:** 2026-07-04  
> **Poprzednik:** CORE-01A (SAFE MODE — docs + guard static only)  
> **Registry:** [CORE-01-BYPASS-REGISTRY.md](./CORE-01-BYPASS-REGISTRY.md)  
> **Roadmapa:** [CORE-01A-CLOSEOUT-PLAN.md](./CORE-01A-CLOSEOUT-PLAN.md) §1  
> **Zasada:** każdy item wymaga **osobnego DESIGN FREEZE** lub mini-DF per item + Gate CORE + QG L3+

```text
POZYCJA:   NIE jest następnym epicem po CORE-01A — domyślnie FEATURE DEVELOPMENT
START:     AUDYT CORE-01B → DESIGN FREEZE → IMPLEMENT (tylko przy rzeczywistej potrzebie + Owner GO)
PREREQ:    CORE-01A CLOSED (Gate CORE w CI)
TRYB:      AUDIT → DESIGN FREEZE → IMPLEMENT → TEST → BUILD → COMMIT → PUSH → VERIFY
ZAKAZ:     łączenia wielu BYP-* w jeden bundle bez owner GO
```

---

## 0. Pozycja w roadmapie (po CORE-01A CLOSED)

```text
CORE-01A CLOSED
        ↓
FEATURE DEVELOPMENT (NG-03 · NG-04 · Roboty · WM · …)   ← domyślna ścieżka
        ↓
[jeżeli rzeczywista potrzeba zmian Protected Core]
        ↓
AUDYT CORE-01B → DESIGN FREEZE CORE-01B → IMPLEMENT CORE-01B
```

| Pole | Wartość |
|------|---------|
| **Status** | OPEN · READY · Owner GO Required |
| **Następny obowiązkowy epic** | **NIE** |
| **Znane luki (12 OPEN)** | Dokumentowane · waivers Gate CORE do ewentualnego 01B |
| **Trigger startu** | Incydent prod · regresja · wymóg biznesowy · explicit Owner GO |

---

## 1. Kolejność wdrożenia (gdy epic CORE-01B uruchomiony — nie auto-start)

| Priorytet | ID backlog | Bypass | Severity | Szacowany bundle |
|-----------|------------|--------|----------|------------------|
| P0 | CORE-01B-1 | BYP-H1 WorkerPhotoView | HIGH | osobny release B |
| P0 | CORE-01B-2 | BYP-H2 clearAll | HIGH | osobny release B |
| P0 | CORE-01B-3 | BYP-H3 production filter | HIGH | osobny release B |
| P1 | CORE-01B-4 | BYP-M1 rollover coupled push | MEDIUM | release B |
| P1 | CORE-01B-8 | BYP-M5 replace all active | MEDIUM | release B |
| P1 | CORE-01B-12 | BYP-L1 restoreAllData | LOW→HIGH przy użyciu | release C |
| P2 | CORE-01B-5 | BYP-M2 field edits policy | MEDIUM | docs + optional push |
| P2 | CORE-01B-6…7 | BYP-M3/M4 archive restore | MEDIUM | release B |
| P2 | CORE-01B-9 | BYP-M6 CloudLoader bootstrap | MEDIUM | release B + bootstrap test |
| P2 | CORE-01B-10 | BYP-M7 import backup verify | MEDIUM | test only możliwe |
| P3 | CORE-01B-11 | BYP-M8 migrate to pwrAdd | LOW | refactor min |
| P3 | CORE-01B-13 | BYP-L2 remove pwrPullMerge | LOW | cleanup |
| P3 | — | Runtime `__wgdomCoreGuard` dev wrapper | OPTIONAL | dev-only |

---

## 2. Specyfikacja per item (skrót — pełny DF przy starcie 01B)

### CORE-01B-1 — WorkerPhotoView (BYP-H1)

| Pole | Wartość |
|------|---------|
| **Plik** | `src/app/WorkerPhotoView.tsx` |
| **Problem** | Partial push `kw-week-employees` bez PWRB |
| **Kierunek fix** | (A) delegacja do PWRB jeśli dotyka rosteru; (B) wąski push tylko pól worker extra-cost bez mutacji składu; (C) read-only roster dla workera |
| **Testy** | `audit:pwrb` PASS · `audit:core-ls` PASS · Gate CORE · L3 multi-device |
| **Nie zmieniać** | logiki merge Edge |

### CORE-01B-2 — clearAllWeekEmployees (BYP-H2)

| Pole | Wartość |
|------|---------|
| **Plik** | `src/app/App.tsx` |
| **Problem** | `pwrPush([])` bez tombstonów |
| **Kierunek fix** | Pętla `pwrRemove` per employee lub bulk tombstone + `pwrReconcile` przed push |
| **Testy** | `test-payroll-tombstone-revocation-rcb` · L3 |

### CORE-01B-3 — filterProductionWeekEmployees (BYP-H3)

| Pole | Wartość |
|------|---------|
| **Plik** | `src/app/App.tsx` |
| **Kierunek fix** | `pwrRemove` zamiast silent `setWeekEmployees` filter |

### CORE-01B-4 — rollover (BYP-M1)

| Pole | Wartość |
|------|---------|
| **Plik** | `src/lib/cloud-sync.ts` `pushPayrollWeekAfterRollover` |
| **Kierunek fix** | Coupled tombstones w batch lub `pwrPush` po reconcile |
| **Uwaga** | Dotyka L3 — wymaga owner GO + B6 regresja |

### CORE-01B-5 — field edits policy (BYP-M2)

| Pole | Wartość |
|------|---------|
| **Decyzja produktowa** | Czy godziny/settled wymagają debounced `pwrPush`? |
| **Opcje** | (A) dokumentować „local until roster push”; (B) debounced domain push |
| **Domyślnie** | (A) — mniejszy diff; (B) → osobny DF |

### CORE-01B-11 — pwrAdd migration (BYP-M8)

| Pole | Wartość |
|------|---------|
| **Plik** | `src/app/App.tsx` `addFromDirectory` |
| **Kierunek fix** | Zamiana inline logic na `pwrAdd` — zero duplicate |

---

## 3. Kryteria zamknięcia CORE-01B (epic)

| # | Kryterium |
|---|-----------|
| 1 | Wszystkie BYP-H* = **CLOSED** w registry |
| 2 | `npm run audit:pwrb` PASS bez waiver |
| 3 | `npm run audit:core-ls` PASS bez waiver |
| 4 | Gate CORE PASS w CI |
| 5 | L3 multi-device PASS (owner) dla P0 items |
| 6 | `CORE-01B-EPIC-CLOSE-REPORT.md` |

**BYP-M2** może pozostać OPEN z udokumentowaną polityką — do decyzji owner przy closeout.

---

## 4. Zależności (on-demand — nie sekwencja obowiązkowa)

```text
CORE-01A CLOSED
        ↓
FEATURE DEVELOPMENT (domyślnie — bez 01B)
        ↓
[Owner GO + AUDYT + potrzeba zmian Protected Core]
        ↓
DESIGN FREEZE CORE-01B
        ↓
CORE-01B-1…3 (P0 HIGH) — osobne release B
        ↓
CORE-01B-4… (P1/P2) — per item / owner GO
```

**Nie** traktować CORE-01B jako następnego kroku po CORE-01A bez triggera z §0.

---

## 5. Zakazy (CORE-01B)

- **Nie** łączyć fixów HIGH z refaktorem `cloud-sync.ts` poza zakresem itemu
- **Nie** zmieniać Edge batch-get/set poza parity B6 wymaganym przez fix
- **Nie** usuwać `__wgdomPayrollPipelineDebug` i debug warn w tym samym bundle co BYP fix (najpierw RC-B cleanup)
- **Nie** startować bez CORE-01A Gate CORE w CI

---

*BACKLOG OPEN · READY · Owner GO Required · nie następny obowiązkowy epic · SSOT dla CORE-01B-DESIGN-FREEZE.md (on-demand)*

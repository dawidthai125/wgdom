# W&G DOM — Owner GO Policy

> **Status:** **ACTIVE** (proces SSOT)  
> **Data:** 2026-07-07  
> **ID:** **#WORKFLOW-OWNER-GO-001**  
> **Powiązane:** [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) · [`architecture/CORE-01A-CHANGE-CHECKLIST.md`](architecture/CORE-01A-CHANGE-CHECKLIST.md) · [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) · #CORE-013 · #CORE-014

---

## 1. Cel

Jedna zasada decyzyjna: **kiedy** Owner (w sesji z asystentem AI) może wydać **Owner GO** i odblokować **IMPLEMENT**, a **kiedy** GO pozostaje **BLOCKED** do dodatkowej analizy architektonicznej.

Zasada **nie zastępuje** test gate, release workflow ani PAYROLL-QUALITY-GATE dla bundle CORE.

---

## 2. Fazy wstępne (wymagane przed Owner GO)

Wszystkie poniższe muszą być **COMPLETE** / **PASS**:

| Faza | Opis | Artefakt typowy |
|------|------|-----------------|
| **AUDIT** | Read-only; mapa plików, luki, regresje | `audit/*.md` · raport sesji |
| **PLAN** | Zakres, etapy, ryzyka, pliki | Design Freeze §bundles · handoff |
| **DESIGN FREEZE** | Zamrożony scope bundla/epicu | `*-DESIGN-FREEZE.md` |
| **ARCHITECTURE REVIEW** | Werdykt PASS; boundary projekcja | `*-ARCHITECTURE-REVIEW.md` · sekcja w DF |
| **Boundary Check** | #CORE-014 FEATURE PASS · #CORE-013 brak mixed bundle | [`CORE-01A-CHANGE-CHECKLIST.md`](architecture/CORE-01A-CHANGE-CHECKLIST.md) |

```text
AUDIT → PLAN → DESIGN FREEZE → ARCHITECTURE REVIEW → Boundary Check → Owner GO? → IMPLEMENT
```

---

## 3. Ścieżka A — FEATURE / UI (Owner GO dozwolone)

**Owner GO i odblokowanie IMPLEMENT** — gdy **wszystkie** warunki:

### 3.1 Bundle NIE dotyka Protected Core

Brak diff (planowanyego i faktycznego) w:

| Obszar | Ścieżki (skrót) |
|--------|-----------------|
| Payroll merge / guard | `src/lib/payroll-*.ts` · `cloud-sync-mutation-guard.ts` (logika) |
| PWRB | `src/lib/payroll-week-roster-bundle.ts` |
| Cloud Sync kernel | `src/lib/cloud-sync.ts` |
| CloudLoader bootstrap | `src/app/CloudLoader.tsx` (payroll bootstrap) |
| Edge | `supabase/functions/**` |
| App.tsx CORE | handlery LP · `runCloudSync` · PWRB · rollover · restore payroll · bootstrap sync |

`App.tsx` **poza** payroll/sync CORE (np. nawigacja modułu Przetargi) — dopuszczalne **tylko** gdy Boundary Check = FEATURE PASS i plik sklasyfikowany jako intencja FEATURE w bundle.

### 3.2 Klasa bundla

- **UI/UX** lub **FEATURE-only**
- Dominant class ≠ CORE

### 3.3 Boundary gates

| Gate | Wymaganie |
|------|-----------|
| **#CORE-013** | Jeden bundle = jeden cel · brak mixed CORE+FEATURE w jednym commicie |
| **#CORE-014** | FEATURE Boundary Check = **FEATURE PASS** |

### 3.4 Działanie asystenta AI

Gdy §2 + §3 spełnione, asystent **może**:

1. Wydać werdykt **Owner GO** (w raporcie sesji).
2. Odblokować **IMPLEMENT** bundla.
3. W **STABILIZATION WINDOW** — uznać to za **explicit override** na epic FEATURE-only (bez czekania na zamknięcie Z-01–Z-07), o ile epic nie dotyka Protected Core.

**Formuła polecenia:** `IMPLEMENT <bundle-id>` (np. `IMPLEMENT TEUX-1 Navigation`) — strict scope z Design Freeze / handoff.

---

## 4. Ścieżka B — CORE (Owner GO BLOCKED)

**Owner GO pozostaje BLOCKED** do dodatkowej analizy architektonicznej, gdy bundle **dotyka** któregokolwiek z:

| Obszar | Wymaganie dodatkowe |
|--------|---------------------|
| **Payroll** | PAYROLL-QUALITY-GATE · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) |
| **PWRB** | Gate CORE · audyt bypass |
| **Cloud Sync** | CORE bundle · osobny commit · Owner review |
| **CloudLoader** | Bootstrap / payroll merge paths |
| **Edge** | Deploy Supabase · batch-get/set payroll |
| **Bootstrap** | Kolejność hydracji · deferred bootstrap |
| **App.tsx CORE** | Mutacje LP · sync orchestration |

### 4.1 Wymagane przed IMPLEMENT (ścieżka B)

- [ ] [`CORE-PROTECTED-ARCHITECTURE.md`](architecture/CORE-PROTECTED-ARCHITECTURE.md) przeczytany
- [ ] Checklist A–F w [`CORE-01A-CHANGE-CHECKLIST.md`](architecture/CORE-01A-CHANGE-CHECKLIST.md) (sekcja Protected Core)
- [ ] Werdykt Boundary Check = **N/A (CORE-only)** lub osobny CORE bundle po **STOP**
- [ ] **Jawna decyzja Ownera (człowiek)** — asystent AI **nie** zastępuje Owner GO dla bundle CORE

---

## 5. Macierz decyzyjna (skrót)

| Dotyka Protected Core? | #CORE-013/014 PASS? | Fazy §2 COMPLETE? | Owner GO |
|------------------------|---------------------|-------------------|----------|
| **NIE** | TAK | TAK | **DOZWOLONE** (asystent może odblokować IMPLEMENT) |
| **NIE** | NIE | TAK | **BLOCKED** — napraw boundary |
| **NIE** | TAK | NIE | **BLOCKED** — dokończ fazy |
| **TAK** | — | — | **BLOCKED** — analiza architektoniczna + Owner (człowiek) |

---

## 6. STABILIZATION WINDOW

Okno stabilizacji ([`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md)) **nadal ACTIVE** dla epiców CORE i zmian kontraktu danych.

**Wyjątek (#WORKFLOW-OWNER-GO-001):** epic / bundle **FEATURE-only** spełniający §2–§3 ścieżki A — **nie wymaga** zamknięcia Z-01–Z-07; wymaga **Owner GO** wg tej polityki (audyt + DF + review + boundary).

Epic **CORE** lub dotykający Protected Core — **bez wyjątku**; wymaga zamknięcia okna lub osobnej decyzji Ownera po analizie CORE.

---

## 7. Powiązanie z ręcznym Owner Gate (np. NG-06-TEUX)

Epice z checklistą podpisu w Design Freeze (§10) mogą używać **albo**:

- **Ręcznego sign-off** Ownera w dokumencie (checkboxy + data), **albo**
- **Owner GO Policy** — gdy AUDIT + DF + ARCHITECTURE REVIEW + Boundary Check = PASS i bundle = ścieżka A.

Przy konflikcie: **ścieżka B (CORE)** zawsze wygrywa — BLOCKED.

---

## 8. Checklist wydania Owner GO (asystent)

```text
□ AUDIT COMPLETE
□ PLAN / DESIGN FREEZE COMPLETE
□ ARCHITECTURE REVIEW PASS
□ Boundary Check FEATURE PASS (#CORE-014)
□ #CORE-013 — brak mixed bundle
□ Bundle UI/FEATURE-only — zero Protected Core w planowanym diff
□ Handoff / DoD bundla istnieje
□ Werdykt: Owner GO → IMPLEMENT <bundle-id>
```

---

**#WORKFLOW-OWNER-GO-001 — ACTIVE · 2026-07-07**

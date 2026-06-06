# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-06  
**Wersja UI (prod):** **2.45.37** — Sprint 20.0A nieobecności  
**Prod `origin/main` HEAD:** **`778f616`** · https://www.wgdom.fun  
**Status Sprint 20.0A:** **CLOSED**

---

## Sprint 20.0A — Nieobecności pracowników (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.45.37** |
| **Commit** | **`778f616`** — `feat(payroll): add employee leave management (20.0A)` |
| **Production** | https://www.wgdom.fun |
| **Edge deploy** | auto GHA po pushu — PASS |
| **Vercel deploy** | auto po pushu `main` — PASS |

### Podsumowanie wdrożenia

Sprint wprowadza **Employee Leave Management** — CRUD nieobecności w kartotece (urlop / L4 / bezpłatny), synchronizację KV z tombstone'ami oraz integrację z listą płac i eksportem.

| Element | Opis | Status |
|---------|------|--------|
| **Employee Leave Management** | CRUD w kartotece (`EmployeeLeavesSection.tsx`), tygodnie Pn–So, walidacja overlap + archiwum | ✓ prod |
| **Payroll Overlay** | Live lista płac — `netPay`/`grossPay`=0, godziny bez zmian, etykieta 🏖/🤒/🚫 (`payroll-leave-overlay.ts`) | ✓ prod |
| **PDF Export** | Kolumna „Do wypłaty” — status URLOP zamiast kwoty (`payroll-export.ts`) | ✓ prod |
| **DOCX Export** | Ten sam status nieobecności w Word | ✓ prod |
| **Sync Tombstones** | `kw-employee-leaves-deleted-ids` — DELETE nie wraca z chmury (frontend + Edge batch-set) | ✓ prod |
| **Archive Protection** | `leaveStatus` zamrożony w `EmployeeSnapshot`; archiwum bez live lookup urlopów | ✓ prod |
| **Biweekly Support** | `calcBiweeklyWeekNetWithLeave` — cash split i payout zerowane w tygodniu urlopu | ✓ prod |

**Klucze KV:** `kw-employee-leaves`, `kw-employee-leaves-deleted-ids`  
**Pliki core:** `employee-leaves.ts`, `payroll-leave-overlay.ts`, `EmployeeLeavesSection.tsx`, `PayrollView.tsx`, `payroll-export.ts`, Edge `index.tsx`

**Testy (PASS):** `scripts/smoke-test-employee-leaves-20.0a.mjs`, `scripts/test-leave-delete-sync-20.0a.mjs`, `npm run build`

**Handoff:** [`docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md`](docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md)

**Następny sprint:** TBD

---

## Performance 2.x — **CLOSED** (baza przed 20.0A: `35614f0`)

Seria zamknięta. Nie wracać bez regresji produkcyjnej.

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md (Sprint 20.0A CLOSED)
3. docs/ARCHITECTURE.md § 10.1 (kw-employee-leaves, overlay, tombstones)
4. src/lib/employee-leaves.ts + payroll-leave-overlay.ts
5. docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md (Performance CLOSED)
```

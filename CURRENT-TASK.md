# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-06  
**Wersja UI (lokalnie, `changelog-data.ts`):** **2.45.37** — Sprint 20.0A nieobecności  
**Prod `origin/main` HEAD:** **`35614f0`** · tag `v2.45.38-perf-2.4a` · https://www.wgdom.fun  
**Status Sprint 20.0A:** **zaimplementowany lokalnie — BEZ commit / push / deploy**

---

## Sprint 20.0A — Nieobecności (LOKALNIE, nie na prod)

| Element | Status |
|---------|--------|
| KV `kw-employee-leaves` | ✓ |
| UI kartoteka — CRUD nieobecności | ✓ |
| Overlay live payroll | ✓ |
| PDF / DOCX / email | ✓ |
| `leaveStatus` w snapshot archiwum | ✓ |
| Walidacja overlap + archiwum | ✓ frontend + Edge |
| Test `scripts/test-employee-leaves-20.0a.mjs` | ✓ |
| `npm run build` | do weryfikacji w sesji |

**Następne (na polecenie):** commit → Vercel; deploy Edge (walidacja `kw-employee-leaves` w `index.tsx`).

---

## Performance 2.x — **CLOSED** (prod `35614f0`)

Seria zamknięta. Nie wracać bez regresji produkcyjnej.

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/ARCHITECTURE.md § 10.1 (kw-employee-leaves)
3. src/lib/employee-leaves.ts + payroll-leave-overlay.ts
4. docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md (CLOSED)
```

# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-07  
**Wersja UI (prod):** **2.49.10** — Sprint 20.5A.2 Create from job  
**Prod `origin/main` HEAD:** **`571b90b`** · https://www.wgdom.fun  
**Status Sprint 20.5A.2:** **CLOSED**

---

## Sprint 20.5A.2 — Create from job (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.49.10** |
| **Commit** | **`571b90b`** — `feat(jobs): create recoverable charges from job view (20.5A.2)` |
| **Pliki** | 12 · **+454 / −35** |
| **Production** | https://www.wgdom.fun |
| **Vercel deploy** | **PASS** @ `571b90b` |

### Zakres

| Element | Opis |
|---------|------|
| **Modal inline** | `JobCreateRecoverableChargeModal` — ➕ Dodaj do rozliczenia |
| **Preset** | `buildRecoverableChargeDraftFromJob()` — job, klient, adres, inspektor |
| **Zapis** | Bez nawigacji do modułu; KPI odświeżone na robocie |
| **Deep link** | `pendingRecoverableChargeCreatePreset` (consumed once) |

**Handoff pełny:** [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md)

**Następny sprint:** **20.5A.3** — Inspektor billing (nie rozpoczęty)

---

## Seria billing + Roboty (CLOSED)

| Sprint | Wersja | Commit | Status |
|--------|--------|--------|--------|
| 20.4C.2C Insights | 2.48.30 | `81554f0` | CLOSED |
| 20.5A.1 Jobs read-only | 2.49.00 | `637f12c` | CLOSED |
| **20.5A.2 Create from job** | **2.49.10** | **`571b90b`** | **CLOSED** |

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md  ← ★ billing + jobs 20.3A–20.5A.2
3. docs/SETTLEMENT-WORKFLOW-AUDIT-20.4A.md
4. docs/ARCHITECTURE.md § Do rozliczenia
5. AGENTS.md
```

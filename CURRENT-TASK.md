# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.53** — Dashboard WM Cleanup 20.5B.4  
**Prod `origin/main`:** **`e6758e5`** · v2.50.52 (poprzedni release)  
**Status:** **IMPLEMENT DONE** · oczekuje commit/deploy

---

## ★ START HERE (agent AI)

```text
1. CURRENT-TASK.md                    ← ten plik
2. docs/PROJECT-HANDOFF.md            ← baseline prod (2.50.52 do deploy)
3. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md
4. docs/ARCHITECTURE.md § 8, § 12.1.2
5. AGENTS.md
```

---

## Sprint 20.5B.4 — Dashboard WM Cleanup (**IMPLEMENT DONE**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.53** |
| **Zakres** | Usunięcie embedded Portfolio WM z Pulpicu; KPI + alerty WM → Roboty |

### Zmiany

- `DashboardView.tsx` — brak `WmPortfolioView` embedded; skróty „Roboty →”
- KPI `wmPortfolioStats`, alerty `wmOverdueJobs` / `wmThisWeekJobs` — bez zmian logiki
- `WmPortfolioView.tsx` + `InspectorPanel` — bez zmian (portfolio inspektora terenowego)

### Smoke (lokalnie)

| Test | Oczekiwany |
|------|------------|
| `smoke-test-dashboard-wm-cleanup-20.5b4.mjs` | **6/6 PASS** |
| `smoke-test-inspector-admin-simplification-20.5b2.mjs` | regresja PASS |
| `smoke-test-media-separation-20.5a8.mjs` | 18/18 |
| `smoke-test-technical-drawing-20.5a9.mjs` | 21/21 |
| `npm run build` | PASS |

### Następny (tylko na polecenie)

- Commit + push + deploy 2.50.53
- 20.5A.11 — inspektor read-only załączników ogólnych
- 20.3C — legacy CC + GuideView

---

## Poprzedni release prod — 20.5A.10 / 2.50.52

| Pole | Wartość |
|------|---------|
| **Commit** | **`e6758e5`** |
| **Deploy** | **`4994803137`** |
| **Handoff** | [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |

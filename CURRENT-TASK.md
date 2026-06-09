# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (prod):** **2.50.53** — Dashboard WM Cleanup 20.5B.4  
**Prod `origin/main`:** **`74890bd`** · https://www.wgdom.fun  
**Deploy:** GitHub **`4995023669`** · Ready  
**Status:** **RELEASED** · Sprint 20.5B.4 CLOSED

---

## ★ START HERE (agent AI)

```text
1. CURRENT-TASK.md                    ← ten plik
2. docs/PROJECT-HANDOFF.md            ← baseline prod
3. docs/RELEASE-REPORT-20.5B.4.md     ← ★ ostatni release
4. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md
5. docs/ARCHITECTURE.md § 8, § 12.1.2
6. AGENTS.md
```

---

## Sprint 20.5B.4 — Dashboard WM Cleanup (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.53** |
| **Commit** | **`74890bd`** |
| **Deploy** | **`4995023669`** |
| **CI Mobile** | **`27231309821`** SUCCESS |
| **Zakres** | Usunięcie embedded Portfolio WM z Pulpicu; KPI + alerty WM → Roboty |

### Smoke / build (release)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-dashboard-wm-cleanup-20.5b4.mjs` | **13/13 PASS** |
| `smoke-test-inspector-admin-simplification-20.5b2.mjs` | **29/29 PASS** |
| Regresja 20.5A.8 / 20.5A.9 | **PASS** |
| Prod bundle `2.50.53` | **PASS** (wgdom.fun + wgdom.online) |
| CI Mobile `#27231309821` | **PASS** |

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/app/DashboardView.tsx` | KPI WM + alerty; bez embedded portfolio |
| `src/app/WmPortfolioView.tsx` | Portfolio — tylko InspectorPanel (bez zmian) |
| `docs/RELEASE-REPORT-20.5B.4.md` | Raport release |

### Następny (tylko na polecenie)

- 20.5A.11 — inspektor read-only załączników ogólnych
- 20.3C — legacy CC + GuideView
- Roboty 2.0 FULL

---

## Poprzedni release — 20.5A.10 / 2.50.52

| Pole | Wartość |
|------|---------|
| **Commit** | **`e6758e5`** |
| **Deploy** | **`4994803137`** |
| **Handoff** | [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |

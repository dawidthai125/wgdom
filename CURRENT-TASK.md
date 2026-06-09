# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Current Version:** **2.50.55**  
**Current Baseline:** **RELEASED · STABLE**  
**Prod `origin/main`:** **`782fe87`** · https://www.wgdom.fun  
**Deploy:** **`4995467947`**  
**Status:** Sprint 20.5B.6A.1 CLOSED

---

## Podsumowanie — 20.5B.6A.1 Dokumentacja Robót Naming Refresh

Ujednolicono nazewnictwo modułu dokumentacji wykonania robót we wszystkich rolach (admin, pracownik, inspektor). Dodano hinty semantyczne obrys/wymiary vs plan techniczny PDF oraz help przy checklistie „Rysunek/Plan”. Bez zmian modelu, sync, KV i Edge.

**Kluczowe zmiany:**

- Raporty → **Dokumentacja**
- Raport z budowy → **Dokumentacja robót**
- Zakresy i wymiary → **Dokumentacja**
- Pulpit: **Nowa dokumentacja od ekipy**
- Hint: obrys/wymiary ≠ plan techniczny PDF

**Raport:** [`docs/RELEASE-REPORT-20.5B.6A.1.md`](docs/RELEASE-REPORT-20.5B.6A.1.md)

---

## ★ START HERE (agent AI)

```text
1. CURRENT-TASK.md                    ← ten plik
2. docs/PROJECT-HANDOFF.md            ← baseline prod
3. docs/RELEASE-REPORT-20.5B.6A.1.md   ← ★ ostatni release
4. docs/RELEASE-REPORT-20.5B.5.md     ← Roboty UX Pack
5. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md
6. docs/ARCHITECTURE.md § 12.1.2
7. AGENTS.md
```

---

## Sprint 20.5B.6A.1 — Dokumentacja Robót Naming (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.55** |
| **Commit** | **`782fe87`** |
| **Deploy** | **`4995467947`** |
| **CI Mobile** | **`27233391718`** SUCCESS |
| **Zakres** | Raporty → Dokumentacja; hint obrys/plan; help Rysunek/Plan |

### Smoke / build (release)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-job-documentation-labels-20.5b6a.mjs` | **19/19 PASS** |
| Regresja 20.5A.8 / 20.5A.9 / MID-B | **PASS** |
| Prod bundle `2.50.55` | **17/17 PASS** |
| CI Mobile `#27233391718` | **PASS** |

### Następny (tylko na polecenie)

- 20.5B.6A.2 — kolejność tabów / worker sub-nav
- 20.5A.11 — inspektor read-only załączników
- 20.3C — legacy CC + GuideView

---

## Poprzedni release — 20.5B.5 / 2.50.54

| Pole | Wartość |
|------|---------|
| **Commit** | **`ae35c56`** |
| **Deploy** | **`4995226877`** |
| **Handoff** | [`RELEASE-REPORT-20.5B.5.md`](docs/RELEASE-REPORT-20.5B.5.md) |

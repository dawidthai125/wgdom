# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-04  
**Wersja UI:** **2.45.33** (`src/app/changelog-data.ts`) — Roboty 2.1A UX (lokalnie, **gotowe do commita**, bez push)  
**Prod `main` (HEAD):** `5b612e4` — Roboty 2.0 MIN · https://www.wgdom.fun

---

## Skończone lokalnie (Roboty 2.0 + 2.1A)

| Temat | Status | Commit / wersja |
|-------|--------|-----------------|
| Roboty 2.0 MIN | CLOSED na `main` | `5b612e4` · **2.45.32** |
| Roboty 2.1A UX | Kod + docs **lokalnie** | **2.45.33** · brak commit |

**Pliki 2.1A:** `JobListPanelHeader.tsx`, `JobsView.tsx`, `JobListCard.tsx`, `JobListStatus.tsx` (+ changelog, GuideView, ARCHITECTURE).

**Logika:** `job-list-ops.ts` — **bez zmian**.

---

## Następne (na polecenie)

1. **Commit** `feat(jobs): Roboty 2.1A list layout UX` (2.45.33) — po smoke wizualnym.
2. **Push** → Vercel.
3. Smoke: KPI scroll, brak chipów pod KPI, Filtry ▼, karta klient•termin.
4. **NIE** bez polecenia: 9.0.2, 9.1, Roboty 2.0 MID, dead-code delete.

---

## FAZA 8–9 — CLOSED (skrót)

Prod łańcuch: 8.0–8.4 → 8.5 → 9.0 → 9.0.1 · handoff: [`docs/SESSION-HANDOFF-2026-06.md`](docs/SESSION-HANDOFF-2026-06.md)

---

## Szybki start dla agenta

```text
1. docs/SESSION-HANDOFF-2026-06.md
2. CURRENT-TASK.md (ten plik)
3. docs/ARCHITECTURE.md § 12.1.4 (2.0 MIN + 2.1A)
4. changelog-data.ts → CHANGELOG[0].version
```

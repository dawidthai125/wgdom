# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (prod):** **2.50.44** — Billing Proposal 20.5A.6  
**Prod `origin/main` HEAD:** **`f87f485`** (docs) · feature **`99295e5`** · https://www.wgdom.fun  
**Status:** **STABLE** · **RELEASED**  
**Handoff:** [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)

---

## Proces nowej pracy

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

**Przed kodem:** [`CURRENT-TASK.md`](CURRENT-TASK.md) → [`AGENTS.md`](AGENTS.md) → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Release 2.50.44 — Billing Proposal 20.5A.6 (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.50.44** |
| **Commit** | **`99295e5`** — `feat(billing): add inspector billing proposal workflow (20.5A.6)` |
| **Deploy** | GitHub **`4990132607`** — **SUCCESS** |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Raport** | [`docs/RELEASE-REPORT-20.5A.6.md`](docs/RELEASE-REPORT-20.5A.6.md) |

### Smoke / prod

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-inspector-billing-proposal-20.5a6.mjs` | **59/59 PASS** |
| Regresja 20.5A.2–5 | **PASS** |
| `smoke-prod-bundle-2.50.44.mjs` | **9/9 PASS** (obie domeny) |
| CI Mobile smoke (run `27209115716`) | **SUCCESS** |

---

## Release 2.50.43 — Polonizacja CC 20.3B+ FULL (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.50.43** |
| **Commit** | **`61cb33b`** — `feat(ui): complete command center polish translation pack (20.3B+)` |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Deploy** | GitHub deployment **`4987528369`** — **SUCCESS** |
| **Handoff** | [`docs/SESSION-HANDOFF-20.3B-CC-POLISH.md`](docs/SESSION-HANDOFF-20.3B-CC-POLISH.md) |

### Zakres

| Element | Opis |
|---------|------|
| **Centralizacja** | `src/lib/tender-center-ui-labels-pl.ts` |
| **P0+P1** | OwnerDashboard, executive panel, lib CC, accordion, słownik, tooltips |
| **Marka** | COMMAND CENTER AI — **zachowana** |
| **Enumy** | GO/HOLD/NO-GO w danych — **bez zmian**; UI: STARTUJ/ANALIZUJ/ODPUŚĆ |
| **Poza scope** | Legacy ImpactPanel/Radar, GuideView, retro-changelog |

### Smoke / prod

| Test | Wynik |
|------|-------|
| `smoke-test-ui-language-20.3b-full.mjs` | **39/39 PASS** |
| `smoke-test-ui-language-20.3b.mjs` | **31/31 PASS** |
| Regresja MID-B + mobile + billing 20.5A.5 | **PASS** |
| `smoke-prod-bundle-2.50.43.mjs` | **ALL PASS** (obie domeny) |

---

## Release 2.50.42 — Billing Evidence Pack (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Commit** | **`d3874ad`** |
| **Deploy** | **`4986920110`** |
| **Handoff** | [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md) |

---

## Seria 2.50.x (CLOSED)

| Wersja | Commit | Skrót | Status |
|--------|--------|-------|--------|
| **2.50.43** CC Polish FULL | **`61cb33b`** | 20.3B+ — Wnioski AI, Wyjaśnienia, Lejek ofert | **CLOSED** |
| **2.50.42** Billing Evidence | `d3874ad` | 20.5A.5 — zdjęcia/PDF do uwag | CLOSED |
| **2.50.41** Active Today | `8a5d142` | Badge „Aktywni dziś” | CLOSED |
| **2.50.40** UX Pack | `c9baa1e` | Desktop workspace 35/65 | CLOSED |
| **2.50.20** Desktop Layout | `5a664c2` | Podwójny scrollbar admin | CLOSED |
| **2.50.10** Mobile Fix Pack | `4427b7a` | Toolbar compact, touch 44px | CLOSED |
| **2.50.00** Roboty MID-B | `860e8d9` | Lista/Kolejki | CLOSED |

---

## Sprint 20.5A — Billing + Inspektor (**CLOSED**)

| Sprint | Wersja | Commit | Skrót |
|--------|--------|--------|-------|
| **20.5A.6** | **2.50.44** | **`99295e5`** | Billing Proposal B1 — approve idempotency |
| **20.5A.5** | 2.50.42 | `d3874ad` | Billing Evidence Pack |
| 20.5A.4 | 2.49.80 | `9990921` | Uwagi inspektora per pozycja |
| 20.5A.3A | 2.49.70 | `4fec9cc` | Inspektor read-only billing |

Handoff: [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md) · [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)

---

## Polonizacja UI

| Sprint | Wersja | Commit | Skrót |
|--------|--------|--------|-------|
| **20.3B+ FULL** | **2.50.43** | **`61cb33b`** | Pełny COMMAND CENTER aktywny |
| **20.3B MIN** | 2.49.90 | `3d6a63e` | Pulpit CC częściowo, Media, inspektor |

Handoff CC: [`docs/SESSION-HANDOFF-20.3B-CC-POLISH.md`](docs/SESSION-HANDOFF-20.3B-CC-POLISH.md) · audyt: [`docs/UI-LANGUAGE-AUDIT-20.3B.md`](docs/UI-LANGUAGE-AUDIT-20.3B.md)

---

## Następny backlog (tylko na polecenie)

| Opcja | Opis |
|-------|------|
| **20.3C** | Legacy CC + GuideView + retro-changelog |
| **Roboty 2.0 FULL** | Audyt jobs |
| **P2 billing** | Dashboard alert prefiks proposal, orphan cleanup (poza 20.5A.6) |

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. AGENTS.md
3. docs/ARCHITECTURE.md § 11 (sync) + § Do rozliczenia + § 15.1
4. docs/PROJECT-HANDOFF.md              ← ★ baseline prod 2.50.44
5. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md
6. docs/SESSION-HANDOFF-20.3B-CC-POLISH.md
7. docs/tender-center-7g-executive.md
```

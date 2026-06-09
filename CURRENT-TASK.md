# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (prod):** **2.50.43** · Polonizacja COMMAND CENTER (20.3B+ FULL)  
**Wersja lokalna (branch):** **2.50.44** — Billing Proposal 20.5A.6 (**IMPLEMENT DONE, bez push/deploy**)  
**Prod `origin/main` HEAD:** **`61cb33b`** · https://www.wgdom.fun  
**Status:** **STABLE** (prod) · **20.5A.6 lokalnie gotowe do review**

---

## Release 2.50.44 — Billing Proposal 20.5A.6 (**LOKALNIE, bez deploy**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.50.44** (CHANGELOG lokalny) |
| **Wariant** | **B1** — propozycja w `JobNote` / `kw-jobs` → admin approve → `RecoverableCharge` |
| **Production** | *bez zmian* — prod nadal **2.50.43** |
| **Handoff billing** | [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md) |

### Zakres 20.5A.6

| Element | Opis |
|---------|------|
| **Model** | `billing_proposal` w `JobNote`, `proposalStatus`, helpery w `job-wm.ts` |
| **Inspektor** | CTA „Zgłoś pozycję”, modal + dowody, push tylko `kw-jobs` |
| **Admin** | Sekcja „Zgłoszenia inspektora”, approve (modal prefill) / reject |
| **Sync boundary** | Inspektor **nie** pisze `kw-recoverable-charges`; KPI rośnie dopiero po approve |

### Smoke / build (lokalnie)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-inspector-billing-proposal-20.5a6.mjs` | **52/52 PASS** |
| Regresja 20.5A.2–5 | **PASS** |

### Następne (po akceptacji)

- Push `main` → Vercel auto-deploy
- Test manualny na prod: inspektor zgłasza → admin zatwierdza → badge 💰

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
| **20.5A.5** | 2.50.42 | `d3874ad` | Billing Evidence Pack |
| 20.5A.4 | 2.49.80 | `9990921` | Uwagi inspektora per pozycja |
| 20.5A.3A | 2.49.70 | `4fec9cc` | Inspektor read-only billing |

Handoff: [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md)

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
| **20.5A.6** | Inspektor tworzy pozycję billing / polish evidence |
| **20.3C** | Legacy CC + GuideView + retro-changelog |
| **Roboty 2.0 FULL** | Audyt jobs |

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.3B-CC-POLISH.md   ← ★ CC polonizacja + mapa widoków
3. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md ← billing + roboty
4. docs/ARCHITECTURE.md § 6 (shell) + § 12.1.3 (CC) + § 15.1 (struktura admin)
5. AGENTS.md
6. docs/tender-center-7g-executive.md         ← pulpit × CC
```

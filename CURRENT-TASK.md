# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (prod):** **2.50.54** — Roboty UX Pack 20.5B.5  
**Prod `origin/main`:** **`ae35c56`** · https://www.wgdom.fun  
**Deploy:** GitHub **`4995226877`** · Ready  
**Status:** **RELEASED** · Sprint 20.5B.5 CLOSED

---

## ★ START HERE (agent AI)

```text
1. CURRENT-TASK.md                    ← ten plik
2. docs/PROJECT-HANDOFF.md            ← baseline prod
3. docs/RELEASE-REPORT-20.5B.5.md     ← ★ ostatni release
4. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md
5. docs/ARCHITECTURE.md § 8, § 12.1.2
6. AGENTS.md
```

---

## Sprint 20.5B.5 — Roboty UX Pack (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.54** |
| **Commit** | **`ae35c56`** |
| **Deploy** | **`4995226877`** |
| **CI Mobile** | **`27232257123`** SUCCESS |
| **Zakres** | Domyślny filtr W trakcie · Socjalny · Piec gazowy · docs plan PDF |

### Smoke / build (release)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-jobs-default-filter-20.5b5a.mjs` | **5/5 PASS** |
| `smoke-test-job-meta-20.5b5b.mjs` | **4/4 PASS** |
| `smoke-test-gas-furnace-20.5b5c.mjs` | **10/10 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| Prod bundle `2.50.54` | **15/15 PASS** (wgdom.fun + wgdom.online) |
| CI Mobile `#27232257123` | **PASS** |

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/app/JobsView.tsx` | Domyślny filtr `in_progress`; PDF meta |
| `src/app/JobListStatus.tsx` | Kolejność tabów faz |
| `src/lib/job-meta.ts` | Socjalny + `gasFurnaceStatus` |
| `src/app/JobMetaPickers.tsx` | Picker pieca gazowego |
| `src/app/InspectorPanel.tsx` | Pole pieca dla inspektora |
| `src/lib/job-documents-pack.ts` | Piec gazowy w readme ZIP |
| `docs/RELEASE-REPORT-20.5B.5.md` | Raport release |

### Następny (tylko na polecenie)

- 20.5A.11 — inspektor read-only załączników ogólnych
- 20.3C — legacy CC + GuideView
- Roboty 2.0 FULL

---

## Poprzedni release — 20.5B.4 / 2.50.53

| Pole | Wartość |
|------|---------|
| **Commit** | **`74890bd`** |
| **Deploy** | **`4995023669`** |
| **Handoff** | [`RELEASE-REPORT-20.5B.4.md`](docs/RELEASE-REPORT-20.5B.4.md) |

---

## Poprzedni release — 20.5A.10 / 2.50.52

| Pole | Wartość |
|------|---------|
| **Commit** | **`e6758e5`** |
| **Deploy** | **`4994803137`** |
| **Handoff** | [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |

# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (prod):** **2.50.52** — Generic File Attachments 20.5A.10  
**Prod `origin/main`:** **`e6758e5`** · https://www.wgdom.fun  
**Deploy:** GitHub **`4994803137`** · Ready  
**Status:** **RELEASED** · Sprint 20.5A.10 CLOSED

---

## ★ START HERE (agent AI)

```text
1. CURRENT-TASK.md                    ← ten plik
2. docs/PROJECT-HANDOFF.md            ← baseline prod
3. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md  ← ★ ostatni release (pliki roboty)
4. docs/ARCHITECTURE.md § 12.1.2      ← trzy warstwy plików na Job
5. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md  ← billing 20.5A.6
6. docs/SESSION-HANDOFF-20.3B-CC-POLISH.md      ← CC polonizacja
7. AGENTS.md
```

**Nie analizuj `App.tsx` od zera** — handoff + ARCHITECTURE wystarczą.

---

## Sprint 20.5A.10 — Generic File Attachments (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.52** |
| **Commit** | **`e6758e5`** |
| **Deploy** | **`4994803137`** |
| **Zakres** | `jobAttachments[]` · tombstone sync · UI · email · ZIP · preview |

### Smoke / build (release)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-generic-attachments-20.5a10.mjs` | **T1–T20 PASS** |
| Regresja 20.5A.8 / 9 / 20.5B.2 / 20.5B.3 | **PASS** |
| CI Mobile `#27230293447` | **PASS** |
| Prod bundle `2.50.52` + symbole | **PASS** |

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/job-attachments.ts` | Model + merge/tombstone |
| `src/lib/job-attachment-upload.ts` | Upload |
| `src/lib/job-attachments-pack.ts` | Załączniki ZIP |
| `src/lib/cloud-sync.ts` | `mergeJobsById` |
| `src/app/JobGenericAttachmentsSection.tsx` | UI admin |
| `docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md` | **★ Handoff AI** |
| `docs/RELEASE-REPORT-20.5A.10.md` | Raport release |

### Następny (tylko na polecenie)

- 20.5A.11 — inspektor read-only załączników ogólnych
- 20.3C — legacy CC + GuideView
- Roboty 2.0 FULL

---

## Zamknięte serie (prod, nie zmieniaj bez polecenia)

| Seria | Wersja | Commit | Handoff |
|-------|--------|--------|---------|
| **Generic Attachments** | **2.50.52** | **`e6758e5`** | [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |
| File Consistency | 2.50.51 | `09a8284` | ARCHITECTURE § 12.1.2 (20.5B.3) |
| Inspector Admin | 2.50.48 | — | smoke 20.5B.2 |
| Plan techniczny | 2.50.47 | — | smoke 20.5A.9 |
| Media separation | 2.50.46 | — | smoke 20.5A.8 |
| Billing Proposal | 2.50.44 | `99295e5` | [`SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md) |
| CC polonizacja | 2.50.43 | `61cb33b` | [`SESSION-HANDOFF-20.3B-CC-POLISH.md`](docs/SESSION-HANDOFF-20.3B-CC-POLISH.md) |
| Desktop/mobile MID-B | 2.50.x | `5a664c2` | [`SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md`](docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md) |

# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.47** — Plan techniczny PDF 20.5A.9  
**Prod `origin/main`:** **`134431f`** · v2.50.46 · https://www.wgdom.fun  
**Status:** **IMPLEMENT lokalny 20.5A.9** · **bez commit / push / deploy**  
**Handoff:** [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)

---

## Sprint 20.5A.9 — Technical Drawing Workflow (**IMPLEMENT lokalny**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.47** |
| **Zakres** | `plan_techniczny` PDF · sync `documents.rysunek` · admin upload · inspektor read-only |

### Smoke / build (lokalnie)

| Test | Wynik |
|------|-------|
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-inspector-billing-proposal-20.5a6.mjs` | **59/59 PASS** |
| `npm run build` | **PASS** |

### Kluczowe pliki

`job-documents.ts` · `JobsView.tsx` · `InspectorJobFileUpload.tsx` · `media-separation.ts` · `job-documents-pack.ts`

### Następny

Commit + deploy na polecenie użytkownika.

---

## Sprint 20.5A.8 — Media Library UX Scope A (**RELEASED** prod)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.46** |
| **Commit** | **`134431f`** |
| **Deploy** | **4990788355** |

---

## Backlog (bez polecenia)

- Generic attachments poza zlec/kosz/plan (osobny sprint)

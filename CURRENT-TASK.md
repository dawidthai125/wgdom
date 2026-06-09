# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.45** — Role Visibility 20.5A.7  
**Prod `origin/main`:** **2.50.44** · `99295e5` · https://www.wgdom.fun  
**Status lokalny:** **IMPLEMENT DONE** · **bez commit / push / deploy**  
**Handoff:** [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)

---

## Sprint 20.5A.7 — Role Visibility Hardening (**IMPLEMENT DONE, lokalnie**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.45** |
| **Commit** | *(brak — czeka na COMMIT GO)* |
| **Zakres** | UI-only — `visibleRoleLabelForViewer`, AuthorAttribution, SMS, Do rozliczenia, topbar |

### Smoke / build

| Test | Wynik |
|------|-------|
| `smoke-test-role-visibility-20.5a7.mjs` | **34/34 PASS** |
| `smoke-test-inspector-billing-proposal-20.5a6.mjs` | **59/59 PASS** |
| `npm run build` | **PASS** |

### Kluczowe pliki

- `src/lib/role-visibility.ts` — źródło prawdy polityki
- `src/lib/content-author-contact.ts` — filtr końcowy `roleLabel`
- `src/app/AuthorAttribution.tsx` — wymagany `viewerRole`
- `scripts/smoke-test-role-visibility-20.5a7.mjs`

### Następny krok

Commit + push → Vercel deploy → prod smoke (po zatwierdzeniu użytkownika).

---

## Release 2.50.44 — Billing Proposal 20.5A.6 (**RELEASED na prod**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.50.44** |
| **Commit** | **`99295e5`** |
| **Deploy** | GitHub **`4990132607`** — **SUCCESS** |

Pełny opis → [`docs/RELEASE-REPORT-20.5A.6.md`](docs/RELEASE-REPORT-20.5A.6.md)

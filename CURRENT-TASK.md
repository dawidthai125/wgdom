# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-13 · **P3.5 CLOSED (v2.56.1)**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.56.1 (P3.5 — ceny per pozycja kosztorysu)

P3.5 Auto podkładanie cen (read-only) — CLOSED
P3.1 UX Wycena — CLOSED
P3.2.0 Baza cen — CLOSED
P2-H STREAM FULLY CLOSED
UX.1 · P2-F · Dashboard V3 · P1 CLOSED
```

**Baseline prod (app):** v2.56.1 · commit `feat(pricing): show catalog pricing per cost item`  
**Poprzedni:** v2.56.0 (P3.1/P3.2.0)  
**Prod:** https://www.wgdom.fun

---

## SKOŃCZONE W OSTATNIEJ SESJI (2026-06-13)

- **P3.5** — `buildCatalogLinePricingView()` + `TenderCatalogLinePricingSection` w Wycena → Szczegóły → Pozycje kosztorysowe (read-only)
- Podsumowanie kategorii, źródło ceny (Baza cen / Katalog WGDOM), alert UNKNOWN + linki do Bazy cen i słownika klasyfikacji
- Test: `test-tender-price-base.mjs` · regresje cost-intelligence + dossier PASS · build OK

---

## NASTĘPNE (na polecenie)

- **P3.3** — benchmark robocizny (import/licencjonowane źródła)
- **P3.5B** — override cen per przetarg (jeśli potrzeba)
- **P2-G.3C** — benchmark podobieństwa kosztorysów

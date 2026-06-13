# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-13 · **P3.1 + P3.2.0 CLOSED (v2.56.0)**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.56.0 (P3 Foundation — Wycena UX + Baza cen)

P3.1 UX Wycena — CLOSED
P3.2.0 Baza cen — CLOSED
P2-H STREAM FULLY CLOSED
UX.1 · P2-F · Dashboard V3 · P1 CLOSED
```

**Baseline prod (app):** v2.56.0 · commit po push P3 Foundation  
**Poprzedni:** v2.55.10 (P2-H.5C/5D)  
**Prod:** https://www.wgdom.fun

---

## SKOŃCZONE W OSTATNIEJ SESJI (2026-06-13)

- **P3.1** — `TenderBidProposalPanel` hero KPI (koszt własny · marża · cena oferty), alerty max 3, szczegóły zwinięte
- **P3.2.0** — zakładka **Przetargi → Baza cen** (`TenderPriceBasePanel`), reuse `kw-wgdom-cost-catalog` + `costModel`
- Testy: cost-intelligence 363 PASS · dossier pipeline PASS · build OK

---

## NASTĘPNE (na polecenie)

- **P3.5** — auto podkładanie cen do pozycji kosztorysowych (per wiersz)
- **P2-G.3C** — benchmark podobieństwa kosztorysów (fundament gotowy po P3)

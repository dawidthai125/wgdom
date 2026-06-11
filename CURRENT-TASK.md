# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11  
**Current Version:** **2.50.69**  
**Current Baseline:** **Inspector Communication Templates 2.1.0**  
**Prod `origin/main` (app):** *(po push tej sesji)* · v2.50.69 · https://www.wgdom.fun  
**Poprzedni release:** **`79174b3`** — workflow docs · **`add9338`** — hotfix payroll · **`65f3a8d`** — 20.7E

**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## Werdykt sesji

```text
INSPECTOR COMMUNICATION TEMPLATES 2.1.0 — MVP RELEASE
Szablony A–D, Kontakt z inspektorem, isInspector, send-job-email mode
```

---

## Skończone (2.1.0)

- Roboty: przycisk „Kontakt z inspektorem” + modal `JobInspectorContactModal`
- Szablony A–D + auto-sugestia (`inspector-message-templates.ts`)
- Kontakty: `isInspector` / „Inspektor WM”
- Edge: `send-job-email` + `mode: inspector_template`
- Activity log: `email_sent` + nazwa szablonu
- Smoke: `scripts/smoke-test-inspector-templates-2.1.mjs` (18/18 PASS)
- Docs: CHANGELOG, GuideView, ARCHITECTURE § 9.2

---

## Następne (backlog 2.1.x)

- Szablon E (podziękowanie)
- CRM / historia konwersacji — poza scope MVP

---

## Uwaga deploy

Zmiana `supabase/functions/make-server-0afb8820/index.tsx` wymaga deploy Edge (GitHub Action po push). Bez tego wysyłka szablonu może zwracać „Brak treści do wysłania” na prod.

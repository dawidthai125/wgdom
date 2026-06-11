# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11  
**Current Version:** **2.50.70**  
**Current Baseline:** **Default Inspector Recipient 2.1.1**  
**Prod `origin/main` (app):** *(po push tej sesji)* · v2.50.70 · https://www.wgdom.fun  
**Poprzedni release:** **`5391d03`** — Inspector Communication Templates 2.1.0 · v2.50.69

**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## Werdykt sesji

```text
DEFAULT INSPECTOR RECIPIENT 2.1.1 — RELEASE
isDefaultInspector, resolveDefaultInspectorContact, modal UX, Kontakty badge
```

---

## Skończone (2.1.1)

- Model: `EmailContact.isDefaultInspector` (max jeden, wymaga `isInspector`)
- Helpery: `contactIsDefaultInspector`, `resolveDefaultInspectorContact`, `applyDefaultInspectorContact`
- Kontakty: checkbox „Domyślny odbiorca inspektora”, badge „Inspektor” + „Domyślny”
- Modal: auto-odbiorca, „Zmień odbiorcę”, hint wysyłki testowej, powitanie po zmianie
- Smoke: `scripts/smoke-test-inspector-templates-2.1.mjs` (rozszerzony)
- Docs: CHANGELOG 2.50.70, GuideView, ARCHITECTURE § 9.2

---

## Skończone wcześniej (2.1.0)

- Roboty: przycisk „Kontakt z inspektorem” + modal `JobInspectorContactModal`
- Szablony A–D + auto-sugestia (`inspector-message-templates.ts`)
- Kontakty: `isInspector` / „Inspektor WM”
- Edge: `send-job-email` + `mode: inspector_template`
- Activity log: `email_sent` + nazwa szablonu

---

## Następne (backlog 2.1.x)

- Szablon E (podziękowanie)
- CRM / historia konwersacji — poza scope MVP

---

## Uwaga operacyjna (prod)

Po deploy **2.1.1** oznacz Szymona w Kontaktach jako „Domyślny odbiorca inspektora” (przy wielu `isInspector` bez oznaczenia modal wymaga ręcznego wyboru). Edge **bez zmian** w 2.1.1.

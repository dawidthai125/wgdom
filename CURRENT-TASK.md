# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11 · **SESSION CLOSEOUT**  
**Current Version:** **2.50.70**  
**Current Baseline:** **Default Inspector Recipient 2.1.1 + housekeeping**  
**Prod `origin/main`:** v**2.50.70** · https://www.wgdom.fun · **PRODUCTION VERIFIED**

**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## Werdykt sesji (CLOSED)

```text
SESSION CLOSEOUT — 2026-06-11
BASELINE 2.50.70 · RELEASED · STABLE · PRODUCTION VERIFIED
Inspector 2.1.0 + 2.1.1 COMPLETE · 2.1.2 CANCELLED
Housekeeping .gitignore (77e1052)
Ready for new GPT / new Cursor agent
```

---

## Commity baseline

| SHA | Opis |
|-----|------|
| **`ee2cd72`** | feat(jobs): default inspector recipient (2.1.1) · v2.50.70 |
| **`77e1052`** | chore(git): ignore local audit and smoke artifacts |
| **`5391d03`** | feat(jobs): inspector communication templates (2.1.0) · v2.50.69 |
| **`79174b3`** | docs: unify WGDOM release/deploy workflow (A/B/C) |
| **`add9338`** | fix(payroll): extraCostStatus helpers hotfix |
| **`65f3a8d`** | feat(dashboard): dashboard IA cleanup (20.7E) · v2.50.68 |

---

## Skończone w tej serii sesji

### Inspector Communication Templates 2.1.1 (v2.50.70 · `ee2cd72`)

- `isDefaultInspector`, helpery resolve/apply
- Modal: domyślny odbiorca, „Zmień odbiorcę”, wysyłka testowa
- Kontakty: badge Domyślny
- Smoke rozszerzony · docs · **PRODUCTION VERIFIED**

### Inspector Communication Templates 2.1.0 (v2.50.69 · `5391d03`)

- Szablony A–D, modal, `isInspector`, Edge `inspector_template`
- **PRODUCTION VERIFIED**

### Repo housekeeping (`77e1052`)

- `.gitignore` P0+P1 · untracked 49 → 19

### Wcześniej na `main` (w tej linii czasu)

- **20.7E** Dashboard IA Cleanup · v2.50.68 · `65f3a8d`
- Hotfix payroll · `add9338`
- Workflow SSOT · [`WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md) · `79174b3`

---

## Decyzje produktowe (wiążące)

### 2.1.2 Job Correspondence Recipients — **CANCELLED**

- **Nie implementować**
- Powód: problem danych („Walidacja 2.1”), konfiguracja Kontaktów — nie architektura
- **Zostaje:** „Kontakt z inspektorem”, `isInspector`, „Domyślny odbiorca inspektora” (2.1.0 + 2.1.1)

### Workflow

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

Workflow release: **A / B / C** — patrz [`WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md). **VERIFY DEPLOY FAST:** jedno `curl version.json` po push, bez retry/sleep/polling API.

---

## Następne

```text
Brak otwartego sprintu w Inspector Communication Templates.
Nowy feature — tylko na polecenie użytkownika po AUDIT.
```

**Backlog (bez polecenia):** szablon E, CRM inspektora, 2.1.2 (odrzucony).

---

## Uwaga operacyjna (prod)

1. Usuń duplikaty testowe **„Walidacja 2.1”** z Kontaktów (dane walidacji 2.1.0).
2. Oznacz **Szymona** jako **„Domyślny odbiorca inspektora”** (przy wielu `isInspector`).
3. Edge **bez zmian** od 2.1.1 — tylko frontend na prod.

---

## Szybki start (nowy agent)

1. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
2. [`AGENTS.md`](AGENTS.md) → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
3. `curl -s https://www.wgdom.fun/version.json` → baseline **2.50.71** (jedno sprawdzenie; przy release: PASS lub DEPLOY PROPAGATING)

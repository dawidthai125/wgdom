# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** (czytaj też `.cursor/rules/wgdom-stan-projektu.mdc`).

**Ostatnia aktualizacja:** 2026-06-03  
**Wersja UI:** `2.45.23` (`changelog-data.ts`) — ETAP **8.0A** lokalnie (jeden pipeline Classic × CC)  
**Prod (`main`):** https://www.wgdom.fun · ostatni znany deploy **8.0** (`d1b888e`) — **8.0A czeka na push**  
**Docs 7G:** commit dokumentacji po `7d49be2` (ten push)  
**Gałąź robocza:** `audit-before-cleanup` @ **`7eaf7ee`** (snapshoty + UI media — **nie prod**)

---

## Co jest skończone

### ETAP 8.0A — jeden runtime pipeline (lokalnie, 2026-06-03)

| Element | Plik |
|---------|------|
| Classic → wspólny pipeline | `TendersView.tsx` → `useCommandCenterContext().snapshot.pipeline` |
| R1 safeguard | `reloadFromStorage()` w `useTendersPipeline.ts` |
| Jedyna instancja hooka | `CommandCenterContext.tsx` L102 |
| Docs | `docs/tender-center-7g-executive.md` |

**Smoke po deploy:** Create Job Classic → CC „Otwórz robotę” bez F5; odwrotnie CC → Classic.

### ETAP 8.0 — roboty z CC (prod `d1b888e`)

Wspólny `executeCreateJobFromTender` + `TenderJobLinkButtons` — bez zmian w 8.0A.

### ETAP 7G — Pulpit × COMMAND CENTER AI (prod `7d49be2`)

| Element | Plik / uwagi |
|---------|----------------|
| Executive panel na pulpicie | `CommandCenterExecutivePanel.tsx` |
| Wspólny snapshot | `useCommandCenterExecutiveSnapshot.ts` |
| Refactor CC | `OwnerDashboard.tsx` używa hooka; `financialCapacityEnabled: false` (hotfix Impact) |
| Legacy stats | `tenderDashStats` w `App.tsx` — **UI nie czyta** |
| Dokumentacja AI | [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md) |

**Smoke prod:** `index-CwKd3AmM.js`, lazy `TenderCenterProView-CeptbaCg.js`, stringi executive w bundlu.

### Czerwiec 2026 — stabilność sync (prod)

| Commit | Temat |
|--------|--------|
| `db1d05a` | Payroll Guard |
| `c9db032` | P11 bootstrap payroll merge |
| `92d574e` | P15 admin-passwords merge |

Szczegóły → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)

### COMMAND CENTER (wcześniejsze ETAPy na prod)

| Commit | Temat |
|--------|--------|
| `b95120a` | Fix TDZ `OwnerDashboard` (kolejność hooków) |
| `4e7aa8d` | ETAP 7F onboarding / słownik / tooltips |
| `7125a86` | Hotfix import `MetricHelpTooltip` |

---

## W trakcie / lokalnie (NIE na `main`)

- Gałąź **`audit-before-cleanup`** @ `7eaf7ee` — UI media filter, snapshoty KV (nie prod)
- **`dist-audit/`** — lokalny build audytowy, nie commitować

---

## Następne (propozycje — nie ETAP 8 bez polecenia)

1. **Optymalizacja 7G** — wspólny load pipeline (App legacy stats vs hook); ewentualny lazy executive panel
2. **Przywrócenie Impact** w `OwnerDashboard` (`financialCapacity` ≠ null) — po stabilizacji 6C/6D
3. **UI Media Cleanup** — cherry-pick z `audit-before-cleanup`
4. **Deprecate `tenderDashStats`** — po weryfikacji że nic nie czyta legacy fetch

---

## Szybki start dla nowego agenta

```text
1. AGENTS.md
2. PROJECT-GUIDE.md
3. docs/tender-center-7g-executive.md   ← pulpit + CC (7G)
4. docs/ARCHITECTURE.md  → § 6.1, § 12.1.3
5. docs/INCIDENTS-2026-06.md
6. CURRENT-TASK.md (ten plik)
7. CHANGELOG.md
```

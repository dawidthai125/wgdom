# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Current Version:** **2.50.57**  
**Current Baseline:** **RELEASED · STABLE** (deploy w toku)  
**Prod `origin/main` (app):** _TBD po push_ · https://www.wgdom.fun  
**Deploy:** _TBD_  
**Status:** Sprint **20.5B.6A.4** — **RELEASE IN PROGRESS**

---

## Sprint 20.5B.6A.4 — Worker Mobile UX (**RELEASE**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.57** |
| **Commit** | _TBD_ |
| **Deploy** | _TBD_ |
| **Zakres** | Progress flow, CTA, baner, mobile forms (`layout="worker"`) |
| **Model/sync** | **Bez zmian** |

**Raport:** [`docs/RELEASE-REPORT-20.5B.6A.4.md`](docs/RELEASE-REPORT-20.5B.6A.4.md)

**Smoke lokalne:** 32/32 + regresja PASS · **Prod:** `smoke-prod-bundle-2.50.57.mjs`

---

## Poprzedni baseline prod (20.5B.7)

| Sprint | Wersja | Skrót |
|--------|--------|-------|
| **20.5B.7** | 2.50.56 | Version Awareness — banner odświeżenia |
| **20.5B.6A.1** | 2.50.55 | Raporty → Dokumentacja (copy only) |
| **20.5B.5** | 2.50.54 | Roboty UX Pack — filtr, Socjalny, piec |
| **Audyt ops** | — | Worker/Admin/Inspector **GO** |

**Handoff zbiorczy:** [`docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md`](docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md)  
**Audyt:** [`docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md)

---

## Podsumowanie — 20.5B.7 Version Awareness & Update Banner

Wykrywanie nowej wersji po deployu — porównanie `APP_VERSION` z `/version.json`. Globalny banner z ręcznym odświeżeniem; brak auto-reload. Rozwiązuje problem starych kart SPA po wdrożeniu.

**Kluczowe elementy:**

- **APP_VERSION** w main bundle (vite define z `CHANGELOG[0]`)
- **`/version.json`** generowany przy buildzie
- **Polling** co 5 minut
- **Focus** i **visibilitychange** — sprawdzenie przy powrocie do karty
- **Update banner** — „Dostępna nowa wersja WGDOM”
- **Manual refresh** — „Odśwież teraz” → `location.reload()`
- **Później** — dismiss sesji (`sessionStorage`)

**Raport:** [`docs/RELEASE-REPORT-20.5B.7.md`](docs/RELEASE-REPORT-20.5B.7.md)

---

## ★ START HERE (agent AI)

```text
1. CURRENT-TASK.md                    ← ten plik
2. docs/PROJECT-HANDOFF.md            ← baseline prod
3. docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md  ← ★ ostatnia sesja
4. docs/RELEASE-REPORT-20.5B.7.md      ← Version Awareness
5. docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md  ← worker flow GO
6. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md
7. docs/ARCHITECTURE.md § 9.1 + § 13.1
8. AGENTS.md
```

---

## Sprint 20.5B.7 — Version Awareness (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.56** |
| **Commit** | **`1be7a80`** |
| **Deploy** | **`4995835869`** |
| **CI Mobile** | **`27235143622`** SUCCESS |
| **Zakres** | version.json, APP_VERSION, banner, manual refresh |

### Smoke / build (release)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `smoke-test-app-version-check-20.5b7.mjs` | **10/10 PASS** |
| Regresja 20.5A.8 / 20.5A.9 / MID-B | **PASS** |
| Prod bundle `2.50.56` | **14/14 PASS** |
| CI Mobile `#27235143622` | **PASS** |

### Następny (tylko na polecenie)

- 20.5B.7C — optional auto refresh (backlog, domyślnie OFF)
- 20.5B.6A.2 — kolejność tabów / worker sub-nav
- 20.3C — legacy CC + GuideView

---

## Poprzedni release — 20.5B.6A.1 / 2.50.55

| Pole | Wartość |
|------|---------|
| **Commit** | **`782fe87`** |
| **Deploy** | **`4995467947`** |
| **Handoff** | [`RELEASE-REPORT-20.5B.6A.1.md`](docs/RELEASE-REPORT-20.5B.6A.1.md) |

---

## Audyt operacyjny — Worker & Inspector Readiness

| Obszar | Wynik |
|--------|-------|
| Worker / Admin / Inspector | **PASS** |
| **Final** | **GO** |

Sprinty 20.5B.5–7 nie naruszyły pipeline upload/sync.

**Raport:** [`docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md)

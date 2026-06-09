# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Current Version:** **2.50.56**  
**Current Baseline:** **RELEASED · STABLE**  
**Prod `origin/main` (app):** **`1be7a80`** · https://www.wgdom.fun  
**Deploy:** **`4995835869`**  
**Status:** Sprint 20.5B.7 CLOSED

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
3. docs/RELEASE-REPORT-20.5B.7.md      ← ★ ostatni release
4. docs/RELEASE-REPORT-20.5B.6A.1.md  ← Dokumentacja Naming
5. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md
6. docs/ARCHITECTURE.md § 13.1
7. AGENTS.md
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

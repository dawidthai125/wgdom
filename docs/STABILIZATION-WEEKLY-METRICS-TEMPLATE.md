# STABILIZATION WEEKLY METRICS — szablon SSOT

> **Status:** **SSOT** · raport tygodniowy okresu stabilizacji po NG-04  
> **Częstotliwość:** raz w tygodniu  
> **Plan okna:** [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md)  
> **Bez zmian:** workflow release, kod aplikacji — wyłącznie uzupełnianie tego szablonu

---

## Powiązane dokumenty (SSOT)

| Dokument | Rola |
|----------|------|
| [`CURRENT-TASK.md`](../CURRENT-TASK.md) | Status stabilizacji · baseline prod |
| [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) | Verify deploy · `version.json` · docs-only · DEPLOY PROPAGATING |
| [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) | Zakres monitoringu modułu Przetargi |
| [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) | Rejestr incydentów P0 · definicje RCA |
| [`NG-04-EPIC-CLOSE-REPORT.md`](NG-04-EPIC-CLOSE-REPORT.md) | Baseline zamknięcia epicu · Principles #001–#010 frozen |
| [`src/app/changelog-data.ts`](../src/app/changelog-data.ts) | SSOT wersji UI (`CHANGELOG[0].version`) |

**Prod verify (jedno sprawdzenie w dniu raportu):**

```bash
curl -s https://www.wgdom.fun/version.json
```

---

## Definicje pól

| Pole | Definicja |
|------|-----------|
| **Wersja produkcyjna** | Pole `version` z prod `version.json` w dniu raportu. SSOT UI: `changelog-data.ts` → build → `dist/version.json`. |
| **Commit** | Pole `commit` z prod `version.json` (krótki SHA buildu wdrożonego na Vercel). |
| **Hotfixy** | Liczba commitów na `main` z poprawką prod między raportami (`fix:` / hotfix / patch). Nie wliczać samych zmian docs bez deployu UI. |
| **Regresje** | Potwierdzone cofnięcia zachowania vs tydzień poprzedni (test lub prod). |
| **Incydenty P0** | Prod down, utrata danych, sync 402/egress, ZI preservation fail, pipeline Przetargi całkowicie zablokowany. Szczegóły → `INCIDENTS-2026-06.md`. |
| **Zgłoszenia użytkowników** | Jawne zgłoszenia (notatka, rozmowa) przypisane do obszaru. Wewnętrzne obserwacje bez zgłoszenia → nie wliczać. |

### Docs-only release

Push na `main` **bez** nowego wpisu w `changelog-data.ts` / CHANGELOG (np. same pliki `docs/`).  
`version.json` na prod **może pozostać na poprzedniej wersji** — deploy jest poprawny, jeśli push SUCCESS.  
W raporcie tygodniowym: wersja i commit **bez zmian** vs poprzedni tydzień; w uwagach wpisz `docs-only` (nie mylić z brakiem aktywności).

Źródło: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) §2, §3.1 — **PRODUCTION VERIFIED: NIE DOTYCZY**.

### Deploy propagating

Push na `main` **SUCCESS**, ale `version.json` na prod w dniu raportu nadal pokazuje **poprzednią** wersję/commit (Vercel jeszcze nie zbudował lub build w toku, zwykle ~1–3 min).  
W raporcie: wpisz odczytany stan prod + uwaga `DEPLOY PROPAGATING`. Przy kolejnym tygodniu lub po incydencie sprawdź, czy wersja doszła.  
**Nie** stosuj retry/poll w pętli — zgodnie z WORKFLOW §3.3.

Źródło: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) §3.1–3.2.

### Mapowanie obszarów zgłoszeń

| Obszar | Zakres |
|--------|--------|
| **Przetargi** | Pipeline, BOQ Explorer, workspace, dokumenty, wycena, trust |
| **Payroll (Lista Płac)** | Lista Płac, grafik, przydziały robót, merge `workEntries` |
| **Cloud Sync** | Zapis/odczyt chmury, egress, „Failed to fetch”, „Zapisz tydzień” |
| **Mobile** | PWA, WebView, touch, scroll, widoki &lt;1024 px |

---

## Szablon raportu (kopiuj poniżej)

Zapisuj wypełnione raporty jako `docs/stabilization-weekly/STABILIZATION-WEEKLY-W##-YYYY-MM-DD.md` — patrz [`stabilization-weekly/README.md`](stabilization-weekly/README.md).

```markdown
# STABILIZATION WEEKLY METRICS

**Tydzień stabilizacji:** W__ / __
**Zakres dat:** YYYY-MM-DD (pon) → YYYY-MM-DD (nd)
**Data raportu:** YYYY-MM-DD
**Autor:** _______________

---

## Metryki produkcyjne

| Metryka | Wartość |
|---------|---------|
| **Wersja produkcyjna** | |
| **Commit** | |

_Uwaga prod (opcjonalnie):_ `—` / `docs-only` / `DEPLOY PROPAGATING`

---

## Zmiany od poprzedniego raportu

| Metryka | Liczba | Uwagi (opcjonalnie, 1 linia) |
|---------|--------|------------------------------|
| **Hotfixy** | | |
| **Regresje** | | |
| **Incydenty P0** | | |

---

## Zgłoszenia użytkowników

| Obszar | Liczba | Uwagi (opcjonalnie, 1 linia) |
|--------|--------|------------------------------|
| **Przetargi** | | |
| **Payroll (Lista Płac)** | | |
| **Cloud Sync** | | |
| **Mobile** | | |

---

## Werdykt tygodnia (jedna linia)

`STABLE` / `WATCH` / `ACTION` — _______________
```

### Werdykt tygodnia

| Werdykt | Kiedy |
|---------|-------|
| **STABLE** | 0 P0 · 0 regresji · zgłoszenia w normie |
| **WATCH** | P1 zgłoszenia lub 1 hotfix bez regresji |
| **ACTION** | P0 &gt; 0 lub regresja potwierdzona — odnotuj w notatce operacyjnej; **nie** startuj epicu automatycznie |

Kryteria zamknięcia całego okna: [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) §5.

---

## Przykład wypełnienia (W1 — baseline po NG-04.4)

| Metryka | Wartość |
|---------|---------|
| **Wersja produkcyjna** | 2.63.12 |
| **Commit** | ab6637f |
| **Hotfixy** | 0 |
| **Regresje** | 0 |
| **Incydenty P0** | 0 |
| **Werdykt** | `STABLE` — pierwszy tydzień po release NG-04.4 |

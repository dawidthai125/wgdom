# NG11-P0 — POST RELEASE · obserwacja produkcyjna

> **Program:** NG11-P0 Discovery Unification  
> **Status:** **CLOSED** — superseded przez **NG11-P0 EPIC COMPLETE** (**2.65.3** @ **`281ede1`**)  
> **Historyczny baseline:** **2.65.1** @ **`f4697f9`**  
> **SSOT epic:** [`NG11-P0-EPIC-CLOSE-REPORT.md`](./NG11-P0-EPIC-CLOSE-REPORT.md)

**SSOT closeout:** [`NG11-P0-CLOSEOUT.md`](./NG11-P0-CLOSEOUT.md) · **verify:** [`NG11-P0-RELEASE-VERIFICATION.md`](./NG11-P0-RELEASE-VERIFICATION.md)

---

## 0. Zasady (obowiązkowe)

| Reguła | Opis |
|--------|------|
| **Brak nowego programu** | Nie startuj NG11-Q4, TWSL, ani innego epicu bez **Owner GO** |
| **Brak nowych funkcji** | Zero IMPLEMENT poza P0 hotfix po incydencie + Owner GO |
| **Brak zmian w kodzie** | W oknie obserwacji — tylko zbieranie dowodów i raporty |
| **Prod jako SSOT** | Testuj na https://www.wgdom.fun · `version.json` = **2.65.1** |

---

## 1. Cel obserwacji

Zweryfikować na **kolejnych realnych przetargach** (min. **3–5** różnych pozycji, w tym co najmniej **1** historycznie „settled-empty”):

| Obszar | Co potwierdzić |
|--------|----------------|
| **Bootstrap discovery** | Po wejściu w detal **bez** „Odśwież BZP” — dokumenty pojawiają się po bootstrapie |
| **Intelligence** | Warstwa intelligence / Command widzi załączniki · brak fałszywego „brak dokumentów” |
| **Manual refresh** | „Odśwież BZP” — **ta sama** liczba i fingerprint zestawu co po auto |
| **Retry settled-empty** | Przetarg z `settled` + 0 załączników — auto **ponawia** fetch (nie skip na zawsze) |
| **Discovery SSOT** | Manual i auto przechodzą przez `discoverTenderDocumentsSSOT` — brak rozjazdu zachowania |

---

## 2. Procedura per przetarg (checklist)

```text
□ 1. Otwórz przetarg (preferuj: wcześniej auto nie znajdował dokumentów)
□ 2. NIE klikaj „Odśwież BZP” — poczekaj na bootstrap (≤60 s)
□ 3. Potwierdź: dokumenty w UI · intelligence OK · brak CTA „Pobierz dokumenty z BZP”
□ 4. Kliknij „Odśwież BZP” — zapisz liczbę dokumentów + fingerprint (nazwy/ids)
□ 5. Porównaj: auto vs manual — identyczny zestaw
□ 6. Odśwież stronę (F5) — dokumenty + intelligence nadal OK
□ 7. Zapisz: tenderId · data · wersja prod · PASS/FAIL · notatki
```

**Fingerprint (ręcznie):** posortowana lista `attachment.id` lub stabilnych URL/hash z panelu dokumentów.

---

## 3. Co zbierać (tylko to)

| Typ | Źródło | Kiedy |
|-----|--------|-------|
| **Regresje** | Opis kroku + tenderId + screenshot | Każdy FAIL |
| **Logi** | DevTools → Console: `[wgdom:discovery-snapshot]` | Przy anomalii lub próbce 1/tydzień |
| **Edge-case** | Nietypowy BZP, timeout, external fork, 0→N dokumentów | Każdy nowy wzorzec |

**Nie zbierać:** pełnych dumpów KV · danych osobowych · nie wiązać z implementacją bez Owner GO.

---

## 4. Harmonogram sugerowany

| Faza | Okres | Cel |
|------|-------|-----|
| **T0** | 2026-07-12 | Release **2.65.1** · start obserwacji |
| **T1** | tydzień 1 (do ~2026-07-19) | ≥2 realne przetargi · brak P0 |
| **T2** | tydzień 2 (do ~2026-07-26) | ≥3 łącznie · settled-empty retry potwierdzony |
| **Zamknięcie** | po T2 lub Owner GO | **POST STABILIZATION REPORT** lub **INCIDENT** |

---

## 5. Jeśli regresja → INCIDENT REPORT

Utwórz: `docs/architecture/NG11-P0-INCIDENT-REPORT-YYYY-MM-DD.md` (lub `audit/` jeśli P0 cross-cutting)

**Szablon obowiązkowych sekcji:**

1. **Summary** — co się zepsuło, dla kogo, severity P0/P1  
2. **Timeline** — wersja prod, tenderId, kroki reprodukcji  
3. **Expected vs Actual** — bootstrap / intelligence / manual / retry  
4. **Logs** — `[wgdom:discovery-snapshot]`, network BZP, błędy konsoli  
5. **RCA** — który warunek SSOT złamany (`force`, guards, `discoveryMergedItem`, persist order)  
6. **Blast radius** — ile przetargów dotkniętych  
7. **Mitigation** — workaround dla Owner (np. manual refresh)  
8. **Fix proposal** — **bez implementacji** do Owner GO  

Dodaj wpis w [`docs/INCIDENTS-2026-06.md`](../INCIDENTS-2026-06.md) jeśli **P0**.

---

## 6. Jeśli brak regresji → POST STABILIZATION REPORT

Po zamknięciu okna obserwacji utwórz: [`NG11-P0-POST-STABILIZATION-REPORT.md`](./NG11-P0-POST-STABILIZATION-REPORT.md)

**Status:** **PENDING** — wypełnić po T2 (~2026-07-26) lub na polecenie Owner.

**Wymagana rekomendacja (jedna z dwóch — Owner decyduje):**

| Opcja | Opis | Gate |
|-------|------|------|
| **A — NG11-Q4** | Edge slice pipeline performance (optional) | AUDIT + DF + Owner GO |
| **B — TWSL 2.63.91** | Tender Workspace Scrollable Layout (WIP lokalny) | Osobny bundle · Owner GO · zero mixed z LP |

**Nie implementować** żadnej opcji bez nowego **Owner GO**.

---

## 7. Rejestr obserwacji (uzupełnia Owner / agent read-only)

| Data | tenderId / opis | Auto bootstrap | Intelligence | Manual = auto | Reload | Werdykt | Notatki |
|------|-----------------|----------------|--------------|---------------|--------|---------|---------|
| — | *(puste — uzupełniaj w trakcie okna)* | | | | | | |

---

## 8. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| [`NG11-P0-CLOSEOUT.md`](./NG11-P0-CLOSEOUT.md) | Zamknięcie slice |
| [`STABILIZATION-WINDOW-PLAN.md`](../STABILIZATION-WINDOW-PLAN.md) | Okno globalne |
| [`CURRENT-TASK.md`](../../CURRENT-TASK.md) | Status bieżący |
| [`WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) | Bramka IMPLEMENT |

---

*Ostatnia aktualizacja: 2026-07-12 · **CLOSED** (Owner EPIC CLOSEOUT — P0.1-A + P0.2 PRODUCTION VERIFIED)*

# MOPS-KAMIENSKIEGO-TRIGGER-01 — INCIDENT TIMELINE RECONSTRUCTION

> **Status:** **MOPS KAMIENSKIEGO TRIGGER FORENSIC COMPLETE**  
> **ID:** MOPS-KAMIENSKIEGO-TRIGGER-01  
> **Data:** 2026-07-24  
> **Cel:** weryfikacja obserwacji Ownera vs Sync Storm RCA + kod prod  
> **Implement / commit / push:** **ZAKAZ**  
> **Powiązane:** [`MOPS-TENDER-REGRESSION-01-INCIDENT-TIMELINE.md`](MOPS-TENDER-REGRESSION-01-INCIDENT-TIMELINE.md) · [`TENDERS-SYNC-STORM-P0-*`](TENDERS-SYNC-STORM-P0-ROOT-CAUSE-FIX-PLAN.md) · [`SUPABASE-POSTGRES-RECOVERY-01.md`](SUPABASE-POSTGRES-RECOVERY-01.md)

```text
══════════════════════════════════════
MOPS KAMIENSKIEGO TRIGGER FORENSIC COMPLETE

Owner sequence ↔ Sync Storm:   ZGODNA (mechanizm)
Wielokrotna analiza:           PROVEN (kod prod tip)
PostgreSQL crash przez ten
konkretny przetarg:            NOT PROVEN
══════════════════════════════════════
```

---

## 0. Rozdział dowodów (obowiązkowy)

| Klasa | Znaczenie |
|-------|-----------|
| **OWNER OBSERVATION** | Relacja Ownera — nie jest automatycznie PROVEN |
| **PROVEN** | Kod prod tip `ef882d3` i/lub wcześniejsze RCA z dowodem |
| **NOT PROVEN** | Brak HAR / metryk per-item / korelacji z logami Postgres |

**Zakaz wnioskowania:** nie ustalamy, że otwarcie MOPS ul. Kamieńskiego **spowodowało** interrupt/recovery PostgreSQL — brak dowodu łańcucha itemId → metryki → L7.

---

## 1. OWNER OBSERVATION (sekwencja)

1. Owner otwiera przetarg: *Przebudowa budynku użyteczności publicznej ul. Kamieńskiego (MOPS Wrocław)*.  
2. Automatycznie startuje analiza dokumentów.  
3. UI wielokrotnie: „Synchronizacja…” / „Analiza dokumentów…”.  
4. Widok migocze — jak wielokrotne odświeżanie.  
5. Po wejściu w szczegóły objawy pozostają.  
6. Przeglądarka zaczyna się zawieszać.

**Status:** **OWNER OBSERVATION** (nie PROVEN jako fakt telemetryczny sesji 23.07).

**Uwaga nazewnictwa UI:** w kodzie nie ma dokładnego stringa `"Analiza dokumentów..."` ani `"Synchronizacja..."` jako jednej etykiety. Najbliższe SSOT:

| Owner | Najbliższy kod (prod) |
|-------|------------------------|
| Analiza dokumentów | `Analiza kosztorysu` (e6) · `Analiza dokumentacji` (timeline) · stepped `Analiza` · `Wyszukiwanie załączników` (e3) · `Gotowe do analizy` (e5) |
| Synchronizacja | hint e8: *„Synchronizacja z pamięcią aplikacji”* · topbar cloud *„Zapisywanie…”* (`syncStatus === "saving"`) · inspector *„Synchronizacja z chmurą”* |

→ Parafraza Ownera jest **zgodna semantycznie** z migotaniem faz `dossierBuilding` / `dossierSaving` / `autoRunning` + cloud push — **PROVEN** jako mapowanie UI; że Owner widział dokładnie te stringi — **OWNER OBSERVATION**.

---

## 2. Zgodność z Sync Storm

| Krok Ownera | Sync Storm / earlier RCA | Werdykt |
|-------------|--------------------------|---------|
| 1. Otwarcie detalu MOPS | Trigger: `openTenderDetailV4` → `useTenderPipelineRuntime` | **Zgodne** |
| 2. Auto analiza dokumentów | Bootstrap (`useTenderDocumentsBootstrap`) + heavy (`useTenderDossierHeavyLazy`) bez osobnego kliknięcia | **Zgodne · PROVEN w kodzie** |
| 3. Wielokrotne Synchronizacja / Analiza | Pętla: partial `onUpdate` → `builtAt↑` → cleanup E-RUN → restart → `dossierBuilding`/`Saving` + `persistKey` → cloud `saving` | **Zgodne · PROVEN w kodzie prod** |
| 4. Migotanie / odświeżanie | Re-render przy każdym `onUpdate` + flip flag UI + re-mount heavy | **Zgodne · PROVEN mechanicznie** |
| 5. Objawy w szczegółach | Ten sam runtime na detal V4 / panel | **Zgodne** |
| 6. Zawieszenie przeglądarki | N× heavy ZIP/PDF + stringify fat pipeline + sync — model obciążenia CPU/RAM karty | **Zgodne jako model**; że *ta* sesja zawiesiła Chrome — **OWNER OBSERVATION** |

**Odpowiedź 1:** **TAK** — sekwencja Ownera jest **zgodna** z wcześniej wykrytym Sync Storm (trigger MOPS + pętla heavy).  
Nie dowodzi sama z siebie awarii Postgres.

---

## 3. Wielokrotna analiza tego samego przetargu

**Prod tip `ef882d3`** — `useTenderDossierHeavyLazy` E-RUN deps **zawierają** `item.tenderDossier?.builtAt` (oraz `parserVersion`, `kosztorys?.ok`, `parsedAt`).

```text
cost phase → onUpdate(partial) → builtAt↑
  → useEffect cleanup (cancelled=true)
  → restart heavy dla TEGO SAMEGO itemId
  → znowu analiza / download / parse
```

| Pytanie | Werdykt |
|---------|---------|
| Czy kod **może** uruchamiać analizę wielokrotnie dla tego samego przetargu? | **PROVEN — TAK** (prod) |
| Czy inflight guard to blokuje? | Częściowo — `dossierInflightIds`; cleanup **usuwa** id i anuluje → kolejny start dozwolony |
| Czy WT Sync Storm P0 (local, niedeployowany) to zmienia? | TAK w WT (bez `builtAt` w E-RUN + circuit breaker) — **NIE na prod 23.07** |

**Odpowiedź 2:** **TAK — PROVEN w kodzie prod.**

---

## 4. Komunikaty vs restart efektów React

| Pytanie | Werdykt |
|---------|---------|
| Czy etykiety mogły wynikać z **kolejnych restartów** efektów, a nie z N niezależnych „ręcznych analiz”? | **PROVEN — TAK (mechanizm)** |
| Czy każda flaga `dossierBuilding=true` = nowa pełna analiza od zera? | **Często TAK** po cancel + restart; nie zawsze „osobny user intent” |
| Czy cloud „Zapisywanie…” = osobna analiza? | **NIE** — to skutek `persistKey` / batch-set po `onUpdate` |

**Odpowiedź 3:** Komunikaty **mogły być** (i w modelu Sync Storm **są**) skutkiem **restartów E-RUN + persist + cloud sync**, nie osobnych analiz zainicjowanych przez Ownera.

---

## 5. Instrumentacja — czy da się policzyć dla *tego* przetargu?

| Sygnał | Istnieje? | Per przetarg Kamieńskiego 23.07? |
|--------|-----------|----------------------------------|
| Liczba uruchomień heavy / E-RUN | Timing: `heavy.parse_*` / `heavy.persist_dossier` **tylko** gdy `VITE_PIPELINE_TIMING=1` (domyślnie OFF na prod) | **NOT PROVEN** — brak dumpa sesji |
| Circuit breaker `heavyRunAttempts` | Tylko w WT Sync Storm P0 (niedeploy) | **N/A na prod** |
| `getDossierTraceLog()` / `console.debug [Dossier trace]` | Buffer RAM 120; nie persystowany | **NOT PROVEN** bez konsoli z sesji |
| Liczba persistów / sync | `__wgdomSyncMetrics()` → `batchGet` / `batchSet` / `batchSetRetries` **globalnie** | **NOT PROVEN** per itemId |
| Liczba renderów React | Brak instrumentacji | **NOT PROVEN** |
| HAR Network `batch-get`/`batch-set` | Możliwy u Ownera | **NOT PROVEN** — nie dostarczony |
| Korelacja z Postgres L7 | Dashboard logs | **NOT PROVEN** dla itemu Kamieńskiego |

**Odpowiedź 4:** Instrumentacja **istnieje częściowo** (sync metrics globalne, dossier trace, optional pipeline timing), ale **nie pozwala** obecnie ustalić liczb dla **tego konkretnego** otwarcia bez artefaktów sesji Ownera.

---

## 6. Identyfikacja przetargu „Kamieńskiego”

| Fakt | Klasa |
|------|--------|
| W profilu firmy / referencjach kodu występuje MOPS Kamieńskiego (wygrany kontekst) | **PROVEN** (tekst w `tenders-bzp-company.ts`) |
| Owner otworzył **ten** rekord pipeline 23.07 | **OWNER OBSERVATION** |
| `itemId` / `tenderId` z HAR lub KV dla tej sesji | **NOT PROVEN** |

---

## 7. FINAL MATRIX

### PROVEN

- Sekwencja Ownera **pasuje mechanicznie** do Sync Storm (open MOPS → auto docs → heavy loop → UI busy → cloud persist).  
- Na prod (`ef882d3`) heavy **restartuje się** przy zmianie `builtAt` → wielokrotna analiza **tego samego** itemu jest możliwa.  
- Flagi UI `dossierBuilding` / `dossierSaving` / cloud `saving` **wyjaśniają** migotanie etykiet analizy/zapisu bez osobnych kliknięć Ownera.  
- Fix Sync Storm P0 **nie był** na prod w dniu incydentu.

### NOT PROVEN

- Że właśnie **Kamieńskiego** (a nie inny gruby detal) był jedynym triggerem dnia.  
- Liczby: N analiz / N persistów / N sync / N renderów dla tej sesji.  
- Że ta sesja UI **spowodowała** `database system was interrupted` / recovery Postgres.  
- Dokładne stringi UI widziane przez Ownera (parafraza vs SSOT).

### OWNER OBSERVATION

- Otwarcie konkretnego tytułu MOPS ul. Kamieńskiego.  
- Widoczne wielokrotne „Synchronizacja / Analiza dokumentów”.  
- Migotanie widoku i zawieszenie przeglądarki.

### REJECTED (jako wniosek z *tego* CEL)

- Twierdzenie: „MOPS Kamieńskiego = Root Cause PostgreSQL interrupt” — **odrzut jako PROVEN**; pozostaje **NOT PROVEN** (możliwy trigger w łańcuchu dnia, bez dowodu item→DB).

---

## 8. Korelacja z awarią platformy (tylko granica)

```text
OWNER OBSERVATION (Kamieńskiego open)
        ↕ zgodne mechanicznie
Sync Storm (PROVEN w kodzie)
        ↕ możliwy precipitant (NOT PROVEN metrycznie dla tego itemu)
Resource exhaustion / 57014 / Postgres interrupted (PROVEN logami DB)
```

Bez HAR + `__wgdomSyncMetrics` z sesji + timestampów Dashboard **nie** domykamy strzałki Kamieńskiego → Postgres.

```text
MOPS KAMIENSKIEGO TRIGGER FORENSIC COMPLETE
STOP
```

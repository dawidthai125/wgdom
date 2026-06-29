# P0 — Cloud Sync Failure + Supabase Egress (`exceed_egress_quota`)

> **Status:** **AUDIT COMPLETE** · **FIX OPEN** (wymaga decyzji właściciela: billing Supabase + ewentualny refactor sync)  
> **Data audytu:** 2026-06-29  
> **Projekt Supabase:** `bdpygdvfgbggermvqtys`  
> **Dla programistów:** przeczytaj **ten plik** przed jakąkolwiek zmianą `cloud-sync.ts`, `App.tsx` (runCloudSync), `CloudLoader.tsx` lub syncu przetargów.

**Powiązane:** [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) § P0 egress · [`ARCHITECTURE.md`](ARCHITECTURE.md) § 11.6 · raport skrótowy [`audit/P0-CLOUD-SYNC-EGRESS-AUDIT-REPORT.md`](../audit/P0-CLOUD-SYNC-EGRESS-AUDIT-REPORT.md)

---

## 1. Objaw produkcyjny

| Element | Wartość |
|---------|---------|
| Trigger UX | „Zapisz tydzień” (Lista Płac) — lub dowolna edycja danych admina po debounce |
| Toast | **„Nie udało się wysłać do chmurą”** |
| Opis | **`Failed to fetch`** |
| Skutek | Chmura KV **nie aktualizowana**; localStorage **nadal zapisuje** |
| Stan projektu (2026-06-29) | Supabase Gateway **402** — `exceed_egress_quota` |

---

## 2. RCA — trzy warstwy (potwierdzone runtime)

### 2.1 Warstwa przeglądarki

- `fetch()` do `.../batch-set` rzuca **`TypeError: Failed to fetch`**
- Playwright/Chromium: **`net::ERR_FAILED`** — **brak** `res.status` w JS
- Request **opuszcza** przeglądarkę (faza `request` widoczna), ale **brak fazy `response`**

### 2.2 Warstwa Node/curl (ta sama sieć)

- HTTP **402 Payment Required**
- Body: `Service for this project is restricted due to the following violations: exceed_egress_quota`
- CORS: **`access-control-allow-origin: *`** — **nie** jest to klasyczny CORS block

### 2.3 Warstwa aplikacji (kod)

- Toast pochodzi z `App.tsx` → `runCloudSync` → `catch` (nie Payroll Guard — inny komunikat)
- Miejsce rzutu: `cloud-sync.ts` → `pushKeysToCloud` → `fetch(\`${API_BASE}/batch-set\`)`
- **Edge handler `batch-set` nie jest wykonywany** — blokada na bramce Supabase **przed** Deno

**URL runtime (prod):**

```text
POST https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/batch-set
```

---

## 3. Ścieżka „Zapisz tydzień” (bez `persistKey`)

```text
PayrollView → saveWeek / doSaveWeek
  → setSavedWeeks (useLocalStorage → kw-archive)     ← lokalnie OK
  → toast „Tydzień zapisany”
  → triggerWeeklyBackupEmail (osobny fetch, niedziela)
  → useEffect(savedWeeks, …) → scheduleAutoCloudSync (debounce 2 s)
  → runCloudSync
      → batch-get (41 kluczy)
      → applyAdminDataBundle
      → pushMergedDataBundleToCloud → batch-set (39 kluczy)
      → pushOperationalNotesToCloud (batch-get + batch-set)
```

**`persistKey()` nie jest wywoływane** na tej ścieżce — auto-sync bundle jest SSOT pushu admina.

---

## 4. Egress — skąd transfer (model code-based)

> Brak logów Dashboard przy 402. Szacunki z analizy kodu + typowych rozmiarów KV.

### 4.1 TOP źródła egress OUT (szac. udział)

| # | Źródło | Udział | Mechanizm |
|---|--------|--------|-----------|
| 1 | **`runCloudSync` → `batch-get` pełny bundle** | 35–45% | 41 kluczy × każda edycja (po 2 s debounce) |
| 2 | **`pullFromCloudAndMerge` (focus/visibility)** | 25–35% | Ten sam pełny `batch-get` przy powrocie do karty |
| 3 | **`kw-archive` w bundle** | 10–15% | Rośnie z każdym „Zapisz tydzień” (pełny snapshot tygodnia) |
| 4 | **`kw-jobs` w bundle** | 8–12% | Zdjęcia URL, raporty, workEntries, activity |
| 5 | **Przetargi `zip-entry-bytes` / `document-bytes`** | 5–15% | Spiki do 128 MB (base64 w JSON) |
| 6 | **Inspektor poll 120 s** | 3–8% | `batch-get` 11 kluczy |
| 7 | **`tenders-bzp-search`** (auto ~20 h) | 2–5% | Duży JSON listy BZP |
| 8 | **CloudLoader + deferred bootstrap** | 2–4% | 13 + 25 kluczy na start sesji |
| 9 | **`kosztorys-preview`** | 1–5% | Do 12 MB / wywołanie |
| 10 | **`send-backup-email`** | <2% egress OUT | Duży **ingress** (pełne `DATA_KEYS` w POST) |

### 4.2 Jedno `runCloudSync` = ile HTTP?

| Krok | Endpoint | Klucze |
|------|----------|--------|
| merge | `batch-get` | 41 |
| aux | `batch-get` | 3 (+ security/wm-druk w pull focus) |
| push | `batch-set` | 39 |
| notatki | `batch-get` + `batch-set` | 4 + 4 |
| (opt) | Payroll Guard `batch-get` | 1 |

**Szac. response `batch-get`:** **2–10 MB** (typowo ~4 MB).  
**`batch-set` request:** podobny rozmiar — głównie **ingress**, nie egress.

### 4.3 Endpointy — częstotliwość w kodzie

| Endpoint | Częstość | Pełne dane? |
|----------|----------|-------------|
| `batch-get` | Bardzo wysoka | **TAK** |
| `batch-set` | Wysoka (każdy sync) | **TAK** — cały `DATA_KEYS` |
| `send-backup-email` | ≤1/tydzień (niedziela) | **TAK** — wszystkie `DATA_KEYS` w body |
| `data-backup-status` | Przy zmianie liczników w `App.tsx` | NIE (liczniki) |
| `health` | **Brak w UI prod** | — |
| `storage-upload` | Per plik | Plik IN; odpowiedź ~300 B |

---

## 5. Zachowania sync — audyt mechanizmów

| Pytanie | Werdykt |
|---------|---------|
| Pełny bundle przy każdej zmianie? | **TAK** — `pushMergedDataBundleToCloud` |
| Backup email pełne dane? | **TAK** — `collectLocalBackupData()` |
| Zapętlone retry przy błędzie? | **NIE** — max 1 `pendingCloudSyncRef` po zakończeniu sync |
| Focus = nadmiarowe batch-get? | **TAK** — `pullFromCloudAndMerge` bez push |
| Debounce 2 s działa? | **TAK** — ale nie zmniejsza rozmiaru payloadu |
| Bootstrap suppress | 60 s po CloudLoader (`BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS`) |
| applyAdminDataBundle suppress | +4.5 s `suppressAutoSyncUntilRef` |

**Pliki SSOT:** `App.tsx` (`runCloudSync`, `scheduleAutoCloudSync`, `pullFromCloudAndMerge`), `cloud-sync.ts`, `CloudLoader.tsx`, `weekly-backup-email.ts`.

---

## 6. Co NIE jest przyczyną (wykluczone audytem)

| Hipoteza | Werdykt |
|----------|---------|
| Payroll Guard | **NIE** — inny toast |
| Brak `VITE_SUPABASE_*` | **NIE** — inny komunikat |
| CORS | **NIE** — ACAO `*` na bramce |
| Limit rozmiaru body (125 B też pada) | **NIE** |
| Pusty URL | **NIE** — URL poprawny w runtime |
| Bug pojedynczego endpointu | **NIE** — globalna blokada projektu |

---

## 7. Akcje właściciela (poza kodem)

1. **Supabase Dashboard** → projekt `bdpygdvfgbggermvqtys` → Billing / Usage → **`exceed_egress_quota`**
2. Upgrade planu lub usunięcie spend cap
3. Weryfikacja: `GET .../health` → **200** (nie 402)
4. Po odblokowaniu: Dashboard → Egress breakdown per Edge path

---

## 8. Backlog fix (tylko na polecenie — nie implementować w tym audycie)

| Priorytet | Kierunek | Uwagi |
|-----------|----------|-------|
| P0 ops | Odblokować billing Supabase | Bez tego **żaden** sync nie działa |
| P1 | Delta-sync / partial keys zamiast pełnego bundle | Największy wpływ na egress |
| P1 | Focus pull — throttling lub mniejszy zestaw kluczy | Duplikuje `batch-get` |
| P2 | `kw-archive` — snapshot diff zamiast pełnej kopii tygodnia | Rośnie monotonicznie |
| P2 | Telemetry: log rozmiaru batch-get/batch-set w dev | Observability |

**Zakaz bez briefu:** zmiana semantyki merge P11/P15/Payroll Guard przy refactorze sync.

---

## 9. Komendy diagnostyczne (po odblokowaniu projektu)

```bash
# Szybka weryfikacja bramy (oczekiwane 200, nie 402)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/health"

# Pełny audyt migracji (batch-get + statusy)
node scripts/full-audit-post-migration.mjs
```

---

## 10. Werdykt audytu

| Pole | Wartość |
|------|---------|
| **Klasa** | **Ops / quota** + **architektura sync amplifikuje egress** |
| **Blokada prod sync** | **TAK** — `exceed_egress_quota` |
| **Fix kodu wymagany do odzyskania quota** | **NIE** — najpierw billing |
| **Fix kodu zalecany długoterminowo** | **TAK** — delta-sync, focus throttle |
| **Status** | **AUDIT CLOSED** · **IMPLEMENT OPEN** |

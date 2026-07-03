# PAYROLL — PR-PAY-S7 · Cloud Batch 500 Investigation · AUDIT

> **Status:** `AUDIT COMPLETE` · `S7-1 DONE` · `OBSERVATION — WAITING FOR PRODUCTION EVIDENCE` · **S7-2: NO GO (warunkowe)**
> **Data audytu:** 2026-07-03
> **Baseline prod:** **GREEN** · **HEAD `1b7bb73`** · **S7-1 deployed `4c38f4f`**
> **STABILIZATION WINDOW:** ACTIVE
> **Powiązane:** PR-PAY-S2 (Deletion Tombstones) · PR-PAY-S6 (Archive Restore Eligibility Guard, `d2a3d90`) · [`docs/PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md`](PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md) (Edge parity)

```text
AUDIT:         COMPLETE (analiza statyczna Edge + klient)
CEL:           Przyczyna batch-set HTTP 500 podczas synchronizacji Payroll
RCA:           MOST PROBABLE — batch-set bez obsługi błędów; cały bundle w jednym kv.mset;
               najprawdopodobniej statement timeout. NIE potwierdzone dowodem produkcyjnym.
H1:            batch-set timeout = rzeczywisty Root Cause → do potwierdzenia/odrzucenia
               po zebraniu: requestId · error.message · Edge stack · Postgres log
S7-1:          DONE (diagnostyka wdrożona) · OBSERVATION: WAITING FOR PRODUCTION EVIDENCE
DESIGN FREEZE: DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:     S7-2 NO GO do potwierdzenia H1 · S7-4/S7-5 NO GO
```

> **⚠ Reklasyfikacja (2026-07-03, po S7-1 DONE):** poprzednia klasyfikacja `RCA: CONFIRMED`
> została **obniżona do `MOST PROBABLE ROOT CAUSE`**. Treść Root Cause (sekcja 1) pozostaje
> bez zmian. `statement timeout` traktujemy jako **hipotezę H1** — potwierdzoną dopiero po
> zebraniu w fazie OBSERVATION: **requestId · error.message · Edge stack · Postgres log**.
> Dopiero potwierdzenie H1 odblokowuje **NEXT BUNDLE PR-PAY-S7 · S7-2 Cloud Batch Hardening**.

---

## 1. Root Cause — **MOST PROBABLE (do potwierdzenia dowodem produkcyjnym)**

> Treść poniżej bez zmian względem audytu; zmieniona wyłącznie **klasyfikacja** (CONFIRMED → MOST PROBABLE). Potwierdzenie = H1 (sekcja 5) po zebraniu requestId/error.message/Edge stack/Postgres log.

**Handler `batch-set` nie ma żadnej obsługi błędów (`try/catch`), a Edge nie ma globalnego `app.onError`. Cały bundle danych jest zapisywany jednym `upsert` przez `kv.mset`. Dowolny wyjątek Postgresa/Deno — najprawdopodobniej *statement timeout* na dużym payloadzie payroll (`kw-archive` + `kw-week-employees` + `kw-jobs`), do potwierdzenia dowodem z produkcji — wypływa jako nieprzechwycony błąd i Hono zwraca gołe `HTTP 500 Internal Server Error` bez ciała diagnostycznego.**

Skutki:
- Zapis payroll do chmury **nie utrwala się** (mset all-or-nothing → klucze główne bez zmian).
- Klient widzi tylko `batch-set 500` (pusty `errText`) → **czerwony status synchronizacji**.
- Brak izolacji per klucz i brak retry → każdy push dużego bundla ryzykuje pełny fail.

Kod (Edge) — `supabase/functions/make-server-0afb8820/index.tsx`:

```569:697:supabase/functions/make-server-0afb8820/index.tsx
app.post("/make-server-0afb8820/batch-set", async (c) => {
  const { keys, values, ... } = await c.req.json();
  ...
  for (let i = 0; i < keys.length; i++) { ... await kv.get(...); await rotateKvBackups(...); ... }
  await kv.mset(keys, safeValues);      // pojedynczy upsert CAŁEGO bundla; brak try/catch
  try { await saveDailyFullBackup(...); } catch (e) { ... }
  return c.json({ ok: true });
});
```

`kv.mset` — `supabase/functions/make-server-0afb8820/kv_store.tsx`:

```52:58:supabase/functions/make-server-0afb8820/kv_store.tsx
export const mset = async (keys: string[], values: any[]): Promise<void> => {
  const supabase = client()
  const { error } = await supabase.from("kv_store_0afb8820").upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
  if (error) { throw new Error(error.message); }   // rzuca → 500 (brak app.onError)
};
```

Klient — `src/lib/cloud-sync.ts`:

```2191:2194:src/lib/cloud-sync.ts
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`batch-set ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
  }
```

---

## 2. Evidence

| # | Obserwacja | Plik / linia |
|---|------------|--------------|
| **EV1** | `batch-set` bez `try/catch`; brak `app.onError` w całym Edge → każdy throw = 500 opaque | `index.tsx:569–697` |
| **EV2** | Cały bundle (do ~38 kluczy: `DATA_KEYS` 30 + 8× `*-deleted-ids`) w **jednym** `upsert` → all-or-nothing, brak izolacji per klucz | `cloud-sync.ts:2575–2594` + `kv_store.tsx:52` |
| **EV3** | `kv_store.client()` tworzy **nowy** klient Supabase na KAŻDY get/set; pętla batch-set robi ~15+ round-tripów przed `mset` → presja na pool połączeń | `kv_store.tsx:15–58` |
| **EV4** | Duże bloby payroll: `kw-archive` (wszystkie tygodnie × rostery), `kw-week-employees`, `kw-jobs` → payload rośnie z czasem → *statement timeout* / limit Edge | `index.tsx:614–648` |
| **EV5** | `errText` z 500 odczytywany, ale Hono default nie zwraca treści → komunikat klienta ubogi (`batch-set 500`) | `cloud-sync.ts:2191–2193` |
| **EV6** | `rotateKvBackups`/`rotateJobsBackups` robią `kv.set(...-prev)` **w trakcie** handlera, PRZED `mset` → gdy `mset` padnie, backupy już zrotowane = częściowa mutacja serwera | `index.tsx:495–506, 618, 641` |
| **EV7** | `runCloudSync`: **pull+apply PRZED push** — lokalny stan zmutowany zanim push padnie (partial sync + czerwony status) | `App.tsx:736–763` |
| **EV8** | `kw-week-employees-deleted-ids` (tombstony) **nie są pushowane** do chmury (brak na liście push) | `cloud-sync.ts:2576–2588` |
| **EV9** | `pushKeysToCloudSafe` NIE ustawia `replaceWeekEmployeesKeys` → Edge `forceReplaceWeekEmployees=false` → przy shrink/expansion `mergeWeekEmployeesUnion(prev,next)` | `cloud-sync.ts:2624–2627` + `index.tsx:621–634` |

---

## 3. Timeline (rekonstrukcja z kodu)

1. Urządzenie zapisuje payroll → `runCloudSync` → `pullAndMergeDataBundle` (**merge chmury do lokalnego**) → `applyAdminDataBundle` (lokalny stan już zmieniony).
2. `pushMergedDataBundleToCloud` → `pushKeysToCloud` → `POST /batch-set` z pełnym bundlem.
3. Edge: pętla `kv.get` + `rotateKvBackups` (backupy zapisane) → `kv.mset(cały bundle)`.
4. `mset` przekracza *statement timeout* → `error` → `throw` → **500** (bez ciała).
5. Klient: `res.ok===false` → `throw "batch-set 500"` → `catch` w `runCloudSync` → `setSyncStatus("error")` = **czerwony**.
6. Efekt: chmura NIE dostała skorygowanego (usuniętego) rostera; lokalnie widoczny stan po pull-merge (mogący zawierać wróconych pracowników z chmury/innego urządzenia).

---

## 4. Logical Stack Trace

> Rekonstrukcja z kodu; treść komunikatu Postgres **spodziewana** jako *statement timeout* — do potwierdzenia dowodem produkcyjnym (H1).

```
POST /make-server-0afb8820/batch-set
  → app.post handler (index.tsx:569)                 [brak try/catch]
    → kv.mset(keys, safeValues) (index.tsx:691)
      → supabase.from("kv_store_0afb8820").upsert([...~38 rows]) (kv_store.tsx:54)
        → PostgREST → Postgres
          ✗ error: "canceling statement due to statement timeout"   (duży JSONB upsert payroll)
      → throw new Error(error.message) (kv_store.tsx:56)
  ↯ nieprzechwycony → Hono default → HTTP 500 (bez body)
KLIENT:
  pushKeysToCloud (cloud-sync.ts:2191) → throw "batch-set 500"
  runCloudSync catch (App.tsx:760) → setSyncStatus("error")   [czerwony status]
```

---

## 5. POTWIERDZONE vs HIPOTEZY

### ✅ POTWIERDZONE (analiza statyczna + logi)

| # | Ustalenie | Źródło |
|---|-----------|--------|
| **C1** | `batch-set` zwraca **opaque 500** (brak ciała diagnostycznego) | EV1, EV5 |
| **C2** | **Brak `app.onError`** w Edge (globalny handler błędów nie istnieje) | wyszukiwanie w `index.tsx` |
| **C3** | **Brak `try/catch`** w handlerze `batch-set` | `index.tsx:569–697` |
| **C4** | `kv.mset` = **pojedynczy `upsert`** całego bundla (all-or-nothing, bez chunków/izolacji) | `kv_store.tsx:52–58` |

> **Uwaga:** poprzednie „C5 — statement timeout w logach (CONFIRMED)" zostało **przesunięte do hipotez jako H1** — brak nam jeszcze dowodu produkcyjnego (requestId/error.message/stack/Postgres log). C1–C4 to fakty statyczne z kodu; H1 to przyczyna runtime do potwierdzenia.

### ❓ HIPOTEZY (wymagają dowodu produkcyjnego / [LOG-CHECK])

**H1 — GŁÓWNA (blokuje decyzję o S7-2):**

| # | Hipoteza | Potwierdzenie wymaga | Odrzucenie jeśli |
|---|----------|----------------------|------------------|
| **H1** | **`batch-set` timeout = rzeczywisty Root Cause** — `kv.mset` całego bundla przekracza *statement timeout* Postgresa i to jest źródło HTTP 500 przy rozliczeniu payroll | Z incydentu OBSERVATION: **requestId** (z `[batch-set] requestId=…` / `{ok:false,error,requestId}`) · **error.message** zawiera `canceling statement due to statement timeout` (lub równoważny) · **Edge stack** wskazuje `kv.mset` → `upsert` · **Postgres log** z tym samym oknem czasowym | error.message wskazuje inną przyczynę (np. payload/JSONB limit, OOM/CPU, `remaining connection slots`, auth/PostgREST) — wtedy Root Cause = ta przyczyna, a właściwym bundlem może być S7-3/S7-4, nie S7-2 |

**Hipotezy resurrection (osobny problem — NIE blokują S7-2):**

| # | Hipoteza | Jak zweryfikować |
|---|----------|------------------|
| **H-R1** | `mergeWeekEmployeesUnion` po stronie Edge jest źródłem **resurrection** (cofa skurczenie rostera o usuniętych) | Repro: push rostera pomniejszonego o 2 prac. **bez** `replaceWeekEmployeesKeys`; sprawdzić log `roster expansion/blocked shrink ... merging` (`index.tsx:622–633`) i stan `kw-week-employees` w KV |
| **H-R2** | **Brak tombstonów po stronie Edge** (`kw-week-employees-deleted-ids` nieobecne na serwerze) umożliwia powrót usuniętych przy union/richness | Sprawdzić czy klucz istnieje w KV; prześledzić, czy jakakolwiek ścieżka go pushuje (obecnie brak — EV8) |
| **H-R3** | Wpływ `replaceWeekEmployeesKeys`: ścieżki payroll bez tej flagi (`pushKeysToCloudSafe`, WorkerPhotoView) pozwalają Edge na union re-add | Porównać push main path (`replaceWeekEmployeesKeys=["kw-week-employees"]`, force replace) vs `pushKeysToCloudSafe` (brak flagi) |
| **H-R4** | Współprzyczyna 500: presja na pool połączeń (klient Supabase per operacja) lub OOM/CPU Edge na dużym payloadzie | Postgres logs: `remaining connection slots`; Edge logs: memory/CPU limit |

> **Rozróżnienie kluczowe:** przyczyna **500** (C1–C4 + **H1**) i przyczyna **resurrection pracowników** (H-R1…H-R3) to **dwa odrębne problemy**. 500 blokuje utrwalenie korekty; resurrection jest napędzany przez Edge union + brak tombstonów. Nie łączyć w jeden bundle.

---

## 6. Design Freeze (propozycja — NIE implementowane)

| ID | Zmiana | Plik (docelowy IMPLEMENT) | Adresuje |
|----|--------|---------------------------|----------|
| **S7-1** ✅ DONE (`4c38f4f`) | `try/catch` w `batch-set` + `app.onError` → `500` z `{ ok:false, error, requestId }` (odsłonić realny `error.message`) | `index.tsx` | C1–C3 |
| **S7-2** ⏳ NO GO (do potwierdzenia H1) | `kv.mset` w **chunkach** i/lub sekwencyjny zapis z izolacją per klucz + zebranie błędów (partial report zamiast pełnego 500) | `kv_store.tsx` / `index.tsx` | C4, **H1**, H-R4 |
| **S7-3** DRAFT | Reużyć jednego klienta Supabase (module-level singleton) zamiast `client()` per operacja | `kv_store.tsx` | H-R4 |
| **S7-4** DRAFT | Klient: retry z backoff dla 5xx (idempotentny) + nie mutować lokalnego stanu przed potwierdzonym push (pull-merge read-only do udanego push) | `cloud-sync.ts` / `App.tsx` | EV7 |
| **S7-5** DRAFT | (resurrection) Pushować `kw-week-employees-deleted-ids` do chmury **lub** tombstone-aware filtr w Edge; wymusić `replaceWeekEmployeesKeys` na wszystkich ścieżkach payroll | `cloud-sync.ts` + `index.tsx` | H-R1–H-R3 |

**Zasada:** S7-1…S7-4 = przyczyna 500. S7-5 = przyczyna resurrection. To **dwa osobne bundle** (One Bundle = One Goal).

**Rekomendowana kolejność:** **S7-1** ✅ (diagnostyka — DONE) → **OBSERVATION** (zebrać dowód H1) → jeśli **H1 CONFIRMED** → **S7-2** (twardnienie zapisu, adresuje 500) → później **S7-5** (resurrection) → **S7-3/S7-4**. **S7-4 i S7-5 nie implementować** przed potwierdzeniem H1.

---

## 7. Out Of Scope

| Element | Powód |
|---------|-------|
| Zmiana merge klienta (`finalizePayrollBundleMerge`) | Osobny obszar (Etap 2 CLOSED) |
| Zmiana schematu KV (`kv_store_0afb8820`) | Ryzyko migracyjne — osobna decyzja |
| Zmiana `runCloudSync` kolejności pull/push | Wchodzi dopiero w S7-4 (osobny bundle) |
| PR-PAY-S6 (Archive Restore Eligibility) | CLOSED (`d2a3d90`) — niezależne |

---

## OBSERVATION — Evidence Capture (H1)

**Cel:** potwierdzić lub odrzucić **H1** (batch-set timeout = rzeczywisty Root Cause).

### A. Zmierzone statycznie z repo (PARTIAL — wspiera H1, nie potwierdza runtime)

| # | Metryka | Wartość | Źródło |
|---|---------|---------|--------|
| **A1** | Liczba kluczy w jednym `batch-set` | **38** (`DATA_KEYS` 30 + 8× `*-deleted-ids`) → pojedynczy `kv.mset` 38 wierszy, **bez chunków** | `cloud-sync.ts:2576–2594` |
| **A2** | Rozmiar pełnego bundla (próbka archiwalna) | **~391 KB** (`scripts/audit-cloud-archive-snapshot.json`, 9252 linie: `kw-directory`+`kw-archive`+…) — rośnie co tydzień | snapshot repo |
| **A3** | Operacje Edge przed `mset` | ~9× `kv.get` + ~6× `rotateKvBackups`(get+set) + `rotateJobsBackups` + `saveDailyFullBackup`, **sekwencyjnie, nowy klient Supabase per op** | `index.tsx:588–712`, `kv_store.tsx:15–58` |
| **A4** | `kw-week-employees-deleted-ids` w pushu | **BRAK** (nie na liście push) — dotyczy H-R2 (resurrection), nie H1 | `cloud-sync.ts:2577` |

### B. Do zebrania z PRODUKCJI (owner action — BLOKUJE potwierdzenie H1)

> Wymaga dostępu do Supabase Dashboard (Edge Function logs + Postgres logs). **Niedostępne z repo/agenta.** Odtworzyć 1 incydent rozliczenia payroll dającego czerwony status, następnie wypełnić:

| # | Pole | Gdzie znaleźć | Wartość |
|---|------|---------------|---------|
| **B1** | `requestId` | Edge log `[batch-set] requestId=…` lub body `{ok:false,error,requestId}` (S7-1) | ` ` |
| **B2** | `error.message` | ten sam log / response body | ` ` |
| **B3** | Edge stack | Edge Function logs (S7-1 `app.onError` loguje `err.stack`) | ` ` |
| **B4** | Postgres log | Supabase → Logs → Postgres, to samo okno czasowe | ` ` |
| **B5** | payload size | rozmiar body `POST /batch-set` (DevTools Network / Edge log) | ` ` |
| **B6** | liczba kluczy batch-set | `keys.length` z requestu (oczekiwane 38) | ` ` |
| **B7** | rozmiar `kw-archive` | długość wartości `kw-archive` w KV / w payloadzie | ` ` |
| **B8** | stan statusu „Rozliczony" | czy po incydencie status wrócił na „Oczekuje"; na którym rekordzie; czy `settledUpdatedAt` dotarł do chmury | ` ` |
| **B9** | zachowanie na wielu urządzeniach | na ilu urządzeniach widoczny revert; czy urządzenie źródłowe też cofa po reloadzie; czy inne urządzenia nigdy nie dostały statusu | ` ` |

> **Jeden kompletny incydent = wszystkie B1–B9 z tego samego zdarzenia** (ten sam `requestId`/okno czasowe).

### C. Kryterium decyzji

- **H1 CONFIRMED** ⇔ B2 zawiera `canceling statement due to statement timeout` (lub równoważny timeout) **i** B3/B4 wskazują `kv.mset`→`upsert`/Postgres w tym samym oknie.
- **H1 REJECTED** ⇔ B2 wskazuje inną przyczynę (payload/JSONB limit, OOM/CPU, `remaining connection slots`, auth/PostgREST, itp.).

---

## GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT** | **COMPLETE** |
| **RCA** | **MOST PROBABLE** (nie CONFIRMED) — timeout `kv.mset` jako H1, do potwierdzenia dowodem |
| **S7-1 Diagnostics** | ✅ **DONE** — deployed `4c38f4f` (`app.onError` + try/catch + requestId) |
| **[LOG-CHECK] / OBSERVATION** | **WAITING FOR PRODUCTION EVIDENCE** — requestId · error.message · Edge stack · Postgres log |
| **H1 (batch-set timeout = RC)** | **UNCONFIRMED** — potwierdzić lub odrzucić po dowodzie |
| **S7-2 Cloud Batch Hardening** | **NO GO (warunkowe)** — GO dopiero gdy **H1 CONFIRMED** |
| **S7-4 / S7-5** | **NO GO** — nie implementować teraz |

### Decision — S7-2 Cloud Batch Hardening

- **JEŻELI H1 POTWIERDZONE** (error.message = statement timeout / stack `kv.mset`→`upsert` + Postgres log): → **GO dla NEXT BUNDLE PR-PAY-S7 · S7-2** (chunk/izolacja `mset`). RCA promowane MOST PROBABLE → CONFIRMED.
- **JEŻELI H1 ODRZUCONE** (inna error.message): → **S7-2 NO GO**; przekierować na bundle odpowiadający faktycznej przyczynie (np. S7-3 pool / inny). Zaktualizować sekcję 1.
- **DOPÓKI brak dowodu:** **NO GO** dla wszystkich S7-2…S7-5 — pozostajemy w OBSERVATION.

---

*SSOT audytu PR-PAY-S7: ten plik · bez zmian kodu · commit wyłącznie dokumentacyjny.*

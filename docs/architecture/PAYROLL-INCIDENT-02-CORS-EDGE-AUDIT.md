# PAYROLL-INCIDENT-02 — CORS / Edge Functions AUDIT

> **ID:** PAYROLL-INCIDENT-02  
> **STATUS:** **CLOSED** · AUDIT COMPLETE · **P0** · inputs to DF-01 · **EPIC CLOSED** ([CLOSE-01](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md))  
> **Owner GO:** AUDIT ONLY  
> **Data:** 2026-07-24  
> **Powiązane:** [`PAYROLL-INCIDENT-01-AUDIT.md`](./PAYROLL-INCIDENT-01-AUDIT.md) · historyczne [`docs/recovery/PAYROLL-RUNTIME-TRACE-CORS-RCA.md`](../recovery/PAYROLL-RUNTIME-TRACE-CORS-RCA.md)  
> **Poza zakresem (historyczne):** implementacja · poprawki · commit · push  
> **Production tip:** UI **2.65.40** · tip commit **`fcf66b0`**

```text
══════════════════════════════════════
PAYROLL-INCIDENT-02 CORS / EDGE AUDIT

Live OPTIONS: PASS (ACAO=* · Allow-Headers incl. X-WGDOM-Trace-Id)
mber-*:       BRAK takich route w Edge
Payroll core: batch-get / batch-set / domain push
Backup status: diagnostyka UI · fail → null (ignorowane)
CORS vs 01:   korelacja możliwa jako OBJAWA platformy; nie RC stamp 09:29Z
══════════════════════════════════════
```

---

## 0. Metoda

| Źródło | Wynik |
|--------|--------|
| `supabase/functions/make-server-0afb8820/index.tsx` | Jedyna Edge Function (Hono) |
| Grep `fetch(` / `API_BASE` / `payroll-backup` / `batch-get\|set` w `src/` | Call sites |
| Live OPTIONS/GET probe (2026-07-24) | `/health`, `/batch-get`, `/payroll-backup-status`, `/jobs-backup-status` |
| Historyczne RCA CORS | Trace-header preflight (naprawione w allowHeaders) |

**Żadnych zapisów KV / deploy / zmian kodu.**

---

## 1. Konfiguracja CORS (SSOT w kodzie)

```74:84:supabase/functions/make-server-0afb8820/index.tsx
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "X-WGDOM-Trace-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);
```

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy CORS jest „wyłączony”? | **NIE** — świadomie `origin: "*"` + OPTIONS |
| Czy `X-WGDOM-Trace-Id` dozwolony? | **TAK** (historyczny bug RC-trace — naprawiony w allowHeaders) |
| Live preflight (AUDIT) | **204** · `Access-Control-Allow-Origin: *` · headers OK |

### Kiedy Console i tak krzyczy „CORS” / `ERR_FAILED`

| Mechanizm | Opis |
|-----------|------|
| **Platform 546 / 502 / timeout** | Gateway zwraca odpowiedź **bez** (lub z niepełnymi) nagłówkami CORS → przeglądarka raportuje **CORS**, choć root = **Edge/platform fail** |
| Prawdziwy preflight deny | Tylko gdy Allow-Headers nie pokrywa request (dziś trace jest na liście) |
| Offline / aborted | `Failed to fetch` bez realnego CORS policy mismatch |

**Wniosek:** obecne błędy CORS w Console **nie muszą** oznaczać „Edge nie ma CORS” — często są **maską awarii transportu**.

---

## 2. Lista endpointów Edge (`make-server-0afb8820`)

Jedyny deployed function folder: `supabase/functions/make-server-0afb8820/`.  
**Brak** route `mber-*` / `member-*` w kodzie Edge.

### 2.1 Core Cloud Sync (produkcyjne — krytyczne)

| Endpoint | Metoda | Cel | Payroll? | Prod required? | CORS needed? | Awaria → wpływ |
|----------|--------|-----|----------|----------------|--------------|----------------|
| **`/batch-get`** | POST | Odczyt KV (bootstrap, pull, notes, …) | **TAK** (m.in. `kw-week-employees`) | **TAK** | **TAK** | Brak świeżego Cloud; zostaje LS; sync/pull fail (catch) |
| **`/batch-set`** | POST | Zapis KV (+ payroll guards / backup rotate) | **TAK** (domain push roster) | **TAK** | **TAK** | Brak zapisu godzin do Cloud; toast/fail; LS może zostać |
| **`/batch-del`** | POST | Usuwanie kluczy | Rzadko / admin | Opcjonalne | TAK | Nie typowy path godzin |
| **`/health`** | GET | Liveness | NIE | Ops | TAK | Brak |

### 2.2 Backup / recovery (produkcyjne — diagnostyka + restore)

| Endpoint | Metoda | Cel | Payroll? | Prod required? | CORS? | Awaria |
|----------|--------|-----|----------|----------------|-------|--------|
| **`/payroll-backup-status`** | GET | Liczniki `employees/prev/prev2` + archive | **TAK** (status UI) | **NIE** do godzin live | TAK | `.catch` → `null`; **nie zmienia** rosteru |
| **`/restore-payroll-backup`** | POST | Restore z `*-prev` | **TAK** (jawna akcja Owner) | Tylko przy restore | TAK | Restore fail; bez auto-wywołania |
| **`/jobs-backup-status`** | GET | Backup Roboty | NIE (Jobs) | NIE do LP | TAK | UI badge null |
| **`/restore-jobs-backup`** | POST | Restore Jobs | NIE | Opcjonalne | TAK | — |
| **`/data-backup-status`** | GET | Pełny backup status | Częściowo (meta) | NIE do godzin | TAK | UI null |
| **`/restore-data-backup`** | POST | Restore data bundle | Możliwe | Opcjonalne | TAK | — |

**Call sites Payroll backup status:**

```423:432:src/app/App.tsx
  useEffect(() => {
    fetchJobsBackupStatus().then(...).catch(() => {});
    fetchPayrollBackupStatus().then(...).catch(() => {});
    fetchFullDataBackupStatus().then(...).catch(() => {});
  }, [jobs.length, weekEmployees.length, savedWeeks.length, directory.length, contacts.length]);
```

Fail = **całkowicie ignorowany** dla stanu godzin (tylko badge/status).

### 2.3 Storage / email / SMS / client-share

| Endpoint | Klasa | Payroll hours? |
|----------|-------|----------------|
| `storage-upload-url`, `storage-upload`, `storage-delete` | Prod (zdjęcia/pliki) | NIE |
| `kosztorys-preview` | Prod Przetargi | NIE |
| `send-backup-email`, `send-job-email`, `send-payroll-email`, `send-job-files-email` | Prod email | `send-payroll-email` = wysyłka maila LP, **nie** sync godzin |
| `client-share` | Prod share | NIE |
| `sms-status`, `sms-sendernames/ensure`, `send-sms-bulk`, `sms-history` | Prod SMS | NIE |

### 2.4 Tenders BZP / external (produkcyjne FEATURE)

`tenders-bzp-search|notice|documents|analyze-swz|award-result|upload|document-bytes|zip-*|attach-to-job`, `tenders-external-discover` — **Przetargi**, nie Lista Płac.

### 2.5 „mber-*”

| Status | |
|--------|--|
| W Edge | **BRAK** |
| W `src/` jako API path | **BRAK** |
| Najbardziej prawdopodobna interpretacja Console | (1) obcięty URL / inny host · (2) mylenie z **CSS `amber-*`** · (3) `remember` **localStorage** (`kw-admin-remember-*`) — **nie** Edge · (4) zewnętrzny request |

**Nie ma eksperymentalnego endpointu `mber-*` do „naprawy CORS”.**

### 2.6 Legacy / lokalne (nie osobne prod routes)

| Artefakt | Klasa |
|----------|--------|
| `kv-mset-chunk.ts` | Lokalny / WIP chunk — **nie** osobny HTTP route w `index.tsx` na tip |
| Historyczny CORS bez `X-WGDOM-Trace-Id` | **Legacy bug** — w tip **naprawiony** w allowHeaders |

---

## 3. Czy Payroll korzysta z których endpointów?

| Endpoint | Użycie Payroll |
|----------|----------------|
| `batch-get` | **TAK** — bootstrap, pull, merge live hours |
| `batch-set` | **TAK** — domain push `kw-week-employees` (+ rotate `*-prev`) |
| `payroll-backup-status` | **TAK** — tylko status kopii (UI) |
| `restore-payroll-backup` | **TAK** — tylko po jawnej akcji restore |
| `send-payroll-email` | Email, nie sync godzin |
| Reszta | **NIE** (Jobs/Tenders/SMS/…) |

**Ścieżka godzin (SSOT):**  
edycja LP → `payroll-domain-sync` / `pwrPush` → **`batch-set`** · odczyt → **`batch-get`**.

---

## 4. Czy awaria wpływa na odczyt / zapis / sync / backup / recovery?

| Awaria | Odczyt godzin | Zapis godzin | Sync | Backup status | Recovery restore |
|--------|---------------|--------------|------|---------------|------------------|
| `batch-get` CORS/fail | Zostaje **LS**; UI może być stale | — | Pull skip (catch) | — | — |
| `batch-set` CORS/fail | — | Cloud **nie** dostaje zmian; LS lokalnie może mieć zmiany | Push fail | Rotate prev może nie nastąpić | — |
| `payroll-backup-status` fail | **NIE** | **NIE** | **NIE** | Badge null | — |
| Platform 546 na dowolnym | Jak wyżej + Console „CORS” | Jak wyżej | Tak | Tak (jeśli hit) | Tak |

**Ważne:** fail `payroll-backup-status` **nie** wyzerowuje godzin (potwierdzone: `.catch(() => {})` + `if (!res.ok) return null`).

---

## 5. Czy brak CORS to bug / świadoma konfiguracja / endpoint wewnętrzny?

| Endpoint | CORS w Hono | Klasyfikacja |
|----------|-------------|--------------|
| Wszystkie route `/*` | **Świadoma** `origin: "*"` | Public browser SPA → **musi** mieć CORS |
| Brak CORS na odpowiedzi | **Bug platformy / 5xx gateway**, nie „wewnętrzny endpoint bez CORS” | False-positive CORS w DevTools |
| `mber-*` | N/A | Nie istnieje |

Live AUDIT: preflight **PASS** — konfiguracja tip jest **poprawna**.

---

## 6. Związek z PAYROLL-INCIDENT-01

| Pytanie | Ocena |
|---------|--------|
| Czy CORS **spowodował** stamp `09:29Z` inactive days Piotra? | **NIE jako RC bezpośredni** — INCIDENT-01 = **udany zapis** stanu 0h do Cloud (domena push musiała przejść) |
| Czy CORS mógł **współwystępować**? | **TAK** — przy load/546 Console pełna CORS/`ERR_FAILED`; backup-status też failuje hałaśliwie |
| Czy CORS mógł **opóźnić** sync telefonu? | **TAK** — częściowy lokalny stan → dopiero udany `batch-get` wyrównuje do Cloud 0h (pasuje do „~1h częściowo, potem jak desktop”) |
| Czy `payroll-backup-status` CORS = utrata godzin? | **NIE** |

```text
INCIDENT-01 RC (working): domain push inactive/defaultDay @ 09:29Z
INCIDENT-02: CORS/ERR_FAILED = głównie OBJAWA transportu / platform noise
             + hałas backup-status; nie root wipe godzin
```

---

## 7. Ocena ryzyka

| Ryzyko | Sev | Notatka |
|--------|-----|---------|
| Krytyczne CORS misconfig na tip | **LOW** (live OPTIONS PASS) | |
| False CORS przy 546/502 | **MEDIUM** (ops/noise; historyczne M-EDGE-546) | Monitor 01D |
| Utrata danych przez fail `payroll-backup-status` | **LOW** | Ignorowany |
| Utrata danych przez fail `batch-set` | **HIGH** gdy trwałe | Ale wtedy Cloud **nie** dostałby 0h z 01 |
| Mylenie CORS z RC Payroll | **MEDIUM process** | Rozdzielić transport vs domain push |

**Czy obecne błędy CORS są krytyczne dla produkcji godzin?**  
**Nie jako trwała misconfig.** Krytyczne są tylko **powtarzalne fail `batch-get/set`** (wtedy sync/push). Pojedyncze CORS w Console przy 546 = **niekrytyczny hałas**, o ile requesty core wracają 200.

---

## 8. Owner Readiness

```text
OWNER READINESS: AUDIT COMPLETE (INCIDENT-02)

Findings:
  - Edge CORS SSOT: origin * + Trace-Id ALLOW — live PASS
  - mber-*: does not exist
  - payroll-backup-status: non-critical UI; fail ignored
  - Payroll hours depend on batch-get/set, not backup-status
  - CORS errors ≠ root cause of INCIDENT-01 zeroing (push succeeded)

Next (Owner GO only):
  A) Capture Network HAR for failed URLs (exact path) if CORS recurs
  B) Correlate 546 rate with 01D smoke (transport)
  C) Do NOT "fix CORS" without evidence of allowHeaders regression

Forbidden: implement · commit · push
```

---

## 9. Raport końcowy (Owner card)

### 1. Lista endpointów Edge
§2 — jedna Function Hono; core `batch-get/set`; backup `*-backup-status` / `restore-*`; storage/email/SMS/tenders; **brak `mber-*`**.

### 2. Cel każdego
Tabela §2.1–2.4.

### 3. Użycie przez Payroll
**Core:** `batch-get` / `batch-set`. **Diag:** `payroll-backup-status`. **Restore:** `restore-payroll-backup` (ręczne).

### 4. Czy powinien mieć CORS
**TAK** (SPA). Live: **ma i działa**.

### 5. Czy błędy są krytyczne
**Niekrytyczne** jako misconfig tip; **krytyczne tylko** jeśli `batch-get/set` trwale padają. `payroll-backup-status` fail = hałas.

### 6. Związek z PAYROLL-INCIDENT-01
**Korelacja możliwa (transport/telefon delay); nie RC wyzerowania** (Cloud dostał 0h = udany set).

### 7. Ocena ryzyka
LOW misconfig · MEDIUM false-CORS przy 546 · rozdzielić od RC-01.

### 8. Owner Readiness
**AUDIT COMPLETE** — czekaj na HAR/GO; bez implementacji.

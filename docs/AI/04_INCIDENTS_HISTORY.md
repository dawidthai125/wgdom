# 04 — Incidents History (WGDOM)

> Rejestry: [`docs/INCIDENTS.md`](../INCIDENTS.md) · [`docs/INCIDENTS-2026-06.md`](../INCIDENTS-2026-06.md) · `docs/architecture/*RCA*` · `docs/recovery/*`.

Dla każdego: **objawy · root cause · naprawa · detekcja · nie rób · status**.

---

## 1. INCIDENT 23.07 / Sync Storm (2026-07-23) · CLOSED (app) / platform recovered

| Pole | Treść |
|------|--------|
| **Objawy** | Lawina `batch-get`/`batch-set` `kw-tenders-pipeline` przy otwarciu dużego przetargu (MOPS Kamieńskiego = trigger); potem CF **522**, Auth 522, Storage 544, Edge batch 500; DB resource exhaustion |
| **Root cause (app)** | `useTenderDossierHeavyLazy` E-RUN deps zawierały `builtAt` → partial `onUpdate` → restart parse → Sync Storm |
| **Amplifier** | `a2d1caf` deadlock retry ×4 (40P01) — nie HTML 522 |
| **Terminal** | PostgREST/origin overload → automatic recovery |
| **Naprawa** | **TENDERS-SYNC-STORM-P0** UI **2.65.38** — deps bez `builtAt`; partial local; final cloud+coalesce; circuit breaker; generation guard |
| **Cleanup** | **2.65.39** — diag AUTO_ENABLE OFF |
| **Detekcja** | DevTools Network: powtarzające się fat pipeline set; LS `builtAt` thrash (≥4 unique w oknie); Edge 522 |
| **Nie rób** | Nie wkładaj `builtAt` do E-RUN; nie rób partial→cloud w pętli; nie „naprawiaj” Edge chunk bez GO podczas storm |
| **Status** | App fix **PASS** · Final red-team audit **PRODUCTION READY** (klasa storm) · residual bootstrap cloud = backlog HIGH |
| **SSOT** | `TENDERS-SYNC-STORM-P0-RELEASE-01.md` · `INCIDENT-23-07-*` · `WGDOM-FINAL-PRODUCTION-AUDIT-01.md` |

---

## 1b. PAYROLL Hours wipe ~24.07 (INCIDENT-01) · **CLOSED**

| Pole | Treść |
|------|--------|
| **Objawy** | Bieżący tydzień Lista Płac — godziny wyzerowane / partial wipe (Piotrek Ukraina) |
| **Root cause (klasa)** | Hours collapse na Domain Push bez świadomego ACK; brak `-prev` recovery UX; Soft Restore bez overlay |
| **Naprawa** | **Hours-wipe EPIC** D1–D5 · UI **2.65.41–2.65.43** · tip feature **`ea1b0a6`** |
| **Detekcja** | `payroll.write_path` ring · Domain Gate confirm · `-prev` richer-than banner |
| **Nie rób** | Omijać Domain Gate · mylić `intentionalHoursClear` z `isIntentionalPayrollWeekClear` · mutować `weekEmployeeFromDir` · mieszać Gate B CI z tym EPIC |
| **Status** | **CLOSED** · PRODUCTION VERIFIED |
| **SSOT** | [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) · Release History [`PAYROLL-HOURS-WIPE-PROTECTION-EPIC-RELEASE-HISTORY.md`](../releases/PAYROLL-HOURS-WIPE-PROTECTION-EPIC-RELEASE-HISTORY.md) |

---

## 2. PAYROLL — seria (2026-06 → 2026-07) · większość CLOSED

### 2.1 Shrink / Guard / Bootstrap P11

| | |
|--|--|
| **Objawy** | Zerowe godziny w UI mimo bogatej chmury; ryzyko wipe cloud |
| **RC** | Zły merge / push shrink |
| **Fix** | `wouldBlockPayrollShrink`; `applyBootstrapPayrollMerge` |
| **Status** | CLOSED |

### 2.2 Cross-device Domain Push (SYNC-ARCH S2)

| | |
|--|--|
| **Objawy** | LP nie widoczna / niespójna między urządzeniami |
| **Fix** | Domain Push ACTIVE (#CORE-015) |
| **Status** | FULLY CLOSED · 2.63.85 |

### 2.3 Anti-leak / Bootstrap race / Quota / Display unlock

| ID | Status | Notatka |
|----|--------|---------|
| ANTI-LEAK-FIX-01 | CLOSED 2.65.14 | same-week SSOT |
| BOOTSTRAP-RACE-FIX-01 | CLOSED 2.65.18 | CORE persist przed mount |
| P0-FIX-01 Quota | CLOSED 2.65.27 | QuotaExceeded ≠ bootstrap FAILED |
| DISPLAY-UNLOCK | superseded | root = quota/storage |

### 2.4 Resurrection fence + Rollover

| | |
|--|--|
| **Objawy** | Stary LS „wskrzesza” pracowników do pustej chmury; ALIGN mylony z wipe |
| **Fix** | `payroll-bootstrap-resurrection-fence.ts` (2.65.35); `classifyPayrollWeekTransition` (2.65.34) |
| **Nie rób** | Usuwać fence; cofać ALIGN≠ROLLOVER; omijać PWRB |
| **Status** | CLOSED |

### 2.5 Egress quota (2026-06-29)

| | |
|--|--|
| **Objawy** | `Failed to fetch`, 402 `exceed_egress_quota` |
| **RC** | Billing/spend cap Supabase |
| **Fix** | Ops: Pro / remove cap (nie wymagało refactor sync) |
| **Status** | CLOSED |

---

## 3. Cloud bootstrap / CloudLoader

| | |
|--|--|
| **Objawy** | F5: pusta LP, race mount vs CORE, resurrection |
| **RC** | Kolejność hydrate; prefer local bogaty; brak fence |
| **Fix** | bootstrapPhase gate + fence + merge SSOT B4 |
| **Detekcja** | F5 dual-session; gate payroll |
| **Nie rób** | Mount App przed CORE persist; seed empty Cloud ze starego LS |
| **Status** | CLOSED (seria) |

---

## 4. Jobs photos / assets sync

| ID | Objawy | Fix | Status |
|----|--------|-----|--------|
| JOBS-ASSETS-SYNC-01 | Zdjęcia giną między urządzeniami | union `mergePhotos` | CLOSED 2.65.9 |
| JOBS-PHOTOS-DELETE-SYNC-01 | Delete wraca po sync | `deletedPhotoTombstones` | CLOSED 2.65.10 |
| JOBS-PHOTOS-P0 audit | Empty UI mimo danych | `filterAvailablePhotos`; stale closure możliwy nie potwierdzony runtime | AUDIT COMPLETE · live trace WIP lokalnie |
| ROBOTS-INSPECTOR-01 | Inspektor stale | reconcile + finalBundle SSOT | CLOSED 2.65.5 |

**Nie rób:** overwrite `photos[]` bez union/tombstones.

---

## 5. Theme migration (THEME-01)

| | |
|--|--|
| **Objawy** | FOUC, niespójny dark/light, custom bridge |
| **Fix** | THEME-01B/C — `WgdomThemeProvider`, `:root` Light, `.dark` Prod Dark, next-themes |
| **Status** | COMPLETE · PRODUCTION VERIFIED 2.65.30 |
| **Nie rób** | Przywracać stary bridge bez DF |

---

## 6. Vercel deploy unblock (2026-06-22)

| | |
|--|--|
| **Objawy** | BUILD FAILED ENOENT — import untracked `src/` |
| **Fix** | Track wszystkie importowane pliki przed push |
| **Status** | CLOSED |
| **Detekcja** | `git ls-files` vs importy |

---

## 7. Deadlock batch-set (CLOUD-P0-DEADLOCK-N1)

| | |
|--|--|
| **Objawy** | 500 z `40P01` / deadlock detected |
| **Fix** | Retry ×4 tylko transient deadlock (2.65.33) |
| **Uwaga** | Amplifier przy Sync Storm — nie mylić z CF 522 |
| **Status** | CLOSED (N1); N2 READY gated |

---

## 8. iOS Login Shell (P0-A)

| | |
|--|--|
| **Objawy** | Shell logowania iOS |
| **Status** | CLOSED 2.63.87 |

---

## 9. Jak czytać nowe incydenty

1. Objawy Ownera + Network/Console.  
2. RCA read-only (bez „quick fix”).  
3. Evidence Matrix.  
4. Design Freeze + Owner GO.  
5. Implement **minimal** scope.  
6. Owner Verification + Production Verification.  
7. Closeout w `docs/architecture/` + wpis tu / `INCIDENTS.md`.

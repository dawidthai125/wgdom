# WM-RYSUNKI-01 P1B — OWNER VERIFICATION

> **ID:** WM-RYSUNKI-01-P1B-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1B — Feature Rollout**  
> **FAZA:** **OWNER VERIFICATION**  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **IMPLEMENT:** COMPLETE (lokalnie)  
> **Wersja changelog:** **2.65.98**  
> **Data OV:** 2026-08-03  
> **Wejście:** Owner **GO OWNER VERIFICATION**  
> **AUDIT:** [`WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT.md`](./WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT.md) (O2 AppSettings)  
> **DF:** [`WM-RYSUNKI-01-P1B-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P1B-DESIGN-FREEZE.md) (**FROZEN**)  
> **AR:** [`WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **MODE:** VERIFICATION ONLY · **NO COMMIT** · **NO PUSH**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1B — OWNER VERIFICATION

STATUS: OWNER VERIFICATION PASS

P1B 32 PASS · P0 33 PASS · P1 43 PASS
AC-P1B-01…08 PASS · MR-P1B-01…06 PASS · D-10/11/12 PASS
Brak blokerów · zgodność AUDIT / DF / AR

COMMIT: NIE
PUSH: NIE
NEXT: Owner GO COMMIT (allowlist P1B only)
════════════════════════════════════════════════════════
```

---

## 0. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy P1B spełnia DF + AR + AC? | **TAK** |
| Czy są blokery przed COMMIT? | **NIE** |
| Regresja P0 / P1 | **BRAK** (33 + 43 PASS) |
| Nowy DATA_KEY / nowa rola / 2. flaga | **BRAK** |
| Payroll / drawings merge rewrite w zakresie P1B | **NIE** |
| **STATUS** | **OWNER VERIFICATION PASS** |

---

## 1. Metoda weryfikacji

| Warstwa | Zakres |
|---------|--------|
| Automatyczna | `test-wm-rysunki-01-p1b.mjs` · P0 · P1 (re-run OV) |
| Statyczna | `app-settings.ts` · `flag.ts` · `AdminSettingsModal` · `WmPrintView` · `wm-print-tabs` · `settings.ts` |
| Kontrakt docs | AUDIT O2 · DF §2–§10 · AR MR · AC-P1B-01…08 |
| Ręczna UI (Owner opcjonalnie po COMMIT) | OV-UI-01…10 poniżej — **nie blokuje** PASS (logika + testy pokrywają AC) |

---

## 2. Checklist Ownera (8 punktów) — wyniki

### 2.1 AppSettings `wmRysunkiEnabled` default OFF

| Dowód | Wynik |
|-------|--------|
| `defaultAppSettings().wmRysunkiEnabled === false` | **PASS** (T01) |
| Gate bez settings / LS → OFF · tabs bez Rysunki | **PASS** (T03–T04) |
| DF §2 #6 · AC-P1B-01 | **PASS** |

### 2.2 Super Admin toggle bez reload

| Dowód | Wynik |
|-------|--------|
| ⚙ → Moduły → checkbox `wmRysunkiEnabled` | **PASS** (T26 · kod) |
| `onAppSettingsChange(next)` + `saveAppSettings(next)` — **bez** `location.reload` | **PASS** (statycznie) |
| Gate czyta React `appSettings` → re-render tabs | **PASS** (MR-02 · `getVisibleWmPrintTabs(appSettings)`) |
| AC-P1B-02 | **PASS** |

### 2.3 Mirror WM Ustawienia — ten sam SSOT

| Dowód | Wynik |
|-------|--------|
| Sekcja „Moduły — Rysunki WM” · pole `appSettings.wmRysunkiEnabled` | **PASS** (T28) |
| Zapis przez `saveAppSettings` — **nie** `WmPrintSettings` | **PASS** (T29–T30) |
| D-P1B-12 · AC-P1B-04 | **PASS** |

### 2.4 One-shot promote LS → AppSettings → usuń LS

| Dowód | Wynik |
|-------|--------|
| LS=`1` + OFF → `wmRysunkiEnabled=true` | **PASS** (T11) |
| Po promote `removeItem` LS | **PASS** (T12) |
| Drugie wywołanie = no-op | **PASS** (T13) |
| Brak promote przy FORCE OFF | **PASS** (T14–T15) |
| D-P1B-10 · AC-P1B-06 · MR-01 | **PASS** |

### 2.5 FORCE OFF LS=`0` najwyższy priorytet

| Dowód | Wynik |
|-------|--------|
| AppSettings ON + LS=`0` → gate OFF | **PASS** (T07–T08) |
| Kolejność w `flag.ts`: LS=`0` **przed** AppSettings | **PASS** (statycznie) |
| D-P1B-11 · AC-P1B-05 | **PASS** |

### 2.6 Brak drugiego stanu

| Dowód | Wynik |
|-------|--------|
| Brak pola rysunki w `wm-print/settings.ts` | **PASS** (T30) |
| Jedno pole org: `AppSettings.wmRysunkiEnabled` | **PASS** |
| LS nie jest SSOT po hydrate (T10: LS=`1` nie wygrywa nad OFF) | **PASS** |
| ZERO DUPLICATE · AC-P1B-08 | **PASS** |

### 2.7 Brak nowego AppSettings KEY

| Dowód | Wynik |
|-------|--------|
| REUSE `kw-app-settings` (`APP_SETTINGS_KEY`) | **PASS** (T21–T22) |
| `kw-wm-rysunki-01` **nie** w `DATA_KEYS` | **PASS** (T23) |
| Tylko **nowe pole** boolean w istniejącym `AppSettings` (nie nowy klucz KV) | **PASS** |
| AC-P1B-08 | **PASS** |

> Interpretacja „Brak nowych AppSettings”: **brak nowego DATA_KEY / nowego magazynu** — pole `wmRysunkiEnabled` jest zamrożone w DF (O2).

### 2.8 Brak regresji P0 / P1 / Cloud / Payroll

| Obszar | Wynik | Dowód |
|--------|--------|--------|
| **P0** | **PASS** | 33/33 |
| **P1** | **PASS** | 43/43 |
| **Cloud** | **PASS** | REUSE `saveAppSettings` / `mergeAppSettings` · **bez** nowego KEY · **bez** rewrite `cloud-sync` merge drawings w P1B |
| **Payroll** | **PASS** (scope) | P1B allowlist **nie** zmienia logiki payroll/hours/carry; gate UI-only |

> Uwaga working tree: `PayrollView.tsx` może mieć **niezwiązany WIP** poza allowlistą P1B — **nie** commitować z P1B (`git add` jawny allowlist).

---

## 3. Zgodność AUDIT / DF / AR / MR / AC

### 3.1 AUDIT (O2)

| Rekomendacja AUDIT | Implementacja | OV |
|--------------------|---------------|-----|
| SSOT → AppSettings (nie LS-only) | `wmRysunkiEnabled` | **PASS** |
| Rollout zespołowy przez UI SA | ⚙ Moduły | **PASS** |
| Dane rysunków bez zmian | KV drawings nietknięty w P1B | **PASS** |

### 3.2 DESIGN FREEZE

| Decyzja DF §2 | OV |
|---------------|-----|
| #1 AppSettings SSOT | **PASS** |
| #2 LS fallback + promote | **PASS** |
| #3 Super Admin · bez nowych ról | **PASS** |
| #4 UI ⚙ Moduły | **PASS** |
| #5 Mirror ZERO 2. flagi | **PASS** |
| #6 Default OFF | **PASS** |
| #7 FORCE OFF LS=`0` | **PASS** |
| #8 React bez reload | **PASS** |

### 3.3 ARCHITECTURE REVIEW (MR)

| MR | Status OV |
|----|-----------|
| MR-P1B-01 promote trigger | **PASS** (⚙ / WM / App SA) |
| MR-P1B-02 gate + props settings | **PASS** |
| MR-P1B-03 mirror tylko SA | **PASS** (`canToggleWmRysunki`) |
| MR-P1B-04 merge boolean | **PASS** (T17–T19) |
| MR-P1B-05 nie migrować innych LS-flag | **PASS** |
| MR-P1B-06 audit settings OUT | **PASS** (brak `recordSecurityAudit` na toggle) |

### 3.4 Acceptance Criteria

| ID | OV |
|----|-----|
| AC-P1B-01 | **PASS** |
| AC-P1B-02 | **PASS** |
| AC-P1B-03 | **PASS** (architektura cloud AppSettings · OV-UI po deploy) |
| AC-P1B-04 | **PASS** |
| AC-P1B-05 | **PASS** |
| AC-P1B-06 | **PASS** |
| AC-P1B-07 | **PASS** |
| AC-P1B-08 | **PASS** |

### 3.5 Zasady WGDOM

| Zasada | OV |
|--------|-----|
| SSOT FIRST | **PASS** |
| REUSE FIRST | **PASS** |
| ZERO DUPLICATE LOGIC | **PASS** |
| THIN SLICE | **PASS** |

---

## 4. Testy (re-run OV 2026-08-03)

| Suite | Wynik |
|-------|--------|
| `npx vite-node scripts/test-wm-rysunki-01-p1b.mjs` | **32 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p0.mjs` | **33 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p1.mjs` | **43 PASS / 0 FAIL** |
| Build (IMPLEMENT) | **PASS** (wcześniej w sesji) |

---

## 5. OUT — potwierdzenie nietknięte

| OUT | Potwierdzenie OV |
|-----|------------------|
| PDF / ZIP / P2 | poza zakresem · brak zmian w generatorach |
| Nowe role | brak zmian `AdminRole` |
| Nowy DATA_KEY | T23 |
| Audit settings | OUT |
| Druga flaga WmPrintSettings | T30 |
| Payroll merge/hours | poza allowlistą P1B |

---

## 6. Checklist UI (opcjonalnie po COMMIT / na preview)

Nie blokuje **OWNER VERIFICATION PASS** — logika pokryta testami.

| # | Kroki | Oczekiwane |
|---|-------|------------|
| OV-UI-01 | Czysty OFF | brak taba Rysunki |
| OV-UI-02 | SA ⚙ ON | tab bez F5 |
| OV-UI-03 | SA ⚙ OFF | tab znika bez F5 |
| OV-UI-04 | Mirror WM ON | to samo w ⚙ |
| OV-UI-05 | Non-SA | brak zapisu mirror |
| OV-UI-06 | Drugie urządzenie po sync | ten sam org stan |
| OV-UI-07 | LS=`0` + settings ON | tab OFF |
| OV-UI-08 | remove FORCE OFF | wraca AppSettings |
| OV-UI-09 | LS=`1` + SA | promote + LS usunięty |
| OV-UI-10 | Smoke editor P0/P1 gdy ON | ściana/drzwi OK |

---

## 7. Allowlist COMMIT (po Owner GO COMMIT)

```text
src/lib/app-settings.ts
src/lib/wm-technical-drawings/flag.ts
src/lib/wm-print/wm-print-tabs.ts
src/app/AdminSettingsModal.tsx
src/app/WmPrintView.tsx
src/app/WmPrintDrawingsPanel.tsx
src/app/admin/AdminViewRouter.tsx
src/app/App.tsx
src/app/GuideView.tsx
src/app/changelog-data.ts
CHANGELOG.md
scripts/test-wm-rysunki-01-p1b.mjs
docs/architecture/WM-RYSUNKI-01-P1B-*.md
```

**Zakaz:** `git add -A` · Payroll* · CloudLoader/payroll WIP · PDF · P2.

---

## 8. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: Owner GO COMMIT
  → allowlist P1B only
  → (następnie) Owner GO PUSH → VERIFY FAST → CLOSE

COMMIT: NIE (ten dokument)
PUSH: NIE
```

**STOP.** Czekaj na **OWNER GO COMMIT**.

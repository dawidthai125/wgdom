# WM-RYSUNKI-01 P1B — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1B — Feature Rollout**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT.md`](./WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P1B-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P1B-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst:** P1 CLOSED tip **2.65.97** / **`0b37787d`** · HOTFIX = EXPECTED BEHAVIOR · kod read-only: `app-settings.ts` · `flag.ts` · `AdminSettingsModal` · `App.tsx` · `CloudLoader.tsx` · `security-audit-log.ts`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1B — ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
DF spójny z AUDIT · SSOT/REUSE/ZERO DUP/THIN OK
AppSettings SSOT · LS fallback/promote/FORCE OFF OK
Toggle bez reload — wzorzec App już istnieje
Mirror bez 2. flagi OK
Audit settings: opcjonalny MR (infra istnieje, brak akcji settings dziś)

Gotowy do Owner GO IMPLEMENT P1B
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | P1B DF ↔ AUDIT ↔ living AppSettings / flag / bootstrap (read-only) |
| Mutacje | **tylko** ten dokument AR (+ pointer w DF) |
| Kryterium **FAIL** | drugi SSOT flagi · nowy DATA_KEY · nowa rola · wymuszony reload jako jedyna ścieżka · payroll/CORE rewrite · druga flaga w WmPrintSettings |
| Kryterium **PASS** | brak blokerów · DF kompletny |
| **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + MR-* do IMPLEMENT (bez amend DF) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura P1B jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT + decyzje Ownera? | **TAK** |
| Czy wolno iść w IMPLEMENT po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** (MR nie wymuszają amend) |
| Czy P1B narusza P0/P1 model rysunków? | **NIE** (tylko gate UI) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Zgodność DF ↔ AUDIT

| Temat AUDIT / Owner | DF P1B | Wynik |
|---------------------|--------|--------|
| O2 AppSettings jako SSOT | §2 #1 · §3.1 | **PASS** |
| LS nie jedyny SSOT | §2 #2 · §3.2 · §4 | **PASS** |
| Super Admin · bez nowych ról | §2 #3 · §6 | **PASS** |
| UI ⚙ Moduły → Rysunki WM | §2 #4 · §7.1 | **PASS** |
| Mirror WM Ustawienia · ZERO 2. flagi | §2 #5 · §7.2 | **PASS** |
| Default OFF | §2 #6 | **PASS** |
| LS FORCE OFF diagnostyka | §2 #7 · §5 | **PASS** |
| Bez reload · React state | §2 #8 · §8 | **PASS** |
| One-shot promote | §4.1 | **PASS** |
| OUT PDF/P2/Payroll/nowy KEY | §9.2 | **PASS** |
| AC-P1B-01…08 | §10 | **PASS** |

**Werdykt sekcji: PASS**

---

## 3. Zasady WGDOM

| Zasada | Werdykt | Dowód |
|--------|---------|--------|
| **SSOT FIRST** | **PASS** | `wmRysunkiEnabled` w `kw-app-settings`; LS nie jest org-SSOT |
| **REUSE FIRST** | **PASS** | `AppSettings` · `AdminSettingsModal` · `saveAppSettings` · `mergeAppSettings` · wzorzec `instructionsForAdminEnabled` |
| **ZERO DUPLICATE LOGIC** | **PASS** | jeden gate `isWmRysunki01Enabled` · mirror bez pola w `WmPrintSettings` |
| **THIN SLICE** | **PASS** | tylko rollout gate + UI · OUT model drawings / PDF / P2 / payroll |

**Werdykt sekcji: PASS**

---

## 4. Checklista Ownera (10 punktów)

### 4.1 AppSettings jako jedyne SSOT

**PASS.**

- Pole FROZEN: `AppSettings.wmRysunkiEnabled: boolean`
- KV: istniejący `kw-app-settings` (`APP_SETTINGS_KEY`) — **nie** nowy DATA_KEY
- Po hydrate: org truth = cloud-merged AppSettings
- Dane rysunków (`kw-wm-technical-drawings`) **nietknięte** — gate dotyczy wyłącznie widoczności taba

### 4.2 LS fallback + one-shot promote + FORCE OFF

**PASS** (semantyka DF §4–§5 kompletna).

| Mechanizm | Ocena |
|-----------|--------|
| Fallback LS `"1"` przed hydrate | **OK** — unika „zgubionej” legacy flagi |
| One-shot promote | **OK** — przenosi legacy ON → AppSettings |
| FORCE OFF LS `"0"` | **OK** — diagnostyka lokalna wygrywa nad org ON |
| LS `"1"` po hydrate vs AppSettings OFF | **OK** — nie force-ON (DF jawny) |

**MR-P1B-01:** w IMPLEMENT ustalić **jeden** trigger promote (preferowane: pierwsze otwarcie ⚙ przez Super Admin **lub** pierwsze `saveAppSettings` / sync po login SA) — unikać promote w każdym renderze.

### 4.3 Toggle bez reload

**PASS** (architektura runtime już wspiera).

Dowód living:

- `App.tsx`: `const [appSettings, setAppSettings] = useState(...)` + `onAppSettingsChange={setAppSettings}`
- `AdminSettingsModal`: `onAppSettingsChange(next); await saveAppSettings(next)` — natychmiastowy re-render menu (Przetargi / Instrukcja / Zmiany)

**Wymaganie P1B:** gate musi czytać **bieżący** `appSettings` z React (parametr / props), nie tylko LS przy starcie.

**MR-P1B-02:** `isWmRysunki01Enabled(settings?: AppSettings)` (lub równoważny getter ze stanu) + przekazanie `appSettings` do `WmPrintView` / tabs — dziś `WmPrintView` **nie** dostaje `appSettings` (wire w allowliście DF).

### 4.4 Mirror WM Ustawienia bez drugiej flagi

**PASS.**

- DF zakazuje pola w `WmPrintSettings`
- Mirror = ta sama kontrolka → `saveAppSettings` / `onAppSettingsChange`
- Non-SA: read-only lub ukryty zapis (DF)

**MR-P1B-03:** mirror tylko gdy `adminIsSuperAdmin` **lub** disabled + copy — nie pozwalać Moderatorowi zapisu przez WM (spójne z ⚙).

### 4.5 Reuse istniejącego systemu ustawień

**PASS.**

| Element | Reuse |
|---------|--------|
| Model | `AppSettings` + `defaultAppSettings` + `mergeAppSettings` |
| Persist | `saveAppSettings` → LS + cloud (`persistKey`) |
| Bootstrap | `syncAppSettingsFromCloud` (App mount) · `CloudLoader` `mergeAppSettings` |
| UI | `AdminSettingsModal` sekcja (nowa etykieta „Moduły”) |

### 4.6 Brak nowych ról

**PASS.** Toggle = Super Admin (`adminIsSuperAdmin`). Widoczność taba gdy ON = istniejący dostęp do WM Druk. Bez nowego `AdminRole`.

### 4.7 Wpływ na Cloud

**PASS · niskie ryzyko.**

| Aspekt | Ocena |
|--------|--------|
| Nowy KEY | **NIE** |
| Rewrite `cloud-sync` merge drawings | **NIE** |
| `mergeAppSettings` | **additive** boolean (jak inne flagi staff) |
| CloudLoader | już merge’uje `APP_SETTINGS_KEY` — wystarczy obsłużyć nowe pole w `mergeAppSettings` / load normalize |
| Payload size | +1 boolean — znikome |

**Zakaz P1B:** nie ruszać `finalizePayroll*` / DATA_KEYS listy poza istniejącym AUX settings path.

### 4.8 Wpływ na App bootstrap

**PASS · akceptowalny race (DF).**

```text
loadAppSettingsLocal() → UI start
  ↓
syncAppSettingsFromCloud() / CloudLoader merge → setAppSettings
  ↓
gate czyta AppSettings (React)
```

| Ryzyko | Status |
|--------|--------|
| Krótki stan OFF mimo legacy LS=1 przed hydrate | Accepted · fallback LS w gate §4 krok 4 |
| Po cloud OFF nadpisze lokalny promote | merge boolean — REUSE reguł jak `instructionsForAdminEnabled` (MR-P1B-04: kopiuj ten sam merge helper style) |

### 4.9 Wpływ na istniejące Feature Flags

**PASS · brak kolizji.**

| Flagi | Relacja do P1B |
|-------|----------------|
| LS-only lab (`kw-scope-gap-mvp`, `kw-confidence-mvp`, `kw-market-sync-01-*`, …) | **niezależne** — nie mieszać w AppSettings w P1B |
| AppSettings staff (`tendersTabForStaffEnabled`, `instructionsForAdminEnabled`, …) | **wzorzec** — P1B dołącza analogicznie |
| Legacy LS `kw-wm-rysunki-01` | **retencja** tylko fallback / promote / FORCE OFF — string bez zmiany |

**MR-P1B-05:** nie „promować” innych LS-flag do AppSettings w tym slice (scope creep).

### 4.10 Audyt zmian `wmRysunkiEnabled`

**Ocena: możliwe REUSE mechanizmu · nie zero-change · OUT domyślne P1B lub opcjonalny thin.**

| Warstwa | Stan dziś |
|---------|-----------|
| `recordSecurityAudit` / `kw-security-audit-log` | **ISTNIEJE** · używane w `AdminSettingsModal` dla **kont/haseł/ról** |
| Toggle AppSettings (Przetargi / Instrukcja / Zmiany) | **dziś BEZ** wpisu security audit |
| `SecurityAuditAction` | **whitelist** — **brak** akcji typu `app_settings_change` / `module_flag_change` |
| `wm-druk-audit` | domena WM Druk drawings/EM — **zły** SSOT na flagę org AppSettings |

| Opcja | Werdykt AR |
|-------|------------|
| **A — OUT P1B** | **Preferowane THIN** — parity z istniejącymi toggle’ami settings (też bez audytu) |
| **B — REUSE + nowa akcja** | Dodać np. `app_settings_changed` do `SecurityAuditAction` + 1 `recordSecurityAudit` przy toggle — **cienkie**, ale **poszerza** enum audytu; tylko jeśli Owner chce w IMPLEMENT |
| **C — nowy mechanizm audytu** | **ZAKAZ** P1B |

**MR-P1B-06:** domyślnie **nie** logować w P1B (A). Jeśli Owner GO „audit ON” w IMPLEMENT — wybrać **B** (jedna akcja + summary z `wmRysunkiEnabled`), bez nowego KV.

---

## 5. Mapa zależności IMPLEMENT (thin)

```text
AppSettings (+ merge/load)
    ↓
isWmRysunki01Enabled(settings?)  ← FORCE OFF / fallback / SSOT
    ↓
getVisibleWmPrintTabs / WmPrintView panel
    ↑
appSettings state (App.tsx)
    ↑
AdminSettingsModal (⚙ Moduły)  +  WmPrintView Ustawienia (mirror)
```

**Brak cyklu ARCH-001:** `flag.ts` może importować typ `AppSettings` z `app-settings` (już bez ciężkiego UI). Unikać importu `flag` → `App.tsx`.

---

## 6. Acceptance Criteria — pokrycie architektury

| ID | Architektura pokrywa? |
|----|----------------------|
| AC-P1B-01 | **TAK** |
| AC-P1B-02 | **TAK** (+ wire state MR-02) |
| AC-P1B-03 | **TAK** (cloud AppSettings) |
| AC-P1B-04 | **TAK** |
| AC-P1B-05 | **TAK** |
| AC-P1B-06 | **TAK** (+ trigger MR-01) |
| AC-P1B-07 | **TAK** |
| AC-P1B-08 | **TAK** |

**GOOD**

---

## 7. Minor Recommendations (nie blokują GO IMPLEMENT)

| ID | Rekomendacja | Gdzie | Amend DF? |
|----|--------------|-------|-----------|
| **MR-P1B-01** | Jeden trigger one-shot promote (SA open ⚙ lub first save) | IMPLEMENT flag/settings | Nie |
| **MR-P1B-02** | Gate z parametrem `AppSettings` + props do `WmPrintView` | IMPLEMENT | Nie |
| **MR-P1B-03** | Mirror zapis tylko Super Admin | IMPLEMENT WM UI | Nie |
| **MR-P1B-04** | Merge boolean skopiować styl `mergeInstructionsForAdminEnabled` | IMPLEMENT `app-settings` | Nie |
| **MR-P1B-05** | Nie migrować innych LS feature flags w P1B | scope | Nie |
| **MR-P1B-06** | Security audit toggle: default **OUT**; opcjonalnie akcja `app_settings_changed` tylko na jawny Owner | IMPLEMENT opcjonalnie | Nie (OUT domyślne) |
| **MR-P1B-07** | OV checklist: ⚙ ON bez reload · drugie urządzenie · FORCE OFF · promote z LS=1 | OV | Nie |

---

## 8. Allowlist IMPLEMENT (potwierdzenie AR)

Zgodnie z DF §12 — **bez** `git add -A` · Payroll · PDF · rewrite drawings merge.

```text
src/lib/app-settings.ts
src/lib/wm-technical-drawings/flag.ts
src/lib/wm-print/wm-print-tabs.ts          # jeśli sygnatura gate
src/app/AdminSettingsModal.tsx
src/app/WmPrintView.tsx
src/app/App.tsx / AdminViewRouter.tsx      # props appSettings → WM
src/app/GuideView.tsx
changelog + scripts/test-wm-rysunki-01-p1b.mjs
docs/architecture/WM-RYSUNKI-01-P1B-*
```

Opcjonalnie (tylko jeśli Owner audit ON): `src/lib/security-audit-log.ts` (+ 1 call w modalu).

---

## 9. Checklista wejścia Owner GO IMPLEMENT

| # | Warunek | Stan |
|---|---------|------|
| 1 | AUDIT ACCEPTED | **TAK** |
| 2 | DF P1B FROZEN | **TAK** |
| 3 | AR PASS / PASS WITH MINOR | **TAK** (ten dokument) |
| 4 | Brak blokerów | **TAK** |
| 5 | Owner GO IMPLEMENT | **WAITING** |
| 6 | Slice = **P1B only** | obowiązek |
| 7 | MR-P1B-* bez amend DF | zalecane |
| 8 | P2 / PDF | **NIE** |

---

## 10. Ryzyka residualne (nie-blokery)

| ID | Residual | Status |
|----|----------|--------|
| Hydrate race | krótki OFF | Accepted (DF) |
| FORCE OFF „zgubiony” w LS | operacyjny | Guide / OV |
| Brak audytu settings (parity) | jak inne toggles ⚙ | MR-06 OUT |
| Wire props WmPrintView | praca IMPLEMENT | MR-02 |

---

## 11. NEXT

```text
ARCHITECTURE REVIEW COMPLETE
  WERDYKT: PASS WITH MINOR RECOMMENDATIONS
        ↓
Czekaj na Owner GO IMPLEMENT (P1B)
        ↓
IMPLEMENT (+ MR-P1B-01…07) → OV → COMMIT allowlist → PUSH → PV → CLOSE

IMPLEMENT: NIE
COMMIT: NIE
PUSH: NIE
```

**STOP.**

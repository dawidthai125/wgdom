# WM-RYSUNKI-01 P1B — Feature Rollout AUDIT

> **ID:** WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1B — Feature Rollout**  
> **FAZA:** **AUDIT ONLY** · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner GO AUDIT · P1 **CLOSED** · tip **2.65.97** / **`0b37787d`** · HOTFIX AUDIT = **EXPECTED BEHAVIOR** (flaga OFF)  
> **Parents:** [`WM-RYSUNKI-01-P1-CLOSEOUT.md`](./WM-RYSUNKI-01-P1-CLOSEOUT.md) · [`WM-RYSUNKI-01-HOTFIX-AUDIT.md`](./WM-RYSUNKI-01-HOTFIX-AUDIT.md) · EPIC [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1B FEATURE ROLLOUT — AUDIT

Cel:      jak bezpiecznie udostępnić Rysunki użytkownikom
Status:   AUDIT COMPLETE · rekomendacja poniżej
IMPLEMENT: NIE (do Owner GO DESIGN FREEZE / IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Problem biznesowy (1 zdanie)

Po P1 moduł jest **produkcyjnie poprawny**, ale **niewidoczny** bez ręcznego `localStorage` — to jest zbyt nieprzejrzyste na rollout dla zespołu adminów (HOTFIX AUDIT: EXPECTED BEHAVIOR).

---

## 1. Stan obecny (AS-IS)

| Warstwa | Fakt |
|---------|------|
| Gate UI | `isWmRysunki01Enabled()` → LS `kw-wm-rysunki-01` === `"1"` |
| Default | **OFF** (`false`) |
| Sync | **brak** — LS-only · **nie** w `DATA_KEYS` (MR-03 P0) |
| Multi-device | każde urządzenie / przeglądarka osobno |
| UX Owner | konsola DevTools + reload |
| Dane rysunków | już w chmurze (`kw-wm-technical-drawings`) — gate dotyczy **tylko widoczności UI** |

**Wniosek:** problem nie jest w module rysunków, tylko w **kanale rolloutu flagi**.

---

## 2. Analiza pytań Ownera

### 2.1 Czy flaga powinna pozostać LocalStorage?

| Opcja | Werdykt |
|-------|---------|
| **Wyłącznie LS na stałe** | **NIE rekomendowane** na rollout zespołowy |
| **LS jako jedyny gate** | OK tylko dla lab / smoke / emergency kill |
| **LS całkowicie usunąć od razu** | **Ryzykowne** — traci lokalny kill-switch i kompatybilność smoke |

**Rekomendacja:** **nie** zostawiać LS jako jedynego SSOT widoczności.  
**Zachować** LS przejściowo jako **opcjonalny override** (patrz §5).

### 2.2 Czy dodać: Ustawienia WM → „Włącz moduł Rysunki”?

| Plus | Minus |
|------|-------|
| Odkrywalne w kontekście Odbiory WM | Zakładka „Ustawienia” WM widoczna dla każdego admina z dostępem do WM Druk |
| Blisko miejsca użycia | `WmPrintSettings` dziś = tylko `defaultCity` / `zipNameSuffix` — bez wzorca feature-flag |
| | Ryzyko przypadkowego włączenia przez nie-Super-Admina |

**Rekomendacja:** **opcjonalny mirror UI** w WM → Ustawienia **tylko jeśli** ten sam SSOT co w AppSettings (checkbox read/write jednej flagi).  
**Nie** tworzyć osobnego pola tylko w `kw-wm-print-settings` (ZERO DUP).

### 2.3 Czy wykorzystać istniejący system ustawień?

**TAK — REUSE FIRST.**

| System | Rola dziś | Pasuje do rolloutu Rysunki? |
|--------|-----------|------------------------------|
| **`kw-app-settings` / `AppSettings`** | Super Admin ⚙ · flagi widoczności menu (Przetargi, Instrukcja, Zmiany) · sync chmura | **NAJLEPSZY wzorzec** |
| **`kw-wm-print-settings`** | parametry generacji ZIP/miasto · sync WM | słaby fit na feature gate org |
| LS-only feature flags (Scope/Confidence/Market) | lab / tip parity OFF | wzorzec lab — nie UX rollout |

Wzorzec bliski: `tendersTabForStaffEnabled` · `instructionsForAdminEnabled` · `changesForAdminEnabled` w `AdminSettingsModal` + helpery ACL w `admin-auth.ts`.

### 2.4 Czy potrzebna jest rola Administrator?

| Decyzja | Rekomendacja |
|---------|--------------|
| **Kto włącza/wyłącza moduł (toggle)** | **tylko Super Admin** (jak Instrukcja/Zmiany) |
| **Kto widzi zakładkę gdy ON** | wszyscy użytkownicy, którzy już mają dostęp do **Odbiory WM Druk** (bez nowej roli) |
| **Moderator / Inspektor** | bez osobnej flagi P1B — nie rozszerzać ACL; Inspektor i tak nie używa pełnego WmPrint jak admin (poza scope) |
| **Nowa rola** | **NIE** — zbędna; ZERO DUP ról |

### 2.5 Jak zachować bezpieczny rollout?

Fazy (docs only — plan):

| Faza | Zachowanie | Default |
|------|------------|---------|
| **A — teraz (P1 CLOSED)** | LS-only | OFF |
| **B — P1B IMPLEMENT (rekomendowane)** | AppSettings cloud flag + UI Super Admin · LS override | OFF |
| **C — Owner enable** | Super Admin włącza na prod | ON org-wide |
| **D — opcjonalnie później** | rozważyć default ON tylko po Owner GO | tylko osobny GO |
| **E — cleanup** | deprecacja LS lub zostawienie LS=0 jako kill | po stabilizacji |

**Kill-switch (bezpieczeństwo):**

```text
effective ON =
  (AppSettings.wmRysunkiEnabled === true)
  AND NOT (localStorage kw-wm-rysunki-01 === "0")   // lokalny FORCE OFF
```

Albo prostszy wariant P1B v1: **AppSettings wygrywa**; LS używane tylko do migracji jednorazowej (patrz §4).

### 2.6 Wpływ na zasady

| Zasada | Ocena przy rekomendacji AppSettings |
|--------|-------------------------------------|
| **SSOT FIRST** | **PASS** — jedna flaga org w `kw-app-settings`; `isWmRysunki01Enabled()` czyta SSOT |
| **REUSE FIRST** | **PASS** — AdminSettingsModal + merge AppSettings + wzorzec `*ForAdminEnabled` |
| **ZERO DUPLICATE** | **PASS** — nie dublować w `WmPrintSettings` + AppSettings; WM UI = ten sam setter |
| **THIN SLICE** | **PASS** — P1B = tylko gate + UI toggle + testy flagi · **bez** PDF/P2 · **bez** payroll · **bez** zmiany modelu rysunków |

**Anti-thin (unikać w P1B):** default ON hardcode · nowa rola · nowy DATA_KEY · rewrite cloud-sync · auto-enable dla wszystkich bez toggle.

---

## 3. Opcje (porównanie)

| ID | Podejście | Multi-device | UX | Ryzyko | THIN |
|----|-----------|-------------|-----|--------|------|
| **O0** | Zostaw LS | ❌ | ❌ konsola | niski tech / wysoki operacyjny | — |
| **O1** | LS + toggle lokalny w WM (zapis tylko LS) | ❌ | ✅ lokalnie | niski | cienkie, ale słaby rollout |
| **O2 ★** | **AppSettings cloud + Super Admin ⚙** (+ opcjonalnie mirror WM) | ✅ | ✅ | niski–średni (merge settings) | ✅ |
| **O3** | Pole w `WmPrintSettings` | ✅ | ✅ w WM | średni (ACL kto może pisać) | średnie |
| **O4** | Default ON w kodzie | ✅ „działa od razu” | ✅ | **wysoki** (brak kill org) | ❌ |

---

## 4. Rekomendacja (AUDIT)

### 4.1 Werdykt

```text
REKOMENDACJA: O2 — AppSettings (chmura) jako SSOT widoczności

· Pole: wmRysunkiEnabled: boolean  (nazwa robocza — DF zamrozi)
· Default: false
· Toggle: Super Admin → Ustawienia administratorów (⚙)
· Opcjonalnie: ten sam toggle w WM Druk → Ustawienia (REUSE setter)
· isWmRysunki01Enabled(): czyta AppSettings (po hydrate) + reguły migracji LS
· Nie nowa rola · nie PDF · nie P2
```

### 4.2 Migracja LocalStorage → ustawienie systemowe

Kolejność zalecana przy przyszłym IMPLEMENT (nie teraz):

| Krok | Działanie |
|------|-----------|
| **M1** | Dodać `wmRysunkiEnabled: false` do `AppSettings` + `defaultAppSettings` + `mergeAppSettings` (wzorzec jak `instructionsForAdminEnabled`) |
| **M2** | `isWmRysunki01Enabled()`:  
| | 1) test force  
| | 2) jeśli AppSettings załadowane → **użyj pola cloud**  
| | 3) else fallback LS `"1"` / `"0"` / default OFF (okno przed sync) |
| **M3** | **One-shot promote (opcjonalne, DF):** przy pierwszym zapisie settings, jeśli LS=`"1"` i cloud=`false` → zaproponuj / auto-ustaw `true` + toast Super Admin (uniknąć „zgubiłem flagę po migracji”) |
| **M4** | UI Super Admin: checkbox **„Włącz moduł Rysunki (Odbiory WM)”** |
| **M5** | Testy: OFF default · ON po settings · LS force-off jeśli DF zamrozi override · regresja `getVisibleWmPrintTabs` |
| **M6** | Docs: GuideView — „włącz w ⚙ Super Admin” zamiast (lub obok) konsoli |
| **M7** | Po N tygodniach: LS tylko dokumentowany jako emergency / usunięcie z Guide |

**Kompatybilność wstecz:** urządzenia z już ustawionym LS=`1` działają do hydrate; po M3 org flag przejmuje SSOT.

**Nie migrować** danych `kw-wm-technical-drawings` — już w chmurze; zmienia się wyłącznie **gate UI**.

### 4.3 Czego nie robić w P1B

- ❌ Default ON bez Owner GO  
- ❌ Osobna flaga `kw-wm-rysunki-01-p1b`  
- ❌ Duplikat flagi w `WmPrintSettings` **i** AppSettings  
- ❌ Wymaganie roli Administrator do **oglądania** (wystarczy dostęp do WM)  
- ❌ Payroll / CloudLoader / nowe dependency  

---

## 5. Ryzyka

| ID | Ryzyko | Mitigation |
|----|--------|------------|
| **R1** | Przed sync AppSettings UI „mruga” OFF mimo LS=1 | Fallback LS do hydrate (M2.3) |
| **R2** | Super Admin włączy → wszyscy admini widzą tab | Intencja rolloutu; copy w UI „widoczne dla użytkowników WM Druk” |
| **R3** | Moderator przypadkowo włączy (jeśli toggle w WM bez ACL) | Toggle zapis **tylko Super Admin**; mirror WM read-only dla innych **lub** ukryty |
| **R4** | Merge AppSettings źle zmerge’uje boolean | REUSE `mergeInstructionsForAdminEnabled`-style (cloud explicit true/false) |
| **R5** | Owner oczekuje „działa od razu” bez ⚙ | Guide + tip changelog po IMPLEMENT; opcjonalnie Owner GO enable day-0 |
| **R6** | Scope creep → P2 PDF w tym samym slice | OUT P1B — twardy gate DF |

---

## 6. Acceptance Criteria (propozycja → DF)

| ID | Kryterium |
|----|-----------|
| **AC-P1B-01** | Default org: moduł **OFF** (tip parity) |
| **AC-P1B-02** | Super Admin może włączyć/wyłączyć bez DevTools |
| **AC-P1B-03** | Po ON: tab Rysunki widoczny na **innych urządzeniach** po sync AppSettings |
| **AC-P1B-04** | LS-only ścieżka nie jest jedynym SSOT po ship |
| **AC-P1B-05** | Brak nowej roli · brak nowego DATA_KEY (reuse `kw-app-settings`) |
| **AC-P1B-06** | Regresja: flaga OFF → brak taba (jak HOTFIX EXPECTED) |

---

## 7. Allowlist orientacyjna (gdy Owner GO IMPLEMENT)

```text
src/lib/app-settings.ts
src/lib/wm-technical-drawings/flag.ts
src/app/AdminSettingsModal.tsx
src/app/WmPrintView.tsx              # opcjonalny mirror
src/app/GuideView.tsx                # copy
scripts/test-wm-rysunki-01-p1b.mjs   # lub rozszerzenie P0 flag tests
changelog + docs P1B-*
```

**Zakaz:** `git add -A` · Payroll · PDF generators · rewrite merge drawings.

---

## 8. Zasady sesji

| Zasada | Status AUDIT |
|--------|--------------|
| SSOT FIRST | rekomendacja AppSettings |
| REUSE FIRST | AdminSettings + wzorzec flag staff |
| ZERO DUP | jeden boolean org |
| THIN | tylko gate + toggle |

---

## 9. NEXT

```text
AUDIT COMPLETE
  ↓
Czekaj na Owner GO DESIGN FREEZE (P1B)
  ↓
DF zamrozi: nazwa pola · override LS · mirror WM tak/nie · migracja one-shot
  ↓
AR → GO IMPLEMENT

IMPLEMENT: NIE
COMMIT: NIE
PUSH: NIE
P2: NIE
```

**STOP.** Czekaj na **Owner GO DESIGN FREEZE (P1B)** lub inny NEXT GO.

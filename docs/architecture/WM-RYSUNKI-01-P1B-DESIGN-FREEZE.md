# WM-RYSUNKI-01 P1B — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **ID:** WM-RYSUNKI-01-P1B-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1B — Feature Rollout**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-03  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **ACCEPTED**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT.md`](./WM-RYSUNKI-01-P1B-FEATURE-ROLLOUT-AUDIT.md)  
> **AR:** [`WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P1B-ARCHITECTURE-REVIEW.md)  
> **HOTFIX kontekst:** [`WM-RYSUNKI-01-HOTFIX-AUDIT.md`](./WM-RYSUNKI-01-HOTFIX-AUDIT.md) (**EXPECTED BEHAVIOR**)  
> **P1 CLOSED:** [`WM-RYSUNKI-01-P1-CLOSEOUT.md`](./WM-RYSUNKI-01-P1-CLOSEOUT.md) · tip **2.65.97** / **`0b37787d`**  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1B DESIGN FREEZE — FROZEN

SSOT: AppSettings.wmRysunkiEnabled (kw-app-settings)
Default: OFF
LS: fallback + one-shot promote · force OFF = diagnostyka
UI: Super Admin ⚙ → Moduły → Rysunki WM
Mirror: WM Druk → Ustawienia (ten sam SSOT · ZERO 2. flagi)
Toggle: React state · BEZ obowiązkowego reload
Nowe role: NIE
PDF / P2 / Payroll / nowy DATA_KEY: OUT

IMPLEMENT zakazany do: Owner GO IMPLEMENT (po AR)
════════════════════════════════════════════════════════
```

---

## 0. Cel slice P1B (zamrożony · 1 zdanie)

**P1B** udostępnia zespołowi adminów włączanie zakładki **Rysunki** przez ustawienie systemowe w chmurze (Super Admin), zamiast ręcznego `localStorage` — **bez** zmian modelu rysunków, sync drawings ani P2.

### 0.1 Relacja do EPIC / P0–P1

| Dokument | Rola |
|----------|------|
| EPIC DF | domena rysunków · KV drawings · flaga historycznie LS |
| P0/P1 CLOSEOUT | produkt Rysunki **CLOSED** · tip parity OFF |
| **AUDIT P1B** | rekomendacja O2 AppSettings |
| **Ten plik** | **amend rollout** — Owner GO DF wygrywa nad samym LS-as-SSOT z P0 MR-03 |

Konflikt flaga: **P1B DF wygrywa** dla widoczności UI (SSOT = AppSettings).  
Kontrakt danych rysunków (`kw-wm-technical-drawings`) = **bez zmian**.

---

## 1. PAYROLL SAFETY GATE (P1B)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P1B

G1–G9: FEATURE thin
Cloud: REUSE kw-app-settings · ZERO nowego DATA_KEY · ZERO rewrite drawings merge
Payroll / Hours-wipe / carry = OUT
Edge payroll = OUT
Owner GO CORE: NIE

Wynik: FEATURE UI gate only
```

---

## 2. Decyzje FROZEN (Owner GO)

| # | Temat | Decyzja FROZEN |
|---|-------|----------------|
| **1** | SSOT widoczności | **`AppSettings.wmRysunkiEnabled: boolean`** · KV **`kw-app-settings`** |
| **2** | LS | wyłącznie **fallback** + **one-shot promote** · nie SSOT |
| **3** | Role | **Super Admin** toggle · **bez nowych ról** |
| **4** | UI primary | ⚙ → sekcja **Moduły** → **Rysunki WM** |
| **5** | Mirror | Odbiory WM → **Ustawienia** · **ta sama** flaga · **ZERO** drugiej flagi |
| **6** | Default | **`false` / OFF** |
| **7** | Developer Override | LS **`kw-wm-rysunki-01 === "0"`** = **FORCE OFF** (diagnostyka) |
| **8** | Zmiana ustawienia | **React state** · **bez** obowiązkowego full reload |

---

## 3. Model ustawienia (FROZEN)

### 3.1 Pole AppSettings

```text
AppSettings {
  ...existing
  wmRysunkiEnabled: boolean   // FROZEN name
}
```

| Reguła | FROZEN |
|--------|--------|
| Default w `defaultAppSettings()` | **`false`** |
| Merge | jak inne booleany staff (`instructionsForAdminEnabled`) — cloud explicit `true`/`false` wygrywa; brak pola → local / default OFF |
| Nowy DATA_KEY | **ZAKAZ** |
| Pole w `WmPrintSettings` | **ZAKAZ** (ZERO DUP) |
| Osobny klucz LS jako SSOT | **ZAKAZ** po ship P1B |

### 3.2 Klucz LS (zachowany string)

| Klucz | Rola P1B |
|-------|----------|
| `kw-wm-rysunki-01` | **nie** SSOT · fallback / promote / force OFF |
| Wartość `"1"` | legacy ON do promote / fallback przed hydrate |
| Wartość `"0"` | **Developer Override FORCE OFF** (§5) |
| Brak klucza | brak override |

---

## 4. Gate logika — `isWmRysunki01Enabled()` (FROZEN)

Kolejność ewaluacji **obowiązkowa**:

```text
1. forceWmRysunki01ForTests (testy) → return
2. LS === "0" → return false          // Developer Override FORCE OFF
3. AppSettings dostępne (React/context/loaded):
     → return wmRysunkiEnabled === true
4. Fallback (przed hydrate / brak settings):
     → LS === "1" → true
     → else → false (default OFF)
```

| Reguła | FROZEN |
|--------|--------|
| SSOT po hydrate | **wyłącznie** `wmRysunkiEnabled` (z wyjątkiem kroku 2) |
| FORCE OFF wygrywa nad AppSettings ON | **TAK** (diagnostyka lokalna) |
| LS `"1"` **nie** nadpisuje AppSettings OFF po hydrate | **TAK** — po one-shot promote LS nie jest SSOT |
| `getVisibleWmPrintTabs` / panel Rysunki | nadal wołają **jedną** funkcję gate |

### 4.1 One-shot promote (FROZEN)

| Kiedy | Co |
|-------|-----|
| Warunek | Super Admin (lub bootstrap settings) · `wmRysunkiEnabled === false` · LS === `"1"` · promote **jeszcze nie** wykonany w tej instalacji |
| Akcja | ustaw `wmRysunkiEnabled = true` · `saveAppSettings` · oznacz promote done (flaga sesyjna lub LS marker np. `kw-wm-rysunki-01-promoted=1` — szczegóły implementacji w AR, semantyka: **jednorazowo**) |
| UX | opcjonalny toast: „Przeniesiono włączenie Rysunków do ustawień chmury” |
| Po promote | LS `"1"` **nie** jest wymagane do działania |

**Zakaz:** pętla promote przy każdym renderze · promote przy FORCE OFF (`"0"`).

---

## 5. Developer Override (FROZEN)

| Element | Wartość |
|---------|---------|
| Cel | lokalna diagnostyka / awaryjne ukrycie taba bez zmiany org |
| Mechanizm | `localStorage.setItem('kw-wm-rysunki-01','0')` |
| Skutek | gate = **OFF** nawet gdy `wmRysunkiEnabled === true` |
| UI produktu | **nie** eksponować jako główny przełącznik (Guide: tylko wzmianka diagnostyczna opcjonalnie) |
| Włączenie z powrotem | `removeItem` lub ustaw ≠ `"0"` · potem obowiązuje AppSettings |

LS `"1"` **nie** jest „developer force ON” nad AppSettings OFF po hydrate.

---

## 6. ACL / role (FROZEN)

| Akcja | Kto |
|-------|-----|
| **Zmiana** `wmRysunkiEnabled` | **tylko Super Admin** |
| **Podgląd** checkboxa (disabled) dla Admin | **opcjonalne** — DF: mirror WM dla non-SA = **read-only** lub ukryty zapis; zapis zawsze SA |
| **Widok zakładki Rysunki gdy ON** | każdy, kto ma dostęp do **Odbiory WM Druk** (bez nowej roli) |
| Nowa `AdminRole` | **ZAKAZ** |
| Osobna flaga per Moderator | **ZAKAZ P1B** |

REUSE helpera w stylu `adminIsSuperAdmin` — bez nowego enum uprawnień.

---

## 7. UI (FROZEN)

### 7.1 Primary — Super Admin ⚙

```text
AdminSettingsModal
  ↓ sekcja „Moduły”   (nowa lub istniejąca grupa etykiet — cienka)
  ↓ checkbox „Rysunki WM”
       label: Włącz zakładkę Rysunki w Odbiory WM Druk
       hint: Domyślnie wyłączone. Po włączeniu — widoczne dla użytkowników
             mających dostęp do WM Druk (sync chmura).
```

| Reguła | FROZEN |
|--------|--------|
| Zapis | `onAppSettingsChange(next)` + `saveAppSettings(next)` — jak Instrukcja/Zmiany |
| Po zapisie | **natychmiastowa** aktualizacja React state → tab bez reload (§8) |

### 7.2 Mirror — Odbiory WM → Ustawienia

| Reguła | FROZEN |
|--------|--------|
| Lokalizacja | `WmPrintView` tab **Ustawienia** |
| Kontrolka | ten sam `wmRysunkiEnabled` / te same handlery zapisu AppSettings |
| Druga flaga / `WmPrintSettings.rysunki*` | **ZAKAZ** |
| Non–Super-Admin | brak zapisu · UI ukryte **lub** disabled + copy „tylko Super Admin” |

### 7.3 GuideView

Zaktualizować copy: włączenie przez **⚙ → Moduły → Rysunki WM** (nie tylko konsola).

---

## 8. Bez reload — React state (FROZEN)

| Reguła | FROZEN |
|--------|--------|
| Źródło prawdy w runtime UI | stan `appSettings` w drzewie React (App / props) |
| Po toggle | `setAppSettings` / `onAppSettingsChange` → re-render `WmPrintView` / tabs |
| `isWmRysunki01Enabled()` | musi móc czytać **aktualny** settings (parametr lub getter podpięty do state) — **nie** wyłącznie jednorazowy odczyt LS przy starcie |
| Full `location.reload()` | **nie wymagany** do pojawienia się taba |
| Edge: pierwsza sesja przed sync | fallback LS / default OFF do hydrate — akceptowalne |

**IMPL hint (nie kod):** preferuj `isWmRysunki01Enabled(settings?: AppSettings)` lub context — AR potwierdzi minimalną inwazyjność vs global getter.

---

## 9. IN / OUT P1B

### 9.1 IN (Must)

- Pole `wmRysunkiEnabled` + merge + default OFF  
- Gate §4 + one-shot promote + FORCE OFF  
- UI ⚙ Moduły → Rysunki WM  
- Mirror WM Ustawienia (ten sam SSOT)  
- React state bez reload  
- Testy flagi / tabs / Super Admin only write  
- Guide + changelog tip  

### 9.2 OUT

| OUT | Powód |
|-----|--------|
| PDF / ZIP / P2 toolset | inny slice |
| Nowy DATA_KEY | REUSE app-settings |
| Pole w `WmPrintSettings` | ZERO DUP |
| Nowe role | Owner |
| Default ON | Owner |
| Payroll / CloudLoader rewrite | Gate |
| Zmiana modelu `WmTechnicalDrawing` | poza scope |
| Auto-enable dla wszystkich bez toggle | bezpieczny rollout |

---

## 10. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P1B-01** | Default `wmRysunkiEnabled === false` → brak taba Rysunki |
| **AC-P1B-02** | Super Admin włącza w ⚙ → tab widoczny **bez** reload |
| **AC-P1B-03** | Po sync chmury: drugie urządzenie widzi ten sam stan (org) |
| **AC-P1B-04** | Mirror WM Ustawienia zmienia **to samo** pole AppSettings |
| **AC-P1B-05** | LS `"0"` → FORCE OFF mimo AppSettings ON |
| **AC-P1B-06** | One-shot promote: LS `"1"` + settings OFF → settings ON (jednorazowo) |
| **AC-P1B-07** | Non–Super-Admin **nie** zapisuje flagi |
| **AC-P1B-08** | Brak nowego DATA_KEY · brak nowej roli · brak drugiej flagi |

---

## 11. Zgodność zasad

| Zasada | Status | Dowód |
|--------|--------|-------|
| **SSOT FIRST** | **PASS** | `wmRysunkiEnabled` jedyny org SSOT |
| **REUSE FIRST** | **PASS** | `kw-app-settings` · AdminSettingsModal · wzorzec boolean staff |
| **ZERO DUPLICATE LOGIC** | **PASS** | jeden gate · mirror bez 2. pola · brak `WmPrintSettings` dup |
| **THIN SLICE** | **PASS** | tylko rollout gate + UI · OUT PDF/P2/payroll/model |

---

## 12. Allowlist IMPLEMENT (orientacyjna)

```text
src/lib/app-settings.ts
src/lib/wm-technical-drawings/flag.ts
src/lib/wm-print/wm-print-tabs.ts          # tylko jeśli sygnatura gate
src/app/AdminSettingsModal.tsx
src/app/WmPrintView.tsx                    # mirror + podpięcie settings do gate
src/app/App.tsx                            # wire settings → gate jeśli potrzeba
src/app/GuideView.tsx
src/app/changelog-data.ts
CHANGELOG.md
scripts/test-wm-rysunki-01-p1b.mjs         # lub rozszerzenie testów flagi
docs/architecture/WM-RYSUNKI-01-P1B-*
```

**Zakaz:** `git add -A` · Payroll* · `cloud-sync` rewrite merge drawings · PDF/ZIP.

---

## 13. Ryzyka residualne (nie-blokery DF)

| ID | Residual | Status |
|----|----------|--------|
| Hydrate race | krótki OFF mimo późniejszego ON | Accepted · fallback LS |
| FORCE OFF „zgubiony” | admin nie pamięta LS=0 | Guide diagnostyka |
| Promote timing | kto triggeruje | AR wybierze: first SA open settings / first AppSettings save |

---

## 14. Definition of Done (docs P1B)

- [x] AUDIT ACCEPTED  
- [x] Decyzje Owner 1–8 zamrożone w tym pliku  
- [x] AC-P1B-01…08  
- [x] Zasady SSOT / REUSE / ZERO DUP / THIN — PASS  
- [x] ARCHITECTURE REVIEW P1B — **PASS WITH MINOR RECOMMENDATIONS**  
- [x] Owner GO IMPLEMENT · implementacja lokalna (**2.65.98**)  
- [x] OWNER VERIFICATION — **PASS** → [`WM-RYSUNKI-01-P1B-OWNER-VERIFICATION.md`](./WM-RYSUNKI-01-P1B-OWNER-VERIFICATION.md)  
- [ ] Owner GO COMMIT · PUSH · PV · CLOSE  

---

## 15. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: Owner GO COMMIT (allowlist P1B)

PUSH: NIE (do GO)
P2: NIE
```

**STOP.** Czekaj na **Owner GO COMMIT**.

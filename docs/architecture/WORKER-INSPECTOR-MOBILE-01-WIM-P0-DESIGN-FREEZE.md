# WORKER-INSPECTOR-MOBILE-01 — WIM-P0 DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** (+ **AR thin amend** 2026-08-04)  
> **ID:** WORKER-INSPECTOR-MOBILE-01-WIM-P0-DESIGN-FREEZE  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01  
> **SLICE:** **WIM-P0** — Single Mobile Viewport Contract  
> **FAZA:** **DESIGN FREEZE** · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-04 · **thin amend AR:** 2026-08-04 (DFC-WIM-P0-01…04)  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **PASS** · AR **PASS WITH DF CORRECTIONS**  
> **Parent AUDIT:** [`WORKER-INSPECTOR-MOBILE-01-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-AUDIT.md)  
> **Architecture Review:** [`WORKER-INSPECTOR-MOBILE-01-WIM-P0-ARCHITECTURE-REVIEW.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P0-ARCHITECTURE-REVIEW.md)  
> **Następne:** Owner **GO → IMPLEMENT (WIM-P0)**  
> **Tip prod (kontekst):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.05** / **`59f09c1c`**  
> **Korelacje:** MUX-E (AUDIT residual) · `.admin-app-shell` · `app-viewport.ts` · Mobile Recovery  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WIM-P0 DESIGN FREEZE — FROZEN
(+ AR thin amend DFC-WIM-P0-01…04)

CEL: Worker + Inspector piją TEN SAM kontrakt viewport
     co Admin (SSOT) — bez redesignu upload/capture/LB

WIM-DF-01: Single Mobile Viewport Contract
  height / max-height = var(--app-height, 100dvh)
  source = visualViewport (initAppViewport — REUSE as-is)
  fallback = 100dvh
  safe-area = AS-IS (preserve env insets)
  ≥md = mirror admin (--app-height + offset Top gdy dotyczy)

AR CORRECTIONS:
  Panel = relative min-h-0 (NIE h-full)
  Suspense fallback = height+max-height (NIE min-h alone)
  shells = overflow-hidden + min-height:0

OUT (twarde):
  capture UX · lightbox · toolbar · privacy shield redesign
  upload redesign · Cloud · JSON · API · Payroll · AI

IMPLEMENT zakazany do: Owner GO → IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Cel slice (zamrożony · 1 zdanie)

**WIM-P0** podłącza **Panel Pracownika** i **Panel Inspektora** do **Single Mobile Viewport Contract** (Admin = SSOT), tak aby Safari iPhone (Dynamic Island / URL bar), Android gesture bar i keyboard resize nie ucinały shella / bottom nav / sticky chrome — **bez** zmian capture, lightbox, privacy, Cloud, Payroll, AI.

### 0.1 Relacja dokumentów

| Dokument | Rola |
|----------|------|
| [`WORKER-INSPECTOR-MOBILE-01-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-AUDIT.md) | RCA · S-01/W-01/I-01 · wejście **ACCEPTED** |
| **Ten plik** | **SSOT decyzji WIM-P0** — wygrywa konflikty zakresu slice |
| Kolejne slice (P1a…) | Capture · chrome · lightbox — **NIE** w tym DF |
| Admin `.admin-app-shell` | **Wzorzec REUSE** — nie zmieniać semantyki Admin |

**Konflikt:** ten plik wygrywa dla WIM-P0. Semantyka upload/capture/LB = AUDIT P1+ / przyszłe DF.

### 0.2 Zasady FROZEN

| Zasada | Wiązanie |
|--------|----------|
| **SSOT FIRST** | Wysokość = `--app-height` z `app-viewport.ts` (już w `main.tsx`) |
| **REUSE FIRST** | Mirror `.admin-app-shell` · `.mobile-view-scroll` · istniejące safe-area / `data-keyboard-aware` |
| **ZERO DUPLICATE** | Jeden height owner per rola · **zakaz** nowego `visualViewport` listenera |
| **THIN SLICE** | Tylko shell height + scroll flex contract · zero UX product |

---

## 1. PAYROLL SAFETY GATE

```text
PAYROLL SAFETY GATE — WIM-P0

G1–G9: FEATURE thin · shell CSS / className / style height only
Cloud Sync / merge / DATA_KEY: ZERO
Edge / API / JSON schema: ZERO
Payroll / Hours-wipe / carry: OUT
AI / CORE: OUT
Capture / privacy / lightbox / upload logic: OUT

Wynik: FEATURE viewport shell only
```

---

## 2. WIM-DF-01 — Single Mobile Viewport Contract (FROZEN)

### 2.1 Kontrakt (wiążący)

| Element | Decyzja FROZEN |
|---------|----------------|
| **SSOT producer** | `src/lib/app-viewport.ts` → `initAppViewport()` w `main.tsx` — **REUSE as-is** · **zakaz rewrite** w WIM-P0 |
| **CSS variable** | `--app-height` (px z `visualViewport.height ?? innerHeight`) |
| **Consumer formula** | `height` **i** `max-height`: **`var(--app-height, 100dvh)`** |
| **Fallback** | `100dvh` (gdy zmienna nieustawiona) |
| **Zakaz** | Surowy `100dvh` / `100vh` / `100svh` jako **jedyny** SSOT wysokości shella Worker/Inspector |
| **Admin** | `.admin-app-shell` pozostaje **wzorcem i SSOT konsumera admin** — **nie zmieniać** w WIM-P0 |
| **Worker** | Root shell = konsument kontraktu (klasa `.worker-shell` **lub** równoważny inline/style) |
| **Inspector** | Root shell = konsument kontraktu (klasa `.inspector-shell`) |
| **Safe-area** | **Preserve AS-IS** (`env(safe-area-inset-*)` na header / scroll / CommandLayer / job chrome) — **nie** redesign insetów |
| **Keyboard** | Preserve `data-keyboard-aware` + istniejący `mobile-keyboard` / `.keyboard-open` — **nie** nowy keyboard SSOT |
| **Orientation** | Brak osobnego landscape polish w P0; resize/orientation → obsłużone przez istniejący `visualViewport` listener |
| **Camera / file picker / preview / forms** | **VERIFY ONLY** (regresja) — **zero** zmian atrybutów `capture`/`multiple`/`accept` / flow |
| **Sticky header / footer / bottom nav** | **VERIFY ONLY** — pozostają w drzewie flex shell; height fix musi utrzymać widoczność chrome |
| **Dynamic Island / Android gesture bar** | Pokryte przez `--app-height` + istniejące safe-area (nie osobny kod) |

### 2.2 Decyzje szczegółowe WIM-P0

| ID | Temat | Decyzja FROZEN |
|----|-------|----------------|
| **WIM-DF-01** | Single Mobile Viewport Contract | Patrz § 2.1 — **Admin SSOT · Worker+Inspector konsumenci** |
| **D-WIM-P0-01** | Worker height | `WorkerPhotoView` root: **usuń** `height: "100dvh"` → `var(--app-height, 100dvh)` (+ `max-height` parity z admin) · prefer `className` `.worker-shell` |
| **D-WIM-P0-02** | Inspector height owner | **Jeden** węzeł wysokości SSOT = **`InspectorShell`** (`.inspector-shell`). `InspectorPanel` outer: **`relative min-h-0`** — **BEZ** `h-full` · **BEZ** `100dvh` / `--app-height` *(**DFC-WIM-P0-01** — Suspense parent nie ma wysokości)* |
| **D-WIM-P0-03** | Nested 100dvh | **ZAKAZ** Panel `h-[100dvh]` + Shell `h-[100dvh]` jednocześnie · **ZAKAZ** Panel `h-full` jako second owner |
| **D-WIM-P0-04** | CSS SSOT (preferowany) | W `mobile.css`: `.worker-shell` / `.inspector-shell` **mirror** `.admin-app-shell` (`height`/`max-height`/`min-height:0`/`overflow-hidden`; `@media ≥768` + `--app-viewport-offset-top` jak admin) *(**DFC-WIM-P0-03**)* |
| **D-WIM-P0-05** | Scroll contract | Primary scroll Worker + Inspector workspace: **`flex-1` + `min-h-0`** · prefer REUSE `.mobile-view-scroll` gdzie pasuje bez refaktoru drzewa |
| **D-WIM-P0-06** | Overflow shell | Shell: **`overflow-hidden`** + `min-h-0` jak admin — scroll **wewnątrz** child, nie document |
| **D-WIM-P0-07** | `app-viewport.ts` | **REUSE as-is** — zero zmian logiki |
| **D-WIM-P0-08** | Desktop ≥md Inspector | Sidebar path: ten sam `--app-height` + offset Top (mirror admin) · **bez** zmiany layoutu sidebar |
| **D-WIM-P0-09** | Suspense fallback Inspector | **OBOWIĄZKOWY:** ten sam box co shell — `height` **i** `max-height`: `var(--app-height, 100dvh)` (+ `min-height:0`) · **zakaz** samego `min-h-*` *(**DFC-WIM-P0-02** / **WIM-AR-01**)* · prefer `.inspector-shell` lub shared `.wg-mobile-viewport-shell` |
| **D-WIM-P0-10** | Sticky / forms / upload | **Zero** zmian JSX flow — tylko shell/scroll class · regresja AC |
| **D-WIM-P0-11** | Modal lock CSS | Rozszerzenie `html.modal-scroll-locked .inspector-shell` — **OUT WIM-P0** (AUDIT I-14 = P2) |
| **D-WIM-P0-12** | `100vh` inventory | W `src/` **0×** `100vh` (stan 2026-08-04) — **zakaz wprowadzania** `100vh` jako shell height |
| **D-WIM-P0-13** | First paint / kamera | `initAppViewport` przed `createRoot` · powrót z aparatu = VV resize (oczekiwane) · Suspense nie remountuje po cache · fallback↔shell bez jump *(**WIM-AR-01**)* |

### 2.3 Inventory — miejsca wysokości (WIM-P0)

#### IN scope (musi przejść na kontrakt)

| Plik | Stan dziś | Wymaganie FROZEN |
|------|-----------|------------------|
| `src/app/WorkerPhotoView.tsx` ~683 | `height: "100dvh"` | → `var(--app-height, 100dvh)` + max-height · `.worker-shell` |
| `src/app/inspector/InspectorShell.tsx` ~22 | `h-[100dvh]` | → `.inspector-shell` CSS (height+max-height+overflow-hidden) |
| `src/app/InspectorPanel.tsx` ~630 | `h-[100dvh]` | → `relative min-h-0` (**nie** `h-full`) |
| `src/styles/mobile.css` | tylko `.admin-app-shell` | + `.worker-shell` / `.inspector-shell` mirror (+ overflow-hidden) |
| `src/app/AppInnerWithAuth.tsx` (Suspense) | `min-h-[100dvh]` | → **height+max-height** `var(--app-height,100dvh)` (nie min-h) |

#### VERIFY / regress (nie zmieniać logiki w P0)

| Powierzchnia | Plik / obszar | WIM-P0 |
|--------------|---------------|--------|
| Sticky header Worker (job progress) | `WorkerPhotoView` sticky | VERIFY |
| Sticky job chrome Inspector | `InspectorJobWorkspace` | VERIFY |
| Bottom nav Inspector | `InspectorShell` + nav child | VERIFY widoczność w viewport |
| Safe-area top/bottom | CommandLayer · Worker header · scroll padding | PRESERVE |
| Keyboard | `data-keyboard-aware` Worker · sheets Inspector | PRESERVE |
| Camera / file picker / preview | Worker + Inspector inputs | VERIFY ONLY |
| Forms | `JobReportForm` · checklist · billing sheet | VERIFY ONLY |
| Fullscreen overlays (privacy / LB) | `fixed inset-0` | **OUT** redesign · nie ruszać w P0 |

#### OUT of WIM-P0 (nie touch height — inne role)

| Plik | Powód |
|------|-------|
| `CloudLoader.tsx` `100dvh` | Bootstrap — poza Worker/Inspector shell |
| `LoginScreen.tsx` `min-h-[100dvh]` | Auth — poza slice |
| `ClientShareView.tsx` | Share — poza slice |
| `WmPrintDrawingsPanel.tsx` | Już `--app-height` · osobny epic |

---

## 3. Boundary (IN / OUT)

### 3.1 IN — WIM-P0

| # | Zakres |
|---|--------|
| 1 | Worker root shell height/max-height contract |
| 2 | Inspector single height owner (`InspectorShell`) |
| 3 | `InspectorPanel` = `relative min-h-0` (bez `h-full` / dual viewport) |
| 4 | `mobile.css` `.worker-shell` / `.inspector-shell` (mirror admin + overflow-hidden) |
| 5 | Scroll `min-h-0` / opcjonalnie `.mobile-view-scroll` na primary scroll |
| 6 | Suspense fallback = height+max-height (WIM-AR-01) |
| 7 | Smoke test markery + changelog przy GO COMMIT (później) |

### 3.2 OUT — WIM-P0 (twarde)

| OUT | Powód |
|-----|-------|
| Capture UX (`capture` / `multiple` split) | WIM-P1a / P1b |
| Lightbox unify / pinch / zoom | WIM-P1d |
| Toolbar / CommandLayer compact | WIM-P1c |
| Privacy shield redesign / suppress wiring | WIM-P1a |
| Upload redesign / compression / watermark | Poza P0 |
| Cloud Sync / JSON / API / Edge | CORE |
| Payroll / Hours-wipe | CORE |
| AI | Osobne |
| `app-viewport.ts` rewrite | REUSE |
| Landscape polish / history.pushState | WIM-P2 |
| Modal lock CSS `.inspector-shell` | P2 (I-14) |
| GPS · toast Worker · offline receipts | P2 / backlog |
| WM-RYSUNKI / Admin shell changes | Osobne |

### 3.3 Boundary check

| Check | Werdykt |
|-------|---------|
| FEATURE vs CORE | **FEATURE** shell CSS |
| Mixed Payroll write-path? | **NIE** |
| Shared cloud-sync? | **NIE** |
| Admin behavior change? | **NIE** (mirror only) |
| Capture/LB behavior change? | **NIE** |

---

## 4. Risks

| ID | Ryzyko | Impact | Mitygacja |
|----|--------|--------|-----------|
| **R-WIM-01** | `--app-height` kurczy się z keyboard → double padding z `data-keyboard-aware` | Medium | Preserve AS-IS; device OV Safari; nie dodawać drugiego inset SSOT |
| **R-WIM-02** | `h-full` na Panel bez wysokości rodzica = collapse | High | **ZAMKNIĘTE DFC-WIM-P0-01:** Panel `relative min-h-0` · Shell self-size |
| **R-WIM-07** | Suspense `min-h` ≠ shell `height` → jump / „trzęsienie” first paint | Medium | **ZAMKNIĘTE DFC-WIM-P0-02:** fallback = height+max-height |
| **R-WIM-03** | Tailwind `h-[var(--app-height,100dvh)]` niekompatybilne w build | Low | Prefer **CSS class** w `mobile.css` (jak admin) |
| **R-WIM-04** | Regresja bottom nav / sticky po `overflow-hidden` | Medium | AC device + smoke; zero zmian struktury nav |
| **R-WIM-05** | Scope creep capture/LB w „przy okazji” | High | Twardy OUT + allowlist |
| **R-WIM-06** | Field FAIL mimo unit PASS | Medium | Owner device OV obowiązkowe przed CLOSE |

---

## 5. Acceptance Criteria (WIM-P0)

| ID | Kryterium | Typ |
|----|-----------|-----|
| **AC-WIM-P0-01** | Worker root używa `var(--app-height, 100dvh)` (height **i** max-height) — **brak** surowego `height: "100dvh"` / `h-[100dvh]` na shellu | Unit + code |
| **AC-WIM-P0-02** | `.inspector-shell` (lub równoważne) używa `var(--app-height, 100dvh)` (+ overflow-hidden) | Unit + code |
| **AC-WIM-P0-03** | `InspectorPanel` = `relative min-h-0` — **bez** `h-[100dvh]` · **bez** `h-full` — jeden height owner = Shell | Unit + code |
| **AC-WIM-P0-15** | Suspense fallback: `height`+`max-height` `var(--app-height,100dvh)` — **nie** sam `min-h` · brak jump vs shell | Unit + visual |
| **AC-WIM-P0-16** | Powrót z aparatu: brak Suspense remount flicker; VV resize dopuszczalny | Device OV |
| **AC-WIM-P0-04** | `.admin-app-shell` **bez zmian** semantyki wysokości | Diff guard |
| **AC-WIM-P0-05** | `app-viewport.ts` **bez zmian** | Diff guard |
| **AC-WIM-P0-06** | Safari iPhone: shell mieści się w visualViewport (URL bar open/closed) — bottom nav / Worker CTA widoczne | Device OV |
| **AC-WIM-P0-07** | Chrome Android: gesture bar nie ucina bottom nav / Worker footer chrome | Device OV |
| **AC-WIM-P0-08** | Sticky Worker job header + Inspector job chrome nadal sticky w swoim scrollu | Device OV |
| **AC-WIM-P0-09** | Keyboard: fokus pola w `JobReportForm` / Inspector form — bez regresji (scroll/aware) | Device OV |
| **AC-WIM-P0-10** | Upload zdjęć Worker + Inspector (aparat/galeria **AS-IS**) — regresja PASS | Device OV |
| **AC-WIM-P0-11** | Desktop ≥md Inspector sidebar path PASS | Manual |
| **AC-WIM-P0-12** | Zero diff: `cloud-sync` · payroll · AI · capture attrs · lightbox | Diff guard |
| **AC-WIM-P0-13** | Smoke `test-worker-inspector-mobile-p0.mjs` PASS | CI/local |
| **AC-WIM-P0-14** | Zakaz `100vh` jako shell height Worker/Inspector | Unit |

---

## 6. Allowlist (IMPLEMENT — po GO AR + GO IMPLEMENT)

### 6.1 IN

| Plik | Dozwolona zmiana |
|------|------------------|
| `src/styles/mobile.css` | Dodać `.worker-shell` / `.inspector-shell` mirror `.admin-app-shell` (mobile + `@media ≥768` + `overflow-hidden`) |
| `src/app/WorkerPhotoView.tsx` | Root: class `.worker-shell` · usunąć surowy `100dvh` · scroll `min-h-0` / opcjonalnie `.mobile-view-scroll` |
| `src/app/inspector/InspectorShell.tsx` | Usunąć `h-[100dvh]` · polegać na `.inspector-shell` CSS |
| `src/app/InspectorPanel.tsx` | Outer: `relative min-h-0` (**nie** `h-full` · bez dual viewport) |
| `src/app/AppInnerWithAuth.tsx` | Suspense fallback: `height`+`max-height` `var(--app-height,100dvh)` (nie min-h) |
| `scripts/test-worker-inspector-mobile-p0.mjs` | **NEW** — markery kontraktu |
| `src/app/changelog-data.ts` | Bump przy GO COMMIT |
| `CHANGELOG.md` | Skrót przy GO COMMIT |
| Docs slice | IMPLEMENT / OV / PV / CLOSE — po fazach |

### 6.2 OUT (zakaz touch)

| Plik / obszar |
|---------------|
| `src/lib/app-viewport.ts` |
| `src/lib/cloud-sync.ts` · Edge · payroll libs |
| Capture / `HiddenFileInput` logic · privacy shield |
| Lightbox L3/L4/L5 · CommandLayer layout · bottom nav markup redesign |
| `WmPrint*` · AI · JSON drawings |

---

## 7. Release Plan

```text
WIM-P0 RELEASE PIPELINE (wiążący)

1. DESIGN FREEZE (ten plik) .............. FROZEN + AR thin amend
2. ARCHITECTURE REVIEW ................... COMPLETE (PASS WITH DF CORRECTIONS)
3. Thin DF amend DFC-01…04 ............... APPLIED
4. OWNER GO → IMPLEMENT ................. dopiero wtedy kod
5. BUILD + smoke P0
6. OWNER VERIFICATION (device Safari + Android)
7. OWNER GO → COMMIT / PUSH
8. VERIFY DEPLOY FAST (jedno version.json)
9. PRODUCTION VERIFY → CLOSEOUT
10. STOP — nie startuj WIM-P1* bez Owner GO → AUDIT/DF
```

| Tryb release | Rekomendacja |
|--------------|--------------|
| Bundle size | **&lt; 15 plików** → **FAST RELEASE** |
| Hotfix class | **BUGFIX** + **UX** (viewport shell) |
| Deploy | `git push origin main` tylko po Owner GO |

---

## 8. Test Matrix

| Warstwa | Co | Pass gdy |
|---------|-----|----------|
| Unit smoke | Markery `--app-height` na Worker/Inspector shell; brak dual `100dvh` Panel+Shell | Script PASS |
| Diff guard | Brak zmian `app-viewport.ts` / cloud / payroll / capture attrs | Diff clean |
| Manual Worker portrait | Lista → detal → scroll → sticky → CTA dolne | Widoczne w VV |
| Manual Inspector portrait | Tabs → bottom nav → open job → sticky chrome → back | Nav/chrome OK |
| Keyboard | Focus input Worker docs / Inspector | Brak ucięcia krytycznego |
| Camera/picker | Otwórz aparat/galeria AS-IS | Regresja PASS |
| Orientation | Rotate note only (P0 nie certyfikuje landscape) | No crash |
| Desktop ≥md | Inspector sidebar | PASS |
| Admin regress | Admin shell height | Bez zmian |

### Device Matrix (OV)

| Device | Priorytet WIM-P0 |
|--------|------------------|
| Safari iPhone (Dynamic Island) | **P0** |
| Chrome Android | **P0** |
| Samsung Internet | P1 |
| iPad / Pixel / Galaxy | P1 |

---

## 9. Mapowanie AUDIT → DF

| AUDIT ID | WIM-P0 |
|----------|--------|
| S-01 / W-01 / I-01 / I-02 | **IN** — zamyka slice |
| W-02+ · I-03+ · lightbox · capture | **OUT** → P1+ |
| I-14 modal lock CSS | **OUT** → P2 |

---

## 10. AR thin amend — DFC (2026-08-04)

| ID | Treść |
|----|-------|
| **DFC-WIM-P0-01** | Panel `relative min-h-0` — zakaz `h-full` |
| **DFC-WIM-P0-02** | Suspense fallback = height+max-height (zakaz min-h-only) · D-WIM-P0-09 mandatory |
| **DFC-WIM-P0-03** | Shell classes: overflow-hidden + min-height:0 |
| **DFC-WIM-P0-04** | AC-WIM-P0-15/16 — first paint / kamera |

Źródło: [`WORKER-INSPECTOR-MOBILE-01-WIM-P0-ARCHITECTURE-REVIEW.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P0-ARCHITECTURE-REVIEW.md)

---

## 11. Werdykt DESIGN FREEZE

```text
DF STATUS:     FROZEN (WIM-P0) + AR thin amend DFC-01…04
WIM-DF-01:     Single Mobile Viewport Contract — ACCEPTED
AR:            PASS WITH DF CORRECTIONS → amend APPLIED
IMPLEMENT:     BLOCKED do Owner GO IMPLEMENT
COMMIT/PUSH:   BLOCKED

Następne: OWNER GO → IMPLEMENT (WIM-P0)
```

---

*DESIGN FREEZE ONLY · bez implementacji · bez commit · bez push.*

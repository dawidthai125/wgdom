# WORKER-INSPECTOR-MOBILE-01 — WIM-P0 ARCHITECTURE REVIEW

> **ID:** WORKER-INSPECTOR-MOBILE-01-WIM-P0-ARCHITECTURE-REVIEW  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01  
> **SLICE:** **WIM-P0** — Single Mobile Viewport Contract  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH DF CORRECTIONS** *(≡ CHANGE REQUIRED → thin amend DF · potem READY)*  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WORKER-INSPECTOR-MOBILE-01-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-AUDIT.md) (**PASS**) · [`WORKER-INSPECTOR-MOBILE-01-WIM-P0-DESIGN-FREEZE.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P0-DESIGN-FREEZE.md) (**FROZEN** + thin amend z tego AR)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.05** / **`59f09c1c`**  
> **Kod read-only:** `app-viewport.ts` · `mobile-keyboard.ts` · `mobile.css` · `main.tsx` · `AppInnerWithAuth.tsx` · `WorkerPhotoView.tsx` · `InspectorPanel.tsx` · `InspectorShell.tsx` · `App.tsx` (admin shell)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WIM-P0 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH DF CORRECTIONS
         (CHANGE REQUIRED → thin DF amend · brak blokerów CORE)

WIM-DF-01:   PASS (kontrakt poprawny · Admin SSOT)
WIM-AR-01:   CHANGE → DFC (Suspense box = height+max-height, nie min-h)

Blokery Cloud/JSON/API/Payroll/AI: BRAK
Blokery mount height:
  → zakaz Panel h-full bez wysokości rodzica (Suspense)
  → height owner = .inspector-shell / .worker-shell ONLY

Po thin amend DF → READY FOR Owner GO IMPLEMENT WIM-P0
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF WIM-P0 ↔ AUDIT S-01/W-01/I-01 ↔ living viewport / shell mount |
| **FAIL** | Wymaga Cloud/Payroll/AI · brak wykonalnej ścieżki Safari |
| **CHANGE REQUIRED** | DF nie domyka ownership / Suspense first-paint |
| **PASS** | Brak blokerów + DF kompletny bez korekt |
| **PASS WITH DF CORRECTIONS** | Brak blokerów CORE + **obowiązkowy thin amend DF** przed IMPLEMENT |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy WIM-DF-01 jest wykonalny thin? | **TAK** — REUSE admin |
| Czy Admin zostaje SSOT producer? | **TAK** — `app-viewport.ts` as-is |
| Czy są blokery CORE? | **NIE** |
| Czy DF wymaga korekt przed IMPLEMENT? | **TAK** — thin (§6 / DFC) |
| Czy wolno IMPLEMENT po amend + Owner GO? | **TAK** |

**WERDYKT: PASS WITH DF CORRECTIONS**

---

## 2. Checklist weryfikacji

| # | Temat | Werdykt | Uzasadnienie |
|---|-------|---------|--------------|
| **1** | `app-viewport.ts` | **PASS** | `visualViewport.height ?? innerHeight` → `--app-height` · sync przed `createRoot` w `main.tsx` · DF D-WIM-P0-07 REUSE |
| **2** | `visualViewport` | **PASS** | Listener resize/scroll już globalny · **zakaz** drugiego listenera w Worker/Inspector |
| **3** | `--app-height` | **PASS** | Admin + (target) Worker/Inspector konsumenci · formula `var(--app-height, 100dvh)` |
| **4** | WorkerShell | **PASS** | Root `WorkerPhotoView` → `.worker-shell` mirror admin · dziś `height:"100dvh"` = gap AUDIT W-01 |
| **5** | InspectorShell | **PASS** | `.inspector-shell` = height SSOT · dziś `h-[100dvh]` |
| **6** | Jeden owner height | **PASS** (+ DFC) | Owner = Shell (Worker root / InspectorShell) · Panel **nie** second viewport |
| **7** | Brak dual height | **PASS** (+ DFC) | D-WIM-P0-03 OK · korekta: Panel **bez** `h-full` (patrz §4 / DFC-01) |
| **8** | `mobile.css` | **PASS** | Mirror `.admin-app-shell` dla `.worker-shell` / `.inspector-shell` (+ ≥768 offset) |
| **9** | Safe-area | **PASS** | Preserve AS-IS · nie redesign |
| **10** | Keyboard | **PASS** | `initMobileKeyboard` + `data-keyboard-aware` REUSE · `--app-height` kurczy się z VV przy keyboard — oczekiwane; nie dublować inset SSOT |
| **11** | Camera / picker | **PASS** | VERIFY ONLY · OUT redesign · powrót z aparatu ≠ Suspense remount (chunk cached) |
| **12** | Sticky | **PASS** | VERIFY · sticky wewnątrz scroll child · shell `overflow-hidden` + child scroll |
| **13** | Orientation | **PASS** | P0 = VV resize · landscape polish OUT |
| **14** | Suspense fallback | **CHANGE → DFC** | D-WIM-P0-09 `min-h` ≠ final `height`/`max-height` → ryzyko jump (**WIM-AR-01**) |
| **15** | Hydration / first paint | **PASS** (+ note) | SPA · `initAppViewport()` **przed** `createRoot` → `--app-height` na pierwszym React paint · brak SSR hydrate mismatch |
| **16** | Viewport ownership | **PASS** (+ DFC) | Producer = `app-viewport` · consumer shells only · Panel wrapper nie owner |

---

## 3. Target architecture (WIM-P0)

```text
main.tsx
  initAppViewport()  →  :root { --app-height: Npx }   ← SSOT PRODUCER (Admin wzorzec)
  initMobileKeyboard() → --keyboard-inset / .keyboard-open

AppInnerWithAuth
├─ worker:
│    WorkerPhotoView.root.worker-shell
│      height/max-height: var(--app-height, 100dvh)
│      overflow-hidden · min-h-0 · flex-col
│      └─ scroll.flex-1.min-h-0[.mobile-view-scroll] · data-keyboard-aware
│
└─ inspector:
     Suspense
     ├─ fallback: TEN SAM box co shell (height+max-height, nie min-h alone)
     └─ InspectorPanel.relative.min-h-0     ← NIE h-full · NIE 100dvh
          └─ InspectorShell.inspector-shell  ← JEDYNY height owner
               height/max-height: var(--app-height, 100dvh)
               overflow-hidden · flex-col · min-h-0
               ├─ CommandLayer (safe-area-top) shrink-0
               ├─ workspace flex-1 min-h-0
               └─ BottomNav shrink-0 (md:hidden)
```

**Admin (referencja — nie zmieniać):**

```text
div.admin-app-shell  →  height/max-height: var(--app-height, 100dvh)
```

---

## 4. WIM-AR-01 — Suspense fallback / first paint / kamera

### 4.1 Problem

| Stan | Box model |
|------|-----------|
| DF D-WIM-P0-09 (as-written) | Fallback: **`min-h-[var(--app-height,100dvh)]`** |
| Final `.inspector-shell` | **`height` + `max-height`: `var(--app-height, 100dvh)`** |

**Różnica:** `min-height` ≠ `height`/`max-height` → przy swap Suspense→Panel możliwy **layout jump** (wysokość / overflow / centrowanie „Ładowanie…”).

### 4.2 „Trzęsący się ekran” — źródła

| Źródło | Czy WIM-P0? | Werdykt |
|--------|-------------|---------|
| Suspense fallback ↔ final shell (różny box) | **TAK — ryzyko** | **DFC-WIM-P0-02** — ujednolicić box |
| Remount Suspense po powrocie z aparatu | **NIE** (lazy chunk już w cache; input camera nie unmountuje drzewa przez Suspense) | Note only |
| `visualViewport` resize po powrocie z Camera UI / URL bar | **TAK — oczekiwane** | Shell **ma** się dopasować do `--app-height` — to cel kontraktu, nie bug |
| Worker first paint | Brak Suspense | Tylko `--app-height` sync (już przed render) |

### 4.3 Decyzja AR (FROZEN po amend)

1. Fallback Inspector **musi** używać **identycznego** kontraktu wysokości co `.inspector-shell`: `height` **i** `max-height` = `var(--app-height, 100dvh)` (+ `min-height: 0` · `overflow-hidden` opcjonalnie).  
2. Prefer: ta sama klasa `.inspector-shell` **lub** shared utility `.wg-mobile-viewport-shell` użyta przez Worker + Inspector + fallback.  
3. **Zakaz** samego `min-h-*` jako SSOT fallbacku.  
4. D-WIM-P0-09: **OBOWIĄZKOWY** (nie „opcjonalnie w allowlist”).

---

## 5. Risk R-WIM-02 — Panel `h-full` pod Suspense

### 5.1 Evidence

```text
AppInnerWithAuth
  └─ Suspense          ← brak explicit height
       └─ InspectorPanel  (DF proponował h-full)
            └─ InspectorShell (height owner)
```

`height: 100%` (`h-full`) na Panelu przy rodzicu o wysokości `auto` → **collapse / niestabilny layout** (klasyczny CSS).

### 5.2 Decyzja AR

**DFC-WIM-P0-01:** `InspectorPanel` outer = **`relative min-h-0`** (ew. `flex flex-col` jeśli potrzebne) — **BEZ** `h-full`, **BEZ** `100dvh` / `--app-height`.  
Shell sam ustawia wysokość viewport → Panel blokowy **rozciąga się naturalnie** do dziecka.

---

## 6. DF Corrections (obowiązkowy thin amend)

| ID | Korekta | Dotyczy |
|----|---------|---------|
| **DFC-WIM-P0-01** | Panel: `relative min-h-0` — **zakaz** `h-full` jako wymóg | D-WIM-P0-02 · inventory Panel · R-WIM-02 |
| **DFC-WIM-P0-02** | Suspense fallback = **height + max-height** `var(--app-height, 100dvh)` (nie `min-h`) · D-WIM-P0-09 **mandatory** | **WIM-AR-01** |
| **DFC-WIM-P0-03** | `.worker-shell` / `.inspector-shell`: jawnie `overflow-hidden` + `min-height: 0` (parity admin class + `App.tsx` overflow-hidden) | D-WIM-P0-06 |
| **DFC-WIM-P0-04** | AC: brak jump Suspense→shell (visual) · smoke marker fallback height≠min-h-only | AC-WIM-P0-* |

**Po amend:** DF pozostaje **FROZEN** z adnotacją AR thin amend · IMPLEMENT odblokowany dopiero po Owner **GO IMPLEMENT**.

---

## 7. Boundary OUT (potwierdzone)

| OUT | AR |
|-----|-----|
| Upload redesign · capture UX · lightbox · toolbar · privacy | **POTWIERDZONE OUT** |
| Cloud · JSON · API · Payroll · AI | **POTWIERDZONE OUT** |
| Rewrite `app-viewport.ts` | **OUT** |
| Admin `.admin-app-shell` semantics change | **OUT** |

---

## 8. Final recommendation przed IMPLEMENT

```text
1. Zastosuj thin amend DF (DFC-WIM-P0-01…04) — w tym samym cyklu docs.
2. Owner GO → IMPLEMENT WIM-P0 według allowlist (po amend).
3. Implementacja:
   - mobile.css: .worker-shell + .inspector-shell (mirror admin + overflow-hidden)
   - WorkerPhotoView: class worker-shell; usuń surowy 100dvh
   - InspectorShell: class only (usuń h-[100dvh])
   - InspectorPanel: relative min-h-0 (NIE h-full, NIE 100dvh)
   - Suspense fallback: height+max-height var(--app-height,100dvh) — ten sam box
4. Smoke + device OV (Safari iPhone + Chrome Android)
5. NIE startuj WIM-P1* bez kolejnego Owner GO
```

**Gotowość:** **READY FOR IMPLEMENT** po thin DF amend + Owner GO IMPLEMENT.

---

## 9. Werdykt

| Pole | Wartość |
|------|---------|
| **Architecture Review** | **COMPLETE** |
| **PASS / CHANGE REQUIRED** | **PASS WITH DF CORRECTIONS** (= CHANGE REQUIRED na thin DF) |
| **WIM-DF-01** | **PASS** (z DFC ownership/Suspense) |
| **WIM-AR-01** | **ADDRESSED** via DFC-WIM-P0-02 |
| **IMPLEMENT** | **BLOCKED** do Owner GO IMPLEMENT |
| **COMMIT / PUSH** | **NIE** |

---

*ARCHITECTURE REVIEW ONLY · bez implementacji · bez commit · bez push.*

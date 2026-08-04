# WORKER-INSPECTOR-MOBILE-01 — WIM-P0 OWNER VERIFICATION

> **ID:** WORKER-INSPECTOR-MOBILE-01-WIM-P0-OWNER-VERIFICATION  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01  
> **SLICE:** **WIM-P0** — Single Mobile Viewport Contract  
> **FAZA:** **OWNER VERIFICATION** (po IMPLEMENT · przed COMMIT)  
> **Data:** 2026-08-04  
> **Baseline tip (prod, przed release):** UI **2.66.05** / **`59f09c1c`**  
> **Changelog (local):** **2.66.06**  
> **Wejście:** DF (+ DFC-01…04) · AR PASS WITH DF CORRECTIONS · Owner GO IMPLEMENT  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WIM-P0 — OWNER VERIFICATION REPORT

IMPLEMENT:     DONE (local · uncommitted)
BUILD:         PASS
SMOKE:         21 PASS / 0 FAIL
SELF-REVIEW:   PASS (allowlist · DFC)

DEVICE OV:     PENDING OWNER (Safari iPhone + Chrome Android)
COMMIT/PUSH:   BLOCKED — czekaj Owner GO → COMMIT

WERDYKT AGENTA: IMPLEMENTATION COMPLETE (code+smoke)
                RELEASE NOT READY (brak commit)
════════════════════════════════════════════════════════
```

---

## 1. Self Review (agent)

| Check | Wynik |
|-------|-------|
| WIM-DF-01 konsumenci Worker + Inspector | **PASS** — `.worker-shell` / `.inspector-shell` |
| DFC-WIM-P0-01 Panel `relative min-h-0` · zakaz `h-full` | **PASS** |
| DFC-WIM-P0-02 Suspense `height`+`maxHeight` `--app-height` | **PASS** |
| DFC-WIM-P0-03 `overflow: hidden` + `min-height: 0` | **PASS** (CSS) |
| Jeden height owner Inspector = Shell | **PASS** |
| REUSE `app-viewport.ts` / visualViewport | **PASS** — zero diff |
| OUT: upload / capture / lightbox / privacy / Cloud / Payroll / AI | **PASS** — nie ruszane |
| Admin `.admin-app-shell` semantics | **PASS** — bez zmian semantyki |

### Pliki IMPLEMENT (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/styles/mobile.css` | `.worker-shell` / `.inspector-shell` mirror admin + overflow |
| `src/app/WorkerPhotoView.tsx` | `worker-shell` · `mobile-view-scroll` |
| `src/app/inspector/InspectorShell.tsx` | usunięto `h-[100dvh]` |
| `src/app/InspectorPanel.tsx` | `relative min-h-0` |
| `src/app/AppInnerWithAuth.tsx` | Suspense height+maxHeight |
| `scripts/test-worker-inspector-mobile-p0.mjs` | **NEW** smoke |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.66.06** |
| Docs AUDIT/DF/AR/OV | docs slice |

---

## 2. Build / Smoke

| Test | Wynik |
|------|-------|
| `npx vite-node scripts/test-worker-inspector-mobile-p0.mjs` | **21 PASS / 0 FAIL** |
| `npm run build` | **PASS** |

---

## 3. AC checklist (kod)

| AC | Status |
|----|--------|
| AC-WIM-P0-01 Worker `--app-height` | **PASS** (smoke T06–T07) |
| AC-WIM-P0-02 Inspector shell | **PASS** (T10–T11) |
| AC-WIM-P0-03 Panel min-h-0 · no h-full | **PASS** (T12–T14) |
| AC-WIM-P0-04/05 Admin + app-viewport untouched | **PASS** |
| AC-WIM-P0-12 OUT guards | **PASS** (self-review) |
| AC-WIM-P0-13 Smoke | **PASS** |
| AC-WIM-P0-15 Suspense box | **PASS** (T15–T17) |
| AC-WIM-P0-06…11 · 16 Device | **PENDING OWNER** |

---

## 4. Device OV — Owner checklist (obowiązkowe przed CLOSE)

| # | Krok | Device | Pass? |
|---|------|--------|-------|
| D1 | Worker: lista + detal — CTA / scroll w visualViewport (URL bar open/closed) | Safari iPhone | ☐ |
| D2 | Inspector: bottom nav widoczny; open job — sticky chrome | Safari iPhone | ☐ |
| D3 | Suspense „Ładowanie…” → shell bez jump wysokości | Safari / throttled | ☐ |
| D4 | Keyboard: fokus w JobReportForm / Inspector form | Safari | ☐ |
| D5 | Upload AS-IS (aparat/galeria) — regresja | Safari + Android | ☐ |
| D6 | Chrome Android: gesture bar nie ucina nav/CTA | Android | ☐ |
| D7 | Desktop ≥md Inspector sidebar | Desktop | ☐ |
| D8 | Powrót z aparatu: VV resize OK · brak Suspense remount flicker | iPhone | ☐ |

---

## 5. Rekomendacja COMMIT (gdy Owner GO)

```text
git add \
  src/styles/mobile.css \
  src/app/WorkerPhotoView.tsx \
  src/app/inspector/InspectorShell.tsx \
  src/app/InspectorPanel.tsx \
  src/app/AppInnerWithAuth.tsx \
  src/app/changelog-data.ts \
  CHANGELOG.md \
  scripts/test-worker-inspector-mobile-p0.mjs \
  docs/architecture/WORKER-INSPECTOR-MOBILE-01-AUDIT.md \
  docs/architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-DESIGN-FREEZE.md \
  docs/architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-ARCHITECTURE-REVIEW.md \
  docs/architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-OWNER-VERIFICATION.md

# NIE: git add -A
```

Sugerowany message:

```text
fix(mobile): WIM-P0 Worker/Inspector --app-height viewport contract

Align worker and inspector shells with admin visualViewport height
(--app-height) including Suspense fallback parity; no upload/capture changes.
```

---

## 6. Werdykt

| Pole | Wartość |
|------|---------|
| IMPLEMENT | **COMPLETE** (local) |
| BUILD / SMOKE | **PASS** |
| Device OV | **PENDING OWNER** |
| COMMIT / PUSH | **NIE** — czekaj Owner GO → COMMIT |
| Następne | Owner device checklist → **OWNER GO → COMMIT** |

---

*Bez commit · bez push.*

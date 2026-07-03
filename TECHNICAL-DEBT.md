# TECHNICAL-DEBT — W&G DOM

> Aktualny dług techniczny i pułapki. Podział High / Medium / Low. Rejestr do świadomych decyzji, nie lista „do natychmiastowej naprawy" (STABILIZATION WINDOW: naprawiać tylko na polecenie / przy regresji).

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `fd56cf7` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **STABILIZATION WINDOW ACTIVE** |

---

## 🔴 High

### H‑1 · Duplikacja parity kernela klient↔Edge
Logika merge listy płac istnieje w dwóch miejscach: `src/lib/cloud-sync.ts` (klient) i `supabase/functions/make-server-0afb8820/index.tsx` (Edge). Funkcje (`pickSettledByTimestamps`, `pickDaysByTimestamps`, `mergeWeekEmployeeRecord`, `pickSettledUpdatedAtForMerge`, `isLikelySpuriousUnsettle`) są **ręcznie mirrorowane**.
- **Ryzyko:** rozjazd = nowy P0 (regresja B6).
- **Mitigacja:** test `scripts/test-payroll-edge-parity-b6.mjs`. Każda zmiana settled/days merge musi rozważyć obie strony.
- **Kierunek:** wspólny, współdzielony moduł kernela — duży refactor, tylko z audytem.

### H‑2 · `src/app/App.tsx` — monolit
Bardzo duży plik pełniący rolę UI + orkiestracji stanu + sync. Trudny w nawigacji i ryzykowny w edycji.
- **Mitigacja:** nie analizować od zera; korzystać z `docs/AGENT-APP-MAP.md`, `PROJECT-GUIDE.md`, `ARCHITECTURE.md`. Ekstrakcje tylko celowane (np. TI‑B1 `removeWeekEmployee()` → lib).

### H‑3 · Rozmiar bundla / chunki > 500 kB
`npm run build` raportuje duże chunki: `index` ~3.5 MB, `pdfmake` ~2.6 MB, `pdfjs` ~0.98 MB, `manifest` ~0.55 MB, `app-core` ~0.72 MB.
- **Ryzyko:** czas ładowania, szczególnie mobile.
- **Mitigacja:** część już lazy‑loaded; dalsze code‑splitting / `manualChunks` — na polecenie (patrz `docs/OPTIMIZATION.md`).

---

## 🟡 Medium

### M‑1 · „Brudny" working tree
W drzewie roboczym pozostają niezcommitowane zmiany z innych prac (`index.html`, `src/app/DashboardView.tsx`, `TendersView.tsx`, `tenders/context/TendersProvider.tsx`, `src/lib/*` mobile/tender, `src/styles/mobile.css`).
- **Ryzyko:** przypadkowe wciągnięcie do cudzego bundla (łamie One Bundle = One Goal).
- **Mitigacja:** zawsze jawny `git add <ścieżki>`; nigdy `git add -A` bez przeglądu.

### M‑2 · Untracked skrypty forensyczne
Dziesiątki `scripts/audit-p0-*.mjs`, `scripts/audit-*.mjs` (forensyka PDF/ZI/EM) jako untracked — szum w `git status`.
- **Mitigacja:** decyzja świadoma — commit do `scripts/` albo `.gitignore`/przeniesienie poza repo (zasada: audyty nie w repo). Na polecenie.

### M‑3 · Import cycle warning (Vite)
`src/lib/cloud-sync.ts` jest zarazem statycznie i dynamicznie importowany (podobnie `tenders-bzp-brief.ts`, `generate-em-docx.ts`) — ostrzeżenie „dynamic import will not move module into another chunk".
- **Ryzyko:** brak efektu code‑splitting dla tych modułów; potencjalne cykle.
- **Mitigacja:** ujednolicić styl importu przy okazji refactoru.

### M‑4 · Node/browser externalizacja w buildzie
Build externalizuje moduły node (`node:fs`, `playwright-core`, `7z-wasm`) dla kompatybilności przeglądarki + ostrzeżenie o `eval` w `playwright-core`.
- **Ryzyko:** narzędzia testowe/ciężkie zależności w grafie bundla.
- **Mitigacja:** przegląd granicy runtime vs devtools; upewnić się, że nie trafiają do prod chunków.

### M‑5 · Biweekly carry‑forward nieobsługiwany
Payroll V1 obsługuje tylko tygodniówkę; wypłata co 2 tygodnie → `biweekly_blocked`.
- **Mitigacja:** świadome ograniczenie V1; V2 w backlogu.

---

## 🟢 Low

### L‑1 · Test hygiene P3
W audytach pojawia się pojedynczy FAIL klasyfikowany jako „P3 test hygiene" (nie regresja produktu).
- **Mitigacja:** porządkowanie testów przy okazji dotykania obszaru.

### L‑2 · Nadmiar dokumentów handoff
Bardzo duża liczba plików `docs/SESSION-HANDOFF-*` / `RELEASE-REPORT-*` (150+). Trudna nawigacja dla nowego AI.
- **Mitigacja:** ten komplet (`AI-START-HERE` → `AI-HANDOFF` → `PROJECT-STATUS`) jako warstwa wejściowa; szczegóły zostają w `docs/`.

### L‑3 · Wersja `package.json` vs wersja UI
`package.json.version` (`2.31.3`) ≠ wersja UI (`2.63.27` z `changelog-data.ts`). Źródłem prawdy wersji jest `changelog-data.ts`.
- **Mitigacja:** nie polegać na `package.json` przy raportowaniu wersji.

---

## Zasady wobec długu (STABILIZATION WINDOW)

- Nie „przy okazji" — spłata długu = osobny bundle z celem i audytem.
- Priorytet okna: brak regresji, integralność danych (Payroll/sync), field validation.
- Duże refactory (H‑1, H‑2, H‑3) tylko po jawnym poleceniu właściciela.

Powiązane: [`docs/OPTIMIZATION.md`](docs/OPTIMIZATION.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`AI-HANDOFF.md`](AI-HANDOFF.md) · [`CURSOR-HANDOFF.md`](CURSOR-HANDOFF.md).

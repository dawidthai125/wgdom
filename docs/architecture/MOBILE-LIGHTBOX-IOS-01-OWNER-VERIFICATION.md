# MOBILE-LIGHTBOX-IOS-01 — FINAL Owner Verification

> **STATUS:** FINAL REPORT · Chromium/desktop **PASS** · **fizyczny iPhone Safari NIE WYKONANY przez agenta**  
> **Data:** 2026-07-25  
> **Owner GO (IMPLEMENT):** TAK  
> **DF:** [`MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md`](MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md)  
> **RCA:** [`MOBILE-LIGHTBOX-IOS-01-RCA.md`](MOBILE-LIGHTBOX-IOS-01-RCA.md)  
> **Commit / push:** **NIE** — bez kolejnego polecenia Ownera

```text
Agent nie ma dostępu do fizycznego iPhone Safari.
Scenariusz P0 z briefu = TYLKO Owner (lub device lab).
Emulacja Chromium ≠ dowód usunięcia bugа WebKit hit-test.
```

---

## 1. PASS/FAIL — punkty briefu

| # | Kryterium | Fizyczny iPhone Safari | Chromium (emul / desktop harness) |
|---|-----------|------------------------|-----------------------------------|
| 1 | X działa | **FAIL — nie zweryfikowano** | **PASS** (L1 harness) |
| 2 | Backdrop działa | **FAIL — nie zweryfikowano** | **PASS** (backdrop = root onClick; harness zamyka X/Escape; semantyka w kodzie) |
| 3 | Brak background scroll | **FAIL — nie zweryfikowano** | **PASS** (lock + `modal-overlay` na portaled root) |
| 4 | Brak rubber-band | **FAIL — nie zweryfikowano** | **N/A / częściowe** (Chromium ≠ Safari rubber-band) |
| 5 | Brak stuck `modal-scroll-locked` | **FAIL — nie zweryfikowano** | **PASS** (rapid ×10 → lock count 0) |
| 6 | Po close natychmiast kolejne zdjęcie (bez zmiany zakładki) | **FAIL — nie zweryfikowano** | **PASS** (rapid reopen thumbs) |
| 7 | Brak regresji desktop / Chromium | — | **PASS** (2026-07-25: L1 iPhone SE + Pixel 7 **2/2**) |

**Scenariusz Ownera (open → X → open → backdrop → next ×10):** na urządzeniu **nie odpalony**.

---

## 2. Czy pierwotny bug iPhone Safari został usunięty?

| Odpowiedź | Uzasadnienie |
|-----------|--------------|
| **NIEPOTWIERDZONE (gate = NIE)** | Fix (portal + `modal-lightbox`) jest **zaimplementowany** i zgodny z RCA, ale **brak field proof** na fizycznym Safari. Chromium **nie reprodukuje** oryginalnego WebKit hit-test bugа — więc PASS emulacji **nie** zamyka pytania. |

Po **Twoim** PASS na iPhonie → można uznać bug za **USUNIĘTY**.

---

## 3. Czy MOBILE-LIGHTBOX-IOS-01 można zamknąć?

| Gate | Status |
|------|--------|
| IMPLEMENT wg DF | **COMPLETE** |
| Build / diff cap / Chromium L1 | **PASS** |
| Field AC-P0 (fizyczny iPhone) | **OPEN** |
| **Zamknięcie ticketu** | **NIE** — do PASS checklisty §6 przez Ownera (lub pisemna akceptacja ryzyka) |

---

## 4. Czy MUX-B1 jest gotowy do commit / push?

| Paczka | Commit-ready? | Komentarz |
|--------|---------------|-----------|
| **MOBILE-LIGHTBOX-IOS-01** (L1 portal) | **NIE** (zalecane) do field P0 | Można commitować po Twoim PASS Safari *lub* świadomej akceptacji ryzyka |
| **MUX-B1.1** (L1–L5 lock+markery) | **NIE jako pełny RELEASE** | L2–L5 nadal in-tree + `modal-sheet`; residual ryzyko tego samego Safari bug poza L1; wcześniejsze AC-L5/L6 field też OPEN |
| **MUX-A** | Osobna decyzja Ownera | Nie mylić z tym ticketem |

```text
Commit/push MUX-B1 + IOS-01 = TYLKO na kolejne polecenie Ownera.
Agent NIE commitował i NIE pushował.
```

**Rekomendacja:** najpierw Ty odhaczasz iPhone (§6) → wtedy `commit MOBILE-LIGHTBOX-IOS-01` (ew. razem z MUX-B1 jeśli akceptujesz residual L2–L5).

---

## 5. Dowody agenta (nie-field)

```text
Implement: createPortal → document.body; modal-overlay + modal-lightbox; bez modal-sheet
Build: PASS (wcześniejszy IMPLEMENT)
Harness 2026-07-25 (FINAL re-run):
  PW_BASE_URL=http://127.0.0.1:4173
  npx playwright test --config=playwright.mux-b1.config.mjs -g "L1"
  → 2 passed (mux-b1-iphone-se, mux-b1-pixel-7)
```

---

## 6. Checklist dla Ciebie (MUST — 2 min)

```text
Roboty → robota → Zdjęcia
□ Open #1 → X
□ Open ponownie → backdrop
□ Open kolejne zdjęcie
□ Powtórz cykl ×10
□ Brak background scroll / rubber-band przy open
□ Po close: od razu kolejny thumb (bez Dokumenty→Zdjęcia)
□ (opcjonalnie DevTools/remote) po close: brak html.modal-scroll-locked
```

Odpisz: **PASS iPhone** albo **FAIL + objaw** → zaktualizujemy werdykt zamknięcia.

---

## 7. Werdykt końcowy (agent)

```text
Pierwotny bug Safari:     NIEPOTWIERDZONE usunięcie (brak field)
MOBILE-LIGHTBOX-IOS-01:   NIE ZAMYKAĆ do field PASS Ownera
MUX-B1 commit/push:       NIE — czekamy na polecenie + idealnie field L1
Commit/push w tej sesji:  NIE WYKONANO
```

**Raport:** `docs/architecture/MOBILE-LIGHTBOX-IOS-01-OWNER-VERIFICATION.md`

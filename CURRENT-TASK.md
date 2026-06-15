# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-15 · **SESSION CLOSEOUT — ZI Investigation CLOSED (NO-GO)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.19** · commit **`1a8c892`** |
| **Stream WM Druk P0 pollution** | **CLOSED** (2.59.17–18) |
| **ZI PDF §3 adres obiektu** | **NO-GO — NIE ROZWIĄZANE** |
| **Śledztwo ZI (RCA P0.1F→P0.4B)** | **CLOSED** — brak prod fix |
| **Commit / push / deploy** | **Brak w tej sesji closeout** |

## ★★ START HERE — ZI (nowy chat / agent)

**SSOT śledztwa:** [`audit/ZI-FINAL-HANDOFF.md`](audit/ZI-FINAL-HANDOFF.md)

**Nie wracać bez nowego twardego dowodu do:**

- Ciphertext path · Adobe encrypted `/V` · AP reverse engineering · XFA datasets
- Overlay path · Contents append · Contents replace · AP clone
- Flatten PoC (P0.4A = **FAIL** manual)

**Szukaj:** nowe podejście biznesowe lub techniczne (np. nowy szablon Tauron, Adobe PDF Services, workflow poza hybrid LiveCycle).

## Potwierdzony business mapping (§3)

| Zmienna | Pole | Widget |
|---------|------|--------|
| JOB_STREET | TextField2[10] | 429 |
| JOB_BUILDING | TextField2[9] | 428 |
| JOB_APARTMENT | TextField2[8] | 427 |

Sekcja: **§3 OKREŚLENIE OBIEKTU ZGŁASZANEGO DO PRZYŁĄCZENIA** @ y≈142 — mapping **poprawny**.

## SSOT pliki (audit)

| Plik | Rola |
|------|------|
| `audit/ZI-FINAL-HANDOFF.md` | Final handoff RCA + plan cleanup |
| `audit/zi-live-template.pdf` | SSOT szablon (SHA256 `1d756452…`) |
| `audit/zi-p0-3u-attached-source.pdf` | Kopia attached = live SSOT |
| `audit/zi-p0-3ag-adobe-saved.pdf` | Adobe user save (referencja) |

## Audit katalog

- **207 plików · ~49 MB**
- Plan reorganizacji w `ZI-FINAL-HANDOFF.md` §9 — **NIE wykonano** (brak git mv / delete / archiwizacji)
- Inventory: `scripts/_p04b-inventory.json` · `scripts/_readonly-p04b-inventory.mjs`

## WGDOM poza ZI

Reszta projektu **działa**. Problem **ograniczony do ZI PDF**.

**Handoff modułu WM Druk:** [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) — wymaga aktualizacji werdyktu ZI w osobnej sesji (po decyzji biznesowej).

## WZNOWIENIE (nowy chat)

```text
1. Przeczytaj audit/ZI-FINAL-HANDOFF.md
2. Nie uruchamiaj eksperymentów ciphertext/AP/XFA/overlay/flatten
3. RCA = zakończone — szukaj nowego kierunku (P1: nowy szablon / P2: Adobe Services)
4. Audit cleanup — dopiero po akceptacji planu §9 (osobna sesja)
```

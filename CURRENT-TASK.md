# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-24 · **prod 2.62.51** · `78f11cd`

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.51** (`78f11cd`) |
| **Poprzedni prod** | **2.62.50** (`c149116`) · V1A+V1B renderer v4 |
| **WM-SCHEMATY MVP** | **CLOSED** · UI 2.62.49 · visual fidelity V2 **CLOSED** 2.62.51 |
| **Renderer schematów** | **`SCHEMATIC_RENDER_VERSION = 5`** |
| **TP203 M1** | **RELEASED** — `parseJobAddressParts` |
| **P4 WM upload toast** | **RELEASED** — `resolveWmPrintTemplateUploadToast` |
| **ZI §4/§5** | **STABLE** — obiekt 95–97 · zgłaszający 99/111/112 ze szablonu |
| **Audit Hub** | MVP-0 + MVP-1 + MVP-1B **CLOSED** · MVP-1C OPEN |
| **TP200B** | **PLANNED** |

---

## Epic zamknięty: WM-SCHEMATY (MVP + Visual Fidelity)

| Pole | Wartość |
|------|---------|
| **Status epica** | **CLOSED** |
| **MVP UI** | **2.62.49** — zakładka Schematy · KV sync · PDF draft/final |
| **Visual V1A/V1B** | **2.62.50** — backbone · RCD tee · renderer **v4** |
| **Visual V2** | **2.62.51** — bus layout v2 · pełny span · renderer **v5** |
| **Handoff epic** | [`docs/SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](docs/SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) |
| **Handoff V2 release** | [`docs/SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md`](docs/SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md) |
| **Spec SSOT** | [`docs/WM-SCHEMATY-V1-DESIGN-FREEZE.md`](docs/WM-SCHEMATY-V1-DESIGN-FREEZE.md) |
| **Audyt release** | `audit/WM-SCHEMATY-V2C-PDF-SIDE-BY-SIDE-AUDIT.md` — RECOMMEND RELEASE |

### Visual Fidelity (vs Benedyktyńska 22/13)

| Etap | ~% tuszu | Werdykt |
|------|----------|---------|
| V1 MVP | ~55–58% | Za wąski |
| V1A | ~87% | PASS funkcjonalny |
| V1B | ~92% | PASS |
| V2 | **93.4%** vs ref. **92.5%** | **B+** · CLOSED |

### Smoke regresji schematów

```bash
npx vite-node scripts/test-schematic-v1b-visual-smoke.mjs
npx vite-node scripts/test-schematic-render-apartment-3f.mjs
npx vite-node scripts/test-schematic-pdf-smoke.mjs
npx vite-node scripts/test-wm-schematics-ui-3b.mjs
```

---

## Co zrobiono (2026-06-24 — WM Schematy release)

| Wersja | Commit | Temat |
|--------|--------|-------|
| **2.62.49** | (wcześniej) | MVP UI — zakładka Schematy · domena · sync KV |
| **2.62.50** | `c149116` | V1A+V1B — renderer v4 · backbone · RCD tee · kuchenka 3P |
| **2.62.51** | `78f11cd` | V2 — bus layout v2 · symbole · viewBox · renderer v5 |

**Handoff:** [`docs/SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md`](docs/SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md)

---

## Następne (tylko na polecenie)

- **WM-SCHEMATY V1.1** — ZIP `Schematy/` · WM Historia · PDF wektorowy · UI detach · `feedFrom`/`position`
- **WM-SCHEMATY P1** — `commercial-3f-v1` w UI · link z Pomiarów
- TP200B · Audit Hub MVP-1C · Notatki P3 Export

## Szybki start agenta

```text
docs/SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md           ← ★★ WM Schematy epic (CLOSED)
docs/SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md       ← ★★ visual fidelity V2 release
docs/WM-SCHEMATY-V1-DESIGN-FREEZE.md                    ← spec zamrożona
docs/SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md       ← WM Druk / ZI
docs/AGENT-ONBOARDING.md                                ← mapa systemu
docs/PROJECT-HANDOFF-CURRENT.md                         ← baseline prod 2.62.51
```

**Hasło użytkownika:** „kontynuuj WGDOM”

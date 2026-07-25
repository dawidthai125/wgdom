# MOBILE-LIGHTBOX-IOS-01 — RELEASE REPORT

> **STATUS:** **CLOSED · RELEASE COMPLETE**  
> **Data:** 2026-07-25  
> **Owner field:** **PASS iPhone**  
> **DF:** [`MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md`](MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md)  
> **RCA:** [`MOBILE-LIGHTBOX-IOS-01-RCA.md`](MOBILE-LIGHTBOX-IOS-01-RCA.md)  
> **OV:** [`MOBILE-LIGHTBOX-IOS-01-OWNER-VERIFICATION.md`](MOBILE-LIGHTBOX-IOS-01-OWNER-VERIFICATION.md)

---

## 1. Commits (osobne, bez squash)

| # | Ticket | Hash | Message |
|---|--------|------|---------|
| 1 | **TEST-HARNESS-LIGHTBOX-01** | `97f0424` (`97f0424c531d7e7ffcb274ed1a230686bb54774d`) | test(e2e): fix lightbox close X locator comma trap |
| 2 | **MOBILE-LIGHTBOX-IOS-01** | `57b059d` (`57b059d9683be2200dd063849b39046d803fdb27`) | fix(mobile): portal L1 lightbox to body for iOS Safari hit-testing |

Push: `origin/main` ✓ (`37f0d0e..57b059d`).

---

## 2. CI / Deploy

| | Result |
|--|--------|
| **TEST-INFRA Gates (TI-B3)** | **success** |
| **Vercel** | **success** |
| Legacy E2E / Mobile smoke | failure (poza gate; jak wcześniej) |

```json
https://www.wgdom.fun/version.json
→ { "version": "2.65.44", "commit": "57b059d", "timestamp": "2026-07-25T11:16:40.486Z" }
```

**Deploy LIVE** — tip = `57b059d`.

---

## 3. Field (Owner)

| | |
|--|--|
| iPhone Safari | **PASS iPhone** |
| Pierwotny bug (stuck lightbox / brak X / brak next) | **USUNIĘTY** |

---

## 4. Tickets

| Ticket | Status |
|--------|--------|
| TEST-HARNESS-LIGHTBOX-01 | **CLOSED** |
| MOBILE-LIGHTBOX-IOS-01 | **CLOSED · RELEASE COMPLETE** |

---

**Koniec toru MOBILE-LIGHTBOX-IOS-01.** Oczekuję wyłącznie na kolejne polecenie Ownera (kolejny ticket / commit docs / etc.).

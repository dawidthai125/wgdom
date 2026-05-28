# W&G DOM — aplikacja natywna (Capacitor)

Apka mobilna to **cienka skorupa** (Android / iOS), która ładuje UI z **https://wgdom.fun**.  
Aktualizacje funkcji = push na Vercel — **bez** czekania na review w sklepie (zmienia się tylko strona).

---

## Bez Android Studio i bez Maca — co masz teraz

### 1. PWA (najprościej, już działa)

Na telefonie: **wgdom.fun** → menu przeglądarki → **Dodaj do ekranu głównego**.

To ta sama aplikacja co na komputerze, pełny ekran, sync z chmurą. **Nie potrzebujesz nic instalować na PC.**

### 2. APK Android z GitHub Actions (bez Android Studio)

Po pushu na `main` (lub ręcznie w Actions) buduje się APK w chmurze:

1. Wejdź na GitHub → repo **wgdom** → zakładka **Actions**
2. Workflow **Build Android APK** → ostatni run → na dole **Artifacts** → pobierz `wgdom-android-debug-apk`
3. Wyślij plik `.apk` na telefon (mail, Drive, WhatsApp)
4. Android: **Zezwól na instalację z nieznanych źródeł** dla tej aplikacji → zainstaluj

To wersja **debug** (do testów w firmie). Google Play wymaga podpisanego AAB — można to zrobić później przez CI lub zlecenie komuś z Android Studio.

### 3. iPhone bez Maca

- **App Store / TestFlight** — technicznie wymaga Maca (lub płatnego CI z certyfikatami Apple, np. Codemagic, MacinCloud).
- **Na iPhone teraz:** używaj **PWA** (Dodaj do ekranu głównego) — działa jak apka, bez sklepu.

### 4. Publikacja w sklepach (gdy będzie potrzeba)

| Sklep | Co trzeba | Kto może pomóc |
|-------|-----------|----------------|
| Google Play | Konto ~25 USD + podpisany AAB | Ty (CI) lub developer z Android Studio |
| App Store | Konto ~99 USD/rok + Mac/Xcode | Mac w chmurze, agencja, znajomy z Maciem |

---

## Wymagania (tylko jeśli budujesz lokalnie)

| Platforma | Narzędzia |
|-----------|-----------|
| **Android** | [Android Studio](https://developer.android.com/studio), JDK 17+ |
| **iOS** | Mac + Xcode 15+ (build iOS tylko na macOS) |
| **Wspólne** | Node.js 20+, npm |

## Pierwszy raz (lokalnie — opcjonalnie)

```bash
npm install
npm run build
npx cap add android    # jeśli jeszcze nie ma folderu android/
npx cap add ios        # opcjonalnie, na Macu
npm run cap:assets     # ikony + splash z resources/icon.png
npx cap sync
```

## Codzienna praca

Po zmianach w **natywnej skorupie** (capacitor.config, pluginy):

```bash
npm run cap:sync
npm run cap:open:android   # Android Studio → Run
npm run cap:open:ios       # Xcode → Run (Mac)
```

Zmiany w React/Vite **nie wymagają** nowej apki — wystarczy deploy na Vercel.

## Dev — lokalny serwer w apce

```bash
# terminal 1
npm run dev

# terminal 2 (Android emulator: 10.0.2.2 = host)
set CAPACITOR_SERVER_URL=http://10.0.2.2:5173
npx cap sync android
npm run cap:run:android
```

Na fizycznym telefonie użyj IP komputera w sieci Wi‑Fi, np. `http://192.168.1.10:5173`.

## Publikacja w sklepach

1. **Google Play** — konto deweloperskie (~25 USD jednorazowo)  
   - Android Studio → Build → Generate Signed Bundle (AAB)  
2. **App Store** — Apple Developer (~99 USD/rok)  
   - Xcode → Archive → Distribute → App Store Connect  

Przed publikacją:
- Podmień `resources/icon.png` na **1024×1024** (logo W&G DOM)  
- Uruchom `npm run cap:assets`  
- W `capacitor.config.ts` upewnij się, że `server.url` = `https://wgdom.fun`

## Id aplikacji

- **appId:** `fun.wgdom.app`  
- **Nazwa:** W&G DOM  

## Co robi skorupa

- Status bar (ciemny, kolor `#344254`)  
- Splash screen  
- Wyłącza service worker PWA (konflikt z WebView)  
- WebView → pełna aplikacja z chmury Supabase jak w przeglądarce  

## Kolejne kroki (opcjonalnie)

- Push notifications (Firebase + APNs)  
- `@capacitor/camera` — wygodniejsze zdjęcia z budowy  
- Deep link `wgdom://` do konkretnej roboty  

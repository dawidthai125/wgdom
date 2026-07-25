/** Login chrome copy only — does not change auth handlers or field semantics. */

export type LoginLocale = "pl" | "en";

export const LOGIN_LOCALE_KEY = "wg-login-locale" as const;

export function readLoginLocale(): LoginLocale {
  try {
    const v = localStorage.getItem(LOGIN_LOCALE_KEY);
    return v === "en" ? "en" : "pl";
  } catch {
    return "pl";
  }
}

export function writeLoginLocale(locale: LoginLocale): void {
  try {
    localStorage.setItem(LOGIN_LOCALE_KEY, locale);
  } catch {
    /* ignore quota */
  }
}

const dict = {
  pl: {
    tagline: "Zarządzanie robotami i zespołem",
    heroTitle: "Witaj w WGDOM",
    heroDesc: "Spokojne wejście do pracy — wybierz rolę i kontynuuj.",
    adminTitle: "Panel administracyjny",
    adminDesc: "Użytkownik i hasło",
    inspectorTitle: "Inspektor",
    inspectorDesc: "Roboty i dokumenty WM",
    workerTitle: "Pracownik",
    workerDesc: "Zdjęcia i raport",
    adminLogin: "Logowanie administratora",
    inspectorLogin: "Logowanie inspektora",
    workerLogin: "Logowanie pracownika",
    setupPin: "Ustaw kod pracownika",
    user: "Użytkownik",
    password: "Hasło",
    passwordPh: "Wpisz hasło",
    remember: "Zapamiętaj hasło na tym urządzeniu",
    rememberHint: "Tylko lokalnie w przeglądarce — nie trafia do chmury",
    signIn: "Zaloguj",
    enterPanel: "Wejdź do panelu",
    pickSelf: "Wybierz siebie z listy",
    searchName: "Szukaj imienia…",
    phoneLabel: "Telefon — 9 cyfr (bez +48)",
    phonePh: "np. 501234567",
    pinLabel: "Twój kod pracownika (4 cyfry)",
    pinHint: "Osobisty kod — nie taki sam jak u kolegów. Zapomniałeś? Poproś administratora o reset w kartotece.",
    firstLoginHint: "Pierwsze logowanie — po potwierdzeniu telefonu ustawisz osobisty kod 4 cyfry.",
    phoneContinue: "Wpisz 9 cyfr telefonu, żeby kontynuować.",
    pinContinue: "Wpisz swój 4-cyfrowy kod pracownika.",
    nextSetup: "Dalej — ustaw kod",
    newPin: "Nowy kod (4 cyfry)",
    repeatPin: "Powtórz kod",
    savePin: "Zapisz kod i wejdź",
    back: "Wróć",
    setupIntro:
      "To pierwsze logowanie — ustaw osobisty kod 4 cyfry. Zapamiętaj go — chroni Twoją wypłatę. Nie podawaj kodu kolegom.",
    noWorkers: "Brak aktywnych pracowników w kartotece.",
    noPhone: "Brak numeru — poproś admina",
    theme: "Motyw",
    themeLight: "Jasny",
    themeDark: "Ciemny",
    themeSystem: "System",
    language: "Język",
    about: "O produkcie",
    aboutBody:
      "WGDOM to system zarządzania robotami budowlanymi — Lista Płac, Przetargi, Roboty i Dokumenty w jednym spokojnym miejscu.",
    privacy: "Prywatność",
    privacyBody:
      "Hasła i PIN-y pozostają na urządzeniu lub w chronionej chmurze projektu. Nie udostępniamy danych osobom trzecim.",
    production: "Production",
    online: "Online",
    offline: "Offline",
    build: "Build",
    commit: "Commit",
    status: "Status",
    version: "Wersja",
    close: "Zamknij",
  },
  en: {
    tagline: "Jobs and team management",
    heroTitle: "Welcome to WGDOM",
    heroDesc: "A calm way into work — pick a role and continue.",
    adminTitle: "Admin panel",
    adminDesc: "User and password",
    inspectorTitle: "Inspector",
    inspectorDesc: "Jobs and WM documents",
    workerTitle: "Worker",
    workerDesc: "Photos and report",
    adminLogin: "Administrator sign-in",
    inspectorLogin: "Inspector sign-in",
    workerLogin: "Worker sign-in",
    setupPin: "Set worker code",
    user: "User",
    password: "Password",
    passwordPh: "Enter password",
    remember: "Remember password on this device",
    rememberHint: "Stored locally in the browser only — never sent to the cloud",
    signIn: "Sign in",
    enterPanel: "Enter panel",
    pickSelf: "Select yourself from the list",
    searchName: "Search by name…",
    phoneLabel: "Phone — 9 digits (no +48)",
    phonePh: "e.g. 501234567",
    pinLabel: "Your worker code (4 digits)",
    pinHint: "Personal code — not shared with coworkers. Forgot it? Ask an admin to reset it.",
    firstLoginHint: "First sign-in — after confirming your phone you will set a 4-digit code.",
    phoneContinue: "Enter 9 phone digits to continue.",
    pinContinue: "Enter your 4-digit worker code.",
    nextSetup: "Continue — set code",
    newPin: "New code (4 digits)",
    repeatPin: "Repeat code",
    savePin: "Save code and enter",
    back: "Back",
    setupIntro:
      "First sign-in — set a personal 4-digit code. Keep it private; it protects your pay view.",
    noWorkers: "No active workers in the directory.",
    noPhone: "Missing phone — ask admin",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    about: "About",
    aboutBody:
      "WGDOM is a construction operations system — payroll, tenders, jobs and documents in one calm workspace.",
    privacy: "Privacy",
    privacyBody:
      "Passwords and PINs stay on-device or in the project cloud. We do not sell personal data to third parties.",
    production: "Production",
    online: "Online",
    offline: "Offline",
    build: "Build",
    commit: "Commit",
    status: "Status",
    version: "Version",
    close: "Close",
  },
} as const;

export type LoginCopy = (typeof dict)["pl"];

export function loginCopy(locale: LoginLocale): LoginCopy {
  return dict[locale];
}

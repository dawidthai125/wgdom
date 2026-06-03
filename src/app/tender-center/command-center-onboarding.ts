export const COMMAND_CENTER_ONBOARDING_KEY = "kw-command-center-onboarding-v1";

export function hasSeenCommandCenterOnboarding(): boolean {
  try {
    return localStorage.getItem(COMMAND_CENTER_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCommandCenterOnboardingSeen(): void {
  try {
    localStorage.setItem(COMMAND_CENTER_ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

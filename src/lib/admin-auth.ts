/** Konta panelu administracyjnego — hasła tylko jako hash SHA-256 (nigdy plain text). */

import { ADMIN_PASSWORDS_KEY, persistKey } from "@/lib/cloud-sync";

export type AdminRole = "super_admin" | "admin" | "moderator";

export interface AdminSession {
  id: string;
  login: string;
  displayName: string;
  role: AdminRole;
}

interface AdminAccount extends AdminSession {
  passwordHash: string;
}

/** Nadpisania haseł (userId → hash) — sync w chmurze pod ADMIN_PASSWORDS_KEY. */
export type AdminPasswordOverrides = Record<string, string>;

const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: "dawid",
    login: "Dawid",
    displayName: "Dawid",
    role: "super_admin",
    passwordHash: "20fa3a3dd3eefceb3edff7d9281256df237d0107614ee2b77ca07b097313a6a4",
  },
  {
    id: "stanislaw",
    login: "Stanislaw",
    displayName: "Stanisław",
    role: "admin",
    passwordHash: "e001a4eceb076e1d53db3d20fd70da1bfc9501604c3862a5cd4afca5839f302f",
  },
  {
    id: "pawel",
    login: "Pawel",
    displayName: "Paweł",
    role: "moderator",
    passwordHash: "0f40aa957962081a7abddcf6ee7080d5b285432aeae7189236c47e9d64ddbb3a",
  },
];

export const ADMIN_SESSION_KEY = "wg-admin-session";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashAdminPassword(login: string, password: string): Promise<string> {
  return sha256(`wgdom-admin-account-v1:${login}:${password}`);
}

export function listAdminUsersForLogin(): AdminSession[] {
  return ADMIN_ACCOUNTS.map(({ passwordHash: _h, ...pub }) => pub);
}

export function loadAdminPasswordOverrides(): AdminPasswordOverrides {
  try {
    const raw = localStorage.getItem(ADMIN_PASSWORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: AdminPasswordOverrides = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.length === 64) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function mergeAdminPasswordOverrides(
  local: AdminPasswordOverrides,
  cloud: unknown,
): AdminPasswordOverrides {
  const cloudObj = cloud && typeof cloud === "object" && !Array.isArray(cloud)
    ? (cloud as AdminPasswordOverrides)
    : {};
  return { ...local, ...cloudObj };
}

function saveAdminPasswordOverridesLocal(overrides: AdminPasswordOverrides): void {
  localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(overrides));
}

export async function persistAdminPasswordOverrides(overrides: AdminPasswordOverrides): Promise<void> {
  saveAdminPasswordOverridesLocal(overrides);
  await persistKey(ADMIN_PASSWORDS_KEY, overrides);
}

function effectivePasswordHash(account: AdminAccount): string {
  const overrides = loadAdminPasswordOverrides();
  return overrides[account.id] ?? account.passwordHash;
}

export async function verifyAdminLogin(login: string, password: string): Promise<AdminSession | null> {
  const account = ADMIN_ACCOUNTS.find((a) => a.login === login);
  if (!account) return null;
  const hash = await hashAdminPassword(login, password);
  if (hash !== effectivePasswordHash(account)) return null;
  const { passwordHash: _h, ...session } = account;
  return session;
}

export function adminPasswordIsCustomized(userId: string): boolean {
  return userId in loadAdminPasswordOverrides();
}

export async function setAdminUserPassword(userId: string, newPassword: string): Promise<void> {
  const account = ADMIN_ACCOUNTS.find((a) => a.id === userId);
  if (!account) throw new Error("Nieznany użytkownik");
  if (newPassword.length < 6) throw new Error("Hasło musi mieć co najmniej 6 znaków");
  const hash = await hashAdminPassword(account.login, newPassword);
  const overrides = { ...loadAdminPasswordOverrides(), [userId]: hash };
  await persistAdminPasswordOverrides(overrides);
  clearRememberedAdminPasswordIfUser(userId);
}

export async function resetAdminUserPassword(userId: string): Promise<void> {
  const account = ADMIN_ACCOUNTS.find((a) => a.id === userId);
  if (!account) throw new Error("Nieznany użytkownik");
  const overrides = { ...loadAdminPasswordOverrides() };
  delete overrides[userId];
  await persistAdminPasswordOverrides(overrides);
  clearRememberedAdminPasswordIfUser(userId);
}

export function adminCanViewRates(role: AdminRole): boolean {
  return role !== "moderator";
}

export function adminIsSuperAdmin(role: AdminRole): boolean {
  return role === "super_admin";
}

export function adminRoleLabel(role: AdminRole): string {
  switch (role) {
    case "super_admin":
      return "Super Administrator";
    case "admin":
      return "Administrator";
    case "moderator":
      return "Moderator";
  }
}

export function loadAdminSessionFromStorage(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.id || !parsed.role) return null;
    const valid = ADMIN_ACCOUNTS.some((a) => a.id === parsed.id && a.role === parsed.role);
    return valid ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAdminSessionToStorage(session: AdminSession | null): void {
  if (session) sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

const ADMIN_REMEMBER_FLAG_KEY = "kw-admin-remember-on";
const ADMIN_REMEMBER_DATA_KEY = "kw-admin-remember-pw";
const ADMIN_REMEMBER_USER_KEY = "kw-admin-remember-user";
const ADMIN_REMEMBER_SALT_KEY = "kw-admin-remember-salt";

export function adminRememberEnabled(): boolean {
  return localStorage.getItem(ADMIN_REMEMBER_FLAG_KEY) === "1";
}

async function deriveRememberKey(salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("wgdom-admin-local-v1"),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function getOrCreateRememberSalt(): Uint8Array {
  let saltStr = localStorage.getItem(ADMIN_REMEMBER_SALT_KEY);
  if (!saltStr) {
    saltStr = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    localStorage.setItem(ADMIN_REMEMBER_SALT_KEY, saltStr);
  }
  return new TextEncoder().encode(saltStr);
}

export async function saveRememberedAdminPassword(userId: string, password: string): Promise<void> {
  const salt = getOrCreateRememberSalt();
  const key = await deriveRememberKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );
  localStorage.setItem(
    ADMIN_REMEMBER_DATA_KEY,
    JSON.stringify({ iv: [...iv], data: [...new Uint8Array(encrypted)] }),
  );
  localStorage.setItem(ADMIN_REMEMBER_USER_KEY, userId);
  localStorage.setItem(ADMIN_REMEMBER_FLAG_KEY, "1");
}

export async function loadRememberedAdminPassword(userId: string): Promise<string | null> {
  if (!adminRememberEnabled()) return null;
  if (localStorage.getItem(ADMIN_REMEMBER_USER_KEY) !== userId) return null;
  const raw = localStorage.getItem(ADMIN_REMEMBER_DATA_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as { iv: number[]; data: number[] };
    const saltStr = localStorage.getItem(ADMIN_REMEMBER_SALT_KEY);
    if (!saltStr) return null;
    const key = await deriveRememberKey(new TextEncoder().encode(saltStr));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
      key,
      new Uint8Array(payload.data),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    clearRememberedAdminPassword();
    return null;
  }
}

export function clearRememberedAdminPasswordIfUser(userId: string): void {
  if (localStorage.getItem(ADMIN_REMEMBER_USER_KEY) === userId) {
    clearRememberedAdminPassword();
  }
}

export function clearRememberedAdminPassword(): void {
  localStorage.removeItem(ADMIN_REMEMBER_DATA_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_USER_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_FLAG_KEY);
}

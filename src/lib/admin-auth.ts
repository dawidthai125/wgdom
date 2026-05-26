/** Konta panelu administracyjnego — hasła tylko jako hash SHA-256 (nigdy plain text). */



import { ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY, persistKey } from "@/lib/cloud-sync";



export type AdminRole = "super_admin" | "admin" | "moderator";

export type AdminAssignableRole = "admin" | "moderator";



export interface AdminSession {

  id: string;

  login: string;

  displayName: string;

  role: AdminRole;

}



interface AdminAccount extends AdminSession {

  passwordHash: string;

  isBuiltin: boolean;

  isCustom: boolean;

}



export interface AdminCustomUser {

  id: string;

  login: string;

  displayName: string;

  role: AdminAssignableRole;

  passwordHash: string;

}



export interface AdminUsersConfig {

  roleOverrides: Record<string, AdminAssignableRole>;

  customUsers: AdminCustomUser[];

}



export interface AdminUserManagementRow extends AdminSession {

  isBuiltin: boolean;

  isCustom: boolean;

  canChangeRole: boolean;

  canDelete: boolean;

  passwordCustomized: boolean;

}



/** Nadpisania haseł (userId → hash) — sync w chmurze pod ADMIN_PASSWORDS_KEY. */

export type AdminPasswordOverrides = Record<string, string>;



const BUILTIN_ADMIN_ACCOUNTS: Omit<AdminAccount, "isBuiltin" | "isCustom">[] = [

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



const EMPTY_USERS_CONFIG: AdminUsersConfig = { roleOverrides: {}, customUsers: [] };



async function sha256(text: string): Promise<string> {

  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));

  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

}



async function hashAdminPassword(login: string, password: string): Promise<string> {

  return sha256(`wgdom-admin-account-v1:${login}:${password}`);

}



function isAssignableRole(v: unknown): v is AdminAssignableRole {

  return v === "admin" || v === "moderator";

}



function isValidCustomUser(v: unknown): v is AdminCustomUser {

  if (!v || typeof v !== "object") return false;

  const u = v as Partial<AdminCustomUser>;

  return (

    typeof u.id === "string" && u.id.length > 0

    && typeof u.login === "string" && u.login.length > 0

    && typeof u.displayName === "string" && u.displayName.length > 0

    && isAssignableRole(u.role)

    && typeof u.passwordHash === "string" && u.passwordHash.length === 64

  );

}



function normalizeUsersConfig(raw: unknown): AdminUsersConfig {

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_USERS_CONFIG };

  const o = raw as Partial<AdminUsersConfig>;

  const roleOverrides: Record<string, AdminAssignableRole> = {};

  if (o.roleOverrides && typeof o.roleOverrides === "object") {

    for (const [id, role] of Object.entries(o.roleOverrides)) {

      if (isAssignableRole(role) && id !== "dawid") roleOverrides[id] = role;

    }

  }

  const customUsers = Array.isArray(o.customUsers)

    ? o.customUsers.filter(isValidCustomUser)

    : [];

  return { roleOverrides, customUsers };

}



export function loadAdminUsersConfig(): AdminUsersConfig {

  try {

    const raw = localStorage.getItem(ADMIN_USERS_CONFIG_KEY);

    if (!raw) return { ...EMPTY_USERS_CONFIG };

    return normalizeUsersConfig(JSON.parse(raw));

  } catch {

    return { ...EMPTY_USERS_CONFIG };

  }

}



export function mergeAdminUsersConfig(local: AdminUsersConfig, cloud: unknown): AdminUsersConfig {

  const l = normalizeUsersConfig(local);

  const c = normalizeUsersConfig(cloud);

  const customById = new Map<string, AdminCustomUser>();

  for (const u of l.customUsers) customById.set(u.id, u);

  for (const u of c.customUsers) customById.set(u.id, u);

  return {

    roleOverrides: { ...l.roleOverrides, ...c.roleOverrides },

    customUsers: [...customById.values()],

  };

}



async function persistAdminUsersConfig(config: AdminUsersConfig): Promise<void> {

  localStorage.setItem(ADMIN_USERS_CONFIG_KEY, JSON.stringify(config));

  await persistKey(ADMIN_USERS_CONFIG_KEY, config);

}



function builtinDefaultRole(id: string): AdminRole {

  return BUILTIN_ADMIN_ACCOUNTS.find((a) => a.id === id)?.role ?? "moderator";

}



function effectiveBuiltinRole(id: string, config: AdminUsersConfig): AdminRole {

  if (id === "dawid") return "super_admin";

  const override = config.roleOverrides[id];

  if (isAssignableRole(override)) return override;

  return builtinDefaultRole(id);

}



function effectivePasswordHash(account: Pick<AdminAccount, "id" | "login" | "passwordHash" | "isBuiltin">): string {

  const overrides = loadAdminPasswordOverrides();

  if (account.isBuiltin && overrides[account.id]) return overrides[account.id];

  return account.passwordHash;

}



export function getAllAdminAccounts(): AdminAccount[] {

  const config = loadAdminUsersConfig();

  const builtIn: AdminAccount[] = BUILTIN_ADMIN_ACCOUNTS.map((a) => ({

    ...a,

    role: effectiveBuiltinRole(a.id, config),

    isBuiltin: true,

    isCustom: false,

  }));

  const custom: AdminAccount[] = config.customUsers.map((u) => ({

    id: u.id,

    login: u.login,

    displayName: u.displayName,

    role: u.role,

    passwordHash: u.passwordHash,

    isBuiltin: false,

    isCustom: true,

  }));

  return [...builtIn, ...custom];

}



function findAdminAccountByLogin(login: string): AdminAccount | undefined {

  return getAllAdminAccounts().find((a) => a.login === login.trim());

}



function findAdminAccountById(id: string): AdminAccount | undefined {

  return getAllAdminAccounts().find((a) => a.id === id);

}



export function listAdminUsersForLogin(): AdminSession[] {

  return getAllAdminAccounts().map(({ passwordHash: _h, isBuiltin: _b, isCustom: _c, ...pub }) => pub);

}



export function listAdminUsersForManagement(): AdminUserManagementRow[] {

  const overrides = loadAdminPasswordOverrides();

  return getAllAdminAccounts().map((a) => ({

    id: a.id,

    login: a.login,

    displayName: a.displayName,

    role: a.role,

    isBuiltin: a.isBuiltin,

    isCustom: a.isCustom,

    canChangeRole: a.role !== "super_admin",

    canDelete: a.isCustom,

    passwordCustomized: a.isBuiltin ? a.id in overrides : true,

  }));

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



async function persistAdminPasswordOverrides(overrides: AdminPasswordOverrides): Promise<void> {

  localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(overrides));

  await persistKey(ADMIN_PASSWORDS_KEY, overrides);

}



export async function verifyAdminLogin(login: string, password: string): Promise<AdminSession | null> {

  const account = findAdminAccountByLogin(login);

  if (!account) return null;

  const hash = await hashAdminPassword(account.login, password);

  if (hash !== effectivePasswordHash(account)) return null;

  const { passwordHash: _h, isBuiltin: _b, isCustom: _c, ...session } = account;

  return session;

}



export function adminPasswordIsCustomized(userId: string): boolean {

  const account = findAdminAccountById(userId);

  if (!account) return false;

  return account.isCustom || userId in loadAdminPasswordOverrides();

}



export async function setAdminUserPassword(userId: string, newPassword: string): Promise<void> {

  const account = findAdminAccountById(userId);

  if (!account) throw new Error("Nieznany użytkownik");

  if (newPassword.length < 6) throw new Error("Hasło musi mieć co najmniej 6 znaków");

  const hash = await hashAdminPassword(account.login, newPassword);

  if (account.isCustom) {

    const config = loadAdminUsersConfig();

    config.customUsers = config.customUsers.map((u) =>

      u.id === userId ? { ...u, passwordHash: hash } : u,

    );

    await persistAdminUsersConfig(config);

  } else {

    const overrides = { ...loadAdminPasswordOverrides(), [userId]: hash };

    await persistAdminPasswordOverrides(overrides);

  }

  clearRememberedAdminPasswordIfUser(userId);

}



export async function resetAdminUserPassword(userId: string): Promise<void> {

  const account = findAdminAccountById(userId);

  if (!account?.isBuiltin) throw new Error("Przywracanie hasła startowego dotyczy tylko kont wbudowanych");

  const overrides = { ...loadAdminPasswordOverrides() };

  delete overrides[userId];

  await persistAdminPasswordOverrides(overrides);

  clearRememberedAdminPasswordIfUser(userId);

}



export async function setAdminUserRole(userId: string, role: AdminAssignableRole): Promise<void> {

  const account = findAdminAccountById(userId);

  if (!account) throw new Error("Nieznany użytkownik");

  if (account.role === "super_admin") throw new Error("Nie można zmienić roli Super Administratora");

  const config = loadAdminUsersConfig();

  if (account.isCustom) {

    config.customUsers = config.customUsers.map((u) =>

      u.id === userId ? { ...u, role } : u,

    );

  } else {

    config.roleOverrides = { ...config.roleOverrides, [userId]: role };

  }

  await persistAdminUsersConfig(config);

}



export async function createAdminUser(params: {

  login: string;

  password: string;

  role: AdminAssignableRole;

  displayName?: string;

}): Promise<AdminSession> {

  const login = params.login.trim();

  const displayName = (params.displayName?.trim() || login).slice(0, 40);

  if (login.length < 2) throw new Error("Login musi mieć co najmniej 2 znaki");

  if (/\s/.test(login)) throw new Error("Login nie może zawierać spacji");

  if (params.password.length < 6) throw new Error("Hasło musi mieć co najmniej 6 znaków");

  if (findAdminAccountByLogin(login)) throw new Error("Taki login już istnieje");



  const hash = await hashAdminPassword(login, params.password);

  const user: AdminCustomUser = {

    id: `custom-${crypto.randomUUID()}`,

    login,

    displayName,

    role: params.role,

    passwordHash: hash,

  };

  const config = loadAdminUsersConfig();

  config.customUsers = [...config.customUsers, user];

  await persistAdminUsersConfig(config);

  return { id: user.id, login: user.login, displayName: user.displayName, role: user.role };

}



export async function deleteAdminUser(userId: string): Promise<void> {

  const account = findAdminAccountById(userId);

  if (!account?.isCustom) throw new Error("Można usunąć tylko dodanych użytkowników");

  const config = loadAdminUsersConfig();

  config.customUsers = config.customUsers.filter((u) => u.id !== userId);

  await persistAdminUsersConfig(config);

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

    const account = findAdminAccountById(parsed.id);

    if (!account || account.role !== parsed.role) return null;

    const { passwordHash: _h, isBuiltin: _b, isCustom: _c, ...session } = account;

    return session;

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

